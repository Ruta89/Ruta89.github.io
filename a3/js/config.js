/**
 * Konfiguracja globalna v3: tabela tonaży (edytowalna), definicje zmian,
 * powodów postojów, klucze localStorage oraz ikony SVG.
 */
(function (global) {
    'use strict';

    const RutaApp = (global.RutaApp = global.RutaApp || {});

    const APP_TITLE = 'Antygravity Czasomierz v3';
    const DEFAULT_DAILY_NORM_MINUTES = 450;

    const FIREBASE_CONFIG = {
        apiKey: 'AIzaSyDH-OVArujwHcvNUoTqACCILzP649jrdHc',
        authDomain: 'newarek-7889e.firebaseapp.com',
        databaseURL: 'https://newarek-7889e.firebaseio.com',
        projectId: 'newarek-7889e',
        storageBucket: 'newarek-7889e.firebasestorage.app',
        messagingSenderId: '231167778694',
        appId: '1:231167778694:web:aadf704dfe025f98c9d607'
    };

    const DEFAULT_TONNAGE_DB = {
        '0.5': { spools: 1, cnt1: 20, cnt2: 40, wgt1: 0.159, wgt2: 0.312 },
        '1.0': { spools: 1, cnt1: 20, cnt2: 40, wgt1: 0.159, wgt2: 0.312 },
        '1.5': { spools: 1, cnt1: 26, cnt2: 52, wgt1: 0.201, wgt2: 0.395 },
        '2.0': { spools: 2, cnt1: 20, cnt2: 40, wgt1: 0.395, wgt2: 0.700 },
        '3.0': { spools: 3, cnt1: 20, cnt2: 40, wgt1: 0.478, wgt2: 0.936 },
        '4.0': { spools: 4, cnt1: 20, cnt2: 40, wgt1: 0.638, wgt2: 1.247 },
        '5.0': { spools: 2, cnt1: 26, cnt2: 52, wgt1: 0.804, wgt2: 1.580 },
        '6.0': { spools: 3, cnt1: 22, cnt2: 44, wgt1: 1.040, wgt2: 2.037 },
        '8.0': { spools: 3, cnt1: 30, cnt2: 60, wgt1: 1.372, wgt2: 2.703 },
        '10.0': { spools: 4, cnt1: 30, cnt2: 60, wgt1: 1.830, wgt2: 3.604 },
        '12.0': { spools: 6, cnt1: 28, cnt2: 56, wgt1: 2.578, wgt2: 5.073 },
        '15.0': { spools: 6, cnt1: 36, cnt2: 72, wgt1: 3.243, wgt2: 6.403 },
        '20.0': { spools: 12, cnt1: 22, cnt2: 44, wgt1: 4.158, wgt2: 8.150 },
        '25.0': { spools: 12, cnt1: 24, cnt2: 48, wgt1: 4.491, wgt2: 8.815 },
        '30.0': { spools: 12, cnt1: 26, cnt2: 52, wgt1: 4.823, wgt2: 9.480 },
        '35.0': { spools: 12, cnt1: 44, cnt2: 88, wgt1: 7.320, wgt2: 14.640 },
        '40.0': { spools: 12, cnt1: 50, cnt2: 100, wgt1: 8.320, wgt2: 16.640 },
        '45.0': { spools: 12, cnt1: 54, cnt2: 108, wgt1: 8.990, wgt2: 17.980 },
        '50.0': { spools: 12, cnt1: 64, cnt2: 128, wgt1: 10.649, wgt2: 21.298 },
        '60.0': { spools: 12, cnt1: 76, cnt2: 152, wgt1: 12.650, wgt2: 25.300 },
        '70.0': { spools: 12, cnt1: 88, cnt2: 176, wgt1: 14.640, wgt2: 29.280 },
        '80.0': { spools: 12, cnt1: 100, cnt2: 200, wgt1: 16.640, wgt2: 33.280 },
        '90.0': { spools: 12, cnt1: 114, cnt2: 228, wgt1: 18.970, wgt2: 37.940 },
        '100.0': { spools: 12, cnt1: 126, cnt2: 252, wgt1: 20.970, wgt2: 41.940 },
        '125.0': { spools: 12, cnt1: 160, cnt2: 320, wgt1: 26.620, wgt2: 53.240 },
        '150.0': { spools: 12, cnt1: 192, cnt2: 384, wgt1: 31.950, wgt2: 63.900 },
        '180.0': { spools: 12, cnt1: 228, cnt2: 456, wgt1: 37.940, wgt2: 75.880 },
        '200.0': { spools: 12, cnt1: 252, cnt2: 504, wgt1: 41.930, wgt2: 83.860 },
        '250.0': { spools: 12, cnt1: 320, cnt2: 640, wgt1: 53.250, wgt2: 106.500 },
        '300.0': { spools: 12, cnt1: 384, cnt2: 768, wgt1: 63.890, wgt2: 127.780 }
    };

    const SHIFTS = [
        { id: 'I', label: 'I zmiana', range: '06:00–14:00', startHour: 6, endHour: 14 },
        { id: 'II', label: 'II zmiana', range: '14:00–22:00', startHour: 14, endHour: 22 },
        { id: 'III', label: 'III zmiana', range: '22:00–06:00', startHour: 22, endHour: 6 }
    ];

    const DEFAULT_STATIONS = [
        'M-01', 'M-02', 'M-03', 'M-04', 'M-05', 'M-06', 'Roblon 1', 'Roblon 2'
    ];

    const DOWNTIME_REASONS = [
        { id: 'spool', label: 'Wymiana szpul' },
        { id: 'setup', label: 'Przezbrojenie' },
        { id: 'breakdown', label: 'Awaria maszyny' },
        { id: 'material', label: 'Brak materiału' },
        { id: 'break', label: 'Przerwa / Inne' }
    ];

    const STORAGE_KEYS = {
        history: 'zawiesia_history',
        customTonnageDb: 'zawiesia_custom_tonnage_db',
        appSettings: 'zawiesia_app_settings',
        isMuted: 'activeTimer_isMuted',
        colorScheme: 'color-scheme',
        timeUnit: 'activeTimer_timeUnit',
        activeShift: 'activeShift_mode',
        activeStation: 'activeStation_id',
        main: {
            running: 'activeTimer_running',
            targetTime: 'activeTimer_targetTime',
            startTimeDate: 'activeTimer_startTimeDate',
            originalTotalMs: 'activeTimer_originalTotalMs',
            paused: 'activeTimer_paused',
            pauseStart: 'activeTimer_pauseStart',
            pauseReasonId: 'activeTimer_pauseReasonId',
            pauseReasonLabel: 'activeTimer_pauseReasonLabel',
            downtimeTotalMs: 'activeTimer_downtimeTotalMs',
            downtimes: 'activeTimer_downtimes',
            spoolExchanges: 'activeTimer_spoolExchanges',
            tonnage: 'activeTimer_tonnage',
            length: 'activeTimer_length',
            pieces: 'activeTimer_pieces',
            timeInput: 'activeTimer_timeInput',
            note: 'activeTimer_note'
        },
        simple: {
            running: 'simpleTimer_running',
            targetTime: 'simpleTimer_targetTime',
            startTimeDate: 'simpleTimer_startTimeDate',
            totalTime: 'simpleTimer_totalTime',
            paused: 'simpleTimer_paused',
            pauseStart: 'simpleTimer_pauseStart',
            pauseReasonId: 'simpleTimer_pauseReasonId',
            pauseReasonLabel: 'simpleTimer_pauseReasonLabel',
            downtimeTotalMs: 'simpleTimer_downtimeTotalMs',
            downtimes: 'simpleTimer_downtimes',
            note: 'simpleTimer_note'
        }
    };

    const ICON_PATHS = {
        calendar: [
            { tag: 'rect', attrs: { x: '3', y: '4', width: '18', height: '18', rx: '2', ry: '2' } },
            { tag: 'line', attrs: { x1: '16', y1: '2', x2: '16', y2: '6' } },
            { tag: 'line', attrs: { x1: '8', y1: '2', x2: '8', y2: '6' } },
            { tag: 'line', attrs: { x1: '3', y1: '10', x2: '21', y2: '10' } }
        ],
        clock: [
            { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } },
            { tag: 'polyline', attrs: { points: '12 6 12 12 16 14' } }
        ],
        pause: [
            { tag: 'rect', attrs: { x: '6', y: '4', width: '4', height: '16', rx: '1' } },
            { tag: 'rect', attrs: { x: '14', y: '4', width: '4', height: '16', rx: '1' } }
        ],
        edit: [
            { tag: 'path', attrs: { d: 'M12 20h9' } },
            { tag: 'path', attrs: { d: 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' } }
        ],
        trash: [
            { tag: 'path', attrs: { d: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' } }
        ]
    };

    let activeTonnageDb = cloneDb(DEFAULT_TONNAGE_DB);
    let appSettings = {
        dailyNormMinutes: DEFAULT_DAILY_NORM_MINUTES,
        stations: [...DEFAULT_STATIONS]
    };

    function cloneDb(db) {
        const out = {};
        Object.keys(db).forEach((k) => {
            const row = db[k];
            out[k] = {
                spools: Number(row.spools),
                cnt1: Number(row.cnt1),
                cnt2: Number(row.cnt2),
                wgt1: Number(row.wgt1),
                wgt2: Number(row.wgt2)
            };
        });
        return out;
    }

    function sanitizeTonnageDb(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const clean = {};
        for (const [key, row] of Object.entries(raw)) {
            const numKey = parseFloat(String(key).replace(',', '.'));
            if (!Number.isFinite(numKey) || numKey <= 0) continue;
            const normKey = numKey.toFixed(1);
            if (!row || typeof row !== 'object') continue;
            const spools = parseInt(row.spools, 10);
            const cnt1 = Number(row.cnt1);
            const cnt2 = Number(row.cnt2);
            const wgt1 = Number(row.wgt1);
            const wgt2 = Number(row.wgt2);
            if (
                !Number.isFinite(spools) || spools < 1 ||
                !Number.isFinite(cnt1) || cnt1 < 0 ||
                !Number.isFinite(cnt2) || cnt2 < 0 ||
                !Number.isFinite(wgt1) || wgt1 <= 0 ||
                !Number.isFinite(wgt2) || wgt2 <= 0
            ) {
                continue;
            }
            clean[normKey] = { spools, cnt1, cnt2, wgt1, wgt2 };
        }
        return Object.keys(clean).length > 0 ? clean : null;
    }

    function loadPersistedConfig() {
        try {
            const rawDb = localStorage.getItem(STORAGE_KEYS.customTonnageDb);
            if (rawDb) {
                const parsed = sanitizeTonnageDb(JSON.parse(rawDb));
                if (parsed) activeTonnageDb = parsed;
            }
        } catch (_) {
            activeTonnageDb = cloneDb(DEFAULT_TONNAGE_DB);
        }

        try {
            const rawSettings = localStorage.getItem(STORAGE_KEYS.appSettings);
            if (rawSettings) {
                const parsed = JSON.parse(rawSettings);
                if (parsed && Number.isFinite(Number(parsed.dailyNormMinutes)) && Number(parsed.dailyNormMinutes) >= 30) {
                    appSettings.dailyNormMinutes = Math.round(Number(parsed.dailyNormMinutes));
                }
                if (Array.isArray(parsed?.stations) && parsed.stations.length > 0) {
                    appSettings.stations = parsed.stations
                        .map((s) => String(s).trim().slice(0, 32))
                        .filter(Boolean);
                }
            }
        } catch (_) {
            appSettings = {
                dailyNormMinutes: DEFAULT_DAILY_NORM_MINUTES,
                stations: [...DEFAULT_STATIONS]
            };
        }
    }

    function getTonnageDb() {
        return activeTonnageDb;
    }

    function getSortedTonnageKeys() {
        return Object.keys(activeTonnageDb).sort((a, b) => parseFloat(a) - parseFloat(b));
    }

    function setTonnageDb(newDb, persist = true) {
        const clean = sanitizeTonnageDb(newDb);
        if (!clean) return false;
        activeTonnageDb = clean;
        if (persist) {
            try {
                localStorage.setItem(STORAGE_KEYS.customTonnageDb, JSON.stringify(activeTonnageDb));
            } catch (_) {
                // ignoruj
            }
        }
        return true;
    }

    function resetTonnageDb() {
        activeTonnageDb = cloneDb(DEFAULT_TONNAGE_DB);
        try {
            localStorage.removeItem(STORAGE_KEYS.customTonnageDb);
        } catch (_) {
            // ignoruj
        }
        return activeTonnageDb;
    }

    function getDailyNormMinutes() {
        return appSettings.dailyNormMinutes;
    }

    function getStations() {
        return [...appSettings.stations];
    }

    function updateAppSettings(partial, persist = true) {
        if (partial && Number.isFinite(Number(partial.dailyNormMinutes))) {
            const clamped = Math.max(30, Math.min(1440, Math.round(Number(partial.dailyNormMinutes))));
            appSettings.dailyNormMinutes = clamped;
        }
        if (partial && Array.isArray(partial.stations)) {
            const cleaned = partial.stations
                .map((s) => String(s).trim().slice(0, 32))
                .filter(Boolean);
            if (cleaned.length > 0) {
                appSettings.stations = Array.from(new Set(cleaned));
            }
        }
        if (persist) {
            try {
                localStorage.setItem(STORAGE_KEYS.appSettings, JSON.stringify(appSettings));
            } catch (_) {
                // ignoruj
            }
        }
        return { ...appSettings };
    }

    function getAppSettings() {
        return {
            dailyNormMinutes: appSettings.dailyNormMinutes,
            stations: [...appSettings.stations]
        };
    }

    loadPersistedConfig();

    RutaApp.Config = {
        APP_TITLE,
        DEFAULT_DAILY_NORM_MINUTES,
        get DAILY_NORM_MINUTES() {
            return appSettings.dailyNormMinutes;
        },
        FIREBASE_CONFIG,
        DEFAULT_TONNAGE_DB,
        get TONNAGE_DB() {
            return activeTonnageDb;
        },
        SHIFTS,
        DEFAULT_STATIONS,
        DOWNTIME_REASONS,
        STORAGE_KEYS,
        ICON_PATHS,
        getTonnageDb,
        getSortedTonnageKeys,
        setTonnageDb,
        resetTonnageDb,
        sanitizeTonnageDb,
        getDailyNormMinutes,
        getStations,
        getAppSettings,
        updateAppSettings
    };
})(window);
