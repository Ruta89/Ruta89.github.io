/**
 * Dziennik produkcji v3: statystyki KPI zmiany (w tym III zmiana nocna),
 * filtrowanie po zmianie i stanowisku, podsumowanie postojów, wykres 7 dni,
 * bezpieczny eksport CSV (ochrona przed CSV Formula Injection) oraz raport wydruku.
 */
(function (global) {
    'use strict';

    const RutaApp = (global.RutaApp = global.RutaApp || {});
    const Config = RutaApp.Config;
    const {
        showToast,
        createSvgIcon,
        confirmAction,
        closeTopLayer,
        focusAndSelect,
        parseDecimal,
        validateFields,
        resetValidationState,
        formatIsoDate,
        formatPlDateFromIso,
        getShiftInfoForDate,
        getEntryShiftInfo
    } = RutaApp.UI;
    const Storage = RutaApp.Storage;
    const Calculator = RutaApp.Calculator;
    const Charts = RutaApp.Charts;

    let shiftContextProvider = () => ({ shift: getShiftInfoForDate().shift, shiftDate: getShiftInfoForDate().shiftDate, station: '' });

    function setShiftContextProvider(fn) {
        if (typeof fn === 'function') shiftContextProvider = fn;
    }

    function updateStatistics(history) {
        const ctx = shiftContextProvider();
        const activeShift = ctx.shift;
        const activeShiftDate = ctx.shiftDate;

        let pcsShift = 0;
        let pcsAll = 0;
        let wgtShift = 0;
        let wgtAll = 0;
        let normTimeShift = 0;
        let actualTimeShift = 0;
        let downtimeShift = 0;
        let downtimeAll = 0;

        history.forEach((item) => {
            const entryShift = getEntryShiftInfo(item);
            const isCurrentShift =
                entryShift.shiftDate === activeShiftDate && entryShift.shift === activeShift;

            const dt = parseFloat(item.downtimeMinutes) || 0;
            downtimeAll += dt;
            if (isCurrentShift) downtimeShift += dt;

            if (item.type === 'simple') return;

            const pcs = parseInt(item.pieces, 10) || 0;
            const wgt = parseFloat(item.weight) || 0;
            const nTime = parseFloat(item.time) || 0;
            const aTime = parseFloat(item.actualTime !== undefined ? item.actualTime : item.time) || 0;

            pcsAll += pcs;
            wgtAll += wgt;
            if (isCurrentShift) {
                pcsShift += pcs;
                wgtShift += wgt;
                normTimeShift += nTime;
                actualTimeShift += aTime;
            }
        });

        const statPieces = document.getElementById('stat-pieces');
        const statWeight = document.getElementById('stat-weight');
        const statEfficiency = document.getElementById('stat-efficiency');
        const statDowntime = document.getElementById('stat-downtime');
        const statShiftSub = document.getElementById('stat-shift-subtitle');

        if (statShiftSub) {
            statShiftSub.textContent = `Zmiana ${activeShift} (${formatPlDateFromIso(activeShiftDate)}) / Całość`;
        }

        if (statPieces) {
            const sub = document.createElement('span');
            sub.className = 'stat-sub-inline';
            sub.textContent = `/ ${pcsAll}`;
            statPieces.replaceChildren(document.createTextNode(`${pcsShift} `), sub);
        }
        if (statWeight) {
            const sub = document.createElement('span');
            sub.className = 'stat-sub-inline';
            sub.textContent = `/ ${wgtAll.toFixed(0)} kg`;
            statWeight.replaceChildren(document.createTextNode(`${wgtShift.toFixed(1)} `), sub);
        }
        if (statEfficiency) {
            let efficiencyStr = '-';
            if (actualTimeShift > 0) {
                const eff = (normTimeShift / actualTimeShift) * 100;
                efficiencyStr = `${eff.toFixed(0)}%`;
                if (eff >= 100) statEfficiency.style.color = 'var(--primary)';
                else if (eff >= 85) statEfficiency.style.color = 'var(--cyan)';
                else statEfficiency.style.color = 'var(--amber)';
            } else {
                statEfficiency.style.color = 'var(--primary)';
            }
            statEfficiency.textContent = efficiencyStr;
        }
        if (statDowntime) {
            const sub = document.createElement('span');
            sub.className = 'stat-sub-inline';
            sub.textContent = `/ ${downtimeAll.toFixed(0)}m`;
            statDowntime.replaceChildren(document.createTextNode(`${downtimeShift.toFixed(1)}m `), sub);
        }
    }

    function filterHistory(history, filterType, searchText = '', stationFilter = 'all') {
        const now = new Date();
        const todayIso = formatIsoDate(now);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayIso = formatIsoDate(yesterday);

        const ctx = shiftContextProvider();

        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfWeekMs = startOfWeek.getTime();

        const startOfMonthMs = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
        const searchLower = searchText.trim().toLowerCase();

        return history.filter((item) => {
            const entryShift = getEntryShiftInfo(item);
            let matchesDate = true;

            if (filterType === 'shift') {
                matchesDate = entryShift.shiftDate === ctx.shiftDate && entryShift.shift === ctx.shift;
            } else if (filterType === 'today') {
                matchesDate = entryShift.shiftDate === todayIso;
            } else if (filterType === 'yesterday') {
                matchesDate = entryShift.shiftDate === yesterdayIso;
            } else if (filterType === 'week') {
                matchesDate = item.id >= startOfWeekMs;
            } else if (filterType === 'month') {
                matchesDate = item.id >= startOfMonthMs;
            }

            if (!matchesDate) return false;

            if (stationFilter && stationFilter !== 'all') {
                if ((item.station || '') !== stationFilter) return false;
            }

            if (searchLower) {
                const itemTon = `${item.ton ?? ''}t`.toLowerCase();
                const itemL1 = `${item.l1 ?? ''}m`.toLowerCase();
                const itemPcs = String(item.pieces ?? '').toLowerCase();
                const itemDay = String(item.dayStr ?? '').toLowerCase();
                const itemNote = String(item.note ?? '').toLowerCase();
                const itemStation = String(item.station ?? '').toLowerCase();
                const itemShift = `zmiana ${entryShift.shift}`.toLowerCase();
                const itemTypeText = item.type === 'simple' ? 'prosty timer' : '';
                const itemReasons = Array.isArray(item.downtimes)
                    ? item.downtimes.map((d) => d.reasonLabel || '').join(' ').toLowerCase()
                    : '';

                return (
                    itemTon.includes(searchLower) ||
                    itemL1.includes(searchLower) ||
                    itemPcs.includes(searchLower) ||
                    itemDay.includes(searchLower) ||
                    itemNote.includes(searchLower) ||
                    itemStation.includes(searchLower) ||
                    itemShift.includes(searchLower) ||
                    itemTypeText.includes(searchLower) ||
                    itemReasons.includes(searchLower)
                );
            }

            return true;
        });
    }

    function getCurrentlyFilteredHistory() {
        const history = Storage.getHistory();
        const filterVal = document.getElementById('historyFilter')?.value || 'shift';
        const stationVal = document.getElementById('historyStationFilter')?.value || 'all';
        const searchVal = document.getElementById('historySearch')?.value || '';
        return filterHistory(history, filterVal, searchVal, stationVal);
    }

    function updatePrintSummary(filteredItems) {
        const box = document.getElementById('printReportSummary');
        if (!box) return;

        const ctx = shiftContextProvider();
        const filterEl = document.getElementById('historyFilter');
        const filterLabel = filterEl?.options?.[filterEl.selectedIndex]?.textContent || 'Raport';
        const stationEl = document.getElementById('historyStationFilter');
        const stationLabel = stationEl?.value && stationEl.value !== 'all' ? stationEl.value : 'Wszystkie stanowiska';

        let pcs = 0;
        let wgt = 0;
        let normMin = 0;
        let actMin = 0;
        let dtMin = 0;

        filteredItems.forEach((item) => {
            dtMin += parseFloat(item.downtimeMinutes) || 0;
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
            titleEl.textContent = `Zakres: ${filterLabel} | Stanowisko: ${stationLabel} | Aktywna zmiana: ${ctx.shift} (${formatPlDateFromIso(ctx.shiftDate)}) | Wygenerowano: ${nowStr}`;
        }
        if (kpiEl) {
            kpiEl.textContent = `Zlecenia: ${filteredItems.length} | Sztuki: ${pcs} szt | Waga łączna: ${wgt.toFixed(2)} kg | Czas netto: ${actMin.toFixed(1)} min | Postoje: ${dtMin.toFixed(1)} min | Śr. wydajność: ${eff}`;
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

    function appendMetaBadges(td, item, entryShift) {
        if (!td) return;
        const metaRow = document.createElement('div');
        metaRow.className = 'history-meta-badges';

        const shiftTag = document.createElement('span');
        shiftTag.className = 'meta-tag meta-tag-shift';
        shiftTag.textContent = `Zm. ${entryShift.shift}`;
        metaRow.appendChild(shiftTag);

        if (item.station) {
            const stTag = document.createElement('span');
            stTag.className = 'meta-tag meta-tag-station';
            stTag.textContent = item.station;
            metaRow.appendChild(stTag);
        }

        if (item.spoolExchanges > 0) {
            const spTag = document.createElement('span');
            spTag.className = 'meta-tag meta-tag-spool';
            spTag.textContent = `Szpule: ${item.spoolExchanges}×`;
            metaRow.appendChild(spTag);
        }

        td.appendChild(metaRow);

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

    function populateStationFilter(history) {
        const selectEl = document.getElementById('historyStationFilter');
        if (!selectEl) return;
        const currentVal = selectEl.value || 'all';
        const stationsSet = new Set(Config.getStations());
        history.forEach((item) => {
            if (item.station) stationsSet.add(item.station);
        });
        const sorted = Array.from(stationsSet).sort((a, b) => a.localeCompare(b, 'pl'));

        const frag = document.createDocumentFragment();
        const allOpt = document.createElement('option');
        allOpt.value = 'all';
        allOpt.textContent = 'Wszystkie stanowiska';
        frag.appendChild(allOpt);

        sorted.forEach((st) => {
            const opt = document.createElement('option');
            opt.value = st;
            opt.textContent = st;
            frag.appendChild(opt);
        });
        selectEl.replaceChildren(frag);
        if (currentVal === 'all' || sorted.includes(currentVal)) {
            selectEl.value = currentVal;
        }
    }

    function renderHistory() {
        const history = Storage.getHistory();
        const dailyNorm = Config.getDailyNormMinutes();

        updateStatistics(history);
        populateStationFilter(history);
        if (Charts && typeof Charts.renderTrendChart === 'function') {
            Charts.renderTrendChart(history);
        }

        const listDiv = document.getElementById('history-list');
        if (!listDiv) return;

        if (history.length === 0) {
            updatePrintSummary([]);
            const empty = document.createElement('div');
            empty.className = 'empty-history-msg';
            empty.textContent = 'Brak zrobionych zleceń.';
            listDiv.replaceChildren(empty);
            return;
        }

        const filteredHistory = getCurrentlyFilteredHistory();
        updatePrintSummary(filteredHistory);

        if (filteredHistory.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-history-msg';
            empty.textContent = 'Brak zleceń spełniających wybrane filtry.';
            listDiv.replaceChildren(empty);
            return;
        }

        const groups = {};
        [...filteredHistory].reverse().forEach((item) => {
            const entryShift = getEntryShiftInfo(item);
            const groupKey = `${entryShift.shiftDate}__${entryShift.shift}`;
            const dispDay = `${formatPlDateFromIso(entryShift.shiftDate)} • Zmiana ${entryShift.shift}`;
            const dispTime =
                item.timeStr ||
                new Date(item.id).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            const parsedTime = parseFloat(item.time) || 0;
            const parsedActualTime =
                item.actualTime !== undefined ? parseFloat(item.actualTime) || 0 : parsedTime;
            const parsedDowntime = parseFloat(item.downtimeMinutes) || 0;

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    label: dispDay,
                    items: [],
                    totalTime: 0,
                    totalActualTime: 0,
                    totalDowntime: 0
                };
            }

            groups[groupKey].items.push({
                raw: item,
                entryShift,
                dispTime,
                parsedTime,
                parsedActualTime,
                parsedDowntime
            });
            groups[groupKey].totalTime += parsedTime;
            groups[groupKey].totalActualTime += parsedActualTime;
            groups[groupKey].totalDowntime += parsedDowntime;
        });

        const fragment = document.createDocumentFragment();

        for (const key of Object.keys(groups)) {
            const g = groups[key];
            const percent = Math.min((g.totalActualTime / dailyNorm) * 100, 100).toFixed(0);

            const groupEl = document.createElement('div');
            groupEl.className = 'daily-group';

            const headerEl = document.createElement('div');
            headerEl.className = 'daily-header';

            const dayLeft = document.createElement('div');
            dayLeft.style.cssText = 'display: flex; align-items: center; gap: 8px;';
            dayLeft.appendChild(createSvgIcon(Config.ICON_PATHS.calendar));
            const daySpan = document.createElement('span');
            daySpan.textContent = g.label;
            dayLeft.appendChild(daySpan);

            const progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';

            const progressText = document.createElement('span');
            progressText.style.cssText = 'display: flex; align-items: center; gap: 4px; flex-wrap: wrap;';
            progressText.appendChild(createSvgIcon(Config.ICON_PATHS.clock, 'icon-svg', 14));
            progressText.appendChild(document.createTextNode('Netto: '));
            const actualBold = document.createElement('b');
            actualBold.textContent = g.totalActualTime.toFixed(1);
            progressText.appendChild(actualBold);
            progressText.appendChild(document.createTextNode(` / ${dailyNorm}m`));

            if (g.totalDowntime > 0) {
                const dtSpan = document.createElement('span');
                dtSpan.className = 'group-downtime-badge';
                dtSpan.textContent = `Postoje: ${g.totalDowntime.toFixed(1)}m`;
                progressText.appendChild(dtSpan);
            }

            if (g.totalActualTime > dailyNorm) {
                const overSpan = document.createElement('span');
                overSpan.style.cssText = 'color: var(--danger); margin-left: 4px; font-weight: 700;';
                overSpan.textContent = `(+${(g.totalActualTime - dailyNorm).toFixed(1)} min)`;
                progressText.appendChild(overSpan);
            }

            const progressBg = document.createElement('div');
            progressBg.className = 'progress-bar-bg';
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-bar-fill';
            progressFill.style.width = `${percent}%`;
            progressFill.style.background = g.totalActualTime >= dailyNorm ? 'var(--amber)' : 'var(--primary)';
            progressBg.appendChild(progressFill);

            progressContainer.append(progressText, progressBg);
            headerEl.append(dayLeft, progressContainer);

            const tableWrap = document.createElement('div');
            tableWrap.className = 'table-responsive';
            tableWrap.setAttribute('tabindex', '0');
            tableWrap.setAttribute('role', 'region');
            tableWrap.setAttribute('aria-label', `Zlecenia: ${g.label}`);

            const table = document.createElement('table');
            table.className = 'hist-table';

            const thead = document.createElement('thead');
            const headRow = document.createElement('tr');
            const headers = ['Godzina', 'Tonaż / Info', 'L1 [m]', 'Sztuki', 'Czas i Postoje', 'Waga [kg]', 'Opcje'];
            headers.forEach((hText, idx) => {
                const th = document.createElement('th');
                th.scope = 'col';
                th.textContent = hText;
                if (idx === headers.length - 1) th.style.textAlign = 'right';
                headRow.appendChild(th);
            });
            thead.appendChild(headRow);

            const tbody = document.createElement('tbody');

            g.items.forEach(({ raw: item, entryShift, dispTime, parsedTime, parsedActualTime, parsedDowntime }) => {
                const tr = document.createElement('tr');
                const isSimple = item.type === 'simple';

                const optionsTd = document.createElement('td');
                optionsTd.setAttribute('data-label', 'Opcje:');
                optionsTd.style.textAlign = 'right';

                const actionsWrap = document.createElement('div');
                actionsWrap.className = 'table-actions';

                const editBtn = createActionButton({
                    label: 'Edytuj',
                    ariaLabel: `Edytuj ${isSimple ? 'zapis Prostego Timera' : 'zlecenie'} z godziny ${dispTime}`,
                    title: isSimple ? 'Edytuj zapis Prostego Timera' : 'Edytuj zlecenie',
                    className: 'btn btn-sm btn-outline btn-table-action',
                    iconPaths: Config.ICON_PATHS.edit,
                    onClick: () => openEdit(item.id)
                });

                const deleteBtn = createActionButton({
                    label: 'Usuń',
                    ariaLabel: `Usuń ${isSimple ? 'zapis Prostego Timera' : 'zlecenie'} z godziny ${dispTime}`,
                    title: isSimple ? 'Usuń zapis' : 'Usuń zlecenie',
                    className: 'btn btn-sm btn-danger btn-table-action',
                    iconPaths: Config.ICON_PATHS.trash,
                    onClick: () => deleteItem(item.id)
                });

                actionsWrap.append(editBtn, deleteBtn);
                optionsTd.appendChild(actionsWrap);

                const downtimeReasonsStr =
                    Array.isArray(item.downtimes) && item.downtimes.length > 0
                        ? item.downtimes.map((d) => `${d.reasonLabel} (${d.durationMin}m)`).join(', ')
                        : '';

                if (isSimple) {
                    tr.appendChild(makeCell('Godzina:', dispTime));
                    const tonCell = makeCell('Tonaż / Info:', 'Prosty Timer', 'var(--purple)', true);
                    appendMetaBadges(tonCell, item, entryShift);
                    tr.appendChild(tonCell);
                    tr.appendChild(makeCell('Start:', `Start: ${item.startTimeStr || '-'}`));
                    tr.appendChild(makeCell('Wydajność:', item.percentage || '-', null, true));

                    const durationTd = document.createElement('td');
                    durationTd.setAttribute('data-label', 'Czas i Postoje:');
                    appendColoredLine(durationTd, 'Norma: ', `${parsedTime.toFixed(1)} min`, 'var(--primary)', true);
                    appendColoredLine(durationTd, 'Netto: ', `${parsedActualTime.toFixed(1)} min`, 'var(--amber)', parsedDowntime > 0);
                    if (parsedDowntime > 0) {
                        appendColoredLine(
                            durationTd,
                            'Postój: ',
                            `${parsedDowntime.toFixed(1)} min${downtimeReasonsStr ? ` (${downtimeReasonsStr})` : ''}`,
                            'var(--danger)',
                            false
                        );
                    }
                    tr.appendChild(durationTd);

                    tr.appendChild(makeCell('Koniec:', `Koniec: ${dispTime}`));
                } else {
                    tr.appendChild(makeCell('Godzina:', dispTime));
                    const tonCell = makeCell('Tonaż / Info:', `${item.ton} t`, 'var(--cyan)', true);
                    appendMetaBadges(tonCell, item, entryShift);
                    tr.appendChild(tonCell);
                    tr.appendChild(makeCell('L1 [m]:', `${item.l1} m`));
                    tr.appendChild(makeCell('Sztuki:', `${item.pieces} szt`, null, true));

                    const durationTd = document.createElement('td');
                    durationTd.setAttribute('data-label', 'Czas i Postoje:');
                    appendColoredLine(durationTd, 'Norma: ', `${parsedTime.toFixed(1)} min`, 'var(--primary)', true);
                    appendColoredLine(durationTd, 'Netto: ', `${parsedActualTime.toFixed(1)} min`, 'var(--amber)', true);
                    appendColoredLine(durationTd, 'Start/Stop: ', `${item.startTimeStr || '-'} - ${dispTime}`, 'var(--info)', true);
                    appendColoredLine(durationTd, 'Wydajność: ', `${item.percentage || '-'}`, 'var(--purple)', parsedDowntime > 0);
                    if (parsedDowntime > 0) {
                        appendColoredLine(
                            durationTd,
                            'Postój: ',
                            `${parsedDowntime.toFixed(1)} min${downtimeReasonsStr ? ` — ${downtimeReasonsStr}` : ''}`,
                            'var(--danger)',
                            false
                        );
                    }
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
        const editDowntimeEl = document.getElementById('edit-downtime');
        const editStationEl = document.getElementById('edit-station');
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
        if (editDowntimeEl) {
            editDowntimeEl.value = item.downtimeMinutes !== undefined ? item.downtimeMinutes : 0;
        }
        if (editStationEl) {
            editStationEl.value = item.station || '';
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
        const editDowntimeEl = document.getElementById('edit-downtime');
        const editStationEl = document.getElementById('edit-station');
        const editNoteEl = document.getElementById('edit-note');

        const fieldsToValidate = isSimple
            ? [editTimeEl, editActualTimeEl]
            : [editL1El, editPiecesEl, editTimeEl, editActualTimeEl];

        if (!validateFields(fieldsToValidate)) {
            return;
        }

        const newTime = parseDecimal(editTimeEl.value);
        const newActualTime = parseDecimal(editActualTimeEl.value);
        const parsedDt = parseDecimal(editDowntimeEl?.value);
        const newDowntime = Number.isFinite(parsedDt) && parsedDt >= 0 ? parseFloat(parsedDt.toFixed(1)) : 0;
        const newStation = (editStationEl?.value || '').trim().slice(0, 32);
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
                downtimeMinutes: newDowntime,
                station: newStation,
                percentage: `${((newTime / newActualTime) * 100).toFixed(0)}%`,
                note: newNote
            });
        } else {
            const newTon = editTonEl.value;
            const newL1 = parseDecimal(editL1El.value);
            const newPieces = parseInt(editPiecesEl.value, 10);

            if (!newTon || !Config.getTonnageDb()[newTon]) {
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
                downtimeMinutes: newDowntime,
                station: newStation,
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
        // Ochrona przed CSV Formula Injection w Excelu / LibreOffice
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
            'Data robocza;Zmiana;Stanowisko;Godzina;Tonaz [t];Dlugosc L1 [m];Sztuki;Norma [min];Czas netto [min];Postoje [min];Powody postojow;Wydajnosc;Waga [kg];Wymiany szpul;Notatka\n';
        const rows = items.map((item) => {
            const entryShift = getEntryShiftInfo(item);
            const t =
                item.timeStr ||
                new Date(item.id).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            const act = item.actualTime !== undefined ? item.actualTime : item.time;
            const dt = item.downtimeMinutes !== undefined ? item.downtimeMinutes : 0;
            const reasons = Array.isArray(item.downtimes)
                ? item.downtimes.map((d) => `${d.reasonLabel} (${d.durationMin}m)`).join(', ')
                : '';

            return [
                formatPlDateFromIso(entryShift.shiftDate),
                entryShift.shift,
                item.station || '',
                t,
                item.ton,
                item.l1,
                item.pieces,
                item.time,
                act,
                dt,
                reasons,
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
        triggerDownload(blob, `Historia_Czasomierz_v3${suffix}_${dateStamp}.csv`);
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
        triggerDownload(blob, `Backup_Czasomierz_v3_${dateStamp}.json`);
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
                showToast(
                    `Zaimportowano pomyślnie! Dodano ${result.addedCount} nowych wpisów.`,
                    'success'
                );
            } catch (err) {
                showToast(`Błąd podczas importu: ${err.message}`, 'warning');
            }
        };
        reader.readAsText(file);
    }

    RutaApp.History = {
        setShiftContextProvider,
        renderHistory,
        deleteItem,
        clearHistory,
        openEdit,
        closeEdit,
        saveEdit,
        printReport,
        exportCSV,
        exportJSON,
        importJSONFile
    };
})(window);
