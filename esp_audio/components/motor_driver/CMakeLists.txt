idf_component_register(
    SRCS
        "motor_driver.c"

    INCLUDE_DIRS
        "include"

    REQUIRES
        driver
        esp_driver_gpio
)
