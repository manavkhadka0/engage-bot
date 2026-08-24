#include "motor_driver.h"

#include "driver/gpio.h"
#include "driver/ledc.h"
#include "esp_log.h"

#define TAG "MOTOR_DRIVER"

/* Board: FireBeetle 2 ESP32-UE (N16R2). Pins as wired on the bench (Arduino
 * reference sketch) — confirm against the physical board before trusting
 * this blindly, same as every other pin map in this project. */
#define MOTOR_AIN1_PIN   GPIO_NUM_13
#define MOTOR_AIN2_PIN   GPIO_NUM_23
#define MOTOR_STBY_PIN   GPIO_NUM_19
#define MOTOR_PWMA_PIN   GPIO_NUM_14

#define PWM_FREQ_HZ      5000
#define PWM_RES_BITS     LEDC_TIMER_8_BIT   /* 0-255 duty range */
#define PWM_TIMER        LEDC_TIMER_0
#define PWM_CHANNEL      LEDC_CHANNEL_0
#define PWM_SPEED_MODE   LEDC_LOW_SPEED_MODE

/* 0-255 (8-bit duty). Forward-only for v1, so this is the only speed used. */
#define MOTOR_SPEED      255


esp_err_t motor_driver_init(void)
{
    gpio_config_t io_conf = {
        .pin_bit_mask = (1ULL << MOTOR_AIN1_PIN) |
                         (1ULL << MOTOR_AIN2_PIN) |
                         (1ULL << MOTOR_STBY_PIN),
        .mode         = GPIO_MODE_OUTPUT,
        .pull_up_en   = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_DISABLE,
    };
    esp_err_t err = gpio_config(&io_conf);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "gpio_config failed: %s", esp_err_to_name(err));
        return err;
    }

    ledc_timer_config_t timer_conf = {
        .speed_mode      = PWM_SPEED_MODE,
        .timer_num       = PWM_TIMER,
        .duty_resolution = PWM_RES_BITS,
        .freq_hz         = PWM_FREQ_HZ,
        .clk_cfg          = LEDC_AUTO_CLK,
    };
    err = ledc_timer_config(&timer_conf);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "ledc_timer_config failed: %s", esp_err_to_name(err));
        return err;
    }

    ledc_channel_config_t chan_conf = {
        .gpio_num   = MOTOR_PWMA_PIN,
        .speed_mode = PWM_SPEED_MODE,
        .channel    = PWM_CHANNEL,
        .timer_sel  = PWM_TIMER,
        .duty       = 0,
        .hpoint     = 0,
    };
    err = ledc_channel_config(&chan_conf);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "ledc_channel_config failed: %s", esp_err_to_name(err));
        return err;
    }

    /* Enable the driver once at boot — no runtime disable path in v1 (the
     * reference sketch never drives STBY low again after setup()). */
    gpio_set_level(MOTOR_STBY_PIN, 1);
    gpio_set_level(MOTOR_AIN1_PIN, 0);
    gpio_set_level(MOTOR_AIN2_PIN, 0);

    ESP_LOGI(TAG, "Ready. AIN1=GPIO%d AIN2=GPIO%d PWMA=GPIO%d STBY=GPIO%d",
             MOTOR_AIN1_PIN, MOTOR_AIN2_PIN, MOTOR_PWMA_PIN, MOTOR_STBY_PIN);

    return ESP_OK;
}

void motor_driver_forward(void)
{
    gpio_set_level(MOTOR_AIN1_PIN, 1);
    gpio_set_level(MOTOR_AIN2_PIN, 0);

    ledc_set_duty(PWM_SPEED_MODE, PWM_CHANNEL, MOTOR_SPEED);
    ledc_update_duty(PWM_SPEED_MODE, PWM_CHANNEL);
}

void motor_driver_stop(void)
{
    ledc_set_duty(PWM_SPEED_MODE, PWM_CHANNEL, 0);
    ledc_update_duty(PWM_SPEED_MODE, PWM_CHANNEL);

    gpio_set_level(MOTOR_AIN1_PIN, 0);
    gpio_set_level(MOTOR_AIN2_PIN, 0);
}
