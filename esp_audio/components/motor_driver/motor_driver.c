#include "motor_driver.h"

#include "driver/gpio.h"
#include "esp_log.h"

#define TAG "MOTOR_DRIVER"

/* Optocoupler LED on GPIO14. Active-low: the pin sinks current through the
 * LED when LOW, which turns the isolated side on and runs the motor. */
#define MOTOR_CTRL_PIN   GPIO_NUM_14

#define MOTOR_RUN   0
#define MOTOR_STOP  1


esp_err_t motor_driver_init(void)
{
    gpio_config_t io_conf = {
        .pin_bit_mask = 1ULL << MOTOR_CTRL_PIN,
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

    gpio_set_level(MOTOR_CTRL_PIN, MOTOR_STOP);

    ESP_LOGI(TAG, "Ready. ctrl=GPIO%d (LOW=run HIGH=stop)", MOTOR_CTRL_PIN);
    return ESP_OK;
}

void motor_driver_forward(void)
{
    gpio_set_level(MOTOR_CTRL_PIN, MOTOR_RUN);
}

void motor_driver_stop(void)
{
    gpio_set_level(MOTOR_CTRL_PIN, MOTOR_STOP);
}
