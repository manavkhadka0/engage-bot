// mqtt_client.h — NetworkTask: MQTT connect/reconnect, publish drain, command rx.
#pragma once

// FreeRTOS task. Owns the single PubSubClient instance:
//  - connects with LWT (retained status=offline)
//  - publishes status=online (retained) + subscribes to the cmd topic
//  - drains qOutbound → broker (buffered while offline)
//  - parses incoming cmd → pushes Command to qCommand
void NetworkTask(void* pv);
