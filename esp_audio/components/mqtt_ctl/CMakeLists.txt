idf_component_register(
    SRCS
        "mqtt_ctl.c"

    INCLUDE_DIRS
        "include"

    REQUIRES
        espressif__mqtt
        esp_event
)
