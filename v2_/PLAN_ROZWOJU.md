# Plan rozwoju aplikacji Antygravity Czasomierz (`PLAN_ROZWOJU.md`)

Dokument przedstawia rekomendowane kierunki rozwoju projektu z podziałem na horyzont czasowy oraz kluczowe kwestie techniczne, bezpieczeństwa i utrzymania jakości.

---

## 1. Krótkoterminowe cele (szybkie wygrane i szlify)

1. **Optymalizacja SEO, metadanych i instalacji PWA**
   - Dodanie kompletu metadanych Open Graph (`og:title`, `og:description`, `og:image`), favicon w formacie SVG/ICO oraz maskowalnej ikony PWA (`"purpose": "maskable"`) w [manifest.json](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/manifest.json), aby skrót wyglądał spójnie na urządzeniach Android/iOS.
   - Zaktualizowanie reguły `sw.js` o strategię *Stale-While-Revalidate* dla zasobów aplikacji oraz subtelny komunikat toast „Dostępna nowa wersja aplikacji — odśwież”, gdy pojawi się nowy Service Worker.

2. **Dostępność (WCAG) i ergonomia na hali produkcyjnej**
   - Dodanie opcjonalnego **trybu wysokiego kontrastu / jasnego** przydatnego przy mocnym oświetleniu przemysłowym lub w pełnym świetle dziennym.
   - Zwiększenie minimalnych obszarów dotykowych (`min-height: 44px`) dla przycisków korekty czasu i akcji w tabeli na ekranach dotykowych (obsługa w rękawicach roboczych).
   - Dodanie skrótów klawiszowych na desktopie (np. `Spacja` lub `Ctrl+Enter` do startu/stopu timera z potwierdzeniem) oraz czytelnych komunikatów walidacji przy konkretnych polach zamiast jednego ogólnego komunikatu.

3. **Szybkie usprawnienia UI/UX**
   - Wyświetlanie w trakcie pracy Głównego Timera kompaktowego paska podsumowującego bieżące zlecenie (tonaż, `L1`, liczba sztuk, ustawienie licznika), bez konieczności zatrzymywania odliczania.
   - Możliwość wyboru jednostki czasu w formularzu (`godziny dziesiętne` vs `minuty`) przełączanej jednym kliknięciem.
   - Dodanie możliwości edycji wpisów typu `Prosty Timer` oraz dodania opcjonalnej krótkiej notatki do zlecenia (np. numer zlecenia produkcyjnego lub przyczyna przestoju).

---

## 2. Średnioterminowe funkcje (nowe możliwości dla operatorów i brygadzistów)

1. **Podział na zmiany robocze i stanowiska (maszyny)**
   - Wybór aktywnej zmiany (np. I zmiana `06:00–14:00`, II zmiana `14:00–22:00`, III zmiana `22:00–06:00`) oraz numeru stanowiska/maszyny.
   - Automatyczne filtrowanie dziennika i statystyk KPI według wybranej zmiany zamiast sztywnego podziału wyłącznie po dacie kalendarzowej (kluczowe dla zmiany nocnej przechodzącej przez północ).

2. **Rejestracja przestojów i przerw technicznych**
   - Funkcja **Pauza / Postój technologiczny** (np. wymiana szpul, awaria, brak materiału, przezbrojenie) z wyborem powodu postoju.
   - Oddzielenie czasu netto pracy nad zleceniem od czasu postojów, co daje brygadziście prawdziwy obraz wydajności operatora i wąskich gardeł na linii.

3. **Wsparcie wymiany szpul w trakcie zlecenia**
   - Ponieważ kalkulator już wylicza parametr *„Wymiana szpul co X szt”*, aplikacja może przypominać o planowanym przezbrojeniu/wymianie szpul w połowie cyklu lub pozwalać odhaczyć wykonane wymiany.

4. **Wykresy trendów i porównanie wydajności**
   - Prosty widok podsumowania tygodniowego/miesięcznego (np. wykres słupkowy lub liniowy wydajności dziennej i wyprodukowanego tonażu w kg bez ciężkich bibliotek).
   - Eksport raportu zbiorczego gotowego do rozliczenia zmiany (PDF / rozbudowany wydruk z podsumowaniem na górze strony).

5. **Zarządzanie tabelą tonaży z poziomu panelu (bez edycji kodu)**
   - Przeniesienie tabeli `TONNAGE_DB` do dedykowanego dokumentu w Firestore lub pliku JSON z panelem administracyjnym dla technologa, aby zmiana norm wagowych czy liczby szpul nie wymagała zmian w kodzie JS.

---

## 3. Długoterminowa wizja rozwoju projektu

1. **Wielostanowiskowy system produkcyjny (MES Lite)**
   - Rozszerzenie aplikacji z pojedynczego narzędzia stanowiskowego do centralnego pulpitu hali:
     - Widok na żywo (Live Dashboard) dla brygadzisty pokazujący status wszystkich maszyn, aktywne zlecenia, bieżącą wydajność i alarmy przekroczenia czasu.
     - Kolejka zaplanowanych zleceń do wykonania na zmianie (operator wybiera gotowe zlecenie z listy zamiast ręcznego wpisywania wszystkich parametrów).

2. **Automatyzacja i integracje zewnętrzne**
   - **Skaner kodów kreskowych / QR** (poprzez kamerę telefonu lub czytnik USB działający jak klawiatura) do automatycznego wczytywania numeru zlecenia, tonażu, długości `L1` i liczby sztuk z karty technologicznej.
   - **Integracja z systemami ERP / arkuszami Google / webhookami** – automatyczne pobieranie planu produkcji oraz wysyłanie wykonanych raportów po zakończeniu zmiany przez Cloud Functions.
   - **Integracja z bazą magazynową przędzy** – automatyczne pomniejszanie stanu magazynowego przędzy (`66 000` / `132 000 dtex`) na podstawie wyprodukowanej wagi zlecenia.

3. **Analiza historyczna i optymalizacja norm**
   - Wykorzystanie zgromadzonych danych historycznych (norma vs czas faktyczny dla konkretnych tonaży i długości `L1`) do automatycznego wykrywania zaniżonych lub zawyżonych norm technologicznych i sugerowania korekt technologom.

---

## 4. Sugestie techniczne: bezpieczeństwo, testy i utrzymanie kodu

### Bezpieczeństwo (najwyższy priorytet)
- **Zabezpieczenie reguł Cloud Firestore ([firestore.rules](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/firestore.rules)):**
  - Obecnie reguła `allow read, write: if true;` pozwala każdemu z internetu odczytywać, modyfikować i usuwać wszystkie dokumenty w kolekcji `zawiesia_history`.
  - **Rekomendacja:** wdrożyć **Firebase Authentication** (np. logowanie operatorów / konta stanowiskowe lub PIN pracownika mapowany na sesję) oraz **Firebase App Check** (reCAPTCHA Enterprise / Play Integrity), a w regułach Firestore dodać:
    - wymóg `request.auth != null`,
    - ścisłą walidację schematu danych po stronie reguł (typy pól, zakresy liczbowe `> 0`, dozwolone pola przez `keys().hasOnly(...)`),
    - podział uprawnień (operator może dodawać swoje zlecenia, a usuwanie historii lub edycja starszych wpisów wymaga roli brygadzisty w Custom Claims).
- **Ochrona przed wstrzykiwaniem danych z importu JSON:** zachować ścisłą walidację typów w `Storage.importEntries` i budowanie DOM wyłącznie przez `textContent` / `createElement` (bez `innerHTML`), tak jak zostało to zaimplementowane w `v2_improved`.

### Testy automatyczne i jakość
- **Testy jednostkowe (np. Vitest lub wbudowany `node:test`)**:
  - Pokrycie logiki obliczeniowej (`Calculator.computeOrderMetrics`), filtrowania historii (`filterHistory`), parsowania liczb z przecinkiem oraz formatowania czasu i CSV.
- **Testy E2E (np. Playwright)**:
  - Przetestowanie pełnych ścieżek użytkownika: wyliczenie parametrów -> start timera -> odświeżenie strony i weryfikacja wznowienia -> korekta czasu -> zakończenie zlecenia -> edycja w historii -> eksport CSV/JSON.
  - Testy z użyciem emulatorów Firebase (`firebase emulators:start`), aby nie zaśmiecać bazy produkcyjnej podczas weryfikacji.

### Utrzymanie kodu i proces wdrożeń (CI/CD)
- **Przejście w przyszłości na natywne moduły ES (`<script type="module">`)** lub lekki proces budowania (np. Vite + TypeScript) w miarę rozrostu aplikacji, co zapewni statyczną kontrolę typów oraz automatyczne wersjonowanie plików w cache Service Workera.
- **Linter i formater (`ESLint` + `Prettier`)** w repozytorium oraz prosty pipeline GitHub Actions uruchamiający testy i sprawdzający `firestore.rules` przed automatycznym wdrożeniem na Firebase Hosting.
- **Separacja środowisk (`dev` / `prod`)** w `.firebaserc` – osobny projekt Firebase do testów nowych funkcji oraz osobny projekt produkcyjny dla hali.
