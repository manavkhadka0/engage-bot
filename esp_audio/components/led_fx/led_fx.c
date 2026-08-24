#include "led_fx.h"

#include "driver/gpio.h"
#include "led_strip.h"
#include "esp_random.h"
#include "esp_log.h"

#define TAG "LED_FX"

#define LED_DATA_PIN   GPIO_NUM_4
#define NUM_LEDS       60

static led_strip_handle_t s_strip = NULL;


esp_err_t led_fx_init(void)
{
    led_strip_config_t strip_config = {
        .strip_gpio_num = LED_DATA_PIN,
        .max_leds       = NUM_LEDS,
        .led_pixel_format = LED_PIXEL_FORMAT_GRB,
        .led_model         = LED_MODEL_WS2812,
        .flags = { .invert_out = false },
    };

    led_strip_rmt_config_t rmt_config = {
        .clk_src       = RMT_CLK_SRC_DEFAULT,
        .resolution_hz = 10 * 1000 * 1000,   /* 10 MHz */
        .flags = { .with_dma = false },
    };

    esp_err_t err = led_strip_new_rmt_device(&strip_config, &rmt_config, &s_strip);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "led_strip_new_rmt_device failed: %s", esp_err_to_name(err));
        return err;
    }

    led_strip_clear(s_strip);

    ESP_LOGI(TAG, "Ready. %d LEDs on GPIO%d", NUM_LEDS, LED_DATA_PIN);
    return ESP_OK;
}

void led_fx_off(void)
{
    if (s_strip == NULL) return;
    led_strip_clear(s_strip);
}

void led_fx_red_white(void)
{
    if (s_strip == NULL) return;

    for (int i = 0; i < NUM_LEDS; i++)
    {
        if (esp_random() % 2)
        {
            led_strip_set_pixel(s_strip, i, 255, 255, 255);   /* white */
        }
        else
        {
            led_strip_set_pixel(s_strip, i, 255, 0, 0);       /* red */
        }
    }
    led_strip_refresh(s_strip);
}

void led_fx_green(void)
{
    if (s_strip == NULL) return;

    for (int i = 0; i < NUM_LEDS; i++)
    {
        led_strip_set_pixel(s_strip, i, 0, 255, 0);
    }
    led_strip_refresh(s_strip);
}
