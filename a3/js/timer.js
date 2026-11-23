/**
 * Wspólny silnik odliczania czasu v3 (dla Głównego Timera oraz Prostego Timera).
 * Obsługuje: pauzę / postój technologiczny z powodami, czas pracy netto,
 * bezpieczne anulowanie bez zapisu oraz pełne odtwarzanie po odświeżeniu.
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
            onCancelCleanup = null,
            onRestoreExtra = null,
            onRunningUISync = null,
            onIdleUISync = null,
            onTick = null
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
            pauseBtn,
            resumeBtn,
            cancelBtn,
            stopAlarmBtn,
            adjustControls,
            pauseBanner,
            pauseReasonText,
            pauseTimerText,
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
        let paused = false;
        let pauseStart = 0;
        let pauseReasonId = '';
        let pauseReasonLabel = '';
        let downtimeTotalMs = 0;
        let downtimes = [];
        let intervalId = null;
        let overtimeAlertFired = false;
        let lastAnnouncedSec = null;

        function isRunning() {
            return targetTime > 0 && startTimeDate > 0;
        }

        function isPaused() {
            return isRunning() && paused;
        }

        function getCurrentDowntimeMs(now = Date.now()) {
            const activePauseMs = paused && pauseStart > 0 ? Math.max(0, now - pauseStart) : 0;
            return downtimeTotalMs + activePauseMs;
        }

        function getNetElapsedMs(now = Date.now()) {
            if (startTimeDate <= 0) return 0;
            const gross = Math.max(0, now - startTimeDate);
            return Math.max(0, gross - getCurrentDowntimeMs(now));
        }

        function getRemainingSec() {
            if (!targetTime) return 0;
            const refNow = paused && pauseStart > 0 ? pauseStart : Date.now();
            return Math.round((targetTime - refNow) / 1000);
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
                    if (storageKeys.paused) localStorage.setItem(storageKeys.paused, String(paused));
                    if (storageKeys.pauseStart) localStorage.setItem(storageKeys.pauseStart, String(pauseStart));
                    if (storageKeys.pauseReasonId) localStorage.setItem(storageKeys.pauseReasonId, pauseReasonId);
                    if (storageKeys.pauseReasonLabel) localStorage.setItem(storageKeys.pauseReasonLabel, pauseReasonLabel);
                    if (storageKeys.downtimeTotalMs) localStorage.setItem(storageKeys.downtimeTotalMs, String(downtimeTotalMs));
                    if (storageKeys.downtimes) localStorage.setItem(storageKeys.downtimes, JSON.stringify(downtimes));
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
                storageKeys.paused,
                storageKeys.pauseStart,
                storageKeys.pauseReasonId,
                storageKeys.pauseReasonLabel,
                storageKeys.downtimeTotalMs,
                storageKeys.downtimes
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
            if (paused) {
                const ratio = Math.max(0, Math.min(1, diffSec / (originalTotalMs / 1000)));
                progressCircle.style.strokeDashoffset = circumference - ratio * circumference;
                progressCircle.style.stroke = 'var(--amber)';
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
            const elapsedSec = getNetElapsedMs(now) / 1000;
            if (elapsedSec > 0) {
                const eff = ((originalTotalMs / 1000) / elapsedSec) * 100;
                const dtMin = getCurrentDowntimeMs(now) / 60000;
                const dtSuffix = dtMin >= 0.1 ? ` • Postój ${dtMin.toFixed(1)}m` : '';
                efficiencyDisplay.textContent = `Wydajność: ${eff.toFixed(0)}%${dtSuffix}`;
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

        function syncPauseUI() {
            if (pauseBtn) pauseBtn.style.display = isRunning() && !paused ? 'inline-flex' : 'none';
            if (resumeBtn) resumeBtn.style.display = isRunning() && paused ? 'inline-flex' : 'none';
            if (pauseBanner) {
                pauseBanner.hidden = !paused;
            }
            if (pauseReasonText) {
                pauseReasonText.textContent = pauseReasonLabel || 'Postój technologiczny';
            }
            if (endTimeDisplay && isRunning()) {
                if (paused) {
                    endTimeDisplay.textContent = 'WSTRZYMANO (POSTÓJ)';
                } else {
                    endTimeDisplay.textContent = formatEndTimeText(targetTime, includeEndSeconds);
                }
            }
        }

        function canControlTitle() {
            return typeof updatePageTitle === 'function' ? updatePageTitle() : Boolean(updatePageTitle);
        }

        function tick() {
            if (!isRunning()) return;

            const now = Date.now();
            if (paused) {
                const diffSec = getRemainingSec();
                const pauseSec = pauseStart > 0 ? Math.max(0, Math.floor((now - pauseStart) / 1000)) : 0;
                if (pauseTimerText) {
                    pauseTimerText.textContent = formatClockTime(pauseSec);
                }
                if (clockDisplay) {
                    if (diffSec >= 0) {
                        clockDisplay.textContent = formatClockTime(diffSec);
                    } else {
                        const minusSpan = document.createElement('span');
                        minusSpan.className = 'overtime-minus';
                        minusSpan.textContent = '-';
                        clockDisplay.replaceChildren(minusSpan, document.createTextNode(formatClockTime(Math.abs(diffSec))));
                    }
                }
                if (canControlTitle()) {
                    updateDocumentTitle(`⏸ ${formatClockTime(pauseSec)}`);
                }
                if (updateBodyBackground) clearBodyAlertClasses();
                updateRing(diffSec);
                updateEfficiency(now);
                return;
            }

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

                if (!overtimeAlertFired) {
                    overtimeAlertFired = true;
                    Audio.startAlarm(getRemainingSec, stopAlarmBtn);
                    Audio.sendNotification(notificationTitle, notificationBody);
                }
            }

            updateEfficiency(now);

            if (typeof onTick === 'function') {
                onTick({
                    netElapsedMs: getNetElapsedMs(now),
                    originalTotalMs,
                    remainingSec: diffSec
                });
            }
        }

        function applyRunningUI() {
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
            syncPauseUI();
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
            if (pauseBtn) pauseBtn.style.display = 'none';
            if (resumeBtn) resumeBtn.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'none';
            if (pauseBanner) pauseBanner.hidden = true;
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
            paused = false;
            pauseStart = 0;
            pauseReasonId = '';
            pauseReasonLabel = '';
            downtimeTotalMs = 0;
            downtimes = [];
            overtimeAlertFired = false;
            lastAnnouncedSec = null;

            persistState();
            applyRunningUI();

            if (intervalId) clearInterval(intervalId);
            tick();
            intervalId = setInterval(tick, 1000);
            return true;
        }

        function pause(reasonId = 'break', reasonLabel = 'Postój technologiczny') {
            if (!isRunning() || paused) return false;
            Audio.stopAlarm();
            Audio.playBeep('pause');
            paused = true;
            pauseStart = Date.now();
            pauseReasonId = reasonId;
            pauseReasonLabel = reasonLabel;
            persistState();
            syncPauseUI();
            tick();
            showToast(`Wstrzymano odliczanie: ${reasonLabel}`, 'warning');
            return true;
        }

        function resume() {
            if (!isRunning() || !paused) return false;
            const now = Date.now();
            const deltaMs = pauseStart > 0 ? Math.max(0, now - pauseStart) : 0;
            targetTime += deltaMs;
            downtimeTotalMs += deltaMs;
            if (deltaMs >= 1000) {
                downtimes.push({
                    reasonId: pauseReasonId || 'break',
                    reasonLabel: pauseReasonLabel || 'Postój',
                    durationMin: Number((deltaMs / 60000).toFixed(1))
                });
            }
            paused = false;
            pauseStart = 0;
            pauseReasonId = '';
            pauseReasonLabel = '';
            persistState();
            syncPauseUI();
            tick();
            showToast('Wznowiono odliczanie czasu netto.', 'success');
            return true;
        }

        function finalizeActivePauseIfNeeded(now) {
            if (!paused || pauseStart <= 0) return;
            const deltaMs = Math.max(0, now - pauseStart);
            downtimeTotalMs += deltaMs;
            if (deltaMs >= 1000) {
                downtimes.push({
                    reasonId: pauseReasonId || 'break',
                    reasonLabel: pauseReasonLabel || 'Postój',
                    durationMin: Number((deltaMs / 60000).toFixed(1))
                });
            }
            paused = false;
            pauseStart = 0;
        }

        function stop(shouldSave = true) {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            Audio.stopAlarm();

            const now = Date.now();
            finalizeActivePauseIfNeeded(now);

            const finishedStart = startTimeDate;
            const finishedTotalMs = originalTotalMs;
            const finishedDowntimeMs = downtimeTotalMs;
            const finishedDowntimes = [...downtimes];
            const finishedGrossMs = finishedStart > 0 ? Math.max(0, now - finishedStart) : 0;
            const finishedNetMs = Math.max(0, finishedGrossMs - finishedDowntimeMs);

            if (shouldSave && typeof onStopSave === 'function' && finishedStart > 0) {
                onStopSave({
                    startTimeDate: finishedStart,
                    totalMs: finishedTotalMs,
                    elapsedMs: finishedNetMs,
                    grossElapsedMs: finishedGrossMs,
                    downtimeMs: finishedDowntimeMs,
                    downtimes: finishedDowntimes
                });
            } else if (!shouldSave && typeof onCancelCleanup === 'function') {
                onCancelCleanup();
            }

            targetTime = 0;
            startTimeDate = 0;
            originalTotalMs = 0;
            paused = false;
            pauseStart = 0;
            pauseReasonId = '';
            pauseReasonLabel = '';
            downtimeTotalMs = 0;
            downtimes = [];
            overtimeAlertFired = false;
            lastAnnouncedSec = null;
            clearPersistedRunState();
            applyIdleUI(shouldSave ? 'Zakończono i Zapisano.' : 'Anulowano odliczanie (bez zapisu).');
        }

        function cancel() {
            stop(false);
        }

        function adjustMinutes(mins) {
            if (!isRunning()) return;
            const msToAdd = mins * 60 * 1000;

            targetTime += msToAdd;
            originalTotalMs = Math.max(60000, originalTotalMs + msToAdd);
            if (targetTime < startTimeDate + 1000) {
                targetTime = startTimeDate + 1000;
            }

            if (!paused && targetTime >= Date.now()) {
                overtimeAlertFired = false;
                Audio.stopAlarm();
                if (statusMessage && statusMessage.querySelector('.badge-overtime')) {
                    statusMessage.textContent = '';
                }
            }

            syncPauseUI();
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
            paused = storageKeys.paused ? localStorage.getItem(storageKeys.paused) === 'true' : false;
            pauseStart = storageKeys.pauseStart ? parseInt(localStorage.getItem(storageKeys.pauseStart), 10) || 0 : 0;
            pauseReasonId = storageKeys.pauseReasonId ? localStorage.getItem(storageKeys.pauseReasonId) || '' : '';
            pauseReasonLabel = storageKeys.pauseReasonLabel ? localStorage.getItem(storageKeys.pauseReasonLabel) || '' : '';
            downtimeTotalMs = storageKeys.downtimeTotalMs ? parseInt(localStorage.getItem(storageKeys.downtimeTotalMs), 10) || 0 : 0;
            try {
                const rawDt = storageKeys.downtimes ? localStorage.getItem(storageKeys.downtimes) : '[]';
                const parsedDt = JSON.parse(rawDt || '[]');
                downtimes = Array.isArray(parsedDt) ? parsedDt : [];
            } catch (_) {
                downtimes = [];
            }
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
            cancel,
            pause,
            resume,
            adjustMinutes,
            restore,
            isRunning,
            isPaused,
            getRemainingSec,
            getNetElapsedMs,
            getDowntimeMs: () => getCurrentDowntimeMs()
        };
    }

    RutaApp.Timer = {
        createProductionTimer
    };
})(window);
