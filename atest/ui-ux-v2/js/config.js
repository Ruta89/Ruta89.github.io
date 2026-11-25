/**
 * Stałe konfiguracyjne aplikacji, zweryfikowana tabela technologiczna tonaży
 * (zgodna z instrukcjami Dolezych SF 7 / PES 132.000 dtex oraz IP/P3/01-24 dla gurtów),
 * kolory zawiesi wg EN 1492-2, klucze localStorage oraz definicje ikon SVG.
 */
(function (global) {
    'use strict';

    const RutaApp = (global.RutaApp = global.RutaApp || {});

    const APP_TITLE = 'Antygravity Czasomierz';
    const DAILY_NORM_MINUTES = 450;

    const FIREBASE_CONFIG = Object.freeze({
        apiKey: 'AIzaSyDH-OVArujwHcvNUoTqACCILzP649jrdHc',
        authDomain: 'newarek-7889e.firebaseapp.com',
        databaseURL: 'https://newarek-7889e.firebaseio.com',
        projectId: 'newarek-7889e',
        storageBucket: 'newarek-7889e.firebasestorage.app',
        messagingSenderId: '231167778694',
        appId: '1:231167778694:web:aadf704dfe025f98c9d607'
    });

    /**
     * Stała baza technologiczna tonaży (0.5 t – 300.0 t).
     * Dane dla 12–40 t zweryfikowane z kartami technologicznymi faktor 132.pdf (SF 7),
     * dobór obszyć ochronnych w gurcie zgodny z instrukcją IP/P3/01-24 (gurt.jpg).
     */
    const TONNAGE_DB = Object.freeze({
        '0.5':   Object.freeze({ spools: 1,  cnt1: 20,  cnt2: 40,  wgt1: 0.159,  wgt2: 0.312 }),
        '1.0':   Object.freeze({ spools: 1,  cnt1: 20,  cnt2: 40,  wgt1: 0.159,  wgt2: 0.312 }),
        '1.5':   Object.freeze({ spools: 1,  cnt1: 26,  cnt2: 52,  wgt1: 0.201,  wgt2: 0.395 }),
        '2.0':   Object.freeze({ spools: 2,  cnt1: 20,  cnt2: 40,  wgt1: 0.395,  wgt2: 0.700 }),
        '3.0':   Object.freeze({ spools: 3,  cnt1: 20,  cnt2: 40,  wgt1: 0.478,  wgt2: 0.936 }),
        '4.0':   Object.freeze({ spools: 4,  cnt1: 20,  cnt2: 40,  wgt1: 0.638,  wgt2: 1.247 }),
        '5.0':   Object.freeze({ spools: 2,  cnt1: 26,  cnt2: 52,  wgt1: 0.804,  wgt2: 1.580 }),
        '6.0':   Object.freeze({ spools: 3,  cnt1: 22,  cnt2: 44,  wgt1: 1.040,  wgt2: 2.037 }),
        '8.0':   Object.freeze({ spools: 3,  cnt1: 30,  cnt2: 60,  wgt1: 1.372,  wgt2: 2.703 }),
        '10.0':  Object.freeze({ spools: 4,  cnt1: 30,  cnt2: 60,  wgt1: 1.830,  wgt2: 3.604,  gurt: '1 × 250 mm', gurtOverlap: '1,0 m' }),
        '12.0':  Object.freeze({ spools: 6,  cnt1: 28,  cnt2: 56,  wgt1: 2.578,  wgt2: 5.073,  windings: 14, sleeve: '122 mm', yarn1: 186, yarn2: 366, gurt: '1 × 250 mm', gurtOverlap: '1,0 m' }),
        '15.0':  Object.freeze({ spools: 6,  cnt1: 36,  cnt2: 72,  wgt1: 3.243,  wgt2: 6.403,  windings: 18, sleeve: '122 mm', yarn1: 234, yarn2: 462, gurt: '1 × 250 mm', gurtOverlap: '1,0 m' }),
        '20.0':  Object.freeze({ spools: 12, cnt1: 22,  cnt2: 44,  wgt1: 4.158,  wgt2: 8.150,  windings: 11, sleeve: '153 mm', yarn1: 300, yarn2: 588, gurt: '1 × 400 mm', gurtOverlap: '1,0 m' }),
        '25.0':  Object.freeze({ spools: 12, cnt1: 24,  cnt2: 48,  wgt1: 4.491,  wgt2: 8.815,  windings: 12, sleeve: '153 mm', yarn1: 324, yarn2: 636, gurt: '1 × 400 mm', gurtOverlap: '1,0 m' }),
        '30.0':  Object.freeze({ spools: 12, cnt1: 26,  cnt2: 52,  wgt1: 4.823,  wgt2: 9.480,  windings: 13, sleeve: '177 mm', yarn1: 348, yarn2: 684, gurt: '1 × 400 mm', gurtOverlap: '1,0 m' }),
        '35.0':  Object.freeze({ spools: 12, cnt1: 34,  cnt2: 68,  wgt1: 6.154,  wgt2: 12.141, windings: 17, sleeve: '177 mm', yarn1: 444, yarn2: 876, gurt: '1 × 500 mm', gurtOverlap: '1,0 m' }),
        '40.0':  Object.freeze({ spools: 12, cnt1: 40,  cnt2: 80,  wgt1: 7.152,  wgt2: 14.137, windings: 20, sleeve: '180/200 mm', yarn1: 516, yarn2: 1020, gurt: '1 × 500 mm', gurtOverlap: '1,0 m' }),
        '45.0':  Object.freeze({ spools: 12, cnt1: 54,  cnt2: 108, wgt1: 8.990,  wgt2: 17.980, gurt: '1 × 500 mm', gurtOverlap: '1,0 m' }),
        '50.0':  Object.freeze({ spools: 12, cnt1: 64,  cnt2: 128, wgt1: 10.649, wgt2: 21.298, gurt: '1 × 500 mm', gurtOverlap: '1,0 m' }),
        '60.0':  Object.freeze({ spools: 12, cnt1: 76,  cnt2: 152, wgt1: 12.650, wgt2: 25.300, gurt: '1 × 600 mm', gurtOverlap: '1,0 m' }),
        '70.0':  Object.freeze({ spools: 12, cnt1: 88,  cnt2: 176, wgt1: 14.640, wgt2: 29.280, gurt: '1 × 600 mm', gurtOverlap: '1,0 m' }),
        '80.0':  Object.freeze({ spools: 12, cnt1: 100, cnt2: 200, wgt1: 16.640, wgt2: 33.280, gurt: '1 × 600 mm', gurtOverlap: '1,0 m' }),
        '90.0':  Object.freeze({ spools: 12, cnt1: 114, cnt2: 228, wgt1: 18.970, wgt2: 37.940, gurt: '1 × 500 + 1 × 250 mm lub 2 × 400 mm', gurtOverlap: '1,0 m' }),
        '100.0': Object.freeze({ spools: 12, cnt1: 126, cnt2: 252, wgt1: 20.970, wgt2: 41.940, gurt: '1 × 600 + 1 × 300 mm lub 1 × 500 + 1 × 400 mm', gurtOverlap: '1,0 m' }),
        '110.0': Object.freeze({ spools: 12, cnt1: 138, cnt2: 276, wgt1: 23.230, wgt2: 46.460, gurt: '1 × 600 + 1 × 300 mm lub 1 × 500 + 1 × 400 mm', gurtOverlap: '1,0 m' }),
        '120.0': Object.freeze({ spools: 12, cnt1: 152, cnt2: 304, wgt1: 25.490, wgt2: 50.980, gurt: '1 × 600 + 1 × 300 mm lub 1 × 500 + 1 × 400 mm', gurtOverlap: '1,0 m' }),
        '125.0': Object.freeze({ spools: 12, cnt1: 160, cnt2: 320, wgt1: 26.620, wgt2: 53.240, gurt: '1 × 600 + 1 × 300 mm lub 1 × 500 + 1 × 400 mm', gurtOverlap: '1,0 m' }),
        '150.0': Object.freeze({ spools: 12, cnt1: 192, cnt2: 384, wgt1: 31.950, wgt2: 63.900, gurt: '1 × 600 + 1 × 300 mm lub 1 × 500 + 1 × 400 mm', gurtOverlap: '1,0 m' }),
        '180.0': Object.freeze({ spools: 12, cnt1: 228, cnt2: 456, wgt1: 37.940, wgt2: 75.880, gurt: '1 × 600 + 1 × 500 mm', gurtOverlap: '1,0 m' }),
        '200.0': Object.freeze({ spools: 12, cnt1: 252, cnt2: 504, wgt1: 41.930, wgt2: 83.860, gurt: '2 × 600 mm', gurtOverlap: '1,0 m' }),
        '250.0': Object.freeze({ spools: 12, cnt1: 320, cnt2: 640, wgt1: 53.250, wgt2: 106.500, gurt: '1 × 500 + 2 × 400 mm', gurtOverlap: '1,0 m' }),
        '300.0': Object.freeze({ spools: 12, cnt1: 384, cnt2: 768, wgt1: 63.890, wgt2: 127.780, gurt: '2 × 500 + 1 × 400 mm', gurtOverlap: '1,0 m' })
    });

    const TONNAGE_COLORS = Object.freeze({
        '0.5': Object.freeze({ label: 'Fioletowy (0.5t)', color: '#a855f7' }),
        '1.0': Object.freeze({ label: 'Fioletowy', color: '#a855f7' }),
        '1.5': Object.freeze({ label: 'Fioletowy / Zielony', color: '#8b5cf6' }),
        '2.0': Object.freeze({ label: 'Zielony', color: '#10b981' }),
        '3.0': Object.freeze({ label: 'Żółty', color: '#eab308' }),
        '4.0': Object.freeze({ label: 'Szary', color: '#94a3b8' }),
        '5.0': Object.freeze({ label: 'Czerwony', color: '#ef4444' }),
        '6.0': Object.freeze({ label: 'Brązowy', color: '#b45309' }),
        '8.0': Object.freeze({ label: 'Niebieski', color: '#3b82f6' })
    });

    function getTonnageColorInfo(tonStr) {
        if (parseFloat(tonStr) >= 10.0) {
            return { label: 'Pomarańczowy', color: '#f97316' };
        }
        return TONNAGE_COLORS[tonStr] || { label: 'Standard', color: '#10b981' };
    }

    function getSortedTonnageKeys() {
        return Object.keys(TONNAGE_DB).sort((a, b) => parseFloat(a) - parseFloat(b));
    }

    const STORAGE_KEYS = Object.freeze({
        history: 'zawiesia_history',
        isMuted: 'activeTimer_isMuted',
        colorScheme: 'color-scheme',
        timeUnit: 'activeTimer_timeUnit',
        main: Object.freeze({
            running: 'activeTimer_running',
            targetTime: 'activeTimer_targetTime',
            startTimeDate: 'activeTimer_startTimeDate',
            originalTotalMs: 'activeTimer_originalTotalMs',
            alarmAck: 'activeTimer_alarmAck',
            spoolExchanges: 'activeTimer_spoolExchanges',
            tonnage: 'activeTimer_tonnage',
            length: 'activeTimer_length',
            pieces: 'activeTimer_pieces',
            timeInput: 'activeTimer_timeInput',
            note: 'activeTimer_note'
        }),
        simple: Object.freeze({
            running: 'simpleTimer_running',
            targetTime: 'simpleTimer_targetTime',
            startTimeDate: 'simpleTimer_startTimeDate',
            totalTime: 'simpleTimer_totalTime',
            alarmAck: 'simpleTimer_alarmAck',
            note: 'simpleTimer_note'
        })
    });

    const ICON_PATHS = Object.freeze({
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
        edit: [
            { tag: 'path', attrs: { d: 'M12 20h9' } },
            { tag: 'path', attrs: { d: 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' } }
        ],
        trash: [
            { tag: 'path', attrs: { d: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' } }
        ],
        repeat: [
            { tag: 'polyline', attrs: { points: '17 1 21 5 17 9' } },
            { tag: 'path', attrs: { d: 'M3 11V9a4 4 0 0 1 4-4h14' } },
            { tag: 'polyline', attrs: { points: '7 23 3 19 7 15' } },
            { tag: 'path', attrs: { d: 'M21 13v2a4 4 0 0 1-4 4H3' } }
        ],
        search: [
            { tag: 'circle', attrs: { cx: '11', cy: '11', r: '8' } },
            { tag: 'line', attrs: { x1: '21', y1: '21', x2: '16.65', y2: '16.65' } }
        ]
    });

    RutaApp.Config = {
        APP_TITLE,
        DAILY_NORM_MINUTES,
        FIREBASE_CONFIG,
        TONNAGE_DB,
        STORAGE_KEYS,
        ICON_PATHS,
        getTonnageColorInfo,
        getSortedTonnageKeys
    };
})(window);
