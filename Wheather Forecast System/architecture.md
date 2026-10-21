# WeatherSense — System Architecture & Data Flow

## 1. End-to-End System Architecture

```text
+--------------------------------------------------------------+
|                    PHYSICAL WEATHER STATION                  |
|                                                              |
|   [ Bosch BME280 ]       [ Rain Plate (LM393) ]    [ LDR ]   |
|   (I2C: 0x76)            (Analog AO / GPIO35)      (GPIO34)  |
|         │                          │                   │     |
|         └──────────────┬───────────┴───────────────────┘     |
|                        ▼                                     |
|             [ ESP32 DevKit V1 (240MHz) ]                     |
|           • FreeRTOS Sensor Sampling Task                    |
|           • Range Bounds Verification                        |
|           • JSON Payload Serialization                       |
|           • Wi-Fi 802.11 b/g/n HTTPS Client                  |
+────────────────────────┬─────────────────────────────────────+
                         │
                         │ Wi-Fi / HTTPS (TLS 1.3)
                         ▼
+──────────────────────────────────────────────────────────────+
|                     CLOUD / BACKEND API                      |
|                                                              |
|   [ REST API Router / Node.js or Python Flask / MQTT ]        |
|   • Device Authentication (Bearer Token: X-Device-Key)       |
|   • Strict Input Schema Validation (JSON Schema Draft-07)    |
|   • Time-series Storage (PostgreSQL / InfluxDB / Firebase)   |
|   • Rate Limiting & Denial-of-Service Protection             |
+────────────────────────┬─────────────────────────────────────+
                         │
                         │ WebSockets / REST Polling
                         ▼
+──────────────────────────────────────────────────────────────+
|                   WEATHERSENSE WEB DASHBOARD                 |
|                                                              |
|   [ Responsive Vanilla CSS3 & Modern JavaScript Engine ]      |
|   • Real-Time Reactive Atmospheric HUD & Animations          |
|   • Synoptic AI Companion & Mascot Synthesis                 |
|   • Interactive Canvas Analytics & 24h/7d Timeframes         |
|   • Instant CSV Historical Telemetry Exporter                |
|   • Dual Live / Safe Demo Fallback State Machine             |
+--------------------------------------------------------------+
```

## 2. Telemetry Ingestion Lifecycle

1. **Sensor Acquisition**: The ESP32 acquires raw ADC values and I2C registers every 10 seconds.
2. **Filtering**: Median filtering rejects momentary noise spikes on the rain detector and analog light channel.
3. **Transmission**: The ESP32 opens an encrypted TLS connection and executes `POST /api/v1/telemetry`.
4. **Validation**: The backend verifies device authorization and physical boundary ranges (-40°C to 85°C for temperature, 0% to 100% for humidity, 800 to 1100 hPa for barometric pressure).
5. **Dashboard Rendering**: The browser decodes the telemetry packet, updates the gauges, transitions the weather reaction state, and appends the reading to the historical canvas chart.
