idf_component_register(
    SRCS
        "led_fx.c"

    INCLUDE_DIRS
        "include"

    REQUIRES
        driver
        esp_driver_gpio
        esp_hw_support
        led_strip
)
