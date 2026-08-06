#include "aud_player.h"

#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdbool.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"
#include "esp_partition.h"

#include "driver/i2s_std.h"


#define TAG "AUD_PLAYER"

// I2S pins to the MAX98357A. SD (shutdown/enable) is tied to 3V3 in hardware.
// Board: FireBeetle 2 ESP32-UE (N16R2) — silkscreen labels in comments.
#define I2S_BCLK_PIN   GPIO_NUM_26   // silkscreen D3
#define I2S_WS_PIN     GPIO_NUM_25   // silkscreen D2, LRC
#define I2S_DOUT_PIN   GPIO_NUM_17   // silkscreen D10, DIN on the MAX98357A (GPIO27 isn't broken out on this board)

// 16-bit mono samples pulled from the source per iteration.
#define CHUNK_SAMPLES  1024


/*
 * A source of PCM bytes. Returns the number of bytes actually read into buf
 * (0 at end of stream). Lets the same engine play from a file or a partition.
 */
typedef size_t (*pcm_reader_t)(void *ctx, void *buf, size_t len);


// ---- File source ----------------------------------------------------------
static size_t file_reader(void *ctx, void *buf, size_t len)
{
    return fread(buf, 1, len, (FILE *)ctx);
}

// ---- Partition source -----------------------------------------------------
typedef struct
{
    const esp_partition_t *part;
    size_t                 offset;
    size_t                 end;
} part_ctx_t;

static size_t part_reader(void *vctx, void *buf, size_t len)
{
    part_ctx_t *c = (part_ctx_t *)vctx;

    if (c->offset >= c->end)
    {
        return 0;
    }

    size_t n = c->end - c->offset;
    if (n > len)
    {
        n = len;
    }

    if (esp_partition_read(c->part, c->offset, buf, n) != ESP_OK)
    {
        return 0;
    }

    c->offset += n;
    return n;
}


// Read and discard n bytes from the source (used to skip WAV chunks).
static void reader_skip(pcm_reader_t rd, void *ctx, size_t n)
{
    uint8_t scratch[64];

    while (n > 0)
    {
        size_t chunk = n < sizeof(scratch) ? n : sizeof(scratch);
        size_t got   = rd(ctx, scratch, chunk);

        if (got == 0)
        {
            break;
        }
        n -= got;
    }
}


// The handful of WAV fields we actually need.
typedef struct
{
    uint16_t num_channels;
    uint32_t sample_rate;
    uint16_t bits_per_sample;
    uint32_t data_size;
} wav_info_t;


// Parse RIFF chunks sequentially; leaves the source positioned at the first
// PCM sample of the "data" chunk.
static esp_err_t wav_parse(pcm_reader_t rd, void *ctx, wav_info_t *out)
{
    uint8_t riff[12];

    if (rd(ctx, riff, 12) != 12 ||
        memcmp(riff, "RIFF", 4) != 0 ||
        memcmp(riff + 8, "WAVE", 4) != 0)
    {
        ESP_LOGE(TAG, "Not a RIFF/WAVE stream");
        return ESP_FAIL;
    }

    bool have_fmt  = false;
    bool have_data = false;
    uint8_t chunk[8];

    while (rd(ctx, chunk, 8) == 8)
    {
        uint32_t sz = chunk[4] |
                     (chunk[5] << 8) |
                     (chunk[6] << 16) |
                     ((uint32_t)chunk[7] << 24);

        if (memcmp(chunk, "fmt ", 4) == 0)
        {
            uint8_t fmt[16];
            uint32_t n = sz < sizeof(fmt) ? sz : sizeof(fmt);

            if (rd(ctx, fmt, n) != n)
            {
                return ESP_FAIL;
            }

            out->num_channels    = fmt[2] | (fmt[3] << 8);
            out->sample_rate     = fmt[4] | (fmt[5] << 8) |
                                  (fmt[6] << 16) | ((uint32_t)fmt[7] << 24);
            out->bits_per_sample = fmt[14] | (fmt[15] << 8);

            if (sz > n)
            {
                reader_skip(rd, ctx, sz - n);
            }
            have_fmt = true;
        }
        else if (memcmp(chunk, "data", 4) == 0)
        {
            out->data_size = sz;
            have_data = true;
            break;                      // positioned at the first sample
        }
        else
        {
            reader_skip(rd, ctx, sz + (sz & 1));   // skip unknown chunk
        }
    }

    if (!have_fmt || !have_data)
    {
        ESP_LOGE(TAG, "Missing fmt/data chunk");
        return ESP_FAIL;
    }

    return ESP_OK;
}


// Shared playback engine: parse header, bring up I2S at the clip's sample
// rate, then stream the 16-bit PCM data straight to the MAX98357A.
static esp_err_t play_stream(pcm_reader_t rd, void *ctx)
{
    wav_info_t wav = {0};
    esp_err_t  err = wav_parse(rd, ctx, &wav);

    if (err != ESP_OK)
    {
        return err;
    }

    ESP_LOGI(TAG, "WAV: %u Hz, %u-bit, %u ch, %u data bytes",
             (unsigned)wav.sample_rate, wav.bits_per_sample,
             wav.num_channels, (unsigned)wav.data_size);

    if (wav.bits_per_sample != 16 || wav.num_channels != 1)
    {
        ESP_LOGE(TAG, "Only 16-bit mono WAV is supported, got %u-bit/%u ch",
                 wav.bits_per_sample, wav.num_channels);
        return ESP_ERR_NOT_SUPPORTED;
    }

    i2s_chan_handle_t tx = NULL;
    i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);

    err = i2s_new_channel(&chan_cfg, &tx, NULL);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "i2s_new_channel failed: %s", esp_err_to_name(err));
        return err;
    }

    i2s_std_config_t std_cfg =
    {
        .clk_cfg  = I2S_STD_CLK_DEFAULT_CONFIG(wav.sample_rate),
        .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_16BIT,
                                                         I2S_SLOT_MODE_MONO),
        .gpio_cfg =
        {
            .mclk = I2S_GPIO_UNUSED,
            .bclk = I2S_BCLK_PIN,
            .ws   = I2S_WS_PIN,
            .dout = I2S_DOUT_PIN,
            .din  = I2S_GPIO_UNUSED,
            .invert_flags = { .mclk_inv = false, .bclk_inv = false, .ws_inv = false },
        },
    };

    err = i2s_channel_init_std_mode(tx, &std_cfg);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "i2s_channel_init_std_mode failed: %s", esp_err_to_name(err));
        i2s_del_channel(tx);
        return err;
    }

    ESP_ERROR_CHECK(i2s_channel_enable(tx));


    uint8_t  in[CHUNK_SAMPLES * 2];   // 16-bit mono samples
    uint32_t remaining = wav.data_size;

    while (remaining > 0)
    {
        size_t want = remaining < sizeof(in) ? remaining : sizeof(in);
        size_t got  = rd(ctx, in, want);

        if (got == 0)
        {
            break;                      // short/truncated stream
        }
        remaining -= got;


        // Blocking DMA write: the task sleeps while the buffers drain, so the
        // idle task runs and the task watchdog stays fed.
        size_t total = 0;

        while (total < got)
        {
            size_t written = 0;

            if (i2s_channel_write(tx, in + total, got - total, &written,
                                   portMAX_DELAY) != ESP_OK)
            {
                break;
            }
            total += written;
        }
    }


    // Let the final DMA buffers play out before tearing the channel down.
    vTaskDelay(pdMS_TO_TICKS(50));

    i2s_channel_disable(tx);
    i2s_del_channel(tx);

    if (remaining > 0)
    {
        ESP_LOGW(TAG, "Source ran out early: %u of %u bytes unplayed "
                      "(stored file is shorter/truncated)",
                 (unsigned)remaining, (unsigned)wav.data_size);
    }

    ESP_LOGI(TAG, "Playback completed");

    return ESP_OK;
}


esp_err_t aud_player_play(const char *filename)
{
    ESP_LOGI(TAG, "Playing %s", filename);

    FILE *file = fopen(filename, "rb");

    if (file == NULL)
    {
        ESP_LOGE(TAG, "Failed to open WAV");
        return ESP_FAIL;
    }

    esp_err_t err = play_stream(file_reader, file);

    fclose(file);
    return err;
}


esp_err_t aud_player_play_partition(const esp_partition_t *part)
{
    if (part == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    ESP_LOGI(TAG, "Playing from partition '%s'", part->label);

    part_ctx_t ctx =
    {
        .part   = part,
        .offset = 0,
        .end    = part->size,
    };

    return play_stream(part_reader, &ctx);
}
