# WeatherSense — Smart IoT Weather Monitoring & Forecasting System

> *"Measure the atmosphere. Understand the change. Prepare for the weather."*

WeatherSense is a responsive college web platform and real-time telemetry dashboard for an autonomous, ESP32-based environmental weather monitoring and forecasting station. Designed for the College IoT Club, university research laboratories, project evaluators, and campus visitors.

---

## 🌟 Key Features

1. **Dual-Mode Telemetry Engine**:
   - **Live IoT Mode**: Real-time sensor packet ingestion from physical ESP32 weather station via HTTP REST / MQTT over TLS.
   - **Demo Mode**: Dynamic atmospheric fluctuation simulation for demonstrations when hardware is being assembled or tested offline.
   - **Station Timeout Offline Handling**: Automatically detects network interrupts (>5 minutes), switches to neutral gray status, halts live weather animations, and alerts the user.

2. **Reactive Atmospheric HUD & Animations**:
   - **Extreme Heat (>35°C)**: Warm crimson accent, subtle flowing heat-wave shimmer, pulsating solar corona, and hydration advisory.
   - **Warm Conditions (28–34.9°C)**: Golden amber glow with solar harvesting indicators.
   - **Comfortable Spring (20–27.9°C)**: Calming emerald glow and leaf breeze indicators.
   - **Winter Chill (<15°C)**: Icy blue accent with floating frost crystal drift.
   - **Precipitation Active (Rain Detected)**: Animated diagonal raindrops, water conductivity depth gauge, and heavy rain flood alerts.
   - **High Humidity (>80%)**: Subtle water droplet breathing mist overlay.
   - **Strong Gale (>30 km/h)**: High-speed streamline wind lines and gust warnings.
   - **Barometric Pressure Shift**: Real-time rising/falling trend arrow indicators.

3. **Synoptic Mascot & AI Synthesis**:
   - Dynamic companion mascot SVG matching atmospheric regimes (Sunny Solstice Buddy, Drizzle Droplet Companion, Thunder Cloud Vanguard, Slumbering Snowdrift Buddy).
   - Generates actionable microclimatic advice for campus activities and solar energy harvesting.

4. **Telemetry Analytics & CSV Data Export**:
   - Canvas line chart displaying 6 physical environmental metrics.
   - Time filters: **1 Hour**, **Today**, **24 Hours**, and **7 Days**.
   - Statistical summary: Minimum, Maximum, Average, and Current readings.
   - **Instant CSV Export**: Generates timestamped telemetry spreadsheets with one click.

5. **Evaluator Quick Scenario Switcher**:
   - Demonstration toolbar allowing evaluators and faculty to instantly trigger test atmospheric profiles with zero hardware setup.

6. **Interactive ESP32 Ingestion Simulator & Firmware Viewer**:
   - In-browser REST API dispatcher (`POST /api/v1/telemetry`) with strict range validation (-40 to 85°C, 0–100% RH, 800–1100 hPa).
   - Embedded Arduino C++ firmware sketch (`ESP32_BME280_Station.ino`) ready for flashing.
   - Hardware credentials isolation template (`Config_Secrets.h`).

---

## 🛠️ Hardware Bill of Materials (BOM) & Pinout

| Component | Function | Interface / Pins | Operating Voltage |
| :--- | :--- | :--- | :--- |
| **ESP32 DevKit V1** | Dual-core 240MHz MCU, Wi-Fi 802.11 b/g/n | Primary Microcontroller | 5V USB / 3.3V Vin |
| **Bosch BME280** | Temperature, Relative Humidity, Barometric Pressure | I2C (SDA -> GPIO 21, SCL -> GPIO 22) | 3.3V |
| **Rain Drops Module** | Precipitation detection & analog moisture level | AO -> GPIO 35 (ADC1), DO -> GPIO 19 | 3.3V – 5V |
| **Photoresistor (LDR)** | Solar irradiance / ambient light intensity (Lux) | Voltage Divider -> GPIO 34 (ADC1) | 3.3V |
| **3-Cup Anemometer** | Wind velocity calculation | Pulse Counter -> GPIO 18 (Interrupt) | 5V / 12V |
| **Solar Subsystem** | 6V 2W Solar Panel + TP4056 + 18650 3.7V Battery | Vin -> AMS1117 3.3V LDO | Autonomous |
| **Stevenson Screen** | Louvered weather-resistant outdoor housing | IP65 Enclosure | Outdoor Mounted |

---

## 🔒 Security & Reliability Rules

- **Zero-Trust Server Validation**: All browser inputs and ESP32 packets are validated for realistic physical boundaries before ingestion.
- **Credential Isolation**: Secrets (`WIFI_PASS`, `DEVICE_SECRET_TOKEN`) are isolated into `Config_Secrets.h` and `.env`, both excluded from Git via `.gitignore`.
- **Dynamic Content Sanitization**: Sensor telemetry is cast to strict numerical primitives before rendering to prevent Cross-Site Scripting (XSS).
- **Graceful Offline Degradation**: Clearly states whether data is live, demo, outdated, or offline.

---

## 🚀 Quick Start Guide

### 1. Running the Local Server
```bash
# Navigate to the workspace directory
cd "Wheather Forecast System"

# Start the web server (Python built-in)
python -m http.server 8080
```

### 2. Accessing the Application
Open your modern web browser and navigate to:
```
http://localhost:8080/
```

### 3. Demonstrating Firebase Cloud & RBAC to Evaluators
1. **Explore the Live Dashboard**: Review the real-time telemetry HUD, 5-day forecast, and active weather condition.
2. **Switch Roles (RBAC)**: Use the top toolbar segmented control (`Viewer`, `Operator`, `Admin 👑`) to test role permissions.
   - **Viewer**: Read-only observation of synoptic HUD, historical canvas analytics, and 5-day forecasts. Calibration and audit ledgers are locked.
   - **Operator**: Can broadcast campus weather advisories and inject manual telemetry packets.
   - **Admin**: Full access to adjust BME280 sensor calibration offsets and view the immutable security audit ledger.
3. **Inspect Firebase Realtime Database Sync**: Click **Broadcast Packet to Firebase RTDB** in the Station Security section. Note the live cloud sync indicator (`🔥 RTDB Synced`).
4. **View Security Audit Ledger**: In the Security section, observe the real-time stream of cryptographically logged events (`AUTH_LOGIN`, `SENSOR_CALIBRATION`, `TELEMETRY_INJECT`, `ALERT_BROADCAST`).
5. **Inspect Analytics & Export**: Navigate to the **Analytics** section, switch between metrics (Temp, Humidity, Pressure, Light, Wind), and click **Download CSV Report**.

---

## 🔑 Firebase Cloud Architecture & Credentials

- **Firebase Project ID**: `wheather-forecast-system-f0c18`
- **Realtime Database**: `https://wheather-forecast-system-f0c18-default-rtdb.firebaseio.com`
- **Authentication**: Firebase Email & Password Auth + Local Session State Machine
- **Security Rules**: `database.rules.json` with strict JSON schema bounds and role-based permission checks

### Pre-Configured Evaluator Demo Credentials

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@weathersense.iot` | `AdminPass2026!` | Full Calibration & Security Ledger Access |
| **Operator** | `operator@weathersense.iot` | `OperatorPass2026!` | Telemetry Packet Injection & Alerts |
| **Viewer** | `viewer@weathersense.iot` | `ViewerPass2026!` | Read-Only Environmental Observation |

---

## 👥 College IoT Club Team

- **Aarav Sharma**: Hardware & Sensor Integration Lead
- **Sneha Patel**: ESP32 Embedded Firmware Specialist
- **Rohan Mehta**: Backend & Cloud Systems Architect
- **Ananya Iyer**: Frontend UI/UX & Web Dashboard Developer
- **Vikram Singh**: QA, Testing & Field Documentation
- **Faculty Guide**: Dr. K. S. Ramanathan, Ph.D. (Head of IoT & Embedded Systems Research Lab)

*Academic Year 2025–2026 · College of Engineering & Technology*
