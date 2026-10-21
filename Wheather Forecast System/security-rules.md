# WeatherSense — Essential Security & Reliability Rules

## 1. Secrets and Credentials
- **No Hardcoded Passwords**: Private Wi-Fi credentials (`WIFI_PASS`) and API bearer tokens (`DEVICE_SECRET_TOKEN`) must never reside in version-controlled frontend files.
- **Git Exclusions**: Both `.env` and `Config_Secrets.h` are explicitly added to `.gitignore`.
- **Public Templates**: Only `.env.example` with non-sensitive placeholder identifiers is committed.

## 2. Input and Output Validation
- **Range Boundaries**:
  - `Temperature`: Valid within [-40.0°C, 85.0°C].
  - `Relative Humidity`: Valid within [0%, 100%].
  - `Barometric Pressure`: Valid within [800.0 hPa, 1100.0 hPa].
  - `Wind Speed`: Valid within [0.0 km/h, 200.0 km/h].
  - `Light Level`: Valid within [0 Lux, 2000 Lux].
- **Sanitization**: All incoming telemetry is strictly parsed as numeric floats/integers before insertion into DOM nodes or canvas charts, preventing Cross-Site Scripting (XSS).

## 3. Firebase Authentication & Role-Based Access Control (RBAC)
- **Role Hierarchy**:
  - `admin`: Full administrative governance. Can alter BME280 sensor calibration matrices, view security audit ledgers, inject direct hardware telemetry, and post emergency alert banners.
  - `operator`: Operations oversight. Can broadcast advisories, inject simulated telemetry packets, and manage active meteorological feeds.
  - `viewer`: Public guest access. Read-only live observation of synoptic HUD, historical canvas analytics, and 5-day forecasts.
- **Principle of Least Privilege**:
  - Restricted actions are guarded on both client UI (via state-driven overlays and role checks) and database level via `database.rules.json`.
  - Unauthenticated or unauthorized attempts trigger immediate audit logging and an access restriction notification.
- **Session Security**:
  - Firebase Auth persistence configured with `browserLocalPersistence`.
  - Secure session termination via `signOut` clears all local identity tokens.

## 4. Firebase Realtime Database Security Rules (`database.rules.json`)
- **Telemetry Read**: Open read on `/telemetry/current` and `/telemetry/history` for public dashboard viewing.
- **Telemetry Write**: Restricted strictly to authenticated `admin` and `operator` accounts with schema boundary enforcement.
- **Audit Logs**: Immutable write-only append ledger (`!data.exists()`) readable solely by `admin`.
- **Station Calibration**: Write-restricted to `admin` with numerical boundary checks on sensor offsets.

## 5. Reliability & Failure Modes
- **Heartbeat & Timeout**: If no valid packet arrives from registered device within 5 minutes, the interface transitions to `Station Offline — showing last known data`.
- **Safe Demo Mode**: When physical hardware is powered down or in lab transit, demo mode supplies realistic mathematical microclimate patterns for uninterrupted evaluation.
- **Graceful Offline Fallback**: If network or Firebase cloud services are unreachable, the dashboard automatically falls back to an offline simulated state machine without crashing.
- **Accessibility**: All alert badges and warning states utilize clear textual descriptions in addition to color indicators to ensure WCAG 2.1 AA compliance.

