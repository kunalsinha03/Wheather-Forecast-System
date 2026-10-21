# WeatherSense — Telemetry Data Model & Schema

## Telemetry Payload Object

```json
{
  "deviceId": "weather-station-01",
  "timestamp": "2026-10-20T01:15:00Z",
  "temperature": 23.4,
  "humidity": 52,
  "pressure": 1013.2,
  "rainDetected": false,
  "rainValue": 42,
  "lightLevel": 680,
  "windSpeed": 8.5,
  "aqi": 28,
  "source": "iot"
}
```

### Field Definitions

| Field | Data Type | Units | Bounds / Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- |
| `deviceId` | String | – | `weather-station-[0-9]{2}` | Unique registered hardware node ID |
| `timestamp` | String | ISO-8601 | UTC format | Measurement collection timestamp |
| `temperature` | Float | °C | -40.0 to 85.0 | Ambient temperature from BME280 |
| `humidity` | Integer | % RH | 0 to 100 | Relative humidity from BME280 |
| `pressure` | Float | hPa | 800.0 to 1100.0 | Atmospheric pressure from BME280 |
| `rainDetected` | Boolean | – | `true`, `false` | Rain presence flag |
| `rainValue` | Integer | 0–1024 | 0 to 1024 | Analog precipitation depth from plate |
| `lightLevel` | Integer | Lux | 0 to 2000 | Ambient solar illuminance from LDR |
| `windSpeed` | Float | km/h | 0.0 to 200.0 | Calculated wind speed from anemometer |
| `aqi` | Integer | AQI Index | 0 to 500 | Environmental air quality index |
| `source` | String | – | `"iot"`, `"demo"`, `"offline"` | Telemetry operational origin |
