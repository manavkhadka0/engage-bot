idf_component_register(
    SRCS "main.c"
    INCLUDE_DIRS "."
    REQUIRES
        driver
        esp_driver_gpio
        esp_partition
        aud_player
        motor_driver
        led_fx
)
