/**
 * Lekki moduł wykresów SVG (bez zewnętrznych bibliotek, 100% CSP & offline):
 * trend ostatnich 7 dni roboczych — wyprodukowana waga [kg], wydajność [%] oraz postoje [min].
 */
(function (global) {
    'use strict';

    const RutaApp = (global.RutaApp = global.RutaApp || {});
    const { formatIsoDate, getEntryShiftInfo } = RutaApp.UI;

    function buildLast7DaysData(history) {
        const days = [];
        const map = {};
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const iso = formatIsoDate(d);
            const shortLabel = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
            const bucket = {
                iso,
                label: shortLabel,
                weightKg: 0,
                pieces: 0,
                normMin: 0,
                actualMin: 0,
                downtimeMin: 0,
                efficiency: null
            };
            days.push(bucket);
            map[iso] = bucket;
        }

        history.forEach((item) => {
            const info = getEntryShiftInfo(item);
            const bucket = map[info.shiftDate];
            if (!bucket) return;

            bucket.downtimeMin += parseFloat(item.downtimeMinutes) || 0;
            if (item.type === 'simple') return;

            bucket.weightKg += parseFloat(item.weight) || 0;
            bucket.pieces += parseInt(item.pieces, 10) || 0;
            bucket.normMin += parseFloat(item.time) || 0;
            bucket.actualMin += parseFloat(item.actualTime !== undefined ? item.actualTime : item.time) || 0;
        });

        days.forEach((b) => {
            if (b.actualMin > 0) {
                b.efficiency = Math.round((b.normMin / b.actualMin) * 100);
            }
        });

        return days;
    }

    function svgEl(tag, attrs = {}) {
        const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [k, v] of Object.entries(attrs)) {
            node.setAttribute(k, String(v));
        }
        return node;
    }

    function renderTrendChart(history) {
        const container = document.getElementById('trendChartContainer');
        const summaryEl = document.getElementById('trendChartSummary');
        if (!container) return;

        const days = buildLast7DaysData(history);
        const totalWgt = days.reduce((s, d) => s + d.weightKg, 0);
        const totalPcs = days.reduce((s, d) => s + d.pieces, 0);
        const totalDt = days.reduce((s, d) => s + d.downtimeMin, 0);
        const totalNorm = days.reduce((s, d) => s + d.normMin, 0);
        const totalAct = days.reduce((s, d) => s + d.actualMin, 0);
        const avgEff = totalAct > 0 ? `${Math.round((totalNorm / totalAct) * 100)}%` : '-';

        if (summaryEl) {
            summaryEl.textContent = `7 dni: ${totalPcs} szt • ${totalWgt.toFixed(1)} kg • Śr. wyd.: ${avgEff} • Postoje: ${totalDt.toFixed(1)} min`;
        }

        const hasAnyData = days.some((d) => d.weightKg > 0 || d.efficiency !== null || d.downtimeMin > 0);
        if (!hasAnyData) {
            const empty = document.createElement('div');
            empty.className = 'chart-empty-msg';
            empty.textContent = 'Brak danych produkcyjnych z ostatnich 7 dni do wyrysowania wykresu.';
            container.replaceChildren(empty);
            return;
        }

        const width = 640;
        const height = 210;
        const padLeft = 44;
        const padRight = 40;
        const padTop = 22;
        const padBottom = 36;
        const plotW = width - padLeft - padRight;
        const plotH = height - padTop - padBottom;

        const maxWeight = Math.max(10, ...days.map((d) => d.weightKg));
        const maxEff = Math.max(120, ...days.map((d) => d.efficiency || 0));

        const svg = svgEl('svg', {
            viewBox: `0 0 ${width} ${height}`,
            class: 'trend-svg',
            role: 'img',
            'aria-label': 'Wykres trendu 7 dni: wyprodukowana waga w kilogramach i wydajność procentowa'
        });

        // Linie siatki poziomej
        [0, 0.5, 1].forEach((frac) => {
            const y = padTop + plotH * (1 - frac);
            svg.appendChild(svgEl('line', {
                x1: padLeft,
                y1: y,
                x2: width - padRight,
                y2: y,
                class: 'chart-grid-line'
            }));
            const lbl = svgEl('text', {
                x: padLeft - 6,
                y: y + 4,
                'text-anchor': 'end',
                class: 'chart-axis-text'
            });
            lbl.textContent = `${Math.round(maxWeight * frac)}kg`;
            svg.appendChild(lbl);
        });

        // Linia odniesienia 100% wydajności
        const y100 = padTop + plotH * (1 - Math.min(1, 100 / maxEff));
        svg.appendChild(svgEl('line', {
            x1: padLeft,
            y1: y100,
            x2: width - padRight,
            y2: y100,
            class: 'chart-ref-line'
        }));
        const lbl100 = svgEl('text', {
            x: width - padRight + 5,
            y: y100 + 4,
            class: 'chart-axis-text chart-axis-ref'
        });
        lbl100.textContent = '100%';
        svg.appendChild(lbl100);

        const slotW = plotW / days.length;
        const barW = Math.min(34, slotW * 0.48);
        const effPoints = [];

        days.forEach((d, idx) => {
            const cx = padLeft + idx * slotW + slotW / 2;
            const barH = (d.weightKg / maxWeight) * plotH;
            const barY = padTop + plotH - barH;

            const rect = svgEl('rect', {
                x: cx - barW / 2,
                y: barY,
                width: barW,
                height: Math.max(2, barH),
                rx: 4,
                class: d.weightKg > 0 ? 'chart-bar' : 'chart-bar-empty'
            });
            const title = svgEl('title');
            title.textContent = `${d.label}: ${d.weightKg.toFixed(1)} kg (${d.pieces} szt), Wydajność: ${d.efficiency !== null ? `${d.efficiency}%` : '-'}, Postoje: ${d.downtimeMin.toFixed(1)} min`;
            rect.appendChild(title);
            svg.appendChild(rect);

            if (d.weightKg > 0) {
                const valTxt = svgEl('text', {
                    x: cx,
                    y: Math.max(padTop + 10, barY - 5),
                    'text-anchor': 'middle',
                    class: 'chart-bar-value'
                });
                valTxt.textContent = `${d.weightKg.toFixed(0)}`;
                svg.appendChild(valTxt);
            }

            const dayTxt = svgEl('text', {
                x: cx,
                y: height - 14,
                'text-anchor': 'middle',
                class: 'chart-day-label'
            });
            dayTxt.textContent = d.label;
            svg.appendChild(dayTxt);

            if (d.efficiency !== null) {
                const effY = padTop + plotH * (1 - Math.min(1, d.efficiency / maxEff));
                effPoints.push({ x: cx, y: effY, eff: d.efficiency, label: d.label });
            }
        });

        if (effPoints.length >= 2) {
            svg.appendChild(svgEl('polyline', {
                points: effPoints.map((p) => `${p.x},${p.y}`).join(' '),
                fill: 'none',
                class: 'chart-eff-line'
            }));
        }

        effPoints.forEach((p) => {
            const dot = svgEl('circle', {
                cx: p.x,
                cy: p.y,
                r: 4.5,
                class: p.eff >= 100 ? 'chart-eff-dot-ok' : 'chart-eff-dot-warn'
            });
            const t = svgEl('title');
            t.textContent = `${p.label}: Wydajność ${p.eff}%`;
            dot.appendChild(t);
            svg.appendChild(dot);
        });

        container.replaceChildren(svg);
    }

    RutaApp.Charts = {
        renderTrendChart
    };
})(window);
