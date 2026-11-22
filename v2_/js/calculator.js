/**
 * Logika obliczeń parametrów produkcji zawiesi.
 */
(function (global) {
    'use strict';

    const RutaApp = (global.RutaApp = global.RutaApp || {});
    const { TONNAGE_DB } = RutaApp.Config;
    const { parseDecimal } = RutaApp.UI;

    function computeOrderMetrics(tonVal, rawLength, rawPieces) {
        const t = TONNAGE_DB[tonVal];
        if (!t) return null;

        const L1 = Number.isFinite(rawLength) && rawLength > 0 ? rawLength : 1.0;
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
        const exchangePieces = unitWeight > 0 ? Math.max(0, Math.floor((t.spools * 15) / unitWeight)) : 0;

        return {
            tonnage: tonVal,
            L1,
            pieces,
            spools: t.spools,
            dtex,
            counter: finalCnt,
            unitWeight,
            totalWeight,
            exchangePieces
        };
    }

    function calculateValues(dontShowIfEmpty = false) {
        const tonnageInput = document.getElementById('tonnage');
        const lengthInput = document.getElementById('length');
        const piecesInput = document.getElementById('pieces');
        const calcResults = document.getElementById('calcResults');

        if (!tonnageInput || !lengthInput || !piecesInput) return null;
        if (dontShowIfEmpty && (lengthInput.value === '' || piecesInput.value === '')) return null;

        const parsedLength = parseDecimal(lengthInput.value);
        const parsedPieces = parseInt(piecesInput.value, 10);

        const metrics = computeOrderMetrics(tonnageInput.value, parsedLength, parsedPieces);
        if (!metrics) return null;

        const outWeight = document.getElementById('out-weight');
        const outCounter = document.getElementById('out-counter');
        const outExchange = document.getElementById('out-exchange');
        const outDtex = document.getElementById('out-dtex');
        const outSpools = document.getElementById('out-spools');
        const outUnitWeight = document.getElementById('out-unit-weight');

        if (calcResults) calcResults.style.display = 'block';
        if (outDtex) outDtex.textContent = metrics.dtex;
        if (outSpools) outSpools.textContent = `${metrics.spools} szt`;
        if (outUnitWeight) outUnitWeight.textContent = `${metrics.unitWeight.toFixed(2)} kg`;
        if (outWeight) outWeight.textContent = `${metrics.totalWeight.toFixed(2)} kg`;
        if (outCounter) outCounter.textContent = String(metrics.counter);
        if (outExchange) outExchange.textContent = `${metrics.exchangePieces} szt`;

        return metrics;
    }

    function resetCalculatedOutputs() {
        ['out-counter', 'out-spools', 'out-dtex', 'out-unit-weight', 'out-weight', 'out-exchange'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
    }

    RutaApp.Calculator = {
        computeOrderMetrics,
        calculateValues,
        resetCalculatedOutputs
    };
})(window);
