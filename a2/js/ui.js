/**
 * Pomocniki interfejsu użytkownika: powiadomienia toast (popover Top Layer), SVG, obsługa <dialog>,
 * walidacja formularzy oraz formatowanie czasu.
 */
(function (global) {
    'use strict';

    const RutaApp = (global.RutaApp = global.RutaApp || {});
    const { APP_TITLE } = RutaApp.Config;

    let supportsDisplayTransition;
    let validationInitialized = false;
    let announceErrorTimer = null;
    let announcedField = null;
    const flaggedFields = new WeakSet();
    const announcedFields = new WeakSet();
    const forcedInvalidFields = new WeakSet();

    function supportsPopoverApi() {
        return typeof HTMLElement !== 'undefined' && Object.hasOwn(HTMLElement.prototype, 'popover');
    }

    function openToastLayer(container) {
        if (!container) return;
        if (supportsPopoverApi() && typeof container.showPopover === 'function') {
            try {
                if (!container.matches(':popover-open')) {
                    container.showPopover();
                }
            } catch (_) {
                container.classList.add('toast-open');
            }
        } else {
            container.classList.add('toast-open');
        }
    }

    function closeToastLayerIfEmpty(container) {
        if (!container || container.children.length > 0) return;
        container.classList.remove('toast-open');
        if (supportsPopoverApi() && typeof container.hidePopover === 'function') {
            try {
                if (container.matches(':popover-open')) {
                    container.hidePopover();
                }
            } catch (_) {
                // ignoruj
            }
        }
    }

    function announceToast(message, hasActions = false) {
        const spoken = hasActions ? `${message}. Dostępne akcje.` : message;
        if (typeof document.ariaNotify === 'function') {
            try {
                document.ariaNotify(spoken);
                return;
            } catch (_) {
                // Fallback do live region poniżej
            }
        }
        const announcer = document.getElementById('toast-announcer');
        if (announcer) {
            announcer.textContent = '';
            setTimeout(() => {
                announcer.textContent = spoken;
            }, 30);
        }
    }

    function dismissToast(toast, container, restoreFocus = false, previousFocus = null) {
        if (!toast || !toast.isConnected || toast.dataset.dismissing === 'true') return;
        toast.dataset.dismissing = 'true';
        const hadFocus = toast.contains(document.activeElement);
        toast.classList.remove('show');

        const finalize = () => {
            if (!toast.isConnected) return;
            const nextToast = toast.nextElementSibling || toast.previousElementSibling;
            toast.remove();
            closeToastLayerIfEmpty(container);

            if (restoreFocus && hadFocus) {
                const nextBtn = nextToast?.querySelector('button');
                if (nextBtn) {
                    nextBtn.focus();
                } else if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') {
                    previousFocus.focus();
                }
            }
        };

        setTimeout(finalize, 260);
    }

    function showToast(message, type = 'info', options = {}) {
        const container = document.getElementById('toast-container');
        if (!container) return null;

        const {
            id = null,
            persistent = false,
            duration = 3200,
            actionLabel = null,
            onAction = null,
            dismissible = false
        } = options || {};

        if (id) {
            const existing = container.querySelector(`[data-toast-id="${CSS.escape ? CSS.escape(id) : id}"]`);
            if (existing) {
                const bodyEl = existing.querySelector('.toast-body');
                if (bodyEl) bodyEl.textContent = message;
                openToastLayer(container);
                return existing;
            }
        }

        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        if (id) toast.dataset.toastId = id;

        const body = document.createElement('span');
        body.className = 'toast-body';
        body.textContent = message;
        toast.appendChild(body);

        const showClose = Boolean(persistent || dismissible || actionLabel);
        let dismissTimer = null;

        const clearDismissTimer = () => {
            if (dismissTimer) {
                clearTimeout(dismissTimer);
                dismissTimer = null;
            }
        };

        const scheduleDismiss = () => {
            if (persistent) return;
            clearDismissTimer();
            dismissTimer = setTimeout(() => {
                if (toast.contains(document.activeElement)) return;
                dismissToast(toast, container, false, previousFocus);
            }, duration);
        };

        if (actionLabel || showClose) {
            const actionsWrap = document.createElement('div');
            actionsWrap.className = 'toast-actions';

            if (actionLabel && typeof onAction === 'function') {
                const actionBtn = document.createElement('button');
                actionBtn.type = 'button';
                actionBtn.className = 'toast-action-btn';
                actionBtn.textContent = actionLabel;
                actionBtn.addEventListener('click', () => {
                    onAction();
                    clearDismissTimer();
                    dismissToast(toast, container, true, previousFocus);
                });
                actionsWrap.appendChild(actionBtn);
            }

            if (showClose) {
                const closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.className = 'toast-close-btn';
                closeBtn.setAttribute('aria-label', 'Zamknij powiadomienie');
                closeBtn.textContent = '✕';
                closeBtn.addEventListener('click', () => {
                    clearDismissTimer();
                    dismissToast(toast, container, true, previousFocus);
                });
                actionsWrap.appendChild(closeBtn);
            }

            toast.appendChild(actionsWrap);
        }

        toast.addEventListener('focusin', clearDismissTimer);
        toast.addEventListener('focusout', () => {
            setTimeout(() => {
                if (!persistent && toast.isConnected && !toast.contains(document.activeElement)) {
                    scheduleDismiss();
                }
            }, 0);
        });

        container.appendChild(toast);
        openToastLayer(container);

        requestAnimationFrame(() => toast.classList.add('show'));
        announceToast(message, Boolean(actionLabel));
        scheduleDismiss();

        return toast;
    }

    function createSvgIcon(paths, className = 'icon-svg', sizePx = null) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', className);
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');
        if (sizePx) {
            svg.style.width = `${sizePx}px`;
            svg.style.height = `${sizePx}px`;
        }
        for (const def of paths) {
            const node = document.createElementNS(svgNS, def.tag);
            for (const [key, val] of Object.entries(def.attrs)) {
                node.setAttribute(key, val);
            }
            svg.appendChild(node);
        }
        return svg;
    }

    function canTransitionDisplay() {
        if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
        if (!global.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
            supportsDisplayTransition = false;
            return false;
        }
        const probe = document.createElement('div');
        probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
        document.body.appendChild(probe);
        global.getComputedStyle(probe).display;
        probe.style.display = 'none';
        supportsDisplayTransition = global.getComputedStyle(probe).display === 'block';
        probe.remove();
        return supportsDisplayTransition;
    }

    function supportsTopLayerExit() {
        return Boolean(global.CSS?.supports?.('overlay', 'auto')) && canTransitionDisplay();
    }

    async function closeTopLayer(dialogEl) {
        if (!dialogEl || !dialogEl.open) return;
        if (!supportsTopLayerExit()) {
            dialogEl.setAttribute('data-closing', '');
            const animations = dialogEl.getAnimations({ subtree: true });
            if (animations.length > 0) {
                await Promise.race([
                    Promise.allSettled(animations.map((a) => a.finished)),
                    new Promise((resolve) => setTimeout(resolve, 400))
                ]);
            }
            if (!dialogEl.hasAttribute('data-closing')) return;
            dialogEl.removeAttribute('data-closing');
        }
        if (dialogEl.open) dialogEl.close();
    }

    function initDialogFallbacks() {
        const editModalEl = document.getElementById('edit-modal');
        const confirmDialogEl = document.getElementById('confirm-dialog');

        if (editModalEl) {
            editModalEl.addEventListener('cancel', (e) => {
                e.preventDefault();
                closeTopLayer(editModalEl);
            });
        }
        if (confirmDialogEl) {
            confirmDialogEl.addEventListener('cancel', (e) => {
                e.preventDefault();
                confirmDialogEl.returnValue = 'cancel';
                closeTopLayer(confirmDialogEl);
            });
        }

        if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
            const isOutsideDialog = (e, dialog) => {
                const r = dialog.getBoundingClientRect();
                return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
            };
            for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
                let pressedOutside = false;
                dialog.addEventListener('pointerdown', (e) => {
                    pressedOutside = isOutsideDialog(e, dialog);
                });
                dialog.addEventListener('pointerup', (e) => {
                    if (pressedOutside && isOutsideDialog(e, dialog)) {
                        if (dialog === confirmDialogEl) dialog.returnValue = 'cancel';
                        closeTopLayer(dialog);
                    }
                });
            }
        }
    }

    function confirmAction(title, message, options = {}) {
        const confirmDialogEl = document.getElementById('confirm-dialog');
        const confirmTitleEl = document.getElementById('confirm-dialog-title');
        const confirmMsgEl = document.getElementById('confirm-dialog-message');
        const confirmAcceptBtn = document.getElementById('confirm-dialog-accept');
        const confirmCancelBtn = document.getElementById('confirm-dialog-cancel');

        if (!confirmDialogEl || typeof confirmDialogEl.showModal !== 'function') {
            return Promise.resolve(global.confirm(message));
        }

        const {
            confirmLabel = 'Usuń',
            cancelLabel = 'Anuluj',
            confirmClass = 'btn-danger'
        } = options || {};

        return new Promise((resolve) => {
            confirmTitleEl.textContent = title;
            confirmMsgEl.textContent = message;
            if (confirmAcceptBtn) {
                confirmAcceptBtn.textContent = confirmLabel;
                confirmAcceptBtn.className = `btn ${confirmClass}`;
            }
            if (confirmCancelBtn) {
                confirmCancelBtn.textContent = cancelLabel;
            }
            confirmDialogEl.returnValue = '';

            const onClose = () => {
                confirmDialogEl.removeEventListener('close', onClose);
                const accepted = confirmDialogEl.returnValue === 'confirm';
                confirmDialogEl.returnValue = '';
                resolve(accepted);
            };
            confirmDialogEl.addEventListener('close', onClose);
            confirmDialogEl.showModal();
        });
    }

    /* ======================================================================
       WALIDACJA FORMULARZY PER POLE + SYNCHRONIZACJA ARIA
       ====================================================================== */
    function linkErrorDescription(el, shown) {
        const errorId = el?.dataset?.error;
        if (!errorId) return;
        const ids = (el.getAttribute('aria-describedby') || '')
            .split(/\s+/)
            .filter((id) => id && id !== errorId);
        if (shown) ids.push(errorId);
        if (ids.length > 0) {
            el.setAttribute('aria-describedby', ids.join(' '));
        } else {
            el.removeAttribute('aria-describedby');
        }
    }

    function spokenNodeText(node) {
        const copy = node.cloneNode(true);
        copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
        copy.querySelectorAll('[role="img"][aria-label]').forEach((n) => {
            n.replaceWith(`${n.getAttribute('aria-label')}: `);
        });
        return copy.textContent.replace(/\s+/g, ' ').trim();
    }

    function announceFieldError(el) {
        const errorId = el?.dataset?.error;
        const errorEl = errorId ? document.getElementById(errorId) : null;
        const announcer = document.getElementById('validation-announcer');
        if (!errorEl || !announcer) return;

        const labelEl = el.labels?.[0];
        const labelPrefix = labelEl ? `${spokenNodeText(labelEl)}: ` : '';
        clearTimeout(announceErrorTimer);
        announcer.textContent = '';
        announcedField = el;
        announceErrorTimer = setTimeout(() => {
            announcer.textContent = labelPrefix + spokenNodeText(errorEl);
        }, 500);
    }

    function matchesUserInvalid(el) {
        if (!el || typeof el.matches !== 'function') return false;
        try {
            return el.matches(':user-invalid');
        } catch (_) {
            return false;
        }
    }

    function syncFieldAria(el, { announce = false, forceShow = false } = {}) {
        if (!el || !el.matches?.('input, select, textarea') || !el.dataset?.error) return true;

        const isValid = el.validity ? el.validity.valid : true;
        if (isValid) {
            forcedInvalidFields.delete(el);
            el.classList.remove('user-invalid-fallback');
        } else if (forceShow) {
            forcedInvalidFields.add(el);
            el.classList.add('user-invalid-fallback');
        }

        const nativeUserInvalid = matchesUserInvalid(el);
        const showInvalid = !isValid && (nativeUserInvalid || forcedInvalidFields.has(el) || el.classList.contains('user-invalid-fallback'));
        const group = el.closest('.input-group');

        if (showInvalid) {
            if (announce && !announcedFields.has(el)) {
                announceFieldError(el);
                announcedFields.add(el);
            }
            el.setAttribute('aria-invalid', 'true');
            linkErrorDescription(el, true);
            if (group) group.classList.add('has-error');
            flaggedFields.add(el);
            return false;
        }

        if (flaggedFields.has(el) || el.getAttribute('aria-invalid') !== 'true') {
            el.setAttribute('aria-invalid', 'false');
            linkErrorDescription(el, false);
            if (group) group.classList.remove('has-error');
            flaggedFields.delete(el);
            announcedFields.delete(el);
            if (announcedField === el) {
                clearTimeout(announceErrorTimer);
                const announcer = document.getElementById('validation-announcer');
                if (announcer) announcer.textContent = '';
            }
        }
        return isValid;
    }

    function initFormValidation() {
        document.querySelectorAll('input[data-error], select[data-error], textarea[data-error]').forEach((el) => {
            syncFieldAria(el, { announce: false, forceShow: false });
        });

        if (validationInitialized) return;
        validationInitialized = true;

        document.addEventListener(
            'blur',
            (e) => {
                if (e.target?.dataset?.error) {
                    syncFieldAria(e.target, { announce: true });
                }
            },
            true
        );

        document.addEventListener('input', (e) => {
            if (e.target?.dataset?.error) {
                syncFieldAria(e.target, { announce: false });
            }
        });

        document.addEventListener(
            'change',
            (e) => {
                if (e.target?.dataset?.error) {
                    syncFieldAria(e.target, { announce: true });
                }
            },
            true
        );

        document.addEventListener(
            'invalid',
            (e) => {
                if (e.target?.dataset?.error) {
                    announcedFields.add(e.target);
                    syncFieldAria(e.target, { announce: false, forceShow: true });
                }
            },
            true
        );

        document.addEventListener(
            'reset',
            (e) => {
                const form = e.target;
                setTimeout(() => {
                    if (form && form.elements) {
                        [...form.elements].forEach((el) => {
                            forcedInvalidFields.delete(el);
                            el.classList.remove('user-invalid-fallback');
                            syncFieldAria(el, { announce: false });
                        });
                    }
                }, 0);
            },
            true
        );
    }

    function validateFields(elements) {
        let firstInvalid = null;
        for (const el of elements) {
            if (!el || el.disabled) continue;
            const valid = Boolean(el.validity ? el.validity.valid : true);
            if (!valid) {
                announcedFields.add(el);
                syncFieldAria(el, { announce: false, forceShow: true });
                if (!firstInvalid) firstInvalid = el;
            } else {
                syncFieldAria(el, { announce: false, forceShow: false });
            }
        }

        if (firstInvalid) {
            focusAndSelect(firstInvalid);
            return false;
        }
        return true;
    }

    function resetValidationState(container) {
        const root = container || document;
        root.querySelectorAll('input[data-error], select[data-error], textarea[data-error]').forEach((el) => {
            forcedInvalidFields.delete(el);
            flaggedFields.delete(el);
            announcedFields.delete(el);
            el.classList.remove('user-invalid-fallback');
            if (typeof el.setCustomValidity === 'function') {
                el.setCustomValidity('');
            }
            el.setAttribute('aria-invalid', 'false');
            linkErrorDescription(el, false);
            const group = el.closest('.input-group');
            if (group) group.classList.remove('has-error');
        });
    }

    function focusAndSelect(el) {
        if (!el) return;
        el.focus();
        if (typeof el.select === 'function') {
            try {
                el.select();
            } catch (_) {
                // Element typu <select> nie wspiera select()
            }
        }
    }

    function addEnterNavListener(el, handler) {
        if (!el) return;
        el.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (e.isComposing || e.keyCode === 229) return;
            handler();
        });
    }

    function parseDecimal(value) {
        if (value === null || value === undefined) return NaN;
        const normalized = String(value).trim().replace(',', '.');
        if (!normalized) return NaN;
        return parseFloat(normalized);
    }

    function formatClockTime(seconds) {
        const safeSec = Math.max(0, Math.floor(seconds));
        const h = String(Math.floor(safeSec / 3600)).padStart(2, '0');
        const m = String(Math.floor((safeSec % 3600) / 60)).padStart(2, '0');
        const s = String(safeSec % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function formatClockHM(timestamp) {
        return new Date(timestamp).toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatEndTimeText(targetTs, includeSeconds = true) {
        const endD = new Date(targetTs);
        const today = new Date();
        const isSameDay =
            endD.getDate() === today.getDate() &&
            endD.getMonth() === today.getMonth() &&
            endD.getFullYear() === today.getFullYear();

        const endH = String(endD.getHours()).padStart(2, '0');
        const endM = String(endD.getMinutes()).padStart(2, '0');
        const endS = String(endD.getSeconds()).padStart(2, '0');

        if (isSameDay) {
            return includeSeconds ? `Koniec o: ${endH}:${endM}:${endS}` : `Koniec: ${endH}:${endM}`;
        }
        const endY = endD.getFullYear();
        const endMo = String(endD.getMonth() + 1).padStart(2, '0');
        const endDt = String(endD.getDate()).padStart(2, '0');
        const timePart = includeSeconds ? `${endH}:${endM}:${endS}` : `${endH}:${endM}`;
        return `Koniec: ${endY}-${endMo}-${endDt} ${timePart}`;
    }

    function debounce(fn, waitMs = 150) {
        let timerId = null;
        return function (...args) {
            clearTimeout(timerId);
            timerId = setTimeout(() => fn.apply(this, args), waitMs);
        };
    }

    function updateCloudBadge(state, text) {
        const badge = document.getElementById('firestoreSyncBadge');
        const label = document.getElementById('firestoreStatusText');
        if (!badge || !label) return;

        badge.classList.remove('sync-online', 'sync-local', 'sync-offline', 'sync-error');
        if (state === 'online') badge.classList.add('sync-online');
        else if (state === 'offline') badge.classList.add('sync-offline');
        else if (state === 'error') badge.classList.add('sync-error');
        else badge.classList.add('sync-local');

        label.textContent = text;
    }

    function updateDocumentTitle(prefix = '') {
        document.title = prefix ? `${prefix} • ${APP_TITLE}` : APP_TITLE;
    }

    RutaApp.UI = {
        showToast,
        createSvgIcon,
        closeTopLayer,
        initDialogFallbacks,
        confirmAction,
        initFormValidation,
        syncFieldAria,
        validateFields,
        resetValidationState,
        focusAndSelect,
        addEnterNavListener,
        parseDecimal,
        formatClockTime,
        formatClockHM,
        formatEndTimeText,
        debounce,
        updateCloudBadge,
        updateDocumentTitle
    };
})(window);
