/**
 * Wspólny silnik odliczania czasu (dla Głównego Timera oraz Prostego Timera).
 */
(function (global) {
    'use strict';

    const RutaApp = (global.RutaApp = global.RutaApp || {});
    const { formatClockTime, formatClockHM, formatEndTimeText, showToast, updateDocumentTitle } = RutaApp.UI;
    const Audio = RutaApp.Audio;

    function clearBodyAlertClasses() {
        document.body.classList.remove('bg-yellow', 'bg-red');
    }

    function updateBodyAlertClasses(remainingSeconds) {
        clearBodyAlertClasses();
        if (remainingSeconds < 60) {
            document.body.classList.add('bg-red');
        } else if (remainingSeconds < 180) {
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
            onRestoreExtra = null,
            onRunningUISync = null,
            onIdleUISync = null
        } = options;

        const {
            clockDisplay,
            efficiencyDisplay,
            startTimeDisplay,
            endTimeDisplay,
            statusMessage,
            progressCircle,
            startBtn,
            stopBtn,
            stopAlarmBtn,
            adjustControls,
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
        let lastAnnouncedSec = null;

        function isRunning() {
            return targetTime > 0 && startTimeDate > 0;
        }

        function getRemainingSec() {
            if (!targetTime) return 0;
            return Math.round((targetTime - Date.now()) / 1000);
        }

        function persistState() {
            if (typeof onBeforeSaveState === 'function') {
                onBeforeSaveState();
            }
            if (targetTime > 0) {
                localStorage.setItem(storageKeys.running, 'true');
                localStorage.setItem(storageKeys.targetTime, String(targetTime));
                localStorage.setItem(storageKeys.startTimeDate, String(startTimeDate));
                if (storageKeys.originalTotalMs) {
                    localStorage.setItem(storageKeys.originalTotalMs, String(originalTotalMs));
                }
                if (storageKeys.totalTime) {
                    localStorage.setItem(storageKeys.totalTime, String(Math.round(originalTotalMs / 1000)));
                }
            } else {
                clearPersistedRunState();
            }
        }

        function clearPersistedRunState() {
            localStorage.removeItem(storageKeys.running);
            localStorage.removeItem(storageKeys.targetTime);
            localStorage.removeItem(storageKeys.startTimeDate);
            if (storageKeys.originalTotalMs) localStorage.removeItem(storageKeys.originalTotalMs);
            if (storageKeys.totalTime) localStorage.removeItem(storageKeys.totalTime);
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

            if (diffSec >= 0) {
                overtimeAlertFired = false;
                const formatted = formatClockTime(diffSec);
                if (clockDisplay) clockDisplay.textContent = formatted;
                if (canControlTitle()) updateDocumentTitle(formatted);
                if (updateBodyBackground) updateBodyAlertClasses(diffSec);
                updateRing(diffSec);

                if (diffSec !== lastAnnouncedSec) {
                    lastAnnouncedSec = diffSec;
                    if (diffSec === 120) Audio.playBeep('2min');
                    else if (diffSec === 60) Audio.playBeep('1min');
                    else if (diffSec === 30) Audio.playBeep('30sec');
                }

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
                if (updateBodyBackground) updateBodyAlertClasses(diffSec);
                updateRing(diffSec);

                if (statusMessage) {
                    const overtimeBadge = document.createElement('span');
                    overtimeBadge.className = 'badge-overtime pulsing-badge';
                    overtimeBadge.textContent = '⚠️ PRZEKROCZONO CZAS NORMATYWNY!';
                    statusMessage.replaceChildren(overtimeBadge);
                }

                // Uruchamiamy alarm i powiadomienie dokładnie raz po przekroczeniu czasu normatywnego
                if (!overtimeAlertFired) {
                    overtimeAlertFired = true;
                    Audio.startAlarm(getRemainingSec, stopAlarmBtn);
                    Audio.sendNotification(notificationTitle, notificationBody);
                }
            }

            updateEfficiency(now);
        }

        function applyRunningUI() {
            hideOnRun.forEach((el) => {
                if (el) el.style.display = 'none';
            });
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-flex';
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
            hideOnRun.forEach((el) => {
                if (el) el.style.display = '';
            });
            if (startBtn) startBtn.style.display = 'inline-flex';
            if (stopBtn) stopBtn.style.display = 'none';
            if (adjustControls) adjustControls.style.display = 'none';
            if (stopAlarmBtn) stopAlarmBtn.style.display = 'none';
            if (startTimeDisplay) startTimeDisplay.style.display = 'none';
            if (endTimeDisplay) endTimeDisplay.textContent = 'Koniec: --:--:--';
            if (clockDisplay) clockDisplay.textContent = '00:00:00';
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
            if (updateBodyBackground) clearBodyAlertClasses();
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
            lastAnnouncedSec = null;

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
            }

            targetTime = 0;
            startTimeDate = 0;
            originalTotalMs = 0;
            overtimeAlertFired = false;
            lastAnnouncedSec = null;
            clearPersistedRunState();
            applyIdleUI('Zakończono i Zapisano.');
        }

        function adjustMinutes(mins) {
            if (!isRunning()) return;
            const msToAdd = mins * 60 * 1000;

            targetTime += msToAdd;
            originalTotalMs = Math.max(60000, originalTotalMs + msToAdd);
            if (targetTime < startTimeDate + 1000) {
                targetTime = startTimeDate + 1000;
            }

            if (targetTime >= Date.now()) {
                overtimeAlertFired = false;
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
            if (localStorage.getItem(storageKeys.running) !== 'true') return false;

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
            lastAnnouncedSec = null;

            applyRunningUI();
            if (intervalId) clearInterval(intervalId);
            tick();
            intervalId = setInterval(tick, 1000);
            return true;
        }

        return {
            start,
            stop,
            adjustMinutes,
            restore,
            isRunning,
            getRemainingSec
        };
    }

    RutaApp.Timer = {
        createProductionTimer
    };
})(window);
