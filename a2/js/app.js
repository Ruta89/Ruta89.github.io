/**
 * Główny punkt startowy aplikacji: wiązanie DOM, motywu, jednostki czasu,
 * zakładek, kalkulatora, timerów, PWA (SWR) i skrótów klawiszowych.
 */
(function (global) {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        const { STORAGE_KEYS } = global.RutaApp.Config;
        const UI = global.RutaApp.UI;
        const Storage = global.RutaApp.Storage;
        const Calculator = global.RutaApp.Calculator;
        const Audio = global.RutaApp.Audio;
        const Timer = global.RutaApp.Timer;
        const History = global.RutaApp.History;

        // Elementy głównego formularza i timera
        const mainOrderForm = document.getElementById('main-order-form');
        const tonnageInput = document.getElementById('tonnage');
        const lengthInput = document.getElementById('length');
        const piecesInput = document.getElementById('pieces');
        const timeInput = document.getElementById('timeInput');
        const orderNoteInput = document.getElementById('orderNote');
        const mainTimeHelper = document.getElementById('mainTimeHelper');
        const calcResults = document.getElementById('calcResults');
        const cardForm = document.querySelector('.card-form');

        const activeOrderSummary = document.getElementById('activeOrderSummary');
        const summaryTon = document.getElementById('summary-ton');
        const summaryL1 = document.getElementById('summary-l1');
        const summaryPieces = document.getElementById('summary-pieces');
        const summaryCounter = document.getElementById('summary-counter');
        const summaryNoteWrap = document.getElementById('summary-note-wrap');
        const summaryNote = document.getElementById('summary-note');

        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const stopAlarmBtn = document.getElementById('stopAlarmBtn');
        const statusMessage = document.getElementById('statusMessage');

        // Elementy Prostego Timera
        const simpleTimeInput = document.getElementById('simpleTimeInput');
        const simpleNoteInput = document.getElementById('simpleNote');
        const simpleTimeHelper = document.getElementById('simpleTimeHelper');
        const simplePresetsBox = document.getElementById('simplePresetsBox');
        const simpleFormBox = document.getElementById('simpleFormBox');
        const simpleActiveNoteBar = document.getElementById('simpleActiveNoteBar');
        const simpleSummaryNote = document.getElementById('simple-summary-note');
        const simpleStartBtn = document.getElementById('simpleStartBtn');
        const simpleStopBtn = document.getElementById('simpleStopBtn');
        const simpleStopAlarmBtn = document.getElementById('simpleStopAlarmBtn');

        // ==================================================================
        // ZARZĄDZANIE MOTYWEM (TRYB JASNY WYSOKIEGO KONTRASTU / TRYB CIEMNY)
        // ==================================================================
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        const mediaDark = global.matchMedia ? global.matchMedia('(prefers-color-scheme: dark)') : null;

        function readStoredColorScheme() {
            try {
                const val = localStorage.getItem(STORAGE_KEYS.colorScheme);
                return val === 'light' || val === 'dark' ? val : null;
            } catch (_) {
                return null;
            }
        }

        function applyColorSchemeMeta(storedVal) {
            const schemeContent = storedVal || 'light dark';
            if (colorSchemeMeta) {
                colorSchemeMeta.setAttribute('content', schemeContent);
            }
            const effective = storedVal || (mediaDark?.matches ? 'dark' : 'light');
            if (themeColorMeta) {
                themeColorMeta.setAttribute('content', effective === 'light' ? '#f1f5f9' : '#0b0f19');
            }
        }

        applyColorSchemeMeta(readStoredColorScheme());

        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                const stored = readStoredColorScheme();
                const systemScheme = mediaDark?.matches ? 'dark' : 'light';
                const renderedScheme = stored || systemScheme;
                const targetScheme = renderedScheme === 'dark' ? 'light' : 'dark';

                let nextStored = null;
                try {
                    if (targetScheme !== systemScheme) {
                        localStorage.setItem(STORAGE_KEYS.colorScheme, targetScheme);
                        nextStored = targetScheme;
                    } else {
                        localStorage.removeItem(STORAGE_KEYS.colorScheme);
                        nextStored = null;
                    }
                } catch (_) {
                    nextStored = targetScheme;
                }

                applyColorSchemeMeta(nextStored);
                UI.showToast(
                    targetScheme === 'light' ? 'Włączono tryb jasny (wysoki kontrast).' : 'Włączono tryb ciemny.',
                    'info'
                );
            });
        }

        global.addEventListener('storage', (e) => {
            if (e.key === STORAGE_KEYS.colorScheme) {
                applyColorSchemeMeta(readStoredColorScheme());
            }
        });

        if (mediaDark && typeof mediaDark.addEventListener === 'function') {
            mediaDark.addEventListener('change', () => {
                if (!readStoredColorScheme()) {
                    applyColorSchemeMeta(null);
                }
            });
        }

        // ==================================================================
        // NAWIGACJA ZAKŁADEK
        // ==================================================================
        let activeTabId = 'calc';
        const tabs = [
            { id: 'calc', btn: document.getElementById('tab-calc'), panel: document.getElementById('sec-calculator') },
            {
                id: 'simple-timer',
                btn: document.getElementById('tab-simple-timer'),
                panel: document.getElementById('sec-simple-timer')
            },
            { id: 'hist', btn: document.getElementById('tab-hist'), panel: document.getElementById('sec-history') }
        ];

        function switchTab(targetId, moveFocus = false) {
            activeTabId = targetId;
            tabs.forEach(({ id, btn, panel }) => {
                if (!btn || !panel) return;
                const isActive = id === targetId;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', String(isActive));
                btn.setAttribute('tabindex', isActive ? '0' : '-1');
                panel.classList.toggle('active', isActive);
                if (isActive) {
                    panel.removeAttribute('hidden');
                    if (moveFocus) btn.focus();
                } else {
                    panel.setAttribute('hidden', '');
                }
            });

            if (targetId === 'simple-timer' && !moveFocus && simpleTimeInput && simpleFormBox?.style.display !== 'none') {
                setTimeout(() => simpleTimeInput.focus(), 80);
            }
        }

        tabs.forEach(({ id, btn }, idx) => {
            if (!btn) return;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(id, false);
            });
            btn.addEventListener('keydown', (e) => {
                let nextIdx = null;
                if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
                else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
                else if (e.key === 'Home') nextIdx = 0;
                else if (e.key === 'End') nextIdx = tabs.length - 1;

                if (nextIdx !== null) {
                    e.preventDefault();
                    switchTab(tabs[nextIdx].id, true);
                }
            });
        });

        // ==================================================================
        // REJESTRACJA SERVICE WORKERA I TOAST AKTUALIZACJI
        // ==================================================================
        let swRefreshing = false;

        function showSwUpdateToast(worker) {
            if (!worker) return;
            UI.showToast('Dostępna nowa wersja aplikacji — odśwież', 'info', {
                id: 'sw-update-toast',
                persistent: true,
                dismissible: true,
                actionLabel: 'Odśwież',
                onAction: () => {
                    worker.postMessage({ type: 'SKIP_WAITING' });
                }
            });
        }

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (swRefreshing) return;
                swRefreshing = true;
                global.location.reload();
            });

            global.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('sw.js')
                    .then((reg) => {
                        if (reg.waiting && navigator.serviceWorker.controller) {
                            showSwUpdateToast(reg.waiting);
                        }
                        reg.addEventListener('updatefound', () => {
                            const newWorker = reg.installing;
                            if (!newWorker) return;
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    showSwUpdateToast(newWorker);
                                }
                            });
                        });
                    })
                    .catch((err) => {
                        console.warn('Rejestracja Service Workera nie powiodła się:', err);
                    });
            });
        }

        function updateOnlineStatus() {
            const badge = document.getElementById('pwaBadge');
            const text = document.getElementById('pwaStatusText');
            if (!badge || !text) return;

            if (navigator.onLine) {
                badge.classList.remove('offline');
                text.textContent = 'Online';
                if (Storage.isCloudEnabled()) {
                    UI.updateCloudBadge('online', 'Chmura: Aktywna');
                }
            } else {
                badge.classList.add('offline');
                text.textContent = 'Offline (Zapis w Pamięci)';
                if (Storage.isCloudEnabled()) {
                    UI.updateCloudBadge('offline', 'Chmura: Offline (bufor)');
                }
            }
        }

        global.addEventListener('online', updateOnlineStatus);
        global.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();

        const pwaInstallBtn = document.getElementById('pwaInstallBtn');
        let deferredPrompt = null;

        global.addEventListener('beforeinstallprompt', (e) => {
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
                    UI.showToast('Pomyślnie zainstalowano aplikację!', 'success');
                }
                deferredPrompt = null;
                pwaInstallBtn.style.display = 'none';
            });
        }

        // Wyciszenie dźwięku
        Audio.updateMuteIcon();
        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => Audio.toggleMute());
        }

        // ==================================================================
        // PRZEŁĄCZNIK JEDNOSTKI CZASU (GODZINY DZIESIĘTNE <-> MINUTY)
        // ==================================================================
        let currentTimeUnit = 'hours';
        try {
            currentTimeUnit = localStorage.getItem(STORAGE_KEYS.timeUnit) === 'minutes' ? 'minutes' : 'hours';
        } catch (_) {
            currentTimeUnit = 'hours';
        }

        function formatTimeHelperText(inputEl) {
            const val = UI.parseDecimal(inputEl ? inputEl.value : '');
            if (!Number.isFinite(val) || val <= 0) {
                return currentTimeUnit === 'minutes' ? '-- godz' : '-- min';
            }
            if (currentTimeUnit === 'minutes') {
                return `${Number((val / 60).toFixed(2))} godz`;
            }
            return `${Math.round(val * 60)} min`;
        }

        function updateMainTimeHelper() {
            if (mainTimeHelper) {
                mainTimeHelper.textContent = formatTimeHelperText(timeInput);
            }
        }

        function updateSimpleTimeHelper() {
            if (simpleTimeHelper) {
                simpleTimeHelper.textContent = formatTimeHelperText(simpleTimeInput);
            }
        }

        function syncSimplePresetHighlights() {
            const currentVal = UI.parseDecimal(simpleTimeInput ? simpleTimeInput.value : '');
            document.querySelectorAll('.preset-pill').forEach((btn) => {
                const targetVal = Number(
                    currentTimeUnit === 'minutes' ? btn.dataset.presetMinutes : btn.dataset.presetHours
                );
                const tolerance = currentTimeUnit === 'minutes' ? 0.05 : 0.0001;
                btn.classList.toggle(
                    'active',
                    Number.isFinite(currentVal) && Math.abs(currentVal - targetVal) < tolerance
                );
            });
        }

        function syncTimeUnitUI() {
            const isMinutes = currentTimeUnit === 'minutes';

            document.querySelectorAll('[data-time-unit-toggle]').forEach((btn) => {
                btn.setAttribute('aria-pressed', String(isMinutes));
                btn.querySelectorAll('.unit-toggle-pill').forEach((pill) => {
                    pill.classList.toggle('active', pill.dataset.unitOpt === currentTimeUnit);
                });
            });

            if (timeInput) {
                timeInput.placeholder = isMinutes ? 'np. 30' : 'np. 0.5';
                timeInput.min = isMinutes ? '0.1' : '0.01';
            }
            const mainErrText = document.getElementById('timeInput-error-text');
            if (mainErrText) {
                mainErrText.textContent = isMinutes
                    ? 'Podaj dodatni czas normatywny w minutach (np. 30).'
                    : 'Podaj dodatni czas normatywny w godzinach (np. 0.5).';
            }

            if (simpleTimeInput) {
                simpleTimeInput.placeholder = isMinutes ? 'np. 30 (0.5 godz)' : 'np. 0.5 (30 min)';
                simpleTimeInput.min = isMinutes ? '0.1' : '0.01';
            }
            const simpleErrText = document.getElementById('simpleTimeInput-error-text');
            if (simpleErrText) {
                simpleErrText.textContent = isMinutes
                    ? 'Podaj dodatni czas normatywny w minutach (np. 30).'
                    : 'Podaj dodatni czas normatywny w godzinach (np. 0.5).';
            }

            updateMainTimeHelper();
            updateSimpleTimeHelper();
            syncSimplePresetHighlights();
        }

        function convertInputBetweenUnits(inputEl, fromUnit, toUnit) {
            if (!inputEl || fromUnit === toUnit) return;
            const val = UI.parseDecimal(inputEl.value);
            if (!Number.isFinite(val) || val <= 0) return;

            if (fromUnit === 'hours' && toUnit === 'minutes') {
                inputEl.value = String(Number((val * 60).toFixed(1)));
            } else if (fromUnit === 'minutes' && toUnit === 'hours') {
                inputEl.value = String(Number((val / 60).toFixed(4)));
            }
        }

        function parseInputMinutes(inputEl) {
            const val = UI.parseDecimal(inputEl ? inputEl.value : '');
            if (!Number.isFinite(val) || val <= 0) return NaN;
            return currentTimeUnit === 'minutes' ? val : val * 60;
        }

        // ==================================================================
        // ZAPIS I ODTWARZANIE PÓL FORMULARZY + PASKI PODSUMOWANIA
        // ==================================================================
        function saveMainFormInputs() {
            try {
                if (tonnageInput) localStorage.setItem(STORAGE_KEYS.main.tonnage, tonnageInput.value);
                if (lengthInput) localStorage.setItem(STORAGE_KEYS.main.length, lengthInput.value);
                if (piecesInput) localStorage.setItem(STORAGE_KEYS.main.pieces, piecesInput.value);
                if (timeInput) localStorage.setItem(STORAGE_KEYS.main.timeInput, timeInput.value);
                if (orderNoteInput) localStorage.setItem(STORAGE_KEYS.main.note, orderNoteInput.value);
            } catch (_) {
                // ignoruj błędy storage
            }
        }

        function restoreMainFormInputs() {
            try {
                const savedTon = localStorage.getItem(STORAGE_KEYS.main.tonnage);
                const savedLen = localStorage.getItem(STORAGE_KEYS.main.length);
                const savedPcs = localStorage.getItem(STORAGE_KEYS.main.pieces);
                const savedTime = localStorage.getItem(STORAGE_KEYS.main.timeInput);
                const savedNote = localStorage.getItem(STORAGE_KEYS.main.note);

                if (savedTon && tonnageInput) tonnageInput.value = savedTon;
                if (savedLen !== null && lengthInput) lengthInput.value = savedLen;
                if (savedPcs !== null && piecesInput) piecesInput.value = savedPcs;
                if (savedTime !== null && timeInput) timeInput.value = savedTime;
                if (savedNote !== null && orderNoteInput) orderNoteInput.value = savedNote;
            } catch (_) {
                // ignoruj błędy storage
            }

            Calculator.calculateValues(true);
            updateMainTimeHelper();
        }

        function clearMainFormInputs() {
            Object.values(STORAGE_KEYS.main).forEach((key) => {
                try {
                    localStorage.removeItem(key);
                } catch (_) {
                    // ignoruj
                }
            });
            if (tonnageInput) tonnageInput.value = '1.0';
            if (lengthInput) lengthInput.value = '';
            if (piecesInput) piecesInput.value = '';
            if (timeInput) timeInput.value = '';
            if (orderNoteInput) orderNoteInput.value = '';
            Calculator.resetCalculatedOutputs();
            if (calcResults) calcResults.style.display = 'none';
            if (mainOrderForm) UI.resetValidationState(mainOrderForm);
            updateMainTimeHelper();
        }

        function syncActiveOrderSummary() {
            if (!activeOrderSummary) return;
            const tVal = tonnageInput ? tonnageInput.value : '1.0';
            const L1 = UI.parseDecimal(lengthInput ? lengthInput.value : '');
            const pieces = parseInt(piecesInput ? piecesInput.value : '', 10);
            const metrics = Calculator.computeOrderMetrics(tVal, L1, pieces);

            if (summaryTon) summaryTon.textContent = `${tVal} t`;
            if (summaryL1) summaryL1.textContent = metrics ? `${metrics.L1} m` : '-';
            if (summaryPieces) summaryPieces.textContent = metrics ? `${metrics.pieces} szt` : '-';
            if (summaryCounter) summaryCounter.textContent = metrics ? String(metrics.counter) : '-';

            const note = (orderNoteInput ? orderNoteInput.value : '').trim();
            if (summaryNote && summaryNoteWrap) {
                if (note) {
                    summaryNote.textContent = note;
                    summaryNoteWrap.hidden = false;
                } else {
                    summaryNote.textContent = '';
                    summaryNoteWrap.hidden = true;
                }
            }
            activeOrderSummary.hidden = false;
        }

        function hideActiveOrderSummary() {
            if (activeOrderSummary) activeOrderSummary.hidden = true;
            if (summaryNoteWrap) summaryNoteWrap.hidden = true;
        }

        function syncSimpleActiveNoteBar() {
            if (!simpleActiveNoteBar || !simpleSummaryNote) return;
            const note = (simpleNoteInput ? simpleNoteInput.value : '').trim();
            if (note) {
                simpleSummaryNote.textContent = note;
                simpleActiveNoteBar.hidden = false;
            } else {
                simpleSummaryNote.textContent = '';
                simpleActiveNoteBar.hidden = true;
            }
        }

        function hideSimpleActiveNoteBar() {
            if (simpleActiveNoteBar) simpleActiveNoteBar.hidden = true;
        }

        document.querySelectorAll('[data-time-unit-toggle]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const prevUnit = currentTimeUnit;
                const nextUnit = prevUnit === 'hours' ? 'minutes' : 'hours';

                convertInputBetweenUnits(timeInput, prevUnit, nextUnit);
                convertInputBetweenUnits(simpleTimeInput, prevUnit, nextUnit);

                currentTimeUnit = nextUnit;
                try {
                    localStorage.setItem(STORAGE_KEYS.timeUnit, nextUnit);
                } catch (_) {
                    // ignoruj
                }
                saveMainFormInputs();
                syncTimeUnitUI();
                if (timeInput) UI.syncFieldAria(timeInput);
                if (simpleTimeInput) UI.syncFieldAria(simpleTimeInput);
            });
        });

        if (tonnageInput) {
            tonnageInput.addEventListener('change', () => {
                Calculator.calculateValues();
                saveMainFormInputs();
            });
        }
        if (lengthInput) {
            lengthInput.addEventListener('input', () => {
                Calculator.calculateValues();
                saveMainFormInputs();
            });
        }
        if (piecesInput) {
            piecesInput.addEventListener('input', () => {
                Calculator.calculateValues();
                saveMainFormInputs();
            });
        }
        if (timeInput) {
            timeInput.addEventListener('input', () => {
                updateMainTimeHelper();
                saveMainFormInputs();
            });
        }
        if (orderNoteInput) {
            orderNoteInput.addEventListener('input', () => saveMainFormInputs());
        }

        if (simpleNoteInput) {
            simpleNoteInput.addEventListener('input', () => {
                try {
                    localStorage.setItem(STORAGE_KEYS.simple.note, simpleNoteInput.value);
                } catch (_) {
                    // ignoruj
                }
            });
        }

        // Instancja Głównego Timera
        const mainTimer = Timer.createProductionTimer({
            id: 'main',
            storageKeys: STORAGE_KEYS.main,
            includeEndSeconds: true,
            updateBodyBackground: true,
            updatePageTitle: true,
            notificationTitle: 'Czas dobiegł końca!',
            notificationBody: 'Czas normatywny zlecenia minął. Timer liczy czas przekroczenia.',
            elements: {
                clockDisplay: document.getElementById('clockDisplay'),
                efficiencyDisplay: document.getElementById('efficiencyDisplay'),
                startTimeDisplay: document.getElementById('startTimeDisplay'),
                endTimeDisplay: document.getElementById('endTimeDisplay'),
                statusMessage,
                progressCircle: document.getElementById('mainProgressRingCircle'),
                startBtn,
                stopBtn,
                stopAlarmBtn,
                adjustControls: document.getElementById('timerAdjustControls'),
                hideOnRun: [cardForm]
            },
            onBeforeSaveState: saveMainFormInputs,
            onRestoreExtra: restoreMainFormInputs,
            onRunningUISync: syncActiveOrderSummary,
            onIdleUISync: hideActiveOrderSummary,
            onStopSave: ({ startTimeDate, totalMs, elapsedMs }) => {
                const tVal = tonnageInput ? tonnageInput.value : '1.0';
                const L1 = UI.parseDecimal(lengthInput ? lengthInput.value : '') || 1.0;
                const pieces = parseInt(piecesInput ? piecesInput.value : '1', 10) || 1;
                const note = (orderNoteInput ? orderNoteInput.value : '').trim().slice(0, 120);

                const declaredMins = parseFloat((totalMs / 60000).toFixed(1));
                const actualMins = parseFloat((elapsedMs / 60000).toFixed(1));
                const finalPercentage = elapsedMs > 0 ? (totalMs / elapsedMs) * 100 : 0;

                const metrics = Calculator.computeOrderMetrics(tVal, L1, pieces);
                if (!metrics) return;

                const nowDate = new Date();
                Storage.saveEntry({
                    id: Date.now(),
                    type: 'order',
                    dayStr: nowDate.toLocaleDateString('pl-PL'),
                    timeStr: UI.formatClockHM(nowDate.getTime()),
                    startTimeStr: UI.formatClockHM(startTimeDate),
                    percentage: `${finalPercentage.toFixed(0)}%`,
                    ton: tVal,
                    l1: metrics.L1,
                    pieces: metrics.pieces,
                    time: declaredMins,
                    actualTime: actualMins,
                    weight: parseFloat(metrics.totalWeight.toFixed(2)),
                    note
                });

                clearMainFormInputs();
                UI.showToast('Zlecenie zakończone i zapisane.', 'success');
            }
        });

        // Instancja Prostego Timera
        const simpleTimer = Timer.createProductionTimer({
            id: 'simple',
            storageKeys: STORAGE_KEYS.simple,
            includeEndSeconds: false,
            updateBodyBackground: false,
            updatePageTitle: () => !mainTimer.isRunning(),
            notificationTitle: 'Prosty Timer: Czas minął!',
            notificationBody: 'Czas normatywny minął. Stoper kontynuuje zliczanie nadgodzin.',
            elements: {
                clockDisplay: document.getElementById('simpleClockDisplay'),
                efficiencyDisplay: document.getElementById('simpleEfficiencyDisplay'),
                startTimeDisplay: document.getElementById('simpleStartTimeDisplay'),
                endTimeDisplay: document.getElementById('simpleEndTimeDisplay'),
                statusMessage: document.getElementById('simpleStatusMessage'),
                progressCircle: document.getElementById('simpleProgressRingCircle'),
                startBtn: simpleStartBtn,
                stopBtn: simpleStopBtn,
                stopAlarmBtn: simpleStopAlarmBtn,
                adjustControls: document.getElementById('simpleTimerAdjustControls'),
                hideOnRun: [simplePresetsBox, simpleFormBox]
            },
            onRestoreExtra: () => {
                try {
                    const savedSimpleNote = localStorage.getItem(STORAGE_KEYS.simple.note);
                    if (savedSimpleNote !== null && simpleNoteInput) {
                        simpleNoteInput.value = savedSimpleNote;
                    }
                } catch (_) {
                    // ignoruj
                }
            },
            onRunningUISync: syncSimpleActiveNoteBar,
            onIdleUISync: hideSimpleActiveNoteBar,
            onStopSave: ({ startTimeDate, totalMs, elapsedMs }) => {
                const declaredMins = parseFloat((totalMs / 60000).toFixed(1));
                const actualMins = parseFloat((elapsedMs / 60000).toFixed(1));
                const finalPercentage = elapsedMs > 0 ? (totalMs / elapsedMs) * 100 : 0;
                const note = (simpleNoteInput ? simpleNoteInput.value : '').trim().slice(0, 120);

                const nowDate = new Date();
                Storage.saveEntry({
                    id: Date.now(),
                    type: 'simple',
                    dayStr: nowDate.toLocaleDateString('pl-PL'),
                    timeStr: UI.formatClockHM(nowDate.getTime()),
                    startTimeStr: UI.formatClockHM(startTimeDate),
                    percentage: `${finalPercentage.toFixed(0)}%`,
                    ton: 'Prosty',
                    l1: '-',
                    pieces: '-',
                    time: declaredMins,
                    actualTime: actualMins,
                    weight: '-',
                    note
                });

                if (simpleNoteInput) simpleNoteInput.value = '';
                try {
                    localStorage.removeItem(STORAGE_KEYS.simple.note);
                } catch (_) {
                    // ignoruj
                }
                if (simpleFormBox) UI.resetValidationState(simpleFormBox);

                UI.showToast('Zapisano dane Prostego Timera.', 'success');
            }
        });

        // Obsługa przycisków Głównego Timera
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (!UI.validateFields([lengthInput, piecesInput, timeInput])) {
                    return;
                }
                const mins = parseInputMinutes(timeInput);
                if (!Number.isFinite(mins) || mins <= 0) {
                    UI.focusAndSelect(timeInput);
                    return;
                }
                Calculator.calculateValues();
                mainTimer.start(Math.round(mins * 60 * 1000));
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => mainTimer.stop(true));
        }

        if (stopAlarmBtn) {
            stopAlarmBtn.addEventListener('click', () => Audio.stopAlarm());
        }

        // Obsługa Prostego Timera i presetów
        if (simpleTimeInput) {
            simpleTimeInput.addEventListener('input', () => {
                updateSimpleTimeHelper();
                syncSimplePresetHighlights();
            });
            UI.addEnterNavListener(simpleTimeInput, () => {
                if (simpleStartBtn && simpleStartBtn.style.display !== 'none') {
                    simpleStartBtn.click();
                    if (simpleTimer.isRunning()) simpleTimeInput.blur();
                }
            });
        }

        if (simpleNoteInput) {
            UI.addEnterNavListener(simpleNoteInput, () => {
                if (simpleStartBtn && simpleStartBtn.style.display !== 'none') {
                    simpleStartBtn.click();
                    if (simpleTimer.isRunning()) simpleNoteInput.blur();
                }
            });
        }

        document.querySelectorAll('[data-preset-hours]').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (!simpleTimeInput) return;
                simpleTimeInput.value =
                    currentTimeUnit === 'minutes' ? btn.dataset.presetMinutes : btn.dataset.presetHours;
                updateSimpleTimeHelper();
                syncSimplePresetHighlights();
                UI.syncFieldAria(simpleTimeInput);
            });
        });

        if (simpleStartBtn) {
            simpleStartBtn.addEventListener('click', () => {
                if (!UI.validateFields([simpleTimeInput])) {
                    return;
                }
                const mins = parseInputMinutes(simpleTimeInput);
                if (!Number.isFinite(mins) || mins <= 0) {
                    UI.focusAndSelect(simpleTimeInput);
                    return;
                }
                simpleTimer.start(Math.round(mins * 60 * 1000));
            });
        }

        if (simpleStopBtn) {
            simpleStopBtn.addEventListener('click', () => simpleTimer.stop(true));
        }

        if (simpleStopAlarmBtn) {
            simpleStopAlarmBtn.addEventListener('click', () => Audio.stopAlarm());
        }

        // Korekty czasu w trakcie odliczania
        document.querySelectorAll('[data-adjust-timer]').forEach((btn) => {
            btn.addEventListener('click', () => mainTimer.adjustMinutes(Number(btn.dataset.adjustTimer)));
        });
        document.querySelectorAll('[data-adjust-simple]').forEach((btn) => {
            btn.addEventListener('click', () => simpleTimer.adjustMinutes(Number(btn.dataset.adjustSimple)));
        });

        // Nawigacja klawiszem Enter w formularzu głównym
        UI.addEnterNavListener(tonnageInput, () => UI.focusAndSelect(lengthInput));
        UI.addEnterNavListener(lengthInput, () => UI.focusAndSelect(piecesInput));
        UI.addEnterNavListener(piecesInput, () => UI.focusAndSelect(timeInput));
        UI.addEnterNavListener(timeInput, () => {
            if (startBtn && startBtn.style.display !== 'none') {
                startBtn.click();
                if (mainTimer.isRunning()) timeInput.blur();
            }
        });
        UI.addEnterNavListener(orderNoteInput, () => {
            if (startBtn && startBtn.style.display !== 'none') {
                startBtn.click();
                if (mainTimer.isRunning()) orderNoteInput.blur();
            }
        });

        // ==================================================================
        // SKRÓTY KLAWISZOWE NA DESKTOPIE (Ctrl+Enter, Spacja, Escape)
        // ==================================================================
        let shortcutConfirmPending = false;

        async function triggerTimerShortcut(timerInstance, startButtonEl) {
            if (!timerInstance.isRunning()) {
                if (startButtonEl && startButtonEl.style.display !== 'none') {
                    startButtonEl.click();
                }
                return;
            }
            shortcutConfirmPending = true;
            try {
                const confirmed = await UI.confirmAction(
                    'Zakończ odliczanie',
                    'Czy na pewno chcesz zakończyć aktywne odliczanie i zapisać wynik w historii?',
                    { confirmLabel: 'Zakończ i zapisz', confirmClass: 'btn-danger' }
                );
                if (confirmed && timerInstance.isRunning()) {
                    timerInstance.stop(true);
                }
            } finally {
                shortcutConfirmPending = false;
            }
        }

        document.addEventListener('keydown', (e) => {
            if (e.isComposing || e.keyCode === 229) return;
            if (document.querySelector('dialog[open]') || shortcutConfirmPending) return;

            if (e.key === 'Escape') {
                const alarmVisible =
                    (stopAlarmBtn && stopAlarmBtn.style.display !== 'none') ||
                    (simpleStopAlarmBtn && simpleStopAlarmBtn.style.display !== 'none');
                if (alarmVisible) {
                    Audio.stopAlarm();
                    UI.showToast('Wyłączono alarm dźwiękowy.', 'info');
                }
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (activeTabId === 'calc') {
                    e.preventDefault();
                    triggerTimerShortcut(mainTimer, startBtn);
                } else if (activeTabId === 'simple-timer') {
                    e.preventDefault();
                    triggerTimerShortcut(simpleTimer, simpleStartBtn);
                }
                return;
            }

            if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                const target = e.target;
                if (
                    target instanceof Element &&
                    target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="tab"]')
                ) {
                    return;
                }
                if (activeTabId === 'calc') {
                    e.preventDefault();
                    triggerTimerShortcut(mainTimer, startBtn);
                } else if (activeTabId === 'simple-timer') {
                    e.preventDefault();
                    triggerTimerShortcut(simpleTimer, simpleStartBtn);
                }
            }
        });

        // Nawigacja Enter i obsługa modala edycji
        const editTon = document.getElementById('edit-ton');
        const editL1 = document.getElementById('edit-l1');
        const editPieces = document.getElementById('edit-pieces');
        const editTime = document.getElementById('edit-time');
        const editActualTime = document.getElementById('edit-actual-time');
        const editNote = document.getElementById('edit-note');
        const editFormEl = document.getElementById('edit-form');

        UI.addEnterNavListener(editTon, () => UI.focusAndSelect(editL1));
        UI.addEnterNavListener(editL1, () => UI.focusAndSelect(editPieces));
        UI.addEnterNavListener(editPieces, () => UI.focusAndSelect(editTime));
        UI.addEnterNavListener(editTime, () => UI.focusAndSelect(editActualTime));
        UI.addEnterNavListener(editActualTime, () => UI.focusAndSelect(editNote));
        UI.addEnterNavListener(editNote, () => History.saveEdit());

        document.getElementById('btnCloseEditModal')?.addEventListener('click', () => History.closeEdit());
        document.getElementById('btnCancelEdit')?.addEventListener('click', () => History.closeEdit());
        if (editFormEl) {
            editFormEl.addEventListener('submit', (e) => {
                e.preventDefault();
                History.saveEdit();
            });
        }

        // Kontrolki historii, wyszukiwania i eksportu/importu
        const historyFilter = document.getElementById('historyFilter');
        const historySearch = document.getElementById('historySearch');
        const debouncedRenderHistory = UI.debounce(() => History.renderHistory(), 150);

        if (historyFilter) {
            historyFilter.addEventListener('change', () => History.renderHistory());
        }
        if (historySearch) {
            historySearch.addEventListener('input', debouncedRenderHistory);
        }

        document.getElementById('btnClearHistory')?.addEventListener('click', () => History.clearHistory());
        document.getElementById('btnPrintReport')?.addEventListener('click', () => History.printReport());
        document.getElementById('btnExportCSV')?.addEventListener('click', () => History.exportCSV());
        document.getElementById('btnExportJSON')?.addEventListener('click', () => History.exportJSON());

        const btnImportJSON = document.getElementById('btnImportJSON');
        const importFile = document.getElementById('importFile');
        if (btnImportJSON && importFile) {
            btnImportJSON.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    History.importJSONFile(file);
                }
                importFile.value = '';
            });
        }

        // Start aplikacji
        UI.initDialogFallbacks();
        UI.initFormValidation();
        Storage.init(() => History.renderHistory());
        mainTimer.restore();
        simpleTimer.restore();
        syncTimeUnitUI();
    });
})(window);
