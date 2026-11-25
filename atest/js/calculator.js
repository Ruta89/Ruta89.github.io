/**
 * Silnik obliczeń technologicznych produkcji zawiesi wężowych:
 * interpolacja liniowa nastawy licznika (E_RS), wagi jednostkowej i zużycia przędzy (E_ges),
 * dobór przędzy (dtex), liczba zwojów, obwód (UL = 2×L1), wymiana szpul oraz dobór gurtu.
 */
(function (global) {
    'use strict';

    const RutaApp = (global.RutaApp = global.RutaApp || {});
    const { TONNAGE_DB, getSortedTonnageKeys, getTonnageColorInfo } = RutaApp.Config;
    const { parseDecimal } = RutaApp.UI;

    function populateTonnageSelect(selectEl, preferredValue = null) {
        if (!selectEl) return;
        const keys = getSortedTonnageKeys();
        const current = preferredValue || selectEl.value || '1.0';
        const fragment = document.createDocumentFragment();

        keys.forEach((key) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = `${key} t`;
            fragment.appendChild(opt);
        });

        selectEl.replaceChildren(fragment);
        if (keys.includes(current)) {
            selectEl.value = current;
        } else if (keys.includes('1.0')) {
            selectEl.value = '1.0';
        } else if (keys.length > 0) {
            selectEl.value = keys[0];
        }
    }

    function populateAllTonnageSelects() {
        populateTonnageSelect(document.getElementById('tonnage'));
        populateTonnageSelect(document.getElementById('edit-ton'));
    }

    function computeOrderMetrics(tonVal, rawLength, rawPieces) {
        const t = TONNAGE_DB[tonVal];
        if (!t) return null;

        const L1 = Number.isFinite(rawLength) && rawLength > 0 ? rawLength : 1.0;
        const UL = L1 * 2.0;
        const pieces = Number.isFinite(rawPieces) && rawPieces > 0 ? Math.floor(rawPieces) : 1;

        const mCnt = t.cnt2 - t.cnt1;
        const addCnt = t.cnt1 - mCnt;
        const finalCnt = Math.max(0, Math.round(mCnt * L1 + addCnt));

        const mWgt = t.wgt2 - t.wgt1;
        const addWgt = t.wgt1 - mWgt;
        const unitWeight = Math.max(0.001, mWgt * L1 + addWgt);
        const totalWeight = unitWeight * pieces;

        const isLarge = parseFloat(tonVal) >= 5.0;
        const dtex = isLarge ? '132 000' : '66 000';
        const windings = t.windings ? t.windings : Math.round(t.cnt1 / 2);

        const exchangePieces = unitWeight > 0 ? Math.max(0, Math.floor((t.spools * 15) / unitWeight)) : 0;
        const expectedExchanges =
            exchangePieces > 0 && pieces > exchangePieces ? Math.floor((pieces - 1) / exchangePieces) : 0;

        let unitYarn = null;
        let totalYarn = null;
        if (t.yarn1 && t.yarn2) {
            const mYarn = t.yarn2 - t.yarn1;
            const addYarn = t.yarn1 - mYarn;
            unitYarn = Math.max(0, Math.round(mYarn * L1 + addYarn));
            totalYarn = unitYarn * pieces;
        }

        const colorInfo = getTonnageColorInfo(tonVal);

        return {
            tonnage: tonVal,
            L1,
            UL,
            pieces,
            spools: t.spools,
            dtex,
            windings,
            sleeve: t.sleeve || null,
            unitYarn,
            totalYarn,
            gurt: t.gurt || null,
            gurtOverlap: t.gurtOverlap || null,
            colorInfo,
            counter: finalCnt,
            unitWeight,
            totalWeight,
            exchangePieces,
            expectedExchanges
        };
    }

    function calculateValues(dontShowIfEmpty = false) {
        const tonnageInput = document.getElementById('tonnage');
        const lengthInput = document.getElementById('length');
        const piecesInput = document.getElementById('pieces');
        const calcResults = document.getElementById('calcResults');
        const lengthUlHelper = document.getElementById('lengthUlHelper');
        const colorPill = document.getElementById('tonnageColorPill');

        if (!tonnageInput || !lengthInput || !piecesInput) return null;

        const colorInfo = getTonnageColorInfo(tonnageInput.value);
        if (colorPill) {
            colorPill.textContent = `Kolor: ${colorInfo.label}`;
            colorPill.style.borderColor = colorInfo.color;
            colorPill.style.color = colorInfo.color;
        }

        const parsedLength = parseDecimal(lengthInput.value);
        if (lengthUlHelper) {
            lengthUlHelper.textContent =
                Number.isFinite(parsedLength) && parsedLength > 0
                    ? `UL: ${(parsedLength * 2).toFixed(2)} m`
                    : 'UL: -- m';
        }

        if (dontShowIfEmpty && (lengthInput.value === '' || piecesInput.value === '')) return null;

        const parsedPieces = parseInt(piecesInput.value, 10);
        const metrics = computeOrderMetrics(tonnageInput.value, parsedLength, parsedPieces);
        if (!metrics) return null;

        if (calcResults) calcResults.style.display = 'block';

        const outCounter = document.getElementById('out-counter');
        const outSpoolsDtex = document.getElementById('out-spools-dtex');
        const outWindings = document.getElementById('out-windings');
        const outUl = document.getElementById('out-ul');
        const outUnitWeight = document.getElementById('out-unit-weight');
        const outWeight = document.getElementById('out-weight');
        const outExchange = document.getElementById('out-exchange');
        const gurtSection = document.getElementById('gurtSection');
        const outGurtWidth = document.getElementById('out-gurt-width');
        const outGurtOverlap = document.getElementById('out-gurt-overlap');

        const spoolWord = metrics.spools === 1 ? 'szpula' : metrics.spools < 5 ? 'szpule' : 'szpul';
        if (outCounter) outCounter.textContent = String(metrics.counter);
        if (outSpoolsDtex) outSpoolsDtex.textContent = `${metrics.spools} ${spoolWord} [${metrics.dtex} dtex]`;
        if (outWindings) {
            outWindings.textContent = metrics.sleeve
                ? `${metrics.windings} (rękaw ${metrics.sleeve})`
                : String(metrics.windings);
        }
        if (outUl) outUl.textContent = `${metrics.UL.toFixed(2)} m`;
        if (outUnitWeight) outUnitWeight.textContent = `${metrics.unitWeight.toFixed(3)} kg`;
        if (outWeight) outWeight.textContent = `${metrics.totalWeight.toFixed(2)} kg`;
        if (outExchange) {
            outExchange.textContent = metrics.exchangePieces > 0 ? `${metrics.exchangePieces} szt` : 'Co 1 szt';
        }

        if (gurtSection) {
            if (metrics.gurt) {
                gurtSection.hidden = false;
                if (outGurtWidth) outGurtWidth.textContent = metrics.gurt;
                if (outGurtOverlap) outGurtOverlap.textContent = metrics.gurtOverlap || '1,0 m';
            } else {
                gurtSection.hidden = true;
            }
        }

        return metrics;
    }

    function resetCalculatedOutputs() {
        [
            'out-counter',
            'out-spools-dtex',
            'out-windings',
            'out-ul',
            'out-time-piece',
            'out-unit-weight',
            'out-weight',
            'out-exchange'
        ].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });

        const gurtSection = document.getElementById('gurtSection');
        if (gurtSection) gurtSection.hidden = true;

        const lengthUlHelper = document.getElementById('lengthUlHelper');
        if (lengthUlHelper) lengthUlHelper.textContent = 'UL: -- m';
    }

    RutaApp.Calculator = {
        populateTonnageSelect,
        populateAllTonnageSelects,
        computeOrderMetrics,
        calculateValues,
        resetCalculatedOutputs
    };
})(window);
