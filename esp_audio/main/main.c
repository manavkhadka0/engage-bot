#include <stdio.h>

#include "esp_err.h"
#include "esp_log.h"
#include "esp_partition.h"

#include "aud_player.h"

#define TAG "MAIN"

/* Raw flash partition holding the WAV to play — same partition the full
 * firmware downloads into, but here nothing writes it: flash a clip onto it
 * once with parttool.py before running this (see README's Feature 1 section). */
#define AUDIO_PART_LABEL "audio"

/*
 * Feature 1 — isolated hardware sanity check.
 *
 * No WiFi, no MQTT, no download: on boot this just streams whatever WAV is
 * already sitting in the "audio" partition straight to the MAX98357A over
 * I2S. The point is to prove the physical wiring (see
 * docs/wiring-max98357a.svg) and the I2S playback path work in isolation,
 * with zero networking variables in the mix, before layering in WiFi/MQTT
 * (that's feature/esp-audio-02-webapp-integration).
 */
void app_main(void)
{
    printf("\n");
    printf("=====================================\n");
    printf(" esp_audio :: Feature 1 - local playback\n");
    printf("=====================================\n");

    const esp_partition_t *part = esp_partition_find_first(
        ESP_PARTITION_TYPE_DATA, ESP_PARTITION_SUBTYPE_ANY, AUDIO_PART_LABEL);

    if (part == NULL)
    {
        ESP_LOGE(TAG, "Partition '%s' not found", AUDIO_PART_LABEL);
        return;
    }

    ESP_LOGI(TAG, "audio partition: %u bytes @ 0x%06x",
             (unsigned)part->size, (unsigned)part->address);

    esp_err_t err = aud_player_play_partition(part);
    ESP_LOGI(TAG, "Playback result: %s", esp_err_to_name(err));

    if (err != ESP_OK)
    {
        ESP_LOGW(TAG, "Nothing played — did you flash a WAV onto the 'audio' "
                      "partition first? See README's Feature 1 section.");
    }
}
