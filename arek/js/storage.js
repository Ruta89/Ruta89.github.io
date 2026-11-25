/**
 * Warstwa danych: synchronizacja historii zleceń z Cloud Firestore oraz pamięcią lokalną (localStorage).
 * Obsługuje walidację i sanityzację rekordów, ochronę przed nadpisaniem pustym cachem offline
 * oraz operacje wsadowe (batch) przy czyszczeniu i imporcie JSON.
 */
(function (global) {
    'use strict';

    const RutaApp = (global.RutaApp = global.RutaApp || {});
    const { FIREBASE_CONFIG, STORAGE_KEYS } = RutaApp.Config;
    const { showToast, updateCloudBadge } = RutaApp.UI;

    const COLLECTION_NAME = 'zawiesia_history';
    const FIRESTORE_BATCH_LIMIT = 500;

    let dbFirestore = null;
    let globalHistory = [];
    let changeListener = null;

    function sanitizeEntry(raw) {
        const rawId = Number(raw?.id);
        const cleanId = Number.isFinite(rawId) && rawId > 0 ? Math.trunc(rawId) : Date.now();
        const isSimple = raw?.type === 'simple';

        const cleanDate = new Date(cleanId);
        const validDate = Number.isFinite(cleanDate.getTime()) ? cleanDate : new Date();
        const fallbackDay = validDate.toLocaleDateString('pl-PL');
        const fallbackTime = validDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

        const rawTime = Number(raw?.time);
        const cleanTime = Number.isFinite(rawTime) && rawTime > 0
            ? Math.min(10000, parseFloat(rawTime.toFixed(1)))
            : 0.1;

        const rawActual = raw?.actualTime !== undefined ? Number(raw.actualTime) : cleanTime;
        const cleanActual = Number.isFinite(rawActual) && rawActual >= 0
            ? Math.min(10000, Math.max(0.1, parseFloat(rawActual.toFixed(1))))
            : cleanTime;

        let cleanL1 = '-';
        let cleanPieces = '-';
        let cleanWeight = '-';

        if (!isSimple) {
            const numL1 = Number(raw?.l1);
            cleanL1 = Number.isFinite(numL1) && numL1 > 0 ? Math.min(1000, parseFloat(numL1.toFixed(2))) : 1.0;

            const numPieces = parseInt(raw?.pieces, 10);
            cleanPieces = Number.isFinite(numPieces) && numPieces >= 1 ? Math.min(1000000, numPieces) : 1;

            const numWeight = Number(raw?.weight);
            cleanWeight = Number.isFinite(numWeight) && numWeight >= 0
                ? Math.min(10000000, parseFloat(numWeight.toFixed(2)))
                : 0;
        }

        const rawSpoolEx = Number(raw?.spoolExchanges);
        const cleanSpoolEx = Number.isFinite(rawSpoolEx) && rawSpoolEx > 0
            ? Math.min(1000, Math.floor(rawSpoolEx))
            : 0;

        const rawTon = String(raw?.ton ?? (isSimple ? 'Prosty' : '1.0')).trim().slice(0, 16);

        return {
            id: cleanId,
            type: isSimple ? 'simple' : 'order',
            dayStr: (typeof raw?.dayStr === 'string' && raw.dayStr.trim() ? raw.dayStr.trim() : fallbackDay).slice(0, 24),
            timeStr: (typeof raw?.timeStr === 'string' && raw.timeStr.trim() ? raw.timeStr.trim() : fallbackTime).slice(0, 16),
            startTimeStr: (typeof raw?.startTimeStr === 'string' && raw.startTimeStr.trim() ? raw.startTimeStr.trim() : '-').slice(0, 16),
            percentage: (typeof raw?.percentage === 'string' && raw.percentage.trim() ? raw.percentage.trim() : '-').slice(0, 16),
            ton: rawTon || (isSimple ? 'Prosty' : '1.0'),
            l1: cleanL1,
            pieces: cleanPieces,
            time: cleanTime,
            actualTime: cleanActual,
            weight: cleanWeight,
            note: typeof raw?.note === 'string' ? raw.note.trim().slice(0, 120) : '',
            spoolExchanges: isSimple ? 0 : cleanSpoolEx
        };
    }

    function loadLocalHistory() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.history);
            const parsed = JSON.parse(raw || '[]');
            if (!Array.isArray(parsed)) return [];
            return parsed
                .filter((item) => item && Number.isFinite(Number(item.id)) && Number(item.id) > 0)
                .map(sanitizeEntry);
        } catch (_) {
            return [];
        }
    }

    function persistLocalHistory(items) {
        try {
            localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(items));
        } catch (err) {
            console.warn('Nie udało się zapisać historii w localStorage:', err);
        }
    }

    function notifyChange() {
        if (typeof changeListener === 'function') {
            changeListener(globalHistory);
        }
    }

    function normalizeAndSort(items) {
        return [...items].sort((a, b) => Number(a.id) - Number(b.id));
    }

    function isCloudEnabled() {
        return Boolean(dbFirestore);
    }

    function getHistory() {
        return globalHistory;
    }

    function init(onChange) {
        changeListener = onChange;

        globalHistory = normalizeAndSort(loadLocalHistory());
        notifyChange();

        if (typeof global.firebase === 'undefined') {
            updateCloudBadge('local', 'Tryb lokalny');
            return;
        }

        try {
            if (!global.firebase.apps || global.firebase.apps.length === 0) {
                global.firebase.initializeApp(FIREBASE_CONFIG);
            }
            dbFirestore = global.firebase.firestore();

            dbFirestore.enablePersistence({ synchronizeTabs: true }).catch(() => {
                dbFirestore.enablePersistence().catch((err) => {
                    console.warn('Tryb offline Firestore niedostępny:', err);
                });
            });

            dbFirestore
                .collection(COLLECTION_NAME)
                .orderBy('id', 'asc')
                .onSnapshot(
                    { includeMetadataChanges: true },
                    (snapshot) => {
                        const cloudItems = [];
                        snapshot.forEach((doc) => {
                            const data = doc.data();
                            if (data && Number.isFinite(Number(data.id)) && Number(data.id) > 0) {
                                cloudItems.push(sanitizeEntry(data));
                            }
                        });

                        // Ochrona przed nadpisaniem lokalnych wpisów pustym buforem offline po świeżym starcie
                        if (cloudItems.length === 0 && snapshot.metadata?.fromCache && globalHistory.length > 0) {
                            updateCloudBadge('offline', 'Chmura: Bufor lokalny');
                            return;
                        }

                        globalHistory = normalizeAndSort(cloudItems);
                        persistLocalHistory(globalHistory);

                        if (!navigator.onLine) {
                            updateCloudBadge('offline', 'Chmura: Offline (bufor)');
                        } else if (snapshot.metadata?.hasPendingWrites) {
                            updateCloudBadge('offline', 'Chmura: Wysyłanie…');
                        } else if (snapshot.metadata?.fromCache) {
                            updateCloudBadge('offline', 'Chmura: Bufor lokalny');
                        } else {
                            updateCloudBadge('online', 'Chmura: Aktywna');
                        }

                        notifyChange();
                    },
                    (error) => {
                        console.error('Błąd pobierania historii z Firestore:', error);
                        updateCloudBadge('error', 'Chmura: Błąd połączenia');
                        globalHistory = normalizeAndSort(loadLocalHistory());
                        notifyChange();
                    }
                );
        } catch (error) {
            console.error('Błąd inicjalizacji Firebase:', error);
            dbFirestore = null;
            updateCloudBadge('error', 'Tryb lokalny (błąd chmury)');
            globalHistory = normalizeAndSort(loadLocalHistory());
            notifyChange();
        }
    }

    function saveEntry(itemObj) {
        const clean = sanitizeEntry(itemObj);
        globalHistory = normalizeAndSort([...globalHistory.filter((i) => i.id !== clean.id), clean]);
        persistLocalHistory(globalHistory);
        notifyChange();

        if (dbFirestore) {
            dbFirestore
                .collection(COLLECTION_NAME)
                .doc(String(clean.id))
                .set(clean)
                .catch((err) => {
                    console.error('Błąd zapisu do Firestore:', err);
                    showToast('Zapisano lokalnie (synchronizacja z chmurą opóźniona).', 'warning');
                });
        }
    }

    function updateEntry(itemObj) {
        const clean = sanitizeEntry(itemObj);
        const idx = globalHistory.findIndex((i) => i.id === clean.id);
        if (idx !== -1) {
            globalHistory[idx] = clean;
        } else {
            globalHistory.push(clean);
        }
        globalHistory = normalizeAndSort(globalHistory);
        persistLocalHistory(globalHistory);
        notifyChange();

        if (dbFirestore) {
            return dbFirestore
                .collection(COLLECTION_NAME)
                .doc(String(clean.id))
                .set(clean)
                .catch((err) => {
                    console.error('Błąd aktualizacji w Firestore:', err);
                    showToast('Zapisano lokalnie, synchronizacja z chmurą opóźniona.', 'warning');
                });
        }
        return Promise.resolve();
    }

    function deleteEntry(id) {
        globalHistory = globalHistory.filter((i) => i.id !== id);
        persistLocalHistory(globalHistory);
        notifyChange();

        if (dbFirestore) {
            return dbFirestore
                .collection(COLLECTION_NAME)
                .doc(String(id))
                .delete()
                .catch((err) => {
                    console.error('Błąd usuwania z Firestore:', err);
                    showToast('Usunięto lokalnie, błąd synchronizacji z chmurą.', 'warning');
                });
        }
        return Promise.resolve();
    }

    async function clearAllEntries() {
        const idsToDelete = globalHistory.map((item) => String(item.id));
        globalHistory = [];
        try {
            localStorage.removeItem(STORAGE_KEYS.history);
        } catch (_) {
            // ignoruj
        }
        notifyChange();

        if (dbFirestore && idsToDelete.length > 0) {
            const colRef = dbFirestore.collection(COLLECTION_NAME);
            for (let i = 0; i < idsToDelete.length; i += FIRESTORE_BATCH_LIMIT) {
                const chunk = idsToDelete.slice(i, i + FIRESTORE_BATCH_LIMIT);
                const batch = dbFirestore.batch();
                chunk.forEach((docId) => {
                    batch.delete(colRef.doc(docId));
                });
                await batch.commit();
            }
        }
    }

    async function importEntries(importedItems) {
        const merged = [...globalHistory];
        const existingIds = new Set(merged.map((item) => Number(item.id)));
        const newlyAdded = [];

        importedItems.forEach((impItem) => {
            const cleanId = Math.trunc(Number(impItem?.id));
            if (!Number.isFinite(cleanId) || cleanId <= 0 || existingIds.has(cleanId)) return;
            existingIds.add(cleanId);

            const cleanItem = sanitizeEntry(Object.assign({}, impItem, { id: cleanId }));
            merged.push(cleanItem);
            newlyAdded.push(cleanItem);
        });

        globalHistory = normalizeAndSort(merged);
        persistLocalHistory(globalHistory);
        notifyChange();

        if (dbFirestore && newlyAdded.length > 0) {
            const colRef = dbFirestore.collection(COLLECTION_NAME);
            for (let i = 0; i < newlyAdded.length; i += FIRESTORE_BATCH_LIMIT) {
                const chunk = newlyAdded.slice(i, i + FIRESTORE_BATCH_LIMIT);
                const batch = dbFirestore.batch();
                chunk.forEach((entry) => {
                    batch.set(colRef.doc(String(entry.id)), entry);
                });
                batch.commit().catch((err) => {
                    console.warn('Kolejkowanie importu w Firestore:', err);
                });
            }
        }

        return {
            addedCount: newlyAdded.length,
            totalCount: globalHistory.length
        };
    }

    RutaApp.Storage = {
        init,
        isCloudEnabled,
        getHistory,
        saveEntry,
        updateEntry,
        deleteEntry,
        clearAllEntries,
        importEntries
    };
})(window);
