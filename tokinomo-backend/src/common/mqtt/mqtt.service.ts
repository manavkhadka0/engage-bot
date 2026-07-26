import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import mqtt, { type MqttClient } from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient | null = null;
  private connected = false;
  private readonly handlers = new Map<
    string,
    Set<(topic: string, payload: Buffer) => void>
  >();

  onModuleInit() {
    const url = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
    const username = process.env.MQTT_USERNAME || undefined;
    const password = process.env.MQTT_PASSWORD || undefined;

    try {
      this.client = mqtt.connect(url, {
        username,
        password,
        reconnectPeriod: 5_000,
        connectTimeout: 8_000,
      });

      this.client.on('connect', () => {
        this.connected = true;
        this.logger.log(`MQTT connected ${url}`);
        this.client?.subscribe('t/+/d/+/+', (err) => {
          if (err) this.logger.error(`MQTT subscribe failed: ${err.message}`);
        });
      });

      this.client.on('reconnect', () => {
        this.logger.debug('MQTT reconnecting…');
      });

      this.client.on('error', (err) => {
        this.connected = false;
        this.logger.warn(`MQTT error: ${err.message}`);
      });

      this.client.on('close', () => {
        this.connected = false;
      });

      this.client.on('message', (topic, payload) => {
        for (const [pattern, set] of this.handlers) {
          if (this.matchTopic(pattern, topic)) {
            for (const fn of set) fn(topic, payload);
          }
        }
      });
    } catch (err) {
      this.logger.warn(`MQTT init skipped: ${String(err)}`);
    }
  }

  onModuleDestroy() {
    this.client?.end(true);
  }

  isConnected() {
    return this.connected;
  }

  onMessage(
    pattern: string,
    handler: (topic: string, payload: Buffer) => void,
  ) {
    const set = this.handlers.get(pattern) ?? new Set();
    set.add(handler);
    this.handlers.set(pattern, set);
    return () => set.delete(handler);
  }

  publish(
    topic: string,
    payload: unknown,
    opts?: { qos?: 0 | 1 | 2; retain?: boolean },
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.connected) {
        reject(new Error('MQTT not connected'));
        return;
      }
      const body =
        typeof payload === 'string' ? payload : JSON.stringify(payload);
      this.client.publish(
        topic,
        body,
        { qos: opts?.qos ?? 1, retain: opts?.retain ?? false },
        (err) => (err ? reject(err) : resolve()),
      );
    });
  }

  topicFor(
    tenantId: string,
    deviceId: string,
    channel: 'status' | 'telemetry' | 'event' | 'cmd' | 'ack',
  ) {
    return `t/${tenantId}/d/${deviceId}/${channel}`;
  }

  private matchTopic(pattern: string, topic: string) {
    const pp = pattern.split('/');
    const tt = topic.split('/');
    if (pp.length !== tt.length) return false;
    return pp.every((p, i) => p === '+' || p === '#' || p === tt[i]);
  }
}
