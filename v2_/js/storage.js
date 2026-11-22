/**
 * Warstwa danych: synchronizacja historii zleceń z Cloud Firestore oraz pamięcią lokalną (localStorage).
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

    function loadLocalHistory() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.history);
            const parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed : [];
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

        // Natychmiastowy odczyt cache z localStorage przed połączeniem z chmurą
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

            dbFirestore.enablePersistence().catch((err) => {
                console.warn('Tryb offline Firestore niedostępny:', err);
            });

            dbFirestore
                .collection(COLLECTION_NAME)
                .orderBy('id', 'asc')
                .onSnapshot(
                    { includeMetadataChanges: true },
                    (snapshot) => {
                        const cloudItems = [];
                        snapshot.forEach((doc) => {
                            cloudItems.push(doc.data());
                        });
                        globalHistory = normalizeAndSort(cloudItems);
                        persistLocalHistory(globalHistory);

                        if (!navigator.onLine) {
                            updateCloudBadge('offline', 'Chmura: Offline (bufor)');
                        } else if (snapshot.metadata && snapshot.metadata.fromCache) {
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
        globalHistory = normalizeAndSort([...globalHistory.filter((i) => i.id !== itemObj.id), itemObj]);
        persistLocalHistory(globalHistory);
        notifyChange();

        if (dbFirestore) {
            dbFirestore
                .collection(COLLECTION_NAME)
                .doc(String(itemObj.id))
                .set(itemObj)
                .catch((err) => {
                    console.error('Błąd zapisu do Firestore:', err);
                    showToast('Zapisano lokalnie (chmura niedostępna).', 'warning');
                });
        }
    }

    function updateEntry(itemObj) {
        const idx = globalHistory.findIndex((i) => i.id === itemObj.id);
        if (idx !== -1) {
            globalHistory[idx] = itemObj;
        } else {
            globalHistory.push(itemObj);
        }
        globalHistory = normalizeAndSort(globalHistory);
        persistLocalHistory(globalHistory);
        notifyChange();

        if (dbFirestore) {
            return dbFirestore
                .collection(COLLECTION_NAME)
                .doc(String(itemObj.id))
                .set(itemObj)
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
            // ignoruj błędy storage
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
            const cleanId = Number(impItem.id);
            if (existingIds.has(cleanId)) return;
            existingIds.add(cleanId);

            const isSimple = impItem.type === 'simple';
            const cleanDate = new Date(cleanId);
            const fallbackDay = Number.isFinite(cleanDate.getTime()) ? cleanDate.toLocaleDateString('pl-PL') : '';
            const fallbackTime = Number.isFinite(cleanDate.getTime())
                ? cleanDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
                : '';
            const cleanNote = typeof impItem.note === 'string' ? impItem.note.trim().slice(0, 120) : '';
            const cleanItem = {
                id: cleanId,
                type: isSimple ? 'simple' : 'order',
                dayStr: typeof impItem.dayStr === 'string' && impItem.dayStr ? impItem.dayStr : fallbackDay,
                timeStr: typeof impItem.timeStr === 'string' && impItem.timeStr ? impItem.timeStr : fallbackTime,
                startTimeStr: typeof impItem.startTimeStr === 'string' ? impItem.startTimeStr : '-',
                percentage: typeof impItem.percentage === 'string' ? impItem.percentage : '-',
                ton: String(impItem.ton ?? ''),
                l1: isSimple ? '-' : Number.isFinite(Number(impItem.l1)) ? Number(impItem.l1) : String(impItem.l1 ?? '-'),
                pieces: isSimple ? '-' : Number.isFinite(Number(impItem.pieces)) ? Number(impItem.pieces) : String(impItem.pieces ?? '-'),
                time: Number(impItem.time),
                actualTime: Number.isFinite(Number(impItem.actualTime)) ? Number(impItem.actualTime) : Number(impItem.time),
                weight: isSimple ? '-' : Number.isFinite(Number(impItem.weight)) ? Number(impItem.weight) : String(impItem.weight ?? '-'),
                note: cleanNote
            };
            merged.push(cleanItem);
            newlyAdded.push(cleanItem);
        });

        globalHistory = normalizeAndSort(merged);
        persistLocalHistory(globalHistory);
        notifyChange();

        if (dbFirestore && newlyAdded.length > 0 && navigator.onLine) {
            const colRef = dbFirestore.collection(COLLECTION_NAME);
            for (let i = 0; i < newlyAdded.length; i += FIRESTORE_BATCH_LIMIT) {
                const chunk = newlyAdded.slice(i, i + FIRESTORE_BATCH_LIMIT);
                const batch = dbFirestore.batch();
                chunk.forEach((entry) => {
                    batch.set(colRef.doc(String(entry.id)), entry);
                });
                await batch.commit();
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
