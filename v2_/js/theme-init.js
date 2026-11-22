/**
 * Synchroniczna inicjalizacja motywu (light/dark) przed pierwszym renderem,
 * zgodna z polityką CSP (brak skryptów inline).
 */
(function () {
    'use strict';

    var stored = null;
    try {
        stored = window.localStorage.getItem('color-scheme');
    } catch (_) {
        stored = null;
    }

    var isExplicit = stored === 'light' || stored === 'dark';
    var schemeContent = isExplicit ? stored : 'light dark';

    var colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (colorSchemeMeta) {
        colorSchemeMeta.setAttribute('content', schemeContent);
    }

    var prefersDark = false;
    try {
        prefersDark = Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (_) {
        prefersDark = false;
    }

    var effective = isExplicit ? stored : (prefersDark ? 'dark' : 'light');
    var themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', effective === 'light' ? '#f1f5f9' : '#0b0f19');
    }
})();
