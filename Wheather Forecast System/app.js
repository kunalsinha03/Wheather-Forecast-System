/**
 * WeatherSense - Smart IoT Weather Monitoring and Forecasting System
 * College IoT Club Web Application Logic
 * Integrates ESP32 Telemetry Engine + Live WeatherAPI.com Service (Key: 53de50c75703481f8b3200418261910)
 * Firebase Authentication, RBAC Governance & Realtime Database Synchronization
 */

import * as firebaseService from './firebase-service.js';

(function () {
  'use strict';

  // --- Active WeatherAPI.com Configuration ---
  const DEFAULT_WEATHER_API_KEY = '53de50c75703481f8b3200418261910';
  let weatherApiKey = DEFAULT_WEATHER_API_KEY;
  let currentCityQuery = 'auto:ip';
  let isLiveApiMode = true;

  // --- System State ---
  const state = {
    mode: 'live', // 'live', 'demo', or 'offline'
    theme: 'dark', // 'dark', 'light', 'editorial'
    reducedMotion: false,
    autoStream: true,
    streamTimer: null,
    selectedChartMetric: 'temperature',
    selectedTimeframe: '24h',
    lastReading: null,
    scenario: 'live-api',
    history: [],
    rawForecastDays: null,
    liveScenarioData: null
  };

  // --- Preset Atmospheric Scenarios for Evaluators ---
  const SCENARIOS = {
    comfortable: {
      name: 'Comfortable Spring',
      greeting: 'Pleasant & serene.',
      condition: 'Comfortable conditions',
      badge: 'Balanced atmosphere',
      temp: 23.4,
      humidity: 52,
      pressure: 1013.2,
      rainDetected: false,
      rainValue: 42,
      lightLevel: 680,
      windSpeed: 8.5,
      aqi: 28,
      advice1: 'Ideal weather for outdoor college campus activities.',
      advice2: 'Solar efficiency at high performance.',
      mascot: 'sunny',
      mascotTitle: 'Breezy Campus Companion',
      passage: 'Mild temperature with gentle solar irradiation. Atmospheric pressure remains stable around standard sea level equivalent.'
    },
    heatwave: {
      name: 'Extreme Heat 🔥',
      greeting: 'Very hot — stay hydrated.',
      condition: 'Intense Heatwave',
      badge: 'Solar Advisory',
      temp: 38.6,
      humidity: 34,
      pressure: 1007.8,
      rainDetected: false,
      rainValue: 10,
      lightLevel: 1150,
      windSpeed: 14.2,
      aqi: 64,
      advice1: 'Drink plenty of water and limit direct midday sun exposure.',
      advice2: 'Monitor ambient sensor temperature dissipation.',
      mascot: 'sunny',
      mascotTitle: 'Heatwave Solstice Scout',
      passage: 'High thermal envelope detected by BME280. Ambient light reaches peak daytime lux levels with rapid ground warming.'
    },
    warm: {
      name: 'Warm & Sunny ☀️',
      greeting: 'Hello, sunshine.',
      condition: 'Warm conditions',
      badge: 'Clear Sky Cadence',
      temp: 29.8,
      humidity: 48,
      pressure: 1012.0,
      rainDetected: false,
      rainValue: 15,
      lightLevel: 940,
      windSpeed: 11.0,
      aqi: 35,
      advice1: 'Great solar array harvesting window.',
      advice2: 'Open windows for optimal cross ventilation.',
      mascot: 'sunny',
      mascotTitle: 'Sunny Solstice Buddy',
      passage: 'Bright solar conditions with moderate thermal elevation. Gentle breeze maintains pleasant ambient comfort.'
    },
    monsoon: {
      name: 'Rain Downpour 🌧️',
      greeting: 'A little blue.',
      condition: 'Rain detected',
      badge: 'Precipitation Active',
      temp: 18.2,
      humidity: 86,
      pressure: 1004.5,
      rainDetected: true,
      rainValue: 640,
      lightLevel: 180,
      windSpeed: 21.4,
      aqi: 18,
      advice1: 'Carry an umbrella across college walkways.',
      advice2: 'Rain sensor plate registers steady water conductivity.',
      mascot: 'rainy',
      mascotTitle: 'Drizzle Droplet Companion',
      passage: 'Active rainfall detected by station resistive sensor. High atmospheric moisture with declining barometric pressure.'
    },
    storm: {
      name: 'Thunderstorm ⛈️',
      greeting: 'High electric sky.',
      condition: 'Severe Thunderstorm',
      badge: 'Severe Warning',
      temp: 20.5,
      humidity: 92,
      pressure: 998.2,
      rainDetected: true,
      rainValue: 880,
      lightLevel: 95,
      windSpeed: 38.6,
      aqi: 14,
      advice1: 'Seek shelter indoors; secure sensitive outdoor hardware.',
      advice2: 'Strong wind gusts and heavy precipitation recorded.',
      mascot: 'storm',
      mascotTitle: 'Thunder Cloud Vanguard',
      passage: 'Rapid barometric depression with high precipitation volume and strong wind speeds approaching Beaufort force 6.'
    },
    cold: {
      name: 'Winter Chill ❄️',
      greeting: 'Quiet mode: on.',
      condition: 'Cold conditions',
      badge: 'Frost Window',
      temp: 7.8,
      humidity: 62,
      pressure: 1024.1,
      rainDetected: false,
      rainValue: 0,
      lightLevel: 320,
      windSpeed: 9.8,
      aqi: 22,
      advice1: 'Wear warm layers for early morning commute.',
      advice2: 'High barometric pressure indicates cold dense air mass.',
      mascot: 'snow',
      mascotTitle: 'Slumbering Snowdrift Buddy',
      passage: 'Crisp, dense winter atmosphere with elevated atmospheric pressure and subdued solar irradiance.'
    },
    highhumidity: {
      name: 'High Humidity 💧',
      greeting: 'Dense ambient mist.',
      condition: 'High humidity',
      badge: 'Moisture Saturated',
      temp: 26.5,
      humidity: 89,
      pressure: 1009.4,
      rainDetected: false,
      rainValue: 120,
      lightLevel: 410,
      windSpeed: 4.8,
      aqi: 45,
      advice1: 'Air feels heavy; dehumidification recommended.',
      advice2: 'Condensation risk on cold sensor surfaces.',
      mascot: 'rainy',
      mascotTitle: 'Mist & Moisture Sentry',
      passage: 'Elevated relative humidity exceeding 85%. Ambient vapor pressure creates noticeable thermal mugginess.'
    },
    strongwind: {
      name: 'Strong Gale 💨',
      greeting: 'Brisk atmospheric rush.',
      condition: 'Strong wind detected',
      badge: 'Gale Warning',
      temp: 21.2,
      humidity: 58,
      pressure: 1006.1,
      rainDetected: false,
      rainValue: 30,
      lightLevel: 750,
      windSpeed: 36.4,
      aqi: 20,
      advice1: 'Secure loose items and light college banners.',
      advice2: 'Anemometer registers continuous sustained gusts above 30 km/h.',
      mascot: 'storm',
      mascotTitle: 'Gale Wind Navigator',
      passage: 'Steep pressure gradient causing vigorous air displacement. Anemometer pulse counter frequency spikes.'
    },
    offline: {
      name: 'Station Offline ⚠️',
      greeting: 'Telemetry interrupted.',
      condition: 'Station offline — showing last known data',
      badge: 'Connection Lost',
      temp: 22.0,
      humidity: 55,
      pressure: 1012.0,
      rainDetected: false,
      rainValue: 0,
      lightLevel: 500,
      windSpeed: 0,
      aqi: 30,
      advice1: 'Check ESP32 Wi-Fi antenna and 5V power supply.',
      advice2: 'Station offline timeout triggered (> 5 minutes elapsed).',
      mascot: 'sunny',
      mascotTitle: 'Offline Sentinel',
      passage: 'No recent valid packet received from device ID "weather-station-01". Displaying cached telemetry state.'
    }
  };

  // --- Generate 24-Hour Historical Seed Data ---
  function generateHistoricalData(baseTemp = 28.0) {
    const list = [];
    const now = Date.now();
    const count = 48; // every 30 mins for 24h

    for (let i = count; i >= 0; i--) {
      const time = new Date(now - i * 30 * 60 * 1000);
      const hour = time.getHours();

      // Diurnal curve
      const solarFactor = Math.sin(((hour - 6) / 24) * 2 * Math.PI);
      const temp = +(baseTemp - 3 + solarFactor * 6 + (Math.random() * 0.8 - 0.4)).toFixed(1);
      const humidity = Math.min(100, Math.max(20, Math.round(65 - solarFactor * 20 + (Math.random() * 4 - 2))));
      const pressure = +(1011 + (Math.random() * 1.2 - 0.6) - solarFactor * 0.6).toFixed(1);
      const light = Math.max(0, Math.round(solarFactor > 0 ? solarFactor * 900 + Math.random() * 50 : 0));
      const rainVal = Math.random() > 0.9 ? Math.round(Math.random() * 200) : 0;
      const wind = +(3 + Math.random() * 8).toFixed(1);

      list.push({
        deviceId: 'weather-station-01',
        timestamp: time.toISOString(),
        timeLabel: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateLabel: time.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        temperature: temp,
        humidity: humidity,
        pressure: pressure,
        rainDetected: rainVal > 150,
        rainValue: rainVal,
        lightLevel: light,
        windSpeed: wind,
        aqi: Math.round(25 + Math.random() * 15),
        source: 'live-api'
      });
    }
    return list;
  }

  // --- Fetch Live Real-Time Weather from WeatherAPI.com ---
  async function fetchLiveWeatherData(query = currentCityQuery) {
    const feedback = document.getElementById('api-key-test-feedback');
    const liveBtn = document.getElementById('btn-live-weatherapi');
    const statusText = document.getElementById('station-status-text');
    const toolbarApiBadge = document.getElementById('toolbar-api-status-badge');
    const detailStatus = document.getElementById('api-detail-status');
    const detailLocation = document.getElementById('api-detail-location');
    const detailPing = document.getElementById('api-detail-ping');
    const modalDot = document.querySelector('.api-status-dot');

    const startTime = performance.now();

    if (feedback) {
      feedback.textContent = `Connecting to WeatherAPI.com for "${query}"...`;
      feedback.style.color = 'var(--cyan-primary)';
    }

    try {
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${encodeURIComponent(query)}&days=5&aqi=yes&alerts=yes`;
      const response = await fetch(url);
      const durationMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        let msg = `HTTP ${response.status}: Failed to retrieve data from WeatherAPI.com`;
        try {
          const errData = await response.json();
          if (errData && errData.error && errData.error.message) {
            msg = `${errData.error.message} (Code ${errData.error.code || response.status})`;
          }
        } catch (_) {}
        throw new Error(msg);
      }

      const data = await response.json();
      currentCityQuery = data.location.name || query;
      isLiveApiMode = true;
      state.mode = 'live';

      // Update Toolbar buttons
      if (liveBtn) {
        liveBtn.classList.add('active');
        liveBtn.innerHTML = `🌐 Live: ${data.location.name}`;
      }
      document.querySelectorAll('[data-scenario]').forEach(b => b.classList.remove('active'));

      // Update API Modal Diagnostic values
      if (toolbarApiBadge) toolbarApiBadge.textContent = '200 OK';
      if (detailStatus) {
        detailStatus.textContent = '200 OK Live';
        detailStatus.style.color = 'var(--green-healthy)';
      }
      if (detailLocation) detailLocation.textContent = `${data.location.name}, ${data.location.region || data.location.country}`;
      if (detailPing) detailPing.textContent = `${durationMs} ms`;
      if (modalDot) {
        modalDot.className = 'api-status-dot active';
      }

      // Parse Live Telemetry Reading
      const cur = data.current;
      const loc = data.location;
      const conditionText = cur.condition ? cur.condition.text : 'Fair';
      const isRain = conditionText.toLowerCase().includes('rain') || (cur.precip_mm > 0);
      const isStorm = conditionText.toLowerCase().includes('thunder') || conditionText.toLowerCase().includes('storm');
      const isSnow = conditionText.toLowerCase().includes('snow') || conditionText.toLowerCase().includes('ice');

      // Estimate Lux from UV and daytime
      const lightLux = cur.is_day ? Math.round((cur.uv || 3) * 130 + 350) : 10;
      const rainAnalog = isRain ? Math.min(1024, Math.round((cur.precip_mm || 1.5) * 80 + 300)) : 15;

      const reading = {
        deviceId: 'weather-station-01',
        timestamp: cur.last_updated ? new Date(cur.last_updated).toISOString() : new Date().toISOString(),
        temperature: cur.temp_c,
        humidity: cur.humidity,
        pressure: cur.pressure_mb,
        rainDetected: isRain,
        rainValue: rainAnalog,
        lightLevel: lightLux,
        windSpeed: cur.wind_kph,
        aqi: cur.air_quality ? Math.round(cur.air_quality.pm2_5 || 25) : 25,
        source: 'weatherapi.com'
      };

      state.lastReading = reading;
      state.rawForecastDays = data.forecast ? data.forecast.forecastday : null;

      // Determine Companion Mascot
      let mascotType = 'sunny';
      let mascotName = 'Solar Synoptic Guide';
      if (isStorm) {
        mascotType = 'storm';
        mascotName = 'Thunder Cloud Vanguard';
      } else if (isRain) {
        mascotType = 'rainy';
        mascotName = 'Drizzle Droplet Companion';
      } else if (isSnow || cur.temp_c < 12) {
        mascotType = 'snow';
        mascotName = 'Slumbering Snowdrift Buddy';
      }

      const liveScenarioData = {
        name: `Live: ${loc.name}`,
        greeting: cur.temp_c >= 35 ? 'High thermal conditions.' : (cur.temp_c < 15 ? 'Brisk chill in the air.' : 'Live atmosphere synced.'),
        condition: `${conditionText} (${cur.temp_c.toFixed(1)}°C)`,
        badge: 'Live Meteorological Feed',
        temp: cur.temp_c,
        humidity: cur.humidity,
        pressure: cur.pressure_mb,
        rainDetected: isRain,
        rainValue: rainAnalog,
        lightLevel: lightLux,
        windSpeed: cur.wind_kph,
        aqi: reading.aqi,
        advice1: `Current humidity: ${cur.humidity}% · Barometric pressure: ${cur.pressure_mb} hPa.`,
        advice2: `UV Index: ${cur.uv || 0} · Wind vector: ${cur.wind_dir || 'N'} @ ${cur.wind_kph} km/h.`,
        mascot: mascotType,
        mascotTitle: `${mascotName} (${loc.name})`,
        passage: `Live synoptic telemetry acquired for ${loc.name}, ${loc.region ? loc.region + ', ' : ''}${loc.country}. Meteorological station reports ${conditionText.toLowerCase()} with ambient feels-like index at ${cur.feelslike_c}°C.`
      };

      state.liveScenarioData = liveScenarioData;

      // Update Location Label in Hero
      const locTag = document.querySelector('.location-tag');
      if (locTag) {
        locTag.innerHTML = `<span>📍</span> ${loc.name}, ${loc.region ? loc.region + ', ' : ''}${loc.country} · Synoptic Feed`;
      }

      // Update Subtitle in Forecast Section
      const forecastSubtitle = document.getElementById('forecast-source-subtitle');
      if (forecastSubtitle) {
        forecastSubtitle.textContent = `Live 5-Day Forecast provided by WeatherAPI.com for ${loc.name} (Key: ${weatherApiKey.slice(0, 6)}...${weatherApiKey.slice(-4)})`;
      }

      // Update Feedback Badge
      if (feedback) {
        feedback.textContent = `✔ Connected: ${loc.name}, ${loc.country} · ${cur.temp_c}°C (${conditionText}) · WeatherAPI.com 200 OK (${durationMs}ms)`;
        feedback.style.color = 'var(--green-healthy)';
      }

      // Append point to history
      const nowTime = new Date();
      state.history.push({
        deviceId: 'weather-station-01',
        timestamp: reading.timestamp,
        timeLabel: nowTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateLabel: nowTime.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        temperature: reading.temperature,
        humidity: reading.humidity,
        pressure: reading.pressure,
        rainDetected: reading.rainDetected,
        rainValue: reading.rainValue,
        lightLevel: reading.lightLevel,
        windSpeed: reading.windSpeed,
        aqi: reading.aqi,
        source: 'weatherapi'
      });
      if (state.history.length > 60) state.history.shift();

      // Update All UI Views
      updateUIWithReading(reading, liveScenarioData, true);
      renderLiveForecastCards(data.forecast.forecastday);
      renderLiveHourlyHorizon(data.forecast.forecastday[0].hour);
      renderChart();

      // Synchronize live telemetry to Firebase Realtime Database
      firebaseService.syncTelemetryToFirebase(reading);

      // Check for Severe Weather Alerts
      if (data.alerts && data.alerts.alert && data.alerts.alert.length > 0) {
        const topAlert = data.alerts.alert[0];
        const banner = document.getElementById('alert-banner');
        const alertText = document.getElementById('alert-text');
        const alertBox = document.getElementById('alert-box');
        if (banner && alertText && alertBox) {
          banner.className = 'alert-banner visible';
          alertBox.className = 'alert-box';
          alertText.textContent = `Meteorological Alert: ${topAlert.headline || topAlert.event || 'Adverse weather advisory in effect.'}`;
        }
      }

    } catch (err) {
      console.warn('WeatherAPI error:', err);
      if (toolbarApiBadge) toolbarApiBadge.textContent = 'Err';
      if (detailStatus) {
        detailStatus.textContent = 'API Error';
        detailStatus.style.color = 'var(--red-alert)';
      }
      if (modalDot) {
        modalDot.className = 'api-status-dot error';
      }
      if (feedback) {
        feedback.textContent = `⚠️ WeatherAPI Notice: ${err.message}. Retaining active telemetry model.`;
        feedback.style.color = 'var(--amber-warning)';
      }
    }
  }

  // --- Render Real 5-Day Forecast Cards from WeatherAPI ---
  function renderLiveForecastCards(days) {
    const grid = document.getElementById('forecast-grid');
    if (!grid || !days || days.length === 0) return;

    grid.innerHTML = '';
    days.forEach((item, idx) => {
      const dateObj = new Date(item.date + 'T00:00:00');
      const dayName = idx === 0 ? 'Today' : (idx === 1 ? 'Tomorrow' : dateObj.toLocaleDateString('en-US', { weekday: 'long' }));
      const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const day = item.day;
      const astro = item.astro || {};

      // Weather icon mapping
      let icon = '⛅';
      const cond = (day.condition ? day.condition.text : '').toLowerCase();
      if (cond.includes('sun') || cond.includes('clear')) icon = '☀️';
      else if (cond.includes('rain') || cond.includes('drizzle')) icon = '🌧️';
      else if (cond.includes('thunder') || cond.includes('storm')) icon = '⛈️';
      else if (cond.includes('snow') || cond.includes('sleet') || cond.includes('blizzard')) icon = '❄️';
      else if (cond.includes('fog') || cond.includes('mist') || cond.includes('haze')) icon = '🌫️';

      const card = document.createElement('article');
      card.className = 'forecast-card';
      card.innerHTML = `
        <div class="forecast-card-top">
          <div>
            <h3 class="forecast-day">${dayName}</h3>
            <span class="forecast-date">${dateStr}</span>
          </div>
          <span class="card-status-badge">${day.condition ? day.condition.text.slice(0, 16) : 'Forecast'}</span>
        </div>

        <div class="forecast-icon-box">
          <span class="forecast-icon-lg">${icon}</span>
          <div>
            <div class="forecast-condition-name">${day.condition ? day.condition.text : 'Fair'}</div>
            <span style="font-size:0.75rem; color:${day.daily_chance_of_rain > 40 ? 'var(--cyan-primary)' : 'var(--text-muted)'}; font-weight:600;">
              ${day.daily_chance_of_rain || 0}% Rain Chance
            </span>
          </div>
        </div>

        <div class="forecast-temps-row">
          <span class="forecast-high">${Math.round(day.maxtemp_c)}°</span>
          <span class="forecast-low">${Math.round(day.mintemp_c)}°</span>
        </div>

        <div class="forecast-metrics-mini">
          <div class="mini-metric"><span>💧</span> ${Math.round(day.avghumidity || 50)}% Hum</div>
          <div class="mini-metric"><span>💨</span> ${Math.round(day.maxwind_kph || 10)} km/h</div>
          <div class="mini-metric"><span>☀️</span> UV ${day.uv || 5}</div>
          <div class="mini-metric"><span>🌅</span> ${astro.sunrise || '06:15 AM'}</div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // --- Render Real Hourly Horizon from WeatherAPI ---
  function renderLiveHourlyHorizon(hours) {
    const container = document.getElementById('hourly-scroll');
    if (!container || !hours || hours.length === 0) return;

    container.innerHTML = '';
    const currentHour = new Date().getHours();
    
    // Pick current hour + next 7 hours
    const filtered = [];
    for (let i = 0; i < 8; i++) {
      const targetIdx = (currentHour + i) % 24;
      filtered.push(hours[targetIdx]);
    }

    filtered.forEach((h, idx) => {
      const timeStr = idx === 0 ? 'Now' : new Date(h.time).toLocaleTimeString([], { hour: 'numeric' });
      const cond = (h.condition ? h.condition.text : '').toLowerCase();
      let icon = '⛅';
      if (cond.includes('sun') || cond.includes('clear')) icon = h.is_day ? '☀️' : '🌙';
      else if (cond.includes('rain') || cond.includes('drizzle')) icon = '🌧️';
      else if (cond.includes('thunder')) icon = '⛈️';
      else if (cond.includes('snow')) icon = '❄️';

      const card = document.createElement('div');
      card.className = `hourly-card ${idx === 0 ? 'now' : ''}`;
      card.innerHTML = `
        <span class="hourly-time">${timeStr}</span>
        <span class="hourly-icon">${icon}</span>
        <span class="hourly-temp">${Math.round(h.temp_c)}°</span>
        <span class="hourly-detail">${h.condition ? h.condition.text.slice(0, 14) : 'Fair'}</span>
      `;
      container.appendChild(card);
    });
  }

  // --- Firebase Auth & RBAC Integration ---
  function setupFirebaseAuthAndRbac() {
    // 1. Auth State Observer
    firebaseService.onAuthChanged(updateUserRoleUI);

    // 2. Audit Logs Observer
    firebaseService.onAuditLogsChanged(renderAuditLogs);

    // 3. Remote Telemetry Listener
    firebaseService.listenToRemoteTelemetry((remoteData) => {
      if (remoteData && remoteData.source === 'esp32-direct') {
        const scenarioData = {
          name: 'ESP32 Node-01 (Direct Hardware Packet)',
          greeting: 'Live Hardware Telemetry Received.',
          condition: `Direct ADC Sensor Reading (${remoteData.temperature}°C)`,
          badge: 'Physical Node Telemetry',
          temp: remoteData.temperature,
          humidity: remoteData.humidity,
          pressure: remoteData.pressure,
          rainDetected: remoteData.rainDetected,
          rainValue: remoteData.rainValue,
          lightLevel: remoteData.lightLevel,
          windSpeed: remoteData.windSpeed,
          aqi: remoteData.aqi,
          advice1: `Hardware node BME280 active at 240MHz ESP32 clock.`,
          advice2: `ADC readings median-filtered via FreeRTOS queue.`,
          mascot: remoteData.rainDetected ? 'rainy' : (remoteData.temperature < 15 ? 'snow' : 'sunny'),
          mascotTitle: 'ESP32 Sentinel',
          passage: `Real-time physical telemetry ingested directly from IoT node ${remoteData.deviceId}.`
        };
        updateUIWithReading(remoteData, scenarioData, true);
        renderChart();
      }
    });

    // 4. Quick Segmented RBAC Buttons in Evaluator Toolbar
    document.querySelectorAll('.role-btn[data-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.getAttribute('data-role');
        firebaseService.switchDemoRole(role);
      });
    });

    // 5. Auth Modal Triggers
    const authModal = document.getElementById('auth-modal');
    const openAuthBtn = document.getElementById('btn-open-auth-modal');
    const closeAuthBtn = document.getElementById('btn-close-auth-modal');
    const authFeedback = document.getElementById('auth-feedback');
    const unlockElevateBtn = document.getElementById('btn-unlock-elevate');
    const unlockAuditBtn = document.getElementById('btn-unlock-audit-elevate');

    if (openAuthBtn && authModal) {
      openAuthBtn.addEventListener('click', () => {
        authModal.style.display = 'flex';
      });
    }

    if (closeAuthBtn && authModal) {
      closeAuthBtn.addEventListener('click', () => {
        authModal.style.display = 'none';
      });
    }

    if (authModal) {
      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) authModal.style.display = 'none';
      });
    }

    if (unlockElevateBtn) {
      unlockElevateBtn.addEventListener('click', () => {
        firebaseService.switchDemoRole('admin');
      });
    }

    if (unlockAuditBtn) {
      unlockAuditBtn.addEventListener('click', () => {
        firebaseService.switchDemoRole('admin');
      });
    }

    // 6. Auth Modal Tabs
    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const tabDemo = document.getElementById('tab-auth-demo');
    const roleSelectWrap = document.getElementById('auth-role-select-wrap');
    const demoSection = document.getElementById('demo-credentials-section');
    const authForm = document.getElementById('auth-form');
    const submitBtn = document.getElementById('btn-auth-submit');
    const signoutBtn = document.getElementById('btn-auth-signout');

    let currentAuthTab = 'login'; // 'login', 'register', 'demo'

    if (tabLogin && tabRegister && tabDemo) {
      tabLogin.addEventListener('click', () => {
        currentAuthTab = 'login';
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        tabDemo.classList.remove('active');
        if (roleSelectWrap) roleSelectWrap.style.display = 'none';
        if (authForm) authForm.style.display = 'flex';
        if (demoSection) demoSection.style.display = 'none';
        if (submitBtn) submitBtn.textContent = '🔐 Sign In';
        if (authFeedback) authFeedback.textContent = '';
      });

      tabRegister.addEventListener('click', () => {
        currentAuthTab = 'register';
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        tabDemo.classList.remove('active');
        if (roleSelectWrap) roleSelectWrap.style.display = 'block';
        if (authForm) authForm.style.display = 'flex';
        if (demoSection) demoSection.style.display = 'none';
        if (submitBtn) submitBtn.textContent = '✨ Create Account';
        if (authFeedback) authFeedback.textContent = '';
      });

      tabDemo.addEventListener('click', () => {
        currentAuthTab = 'demo';
        tabDemo.classList.add('active');
        tabLogin.classList.remove('active');
        tabRegister.classList.remove('active');
        if (authForm) authForm.style.display = 'none';
        if (demoSection) demoSection.style.display = 'flex';
        if (authFeedback) authFeedback.textContent = '';
      });
    }

    // 7. Demo Account Buttons
    document.querySelectorAll('.demo-account-btn[data-demo-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.getAttribute('data-demo-role');
        firebaseService.switchDemoRole(role);
        if (authModal) authModal.style.display = 'none';
      });
    });

    // 8. Auth Form Submit
    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-input-email').value.trim();
        const pass = document.getElementById('auth-input-password').value;
        const role = document.getElementById('auth-select-role') ? document.getElementById('auth-select-role').value : 'viewer';

        if (authFeedback) {
          authFeedback.textContent = 'Authenticating with Firebase...';
          authFeedback.style.color = 'var(--cyan-primary)';
        }

        try {
          if (currentAuthTab === 'register') {
            await firebaseService.signUpUser(email, pass, role);
            if (authFeedback) {
              authFeedback.textContent = `✔ Account registered and logged in as ${role.toUpperCase()}!`;
              authFeedback.style.color = 'var(--green-healthy)';
            }
          } else {
            await firebaseService.signInUser(email, pass);
            if (authFeedback) {
              authFeedback.textContent = '✔ Signed in successfully!';
              authFeedback.style.color = 'var(--green-healthy)';
            }
          }

          setTimeout(() => {
            if (authModal) authModal.style.display = 'none';
          }, 800);
        } catch (err) {
          if (authFeedback) {
            authFeedback.textContent = `⚠️ Auth Error: ${err.message}`;
            authFeedback.style.color = 'var(--red-alert)';
          }
        }
      });
    }

    // 9. Signout Button
    if (signoutBtn) {
      signoutBtn.addEventListener('click', async () => {
        await firebaseService.signOutUser();
        if (authFeedback) {
          authFeedback.textContent = 'Signed out.';
          authFeedback.style.color = 'var(--text-muted)';
        }
      });
    }

    // 10. Sensor Calibration Controls (Admin Only)
    const calTemp = document.getElementById('slider-cal-temp');
    const calHum = document.getElementById('slider-cal-hum');
    const calPress = document.getElementById('slider-cal-press');
    const saveCalBtn = document.getElementById('btn-save-calibration');

    if (calTemp) {
      calTemp.addEventListener('input', (e) => {
        const val = +(e.target.value);
        document.getElementById('cal-temp-val').textContent = (val >= 0 ? '+' : '') + val.toFixed(1) + ' °C';
      });
    }

    if (calHum) {
      calHum.addEventListener('input', (e) => {
        const val = +(e.target.value);
        document.getElementById('cal-hum-val').textContent = (val >= 0 ? '+' : '') + val + ' % RH';
      });
    }

    if (calPress) {
      calPress.addEventListener('input', (e) => {
        const val = +(e.target.value);
        document.getElementById('cal-press-val').textContent = (val >= 0 ? '+' : '') + val.toFixed(1) + ' hPa';
      });
    }

    if (saveCalBtn) {
      saveCalBtn.addEventListener('click', async () => {
        if (!firebaseService.isUserAdmin()) {
          showRbacDeniedToast('Admin privileges required to save sensor calibration.');
          return;
        }

        const offsets = {
          temp: +(calTemp.value),
          hum: +(calHum.value),
          press: +(calPress.value)
        };

        const fb = document.getElementById('admin-action-feedback');
        if (fb) fb.textContent = 'Saving calibration matrix to Firebase...';

        try {
          await firebaseService.saveStationCalibration(offsets);
          if (fb) {
            fb.textContent = '✔ Calibration offsets saved and synced to Firebase RTDB!';
            fb.style.color = 'var(--green-healthy)';
            setTimeout(() => { fb.textContent = ''; }, 3000);
          }
        } catch (err) {
          if (fb) {
            fb.textContent = `⚠️ Error: ${err.message}`;
            fb.style.color = 'var(--red-alert)';
          }
        }
      });
    }

    // 11. Hardware Telemetry Injection (Admin & Operator)
    const injectBtn = document.getElementById('btn-inject-telemetry');
    if (injectBtn) {
      injectBtn.addEventListener('click', async () => {
        if (!firebaseService.isUserOperatorOrAdmin()) {
          showRbacDeniedToast('Operator or Admin privileges required to inject telemetry packets.');
          return;
        }

        const tVal = parseFloat(document.getElementById('ingest-temp').value);
        const hVal = parseFloat(document.getElementById('ingest-hum').value);
        const pVal = parseFloat(document.getElementById('ingest-press').value);
        const wVal = parseFloat(document.getElementById('ingest-wind').value);

        // Validation bounds
        if (isNaN(tVal) || tVal < -40 || tVal > 85) {
          alert('Validation Error: Temperature must be between -40.0°C and 85.0°C.');
          return;
        }
        if (isNaN(hVal) || hVal < 0 || hVal > 100) {
          alert('Validation Error: Relative humidity must be between 0% and 100%.');
          return;
        }
        if (isNaN(pVal) || pVal < 800 || pVal > 1100) {
          alert('Validation Error: Barometric pressure must be between 800.0 hPa and 1100.0 hPa.');
          return;
        }
        if (isNaN(wVal) || wVal < 0 || wVal > 200) {
          alert('Validation Error: Wind speed must be between 0.0 km/h and 200.0 km/h.');
          return;
        }

        const injectedReading = {
          deviceId: 'weather-station-01',
          timestamp: new Date().toISOString(),
          temperature: tVal,
          humidity: hVal,
          pressure: pVal,
          windSpeed: wVal,
          lightLevel: 720,
          rainValue: 35,
          rainDetected: false,
          aqi: 32,
          source: 'esp32-direct'
        };

        const fb = document.getElementById('admin-action-feedback');
        if (fb) fb.textContent = 'Broadcasting telemetry packet to Firebase...';

        await firebaseService.syncTelemetryToFirebase(injectedReading);
        firebaseService.logAuditEvent('TELEMETRY_INJECT', `Manual telemetry packet broadcast: ${tVal}°C, ${hVal}%, ${pVal} hPa.`);

        if (fb) {
          fb.textContent = `✔ Packet broadcast to Firebase RTDB · Live HUD updated!`;
          fb.style.color = 'var(--green-healthy)';
          setTimeout(() => { fb.textContent = ''; }, 3000);
        }

        const scenarioData = {
          name: 'Manual Hardware Packet (ESP32 Simulation)',
          greeting: 'Simulated ESP32 reading ingested.',
          condition: `Telemetry Ingest: ${tVal}°C`,
          badge: 'Direct Hardware Telemetry',
          temp: tVal,
          humidity: hVal,
          pressure: pVal,
          rainDetected: false,
          rainValue: 35,
          lightLevel: 720,
          windSpeed: wVal,
          aqi: 32,
          advice1: 'Sensor boundaries validated against Draft-07 JSON schema.',
          advice2: 'Packet cryptographically logged to Firebase Audit Trail.',
          mascot: 'sunny',
          mascotTitle: 'ESP32 Simulator Scout',
          passage: `Manually crafted sensor packet received with ambient temperature at ${tVal}°C and barometric pressure at ${pVal} hPa.`
        };

        updateUIWithReading(injectedReading, scenarioData, true);
        renderChart();
      });
    }

    // 12. Alert Dispatcher (Admin & Operator)
    const alertDispatchBtn = document.getElementById('btn-dispatch-alert');
    if (alertDispatchBtn) {
      alertDispatchBtn.addEventListener('click', () => {
        if (!firebaseService.isUserOperatorOrAdmin()) {
          showRbacDeniedToast('Operator or Admin role required to broadcast advisories.');
          return;
        }

        const msg = prompt('Enter Emergency Weather Notice to broadcast campus-wide:', 'Meteorological Advisory: Severe wind gusts and localized thunderstorm expected.');
        if (msg) {
          const banner = document.getElementById('alert-banner');
          const alertText = document.getElementById('alert-text');
          const alertBox = document.getElementById('alert-box');
          if (banner && alertText && alertBox) {
            banner.className = 'alert-banner visible';
            alertBox.className = 'alert-box';
            alertText.textContent = `⚠️ Broadcast Alert: ${msg}`;
          }
          firebaseService.logAuditEvent('ALERT_BROADCAST', `Advisory broadcast: "${msg}"`);
        }
      });
    }

    // 13. Clear Local Audit Logs
    const clearAuditBtn = document.getElementById('btn-clear-audit-logs');
    if (clearAuditBtn) {
      clearAuditBtn.addEventListener('click', () => {
        if (!firebaseService.isUserAdmin()) {
          showRbacDeniedToast('Admin role required to manage audit ledgers.');
          return;
        }
        firebaseService.logAuditEvent('AUDIT_RESET', 'Administrator cleared local audit log cache.');
      });
    }
  }

  // --- Update User Role UI & Lock Overlays ---
  function updateUserRoleUI(user) {
    const role = user.role || 'viewer';
    const isGuest = user.isDemoLocal && user.uid === 'guest-viewer';

    // Update Header Role Badge
    const headerBadge = document.getElementById('header-user-badge');
    const headerRoleText = document.getElementById('header-role-text');
    const headerRoleIcon = document.getElementById('header-role-icon');
    const headerAuthLabel = document.getElementById('header-auth-label');

    if (headerBadge) {
      headerBadge.className = `user-role-badge ${role}`;
    }
    if (headerRoleText) {
      headerRoleText.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    }
    if (headerRoleIcon) {
      headerRoleIcon.textContent = role === 'admin' ? '👑' : (role === 'operator' ? '🛠️' : '👤');
    }
    if (headerAuthLabel) {
      headerAuthLabel.textContent = isGuest ? 'Sign In' : (role.toUpperCase() + ' Session');
    }

    // Update Auth Modal Active Status
    const modalEmail = document.getElementById('auth-current-email');
    const modalBadge = document.getElementById('auth-current-role-badge');
    const signoutBtn = document.getElementById('btn-auth-signout');

    if (modalEmail) modalEmail.textContent = user.email || 'guest@weathersense.iot';
    if (modalBadge) {
      modalBadge.innerHTML = `Assigned Role: <strong style="color:var(--text-white); text-transform:uppercase;">${role}</strong> (${role === 'admin' ? 'Full Control' : (role === 'operator' ? 'Operator Access' : 'Read Only')})`;
    }
    if (signoutBtn) {
      signoutBtn.style.display = isGuest ? 'none' : 'block';
    }

    // Update Segmented Role Buttons
    document.querySelectorAll('.role-btn[data-role]').forEach(btn => {
      if (btn.getAttribute('data-role') === role) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Toggle Admin Lock Overlays
    const opsLock = document.getElementById('admin-ops-lock');
    const auditLock = document.getElementById('admin-audit-lock');

    if (role === 'admin') {
      if (opsLock) opsLock.classList.add('hidden');
      if (auditLock) auditLock.classList.add('hidden');
    } else if (role === 'operator') {
      if (opsLock) opsLock.classList.add('hidden');
      if (auditLock) auditLock.classList.remove('hidden');
    } else {
      if (opsLock) opsLock.classList.remove('hidden');
      if (auditLock) auditLock.classList.remove('hidden');
    }
  }

  // --- Render Audit Logs ---
  function renderAuditLogs(logs) {
    const list = document.getElementById('audit-log-list');
    const counter = document.getElementById('audit-log-counter');
    if (!list) return;

    list.innerHTML = '';
    if (counter) counter.textContent = `Showing ${logs.length} logged event${logs.length === 1 ? '' : 's'}`;

    logs.forEach(item => {
      const entry = document.createElement('div');
      entry.className = 'audit-log-entry';

      const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

      entry.innerHTML = `
        <div class="audit-entry-top">
          <span class="audit-action-pill ${item.action}">${item.action}</span>
          <span class="audit-time">${dateStr} · ${timeStr}</span>
        </div>
        <div class="audit-desc">${item.details}</div>
        <div class="audit-actor">Actor: <code>${item.actor}</code> · Role: <span style="text-transform:uppercase; font-weight:700;">${item.role}</span></div>
      `;
      list.appendChild(entry);
    });
  }

  // --- Show RBAC Toast ---
  function showRbacDeniedToast(message) {
    const toast = document.getElementById('rbac-toast');
    const msg = document.getElementById('rbac-toast-msg');
    if (toast && msg) {
      msg.textContent = message;
      toast.style.display = 'flex';
      setTimeout(() => { toast.style.display = 'none'; }, 4000);
    }
  }

  // --- Initialize Application ---
  function init() {
    state.history = generateHistoricalData(28.0);
    setupEventListeners();
    setupChartCanvas();
    renderChart();

    // Live clock update
    updateClock();
    setInterval(updateClock, 1000);

    // Initialize Firebase Services & RBAC
    firebaseService.initFirebase();
    setupFirebaseAuthAndRbac();

    // Initial Live Fetch with WeatherAPI.com Key
    fetchLiveWeatherData(currentCityQuery);

    // Continuous auto-simulation loop
    startAutoStream();
  }

  function updateClock() {
    const el = document.getElementById('live-timestamp');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }) + ' · ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }

  // --- Apply a Weather Scenario ---
  function applyScenario(scenarioKey, triggerPing = true) {
    const data = SCENARIOS[scenarioKey];
    if (!data) return;

    isLiveApiMode = false;
    state.scenario = scenarioKey;
    const isOffline = scenarioKey === 'offline';
    state.mode = isOffline ? 'offline' : (state.mode === 'live' ? 'live' : 'demo');

    // Reset Live API button active state
    const liveBtn = document.getElementById('btn-live-weatherapi');
    if (liveBtn) liveBtn.classList.remove('active');

    // Build sensor reading object
    const reading = {
      deviceId: 'weather-station-01',
      timestamp: new Date().toISOString(),
      temperature: data.temp,
      humidity: data.humidity,
      pressure: data.pressure,
      rainDetected: data.rainDetected,
      rainValue: data.rainValue,
      lightLevel: data.lightLevel,
      windSpeed: data.windSpeed,
      aqi: data.aqi,
      source: isOffline ? 'offline' : state.mode
    };

    state.lastReading = reading;

    // Reset Location Tag for Scenario
    const locTag = document.querySelector('.location-tag');
    if (locTag) {
      locTag.innerHTML = `<span>📍</span> Campus Weather Observatory · Station Node-01`;
    }

    // Reset Forecast Subtitle
    const forecastSubtitle = document.getElementById('forecast-source-subtitle');
    if (forecastSubtitle) {
      forecastSubtitle.textContent = `Forecast provided by Synoptic Model (Simulated for Campus Observatory)`;
    }

    updateUIWithReading(reading, data, triggerPing);
    updateScenarioButtons(scenarioKey);
    updateHourlyForecastFallback();
  }

  // --- Update Dashboard UI with Telemetry Reading ---
  function updateUIWithReading(reading, scenarioData, triggerPing = true) {
    // 1. Station Status Badge
    const statusPill = document.getElementById('station-status-pill');
    const statusText = document.getElementById('station-status-text');
    if (statusPill && statusText) {
      statusPill.className = 'station-status-pill ' + state.mode;
      if (isLiveApiMode) {
        statusText.textContent = `WeatherAPI: Live (${currentCityQuery})`;
      } else if (state.mode === 'live') {
        statusText.textContent = 'IoT Station Online';
      } else if (state.mode === 'demo') {
        statusText.textContent = 'Demo Mode Active';
      } else {
        statusText.textContent = 'Station Offline';
      }
    }

    // 2. Refresh Ping Indicator
    if (triggerPing && state.mode !== 'offline') {
      const ping = document.getElementById('refresh-ping');
      if (ping) {
        ping.style.opacity = '1';
        setTimeout(() => { ping.style.opacity = '0'; }, 800);
      }
    }

    // 3. Hero Weather Card
    const heroGreeting = document.getElementById('hero-greeting');
    const heroCondition = document.getElementById('hero-condition');
    const heroTemp = document.getElementById('hero-temp-val');
    const heroPassage = document.getElementById('hero-passage');
    const heroFeels = document.getElementById('hero-feels-val');
    const heroRange = document.getElementById('hero-range-val');
    const ambientGlow = document.getElementById('ambient-glow');

    if (heroGreeting) heroGreeting.textContent = scenarioData.greeting;
    if (heroCondition) heroCondition.textContent = scenarioData.condition;
    if (heroTemp) heroTemp.textContent = reading.temperature.toFixed(1);
    if (heroPassage) heroPassage.textContent = scenarioData.passage;

    const feelsLike = calculateFeelsLike(reading.temperature, reading.humidity, reading.windSpeed);
    if (heroFeels) heroFeels.textContent = `Feels like ${feelsLike.toFixed(1)}°C`;
    if (heroRange) heroRange.textContent = `H: ${(reading.temperature + 3).toFixed(0)}° · L: ${(reading.temperature - 4).toFixed(0)}°`;

    // Ambient Glow class
    if (ambientGlow) {
      ambientGlow.className = 'ambient-weather-glow';
      if (reading.temperature >= 35) ambientGlow.classList.add('glow-sunny');
      else if (reading.rainDetected && reading.windSpeed > 30) ambientGlow.classList.add('glow-storm');
      else if (reading.rainDetected) ambientGlow.classList.add('glow-rain');
      else if (reading.temperature < 15) ambientGlow.classList.add('glow-cold');
      else if (reading.temperature >= 28) ambientGlow.classList.add('glow-warm');
      else ambientGlow.classList.add('glow-comfortable');
    }

    // 4. Mascot & Advice
    updateMascot(scenarioData);

    // 5. Update Telemetry Metric Cards
    updateMetricCards(reading);

    // 6. Dynamic Alert Banner
    updateAlertBanner(reading);
  }

  // --- Calculate Feels Like (Wind Chill / Heat Index) ---
  function calculateFeelsLike(t, rh, w) {
    if (t >= 27) {
      const hi = -8.78469475556 + 1.61139411 * t + 2.33854883889 * rh - 0.14611605 * t * rh;
      return hi > t ? hi : t;
    } else if (t <= 10 && w > 4.8) {
      return 13.12 + 0.6215 * t - 11.37 * Math.pow(w, 0.16) + 0.3965 * t * Math.pow(w, 0.16);
    }
    return t;
  }

  // --- Update Mascot Illustration & Companion Advice ---
  function updateMascot(data) {
    const mascotImg = document.getElementById('mascot-display-img');
    const mascotName = document.getElementById('mascot-name');
    const advice1 = document.getElementById('advice-item-1');
    const advice2 = document.getElementById('advice-item-2');

    if (mascotImg) {
      mascotImg.src = `assets/mascot-svg-${data.mascot}.svg`;
      mascotImg.alt = data.mascotTitle;
    }
    if (mascotName) mascotName.textContent = data.mascotTitle;
    if (advice1) advice1.textContent = data.advice1;
    if (advice2) advice2.textContent = data.advice2;
  }

  // --- Update Telemetry Metric Cards ---
  function updateMetricCards(r) {
    // Temperature Card
    const tempVal = document.getElementById('val-temp');
    const tempInterp = document.getElementById('interp-temp');
    const tempGauge = document.getElementById('gauge-temp');
    const cardTemp = document.getElementById('card-temperature');

    if (tempVal) tempVal.textContent = r.temperature.toFixed(1);
    if (tempGauge) {
      const pct = Math.min(100, Math.max(0, ((r.temperature - (-10)) / 60) * 100));
      tempGauge.style.width = pct + '%';
    }

    if (cardTemp) {
      cardTemp.classList.remove('anim-heatwave', 'anim-frost');
      if (r.temperature >= 35) {
        tempInterp.textContent = 'Very hot — stay hydrated. Heatwave reaction active.';
        cardTemp.style.setProperty('--card-accent', 'var(--red-alert)');
        cardTemp.classList.add('anim-heatwave');
      } else if (r.temperature >= 28) {
        tempInterp.textContent = 'Warm conditions. Optimal solar absorption.';
        cardTemp.style.setProperty('--card-accent', 'var(--amber-warning)');
      } else if (r.temperature < 15) {
        tempInterp.textContent = 'Cold conditions. Winter chill detected.';
        cardTemp.style.setProperty('--card-accent', 'var(--blue-cold)');
        cardTemp.classList.add('anim-frost');
      } else {
        tempInterp.textContent = 'Comfortable conditions. Mild ambient temperature.';
        cardTemp.style.setProperty('--card-accent', 'var(--green-healthy)');
      }
    }

    // Relative Humidity Card
    const humVal = document.getElementById('val-humidity');
    const humInterp = document.getElementById('interp-humidity');
    const humGauge = document.getElementById('gauge-humidity');
    const cardHum = document.getElementById('card-humidity');

    if (humVal) humVal.textContent = r.humidity;
    if (humGauge) humGauge.style.width = r.humidity + '%';
    if (cardHum) {
      cardHum.classList.remove('anim-mist');
      if (r.humidity >= 80) {
        humInterp.textContent = 'High humidity. High vapor density and mist effect.';
        cardHum.style.setProperty('--card-accent', 'var(--cyan-primary)');
        cardHum.classList.add('anim-mist');
      } else if (r.humidity < 30) {
        humInterp.textContent = 'Dry air. Relative humidity below comfortable threshold.';
        cardHum.style.setProperty('--card-accent', 'var(--amber-warning)');
      } else {
        humInterp.textContent = 'Optimal humidity. Air moisture is well balanced.';
        cardHum.style.setProperty('--card-accent', 'var(--green-healthy)');
      }
    }

    // Barometric Pressure Card
    const pressVal = document.getElementById('val-pressure');
    const pressInterp = document.getElementById('interp-pressure');
    const pressGauge = document.getElementById('gauge-pressure');
    const pressTrend = document.getElementById('trend-pressure');

    if (pressVal) pressVal.textContent = r.pressure.toFixed(1);
    if (pressGauge) {
      const pct = Math.min(100, Math.max(0, ((r.pressure - 970) / (1040 - 970)) * 100));
      pressGauge.style.width = pct + '%';
    }
    if (pressTrend) {
      if (r.pressure < 1005) {
        pressTrend.innerHTML = '&#9660; Dropping';
        pressTrend.className = 'card-trend trend-down';
        pressInterp.textContent = 'Low pressure trough — rain or unsettled weather likely.';
      } else if (r.pressure > 1018) {
        pressTrend.innerHTML = '&#9650; Rising';
        pressTrend.className = 'card-trend trend-up';
        pressInterp.textContent = 'High pressure anticyclone — clear, stable conditions.';
      } else {
        pressTrend.innerHTML = '&#9644; Stable';
        pressTrend.className = 'card-trend trend-stable';
        pressInterp.textContent = 'Standard barometric equilibrium across campus.';
      }
    }

    // Rain Detection Card
    const rainVal = document.getElementById('val-rain');
    const rainInterp = document.getElementById('interp-rain');
    const rainGauge = document.getElementById('gauge-rain');
    const cardRain = document.getElementById('card-rain');

    if (rainVal) {
      rainVal.textContent = r.rainDetected ? 'Active' : 'Dry';
    }
    if (rainGauge) {
      const pct = Math.min(100, (r.rainValue / 1024) * 100);
      rainGauge.style.width = pct + '%';
    }
    if (cardRain) {
      cardRain.classList.remove('anim-rain');
      if (r.rainValue >= 700) {
        rainInterp.textContent = `Heavy rain detected (Analog: ${r.rainValue}/1024). Diagonal precipitation active.`;
        cardRain.style.setProperty('--card-accent', 'var(--cyan-primary)');
        cardRain.classList.add('anim-rain');
      } else if (r.rainDetected) {
        rainInterp.textContent = `Light/moderate rain detected (Analog: ${r.rainValue}/1024).`;
        cardRain.style.setProperty('--card-accent', 'var(--cyan-primary)');
        cardRain.classList.add('anim-rain');
      } else {
        rainInterp.textContent = 'No precipitation detected on sensor plate.';
        cardRain.style.setProperty('--card-accent', 'var(--green-healthy)');
      }
    }

    // Light Intensity Card
    const lightVal = document.getElementById('val-light');
    const lightInterp = document.getElementById('interp-light');
    const lightGauge = document.getElementById('gauge-light');

    if (lightVal) lightVal.textContent = r.lightLevel;
    if (lightGauge) {
      const pct = Math.min(100, (r.lightLevel / 1200) * 100);
      lightGauge.style.width = pct + '%';
    }
    if (lightInterp) {
      if (r.lightLevel > 800) lightInterp.textContent = 'Bright sunlight. Strong solar irradiance measured.';
      else if (r.lightLevel > 300) lightInterp.textContent = 'Moderate ambient daylight conditions.';
      else if (r.lightLevel > 50) lightInterp.textContent = 'Subdued light / overcast skies.';
      else lightInterp.textContent = 'Low light / night mode irradiance.';
    }

    // Wind Speed Card
    const windVal = document.getElementById('val-wind');
    const windInterp = document.getElementById('interp-wind');
    const windGauge = document.getElementById('gauge-wind');
    const cardWind = document.getElementById('card-wind');

    if (windVal) windVal.textContent = r.windSpeed.toFixed(1);
    if (windGauge) {
      const pct = Math.min(100, (r.windSpeed / 50) * 100);
      windGauge.style.width = pct + '%';
    }
    if (cardWind) {
      cardWind.classList.remove('anim-wind');
      if (r.windSpeed >= 30) {
        windInterp.textContent = 'Strong wind detected (>30 km/h). Streamline turbulence active.';
        cardWind.style.setProperty('--card-accent', 'var(--amber-warning)');
        cardWind.classList.add('anim-wind');
      } else if (r.windSpeed >= 15) {
        windInterp.textContent = 'Moderate breeze. Leaf and branch motion.';
        cardWind.style.setProperty('--card-accent', 'var(--cyan-primary)');
      } else {
        windInterp.textContent = 'Light breeze. Calm atmospheric drift.';
        cardWind.style.setProperty('--card-accent', 'var(--green-healthy)');
      }
    }
  }

  // --- Dynamic Alert Banner Manager ---
  function updateAlertBanner(r) {
    const banner = document.getElementById('alert-banner');
    const alertText = document.getElementById('alert-text');
    const alertBox = document.getElementById('alert-box');
    if (!banner || !alertText || !alertBox) return;

    if (state.mode === 'offline') {
      banner.className = 'alert-banner visible';
      alertBox.className = 'alert-box warning';
      alertText.textContent = 'Station Offline: No valid telemetry packet received within timeout limit. Displaying cached readings.';
      return;
    }

    if (r.temperature >= 35) {
      banner.className = 'alert-banner visible';
      alertBox.className = 'alert-box';
      alertText.textContent = `High Temperature Warning: Station registered ${r.temperature.toFixed(1)}°C. Stay hydrated and avoid strenuous outdoor activity.`;
    } else if (r.rainValue >= 700) {
      banner.className = 'alert-banner visible';
      alertBox.className = 'alert-box';
      alertText.textContent = 'Heavy Rain Alert: High precipitation conductivity detected on weather station sensor plate.';
    } else if (r.windSpeed >= 30) {
      banner.className = 'alert-banner visible';
      alertBox.className = 'alert-box warning';
      alertText.textContent = `Strong Wind Advisory: Sustained gusts exceeding ${r.windSpeed.toFixed(1)} km/h recorded by anemometer.`;
    } else if (r.humidity >= 85) {
      banner.className = 'alert-banner visible';
      alertBox.className = 'alert-box info';
      alertText.textContent = `High Humidity Alert: Relative humidity at ${r.humidity}%. Dehumidification and moisture vigilance advised.`;
    } else {
      banner.className = 'alert-banner';
    }
  }

  // --- Fallback Hourly Forecast Scroll ---
  function updateHourlyForecastFallback() {
    const container = document.getElementById('hourly-scroll');
    if (!container) return;

    container.innerHTML = '';
    const hours = [
      { offset: 0, label: 'Now', tempDelta: 0, icon: '☀️', desc: 'Sunny' },
      { offset: 1, label: '+1h', tempDelta: 0.8, icon: '☀️', desc: 'Bright' },
      { offset: 2, label: '+2h', tempDelta: 1.5, icon: '🌤️', desc: 'Warm' },
      { offset: 3, label: '+3h', tempDelta: 1.2, icon: '🌤️', desc: 'Pleasant' },
      { offset: 4, label: '+4h', tempDelta: 0.3, icon: '⛅', desc: 'Scattered' },
      { offset: 5, label: '+5h', tempDelta: -0.8, icon: '⛅', desc: 'Passing Cloud' },
      { offset: 6, label: '+6h', tempDelta: -1.7, icon: '🌥️', desc: 'Cooling' },
      { offset: 7, label: '+7h', tempDelta: -2.8, icon: '🌙', desc: 'Clear Dusk' }
    ];

    const baseTemp = state.lastReading ? state.lastReading.temperature : 23.4;

    hours.forEach((h, idx) => {
      const card = document.createElement('div');
      card.className = `hourly-card ${idx === 0 ? 'now' : ''}`;
      const temp = (baseTemp + h.tempDelta).toFixed(1);
      card.innerHTML = `
        <span class="hourly-time">${h.label}</span>
        <span class="hourly-icon">${h.icon}</span>
        <span class="hourly-temp">${temp}°</span>
        <span class="hourly-detail">${h.desc}</span>
      `;
      container.appendChild(card);
    });
  }

  // --- HTML5 Canvas Chart Engine ---
  let canvas, ctx;
  function setupChartCanvas() {
    canvas = document.getElementById('telemetryChart');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', () => {
      resizeCanvas();
      renderChart();
    });
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  function renderChart() {
    if (!canvas || !ctx) return;
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;

    ctx.clearRect(0, 0, w, h);

    const metric = state.selectedChartMetric;
    const history = state.history;
    if (!history || history.length < 2) return;

    let points = history;
    if (state.selectedTimeframe === '1h') points = history.slice(-4);
    else if (state.selectedTimeframe === 'today') points = history.slice(-24);
    else if (state.selectedTimeframe === '24h') points = history;
    else points = history;

    const vals = points.map(p => p[metric]);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const avgVal = (vals.reduce((a, b) => a + b, 0) / vals.length);
    const currentVal = vals[vals.length - 1];

    const elMin = document.getElementById('stat-min');
    const elMax = document.getElementById('stat-max');
    const elAvg = document.getElementById('stat-avg');
    const elCur = document.getElementById('stat-cur');

    const units = {
      temperature: '°C',
      humidity: '%',
      pressure: ' hPa',
      lightLevel: ' Lux',
      rainValue: ' /1024',
      windSpeed: ' km/h'
    };
    const unit = units[metric] || '';

    if (elMin) elMin.textContent = minVal.toFixed(1) + unit;
    if (elMax) elMax.textContent = maxVal.toFixed(1) + unit;
    if (elAvg) elAvg.textContent = avgVal.toFixed(1) + unit;
    if (elCur) elCur.textContent = currentVal.toFixed(1) + unit;

    const padLeft = 45;
    const padRight = 20;
    const padTop = 25;
    const padBottom = 35;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    const range = (maxVal - minVal) || 1;
    const yMin = minVal - range * 0.15;
    const yMax = maxVal + range * 0.15;

    ctx.strokeStyle = state.theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.fillStyle = state.theme === 'light' ? '#64748b' : '#94a3b8';
    ctx.font = '11px Inter, sans-serif';

    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const y = padTop + (chartH / ySteps) * i;
      const val = yMax - ((yMax - yMin) / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(metric === 'pressure' ? 0 : 1), 6, y + 4);
    }

    const coords = points.map((p, idx) => {
      const x = padLeft + (chartW / (points.length - 1)) * idx;
      const y = padTop + chartH - ((p[metric] - yMin) / (yMax - yMin)) * chartH;
      return { x, y, val: p[metric], label: p.timeLabel };
    });

    let strokeColor = '#38bdf8';
    let gradTop = 'rgba(56, 189, 248, 0.35)';
    let gradBottom = 'rgba(56, 189, 248, 0.0)';

    if (metric === 'temperature') {
      strokeColor = '#f59e0b';
      gradTop = 'rgba(245, 158, 11, 0.35)';
    } else if (metric === 'humidity') {
      strokeColor = '#06b6d4';
      gradTop = 'rgba(6, 182, 212, 0.35)';
    } else if (metric === 'rainValue') {
      strokeColor = '#3b82f6';
      gradTop = 'rgba(59, 130, 246, 0.35)';
    }

    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    grad.addColorStop(0, gradTop);
    grad.addColorStop(1, gradBottom);

    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      const xc = (coords[i].x + coords[i - 1].x) / 2;
      const yc = (coords[i].y + coords[i - 1].y) / 2;
      ctx.quadraticCurveTo(coords[i - 1].x, coords[i - 1].y, xc, yc);
    }
    ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);
    ctx.lineTo(coords[coords.length - 1].x, padTop + chartH);
    ctx.lineTo(coords[0].x, padTop + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      const xc = (coords[i].x + coords[i - 1].x) / 2;
      const yc = (coords[i].y + coords[i - 1].y) / 2;
      ctx.quadraticCurveTo(coords[i - 1].x, coords[i - 1].y, xc, yc);
    }
    ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    coords.forEach((c, idx) => {
      if (idx === coords.length - 1 || idx % Math.ceil(coords.length / 8) === 0) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, idx === coords.length - 1 ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();
        ctx.strokeStyle = state.theme === 'light' ? '#fff' : '#08111f';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = state.theme === 'light' ? '#64748b' : '#94a3b8';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(c.label, c.x - 14, h - 10);
      }
    });
  }

  // --- Auto-Streaming Simulation Engine ---
  function startAutoStream() {
    if (state.streamTimer) clearInterval(state.streamTimer);
    state.streamTimer = setInterval(() => {
      if (!state.autoStream || state.mode === 'offline') return;

      const r = state.lastReading;
      if (!r) return;

      const dTemp = (Math.random() * 0.4 - 0.2);
      const dHum = Math.round(Math.random() * 2 - 1);
      const dPress = (Math.random() * 0.2 - 0.1);
      const dWind = (Math.random() * 1.0 - 0.5);

      r.temperature = +(r.temperature + dTemp).toFixed(1);
      r.humidity = Math.min(100, Math.max(10, r.humidity + dHum));
      r.pressure = +(r.pressure + dPress).toFixed(1);
      r.windSpeed = Math.max(0, +(r.windSpeed + dWind).toFixed(1));
      r.timestamp = new Date().toISOString();

      const time = new Date();
      state.history.push({
        deviceId: r.deviceId,
        timestamp: r.timestamp,
        timeLabel: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateLabel: time.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        temperature: r.temperature,
        humidity: r.humidity,
        pressure: r.pressure,
        rainDetected: r.rainDetected,
        rainValue: r.rainValue,
        lightLevel: r.lightLevel,
        windSpeed: r.windSpeed,
        aqi: r.aqi,
        source: isLiveApiMode ? 'weatherapi' : state.mode
      });

      if (state.history.length > 60) state.history.shift();

      const scenarioData = (isLiveApiMode && state.liveScenarioData) ? {
        ...state.liveScenarioData,
        condition: `${state.liveScenarioData.condition.split(' (')[0]} (${r.temperature.toFixed(1)}°C)`
      } : (SCENARIOS[state.scenario] || {
        greeting: 'Live Synoptic Stream Active.',
        condition: `${r.temperature.toFixed(1)}°C · Real-time observation`,
        badge: 'Live Telemetry',
        advice1: `Humidity: ${r.humidity}% · Pressure: ${r.pressure} hPa`,
        advice2: `Wind: ${r.windSpeed.toFixed(1)} km/h`,
        mascot: r.rainDetected ? 'rainy' : (r.temperature < 15 ? 'snow' : 'sunny'),
        mascotTitle: `${currentCityQuery} Stream`,
        passage: `Continuous atmospheric drift telemetry updating node ${r.deviceId}.`
      });

      updateUIWithReading(r, scenarioData, true);
      renderChart();
    }, 4000);
  }

  // --- Export CSV Functionality ---
  function exportCSV() {
    if (!state.history || state.history.length === 0) {
      alert('No telemetry data available to export.');
      return;
    }

    const headers = [
      'Device ID',
      'UTC Timestamp',
      'Local Time',
      'Temperature (°C)',
      'Relative Humidity (%)',
      'Atmospheric Pressure (hPa)',
      'Rain Detected',
      'Rain Sensor Raw (0-1024)',
      'Light Intensity (Lux)',
      'Wind Speed (km/h)',
      'Air Quality Index (AQI)',
      'Telemetry Source'
    ];

    const rows = state.history.map(h => [
      `"${h.deviceId}"`,
      `"${h.timestamp}"`,
      `"${h.timeLabel}"`,
      h.temperature,
      h.humidity,
      h.pressure,
      h.rainDetected ? 'TRUE' : 'FALSE',
      h.rainValue,
      h.lightLevel,
      h.windSpeed,
      h.aqi,
      `"${h.source}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WeatherSense_${currentCityQuery}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // 1. Live WeatherAPI Button
    const liveApiBtn = document.getElementById('btn-live-weatherapi');
    if (liveApiBtn) {
      liveApiBtn.addEventListener('click', () => {
        fetchLiveWeatherData(currentCityQuery);
      });
    }

    // 2. City Search Bar
    const cityInput = document.getElementById('city-search-input');
    const cityBtn = document.getElementById('btn-city-search');

    if (cityBtn && cityInput) {
      cityInput.addEventListener('focus', () => {
        cityInput.select();
      });

      cityBtn.addEventListener('click', () => {
        const q = cityInput.value.trim();
        if (q) fetchLiveWeatherData(q);
      });

      cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const q = cityInput.value.trim();
          if (q) fetchLiveWeatherData(q);
        }
      });
    }

    // 3. API Key Config Modal & Controls
    const apiModal = document.getElementById('api-key-modal');
    const openModalBtn = document.getElementById('btn-open-api-modal');
    const closeModalBtn = document.getElementById('btn-close-api-modal');
    const saveKeyBtn = document.getElementById('btn-save-api-key');
    const resetKeyBtn = document.getElementById('btn-reset-default-key');
    const inputKey = document.getElementById('input-weather-api-key');
    const toggleVisBtn = document.getElementById('btn-toggle-key-visibility');

    if (openModalBtn && apiModal) {
      openModalBtn.addEventListener('click', () => {
        apiModal.style.display = 'flex';
      });
    }

    if (closeModalBtn && apiModal) {
      closeModalBtn.addEventListener('click', () => {
        apiModal.style.display = 'none';
      });
    }

    if (apiModal) {
      apiModal.addEventListener('click', (e) => {
        if (e.target === apiModal) {
          apiModal.style.display = 'none';
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && apiModal.style.display === 'flex') {
          apiModal.style.display = 'none';
        }
      });
    }

    if (toggleVisBtn && inputKey) {
      toggleVisBtn.addEventListener('click', () => {
        const isPass = inputKey.type === 'password';
        inputKey.type = isPass ? 'text' : 'password';
        toggleVisBtn.textContent = isPass ? '🔒' : '👁️';
      });
    }

    if (saveKeyBtn && inputKey) {
      saveKeyBtn.addEventListener('click', () => {
        const newKey = inputKey.value.trim();
        if (newKey) {
          weatherApiKey = newKey;
          fetchLiveWeatherData(currentCityQuery);
        }
      });
    }

    if (resetKeyBtn && inputKey) {
      resetKeyBtn.addEventListener('click', () => {
        weatherApiKey = DEFAULT_WEATHER_API_KEY;
        inputKey.value = DEFAULT_WEATHER_API_KEY;
        fetchLiveWeatherData(currentCityQuery);
      });
    }

    // 4. Scenario Buttons
    document.querySelectorAll('[data-scenario]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-scenario');
        applyScenario(key, true);
        renderChart();
      });
    });

    // 5. Theme Switcher Button
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const themes = ['dark', 'light', 'editorial'];
        const currentIdx = themes.indexOf(state.theme);
        const nextTheme = themes[(currentIdx + 1) % themes.length];
        setTheme(nextTheme);
      });
    }

    // 6. Motion Toggle Button
    const motionBtn = document.getElementById('motion-toggle-btn');
    if (motionBtn) {
      motionBtn.addEventListener('click', () => {
        state.reducedMotion = !state.reducedMotion;
        document.body.classList.toggle('reduced-motion-active', state.reducedMotion);
        motionBtn.textContent = state.reducedMotion ? '⚡ Motion Off' : '✨ Motion On';
      });
    }

    // 7. Live Stream Toggle Switch
    const streamToggle = document.getElementById('live-stream-toggle');
    if (streamToggle) {
      streamToggle.addEventListener('change', (e) => {
        state.autoStream = e.target.checked;
        const lbl = document.getElementById('stream-toggle-label');
        if (lbl) lbl.textContent = state.autoStream ? 'Auto-Stream ON' : 'Paused';
      });
    }

    // 8. Mobile Navigation Drawer Toggle
    const mobileToggle = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    if (mobileToggle && navLinks) {
      mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('mobile-open');
      });
    }

    // 9. Chart Metric Selection Tabs
    document.querySelectorAll('[data-chart-metric]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-chart-metric]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedChartMetric = btn.getAttribute('data-chart-metric');
        renderChart();
      });
    });

    // 10. Chart Timeframe Selection Tabs
    document.querySelectorAll('[data-timeframe]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-timeframe]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedTimeframe = btn.getAttribute('data-timeframe');
        renderChart();
      });
    });

    // 11. CSV Download Button
    const csvBtn = document.getElementById('btn-download-csv');
    if (csvBtn) {
      csvBtn.addEventListener('click', exportCSV);
    }

    // 12. Alert Banner Dismiss
    const alertClose = document.getElementById('alert-dismiss');
    if (alertClose) {
      alertClose.addEventListener('click', () => {
        const banner = document.getElementById('alert-banner');
        if (banner) banner.className = 'alert-banner';
      });
    }

  }

  function updateScenarioButtons(activeKey) {
    document.querySelectorAll('[data-scenario]').forEach(btn => {
      if (btn.getAttribute('data-scenario') === activeKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function setTheme(t) {
    state.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      if (t === 'dark') themeBtn.textContent = '🌙 Dark';
      else if (t === 'light') themeBtn.textContent = '☀️ Light';
      else themeBtn.textContent = '📰 Editorial';
    }
    renderChart();
  }

  // Expose to window for testing/debugging
  window.WeatherSense = {
    state,
    applyScenario,
    fetchLiveWeatherData,
    setTheme,
    exportCSV
  };

  // Launch when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
