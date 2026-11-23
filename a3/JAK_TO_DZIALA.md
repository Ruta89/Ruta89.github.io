# Jak działa aplikacja Antygravity Czasomierz (`v3`)

## 1. Główny cel aplikacji

**Antygravity Czasomierz v3** to aplikacja internetowa (PWA) dla operatorów maszyn produkcyjnych (produkcja zawiesi wężowych) oraz brygadzistów nadzorujących zmianę.

Wersja `v3` rozszerza dotychczasowy kalkulator i timer normatywny o pełną obsługę **zmian roboczych (w tym zmiany nocnej)**, **stanowisk/maszyn**, **pauz i postojów technologicznych**, **trackera wymiany szpul**, **wykresów trendu 7 dni w natywnym SVG** oraz **Panelu Technologa** do edycji tabeli tonaży bez ingerencji w kod źródłowy.

---

## 2. Struktura plików projektu

| Plik / Folder | Rola w projekcie |
| :--- | :--- |
| `index.html` | Główny szkielet HTML aplikacji: pasek wyboru zmiany i stanowiska, trzy zakładki (*Kalkulator & Timer*, *Prosty Timer*, *Dziennik & Statystyki*), wykres 7 dni, blok raportu wydruku oraz okna `<dialog>` (edycja wpisu, wybór powodu postoju, Panel Technologa, potwierdzenia). |
| `style.css` | System stylów w trybie ciemnym i jasnym wysokiego kontrastu (`prefers-contrast`, `forced-colors`), style banerów postoju, trackera szpul, natywnego wykresu SVG, modali oraz raportu `@media print`. |
| `js/theme-init.js` | Synchroniczne ustawienie motywu (`light` / `dark`) przed pierwszym renderem, zgodne z CSP (bez skryptów inline). |
| `js/config.js` | Konfiguracja aplikacji: dynamiczna tabela tonaży (`DEFAULT_TONNAGE_DB` + modyfikacje użytkownika), definicje zmian (`I`, `II`, `III`), domyślne stanowiska, powody postojów, norma dzienna oraz ikony SVG. |
| `js/ui.js` | Narzędzia UI: powiadomienia toast (Top Layer Popover API), tworzenie ikon SVG, obsługa `<dialog>`, walidacja per pole z ARIA, wyznaczanie daty roboczej zmiany (`getShiftInfoForDate`) oraz formatowanie czasu. |
| `js/storage.js` | Warstwa danych: bezpieczna synchronizacja `zawiesia_history` oraz zdalnej konfiguracji `zawiesia_config` między `localStorage` a Cloud Firestore (z obsługą kolejkowania offline). |
| `js/calculator.js` | Silnik obliczeń technologicznych (`licznik`, `szpule`, `dtex`, `waga 1 szt.`, `waga łączna`, `wymiana szpul co X szt.` i liczba przewidywanych wymian) oraz dynamiczne wypełnianie list `<select>` tonażu. |
| `js/audio.js` | Sygnały Web Audio API (`2 min`, `1 min`, `30 s`, alarm przekroczenia, sygnał wymiany szpul i pauzy), powiadomienia systemowe, Wake Lock oraz automatyczne odblokowanie audio po pierwszym geście po odświeżeniu karty. |
| `js/timer.js` | Silnik odliczania czasu z obsługą **pauzy / postoju technologicznego** (zamrożenie odliczania normy, osobny stoper postoju, historia postojów), liczeniem wydajności względem czasu netto oraz bezpiecznym anulowaniem bez zapisu. |
| `js/charts.js` | Zero-dependency generator wykresu SVG za ostatnie 7 dni roboczych (słupki wagi w kg, linia wydajności %, linia celu 100% i podsumowanie postojów). |
| `js/settings.js` | Panel Technologa: edycja, dodawanie, usuwanie i resetowanie rekordów `TONNAGE_DB`, zmiana normy dziennej oraz listy maszyn z zapisem lokalnym i synchronizacją w Firestore. |
| `js/history.js` | Dziennik produkcji i KPI: statystyki bieżącej zmiany (sztuki, waga, efektywność netto, postoje), filtrowanie po zmianie i stanowisku, edycja z uwzględnieniem postojów, bezpieczny eksport CSV (ochrona przed CSV Formula Injection) oraz raport wydruku. |
| `js/app.js` | Moduł startowy wiążący zdarzenia DOM, kontekst zmiany/stanowiska, tracker wymiany szpul, skróty klawiszowe (`Ctrl+Enter`, `Spacja`, `P`, `Esc`) oraz aktualizację Service Workera. |
| `sw.js` | Service Worker ze strategią *Stale-While-Revalidate* (cache `antygravity-czasomierz-v3-0`) i obsługą aktualizacji bez utraty danych. |
| `firestore.rules` | Reguły bezpieczeństwa Cloud Firestore ze ścisłą walidacją schematu dokumentów `zawiesia_history` i `zawiesia_config`. |
| `firebase.json` / `.firebaserc` | Konfiguracja Firebase Hosting (nagłówki CSP, cache) oraz projektu docelowego. |

---

## 3. Kluczowe mechanizmy wprowadzone w `v3`

### Zmiany robocze i zmiana nocna
Aplikacja wykrywa bieżącą zmianę (`I: 06:00–14:00`, `II: 14:00–22:00`, `III: 22:00–06:00`) lub pozwala wybrać ją ręcznie w nagłówku. Dla III zmiany wpisy zapisane między `00:00` a `05:59` otrzymują datę roboczą `shiftDate` odpowiadającą dniu rozpoczęcia zmiany, dzięki czemu statystyki KPI i pasek postępu nie dzielą się o północy.

### Pauza / Postój technologiczny vs czas netto
Podczas pracy timera kliknięcie **Pauza / Postój** (lub klawisz `P`) otwiera wybór powodu postoju (*Wymiana szpul*, *Przezbrojenie*, *Awaria maszyny*, *Brak materiału*, *Przerwa / Inne*). Odliczanie czasu normatywnego zostaje wstrzymane, a aplikacja rejestruje czas postoju osobno. Po zakończeniu zlecenia zapisywany jest zarówno czas pracy netto (`actualTime`), jak i suma postojów (`downtimeMinutes`) z listą powodów (`downtimes`).

### Tracker wymiany szpul
Jeżeli liczba sztuk w zleceniu przekracza wyliczony parametr `Wymiana szpul co X szt`, w pasku aktywnego zlecenia pojawia się licznik wymian z możliwością ich odznaczania (`+ Odznacz wymianę`), jednoklikowego przejścia w postój `Wymiana szpul` oraz automatycznego powiadomienia dźwiękowego i wizualnego w trakcie cyklu.

### Bezpieczeństwo eksportu CSV i bazy Firestore
- Eksport CSV neutralizuje komórki rozpoczynające się od znaków `=`, `+`, `-`, `@` (ochrona przed CSV Formula Injection w Excelu).
- Reguły `firestore.rules` weryfikują listę dozwolonych pól (`hasOnly`), typy danych oraz dopuszczalne zakresy liczbowe.
