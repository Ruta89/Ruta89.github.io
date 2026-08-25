document.addEventListener('DOMContentLoaded', () => {
    const timeInput = document.getElementById('timeInput');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const clockDisplay = document.getElementById('clockDisplay');
    const efficiencyDisplay = document.getElementById('efficiencyDisplay');
    const startTimeDisplay = document.getElementById('startTimeDisplay');
    const endTimeDisplay = document.getElementById('endTimeDisplay');
    const statusMessage = document.getElementById('statusMessage');
    const stopAlarmBtn = document.getElementById('stopAlarmBtn');

    // Zakładki (Tabs) mobilne
    const tabCalc = document.getElementById('tab-calc');
    const tabSimpleTimer = document.getElementById('tab-simple-timer');
    const tabHist = document.getElementById('tab-hist');
    const secCalc = document.getElementById('sec-calculator');
    const secSimpleTimer = document.getElementById('sec-simple-timer');
    const secHist = document.getElementById('sec-history');

    // Kontrolki ulepszone
    const timerAdjustControls = document.getElementById('timerAdjustControls');
    const historySearch = document.getElementById('historySearch');
    const pwaInstallBtn = document.getElementById('pwaInstallBtn');

    // Konfiguracja Firebase (Zastąp swoimi danymi z konsoli Firebase)
    const firebaseConfig = {
        apiKey: "AIzaSyDH-OVArujwHcvNUoTqACCILzP649jrdHc",
        authDomain: "newarek-7889e.firebaseapp.com",
        databaseURL: "https://newarek-7889e.firebaseio.com",
        projectId: "newarek-7889e",
        storageBucket: "newarek-7889e.firebasestorage.app",
        messagingSenderId: "231167778694",
        appId: "1:231167778694:web:aadf704dfe025f98c9d607"
    };

    let dbFirestore = null;
    let globalHistory = [];

    if (typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(firebaseConfig);
            dbFirestore = firebase.firestore();

            dbFirestore.enablePersistence().catch(err => {
                console.warn("Błąd trybu offline Firebase:", err);
            });

            // Pobieranie historii i nasłuchiwanie zmian na żywo
            dbFirestore.collection('zawiesia_history')
                .orderBy('id', 'asc')
                .onSnapshot((snapshot) => {
                    let newHistory = [];
                    snapshot.forEach((doc) => {
                        let data = doc.data();
                        newHistory.push(data);
                    });
                    globalHistory = newHistory;
                    localStorage.setItem("zawiesia_history", JSON.stringify(globalHistory));
                    window.renderHistory();
                }, (error) => {
                    console.error("Błąd pobierania historii z Firebase:", error);
                    let historyStr = localStorage.getItem("zawiesia_history");
                    try { globalHistory = JSON.parse(historyStr || "[]"); } catch (e) { globalHistory = []; }
                    window.renderHistory();
                });

        } catch (error) {
            console.error("Błąd inicjalizacji Firebase:", error);
            let historyStr = localStorage.getItem("zawiesia_history");
            try { globalHistory = JSON.parse(historyStr || "[]"); } catch (e) { globalHistory = []; }
        }
    } else {
        let historyStr = localStorage.getItem("zawiesia_history");
        try { globalHistory = JSON.parse(historyStr || "[]"); } catch (e) { globalHistory = []; }
    }

    // Funkcja powiadomień Toast
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.classList.add('show'); }, 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }
    window.showToast = showToast;

    // Konfiguracja kółka postępu
    const progressCircle = document.querySelector('.progress-ring__circle');
    const circumference = progressCircle ? progressCircle.r.baseVal.value * 2 * Math.PI : 628.318;
    if (progressCircle) {
        progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        progressCircle.style.strokeDashoffset = 0;
    }

    // Elementy kalkulatora
    const tonnageInput = document.getElementById('tonnage');
    const lengthInput = document.getElementById('length');
    const piecesInput = document.getElementById('pieces');
    const calcResults = document.getElementById('calcResults');
    const outWeight = document.getElementById('out-weight');
    const outCounter = document.getElementById('out-counter');
    const outExchange = document.getElementById('out-exchange');
    const outDtex = document.getElementById('out-dtex');
    const outSpools = document.getElementById('out-spools');
    const outUnitWeight = document.getElementById('out-unit-weight');

    const db = {
        "0.5": { spools: 1, cnt1: 20, cnt2: 40, wgt1: 0.159, wgt2: 0.312 },
        "1.0": { spools: 1, cnt1: 20, cnt2: 40, wgt1: 0.159, wgt2: 0.312 },
        "1.5": { spools: 1, cnt1: 26, cnt2: 52, wgt1: 0.201, wgt2: 0.395 },
        "2.0": { spools: 2, cnt1: 20, cnt2: 40, wgt1: 0.395, wgt2: 0.700 },
        "3.0": { spools: 3, cnt1: 20, cnt2: 40, wgt1: 0.478, wgt2: 0.936 },
        "4.0": { spools: 4, cnt1: 20, cnt2: 40, wgt1: 0.638, wgt2: 1.247 },
        "5.0": { spools: 2, cnt1: 26, cnt2: 52, wgt1: 0.804, wgt2: 1.580 },
        "6.0": { spools: 3, cnt1: 22, cnt2: 44, wgt1: 1.040, wgt2: 2.037 },
        "8.0": { spools: 3, cnt1: 30, cnt2: 60, wgt1: 1.372, wgt2: 2.703 },
        "10.0": { spools: 4, cnt1: 30, cnt2: 60, wgt1: 1.830, wgt2: 3.604 },
        "12.0": { spools: 6, cnt1: 28, cnt2: 56, wgt1: 2.578, wgt2: 5.073 },
        "15.0": { spools: 6, cnt1: 36, cnt2: 72, wgt1: 3.243, wgt2: 6.403 },
        "20.0": { spools: 12, cnt1: 22, cnt2: 44, wgt1: 4.158, wgt2: 8.150 },
        "25.0": { spools: 12, cnt1: 24, cnt2: 48, wgt1: 4.491, wgt2: 8.815 },
        "30.0": { spools: 12, cnt1: 26, cnt2: 52, wgt1: 4.823, wgt2: 9.480 },
        "35.0": { spools: 12, cnt1: 44, cnt2: 88, wgt1: 7.320, wgt2: 14.640 },
        "40.0": { spools: 12, cnt1: 50, cnt2: 100, wgt1: 8.320, wgt2: 16.640 },
        "45.0": { spools: 12, cnt1: 54, cnt2: 108, wgt1: 8.990, wgt2: 17.980 },
        "50.0": { spools: 12, cnt1: 64, cnt2: 128, wgt1: 10.649, wgt2: 21.298 },
        "60.0": { spools: 12, cnt1: 76, cnt2: 152, wgt1: 12.650, wgt2: 25.300 },
        "70.0": { spools: 12, cnt1: 88, cnt2: 176, wgt1: 14.640, wgt2: 29.280 },
        "80.0": { spools: 12, cnt1: 100, cnt2: 200, wgt1: 16.640, wgt2: 33.280 },
        "90.0": { spools: 12, cnt1: 114, cnt2: 228, wgt1: 18.970, wgt2: 37.940 },
        "100.0": { spools: 12, cnt1: 126, cnt2: 252, wgt1: 20.970, wgt2: 41.940 },
        "125.0": { spools: 12, cnt1: 160, cnt2: 320, wgt1: 26.620, wgt2: 53.240 },
        "150.0": { spools: 12, cnt1: 192, cnt2: 384, wgt1: 31.950, wgt2: 63.900 },
        "180.0": { spools: 12, cnt1: 228, cnt2: 456, wgt1: 37.940, wgt2: 75.880 },
        "200.0": { spools: 12, cnt1: 252, cnt2: 504, wgt1: 41.930, wgt2: 83.860 },
        "250.0": { spools: 12, cnt1: 320, cnt2: 640, wgt1: 53.250, wgt2: 106.500 },
        "300.0": { spools: 12, cnt1: 384, cnt2: 768, wgt1: 63.890, wgt2: 127.780 }
    };

    function saveState() {
        localStorage.setItem('activeTimer_tonnage', tonnageInput.value);
        localStorage.setItem('activeTimer_length', lengthInput.value);
        localStorage.setItem('activeTimer_pieces', piecesInput.value);
        localStorage.setItem('activeTimer_timeInput', timeInput.value);

        if (targetTime > 0) {
            localStorage.setItem('activeTimer_targetTime', targetTime);
            localStorage.setItem('activeTimer_startTimeDate', startTimeDate);
            localStorage.setItem('activeTimer_running', 'true');
            localStorage.setItem('activeTimer_originalTotalMs', originalTotalMs);
        }
    }

    function calculateValues(dontShowIfEmpty = false) {
        if (!tonnageInput || !lengthInput || !piecesInput) return;
        if (dontShowIfEmpty && (lengthInput.value === '' || piecesInput.value === '')) return;

        let t_val = tonnageInput.value;
        let L1 = parseFloat(lengthInput.value) || 1.0;
        let pieces = parseInt(piecesInput.value) || 1;

        if (!db[t_val]) return;

        let t = db[t_val];

        let m_cnt = t.cnt2 - t.cnt1;
        let add_cnt = t.cnt1 - m_cnt;
        let final_cnt = (m_cnt * L1) + add_cnt;

        let m_wgt = t.wgt2 - t.wgt1;
        let add_wgt = t.wgt1 - m_wgt;
        let final_unit_wgt = (m_wgt * L1) + add_wgt;
        let total_wgt = final_unit_wgt * pieces;

        let isLarge = parseFloat(t_val) >= 5.0;
        let dtex = isLarge ? "132 000" : "66 000";

        let exchange_pieces = Math.floor(t.spools * 15 / final_unit_wgt);

        if (calcResults) calcResults.style.display = 'block';
        if (outDtex) outDtex.textContent = dtex;
        if (outSpools) outSpools.textContent = t.spools + " szt";
        if (outUnitWeight) outUnitWeight.textContent = final_unit_wgt.toFixed(2) + " kg";
        if (outWeight) outWeight.textContent = total_wgt.toFixed(2) + " kg";
        if (outCounter) outCounter.textContent = Math.round(final_cnt);
        if (outExchange) outExchange.textContent = exchange_pieces + " szt";
    }

    if (tonnageInput) tonnageInput.addEventListener('change', () => { calculateValues(); saveState(); });
    if (lengthInput) lengthInput.addEventListener('input', () => { calculateValues(); saveState(); });
    if (piecesInput) piecesInput.addEventListener('input', () => { calculateValues(); saveState(); });
    if (timeInput) timeInput.addEventListener('input', () => { saveState(); });

    // Oblicz na starcie, jeśli są domyślne wartości
    calculateValues(true);

    let targetTime = 0;
    let timerInterval = null;
    let isMuted = localStorage.getItem('activeTimer_isMuted') === 'true';
    let startTimeDate = 0;
    let originalTotalMs = 0;
    let wakeLock = null;

    let audioCtx = null;
    let alarmTimeout = null;
    let alarmStartTimestamp = 0;

    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('Service Worker registered.', reg.scope))
                .catch(err => console.log('Service Worker registration failed:', err));
        });
    }


    // Wyciszenie dźwięku (Mute)
    function updateMuteIcon() {
        const iconOn = document.querySelector('.icon-sound-on');
        const iconOff = document.querySelector('.icon-sound-off');
        if (iconOn && iconOff) {
            if (isMuted) {
                iconOn.style.display = 'none';
                iconOff.style.display = 'inline-block';
            } else {
                iconOn.style.display = 'inline-block';
                iconOff.style.display = 'none';
            }
        }
    }
    updateMuteIcon();

    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            localStorage.setItem('activeTimer_isMuted', isMuted);
            updateMuteIcon();
            if (isMuted) {
                stopAlarm();
            }
        });
    }

    // Wyłączenie alarmu
    if (stopAlarmBtn) {
        stopAlarmBtn.addEventListener('click', () => {
            stopAlarm();
        });
    }

    // Przełączanie zakładek (Tabs) na urządzeniach mobilnych
    function switchTab(tab) {
        if (!tabCalc || !tabHist || !secCalc || !secHist || !tabSimpleTimer || !secSimpleTimer) return;

        // Reset all
        tabCalc.classList.remove('active');
        tabSimpleTimer.classList.remove('active');
        tabHist.classList.remove('active');
        secCalc.classList.remove('active');
        secSimpleTimer.classList.remove('active');
        secHist.classList.remove('active');

        if (tab === 'calc') {
            tabCalc.classList.add('active');
            secCalc.classList.add('active');
        } else if (tab === 'simple-timer') {
            tabSimpleTimer.classList.add('active');
            secSimpleTimer.classList.add('active');
            setTimeout(() => {
                const simpleTimeInput = document.getElementById('simpleTimeInput');
                if (simpleTimeInput) simpleTimeInput.focus();
            }, 100);
        } else {
            tabHist.classList.add('active');
            secHist.classList.add('active');
        }
    }

    if (tabCalc && tabHist && tabSimpleTimer) {
        tabCalc.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('calc');
        });
        tabSimpleTimer.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('simple-timer');
        });
        tabHist.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('hist');
        });
    }

    // Status Online/Offline PWA
    function updateOnlineStatus() {
        const badge = document.getElementById('pwaBadge');
        const text = document.getElementById('pwaStatusText');
        if (badge && text) {
            if (navigator.onLine) {
                badge.classList.remove('offline');
                text.textContent = 'Online';
            } else {
                badge.classList.add('offline');
                text.textContent = 'Offline (Zapis w Pamięci)';
            }
        }
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Instalacja PWA
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (pwaInstallBtn) pwaInstallBtn.style.display = 'inline-flex';
    });
    if (pwaInstallBtn) {
        pwaInstallBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                showToast('Pomyślnie zainstalowano aplikację!', 'success');
            }
            deferredPrompt = null;
            pwaInstallBtn.style.display = 'none';
        });
    }

    // Korekta czasu w locie (+1m, +5m, -1m)
    window.adjustTimerTime = function (mins) {
        if (targetTime === 0) return;
        const msToAdd = mins * 60 * 1000;

        targetTime += msToAdd;
        originalTotalMs += msToAdd;

        if (targetTime < Date.now()) {
            targetTime = Date.now();
        }
        saveState();
        updateDisplay();
        const sign = mins > 0 ? '+' : '';
        showToast(`Zmieniono czas odliczania: ${sign}${mins} min`, 'info');
    };

    // Zapis wpisu ręcznie (bez stopera)
    // Filtrowanie i wyszukiwanie w historii
    const historyFilter = document.getElementById('historyFilter');
    if (historyFilter) {
        historyFilter.addEventListener('change', () => {
            window.renderHistory();
        });
    }
    if (historySearch) {
        historySearch.addEventListener('input', () => {
            window.renderHistory();
        });
    }

    // Import bazy danych JSON
    const btnImportJSON = document.getElementById('btnImportJSON');
    const importFile = document.getElementById('importFile');
    if (btnImportJSON && importFile) {
        btnImportJSON.addEventListener('click', () => {
            importFile.click();
        });
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (evt) {
                try {
                    const imported = JSON.parse(evt.target.result);
                    if (!Array.isArray(imported)) {
                        throw new Error("Dane nie są tablicą!");
                    }
                    const isValid = imported.every(item => item && item.id && item.pieces && item.time);
                    if (!isValid) {
                        throw new Error("Błędny format danych w pliku JSON.");
                    }

                    let currentHistory = getHistory();
                    let merged = [...currentHistory];
                    let countNew = 0;

                    imported.forEach(impItem => {
                        if (!merged.some(currItem => currItem.id === impItem.id)) {
                            merged.push(impItem);
                            countNew++;
                        }
                    });

                    merged.sort((a, b) => a.id - b.id);
                    localStorage.setItem("zawiesia_history", JSON.stringify(merged));
                    showToast(`Zaimportowano pomyślnie! Dodano ${countNew} nowych zleceń.`, 'success');
                    window.renderHistory();
                } catch (err) {
                    showToast("Błąd podczas importu: " + err.message, 'warning');
                }
                importFile.value = '';
            };
            reader.readAsText(file);
        });
    }

    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => {
                    wakeLock = null;
                });
            }
        } catch (err) {
            console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
        }
    }

    async function releaseWakeLock() {
        if (wakeLock !== null) {
            try {
                await wakeLock.release();
            } catch (e) { }
            wakeLock = null;
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && timerInterval) {
            requestWakeLock();
        }
    });

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playBeep(type = 'normal') {
        if (!audioCtx || isMuted) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const now = audioCtx.currentTime;

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === '2min') {
            // Dwa przyjemne, miękkie dźwięki
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);

            gain.gain.setValueAtTime(0, now + 0.3);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.35);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);

            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === '1min') {
            // Jeden wyraźny, ale miękki dźwięk (nieco wyższy)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);

            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === '30sec') {
            // Trzy szybkie, ciche dźwięki ostrzegawcze
            osc.type = 'sine';
            osc.frequency.setValueAtTime(659.25, now);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.03);
            gain.gain.linearRampToValueAtTime(0, now + 0.1);

            gain.gain.setValueAtTime(0, now + 0.15);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.18);
            gain.gain.linearRampToValueAtTime(0, now + 0.25);

            gain.gain.setValueAtTime(0, now + 0.3);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.33);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);

            osc.start(now);
            osc.stop(now + 0.4);
        } else {
            // Standardowy alarm - fala trójkątna jest łagodniejsza dla uszu niż kwadratowa
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.3);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.05); // ciszej dla słuchawek
            gain.gain.linearRampToValueAtTime(0, now + 0.4);

            osc.start(now);
            osc.stop(now + 0.4);
        }
    }

    function scheduleNextBeep() {
        // Automatyczne wyłączenie po 60 sekundach, aby oszczędzać baterię
        if (alarmStartTimestamp > 0 && Date.now() - alarmStartTimestamp > 60000) {
            stopAlarm();
            return;
        }

        const now = Date.now();
        let remaining = 0;
        if (targetTime > 0) {
            remaining = Math.round((targetTime - now) / 1000);
            if (remaining < 0) remaining = 0;
        }

        let delay = 1000;
        if (remaining === 0) {
            delay = 450;
        } else if (remaining <= 15) {
            delay = 600;
        } else if (remaining <= 30) {
            delay = 800;
        }

        playBeep();
        alarmTimeout = setTimeout(scheduleNextBeep, delay);
    }

    function startAlarm() {
        if (alarmTimeout || isMuted) return;
        alarmStartTimestamp = Date.now();
        if (stopAlarmBtn) {
            stopAlarmBtn.style.display = 'flex';
        }
        scheduleNextBeep();
    }

    function stopAlarm() {
        if (alarmTimeout) {
            clearTimeout(alarmTimeout);
            alarmTimeout = null;
        }
        alarmStartTimestamp = 0;
        if (stopAlarmBtn) {
            stopAlarmBtn.style.display = 'none';
        }
    }

    function formatTime(seconds) {
        if (seconds < 0) seconds = 0;
        const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(Math.floor(seconds % 60)).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function updateBackground(remainingSeconds) {
        document.body.className = '';
        if (remainingSeconds < 0) {
            document.body.classList.add('bg-red');
        } else if (remainingSeconds < 60) {
            document.body.classList.add('bg-red');
        } else if (remainingSeconds < 180) {
            document.body.classList.add('bg-yellow');
        }
    }

    function updateDisplay() {
        if (targetTime === 0 || startTimeDate === 0) return;

        const now = Date.now();
        const diffMs = targetTime - now;
        const diffSec = Math.round(diffMs / 1000);

        if (diffSec >= 0) {
            // Standardowe odliczanie do zera
            clockDisplay.textContent = formatTime(diffSec);
            updateBackground(diffSec);

            if (progressCircle && originalTotalMs > 0) {
                const percent = diffSec / (originalTotalMs / 1000);
                const offset = circumference - percent * circumference;
                progressCircle.style.strokeDashoffset = offset;

                if (diffSec < 60) progressCircle.style.stroke = '#ef4444';
                else if (diffSec < 180) progressCircle.style.stroke = '#f59e0b';
                else progressCircle.style.stroke = '#10b981';
            }

            if (diffSec === 120) {
                playBeep('2min');
            } else if (diffSec === 60) {
                playBeep('1min');
            } else if (diffSec === 30) {
                playBeep('30sec');
            }

            if (statusMessage && !statusMessage.querySelector('.badge-overtime')) {
                statusMessage.textContent = '';
            }
        } else {
            // NADGODZINY (Czas przekroczony) - nie zamykamy timeru, liczymy dalej na minusie!
            const overtimeSec = Math.abs(diffSec);
            clockDisplay.innerHTML = `<span class="overtime-minus">-</span>${formatTime(overtimeSec)}`;
            document.body.className = 'bg-red';

            if (progressCircle) {
                progressCircle.style.strokeDashoffset = 0;
                progressCircle.style.stroke = '#ef4444';
            }

            if (statusMessage) {
                statusMessage.innerHTML = '<span class="badge-overtime pulsing-badge">⚠️ PRZEKROCZONO CZAS NORMATYWNY!</span>';
            }

            // Uruchom alarm raz w momencie przekroczenia progu 0
            if (diffSec === -1 || (alarmStartTimestamp === 0 && !alarmTimeout)) {
                startAlarm();
                showNotification();
            }
        }

        // Dynamiczna kalkulacja wydajności (gdy czas minie, wydajność płynnie spada poniżej 100%)
        if (efficiencyDisplay && originalTotalMs > 0) {
            const elapsedMs = now - startTimeDate;
            const elapsedSec = elapsedMs / 1000;
            if (elapsedSec > 0) {
                const eff = ((originalTotalMs / 1000) / elapsedSec) * 100;
                efficiencyDisplay.textContent = `Wydajność: ${eff.toFixed(0)}%`;
                if (eff >= 100) {
                    efficiencyDisplay.className = 'efficiency-badge';
                    efficiencyDisplay.style.color = '#10b981';
                } else if (eff >= 85) {
                    efficiencyDisplay.className = 'efficiency-badge eff-warning';
                    efficiencyDisplay.style.color = '#f59e0b';
                } else {
                    efficiencyDisplay.className = 'efficiency-badge eff-danger';
                    efficiencyDisplay.style.color = '#ef4444';
                }
            } else {
                efficiencyDisplay.textContent = "Wydajność: ---%";
                efficiencyDisplay.className = 'efficiency-badge';
                efficiencyDisplay.style.color = '#10b981';
            }
        }
    }

    function showNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Czas dobiegł końca!', {
                body: 'Czas normatywny zlecenia minął. Timer liczy czas przekroczenia.',
                icon: 'icons/icon-192x192.png'
            });
        }
    }

    startBtn.addEventListener('click', () => {
        initAudio();
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        let valStr = timeInput.value.replace(',', '.'); // Allow comma as decimal separator too
        const val = parseFloat(valStr);

        if (isNaN(val) || val <= 0) {
            statusMessage.textContent = 'Podaj poprawny dodatni czas dziesiętny.';
            return;
        }

        statusMessage.textContent = '';
        stopAlarm();

        const totalMs = Math.floor(val * 3600 * 1000);
        originalTotalMs = totalMs;
        startTimeDate = Date.now();
        targetTime = startTimeDate + totalMs;

        if (startTimeDisplay) {
            startTimeDisplay.textContent = `Start: ${new Date(startTimeDate).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
            startTimeDisplay.style.display = 'block';
        }

        saveState();
        requestWakeLock();

        const cardForm = document.querySelector('.card-form');
        if (cardForm) cardForm.style.display = 'none';

        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
        if (timerAdjustControls) timerAdjustControls.style.display = 'flex';

        const endD = new Date(targetTime);
        const today = new Date();
        const isSameDay = endD.getDate() === today.getDate() && endD.getMonth() === today.getMonth() && endD.getFullYear() === today.getFullYear();

        const endH = String(endD.getHours()).padStart(2, '0');
        const endM = String(endD.getMinutes()).padStart(2, '0');
        const endS = String(endD.getSeconds()).padStart(2, '0');

        if (isSameDay) {
            endTimeDisplay.textContent = `Koniec o: ${endH}:${endM}:${endS}`;
        } else {
            const endY = endD.getFullYear();
            const endMo = String(endD.getMonth() + 1).padStart(2, '0');
            const endDt = String(endD.getDate()).padStart(2, '0');
            endTimeDisplay.textContent = `Koniec: ${endY}-${endMo}-${endDt} ${endH}:${endM}:${endS}`;
        }

        if (timerInterval) clearInterval(timerInterval);

        updateDisplay();
        timerInterval = setInterval(updateDisplay, 1000);
    });

    stopBtn.addEventListener('click', () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        stopAlarm();
        window.finishEarlyAndSave(false);
        showToast('Zlecenie zakończone i zapisane.', 'success');

        startTimeDate = 0;
        targetTime = 0;
        originalTotalMs = 0;

        if (startTimeDisplay) startTimeDisplay.style.display = 'none';
        if (efficiencyDisplay) {
            efficiencyDisplay.textContent = "Wydajność: ---%";
            efficiencyDisplay.className = 'efficiency-badge';
            efficiencyDisplay.style.color = '#10b981';
        }
        const cardForm = document.querySelector('.card-form');
        if (cardForm) cardForm.style.display = 'block';

        startBtn.style.display = 'inline-flex';
        stopBtn.style.display = 'none';
        if (timerAdjustControls) timerAdjustControls.style.display = 'none';
        clockDisplay.textContent = '00:00:00';
        endTimeDisplay.textContent = 'Koniec: --:--:--';
        if (statusMessage) statusMessage.textContent = 'Zakończono i Zapisano.';
        document.body.className = '';
        releaseWakeLock();
        if (progressCircle) {
            progressCircle.style.strokeDashoffset = 0;
            progressCircle.style.stroke = '#10b981';
        }
    });

    // Funkcja pomocnicza do przenoszenia fokusu i zaznaczania zawartości
    function focusAndSelect(el) {
        if (!el) return;
        el.focus();
        if (typeof el.select === 'function') {
            try { el.select(); } catch (err) {}
        }
    }

    // Nawigacja klawiszem Enter między polami formularza głównego
    if (tonnageInput) {
        tonnageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                focusAndSelect(lengthInput);
            }
        });
    }

    if (lengthInput) {
        lengthInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                focusAndSelect(piecesInput);
            }
        });
    }

    if (piecesInput) {
        piecesInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                focusAndSelect(timeInput);
            }
        });
    }

    if (timeInput) {
        timeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!lengthInput.value) {
                    focusAndSelect(lengthInput);
                    if (statusMessage) {
                        statusMessage.textContent = 'Podaj długość roboczą L1!';
                        setTimeout(() => { statusMessage.textContent = ''; }, 3000);
                    }
                } else if (!piecesInput.value) {
                    focusAndSelect(piecesInput);
                    if (statusMessage) {
                        statusMessage.textContent = 'Podaj liczbę sztuk!';
                        setTimeout(() => { statusMessage.textContent = ''; }, 3000);
                    }
                } else if (!timeInput.value) {
                    if (statusMessage) {
                        statusMessage.textContent = 'Podaj czas normatywny!';
                        setTimeout(() => { statusMessage.textContent = ''; }, 3000);
                    }
                } else {
                    if (startBtn && startBtn.style.display !== 'none') {
                        startBtn.click();
                        timeInput.blur();
                    }
                }
            }
        });
    }

    // Nawigacja klawiszem Enter w oknie edycji (modal)
    const editTon = document.getElementById("edit-ton");
    const editL1 = document.getElementById("edit-l1");
    const editPieces = document.getElementById("edit-pieces");
    const editTime = document.getElementById("edit-time");
    const editActualTime = document.getElementById("edit-actual-time");

    if (editTon) {
        editTon.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                focusAndSelect(editL1);
            }
        });
    }
    if (editL1) {
        editL1.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                focusAndSelect(editPieces);
            }
        });
    }
    if (editPieces) {
        editPieces.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                focusAndSelect(editTime);
            }
        });
    }
    if (editTime) {
        editTime.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                focusAndSelect(editActualTime);
            }
        });
    }
    if (editActualTime) {
        editActualTime.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.saveEdit();
            }
        });
    }


    // --- ZARZĄDZANIE HISTORIĄ ---
    function getHistory() {
        return globalHistory;
    }

    function saveToHistory(itemObj) {
        if (dbFirestore) {
            dbFirestore.collection('zawiesia_history').doc(itemObj.id.toString()).set(itemObj).catch(err => {
                console.error("Błąd zapisu do Firebase:", err);
                showToast("Zapisano offline", "info");
            });
        } else {
            globalHistory.push(itemObj);
            globalHistory.sort((a, b) => a.id - b.id);
            localStorage.setItem("zawiesia_history", JSON.stringify(globalHistory));
            window.renderHistory();
        }
    }

    window.finishEarlyAndSave = function (isManualSave = false) {
        let t_val = tonnageInput.value;
        let L1 = parseFloat(lengthInput.value) || 1.0;
        let pieces = parseInt(piecesInput.value) || 1;
        let timeHours = parseFloat(timeInput.value) || 0;
        let declaredMins = parseFloat((timeHours * 60).toFixed(1));

        let actualMins = declaredMins;
        let startTimeStr = '-';
        if (!isManualSave && startTimeDate > 0) {
            let activeMs = Date.now() - startTimeDate;
            actualMins = parseFloat((activeMs / 60000).toFixed(1));
            startTimeStr = new Date(startTimeDate).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        } else {
            startTimeStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        }

        let finalPercentage = 0;
        if (actualMins > 0) {
            finalPercentage = (declaredMins / actualMins) * 100;
        }

        let t = db[t_val];
        if (!t) return;
        let m_wgt = t.wgt2 - t.wgt1;
        let add_wgt = t.wgt1 - m_wgt;
        let final_unit_wgt = (m_wgt * L1) + add_wgt;
        let total_wgt = parseFloat((final_unit_wgt * pieces).toFixed(2));

        let d = new Date();

        saveToHistory({
            id: Date.now(),
            dayStr: d.toLocaleDateString('pl-PL'),
            timeStr: d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
            startTimeStr: startTimeStr,
            percentage: finalPercentage.toFixed(0) + "%",
            ton: t_val,
            l1: L1,
            pieces: pieces,
            time: declaredMins,
            actualTime: actualMins,
            weight: total_wgt
        });

        // Wyczyść po zapisie
        localStorage.removeItem('activeTimer_running');
        localStorage.removeItem('activeTimer_originalTotalMs');
        localStorage.removeItem('activeTimer_targetTime');
        localStorage.removeItem('activeTimer_startTimeDate');
        localStorage.removeItem('activeTimer_tonnage');
        localStorage.removeItem('activeTimer_length');
        localStorage.removeItem('activeTimer_pieces');
        localStorage.removeItem('activeTimer_timeInput');

        tonnageInput.value = "1.0";
        lengthInput.value = "";
        piecesInput.value = "";
        timeInput.value = "";
        if (calcResults) calcResults.style.display = 'none';

        window.renderHistory();
    }

    function updateStatistics(history) {
        const todayStr = new Date().toLocaleDateString('pl-PL');

        let pcsToday = 0;
        let pcsAll = 0;
        let wgtToday = 0;
        let wgtAll = 0;
        let normTimeToday = 0;
        let actualTimeToday = 0;

        history.forEach(item => {
            if (item.type === 'simple') return;

            const isToday = item.dayStr === todayStr;
            const pcs = parseInt(item.pieces) || 0;
            const wgt = parseFloat(item.weight) || 0;
            const nTime = parseFloat(item.time) || 0;
            const aTime = parseFloat(item.actualTime !== undefined ? item.actualTime : item.time) || 0;

            pcsAll += pcs;
            wgtAll += wgt;
            if (isToday) {
                pcsToday += pcs;
                wgtToday += wgt;
                normTimeToday += nTime;
                actualTimeToday += aTime;
            }
        });

        const statPieces = document.getElementById('stat-pieces');
        const statWeight = document.getElementById('stat-weight');
        const statEfficiency = document.getElementById('stat-efficiency');

        if (statPieces) {
            statPieces.innerHTML = `${pcsToday} <span style="font-size:0.7rem; font-weight:normal; color:rgba(255,255,255,0.45);">/ ${pcsAll}</span>`;
        }
        if (statWeight) {
            statWeight.innerHTML = `${wgtToday.toFixed(1)} <span style="font-size:0.7rem; font-weight:normal; color:rgba(255,255,255,0.45);">/ ${wgtAll.toFixed(0)} kg</span>`;
        }
        if (statEfficiency) {
            let efficiencyStr = "-";
            if (actualTimeToday > 0) {
                const eff = (normTimeToday / actualTimeToday) * 100;
                efficiencyStr = `${eff.toFixed(0)}%`;
                if (eff >= 100) statEfficiency.style.color = '#10b981';
                else if (eff >= 85) statEfficiency.style.color = '#06b6d4';
                else statEfficiency.style.color = '#f59e0b';
            } else {
                statEfficiency.style.color = 'var(--primary)';
            }
            statEfficiency.textContent = efficiencyStr;
        }
    }

    function filterHistory(history, filterType, searchText = '') {
        const todayStr = new Date().toLocaleDateString('pl-PL');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('pl-PL');

        const now = new Date();

        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfWeekMs = startOfWeek.getTime();

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const startOfMonthMs = startOfMonth.getTime();

        const searchLower = searchText.trim().toLowerCase();

        return history.filter(item => {
            let matchesDate = true;
            if (filterType === 'today') matchesDate = item.dayStr === todayStr;
            else if (filterType === 'yesterday') matchesDate = item.dayStr === yesterdayStr;
            else if (filterType === 'week') matchesDate = item.id >= startOfWeekMs;
            else if (filterType === 'month') matchesDate = item.id >= startOfMonthMs;

            if (!matchesDate) return false;

            if (searchLower) {
                const itemTon = (item.ton || '').toString().toLowerCase();
                const itemL1 = (item.l1 || '').toString().toLowerCase();
                const itemPcs = (item.pieces || '').toString().toLowerCase();
                const itemDay = (item.dayStr || '').toLowerCase();
                return itemTon.includes(searchLower) || itemL1.includes(searchLower) || itemPcs.includes(searchLower) || itemDay.includes(searchLower);
            }

            return true;
        });
    }

    window.renderHistory = function () {
        let history = getHistory();

        // Zawsze aktualizuj statystyki na podstawie pełnej historii
        updateStatistics(history);

        let listDiv = document.getElementById("history-list");
        if (!listDiv) return;

        if (history.length === 0) {
            listDiv.innerHTML = '<div style="font-size: 0.9rem; color: rgba(255,255,255,0.5); margin-bottom:15px;">Brak zrobionych zleceń.</div>';
            return;
        }

        // Filtrowanie wpisów i wyszukiwanie
        const filterVal = document.getElementById('historyFilter') ? document.getElementById('historyFilter').value : 'all';
        const searchVal = document.getElementById('historySearch') ? document.getElementById('historySearch').value : '';
        let filteredHistory = filterHistory(history, filterVal, searchVal);

        if (filteredHistory.length === 0) {
            listDiv.innerHTML = '<div style="font-size: 0.9rem; color: rgba(255,255,255,0.5); margin-bottom:15px;">Brak zleceń spełniających filtry.</div>';
            return;
        }

        let groups = {};
        [...filteredHistory].reverse().forEach(item => {
            let day = item.dayStr || new Date(item.id).toLocaleDateString('pl-PL');
            let time = item.timeStr || new Date(item.id).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

            if (!groups[day]) groups[day] = { items: [], totalTime: 0, totalActualTime: 0 };

            item.dispDay = day;
            item.dispTime = time;
            item.parsedTime = parseFloat(item.time) || 0;
            item.parsedActualTime = item.actualTime !== undefined ? parseFloat(item.actualTime) : item.parsedTime;

            groups[day].items.push(item);
            groups[day].totalTime += item.parsedTime;
            groups[day].totalActualTime += item.parsedActualTime;
        });

        let html = "";

        for (let day in groups) {
            let g = groups[day];
            let percent = Math.min((g.totalActualTime / 450) * 100, 100).toFixed(0);
            let overTimeMsg = g.totalActualTime > 450 ? `<span style="color:#ef4444; margin-left:4px; font-weight:700;">(+${(g.totalActualTime - 450).toFixed(1)} min)</span>` : "";

            html += `
            <div class="daily-group">
                <div class="daily-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span>Dzień: ${day}</span>
                    </div>
                    <div class="progress-container">
                        <span style="display: flex; align-items: center; gap: 4px;">
                            <svg class="icon-svg" style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            Czas faktyczny: <b>${g.totalActualTime.toFixed(1)}</b> / 450m ${overTimeMsg}
                        </span>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width:${percent}%; background:${g.totalActualTime >= 450 ? '#f59e0b' : '#10b981'};"></div>
                        </div>
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="hist-table">
                        <thead>
                            <tr>
                                <th>Godzina</th>
                                <th>Tonaż</th>
                                <th>L1 [m]</th>
                                <th>Sztuki</th>
                                <th>Czas Zlecenia</th>
                                <th>Waga [kg]</th>
                                <th style="text-align:right;">Opcje</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            g.items.forEach(item => {
                if (item.type === 'simple') {
                    html += `<tr>
                        <td data-label="Godzina:">${item.dispTime}</td>
                        <td data-label="Tonaż:"><span style="color:#a855f7; font-weight:700;">Prosty Timer</span></td>
                        <td data-label="Czas Start/Koniec:">Start: ${item.startTimeStr || '-'}</td>
                        <td data-label="Wydajność:"><b>${item.percentage}</b></td>
                        <td data-label="Czas trwania:">
                            <span style="color:#10b981;">Norma: <b>${item.parsedTime.toFixed(1)} min</b></span><br>
                            <span style="color:#f59e0b;">Fakt: <b>${item.parsedActualTime.toFixed(1)} min</b></span>
                        </td>
                        <td data-label="Koniec:">Koniec: ${item.dispTime}</td>
                        <td data-label="Opcje:" style="white-space:nowrap; text-align:right;">
                            <button class="btn btn-sm btn-danger" style="padding: 4px 8px;" onclick="deleteItem(${item.id})" title="Usuń zapis">
                                <svg class="icon-svg" style="width:13px; height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                <span>Usuń</span>
                            </button>
                        </td>
                    </tr>`;
                } else {
                    html += `<tr>
                        <td data-label="Godzina:">${item.dispTime}</td>
                        <td data-label="Tonaż:"><span style="color:#06b6d4; font-weight:700;">${item.ton} t</span></td>
                        <td data-label="L1 [m]:">${item.l1} m</td>
                        <td data-label="Sztuki:"><b>${item.pieces} szt</b></td>
                        <td data-label="Czas Zlecenia:">
                            <span style="color:#10b981;">Norma: <b>${item.parsedTime.toFixed(1)} min</b></span><br>
                            <span style="color:#f59e0b;">Fakt: <b>${item.parsedActualTime.toFixed(1)} min</b></span><br>
                            <span style="color:#3b82f6;">Start/Stop: <b>${item.startTimeStr || '-'} - ${item.dispTime}</b></span><br>
                            <span style="color:#a855f7;">Wydajność: <b>${item.percentage || '-'}</b></span>
                        </td>
                        <td data-label="Waga [kg]:"><b>${item.weight} kg</b></td>
                        <td data-label="Opcje:" style="white-space:nowrap; text-align:right;">
                            <button class="btn btn-sm btn-outline" style="padding: 4px 8px; margin-right:4px;" onclick="openEdit(${item.id})" title="Edytuj zlecenie">
                                <svg class="icon-svg" style="width:13px; height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                <span>Edytuj</span>
                            </button>
                            <button class="btn btn-sm btn-danger" style="padding: 4px 8px;" onclick="deleteItem(${item.id})" title="Usuń zlecenie">
                                <svg class="icon-svg" style="width:13px; height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                <span>Usuń</span>
                            </button>
                        </td>
                    </tr>`;
                }
            });
            html += `</tbody></table></div></div>`;
        }

        listDiv.innerHTML = html;
    }

    window.deleteItem = function (id) {
        if (!confirm("Na pewno usunąć to zlecenie z historii?")) return;
        if (dbFirestore) {
            dbFirestore.collection('zawiesia_history').doc(id.toString()).delete().then(() => {
                showToast("Usunięto zlecenie z Firebase.", "info");
            }).catch(err => console.error(err));
        } else {
            globalHistory = globalHistory.filter(i => i.id !== id);
            localStorage.setItem("zawiesia_history", JSON.stringify(globalHistory));
            showToast("Usunięto zlecenie z historii.", "info");
            window.renderHistory();
        }
    }

    window.clearHistory = function () {
        if (!confirm("Na pewno wyczyścić CAŁĄ historię ze wszystkich dni?")) return;
        if (dbFirestore) {
            globalHistory.forEach(item => {
                dbFirestore.collection('zawiesia_history').doc(item.id.toString()).delete();
            });
            showToast("Wyczyszczono całą historię w Firebase.", "warning");
        } else {
            localStorage.removeItem("zawiesia_history");
            globalHistory = [];
            showToast("Wyczyszczono całą historię.", "warning");
            window.renderHistory();
        }
    }

    window.openEdit = function (id) {
        let item = getHistory().find(i => i.id === id);
        if (!item) return;
        document.getElementById("edit-id").value = item.id;
        document.getElementById("edit-ton").value = item.ton;
        document.getElementById("edit-l1").value = item.l1;
        document.getElementById("edit-pieces").value = item.pieces;
        document.getElementById("edit-time").value = item.time;
        document.getElementById("edit-actual-time").value = item.actualTime !== undefined ? item.actualTime : item.time;
        document.getElementById("edit-modal").style.display = "flex";
        setTimeout(() => {
            focusAndSelect(document.getElementById("edit-l1"));
        }, 50);
    }

    window.closeEdit = function () {
        document.getElementById("edit-modal").style.display = "none";
    }

    window.saveEdit = function () {
        let id = parseInt(document.getElementById("edit-id").value);
        let history = getHistory();
        let index = history.findIndex(i => i.id === id);
        if (index === -1) return;

        let newTon = document.getElementById("edit-ton").value;
        let newL1 = parseFloat(document.getElementById("edit-l1").value);
        let newPieces = parseInt(document.getElementById("edit-pieces").value);
        let newTime = parseFloat(document.getElementById("edit-time").value);
        let newActualTime = parseFloat(document.getElementById("edit-actual-time").value);

        if (!newTon || isNaN(newL1) || isNaN(newPieces) || isNaN(newTime) || isNaN(newActualTime) || newL1 <= 0 || newPieces <= 0 || newTime <= 0 || newActualTime <= 0) {
            showToast("Podaj prawidłowe wartości!", "warning");
            return;
        }

        let item = Object.assign({}, history[index]);
        let t = db[newTon];
        if (!t) {
            showToast("Niepoprawny tonaż!", "warning");
            return;
        }

        let m_wgt = t.wgt2 - t.wgt1;
        let add_wgt = t.wgt1 - m_wgt;
        let final_unit_wgt = (m_wgt * newL1) + add_wgt;

        item.ton = newTon;
        item.l1 = newL1;
        item.pieces = newPieces;
        item.time = newTime;
        item.actualTime = newActualTime;
        item.weight = parseFloat((final_unit_wgt * newPieces).toFixed(2));

        if (dbFirestore) {
            dbFirestore.collection('zawiesia_history').doc(id.toString()).set(item).then(() => {
                showToast("Zapisano zmiany w zleceniu.", "success");
                window.closeEdit();
            }).catch(err => console.error(err));
        } else {
            history[index] = item;
            localStorage.setItem("zawiesia_history", JSON.stringify(history));
            showToast("Zapisano zmiany w zleceniu.", "success");
            window.closeEdit();
            window.renderHistory();
        }
    }

    window.printReport = function () {
        let history = getHistory();
        if (history.length === 0) {
            showToast("Brak danych w historii do wydrukowania!", "warning");
            return;
        }
        window.print();
    }

    window.exportCSV = function () {
        let history = getHistory();
        if (history.length === 0) {
            showToast("Brak danych do wyeksportowania!", "warning");
            return;
        }

        let csv = "Data;Godzina;Tonaz [t];Dlugosc L1 [m];Sztuki;Czas wykonania (Norma) [min];Czas Faktyczny [min];Laczna waga [kg]\n";

        history.forEach(i => {
            let d = i.dayStr || new Date(i.id).toLocaleDateString('pl-PL');
            let t = i.timeStr || new Date(i.id).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            let act = i.actualTime !== undefined ? i.actualTime : i.time;
            csv += `${d};${t};${i.ton};${i.l1};${i.pieces};${i.time};${act};${i.weight}\n`;
        });

        let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement("a");
        let url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `Historia_Czasomierz_${new Date().toLocaleDateString('pl-PL').replace(/\./g, '-')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Wygenerowano plik CSV.", "success");
    }

    window.exportJSON = function () {
        let history = getHistory();
        if (history.length === 0) {
            showToast("Brak danych do wyeksportowania!", "warning");
            return;
        }

        let jsonStr = JSON.stringify(history, null, 2);
        let blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
        let link = document.createElement("a");
        let url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `Backup_Czasomierz_${new Date().toLocaleDateString('pl-PL').replace(/\./g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Wygenerowano kopię zapasową JSON.", "success");
    }

    // Restore z localStorage w razie ubicia karty
    if (localStorage.getItem('activeTimer_running') === 'true') {
        if (localStorage.getItem('activeTimer_tonnage')) tonnageInput.value = localStorage.getItem('activeTimer_tonnage');
        if (localStorage.getItem('activeTimer_length')) lengthInput.value = localStorage.getItem('activeTimer_length');
        if (localStorage.getItem('activeTimer_pieces')) piecesInput.value = localStorage.getItem('activeTimer_pieces');
        if (localStorage.getItem('activeTimer_timeInput')) timeInput.value = localStorage.getItem('activeTimer_timeInput');

        targetTime = parseInt(localStorage.getItem('activeTimer_targetTime'), 10) || 0;
        startTimeDate = parseInt(localStorage.getItem('activeTimer_startTimeDate'), 10) || 0;

        calculateValues();

        if (targetTime > 0) {
            const cardForm = document.querySelector('.card-form');
            if (cardForm) cardForm.style.display = 'none';

            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';

            const endD = new Date(targetTime);
            const today = new Date();
            const isSameDay = endD.getDate() === today.getDate() && endD.getMonth() === today.getMonth() && endD.getFullYear() === today.getFullYear();

            const endH = String(endD.getHours()).padStart(2, '0');
            const endM = String(endD.getMinutes()).padStart(2, '0');
            const endS = String(endD.getSeconds()).padStart(2, '0');

            if (isSameDay) {
                endTimeDisplay.textContent = `Koniec o: ${endH}:${endM}:${endS}`;
            } else {
                const endY = endD.getFullYear();
                const endMo = String(endD.getMonth() + 1).padStart(2, '0');
                const endDt = String(endD.getDate()).padStart(2, '0');
                endTimeDisplay.textContent = `Koniec: ${endY}-${endMo}-${endDt} ${endH}:${endM}:${endS}`;
            }

            updateDisplay();
            timerInterval = setInterval(updateDisplay, 1000);
        }
    }

    // Uruchom na start
    window.renderHistory();
    // ==========================================
    // LOGIKA DLA PROSTEGO TIMERA (Tylko Czas)
    // ==========================================
    const simpleTimeInput = document.getElementById('simpleTimeInput');
    const simplePresetsBox = document.getElementById('simplePresetsBox');
    const simpleFormBox = document.getElementById('simpleFormBox');
    const simpleTimerAdjustControls = document.getElementById('simpleTimerAdjustControls');
    const simpleStartTimeDisplay = document.getElementById('simpleStartTimeDisplay');
    const simpleStatusMessage = document.getElementById('simpleStatusMessage');

    const simpleStartBtn = document.getElementById('simpleStartBtn');
    const simpleStopBtn = document.getElementById('simpleStopBtn');
    const simpleStopAlarmBtn = document.getElementById('simpleStopAlarmBtn');

    const simpleClockDisplay = document.getElementById('simpleClockDisplay');
    const simpleEndTimeDisplay = document.getElementById('simpleEndTimeDisplay');
    const simpleEfficiencyDisplay = document.getElementById('simpleEfficiencyDisplay');
    const simpleProgressRingCircle = document.getElementById('simpleProgressRingCircle');

    let simpleTimerInterval = null;
    let simpleTimeRemaining = 0; // w sekundach
    let simpleTotalTime = 0; // w sekundach
    let simpleTargetTime = 0; // ms
    let simpleStartTimeDate = 0; // ms

    // Konfiguracja pierścienia prostego timera (r=120 -> circumference = 753.982)
    const simpleRingCircumference = simpleProgressRingCircle ? simpleProgressRingCircle.r.baseVal.value * 2 * Math.PI : 753.982;
    if (simpleProgressRingCircle) {
        simpleProgressRingCircle.style.strokeDasharray = `${simpleRingCircumference} ${simpleRingCircumference}`;
        simpleProgressRingCircle.style.strokeDashoffset = 0;
    }

    function updateSimpleTimeHelper() {
        if (!simpleTimeInput) return;
        const helper = document.getElementById('simpleTimeHelper');
        if (!helper) return;
        let valStr = simpleTimeInput.value.replace(',', '.');
        const val = parseFloat(valStr);
        if (!isNaN(val) && val > 0) {
            const mins = Math.round(val * 60);
            helper.textContent = `${mins} min`;
        } else {
            helper.textContent = '-- min';
        }
    }
    if (simpleTimeInput) {
        simpleTimeInput.addEventListener('input', updateSimpleTimeHelper);
    }

    window.setSimplePreset = function (hours, label) {
        if (simpleTimeInput) {
            simpleTimeInput.value = hours;
            updateSimpleTimeHelper();
            document.querySelectorAll('.preset-pill').forEach(btn => {
                btn.classList.toggle('active', btn.textContent.trim() === label);
            });
        }
    };

    window.adjustSimpleTimerTime = function (mins) {
        if (simpleTargetTime === 0) return;
        const msToAdd = mins * 60 * 1000;
        simpleTargetTime += msToAdd;
        simpleTotalTime += mins * 60;
        if (simpleTotalTime < 1) simpleTotalTime = 1;
        saveSimpleState();
        simpleTimerTick();
        const sign = mins > 0 ? '+' : '';
        showToast(`Zmieniono czas prostego timera: ${sign}${mins} min`, 'info');
    };

    function saveSimpleState() {
        if (simpleTargetTime > 0) {
            localStorage.setItem('simpleTimer_targetTime', simpleTargetTime);
            localStorage.setItem('simpleTimer_totalTime', simpleTotalTime);
            localStorage.setItem('simpleTimer_startTimeDate', simpleStartTimeDate);
            localStorage.setItem('simpleTimer_running', 'true');
        } else {
            localStorage.removeItem('simpleTimer_targetTime');
            localStorage.removeItem('simpleTimer_totalTime');
            localStorage.removeItem('simpleTimer_startTimeDate');
            localStorage.removeItem('simpleTimer_running');
        }
    }

    function formatSimpleTime(seconds) {
        const absSec = Math.abs(seconds);
        const h = Math.floor(absSec / 3600);
        const m = Math.floor((absSec % 3600) / 60);
        const s = absSec % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function updateSimpleRing(diffSec) {
        if (!simpleProgressRingCircle) return;
        if (simpleTotalTime <= 0) {
            simpleProgressRingCircle.style.strokeDashoffset = 0;
            return;
        }
        if (diffSec >= 0) {
            let ratio = diffSec / simpleTotalTime;
            const offset = simpleRingCircumference - ratio * simpleRingCircumference;
            simpleProgressRingCircle.style.strokeDashoffset = offset;
            if (diffSec < 60) simpleProgressRingCircle.style.stroke = '#ef4444';
            else if (diffSec < 180) simpleProgressRingCircle.style.stroke = '#f59e0b';
            else simpleProgressRingCircle.style.stroke = '#10b981';
        } else {
            simpleProgressRingCircle.style.strokeDashoffset = 0;
            simpleProgressRingCircle.style.stroke = '#ef4444';
        }
    }

    function updateSimpleEfficiency(now) {
        if (!simpleEfficiencyDisplay || simpleTotalTime <= 0 || simpleStartTimeDate <= 0) return;
        const elapsedSec = (now - simpleStartTimeDate) / 1000;
        if (elapsedSec > 0) {
            const eff = (simpleTotalTime / elapsedSec) * 100;
            simpleEfficiencyDisplay.textContent = `Wydajność: ${eff.toFixed(0)}%`;
            if (eff >= 100) {
                simpleEfficiencyDisplay.className = 'efficiency-badge';
                simpleEfficiencyDisplay.style.color = '#10b981';
            } else if (eff >= 85) {
                simpleEfficiencyDisplay.className = 'efficiency-badge eff-warning';
                simpleEfficiencyDisplay.style.color = '#f59e0b';
            } else {
                simpleEfficiencyDisplay.className = 'efficiency-badge eff-danger';
                simpleEfficiencyDisplay.style.color = '#ef4444';
            }
        } else {
            simpleEfficiencyDisplay.textContent = "Wydajność: ---%";
            simpleEfficiencyDisplay.className = 'efficiency-badge';
            simpleEfficiencyDisplay.style.color = '#10b981';
        }
    }

    function simpleTimerTick() {
        if (simpleTargetTime > 0 && simpleStartTimeDate > 0) {
            const now = Date.now();
            const diffSec = Math.round((simpleTargetTime - now) / 1000);
            simpleTimeRemaining = diffSec;

            if (diffSec >= 0) {
                if (simpleClockDisplay) simpleClockDisplay.textContent = formatSimpleTime(diffSec);
                updateSimpleRing(diffSec);
                updateSimpleEfficiency(now);

                if (diffSec === 120) {
                    playBeep('2min');
                } else if (diffSec === 60) {
                    playBeep('1min');
                } else if (diffSec === 30) {
                    playBeep('30sec');
                }

                if (simpleStatusMessage && !simpleStatusMessage.querySelector('.badge-overtime')) {
                    simpleStatusMessage.textContent = '';
                }
            } else {
                // NADGODZINY DLA PROSTEGO TIMERA - nie wyłączamy, liczymy dalej na minusie!
                const overtimeSec = Math.abs(diffSec);
                if (simpleClockDisplay) simpleClockDisplay.innerHTML = `<span class="overtime-minus">-</span>${formatSimpleTime(overtimeSec)}`;
                updateSimpleRing(diffSec);
                updateSimpleEfficiency(now);

                if (simpleStatusMessage) {
                    simpleStatusMessage.innerHTML = '<span class="badge-overtime pulsing-badge">⚠️ PRZEKROCZONO CZAS NORMATYWNY!</span>';
                }

                // Uruchom alarm raz w momencie wejścia w nadgodziny
                if (diffSec === -1 || (alarmStartTimestamp === 0 && !alarmTimeout)) {
                    startAlarm();
                    if (simpleStopAlarmBtn) simpleStopAlarmBtn.style.display = 'flex';

                    if (window.Notification && Notification.permission === 'granted') {
                        new Notification('Prosty Timer: Czas minął!', {
                            body: 'Czas normatywny minął. Stoper kontynuuje zliczanie nadgodzin.',
                            icon: 'icons/icon-192x192.png'
                        });
                    }
                }
            }
        }
    }

    if (simpleTimeInput) {
        simpleTimeInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                if (simpleStartBtn && simpleStartBtn.style.display !== 'none') {
                    simpleStartBtn.click();
                    simpleTimeInput.blur();
                }
            }
        });
    }

    if (simpleStartBtn) {
        simpleStartBtn.addEventListener('click', () => {
            if (typeof initAudio === 'function') initAudio();

            let valStr = simpleTimeInput.value.replace(',', '.');
            const val = parseFloat(valStr);

            if (isNaN(val) || val <= 0) {
                showToast("Podaj poprawny dodatni czas!", "warning");
                return;
            }

            const totalSec = Math.round(val * 3600);

            simpleTotalTime = totalSec;
            simpleStartTimeDate = Date.now();
            simpleTargetTime = simpleStartTimeDate + (totalSec * 1000);
            simpleTimeRemaining = totalSec;

            saveSimpleState();

            if (simpleClockDisplay) simpleClockDisplay.textContent = formatSimpleTime(simpleTimeRemaining);
            updateSimpleRing(simpleTimeRemaining);
            updateSimpleEfficiency(Date.now());

            const endDate = new Date(simpleTargetTime);
            if (simpleStartTimeDisplay) {
                simpleStartTimeDisplay.textContent = `Start: ${new Date(simpleStartTimeDate).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
                simpleStartTimeDisplay.style.display = 'block';
            }
            if (simpleEndTimeDisplay) {
                simpleEndTimeDisplay.textContent = `Koniec: ${endDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
            }

            if (simplePresetsBox) simplePresetsBox.style.display = 'none';
            if (simpleFormBox) simpleFormBox.style.display = 'none';

            if (simpleStartBtn) simpleStartBtn.style.display = 'none';
            if (simpleStopBtn) simpleStopBtn.style.display = 'inline-flex';
            if (simpleTimerAdjustControls) simpleTimerAdjustControls.style.display = 'flex';
            if (simpleStopAlarmBtn) simpleStopAlarmBtn.style.display = 'none';
            stopAlarm();

            if (simpleTimerInterval) clearInterval(simpleTimerInterval);
            simpleTimerInterval = setInterval(simpleTimerTick, 1000);
        });
    }

    if (simpleStopBtn) {
        simpleStopBtn.addEventListener('click', () => {
            if (simpleTotalTime > 0 && simpleStartTimeDate > 0) {
                const elapsed = (Date.now() - simpleStartTimeDate) / 1000;
                let actualMins = parseFloat((elapsed / 60).toFixed(1));
                let declaredMins = parseFloat((simpleTotalTime / 60).toFixed(1));

                let finalPercentage = 0;
                if (elapsed > 0) {
                    finalPercentage = (simpleTotalTime / elapsed) * 100;
                }

                let d = new Date();
                let startTimeStr = new Date(simpleStartTimeDate).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

                saveToHistory({
                    id: Date.now(),
                    type: "simple",
                    dayStr: d.toLocaleDateString('pl-PL'),
                    timeStr: d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
                    startTimeStr: startTimeStr,
                    percentage: finalPercentage.toFixed(0) + "%",
                    ton: "Prosty",
                    l1: "-",
                    pieces: "-",
                    time: declaredMins,
                    actualTime: actualMins,
                    weight: "-"
                });
                showToast("Zapisano dane Prostego Timera.", "success");
            }

            if (simpleTimerInterval) {
                clearInterval(simpleTimerInterval);
                simpleTimerInterval = null;
            }
            stopAlarm();

            simpleTimeRemaining = 0;
            simpleTotalTime = 0;
            simpleTargetTime = 0;
            simpleStartTimeDate = 0;
            saveSimpleState();

            if (simpleClockDisplay) simpleClockDisplay.textContent = "00:00:00";
            if (simpleStartTimeDisplay) simpleStartTimeDisplay.style.display = 'none';
            if (simpleEndTimeDisplay) simpleEndTimeDisplay.textContent = "Koniec: --:--:--";
            if (simpleEfficiencyDisplay) {
                simpleEfficiencyDisplay.textContent = "Wydajność: ---%";
                simpleEfficiencyDisplay.className = 'efficiency-badge';
                simpleEfficiencyDisplay.style.color = '#10b981';
            }
            if (simpleStatusMessage) simpleStatusMessage.textContent = 'Zakończono i Zapisano.';

            if (simplePresetsBox) simplePresetsBox.style.display = 'flex';
            if (simpleFormBox) simpleFormBox.style.display = 'block';

            if (simpleStartBtn) simpleStartBtn.style.display = 'inline-flex';
            if (simpleStopBtn) simpleStopBtn.style.display = 'none';
            if (simpleTimerAdjustControls) simpleTimerAdjustControls.style.display = 'none';
            if (simpleStopAlarmBtn) simpleStopAlarmBtn.style.display = 'none';
            if (simpleProgressRingCircle) {
                simpleProgressRingCircle.style.strokeDashoffset = 0;
                simpleProgressRingCircle.style.stroke = '#10b981';
            }
        });
    }

    if (simpleStopAlarmBtn) {
        simpleStopAlarmBtn.addEventListener('click', () => {
            stopAlarm();
            simpleStopAlarmBtn.style.display = 'none';
        });
    }

    if (localStorage.getItem('simpleTimer_running') === 'true') {
        simpleTotalTime = parseInt(localStorage.getItem('simpleTimer_totalTime'), 10) || 0;
        simpleTargetTime = parseInt(localStorage.getItem('simpleTimer_targetTime'), 10) || 0;
        simpleStartTimeDate = parseInt(localStorage.getItem('simpleTimer_startTimeDate'), 10) || (simpleTargetTime - simpleTotalTime * 1000);

        if (simpleTargetTime > 0) {
            if (simplePresetsBox) simplePresetsBox.style.display = 'none';
            if (simpleFormBox) simpleFormBox.style.display = 'none';
            if (simpleStartBtn) simpleStartBtn.style.display = 'none';
            if (simpleStopBtn) simpleStopBtn.style.display = 'inline-flex';
            if (simpleTimerAdjustControls) simpleTimerAdjustControls.style.display = 'flex';

            const endDate = new Date(simpleTargetTime);
            if (simpleStartTimeDisplay) {
                simpleStartTimeDisplay.textContent = `Start: ${new Date(simpleStartTimeDate).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
                simpleStartTimeDisplay.style.display = 'block';
            }
            if (simpleEndTimeDisplay) {
                simpleEndTimeDisplay.textContent = `Koniec: ${endDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
            }

            simpleTimerTick();
            simpleTimerInterval = setInterval(simpleTimerTick, 1000);
        }
    }
});
