/**
 * Moduł dźwięku (Web Audio API), powiadomień systemowych oraz blokady wygaszania ekranu (Wake Lock).
 * Generuje wszystkie sygnały bezpośrednio przez oscylator (100% offline, bez zewnętrznych plików audio)
 * i odblokowuje zawieszony AudioContext przy pierwszym geście po odświeżeniu karty.
 */
(function (global) {
    'use strict';

    const RutaApp = (global.RutaApp = global.RutaApp || {});
    const { STORAGE_KEYS } = RutaApp.Config;

    const ALARM_MAX_DURATION_MS = 60000;

    let audioCtx = null;
    let alarmTimeout = null;
    let alarmStartTimestamp = 0;
    let isMuted = false;
    try {
        isMuted = localStorage.getItem(STORAGE_KEYS.isMuted) === 'true';
    } catch (_) {
        isMuted = false;
    }

    let wakeLock = null;
    let unlockListenerAttached = false;
    const activeWakeOwners = new Set();

    function attachAudioUnlockListener() {
        if (unlockListenerAttached) return;
        unlockListenerAttached = true;

        const unlock = () => {
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }
            document.removeEventListener('pointerdown', unlock, true);
            document.removeEventListener('keydown', unlock, true);
            unlockListenerAttached = false;
        };

        document.addEventListener('pointerdown', unlock, true);
        document.addEventListener('keydown', unlock, true);
    }

    function initAudio() {
        if (!audioCtx) {
            const Ctx = global.AudioContext || global.webkitAudioContext;
            if (Ctx) {
                try {
                    audioCtx = new Ctx();
                } catch (err) {
                    console.warn('Nie udało się zainicjować Web Audio API:', err);
                }
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {
                attachAudioUnlockListener();
            });
        }
    }

    function playBeep(type = 'normal') {
        if (isMuted) return;
        initAudio();
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') {
            attachAudioUnlockListener();
            return;
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const now = audioCtx.currentTime;

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === '2min') {
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
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);

            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === '30sec') {
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
        } else if (type === 'spool') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.setValueAtTime(783.99, now + 0.14);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
            gain.gain.linearRampToValueAtTime(0, now + 0.12);
            gain.gain.linearRampToValueAtTime(0.22, now + 0.17);
            gain.gain.linearRampToValueAtTime(0, now + 0.32);

            osc.start(now);
            osc.stop(now + 0.34);
        } else {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.3);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);

            osc.start(now);
            osc.stop(now + 0.4);
        }
    }

    function stopAlarm() {
        if (alarmTimeout) {
            clearTimeout(alarmTimeout);
            alarmTimeout = null;
        }
        alarmStartTimestamp = 0;

        ['stopAlarmBtn', 'simpleStopAlarmBtn'].forEach((id) => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = 'none';
        });
    }

    function scheduleNextBeep(getRemainingSec) {
        if (alarmStartTimestamp > 0 && Date.now() - alarmStartTimestamp > ALARM_MAX_DURATION_MS) {
            stopAlarm();
            return;
        }

        const remaining = typeof getRemainingSec === 'function' ? Math.max(0, getRemainingSec()) : 0;
        let delay = 1000;
        if (remaining === 0) delay = 450;
        else if (remaining <= 15) delay = 600;
        else if (remaining <= 30) delay = 800;

        playBeep('normal');
        alarmTimeout = setTimeout(() => scheduleNextBeep(getRemainingSec), delay);
    }

    function startAlarm(getRemainingSec, stopBtnEl) {
        if (isMuted) return;
        initAudio();
        if (audioCtx && audioCtx.state === 'suspended') {
            attachAudioUnlockListener();
        }
        if (stopBtnEl) {
            stopBtnEl.style.display = 'flex';
        }
        if (alarmTimeout) return;

        alarmStartTimestamp = Date.now();
        scheduleNextBeep(getRemainingSec);
    }

    function updateMuteIcon() {
        const muteBtn = document.getElementById('muteBtn');
        const iconOn = document.querySelector('.icon-sound-on');
        const iconOff = document.querySelector('.icon-sound-off');

        if (iconOn && iconOff) {
            iconOn.style.display = isMuted ? 'none' : 'inline-block';
            iconOff.style.display = isMuted ? 'inline-block' : 'none';
        }
        if (muteBtn) {
            muteBtn.setAttribute('aria-pressed', String(isMuted));
            muteBtn.setAttribute('aria-label', isMuted ? 'Włącz dźwięk alarmu' : 'Wycisz dźwięk alarmu');
        }
    }

    function toggleMute() {
        isMuted = !isMuted;
        try {
            localStorage.setItem(STORAGE_KEYS.isMuted, String(isMuted));
        } catch (_) {
            // ignoruj
        }
        updateMuteIcon();
        if (isMuted) {
            stopAlarm();
        }
    }

    function requestNotificationPermission() {
        if ('Notification' in global && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
    }

    function sendNotification(title, body) {
        if ('Notification' in global && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body,
                    icon: 'icons/icon-192x192.png?v=2'
                });
            } catch (_) {
                // Środowiska bez konstruktora Notification (np. wybrane WebView mobilne)
            }
        }
    }

    async function requestWakeLockInternal() {
        try {
            if ('wakeLock' in navigator && !wakeLock) {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => {
                    wakeLock = null;
                });
            }
        } catch (err) {
            console.warn(`Wake Lock niedostępny: ${err.name}`);
        }
    }

    function acquireWakeLock(ownerId) {
        activeWakeOwners.add(ownerId);
        requestWakeLockInternal();
    }

    async function releaseWakeLock(ownerId) {
        activeWakeOwners.delete(ownerId);
        if (activeWakeOwners.size === 0 && wakeLock !== null) {
            try {
                await wakeLock.release();
            } catch (_) {
                // ignoruj
            }
            wakeLock = null;
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && activeWakeOwners.size > 0) {
            requestWakeLockInternal();
        }
    });

    RutaApp.Audio = {
        initAudio,
        playBeep,
        startAlarm,
        stopAlarm,
        updateMuteIcon,
        toggleMute,
        requestNotificationPermission,
        sendNotification,
        acquireWakeLock,
        releaseWakeLock
    };
})(window);
