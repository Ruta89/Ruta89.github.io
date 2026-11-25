/**
 * Wspólny silnik odliczania czasu (dla Głównego Timera oraz Prostego Timera).
 * Obsługuje odliczanie z pierścieniem SVG, progowe sygnały ostrzegawcze (odporne na uśpienie karty),
 * nadgodziny, trwałe potwierdzenie wyłączenia alarmu, korekty czasu (±1m, ±5m) oraz anulowanie bez zapisu.
 */
(function (global) {
    'use strict';

    const RutaApp = (global.RutaApp = global.RutaApp || {});
    const { formatClockTime, formatClockHM, formatEndTimeText, showToast, updateDocumentTitle } = RutaApp.UI;
    const Audio = RutaApp.Audio;

    const WARNING_MARKS = [
        { sec: 120, beep: '2min' },
        { sec: 60, beep: '1min' },
        { sec: 30, beep: '30sec' }
    ];

    const activeBackgroundRemaining = new Map();

    function syncBodyAlertBackground() {
        document.body.classList.remove('bg-yellow', 'bg-red');
        if (activeBackgroundRemaining.size === 0) return;

        const minRemaining = Math.min(...activeBackgroundRemaining.values());
        if (minRemaining < 60) {
            document.body.classList.add('bg-red');
        } else if (minRemaining < 180) {
            document.body.classList.add('bg-yellow');
        }
    }

    function createProductionTimer(options) {
        const {
            id,
            storageKeys,
            elements,
            includeEndSeconds = true,
            updateBodyBackground = false,
            updatePageTitle = true,
            notificationTitle = 'Czas dobiegł końca!',
            notificationBody = 'Czas normatywny zlecenia minął. Timer liczy czas przekroczenia.',
            onBeforeSaveState = null,
            onStopSave = null,
            onCancelCleanup = null,
            onRestoreExtra = null,
            onRunningUISync = null,
            onIdleUISync = null,
            onTick = null
        } = options;

        const {
            clockDisplay,
            clockLabel = null,
            efficiencyDisplay,
            startTimeDisplay,
            endTimeDisplay,
            statusMessage,
            progressCircle,
            startBtn,
            stopBtn,
            cancelBtn,
            stopAlarmBtn,
            adjustControls,
            tabBadgeEl = null,
            runningClassTarget = null,
            hideOnRun = []
        } = elements;

        const circumference = progressCircle ? progressCircle.r.baseVal.value * 2 * Math.PI : 753.982;
        if (progressCircle) {
            progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
            progressCircle.style.strokeDashoffset = 0;
        }

        let targetTime = 0;
        let startTimeDate = 0;
        let originalTotalMs = 0;
        let intervalId = null;
        let overtimeAlertFired = false;
        let alarmAcknowledged = false;
        const warningsPlayed = new Set();

        function isRunning() {
            return targetTime > 0 && startTimeDate > 0;
        }

        function getRemainingSec() {
            if (!targetTime) return 0;
            return Math.round((targetTime - Date.now()) / 1000);
        }

        function getElapsedSec() {
            if (!startTimeDate) return 0;
            return Math.max(0, Math.round((Date.now() - startTimeDate) / 1000));
        }

        function formatCompactRemaining(diffSec) {
            const abs = Math.abs(Math.round(diffSec));
            const sign = diffSec < 0 ? '-' : '';
            const h = Math.floor(abs / 3600);
            const m = Math.floor((abs % 3600) / 60);
            const s = abs % 60;
            if (h > 0) {
                return `${sign}${h}:${String(m).padStart(2, '0')}`;
            }
            return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }

        function setAlarmAck(val) {
            alarmAcknowledged = Boolean(val);
            if (!storageKeys.alarmAck) return;
            try {
                if (alarmAcknowledged) localStorage.setItem(storageKeys.alarmAck, 'true');
                else localStorage.removeItem(storageKeys.alarmAck);
            } catch (_) {
                // ignoruj
            }
        }

        function primeWarningsForRemaining(remainingSec) {
            warningsPlayed.clear();
            WARNING_MARKS.forEach((mark) => {
                if (remainingSec <= mark.sec) {
                    warningsPlayed.add(mark.sec);
                }
            });
        }

        function checkWarningBeeps(remainingSec) {
            for (const mark of WARNING_MARKS) {
                if (remainingSec <= mark.sec && !warningsPlayed.has(mark.sec)) {
                    WARNING_MARKS.forEach((m) => {
                        if (m.sec >= mark.sec) warningsPlayed.add(m.sec);
                    });
                    if (remainingSec > mark.sec - 5) {
                        Audio.playBeep(mark.beep);
                    }
                    break;
                }
            }
        }

        function persistState() {
            if (typeof onBeforeSaveState === 'function') {
                onBeforeSaveState();
            }
            if (targetTime > 0) {
                try {
                    localStorage.setItem(storageKeys.running, 'true');
                    localStorage.setItem(storageKeys.targetTime, String(targetTime));
                    localStorage.setItem(storageKeys.startTimeDate, String(startTimeDate));
                    if (storageKeys.originalTotalMs) {
                        localStorage.setItem(storageKeys.originalTotalMs, String(originalTotalMs));
                    }
                    if (storageKeys.totalTime) {
                        localStorage.setItem(storageKeys.totalTime, String(Math.round(originalTotalMs / 1000)));
                    }
                } catch (_) {
                    // ignoruj
                }
            } else {
                clearPersistedRunState();
            }
        }

        function clearPersistedRunState() {
            [
                storageKeys.running,
                storageKeys.targetTime,
                storageKeys.startTimeDate,
                storageKeys.originalTotalMs,
                storageKeys.totalTime,
                storageKeys.alarmAck
            ].forEach((k) => {
                if (!k) return;
                try {
                    localStorage.removeItem(k);
                } catch (_) {
                    // ignoruj
                }
            });
        }

        function updateRing(diffSec) {
            if (!progressCircle) return;
            if (originalTotalMs <= 0) {
                progressCircle.style.strokeDashoffset = 0;
                return;
            }
            if (diffSec >= 0) {
                const ratio = Math.min(1, diffSec / (originalTotalMs / 1000));
                const offset = circumference - ratio * circumference;
                progressCircle.style.strokeDashoffset = offset;

                if (diffSec < 60) progressCircle.style.stroke = 'var(--danger)';
                else if (diffSec < 180) progressCircle.style.stroke = 'var(--amber)';
                else progressCircle.style.stroke = 'var(--primary)';
            } else {
                progressCircle.style.strokeDashoffset = 0;
                progressCircle.style.stroke = 'var(--danger)';
            }
        }

        function updateEfficiency(now) {
            if (!efficiencyDisplay || originalTotalMs <= 0 || startTimeDate <= 0) return;
            const elapsedSec = (now - startTimeDate) / 1000;
            if (elapsedSec > 0) {
                const eff = ((originalTotalMs / 1000) / elapsedSec) * 100;
                efficiencyDisplay.textContent = `Wydajność: ${eff.toFixed(0)}%`;
                if (eff >= 100) {
                    efficiencyDisplay.className = 'efficiency-badge';
                } else if (eff >= 85) {
                    efficiencyDisplay.className = 'efficiency-badge eff-warning';
                } else {
                    efficiencyDisplay.className = 'efficiency-badge eff-danger';
                }
            } else {
                efficiencyDisplay.textContent = 'Wydajność: ---%';
                efficiencyDisplay.className = 'efficiency-badge';
            }
        }

        function canControlTitle() {
            return typeof updatePageTitle === 'function' ? updatePageTitle() : Boolean(updatePageTitle);
        }

        function tick() {
            if (!isRunning()) return;

            const now = Date.now();
            const diffSec = Math.round((targetTime - now) / 1000);

            if (updateBodyBackground) {
                activeBackgroundRemaining.set(id, diffSec);
                syncBodyAlertBackground();
            }

            if (diffSec >= 0) {
                overtimeAlertFired = false;
                const formatted = formatClockTime(diffSec);
                if (clockDisplay) clockDisplay.textContent = formatted;
                if (canControlTitle()) updateDocumentTitle(formatted);
                updateRing(diffSec);
                checkWarningBeeps(diffSec);

                if (statusMessage && statusMessage.querySelector('.badge-overtime')) {
                    statusMessage.textContent = '';
                }
            } else {
                const overtimeFormatted = formatClockTime(Math.abs(diffSec));
                if (clockDisplay) {
                    const minusSpan = document.createElement('span');
                    minusSpan.className = 'overtime-minus';
                    minusSpan.textContent = '-';
                    clockDisplay.replaceChildren(minusSpan, document.createTextNode(overtimeFormatted));
                }
                if (canControlTitle()) updateDocumentTitle(`-${overtimeFormatted}`);
                updateRing(diffSec);

                if (statusMessage && !statusMessage.querySelector('.badge-overtime')) {
                    const overtimeBadge = document.createElement('span');
                    overtimeBadge.className = 'badge-overtime pulsing-badge';
                    overtimeBadge.textContent = '⚠️ PRZEKROCZONO CZAS NORMATYWNY!';
                    statusMessage.replaceChildren(overtimeBadge);
                }

                if (!overtimeAlertFired && !alarmAcknowledged) {
                    overtimeAlertFired = true;
                    Audio.startAlarm(getRemainingSec, stopAlarmBtn);
                    Audio.sendNotification(notificationTitle, notificationBody);
                }
            }

            updateEfficiency(now);

            if (tabBadgeEl) {
                tabBadgeEl.hidden = false;
                tabBadgeEl.textContent = formatCompactRemaining(diffSec);
                tabBadgeEl.classList.toggle('overtime', diffSec < 0);
                tabBadgeEl.classList.toggle('warning', diffSec >= 0 && diffSec < 180);
            }

            if (typeof onTick === 'function') {
                onTick({
                    elapsedMs: Math.max(0, now - startTimeDate),
                    originalTotalMs,
                    remainingSec: diffSec
                });
            }
        }

        function applyRunningUI() {
            if (runningClassTarget) runningClassTarget.classList.add('timer-running');
            if (clockDisplay) clockDisplay.classList.remove('preview-mode');
            if (clockLabel) clockLabel.textContent = 'POZOSTAŁY CZAS';
            hideOnRun.forEach((el) => {
                if (el) el.style.display = 'none';
            });
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-flex';
            if (cancelBtn) cancelBtn.style.display = 'inline-flex';
            if (adjustControls) adjustControls.style.display = 'flex';
            if (startTimeDisplay) {
                startTimeDisplay.textContent = `Start: ${formatClockHM(startTimeDate)}`;
                startTimeDisplay.style.display = 'block';
            }
            if (endTimeDisplay) {
                endTimeDisplay.textContent = formatEndTimeText(targetTime, includeEndSeconds);
            }
            if (typeof onRunningUISync === 'function') {
                onRunningUISync();
            }
            Audio.acquireWakeLock(id);
        }

        function applyIdleUI(statusText = 'Zakończono i Zapisano.') {
            if (runningClassTarget) runningClassTarget.classList.remove('timer-running');
            hideOnRun.forEach((el) => {
                if (el) el.style.display = '';
            });
            if (startBtn) startBtn.style.display = 'inline-flex';
            if (stopBtn) stopBtn.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'none';
            if (adjustControls) adjustControls.style.display = 'none';
            if (stopAlarmBtn) stopAlarmBtn.style.display = 'none';
            if (startTimeDisplay) startTimeDisplay.style.display = 'none';
            if (endTimeDisplay) endTimeDisplay.textContent = 'Koniec: --:--:--';
            if (clockDisplay) {
                clockDisplay.textContent = '00:00:00';
                clockDisplay.classList.remove('preview-mode');
            }
            if (clockLabel) clockLabel.textContent = 'POZOSTAŁY CZAS';
            if (tabBadgeEl) {
                tabBadgeEl.hidden = true;
                tabBadgeEl.textContent = '';
                tabBadgeEl.classList.remove('overtime', 'warning');
            }
            if (efficiencyDisplay) {
                efficiencyDisplay.textContent = 'Wydajność: ---%';
                efficiencyDisplay.className = 'efficiency-badge';
            }
            if (statusMessage) statusMessage.textContent = statusText;
            if (progressCircle) {
                progressCircle.style.strokeDashoffset = 0;
                progressCircle.style.stroke = 'var(--primary)';
            }
            if (typeof onIdleUISync === 'function') {
                onIdleUISync();
            }
            if (updateBodyBackground) {
                activeBackgroundRemaining.delete(id);
                syncBodyAlertBackground();
            }
            if (canControlTitle()) updateDocumentTitle('');
            Audio.releaseWakeLock(id);
        }

        function start(totalMs) {
            if (!Number.isFinite(totalMs) || totalMs <= 0) return false;

            Audio.initAudio();
            Audio.requestNotificationPermission();
            Audio.stopAlarm();

            if (statusMessage) statusMessage.textContent = '';

            originalTotalMs = Math.max(1000, Math.round(totalMs));
            startTimeDate = Date.now();
            targetTime = startTimeDate + originalTotalMs;
            overtimeAlertFired = false;
            setAlarmAck(false);
            primeWarningsForRemaining(Math.round(originalTotalMs / 1000));

            persistState();
            applyRunningUI();

            if (intervalId) clearInterval(intervalId);
            tick();
            intervalId = setInterval(tick, 1000);
            return true;
        }

        function stop(shouldSave = true) {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            Audio.stopAlarm();

            const finishedStart = startTimeDate;
            const finishedTotalMs = originalTotalMs;
            const finishedElapsedMs = finishedStart > 0 ? Math.max(0, Date.now() - finishedStart) : 0;

            if (shouldSave && typeof onStopSave === 'function' && finishedStart > 0) {
                onStopSave({
                    startTimeDate: finishedStart,
                    totalMs: finishedTotalMs,
                    elapsedMs: finishedElapsedMs
                });
            } else if (!shouldSave && typeof onCancelCleanup === 'function') {
                onCancelCleanup();
            }

            targetTime = 0;
            startTimeDate = 0;
            originalTotalMs = 0;
            overtimeAlertFired = false;
            alarmAcknowledged = false;
            warningsPlayed.clear();
            clearPersistedRunState();
            applyIdleUI(shouldSave ? 'Zakończono i Zapisano.' : 'Anulowano odliczanie (bez zapisu).');
        }

        function cancel() {
            stop(false);
        }

        function acknowledgeAlarm() {
            setAlarmAck(true);
            Audio.stopAlarm();
        }

        function adjustMinutes(mins) {
            if (!isRunning()) return;
            const msToAdd = mins * 60 * 1000;

            targetTime += msToAdd;
            originalTotalMs = Math.max(60000, originalTotalMs + msToAdd);
            if (targetTime < startTimeDate + 1000) {
                targetTime = startTimeDate + 1000;
            }

            const newRemaining = Math.round((targetTime - Date.now()) / 1000);
            primeWarningsForRemaining(newRemaining);

            if (targetTime >= Date.now()) {
                overtimeAlertFired = false;
                setAlarmAck(false);
                Audio.stopAlarm();
                if (statusMessage && statusMessage.querySelector('.badge-overtime')) {
                    statusMessage.textContent = '';
                }
            }

            if (endTimeDisplay) {
                endTimeDisplay.textContent = formatEndTimeText(targetTime, includeEndSeconds);
            }

            persistState();
            tick();

            const sign = mins > 0 ? '+' : '';
            showToast(`Zmieniono czas odliczania: ${sign}${mins} min`, 'info');
        }

        function restore() {
            if (typeof onRestoreExtra === 'function') {
                onRestoreExtra();
            }
            let isSavedRunning = false;
            try {
                isSavedRunning = localStorage.getItem(storageKeys.running) === 'true';
            } catch (_) {
                isSavedRunning = false;
            }
            if (!isSavedRunning) return false;

            const savedTarget = parseInt(localStorage.getItem(storageKeys.targetTime), 10) || 0;
            const savedStart = parseInt(localStorage.getItem(storageKeys.startTimeDate), 10) || 0;
            let savedTotalMs = 0;

            if (storageKeys.originalTotalMs) {
                savedTotalMs = parseInt(localStorage.getItem(storageKeys.originalTotalMs), 10) || 0;
            }
            if (savedTotalMs <= 0 && storageKeys.totalTime) {
                const totalSec = parseInt(localStorage.getItem(storageKeys.totalTime), 10) || 0;
                savedTotalMs = totalSec * 1000;
            }
            if (savedTotalMs <= 0 && savedTarget > savedStart && savedStart > 0) {
                savedTotalMs = savedTarget - savedStart;
            }

            if (savedTarget <= 0 || savedTotalMs <= 0) {
                clearPersistedRunState();
                return false;
            }

            targetTime = savedTarget;
            originalTotalMs = savedTotalMs;
            startTimeDate = savedStart > 0 ? savedStart : savedTarget - savedTotalMs;
            overtimeAlertFired = false;
            try {
                alarmAcknowledged = Boolean(
                    storageKeys.alarmAck && localStorage.getItem(storageKeys.alarmAck) === 'true'
                );
            } catch (_) {
                alarmAcknowledged = false;
            }
            primeWarningsForRemaining(Math.round((targetTime - Date.now()) / 1000));

            applyRunningUI();
            if (intervalId) clearInterval(intervalId);
            tick();
            intervalId = setInterval(tick, 1000);
            return true;
        }

        return {
            start,
            stop,
            cancel,
            acknowledgeAlarm,
            adjustMinutes,
            restore,
            isRunning,
            getRemainingSec,
            getElapsedSec
        };
    }

    RutaApp.Timer = {
        createProductionTimer
    };
})(window);
