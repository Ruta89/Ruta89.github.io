/**
 * Dziennik produkcji, statystyki KPI zmiany dziennej, edycja zleceń/prostych wpisów,
 * podsumowanie wydruku oraz bezpieczny eksport/import danych (ochrona CSV Formula Injection).
 */
(function (global) {
    'use strict';

    const RutaApp = (global.RutaApp = global.RutaApp || {});
    const { DAILY_NORM_MINUTES, ICON_PATHS, TONNAGE_DB } = RutaApp.Config;
    const {
        showToast,
        createSvgIcon,
        confirmAction,
        closeTopLayer,
        focusAndSelect,
        parseDecimal,
        validateFields,
        resetValidationState
    } = RutaApp.UI;
    const Storage = RutaApp.Storage;
    const Calculator = RutaApp.Calculator;

    let repeatOrderHandler = null;
    let goToCalculatorHandler = null;

    function setRepeatOrderHandler(fn) {
        repeatOrderHandler = typeof fn === 'function' ? fn : null;
    }

    function setGoToCalculatorHandler(fn) {
        goToCalculatorHandler = typeof fn === 'function' ? fn : null;
    }

    function createEmptyState({ iconPaths, title, description, actionLabel, onAction }) {
        const box = document.createElement('div');
        box.className = 'empty-state-box';

        const iconWrap = document.createElement('div');
        iconWrap.className = 'empty-state-icon';
        iconWrap.setAttribute('aria-hidden', 'true');
        iconWrap.appendChild(createSvgIcon(iconPaths, 'icon-svg', 22));
        box.appendChild(iconWrap);

        const titleEl = document.createElement('p');
        titleEl.className = 'empty-state-title';
        titleEl.textContent = title;
        box.appendChild(titleEl);

        const descEl = document.createElement('p');
        descEl.className = 'empty-state-desc';
        descEl.textContent = description;
        box.appendChild(descEl);

        if (actionLabel && typeof onAction === 'function') {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-outline btn-sm';
            btn.textContent = actionLabel;
            btn.addEventListener('click', onAction);
            box.appendChild(btn);
        }

        return box;
    }

    function updateStatistics(history) {
        const todayStr = new Date().toLocaleDateString('pl-PL');

        let pcsToday = 0;
        let pcsAll = 0;
        let wgtToday = 0;
        let wgtAll = 0;
        let normTimeToday = 0;
        let actualTimeToday = 0;

        history.forEach((item) => {
            if (item.type === 'simple') return;

            const isToday = item.dayStr === todayStr;
            const pcs = parseInt(item.pieces, 10) || 0;
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
            const sub = document.createElement('span');
            sub.className = 'stat-sub-inline';
            sub.textContent = `/ ${pcsAll}`;
            statPieces.replaceChildren(document.createTextNode(`${pcsToday} `), sub);
        }
        if (statWeight) {
            const sub = document.createElement('span');
            sub.className = 'stat-sub-inline';
            sub.textContent = `/ ${wgtAll.toFixed(0)} kg`;
            statWeight.replaceChildren(document.createTextNode(`${wgtToday.toFixed(1)} `), sub);
        }
        if (statEfficiency) {
            let efficiencyStr = '-';
            if (actualTimeToday > 0) {
                const eff = (normTimeToday / actualTimeToday) * 100;
                efficiencyStr = `${eff.toFixed(0)}%`;
                if (eff >= 100) statEfficiency.style.color = 'var(--primary)';
                else if (eff >= 85) statEfficiency.style.color = 'var(--cyan)';
                else statEfficiency.style.color = 'var(--amber)';
            } else {
                statEfficiency.style.color = 'var(--primary)';
            }
            statEfficiency.textContent = efficiencyStr;
        }
    }

    function filterHistory(history, filterType, searchText = '') {
        const now = new Date();
        const todayStr = now.toLocaleDateString('pl-PL');

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('pl-PL');

        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfWeekMs = startOfWeek.getTime();

        const startOfMonthMs = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
        const searchLower = searchText.trim().toLowerCase();

        return history.filter((item) => {
            let matchesDate = true;
            if (filterType === 'today') matchesDate = item.dayStr === todayStr;
            else if (filterType === 'yesterday') matchesDate = item.dayStr === yesterdayStr;
            else if (filterType === 'week') matchesDate = item.id >= startOfWeekMs;
            else if (filterType === 'month') matchesDate = item.id >= startOfMonthMs;

            if (!matchesDate) return false;

            if (searchLower) {
                const itemTon = `${item.ton ?? ''}t`.toLowerCase();
                const itemL1 = `${item.l1 ?? ''}m`.toLowerCase();
                const itemPcs = String(item.pieces ?? '').toLowerCase();
                const itemDay = String(item.dayStr ?? '').toLowerCase();
                const itemNote = String(item.note ?? '').toLowerCase();
                const itemTypeText = item.type === 'simple' ? 'prosty timer' : '';
                return (
                    itemTon.includes(searchLower) ||
                    itemL1.includes(searchLower) ||
                    itemPcs.includes(searchLower) ||
                    itemDay.includes(searchLower) ||
                    itemNote.includes(searchLower) ||
                    itemTypeText.includes(searchLower)
                );
            }

            return true;
        });
    }

    function getCurrentlyFilteredHistory() {
        const history = Storage.getHistory();
        const filterVal = document.getElementById('historyFilter')?.value || 'today';
        const searchVal = document.getElementById('historySearch')?.value || '';
        return filterHistory(history, filterVal, searchVal);
    }

    function updatePrintSummary(filteredItems) {
        const box = document.getElementById('printReportSummary');
        if (!box) return;

        const filterEl = document.getElementById('historyFilter');
        const filterLabel = filterEl?.options?.[filterEl.selectedIndex]?.textContent || 'Raport';

        let pcs = 0;
        let wgt = 0;
        let normMin = 0;
        let actMin = 0;

        filteredItems.forEach((item) => {
            if (item.type === 'simple') return;
            pcs += parseInt(item.pieces, 10) || 0;
            wgt += parseFloat(item.weight) || 0;
            normMin += parseFloat(item.time) || 0;
            actMin += parseFloat(item.actualTime !== undefined ? item.actualTime : item.time) || 0;
        });

        const eff = actMin > 0 ? `${Math.round((normMin / actMin) * 100)}%` : '-';
        const nowStr = new Date().toLocaleString('pl-PL');

        const titleEl = document.getElementById('print-meta-line');
        const kpiEl = document.getElementById('print-kpi-line');
        if (titleEl) {
            titleEl.textContent = `Zakres: ${filterLabel} | Wygenerowano: ${nowStr}`;
        }
        if (kpiEl) {
            kpiEl.textContent = `Wpisy: ${filteredItems.length} | Sztuki: ${pcs} szt | Waga łączna: ${wgt.toFixed(2)} kg | Norma: ${normMin.toFixed(1)} min | Czas faktyczny: ${actMin.toFixed(1)} min | Śr. wydajność: ${eff}`;
        }
    }

    function makeCell(label, text, color = null, bold = false) {
        const td = document.createElement('td');
        td.setAttribute('data-label', label);
        if (color || bold) {
            const inner = document.createElement(bold ? 'b' : 'span');
            if (color) {
                inner.style.color = color;
                if (bold) inner.style.fontWeight = '700';
            }
            inner.textContent = text;
            td.appendChild(inner);
        } else {
            td.textContent = text;
        }
        return td;
    }

    function appendEntryExtras(td, item) {
        if (!td) return;
        if (item.spoolExchanges > 0) {
            const metaRow = document.createElement('div');
            metaRow.className = 'history-meta-badges';
            const spTag = document.createElement('span');
            spTag.className = 'meta-tag meta-tag-spool';
            spTag.textContent = `Wymiany szpul: ${item.spoolExchanges}×`;
            metaRow.appendChild(spTag);
            td.appendChild(metaRow);
        }
        if (typeof item.note === 'string' && item.note.trim()) {
            const noteEl = document.createElement('div');
            noteEl.className = 'history-note';
            noteEl.textContent = item.note.trim();
            td.appendChild(noteEl);
        }
    }

    function appendColoredLine(container, prefix, boldText, color, addBreak = true) {
        const span = document.createElement('span');
        span.style.color = color;
        span.appendChild(document.createTextNode(prefix));
        const b = document.createElement('b');
        b.textContent = boldText;
        span.appendChild(b);
        container.appendChild(span);
        if (addBreak) container.appendChild(document.createElement('br'));
    }

    function createActionButton({ label, ariaLabel, title, className, iconPaths, onClick }) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = className;
        btn.title = title;
        btn.setAttribute('aria-label', ariaLabel);
        btn.appendChild(createSvgIcon(iconPaths, 'icon-svg', 14));
        const span = document.createElement('span');
        span.textContent = label;
        btn.appendChild(span);
        btn.addEventListener('click', onClick);
        return btn;
    }

    function renderHistory() {
        const history = Storage.getHistory();
        updateStatistics(history);

        const listDiv = document.getElementById('history-list');
        if (!listDiv) return;

        if (history.length === 0) {
            updatePrintSummary([]);
            const empty = createEmptyState({
                iconPaths: ICON_PATHS.clock,
                title: 'Brak zapisanych zleceń',
                description:
                    'Rozpocznij i zakończ zlecenie w Kalkulatorze lub Prostym Timerze, aby pojawiło się w dzienniku.',
                actionLabel: 'Przejdź do kalkulatora',
                onAction: () => {
                    if (typeof goToCalculatorHandler === 'function') {
                        goToCalculatorHandler();
                    } else {
                        document.getElementById('tab-calc')?.click();
                    }
                }
            });
            listDiv.replaceChildren(empty);
            return;
        }

        const filteredHistory = getCurrentlyFilteredHistory();
        updatePrintSummary(filteredHistory);

        if (filteredHistory.length === 0) {
            const empty = createEmptyState({
                iconPaths: ICON_PATHS.search,
                title: 'Brak wpisów dla aktywnych filtrów',
                description: 'Zmień zakres dat lub wyczyść frazę wyszukiwania.',
                actionLabel: 'Pokaż wszystkie wpisy',
                onAction: () => {
                    const filterEl = document.getElementById('historyFilter');
                    const searchEl = document.getElementById('historySearch');
                    if (filterEl) filterEl.value = 'all';
                    if (searchEl) searchEl.value = '';
                    renderHistory();
                }
            });
            listDiv.replaceChildren(empty);
            return;
        }

        const groups = {};
        [...filteredHistory].reverse().forEach((item) => {
            const dispDay = item.dayStr || new Date(item.id).toLocaleDateString('pl-PL');
            const dispTime =
                item.timeStr ||
                new Date(item.id).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            const parsedTime = parseFloat(item.time) || 0;
            const parsedActualTime =
                item.actualTime !== undefined ? parseFloat(item.actualTime) || 0 : parsedTime;

            if (!groups[dispDay]) {
                groups[dispDay] = { items: [], totalTime: 0, totalActualTime: 0 };
            }

            groups[dispDay].items.push({
                raw: item,
                dispDay,
                dispTime,
                parsedTime,
                parsedActualTime
            });
            groups[dispDay].totalTime += parsedTime;
            groups[dispDay].totalActualTime += parsedActualTime;
        });

        const fragment = document.createDocumentFragment();

        for (const day of Object.keys(groups)) {
            const g = groups[day];
            const percent = Math.min((g.totalActualTime / DAILY_NORM_MINUTES) * 100, 100).toFixed(0);

            const groupEl = document.createElement('div');
            groupEl.className = 'daily-group';

            const headerEl = document.createElement('div');
            headerEl.className = 'daily-header';

            const dayLeft = document.createElement('div');
            dayLeft.className = 'daily-day-title';
            dayLeft.appendChild(createSvgIcon(ICON_PATHS.calendar));
            const daySpan = document.createElement('span');
            daySpan.textContent = `Dzień: ${day}`;
            dayLeft.appendChild(daySpan);

            const progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';

            const progressText = document.createElement('span');
            progressText.className = 'progress-text-row';
            progressText.appendChild(createSvgIcon(ICON_PATHS.clock, 'icon-svg', 14));
            progressText.appendChild(document.createTextNode('Czas faktyczny: '));
            const actualBold = document.createElement('b');
            actualBold.textContent = g.totalActualTime.toFixed(1);
            progressText.appendChild(actualBold);
            progressText.appendChild(document.createTextNode(` / ${DAILY_NORM_MINUTES}m`));

            if (g.totalActualTime > DAILY_NORM_MINUTES) {
                const overSpan = document.createElement('span');
                overSpan.className = 'daily-overtime-text';
                overSpan.textContent = `(+${(g.totalActualTime - DAILY_NORM_MINUTES).toFixed(1)} min)`;
                progressText.appendChild(overSpan);
            }

            const progressBg = document.createElement('div');
            progressBg.className = 'progress-bar-bg';
            progressBg.setAttribute('role', 'progressbar');
            progressBg.setAttribute('aria-label', 'Realizacja dziennej normy czasu');
            progressBg.setAttribute('aria-valuemin', '0');
            progressBg.setAttribute('aria-valuemax', String(DAILY_NORM_MINUTES));
            progressBg.setAttribute('aria-valuenow', String(Math.round(g.totalActualTime)));
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-bar-fill';
            progressFill.style.width = `${percent}%`;
            progressFill.style.background =
                g.totalActualTime >= DAILY_NORM_MINUTES ? 'var(--amber)' : 'var(--primary)';
            progressBg.appendChild(progressFill);

            progressContainer.append(progressText, progressBg);
            headerEl.append(dayLeft, progressContainer);

            const tableWrap = document.createElement('div');
            tableWrap.className = 'table-responsive';
            tableWrap.setAttribute('tabindex', '0');
            tableWrap.setAttribute('role', 'region');
            tableWrap.setAttribute('aria-label', `Zlecenia dla dnia ${day}`);

            const table = document.createElement('table');
            table.className = 'hist-table';

            const thead = document.createElement('thead');
            const headRow = document.createElement('tr');
            const headers = ['Godzina', 'Tonaż', 'L1 [m]', 'Sztuki', 'Czas Zlecenia', 'Waga [kg]', 'Opcje'];
            headers.forEach((hText, idx) => {
                const th = document.createElement('th');
                th.scope = 'col';
                th.textContent = hText;
                if (idx === headers.length - 1) th.style.textAlign = 'right';
                headRow.appendChild(th);
            });
            thead.appendChild(headRow);

            const tbody = document.createElement('tbody');

            g.items.forEach(({ raw: item, dispTime, parsedTime, parsedActualTime }) => {
                const tr = document.createElement('tr');
                const isSimple = item.type === 'simple';

                const optionsTd = document.createElement('td');
                optionsTd.setAttribute('data-label', 'Opcje:');
                optionsTd.style.textAlign = 'right';

                const actionsWrap = document.createElement('div');
                actionsWrap.className = 'table-actions';

                if (!isSimple && typeof repeatOrderHandler === 'function') {
                    const repeatBtn = createActionButton({
                        label: 'Wczytaj',
                        ariaLabel: `Wczytaj parametry zlecenia z godziny ${dispTime} do kalkulatora`,
                        title: 'Powtórz zlecenie (wczytaj do kalkulatora)',
                        className: 'btn btn-sm btn-outline btn-table-action',
                        iconPaths: ICON_PATHS.repeat,
                        onClick: () => repeatOrderHandler(item)
                    });
                    actionsWrap.appendChild(repeatBtn);
                }

                const editBtn = createActionButton({
                    label: 'Edytuj',
                    ariaLabel: `Edytuj ${isSimple ? 'zapis Prostego Timera' : 'zlecenie'} z godziny ${dispTime}`,
                    title: isSimple ? 'Edytuj zapis Prostego Timera' : 'Edytuj zlecenie',
                    className: 'btn btn-sm btn-outline btn-table-action',
                    iconPaths: ICON_PATHS.edit,
                    onClick: () => openEdit(item.id)
                });

                const deleteBtn = createActionButton({
                    label: 'Usuń',
                    ariaLabel: `Usuń ${isSimple ? 'zapis Prostego Timera' : 'zlecenie'} z godziny ${dispTime}`,
                    title: isSimple ? 'Usuń zapis' : 'Usuń zlecenie',
                    className: 'btn btn-sm btn-danger btn-table-action',
                    iconPaths: ICON_PATHS.trash,
                    onClick: () => deleteItem(item.id)
                });

                actionsWrap.append(editBtn, deleteBtn);
                optionsTd.appendChild(actionsWrap);

                if (isSimple) {
                    tr.appendChild(makeCell('Godzina:', dispTime));
                    const tonCell = makeCell('Tonaż:', 'Prosty Timer', 'var(--purple)', true);
                    appendEntryExtras(tonCell, item);
                    tr.appendChild(tonCell);

                    const summaryTd = document.createElement('td');
                    summaryTd.colSpan = 2;
                    summaryTd.className = 'simple-summary-cell';
                    summaryTd.setAttribute('data-label', 'Przebieg:');
                    summaryTd.textContent = `Start: ${item.startTimeStr || '-'} • Wydajność: ${item.percentage || '-'}`;
                    tr.appendChild(summaryTd);

                    const durationTd = document.createElement('td');
                    durationTd.setAttribute('data-label', 'Czas trwania:');
                    appendColoredLine(durationTd, 'Norma: ', `${parsedTime.toFixed(1)} min`, 'var(--primary)', true);
                    appendColoredLine(durationTd, 'Fakt: ', `${parsedActualTime.toFixed(1)} min`, 'var(--amber)', false);
                    tr.appendChild(durationTd);

                    tr.appendChild(makeCell('Waga [kg]:', '—', 'var(--text-dim)', false));
                } else {
                    tr.appendChild(makeCell('Godzina:', dispTime));
                    const tonCell = makeCell('Tonaż:', `${item.ton} t`, 'var(--cyan)', true);
                    appendEntryExtras(tonCell, item);
                    tr.appendChild(tonCell);
                    tr.appendChild(makeCell('L1 [m]:', `${item.l1} m`));
                    tr.appendChild(makeCell('Sztuki:', `${item.pieces} szt`, null, true));

                    const durationTd = document.createElement('td');
                    durationTd.setAttribute('data-label', 'Czas Zlecenia:');
                    appendColoredLine(durationTd, 'Norma: ', `${parsedTime.toFixed(1)} min`, 'var(--primary)', true);
                    appendColoredLine(durationTd, 'Fakt: ', `${parsedActualTime.toFixed(1)} min`, 'var(--amber)', true);
                    appendColoredLine(
                        durationTd,
                        'Start/Stop: ',
                        `${item.startTimeStr || '-'} - ${dispTime}`,
                        'var(--info)',
                        true
                    );
                    appendColoredLine(durationTd, 'Wydajność: ', `${item.percentage || '-'}`, 'var(--purple)', false);
                    tr.appendChild(durationTd);

                    tr.appendChild(makeCell('Waga [kg]:', `${item.weight} kg`, null, true));
                }

                tr.appendChild(optionsTd);
                tbody.appendChild(tr);
            });

            table.append(thead, tbody);
            tableWrap.appendChild(table);
            groupEl.append(headerEl, tableWrap);
            fragment.appendChild(groupEl);
        }

        listDiv.replaceChildren(fragment);
    }

    async function deleteItem(id) {
        const confirmed = await confirmAction('Usuń wpis', 'Na pewno usunąć ten wpis z historii?');
        if (!confirmed) return;

        await Storage.deleteEntry(id);
        showToast(
            Storage.isCloudEnabled() ? 'Usunięto wpis z historii i chmury.' : 'Usunięto wpis z historii.',
            'info'
        );
    }

    async function clearHistory() {
        if (Storage.getHistory().length === 0) {
            showToast('Historia jest już pusta.', 'info');
            return;
        }
        const confirmed = await confirmAction(
            'Wyczyść historię',
            'Na pewno wyczyścić CAŁĄ historię ze wszystkich dni?'
        );
        if (!confirmed) return;

        try {
            await Storage.clearAllEntries();
            showToast('Wyczyszczono całą historię.', 'warning');
        } catch (err) {
            console.error('Błąd czyszczenia historii:', err);
            showToast('Wystąpił błąd podczas czyszczenia w chmurze.', 'danger');
        }
    }

    function openEdit(id) {
        const item = Storage.getHistory().find((i) => i.id === id);
        if (!item) return;

        const isSimple = item.type === 'simple';
        const editModalEl = document.getElementById('edit-modal');
        const editTitleEl = document.getElementById('edit-modal-title');
        const editTypeEl = document.getElementById('edit-type');
        const orderFieldsEl = document.getElementById('edit-order-fields');
        const editTonEl = document.getElementById('edit-ton');
        const editL1El = document.getElementById('edit-l1');
        const editPiecesEl = document.getElementById('edit-pieces');
        const editTimeEl = document.getElementById('edit-time');
        const editActualTimeEl = document.getElementById('edit-actual-time');
        const editNoteEl = document.getElementById('edit-note');
        const editFormEl = document.getElementById('edit-form');

        if (editTitleEl) {
            editTitleEl.textContent = isSimple ? 'Edycja Wpisu — Prosty Timer' : 'Edycja Zlecenia Produkcyjnego';
        }
        if (editTypeEl) editTypeEl.value = isSimple ? 'simple' : 'order';
        if (orderFieldsEl) orderFieldsEl.hidden = isSimple;

        if (editTonEl) editTonEl.disabled = isSimple;
        if (editL1El) editL1El.disabled = isSimple;
        if (editPiecesEl) editPiecesEl.disabled = isSimple;

        document.getElementById('edit-id').value = item.id;

        if (!isSimple) {
            Calculator.populateTonnageSelect(editTonEl, item.ton);
            if (editL1El) editL1El.value = item.l1;
            if (editPiecesEl) editPiecesEl.value = item.pieces;
        }
        if (editTimeEl) editTimeEl.value = item.time;
        if (editActualTimeEl) {
            editActualTimeEl.value = item.actualTime !== undefined ? item.actualTime : item.time;
        }
        if (editNoteEl) editNoteEl.value = item.note || '';

        if (editFormEl) resetValidationState(editFormEl);

        if (editModalEl && typeof editModalEl.showModal === 'function') {
            editModalEl.showModal();
            focusAndSelect(isSimple ? editTimeEl : editL1El);
        }
    }

    function closeEdit() {
        const editModalEl = document.getElementById('edit-modal');
        if (editModalEl) {
            return closeTopLayer(editModalEl);
        }
        return Promise.resolve();
    }

    async function saveEdit() {
        const id = parseInt(document.getElementById('edit-id').value, 10);
        const existing = Storage.getHistory().find((i) => i.id === id);
        if (!existing) return;

        const isSimple = existing.type === 'simple' || document.getElementById('edit-type')?.value === 'simple';
        const editTonEl = document.getElementById('edit-ton');
        const editL1El = document.getElementById('edit-l1');
        const editPiecesEl = document.getElementById('edit-pieces');
        const editTimeEl = document.getElementById('edit-time');
        const editActualTimeEl = document.getElementById('edit-actual-time');
        const editNoteEl = document.getElementById('edit-note');

        const fieldsToValidate = isSimple
            ? [editTimeEl, editActualTimeEl]
            : [editL1El, editPiecesEl, editTimeEl, editActualTimeEl];

        if (!validateFields(fieldsToValidate)) {
            return;
        }

        const newTime = parseDecimal(editTimeEl.value);
        const newActualTime = parseDecimal(editActualTimeEl.value);
        const newNote = (editNoteEl?.value || '').trim().slice(0, 120);

        if (!Number.isFinite(newTime) || !Number.isFinite(newActualTime) || newTime <= 0 || newActualTime <= 0) {
            showToast('Podaj prawidłowe dodatnie czasy!', 'warning');
            return;
        }

        let updatedItem;
        if (isSimple) {
            updatedItem = Object.assign({}, existing, {
                time: parseFloat(newTime.toFixed(1)),
                actualTime: parseFloat(newActualTime.toFixed(1)),
                percentage: `${((newTime / newActualTime) * 100).toFixed(0)}%`,
                note: newNote
            });
        } else {
            const newTon = editTonEl.value;
            const newL1 = parseDecimal(editL1El.value);
            const newPieces = parseInt(editPiecesEl.value, 10);

            if (!newTon || !TONNAGE_DB[newTon]) {
                showToast('Niepoprawny tonaż!', 'warning');
                return;
            }
            if (!Number.isFinite(newL1) || !Number.isFinite(newPieces) || newL1 <= 0 || newPieces <= 0) {
                showToast('Podaj prawidłowe dodatnie wartości!', 'warning');
                return;
            }

            const metrics = Calculator.computeOrderMetrics(newTon, newL1, newPieces);
            if (!metrics) return;

            updatedItem = Object.assign({}, existing, {
                ton: newTon,
                l1: metrics.L1,
                pieces: metrics.pieces,
                time: parseFloat(newTime.toFixed(1)),
                actualTime: parseFloat(newActualTime.toFixed(1)),
                weight: parseFloat(metrics.totalWeight.toFixed(2)),
                percentage: `${((newTime / newActualTime) * 100).toFixed(0)}%`,
                note: newNote
            });
        }

        await closeEdit();
        Storage.updateEntry(updatedItem);
        showToast(isSimple ? 'Zapisano zmiany w zapisie.' : 'Zapisano zmiany w zleceniu.', 'success');
    }

    function escapeCsvCell(value) {
        let str = String(value ?? '');
        if (/^[=+\-@\t\r]/.test(str)) {
            str = `'${str}`;
        }
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function printReport() {
        const filtered = getCurrentlyFilteredHistory();
        if (filtered.length === 0) {
            showToast('Brak danych w bieżącym widoku do wydrukowania!', 'warning');
            return;
        }
        updatePrintSummary(filtered);
        global.print();
    }

    function exportCSV(onlyFiltered = false) {
        const items = onlyFiltered ? getCurrentlyFilteredHistory() : Storage.getHistory();
        if (items.length === 0) {
            showToast('Brak danych do wyeksportowania!', 'warning');
            return;
        }

        const header =
            'Data;Godzina;Tonaz [t];Dlugosc L1 [m];Sztuki;Czas wykonania (Norma) [min];Czas Faktyczny [min];Wydajnosc;Laczna waga [kg];Wymiany szpul;Notatka\n';
        const rows = items.map((item) => {
            const d = item.dayStr || new Date(item.id).toLocaleDateString('pl-PL');
            const t =
                item.timeStr ||
                new Date(item.id).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            const act = item.actualTime !== undefined ? item.actualTime : item.time;
            return [
                d,
                t,
                item.ton,
                item.l1,
                item.pieces,
                item.time,
                act,
                item.percentage || '-',
                item.weight,
                item.spoolExchanges || 0,
                item.note || ''
            ]
                .map(escapeCsvCell)
                .join(';');
        });

        const csvContent = `\uFEFF${header}${rows.join('\n')}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const dateStamp = new Date().toLocaleDateString('pl-PL').replace(/\./g, '-');
        const suffix = onlyFiltered ? '_Widok' : '_Calosc';
        triggerDownload(blob, `Historia_Czasomierz${suffix}_${dateStamp}.csv`);
        showToast(onlyFiltered ? 'Wygenerowano CSV dla bieżącego filtra.' : 'Wygenerowano pełny plik CSV.', 'success');
    }

    function exportJSON() {
        const history = Storage.getHistory();
        if (history.length === 0) {
            showToast('Brak danych do wyeksportowania!', 'warning');
            return;
        }

        const jsonStr = JSON.stringify(history, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
        const dateStamp = new Date().toLocaleDateString('pl-PL').replace(/\./g, '-');
        triggerDownload(blob, `Backup_Czasomierz_${dateStamp}.json`);
        showToast('Wygenerowano kopię zapasową JSON.', 'success');
    }

    function importJSONFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const imported = JSON.parse(evt.target.result);
                if (!Array.isArray(imported)) {
                    throw new Error('Dane nie są tablicą!');
                }
                const isValid = imported.every(
                    (item) =>
                        item &&
                        Number.isFinite(Number(item.id)) &&
                        item.pieces !== undefined &&
                        Number.isFinite(Number(item.time))
                );
                if (!isValid) {
                    throw new Error('Błędny format danych w pliku JSON.');
                }

                const result = await Storage.importEntries(imported);
                showToast(`Zaimportowano pomyślnie! Dodano ${result.addedCount} nowych wpisów.`, 'success');
            } catch (err) {
                showToast(`Błąd podczas importu: ${err.message}`, 'warning');
            }
        };
        reader.readAsText(file);
    }

    RutaApp.History = {
        renderHistory,
        deleteItem,
        clearHistory,
        openEdit,
        closeEdit,
        saveEdit,
        printReport,
        exportCSV,
        exportJSON,
        importJSONFile,
        setRepeatOrderHandler,
        setGoToCalculatorHandler
    };
})(window);
