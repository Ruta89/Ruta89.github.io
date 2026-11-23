# Plan rozwoju aplikacji Antygravity Czasomierz (`v3` -> `v4`)

## 1. Zrealizowano w wersji `v3`
- Podział na zmiany robocze (`I`, `II`, `III` z poprawną datą roboczą dla zmiany nocnej przez północ) oraz przypisywanie zleceń do stanowisk/maszyn.
- Pauza / Postój technologiczny z wyborem powodu, rozdzieleniem czasu pracy netto od postojów oraz bezpieczne anulowanie odliczania bez zapisu.
- Tracker wymiany szpul z przypomnieniem w trakcie zlecenia.
- Natywny wykres trendu 7 dni w SVG (waga, wydajność, postoje) oraz rozbudowany raport wydruku z podsumowaniem na górze strony.
- Panel Technologa do edycji `TONNAGE_DB`, normy zmiany i listy maszyn bez edycji kodu.
- Walidacja schematu w `firestore.rules` oraz ochrona przed CSV Formula Injection.

---

## 2. Kolejne kroki (wersja `v4` — bezpieczeństwo i integracje hali)

1. **Autoryzacja użytkowników i role (Firebase Authentication + App Check)**
   - Dodanie logowania kontem stanowiskowym lub krótkim kodem PIN operatora.
   - Podmiana `allow read, write: if true` w `firestore.rules` na weryfikację `request.auth != null` oraz role (operator / brygadzista / technolog).

2. **Pulpit brygadzisty na żywo (Live Hall Dashboard)**
   - Publikowanie statusu aktywnego stanowiska (`praca` / `postój` / `przekroczenie normy`) do kolekcji `zawiesia_live_status` w Firestore, aby brygadzista widział wszystkie maszyny na jednym ekranie.

3. **Skaner kodów kreskowych / QR ze zleceń IFS**
   - Obsługa czytnika USB (tryb klawiatury) lub kamery telefonu do automatycznego wczytywania numeru zlecenia, tonażu, długości `L1` i liczby sztuk z etykiety produkcyjnej.

4. **Testy automatyczne i CI/CD**
   - Testy jednostkowe (`node:test` / Vitest) dla `calculator.js`, `ui.js` (logika zmian nocnych) i `history.js` (filtrowanie, CSV).
   - Testy E2E w Playwright z emulatorem Firebase oraz automatyczny deploy przez GitHub Actions.
