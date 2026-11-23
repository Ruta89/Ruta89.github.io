/**
 * Panel Technologa v3: zarządzanie tabelą tonaży (TONNAGE_DB), normą dzienną
 * oraz listą stanowisk/maszyn z poziomu UI (bez edycji kodu).
 */
(function (global) {
    'use strict';

    const RutaApp = (global.RutaApp = global.RutaApp || {});
    const Config = RutaApp.Config;
    const UI = RutaApp.UI;
    const Storage = RutaApp.Storage;
    const Calculator = RutaApp.Calculator;

    let onConfigChangedCallback = null;

    function notifyChanged() {
        Calculator.populateAllTonnageSelects();
        Calculator.calculateValues(true);
        if (typeof onConfigChangedCallback === 'function') {
            onConfigChangedCallback();
        }
    }

    function renderTonnageTable() {
        const tbody = document.getElementById('settings-tonnage-tbody');
        if (!tbody) return;

        const db = Config.getTonnageDb();
        const keys = Config.getSortedTonnageKeys();
        const frag = document.createDocumentFragment();

        keys.forEach((key) => {
            const row = db[key];
            const tr = document.createElement('tr');

            const tdTon = document.createElement('td');
            const bTon = document.createElement('strong');
            bTon.textContent = `${key} t`;
            tdTon.appendChild(bTon);

            const tdSpools = document.createElement('td');
            tdSpools.textContent = String(row.spools);

            const tdCnt = document.createElement('td');
            tdCnt.textContent = `${row.cnt1} / ${row.cnt2}`;

            const tdWgt = document.createElement('td');
            tdWgt.textContent = `${row.wgt1} / ${row.wgt2} kg`;

            const tdAct = document.createElement('td');
            tdAct.className = 'settings-row-actions';

            const btnEdit = document.createElement('button');
            btnEdit.type = 'button';
            btnEdit.className = 'btn btn-outline btn-xs';
            btnEdit.textContent = 'Edytuj';
            btnEdit.addEventListener('click', () => fillTonnageForm(key, row));

            const btnDel = document.createElement('button');
            btnDel.type = 'button';
            btnDel.className = 'btn btn-danger btn-xs';
            btnDel.textContent = 'Usuń';
            btnDel.addEventListener('click', () => removeTonnageEntry(key));

            tdAct.append(btnEdit, btnDel);
            tr.append(tdTon, tdSpools, tdCnt, tdWgt, tdAct);
            frag.appendChild(tr);
        });

        tbody.replaceChildren(frag);
    }

    function fillTonnageForm(key, row) {
        const keyEl = document.getElementById('cfg-ton-key');
        const spoolsEl = document.getElementById('cfg-ton-spools');
        const cnt1El = document.getElementById('cfg-ton-cnt1');
        const cnt2El = document.getElementById('cfg-ton-cnt2');
        const wgt1El = document.getElementById('cfg-ton-wgt1');
        const wgt2El = document.getElementById('cfg-ton-wgt2');

        if (keyEl) keyEl.value = key;
        if (spoolsEl) spoolsEl.value = String(row.spools);
        if (cnt1El) cnt1El.value = String(row.cnt1);
        if (cnt2El) cnt2El.value = String(row.cnt2);
        if (wgt1El) wgt1El.value = String(row.wgt1);
        if (wgt2El) wgt2El.value = String(row.wgt2);
        if (keyEl) UI.focusAndSelect(keyEl);
    }

    async function removeTonnageEntry(key) {
        const db = { ...Config.getTonnageDb() };
        if (Object.keys(db).length <= 1) {
            UI.showToast('Musi pozostać co najmniej jeden tonaż w tabeli.', 'warning');
            return;
        }
        const ok = await UI.confirmAction('Usuń tonaż', `Czy usunąć tonaż ${key} t z tabeli technologicznej?`);
        if (!ok) return;

        delete db[key];
        Config.setTonnageDb(db, true);
        renderTonnageTable();
        notifyChanged();
        Storage.syncTonnageDbToCloud(Config.getTonnageDb());
        UI.showToast(`Usunięto tonaż ${key} t.`, 'info');
    }

    function handleSaveTonnageForm(e) {
        e.preventDefault();
        const keyVal = UI.parseDecimal(document.getElementById('cfg-ton-key')?.value);
        const spools = parseInt(document.getElementById('cfg-ton-spools')?.value, 10);
        const cnt1 = UI.parseDecimal(document.getElementById('cfg-ton-cnt1')?.value);
        const cnt2 = UI.parseDecimal(document.getElementById('cfg-ton-cnt2')?.value);
        const wgt1 = UI.parseDecimal(document.getElementById('cfg-ton-wgt1')?.value);
        const wgt2 = UI.parseDecimal(document.getElementById('cfg-ton-wgt2')?.value);

        if (
            !Number.isFinite(keyVal) || keyVal <= 0 ||
            !Number.isFinite(spools) || spools < 1 ||
            !Number.isFinite(cnt1) || cnt1 < 0 ||
            !Number.isFinite(cnt2) || cnt2 < 0 ||
            !Number.isFinite(wgt1) || wgt1 <= 0 ||
            !Number.isFinite(wgt2) || wgt2 <= 0
        ) {
            UI.showToast('Uzupełnij poprawnie wszystkie pola tonażu (wartości dodatnie).', 'warning');
            return;
        }

        const normKey = keyVal.toFixed(1);
        const db = { ...Config.getTonnageDb() };
        db[normKey] = {
            spools,
            cnt1: Math.round(cnt1),
            cnt2: Math.round(cnt2),
            wgt1: Number(wgt1.toFixed(3)),
            wgt2: Number(wgt2.toFixed(3))
        };

        Config.setTonnageDb(db, true);
        renderTonnageTable();
        notifyChanged();
        Storage.syncTonnageDbToCloud(Config.getTonnageDb());
        UI.showToast(`Zapisano parametry dla tonażu ${normKey} t.`, 'success');
    }

    async function handleResetTonnageDb() {
        const ok = await UI.confirmAction(
            'Przywróć tabelę fabryczną',
            'Czy przywrócić domyślną tabelę tonaży (0.5 t – 300.0 t)? Własne modyfikacje zostaną nadpisane.',
            { confirmLabel: 'Przywróć', confirmClass: 'btn-danger' }
        );
        if (!ok) return;

        Config.resetTonnageDb();
        renderTonnageTable();
        notifyChanged();
        Storage.syncTonnageDbToCloud(Config.getTonnageDb());
        UI.showToast('Przywrócono domyślną tabelę tonaży.', 'success');
    }

    function handleSaveGeneralSettings(e) {
        e.preventDefault();
        const normInput = document.getElementById('cfg-daily-norm');
        const stationsInput = document.getElementById('cfg-stations-list');
        const normVal = parseInt(normInput?.value, 10);
        const stationsRaw = (stationsInput?.value || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        if (!Number.isFinite(normVal) || normVal < 30 || normVal > 1440) {
            UI.showToast('Norma dzienna musi mieścić się w przedziale 30–1440 min.', 'warning');
            return;
        }
        if (stationsRaw.length === 0) {
            UI.showToast('Podaj co najmniej jedno stanowisko/maszynę (oddzielone przecinkiem).', 'warning');
            return;
        }

        const updated = Config.updateAppSettings({
            dailyNormMinutes: normVal,
            stations: stationsRaw
        }, true);

        notifyChanged();
        Storage.syncAppSettingsToCloud(updated);
        UI.showToast('Zapisano ustawienia zmiany i stanowisk.', 'success');
    }

    function openSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (!modal || typeof modal.showModal !== 'function') return;

        const settings = Config.getAppSettings();
        const normInput = document.getElementById('cfg-daily-norm');
        const stationsInput = document.getElementById('cfg-stations-list');
        if (normInput) normInput.value = String(settings.dailyNormMinutes);
        if (stationsInput) stationsInput.value = settings.stations.join(', ');

        renderTonnageTable();
        modal.showModal();
    }

    function closeSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) return UI.closeTopLayer(modal);
        return Promise.resolve();
    }

    function init(onConfigChanged) {
        onConfigChangedCallback = onConfigChanged;

        document.getElementById('settingsBtn')?.addEventListener('click', openSettingsModal);
        document.getElementById('btnCloseSettingsModal')?.addEventListener('click', closeSettingsModal);
        document.getElementById('btnDoneSettings')?.addEventListener('click', closeSettingsModal);
        document.getElementById('settings-general-form')?.addEventListener('submit', handleSaveGeneralSettings);
        document.getElementById('settings-tonnage-form')?.addEventListener('submit', handleSaveTonnageForm);
        document.getElementById('btnResetTonnageDb')?.addEventListener('click', handleResetTonnageDb);
    }

    RutaApp.Settings = {
        init,
        openSettingsModal,
        closeSettingsModal,
        renderTonnageTable
    };
})(window);
