/**
 * Warstwa danych v3: synchronizacja historii zleceń oraz konfiguracji technologicznej
 * z Cloud Firestore i pamięcią lokalną (localStorage) bez gubienia wpisów offline.
 */
(function (global) {
    'use strict';

    const RutaApp = (global.RutaApp = global.RutaApp || {});
    const Config = RutaApp.Config;
    const { FIREBASE_CONFIG, STORAGE_KEYS } = Config;
    const { showToast, updateCloudBadge, getShiftInfoForDate } = RutaApp.UI;

    const COLLECTION_NAME = 'zawiesia_history';
    const CONFIG_COLLECTION = 'zawiesia_config';
    const FIRESTORE_BATCH_LIMIT = 500;

    let dbFirestore = null;
    let globalHistory = [];
    let changeListener = null;
    let configChangeListener = null;

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

    function notifyConfigChange() {
        if (typeof configChangeListener === 'function') {
            configChangeListener();
        }
    }

    function sanitizeDowntimes(raw) {
        if (!Array.isArray(raw)) return [];
        return raw
            .slice(0, 50)
            .map((d) => ({
                reasonId: typeof d?.reasonId === 'string' ? d.reasonId.slice(0, 24) : 'break',
                reasonLabel: typeof d?.reasonLabel === 'string' ? d.reasonLabel.trim().slice(0, 40) : 'Postój',
                durationMin: Number.isFinite(Number(d?.durationMin)) ? Math.max(0, Number(Number(d.durationMin).toFixed(1))) : 0
            }))
            .filter((d) => d.durationMin >= 0);
    }

    function sanitizeEntry(raw) {
        const cleanId = Number(raw?.id);
        const isSimple = raw?.type === 'simple';
        const cleanDate = new Date(cleanId);
        const validDate = Number.isFinite(cleanDate.getTime()) ? cleanDate : new Date();
        const fallbackDay = validDate.toLocaleDateString('pl-PL');
        const fallbackTime = validDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        const shiftMeta = getShiftInfoForDate(validDate, raw?.shift || null);

        const downtimeList = sanitizeDowntimes(raw?.downtimes);
        const downtimeMinutes = Number.isFinite(Number(raw?.downtimeMinutes))
            ? Math.max(0, Number(Number(raw.downtimeMinutes).toFixed(1)))
            : Number(downtimeList.reduce((acc, d) => acc + d.durationMin, 0).toFixed(1));

        const entry = {
            id: cleanId,
            type: isSimple ? 'simple' : 'order',
            dayStr: typeof raw?.dayStr === 'string' && raw.dayStr ? raw.dayStr : fallbackDay,
            timeStr: typeof raw?.timeStr === 'string' && raw.timeStr ? raw.timeStr : fallbackTime,
            startTimeStr: typeof raw?.startTimeStr === 'string' ? raw.startTimeStr : '-',
            percentage: typeof raw?.percentage === 'string' ? raw.percentage : '-',
            ton: String(raw?.ton ?? (isSimple ? 'Prosty' : '')),
            l1: isSimple ? '-' : Number.isFinite(Number(raw?.l1)) ? Number(raw.l1) : String(raw?.l1 ?? '-'),
            pieces: isSimple ? '-' : Number.isFinite(Number(raw?.pieces)) ? Number(raw.pieces) : String(raw?.pieces ?? '-'),
            time: Math.max(0.1, Number(raw?.time) || 0.1),
            actualTime: Number.isFinite(Number(raw?.actualTime)) ? Math.max(0, Number(raw.actualTime)) : Math.max(0.1, Number(raw?.time) || 0.1),
            weight: isSimple ? '-' : Number.isFinite(Number(raw?.weight)) ? Number(raw.weight) : String(raw?.weight ?? '-'),
            note: typeof raw?.note === 'string' ? raw.note.trim().slice(0, 120) : '',
            shift: raw?.shift === 'I' || raw?.shift === 'II' || raw?.shift === 'III' ? raw.shift : shiftMeta.shift,
            shiftDate: typeof raw?.shiftDate === 'string' && raw.shiftDate ? raw.shiftDate.slice(0, 16) : shiftMeta.shiftDate,
            station: typeof raw?.station === 'string' ? raw.station.trim().slice(0, 32) : '',
            downtimeMinutes,
            downtimes: downtimeList,
            spoolExchanges: Number.isFinite(Number(raw?.spoolExchanges)) ? Math.max(0, Math.floor(Number(raw.spoolExchanges))) : 0
        };
        return entry;
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

    function init(onChange, onConfigChange = null) {
        changeListener = onChange;
        configChangeListener = onConfigChange;

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

                        // Ochrona przed nadpisaniem lokalnych wpisów pustym buforem offline
                        if (cloudItems.length === 0 && snapshot.metadata?.fromCache && globalHistory.length > 0) {
                            updateCloudBadge('offline', 'Chmura: Bufor lokalny');
                            return;
                        }

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

            // Nasłuch zdalnej konfiguracji technologicznej (TONNAGE_DB i app_settings)
            dbFirestore
                .collection(CONFIG_COLLECTION)
                .doc('tonnage_db')
                .onSnapshot(
                    (doc) => {
                        if (doc.exists && doc.data()?.entries) {
                            if (Config.setTonnageDb(doc.data().entries, true)) {
                                notifyConfigChange();
                            }
                        }
                    },
                    () => {
                        // Brak konfiguracji w chmurze nie blokuje aplikacji
                    }
                );

            dbFirestore
                .collection(CONFIG_COLLECTION)
                .doc('app_settings')
                .onSnapshot(
                    (doc) => {
                        if (doc.exists && doc.data()) {
                            Config.updateAppSettings(doc.data(), true);
                            notifyConfigChange();
                        }
                    },
                    () => {}
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
                    showToast('Zapisano lokalnie (synchronizacja w toku).', 'warning');
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
            const cleanId = Number(impItem.id);
            if (!Number.isFinite(cleanId) || cleanId <= 0 || existingIds.has(cleanId)) return;
            existingIds.add(cleanId);

            const cleanItem = sanitizeEntry(impItem);
            merged.push(cleanItem);
            newlyAdded.push(cleanItem);
        });

        globalHistory = normalizeAndSort(merged);
        persistLocalHistory(globalHistory);
        notifyChange();

        // Kolejkujemy zapis w Firestore również offline (SDK zsynchronizuje po powrocie sieci)
        if (dbFirestore && newlyAdded.length > 0) {
            const colRef = dbFirestore.collection(COLLECTION_NAME);
            for (let i = 0; i < newlyAdded.length; i += FIRESTORE_BATCH_LIMIT) {
                const chunk = newlyAdded.slice(i, i + FIRESTORE_BATCH_LIMIT);
                const batch = dbFirestore.batch();
                chunk.forEach((entry) => {
                    batch.set(colRef.doc(String(entry.id)), entry);
                });
                batch.commit().catch((err) => {
                    console.warn('Kolejkowanie importu Firestore:', err);
                });
            }
        }

        return {
            addedCount: newlyAdded.length,
            totalCount: globalHistory.length
        };
    }

    async function syncTonnageDbToCloud(dbObj) {
        if (!dbFirestore) return false;
        try {
            await dbFirestore.collection(CONFIG_COLLECTION).doc('tonnage_db').set({
                updatedAt: Date.now(),
                entries: dbObj
            });
            return true;
        } catch (err) {
            console.warn('Nie udało się zsynchronizować TONNAGE_DB z chmurą:', err);
            return false;
        }
    }

    async function syncAppSettingsToCloud(settingsObj) {
        if (!dbFirestore) return false;
        try {
            await dbFirestore.collection(CONFIG_COLLECTION).doc('app_settings').set({
                updatedAt: Date.now(),
                dailyNormMinutes: settingsObj.dailyNormMinutes,
                stations: settingsObj.stations
            });
            return true;
        } catch (err) {
            console.warn('Nie udało się zsynchronizować ustawień z chmurą:', err);
            return false;
        }
    }

    RutaApp.Storage = {
        init,
        isCloudEnabled,
        getHistory,
        saveEntry,
        updateEntry,
        deleteEntry,
        clearAllEntries,
        importEntries,
        syncTonnageDbToCloud,
        syncAppSettingsToCloud
    };
})(window);
