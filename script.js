document.addEventListener('DOMContentLoaded', () => {
    const timeInput = document.getElementById('timeInput');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const clockDisplay = document.getElementById('clockDisplay');
    const endTimeDisplay = document.getElementById('endTimeDisplay');
    const statusMessage = document.getElementById('statusMessage');
    
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
    const timerSection = document.getElementById('timerSection');
    const productionSummary = document.getElementById('productionSummary');
    const summaryTonnage = document.getElementById('summary-tonnage');
    const summaryLength = document.getElementById('summary-length');
    const summaryPieces = document.getElementById('summary-pieces');
    const summaryTime = document.getElementById('summary-time');
    const tonnageColorBadge = document.getElementById('tonnageColorBadge');

    const tonnageColorMap = {
        '1.0': { key: 'purple', label: 'Fioletowy' },
        '2.0': { key: 'green', label: 'Zielony' },
        '3.0': { key: 'yellow', label: 'Żółty' },
        '4.0': { key: 'gray', label: 'Szary' },
        '5.0': { key: 'red', label: 'Czerwony' },
        '6.0': { key: 'brown', label: 'Brązowy' },
        '8.0': { key: 'blue', label: 'Niebieski' }
    };

    const db = {
        "0.5": { spools: 1, cnt1: 20, cnt2: 40, wgt1: 0.159, wgt2: 0.312 },
        "1.0": { spools: 1, cnt1: 20, cnt2: 40, wgt1: 0.159, wgt2: 0.312 },
        "1.5": { spools: 1, cnt1: 26, cnt2: 52, wgt1: 0.201, wgt2: 0.395 },
        "2.0": { spools: 2, cnt1: 20, cnt2: 40, wgt1: 0.319, wgt2: 0.624 },
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
        "35.0":{ spools: 12, cnt1: 34, cnt2: 68, wgt1: 6.154, wgt2: 12.141 },
        "40.0":{ spools: 12, cnt1: 40, cnt2: 80, wgt1: 7.152, wgt2: 14.137 },
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
            localStorage.setItem('activeTimer_originalTotalMs', originalTotalMs);
        }
    }

    function hasValidCalculatorData() {
        const length = Number(lengthInput.value);
        const pieces = Number(piecesInput.value);

        return Boolean(db[tonnageInput.value])
            && Number.isFinite(length) && length > 0
            && Number.isInteger(pieces) && pieces > 0;
    }

    function hasCompleteProductionData() {
        const time = Number(timeInput.value);
        return hasValidCalculatorData() && Number.isFinite(time) && time > 0;
    }

    function getTonnageColor(tonnage) {
        if (Number(tonnage) >= 10) return { key: 'orange', label: 'Pomarańczowy' };
        return tonnageColorMap[tonnage] || null;
    }

    function updateTonnageTheme() {
        const color = getTonnageColor(tonnageInput.value);

        if (!color) {
            delete document.body.dataset.tonnageColor;
            tonnageColorBadge.hidden = true;
            return;
        }

        document.body.dataset.tonnageColor = color.key;
        tonnageColorBadge.textContent = color.label;
        tonnageColorBadge.hidden = false;
    }

    function updateProductionSummary() {
        if (!hasCompleteProductionData()) return;

        summaryTonnage.textContent = `${tonnageInput.value} t`;
        summaryLength.textContent = `${lengthInput.value} m`;
        summaryPieces.textContent = `${piecesInput.value} szt.`;
        summaryTime.textContent = `${timeInput.value} h`;
    }

    function updateProductionFormState() {
        const isComplete = hasCompleteProductionData();
        timerSection.hidden = !isComplete;
        calcResults.hidden = !isComplete;
        productionSummary.hidden = !isComplete;

        if (isComplete) updateProductionSummary();
    }

    function setProductionInputsDisabled(disabled) {
        [tonnageInput, lengthInput, piecesInput, timeInput].forEach(input => {
            input.disabled = disabled;
        });
    }

    function calculateValues() {
        if (!tonnageInput || !lengthInput || !piecesInput) return;
        if (!hasValidCalculatorData()) return;

        const t_val = tonnageInput.value;
        const L1 = Number(lengthInput.value);
        const pieces = Number(piecesInput.value);

        if (!db[t_val]) return;
        
        let t = db[t_val];

        let m_cnt = t.cnt2 - t.cnt1;
        let add_cnt = t.cnt1 - m_cnt;
        let final_cnt = (m_cnt * L1) + add_cnt;

        let m_wgt = t.wgt2 - t.wgt1;
        let add_wgt = t.wgt1 - m_wgt;
        let final_unit_wgt = (m_wgt * L1) + add_wgt;
        let total_wgt = final_unit_wgt * pieces;

        let isAbove4t = parseFloat(t_val) > 4.0;
        let dtex = isAbove4t ? "132 000" : "66 000";

        let exchange_pieces = Math.floor(t.spools * 15 / final_unit_wgt);

        if (outDtex) outDtex.textContent = dtex;
        if (outSpools) outSpools.textContent = t.spools + " szt";
        if (outUnitWeight) outUnitWeight.textContent = final_unit_wgt.toFixed(2) + " kg";
        if (outWeight) outWeight.textContent = total_wgt.toFixed(2) + " kg";
        if (outCounter) outCounter.textContent = Math.round(final_cnt);
        if (outExchange) outExchange.textContent = exchange_pieces + " szt";
    }

    function handleProductionInput() {
        updateTonnageTheme();
        calculateValues();
        updateProductionFormState();
        saveState();
    }

    if (tonnageInput) tonnageInput.addEventListener('change', handleProductionInput);
    if (lengthInput) lengthInput.addEventListener('input', handleProductionInput);
    if (piecesInput) piecesInput.addEventListener('input', handleProductionInput);
    if (timeInput) timeInput.addEventListener('input', handleProductionInput);
    
    // Oblicz na starcie, jeśli są domyślne wartości
    updateTonnageTheme();
    updateProductionFormState();

    let targetTime = 0;
    let timerInterval = null;
    let isMuted = false;
    let startTimeDate = 0;
    
    let originalTotalMs = 0;
    let wakeLock = null;
    
    let audioCtx = null;
    let alarmTimeout = null;

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => {
                    console.log('Service Worker registered.', reg.scope);

                    if (reg.waiting) {
                        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }

                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (!newWorker) return;

                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                            }
                        });
                    });
                })
                .catch(err => console.log('Service Worker registration failed:', err));
        });

        let refreshingAfterUpdate = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshingAfterUpdate) return;
            refreshingAfterUpdate = true;
            window.location.reload();
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
        if (wakeLock !== null && document.visibilityState === 'visible' && timerInterval) {
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

    function scheduleNextBeep() {
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
        scheduleNextBeep();
    }

    function stopAlarm() {
        if (alarmTimeout) {
            clearTimeout(alarmTimeout);
            alarmTimeout = null;
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
        
        const now = Date.now();
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

        if (remaining < 60 && remaining > 0) {
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
            targetTime = 0;
            
            startTimeDate = 0;
            startBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
            setProductionInputsDisabled(false);
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

        if (!hasCompleteProductionData()) {
            statusMessage.textContent = 'Wypełnij poprawnie wszystkie pola formularza.';
            updateProductionFormState();
            return;
        }

        statusMessage.textContent = '';
        stopAlarm();
        
        const totalMs = Math.floor(val * 3600 * 1000);
        originalTotalMs = totalMs;
        startTimeDate = Date.now();
        targetTime = startTimeDate + totalMs;
        saveState();
        requestWakeLock();
        setProductionInputsDisabled(true);

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
            const endMo = String(endD.getMonth()+1).padStart(2, '0');
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
            
            stopAlarm();
            statusMessage.textContent = 'Zakończono i Zapisano.';
            targetTime = 0; 
            
            window.finishEarlyAndSave(false);
        } else {
            stopAlarm();
        }
        
        startTimeDate = 0;
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        setProductionInputsDisabled(false);
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
                // Automatycznie rozpocznij również odliczanie
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
        stopAlarm();

        let t_val = tonnageInput.value;
        let L1 = parseFloat(lengthInput.value) || 1.0;
        let pieces = parseInt(piecesInput.value) || 1;
        let timeHours = parseFloat(timeInput.value) || 0;
        let declaredMins = parseFloat((timeHours * 60).toFixed(1));

        let actualMins = declaredMins;
        if (!isManualSave && startTimeDate > 0) {
            let activeMs = Date.now() - startTimeDate;
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
        updateProductionFormState();
        
        window.renderHistory();
    }

    function clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    function createTextElement(tagName, className, text) {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        element.textContent = text;
        return element;
    }

    function createHistoryCell(label, text) {
        const cell = document.createElement('td');
        cell.dataset.label = label;
        cell.textContent = text;
        return cell;
    }

    function createHistoryActionButton(action, id, className, text, label) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `btn-icon ${className}`;
        button.dataset.action = action;
        button.dataset.id = String(id);
        button.setAttribute('aria-label', label);
        button.textContent = text;
        return button;
    }

    window.renderHistory = function() {
        let history = getHistory();
        let listDiv = document.getElementById("history-list");
        if(!listDiv) return;

        clearElement(listDiv);
        
        if(history.length === 0) {
            listDiv.appendChild(createTextElement('div', 'empty-history', 'Brak zrobionych zlece\u0144.'));
            return;
        }

        let groups = {};
        [...history].reverse().forEach(item => {
            let day = item.dayStr || new Date(item.id).toLocaleDateString('pl-PL');
            let time = item.timeStr || new Date(item.id).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            let parsedTime = parseFloat(item.time) || 0;
            let parsedActualTime = item.actualTime !== undefined ? parseFloat(item.actualTime) : parsedTime;
            
            if(!groups[day]) groups[day] = { items: [], totalTime: 0, totalActualTime: 0 };
            
            groups[day].items.push({
                ...item,
                dispDay: day,
                dispTime: time,
                parsedTime,
                parsedActualTime
            });
            groups[day].totalTime += parsedTime;
            groups[day].totalActualTime += parsedActualTime;
        });

        Object.keys(groups).forEach(day => {
            let g = groups[day];
            let percent = Math.min((g.totalActualTime / 450) * 100, 100).toFixed(0);

            const dailyGroup = document.createElement('div');
            dailyGroup.className = 'daily-group';

            const header = document.createElement('div');
            header.className = 'daily-header';
            header.appendChild(createTextElement('div', null, 'Data: ' + day));

            const progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            progressContainer.appendChild(createTextElement('span', null, 'Faktycznie: ' + g.totalActualTime.toFixed(1) + ' / 450 min'));

            if (g.totalActualTime > 450) {
                progressContainer.appendChild(createTextElement('span', 'overtime-note', `(+${(g.totalActualTime - 450).toFixed(1)} min)`));
            }

            const progressBarBg = document.createElement('div');
            progressBarBg.className = 'progress-bar-bg';
            const progressBarFill = document.createElement('div');
            progressBarFill.className = `progress-bar-fill ${g.totalActualTime >= 450 ? 'is-over' : ''}`;
            progressBarFill.style.width = `${percent}%`;
            progressBarBg.appendChild(progressBarFill);
            progressContainer.appendChild(progressBarBg);
            header.appendChild(progressContainer);
            dailyGroup.appendChild(header);

            const tableWrap = document.createElement('div');
            tableWrap.className = 'table-responsive';
            const table = document.createElement('table');
            table.className = 'hist-table';
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            ['Godz', 'Tona\u017c', 'L1 [m]', 'Szt.', 'Czas (Min)', 'Kg', 'Opcje'].forEach(label => {
                headerRow.appendChild(createTextElement('th', null, label));
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            g.items.forEach(item => {
                const row = document.createElement('tr');
                row.appendChild(createHistoryCell('Godz:', item.dispTime));

                const tonCell = document.createElement('td');
                tonCell.dataset.label = 'Tona\u017c:';
                tonCell.appendChild(createTextElement('b', null, `${item.ton} t`));
                row.appendChild(tonCell);

                row.appendChild(createHistoryCell('L1 [m]:', item.l1));
                row.appendChild(createHistoryCell('Szt.:', item.pieces));

                const timeCell = document.createElement('td');
                timeCell.dataset.label = 'Czas:';
                timeCell.className = 'history-time-cell';
                const norm = document.createElement('span');
                norm.className = 'history-time-norm';
                norm.append('Norma: ', createTextElement('b', null, item.parsedTime.toFixed(1)));
                const actual = document.createElement('span');
                actual.className = 'history-time-actual';
                actual.append('Fakt: ', createTextElement('b', null, item.parsedActualTime.toFixed(1)));
                timeCell.append(norm, document.createElement('br'), actual);
                row.appendChild(timeCell);

                row.appendChild(createHistoryCell('Kg:', item.weight));

                const actionCell = document.createElement('td');
                actionCell.dataset.label = 'Opcje:';
                actionCell.className = 'history-actions-cell';
                actionCell.append(
                    createHistoryActionButton('edit', item.id, 'edit-history-btn', 'Edytuj', 'Edytuj zlecenie'),
                    createHistoryActionButton('delete', item.id, 'delete-history-btn', 'Usu\u0144', 'Usu\u0144 zlecenie')
                );
                row.appendChild(actionCell);
                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            tableWrap.appendChild(table);
            dailyGroup.appendChild(tableWrap);
            listDiv.appendChild(dailyGroup);
        });
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

        let newPieces = parseInt(document.getElementById("edit-pieces").value);
        let newTime = parseFloat(document.getElementById("edit-time").value);

        if(!newPieces || !newTime) return alert("Podaj prawidłowe wartości!");

        let item = history[index];
        let t = db[item.ton];
        let m_wgt = t.wgt2 - t.wgt1;
        let add_wgt = t.wgt1 - m_wgt;
        let final_unit_wgt = (m_wgt * parseFloat(item.l1)) + add_wgt;
        
        item.pieces = newPieces;
        item.time = newTime;
        item.weight = parseFloat((final_unit_wgt * newPieces).toFixed(2));

        history[index] = item;
        localStorage.setItem("zawiesia_history", JSON.stringify(history));
        
        window.closeEdit();
        window.renderHistory();
    }

    window.exportCSV = function() {
        let history = getHistory();
        if(history.length === 0) return alert("Brak danych do wyeksportowania!");

        const csvEscape = value => {
            const text = String(value ?? '');
            if (/[;"\r\n]/.test(text)) {
                return `"${text.replace(/"/g, '""')}"`;
            }
            return text;
        };

        const rows = [["Data", "Godzina", "Tonaz [t]", "Dlugosc L1 [m]", "Sztuki", "Czas wykonania (Norma) [min]", "Czas Faktyczny [min]", "Laczna waga [kg]"]];
        
        history.forEach(i => {
            let d = i.dayStr || new Date(i.id).toLocaleDateString('pl-PL');
            let t = i.timeStr || new Date(i.id).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            let act = i.actualTime !== undefined ? i.actualTime : i.time;
            rows.push([d, t, i.ton, i.l1, i.pieces, i.time, act, i.weight]);
        });

        let csv = "\uFEFF" + rows.map(row => row.map(csvEscape).join(';')).join('\n');
        let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement("a");
        let url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `Historia_Czasomierz_${new Date().toLocaleDateString('pl-PL').replace(/\./g, '-')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    const historyList = document.getElementById("history-list");
    if (historyList) {
        historyList.addEventListener('click', e => {
            const button = e.target.closest('[data-action][data-id]');
            if (!button) return;

            const id = parseInt(button.dataset.id, 10);
            if (button.dataset.action === 'edit') window.openEdit(id);
            if (button.dataset.action === 'delete') window.deleteItem(id);
        });
    }

    const clearHistoryBtn = document.getElementById("clearHistoryBtn");
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', window.clearHistory);

    const exportCsvBtn = document.getElementById("exportCsvBtn");
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', window.exportCSV);

    const saveEditBtn = document.getElementById("saveEditBtn");
    if (saveEditBtn) saveEditBtn.addEventListener('click', window.saveEdit);

    const closeEditBtn = document.getElementById("closeEditBtn");
    if (closeEditBtn) closeEditBtn.addEventListener('click', window.closeEdit);
        // Restore z localStorage w razie ubicia karty
    if (localStorage.getItem('activeTimer_running') === 'true') {
        if (localStorage.getItem('activeTimer_tonnage')) tonnageInput.value = localStorage.getItem('activeTimer_tonnage');
        if (localStorage.getItem('activeTimer_length')) lengthInput.value = localStorage.getItem('activeTimer_length');
        if (localStorage.getItem('activeTimer_pieces')) piecesInput.value = localStorage.getItem('activeTimer_pieces');
        if (localStorage.getItem('activeTimer_timeInput')) timeInput.value = localStorage.getItem('activeTimer_timeInput');
        
        targetTime = parseInt(localStorage.getItem('activeTimer_targetTime'), 10) || 0;
        startTimeDate = parseInt(localStorage.getItem('activeTimer_startTimeDate'), 10) || 0;
        originalTotalMs = parseInt(localStorage.getItem('activeTimer_originalTotalMs'), 10) || 0;
        
        calculateValues();
        updateTonnageTheme();
        updateProductionFormState();
        
        if (targetTime > 0) {
            setProductionInputsDisabled(true);
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
                const endMo = String(endD.getMonth()+1).padStart(2, '0');
                const endDt = String(endD.getDate()).padStart(2, '0');
                endTimeDisplay.textContent = `Koniec: ${endY}-${endMo}-${endDt} ${endH}:${endM}:${endS}`;
            }
            
            updateDisplay();
            if (targetTime > 0) {
                timerInterval = setInterval(updateDisplay, 1000);
                requestWakeLock();
            }
        }
    }

    // Uruchom na start
    window.renderHistory();
});
