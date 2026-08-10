document.addEventListener('DOMContentLoaded', () => {
    const timeInput = document.getElementById('timeInput');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const stopBtn = document.getElementById('stopBtn');
    const clockDisplay = document.getElementById('clockDisplay');
    const endTimeDisplay = document.getElementById('endTimeDisplay');
    const statusMessage = document.getElementById('statusMessage');
    const stopAlarmBtn = document.getElementById('stopAlarmBtn');
    
    // Zakładki (Tabs) mobilne
    const tabCalc = document.getElementById('tab-calc');
    const tabHist = document.getElementById('tab-hist');
    const secCalc = document.getElementById('sec-calculator');
    const secHist = document.getElementById('sec-history');
    
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
        "10.0":{ spools: 4, cnt1: 30, cnt2: 60, wgt1: 1.830, wgt2: 3.604 },
        "12.0":{ spools: 6, cnt1: 28, cnt2: 56, wgt1: 2.578, wgt2: 5.073 },
        "15.0":{ spools: 6, cnt1: 36, cnt2: 72, wgt1: 3.243, wgt2: 6.403 },
        "20.0":{ spools: 12, cnt1: 22, cnt2: 44, wgt1: 4.158, wgt2: 8.150 },
        "25.0":{ spools: 12, cnt1: 24, cnt2: 48, wgt1: 4.491, wgt2: 8.815 },
        "30.0":{ spools: 12, cnt1: 26, cnt2: 52, wgt1: 4.823, wgt2: 9.480 },
        "35.0":{ spools: 12, cnt1: 44, cnt2: 88, wgt1: 7.320, wgt2: 14.640 },
        "40.0":{ spools: 12, cnt1: 50, cnt2: 100, wgt1: 8.320, wgt2: 16.640 },
        "45.0":{ spools: 12, cnt1: 54, cnt2: 108, wgt1: 8.990, wgt2: 17.980 },
        "50.0":{ spools: 12, cnt1: 64, cnt2: 128, wgt1: 10.649, wgt2: 21.298 },
        "60.0":{ spools: 12, cnt1: 76, cnt2: 152, wgt1: 12.650, wgt2: 25.300 },
        "70.0":{ spools: 12, cnt1: 88, cnt2: 176, wgt1: 14.640, wgt2: 29.280 },
        "80.0":{ spools: 12, cnt1: 100, cnt2: 200, wgt1: 16.640, wgt2: 33.280 },
        "90.0":{ spools: 12, cnt1: 114, cnt2: 228, wgt1: 18.970, wgt2: 37.940 },
        "100.0":{ spools: 12, cnt1: 126, cnt2: 252, wgt1: 20.970, wgt2: 41.940 },
        "125.0":{ spools: 12, cnt1: 160, cnt2: 320, wgt1: 26.620, wgt2: 53.240 },
        "150.0":{ spools: 12, cnt1: 192, cnt2: 384, wgt1: 31.950, wgt2: 63.900 },
        "180.0":{ spools: 12, cnt1: 228, cnt2: 456, wgt1: 37.940, wgt2: 75.880 },
        "200.0":{ spools: 12, cnt1: 252, cnt2: 504, wgt1: 41.930, wgt2: 83.860 },
        "250.0":{ spools: 12, cnt1: 320, cnt2: 640, wgt1: 53.250, wgt2: 106.500 },
        "300.0":{ spools: 12, cnt1: 384, cnt2: 768, wgt1: 63.890, wgt2: 127.780 }
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
            localStorage.setItem('activeTimer_isPaused', isPaused ? 'true' : 'false');
            localStorage.setItem('activeTimer_totalPausedMs', totalPausedMs);
            localStorage.setItem('activeTimer_pauseStart', pauseStart);
            localStorage.setItem('activeTimer_originalTotalMs', originalTotalMs);
        }
    }

    function calculateValues(dontShowIfEmpty = false) {
        if (!tonnageInput || !lengthInput || !piecesInput) return;
        if (lengthInput.value === '' || piecesInput.value === '') {
            if (calcResults) calcResults.style.display = 'none';
            return;
        }
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
    
    let isPaused = false;
    let totalPausedMs = 0;
    let pauseStart = 0;
    let originalTotalMs = 0;
    let wakeLock = null;
    
    let audioCtx = null;
    let alarmTimeout = null;
    let alarmStartTimestamp = 0;

    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }

    function formatEndTimeDisplay(endTimestamp) {
        const endD = new Date(endTimestamp);
        const today = new Date();
        const isSameDay = endD.getDate() === today.getDate() && endD.getMonth() === today.getMonth() && endD.getFullYear() === today.getFullYear();
        const endH = String(endD.getHours()).padStart(2, '0');
        const endM = String(endD.getMinutes()).padStart(2, '0');
        const endS = String(endD.getSeconds()).padStart(2, '0');

        if (isSameDay) {
            return `Koniec o: ${endH}:${endM}:${endS}`;
        }
        const endY = endD.getFullYear();
        const endMo = String(endD.getMonth() + 1).padStart(2, '0');
        const endDt = String(endD.getDate()).padStart(2, '0');
        return `Koniec: ${endY}-${endMo}-${endDt} ${endH}:${endM}:${endS}`;
    }

    function updateConnectionStatus() {
        const badge = document.getElementById('pwaBadge');
        if (!badge) return;
        if (navigator.onLine) {
            badge.innerHTML = '<span class="pulse-dot"></span> Online';
            badge.classList.remove('offline');
        } else {
            badge.innerHTML = 'Offline';
            badge.classList.add('offline');
        }
    }

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    updateConnectionStatus();

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
        if (!tabCalc || !tabHist || !secCalc || !secHist) return;
        if (tab === 'calc') {
            tabCalc.classList.add('active');
            tabHist.classList.remove('active');
            secCalc.classList.add('active');
            secHist.classList.remove('active');
        } else {
            tabCalc.classList.remove('active');
            tabHist.classList.add('active');
            secCalc.classList.remove('active');
            secHist.classList.add('active');
        }
    }

    if (tabCalc && tabHist) {
        tabCalc.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('calc');
        });
        tabHist.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('hist');
        });
    }

    // Filtrowanie historii
    const historyFilter = document.getElementById('historyFilter');
    if (historyFilter) {
        historyFilter.addEventListener('change', () => {
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
            reader.onload = function(evt) {
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

                     merged.sort((a,b) => a.id - b.id);
                     localStorage.setItem("zawiesia_history", JSON.stringify(merged));
                     alert(`Zaimportowano pomyślnie! Dodano ${countNew} nowych zleceń.`);
                     window.renderHistory();
                 } catch(err) {
                     alert("Błąd podczas importu: " + err.message);
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
            }
        } catch (err) {
            console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
        }
    }
    
    async function releaseWakeLock() {
        if (wakeLock !== null) {
            await wakeLock.release();
            wakeLock = null;
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (wakeLock !== null && document.visibilityState === 'visible' && !isPaused && timerInterval) {
            requestWakeLock();
        }
    });

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playBeep() {
        if (!audioCtx || isMuted) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.4);
    }

    function triggerVibration(remaining) {
        if (!('vibrate' in navigator) || isMuted) return;
        if (remaining === 0) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        } else if (remaining <= 15) {
            navigator.vibrate(120);
        } else if (remaining <= 60) {
            navigator.vibrate(60);
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
        triggerVibration(remaining);
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
        if ('vibrate' in navigator) navigator.vibrate(0);
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
        if (remainingSeconds < 60 && remainingSeconds >= 0) {
            document.body.classList.add('bg-red');
        } else if (remainingSeconds < 180 && remainingSeconds >= 0) {
            document.body.classList.add('bg-yellow');
        }
    }

    function updateDisplay() {
        if (targetTime === 0) return;
        
        const now = isPaused ? pauseStart : Date.now();
        const remainingStr = Math.round((targetTime - now) / 1000);
        let remaining = parseInt(remainingStr, 10);
        
        if (remaining < 0) remaining = 0;

        clockDisplay.textContent = formatTime(remaining);
        updateBackground(remaining);
        
        if (progressCircle && originalTotalMs > 0) {
            const percent = remaining / (originalTotalMs / 1000);
            const offset = circumference - percent * circumference;
            progressCircle.style.strokeDashoffset = offset;
            
            if (remaining < 60) progressCircle.style.stroke = '#ef4444';
            else if (remaining < 180) progressCircle.style.stroke = '#f59e0b';
            else progressCircle.style.stroke = '#4ade80';
        }

        if (remaining < 60 && remaining > 0 && !isPaused) {
            startAlarm();
        }

        if (remaining === 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            document.body.className = 'bg-red'; 
            statusMessage.textContent = '⏱ Czas dobiegł końca!';
            showNotification();
            startAlarm(); 
            // Zapis do historii po poprawnym zakończeniu timera
            window.finishEarlyAndSave(false);
            
            startTimeDate = 0;
            isPaused = false;
            const cardForm = document.querySelector('.card-form');
            if (cardForm) cardForm.style.display = 'block';
            
            startBtn.style.display = 'inline-block';
            if (pauseBtn) pauseBtn.style.display = 'none';
            if (resumeBtn) resumeBtn.style.display = 'none';
            stopBtn.style.display = 'none';
            clockDisplay.textContent = '00:00:00';
            endTimeDisplay.textContent = 'Koniec: --:--:--';
            releaseWakeLock();
            
            if (progressCircle) {
                progressCircle.style.strokeDashoffset = 0;
                progressCircle.style.stroke = '#4ade80';
            }
        }
    }

    function showNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Czas dobiegł końca!', {
                body: 'Odliczanie zakończone.',
                icon: 'icons/icon-192x192.png'
            });
        }
        triggerVibration(0);
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
        isPaused = false;
        totalPausedMs = 0;
        pauseStart = 0;

        saveState();
        requestWakeLock();

        const cardForm = document.querySelector('.card-form');
        if (cardForm) cardForm.style.display = 'none';

        startBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'inline-block';
        if (resumeBtn) resumeBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';

        endTimeDisplay.textContent = formatEndTimeDisplay(targetTime);

        if (timerInterval) clearInterval(timerInterval);
        
        updateDisplay();
        timerInterval = setInterval(updateDisplay, 1000);
    });

    if (pauseBtn) pauseBtn.addEventListener('click', () => {
        isPaused = true;
        pauseStart = Date.now();
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'inline-block';
        
        endTimeDisplay.textContent = 'Trwa pauza...';
        
        saveState();
        releaseWakeLock();
        updateDisplay();
    });

    if (resumeBtn) resumeBtn.addEventListener('click', () => {
        isPaused = false;
        const pausedFor = Date.now() - pauseStart;
        totalPausedMs += pausedFor;
        targetTime += pausedFor; 
        
        pauseStart = 0;
        
        pauseBtn.style.display = 'inline-block';
        resumeBtn.style.display = 'none';
        
        saveState();
        requestWakeLock();

        endTimeDisplay.textContent = formatEndTimeDisplay(targetTime);

        updateDisplay();
        timerInterval = setInterval(updateDisplay, 1000);
    });

    stopBtn.addEventListener('click', () => {
        if (timerInterval || isPaused) {
            clearInterval(timerInterval);
            timerInterval = null;
            
            stopAlarm();
            statusMessage.textContent = 'Zakończono i Zapisano.';
            targetTime = 0; 
            
            window.finishEarlyAndSave(false);
        } else {
            stopAlarm();
        }
        
        startTimeDate = 0;
        isPaused = false;
        const cardForm = document.querySelector('.card-form');
        if (cardForm) cardForm.style.display = 'block';

        startBtn.style.display = 'inline-block';
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (resumeBtn) resumeBtn.style.display = 'none';
        stopBtn.style.display = 'none';
        clockDisplay.textContent = '00:00:00';
        endTimeDisplay.textContent = 'Koniec: --:--:--';
        document.body.className = '';
        releaseWakeLock();
        if (progressCircle) {
            progressCircle.style.strokeDashoffset = 0;
            progressCircle.style.stroke = '#4ade80';
        }
    });

    const saveOnEnter = (e) => {
        if (e.key === 'Enter') {
            if (timeInput.value && lengthInput.value && piecesInput.value) {
                // Automatycznie rozpocznij rónież odliczanie
                startBtn.click();
                timeInput.blur();
                piecesInput.blur();
                lengthInput.blur();
                tonnageInput.blur();
            } else {
                statusMessage.textContent = 'Wypełnij wszystkie pola aby wystartować!';
                setTimeout(() => { statusMessage.textContent = ''; }, 3000);
            }
        }
    };

    if (timeInput) timeInput.addEventListener('keyup', saveOnEnter);
    if (tonnageInput) tonnageInput.addEventListener('keyup', saveOnEnter);
    if (lengthInput) lengthInput.addEventListener('keyup', saveOnEnter);
    if (piecesInput) piecesInput.addEventListener('keyup', saveOnEnter);


    // --- ZARZĄDZANIE HISTORIĄ ---
    function getHistory() {
        let historyStr = localStorage.getItem("zawiesia_history");
        try {
            let parsed = JSON.parse(historyStr || "[]");
            if(parsed.length > 0 && typeof parsed[0] === 'string') return [];
            return parsed;
        } catch(e) { return []; }
    }

    function saveToHistory(itemObj) {
        let history = getHistory();
        history.push(itemObj);
        localStorage.setItem("zawiesia_history", JSON.stringify(history));
    }

    window.finishEarlyAndSave = function(isManualSave = false) {
        let t_val = tonnageInput.value;
        let L1 = parseFloat(lengthInput.value) || 1.0;
        let pieces = parseInt(piecesInput.value) || 1;
        let timeHours = parseFloat(timeInput.value) || 0;
        let declaredMins = parseFloat((timeHours * 60).toFixed(1));

        let actualMins = declaredMins;
        if (!isManualSave && startTimeDate > 0) {
            let activeMs = Date.now() - startTimeDate - totalPausedMs;
            if (isPaused && pauseStart > 0) {
                activeMs -= (Date.now() - pauseStart);
            }
            actualMins = parseFloat((activeMs / 60000).toFixed(1));
        }

        let t = db[t_val];
        if(!t) return;
        let m_wgt = t.wgt2 - t.wgt1;
        let add_wgt = t.wgt1 - m_wgt;
        let final_unit_wgt = (m_wgt * L1) + add_wgt;
        let total_wgt = parseFloat((final_unit_wgt * pieces).toFixed(2));

        let d = new Date();

        saveToHistory({
            id: Date.now(),
            dayStr: d.toLocaleDateString('pl-PL'),
            timeStr: d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
            ton: t_val,
            l1: L1,
            pieces: pieces,
            time: declaredMins,
            actualTime: actualMins,
            weight: total_wgt
        });
        
        // Wyczyść po zapisie
        localStorage.removeItem('activeTimer_running');
        localStorage.removeItem('activeTimer_isPaused');
        localStorage.removeItem('activeTimer_totalPausedMs');
        localStorage.removeItem('activeTimer_pauseStart');
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
            }
            statEfficiency.textContent = efficiencyStr;
        }
    }

    function filterHistory(history, filterType) {
        const todayStr = new Date().toLocaleDateString('pl-PL');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('pl-PL');
        
        const now = new Date();
        
        // Poniedziałek bieżącego tygodnia
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0,0,0,0);
        const startOfWeekMs = startOfWeek.getTime();

        // Pierwszy dzień bieżącego miesiąca
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const startOfMonthMs = startOfMonth.getTime();

        return history.filter(item => {
            if (filterType === 'all') return true;
            if (filterType === 'today') return item.dayStr === todayStr;
            if (filterType === 'yesterday') return item.dayStr === yesterdayStr;
            if (filterType === 'week') return item.id >= startOfWeekMs;
            if (filterType === 'month') return item.id >= startOfMonthMs;
            return true;
        });
    }

    window.renderHistory = function() {
        let history = getHistory();
        
        // Zawsze aktualizuj statystyki na podstawie pełnej historii
        updateStatistics(history);

        let listDiv = document.getElementById("history-list");
        if(!listDiv) return;
        
        if(history.length === 0) {
            listDiv.innerHTML = '<div style="font-size: 0.9rem; color: rgba(255,255,255,0.5); margin-bottom:15px;">Brak zrobionych zleceń.</div>';
            return;
        }

        // Filtrowanie wpisów
        const filterVal = document.getElementById('historyFilter') ? document.getElementById('historyFilter').value : 'all';
        let filteredHistory = filterHistory(history, filterVal);

        if (filteredHistory.length === 0) {
            listDiv.innerHTML = '<div style="font-size: 0.9rem; color: rgba(255,255,255,0.5); margin-bottom:15px;">Brak zleceń spełniających filtry.</div>';
            return;
        }

        let groups = {};
        [...filteredHistory].reverse().forEach(item => {
            let day = item.dayStr || new Date(item.id).toLocaleDateString('pl-PL');
            let time = item.timeStr || new Date(item.id).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            
            if(!groups[day]) groups[day] = { items: [], totalTime: 0, totalActualTime: 0 };
            
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
            let overTimeMsg = g.totalActualTime > 450 ? `<span style="color:#ef4444; margin-left:4px; font-weight:700;">(+${(g.totalActualTime-450).toFixed(1)} min)</span>` : "";

            html += `
            <div class="daily-group">
                <div class="daily-header">
                    <div>📅 Dzień: ${day}</div>
                    <div class="progress-container">
                        <span>⏱️ Czas faktyczny: <b>${g.totalActualTime.toFixed(1)}</b> / 450m ${overTimeMsg}</span>
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
                html += `<tr>
                    <td data-label="Godzina:">${item.dispTime}</td>
                    <td data-label="Tonaż:"><span style="color:#06b6d4; font-weight:700;">${item.ton} t</span></td>
                    <td data-label="L1 [m]:">${item.l1} m</td>
                    <td data-label="Sztuki:"><b>${item.pieces} szt</b></td>
                    <td data-label="Czas Zlecenia:">
                        <span style="color:#10b981;">Norma: <b>${item.parsedTime.toFixed(1)} min</b></span><br>
                        <span style="color:#f59e0b;">Fakt: <b>${item.parsedActualTime.toFixed(1)} min</b></span>
                    </td>
                    <td data-label="Waga [kg]:"><b>${item.weight} kg</b></td>
                    <td data-label="Opcje:" style="white-space:nowrap; text-align:right;">
                        <button class="btn btn-sm btn-outline" style="padding: 4px 8px; margin-right:4px;" onclick="openEdit(${item.id})" title="Edytuj zlecenie">
                            ✏️ Edytuj
                        </button>
                        <button class="btn btn-sm btn-danger" style="padding: 4px 8px;" onclick="deleteItem(${item.id})" title="Usuń zlecenie">
                            🗑️ Usuń
                        </button>
                    </td>
                </tr>`;
            });
            html += `</tbody></table></div></div>`;
        }
        
        listDiv.innerHTML = html;
    }

    window.deleteItem = function(id) {
        if(!confirm("Na pewno usunąć to zlecenie z historii?")) return;
        let history = getHistory().filter(i => i.id !== id);
        localStorage.setItem("zawiesia_history", JSON.stringify(history));
        window.renderHistory();
    }

    window.clearHistory = function() {
        if(!confirm("Na pewno wyczyścić CAŁĄ historię ze wszystkich dni?")) return;
        localStorage.removeItem("zawiesia_history");
        window.renderHistory();
    }

    window.openEdit = function(id) {
        let item = getHistory().find(i => i.id === id);
        if(!item) return;
        document.getElementById("edit-id").value = item.id;
        document.getElementById("edit-ton").value = item.ton;
        document.getElementById("edit-l1").value = item.l1;
        document.getElementById("edit-pieces").value = item.pieces;
        document.getElementById("edit-time").value = item.time;
        document.getElementById("edit-actual-time").value = item.actualTime !== undefined ? item.actualTime : item.time;
        document.getElementById("edit-modal").style.display = "flex";
    }

    window.closeEdit = function() {
        document.getElementById("edit-modal").style.display = "none";
    }

    window.saveEdit = function() {
        let id = parseInt(document.getElementById("edit-id").value);
        let history = getHistory();
        let index = history.findIndex(i => i.id === id);
        if(index === -1) return;

        let newTon = document.getElementById("edit-ton").value;
        let newL1 = parseFloat(document.getElementById("edit-l1").value);
        let newPieces = parseInt(document.getElementById("edit-pieces").value);
        let newTime = parseFloat(document.getElementById("edit-time").value);
        let newActualTime = parseFloat(document.getElementById("edit-actual-time").value);

        if(!newTon || isNaN(newL1) || isNaN(newPieces) || isNaN(newTime) || isNaN(newActualTime) || newL1 <= 0 || newPieces <= 0 || newTime <= 0 || newActualTime <= 0) {
            return alert("Podaj prawidłowe wartości!");
        }

        let item = history[index];
        let t = db[newTon];
        if(!t) return alert("Niepoprawny tonaż!");

        let m_wgt = t.wgt2 - t.wgt1;
        let add_wgt = t.wgt1 - m_wgt;
        let final_unit_wgt = (m_wgt * newL1) + add_wgt;
        
        item.ton = newTon;
        item.l1 = newL1;
        item.pieces = newPieces;
        item.time = newTime;
        item.actualTime = newActualTime;
        item.weight = parseFloat((final_unit_wgt * newPieces).toFixed(2));

        history[index] = item;
        localStorage.setItem("zawiesia_history", JSON.stringify(history));
        
        window.closeEdit();
        window.renderHistory();
    }

    function getExportHistory() {
        const history = getHistory();
        const filterEl = document.getElementById('historyFilter');
        const filterVal = filterEl ? filterEl.value : 'all';
        const filtered = filterHistory(history, filterVal);
        const filterLabels = {
            all: 'wszystkie',
            today: 'dzisiaj',
            yesterday: 'wczoraj',
            week: 'tydzien',
            month: 'miesiac'
        };
        return {
            items: filtered,
            filterVal,
            filterLabel: filterLabels[filterVal] || filterVal
        };
    }

    window.exportCSV = function() {
        const { items, filterVal, filterLabel } = getExportHistory();
        if (items.length === 0) {
            return alert(filterVal === 'all'
                ? "Brak danych do wyeksportowania!"
                : "Brak zleceń spełniających aktywny filtr.");
        }

        let csv = "Data;Godzina;Tonaz [t];Dlugosc L1 [m];Sztuki;Czas wykonania (Norma) [min];Czas Faktyczny [min];Laczna waga [kg]\n";
        
        items.forEach(i => {
            let d = i.dayStr || new Date(i.id).toLocaleDateString('pl-PL');
            let t = i.timeStr || new Date(i.id).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            let act = i.actualTime !== undefined ? i.actualTime : i.time;
            csv += `${d};${t};${i.ton};${i.l1};${i.pieces};${i.time};${act};${i.weight}\n`;
        });

        let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement("a");
        let url = URL.createObjectURL(blob);
        link.href = url;
        const suffix = filterVal === 'all' ? '' : `_${filterLabel}`;
        link.download = `Historia_Czasomierz_${new Date().toLocaleDateString('pl-PL').replace(/\./g, '-')}${suffix}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    window.exportJSON = function() {
        const { items, filterVal, filterLabel } = getExportHistory();
        if (items.length === 0) {
            return alert(filterVal === 'all'
                ? "Brak danych do wyeksportowania!"
                : "Brak zleceń spełniających aktywny filtr.");
        }

        let jsonStr = JSON.stringify(items, null, 2);
        let blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
        let link = document.createElement("a");
        let url = URL.createObjectURL(blob);
        link.href = url;
        const suffix = filterVal === 'all' ? '' : `_${filterLabel}`;
        link.download = `Backup_Czasomierz_${new Date().toLocaleDateString('pl-PL').replace(/\./g, '-')}${suffix}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    // Restore z localStorage w razie ubicia karty
    if (localStorage.getItem('activeTimer_running') === 'true') {
        if (localStorage.getItem('activeTimer_tonnage')) tonnageInput.value = localStorage.getItem('activeTimer_tonnage');
        if (localStorage.getItem('activeTimer_length')) lengthInput.value = localStorage.getItem('activeTimer_length');
        if (localStorage.getItem('activeTimer_pieces')) piecesInput.value = localStorage.getItem('activeTimer_pieces');
        if (localStorage.getItem('activeTimer_timeInput')) timeInput.value = localStorage.getItem('activeTimer_timeInput');

        targetTime = parseInt(localStorage.getItem('activeTimer_targetTime'), 10) || 0;
        startTimeDate = parseInt(localStorage.getItem('activeTimer_startTimeDate'), 10) || 0;
        isPaused = localStorage.getItem('activeTimer_isPaused') === 'true';
        totalPausedMs = parseInt(localStorage.getItem('activeTimer_totalPausedMs'), 10) || 0;
        pauseStart = parseInt(localStorage.getItem('activeTimer_pauseStart'), 10) || 0;
        originalTotalMs = parseInt(localStorage.getItem('activeTimer_originalTotalMs'), 10) || 0;

        calculateValues();

        if (targetTime > 0) {
            const cardForm = document.querySelector('.card-form');
            if (cardForm) cardForm.style.display = 'none';

            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';

            if (isPaused) {
                if (pauseBtn) pauseBtn.style.display = 'none';
                if (resumeBtn) resumeBtn.style.display = 'inline-block';
                endTimeDisplay.textContent = 'Trwa pauza...';
            } else {
                if (pauseBtn) pauseBtn.style.display = 'inline-block';
                if (resumeBtn) resumeBtn.style.display = 'none';
                endTimeDisplay.textContent = formatEndTimeDisplay(targetTime);
                requestWakeLock();
            }

            updateDisplay();
            if (!isPaused) {
                timerInterval = setInterval(updateDisplay, 1000);
            }
        }
    }

    const editModal = document.getElementById('edit-modal');
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) window.closeEdit();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.closeEdit();
    });

    // Uruchom na start
    window.renderHistory();
});
