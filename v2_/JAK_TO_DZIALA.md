# Jak działa aplikacja Antygravity Czasomierz (`v2_improved`)

## 1. Główny cel aplikacji i problem, jaki rozwiązuje

**Antygravity Czasomierz** to aplikacja internetowa (PWA) stworzona z myślą o operatorach maszyn produkcyjnych (w szczególności przy produkcji zawiesi pasowych/wężowych) oraz brygadzistach kontrolujących przebieg zmiany.

Na stanowisku produkcyjnym operator przed rozpoczęciem każdego zlecenia musi szybko ustalić parametry nastaw maszyn i zużycia materiału oraz zmierzyć faktyczny czas wykonania partii względem normy zakładowej. Wcześniej wiązało się to z ręcznym szukaniem danych w tabelach papierowych, przeliczaniem na kalkulatorze i zapisywaniem wyników w zeszycie.

Aplikacja rozwiązuje te problemy w jednym miejscu:
- **Automatyzuje obliczenia technologiczne** – na podstawie wybranego tonażu (od `0.5 t` do `300.0 t`), długości roboczej `L1 [m]` oraz liczby sztuk błyskawicznie wylicza ustawienie licznika maszyny, liczbę szpul, rodzaj przędzy (`dtex`), wagę jednej sztuki, łączną wagę zlecenia oraz częstotliwość wymiany szpul.
- **Pilnuje czasu normatywnego** – przelicza dziesiętne godziny normy (np. `0.5` godz = 30 min) na odliczanie z wizualnym pierścieniem postępu, alarmem dźwiękowym i sygnałami ostrzegawczymi przed końcem czasu (`2 min`, `1 min`, `30 s`).
- **Mierzy przekroczenia i wydajność** – po dojściu do zera timer nie zatrzymuje się, lecz liczy czas przekroczenia („na minusie”) i na bieżąco wylicza procentową wydajność zlecenia (`norma / czas faktyczny × 100%`).
- **Prowadzi dziennik produkcji i statystyki zmiany** – zapisuje zakończone zlecenia, podlicza dzienny czas pracy względem normy zmiany (`450 min`), synchronizuje dane w chmurze i pozwala na eksport do CSV, kopii zapasowej JSON oraz wydruk raportu dla brygadzisty.
- **Działa również bez internetu** – dzięki Service Workerowi, pamięci `localStorage` i lokalnemu buforowi Firestore aplikacja nie gubi aktywnego odliczania ani po odświeżeniu karty, ani przy utracie zasięgu Wi-Fi na hali.

---

## 2. Struktura plików i rola każdego z nich

Wersja `v2_improved` została uporządkowana modułowo, aby każdy element odpowiadał za jedną, wyraźnie określoną część aplikacji:

| Plik / Folder | Rola w projekcie |
| :--- | :--- |
| [index.html](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/index.html) | Główny szkielet HTML strony: nagłówek z plakietkami statusu, trzy panele zakładek (*Kalkulator & Timer*, *Prosty Timer*, *Dziennik & Statystyki*), modal edycji zlecenia, okno potwierdzenia usuwania oraz podłączenie bibliotek Firebase i skryptów aplikacji. |
| [style.css](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/style.css) | System stylów w ciemnym motywie o wysokim kontraście: układ kartowy i responsywny, style zegara pierścieniowego, kolory stanów ostrzegawczych, układ mobilny tabeli dziennika oraz czyste style wydruku (`@media print`). |
| [js/config.js](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/js/config.js) | Stałe konfiguracyjne aplikacji: dane połączenia z Firebase (`FIREBASE_CONFIG`), tabela technologiczna tonaży (`TONNAGE_DB` dla wartości `0.5 t`–`300.0 t`), norma dzienna `450` minut, klucze `localStorage` oraz definicje ikon SVG. |
| [js/ui.js](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/js/ui.js) | Narzędzia interfejsu użytkownika: powiadomienia typu *toast*, bezpieczne generowanie ikon SVG w DOM, obsługa okien `<dialog>` (z fallbackiem dla starszych przeglądarek), parsowanie liczb z przecinkiem/kropką, formatowanie czasu oraz aktualizacja statusu chmury i tytułu karty przeglądarki. |
| [js/storage.js](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/js/storage.js) | Warstwa zapisu i synchronizacji danych: odczyt/zapis w `localStorage` (`zawiesia_history`), połączenie z bazą Cloud Firestore (`onSnapshot` na żywo), obsługa trybu offline oraz operacje wsadowe (`batch`) przy imporcie i czyszczeniu historii. |
| [js/calculator.js](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/js/calculator.js) | Silnik obliczeń technologicznych: na podstawie parametrów z `TONNAGE_DB` interpoluje liniowo ustawienie licznika i wagę jednostkową dla zadanej długości `L1`, dobiera przędzę (`66 000` lub `132 000 dtex`) oraz oblicza wymianę szpul i wagę całego zlecenia. |
| [js/audio.js](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/js/audio.js) | Obsługa dźwięku i systemu urządzenia: generowanie sygnałów ostrzegawczych oraz alarmu za pomocą Web Audio API (bez zewnętrznych plików `.mp3`), wyciszanie, powiadomienia systemowe przeglądarki i blokada wygaszania ekranu (*Screen Wake Lock API*). |
| [js/timer.js](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/js/timer.js) | Wspólny silnik odliczania czasu używany jednocześnie przez **Główny Timer** i **Prosty Timer**. Zarządza odświeżaniem co sekundę, pierścieniem SVG, wyliczaniem wydajności na żywo, korektami czasu (`±1m`, `±5m`), nadgodzinami oraz odtwarzaniem stanu po odświeżeniu strony. |
| [js/history.js](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/js/history.js) | Logika dziennika produkcji i statystyk: wylicza KPI zmiany (sztuki, waga, efektywność), filtruje i grupuje zlecenia po dniach, obsługuje modal edycji, usuwanie wpisów, druk raportu oraz eksport/import CSV i JSON. |
| [js/app.js](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/js/app.js) | Moduł startowy aplikacji: spina formularze, przyciski, nawigację zakładek (mysz, dotyk, klawiatura), presety Prostego Timera, Service Workera oraz startuje przywracanie zapisanych timerów po załadowaniu DOM. |
| [manifest.json](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/manifest.json) | Manifest aplikacji PWA: definiuje nazwę, skróconą nazwę, język, kolory motywu i ikony umożliwiające instalację strony jako samodzielnej aplikacji na pulpicie lub telefonie. |
| [sw.js](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/sw.js) | Service Worker: buforuje lokalne pliki aplikacji w pamięci podręcznej przeglądarki, dzięki czemu interfejs uruchamia się nawet bez dostępu do sieci. |
| [firebase.json](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/firebase.json), [.firebaserc](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/.firebaserc), [firestore.rules](file:///c:/Users/Arek/Documents/antigravity2/ruta89antigravity/v2_improved/firestore.rules) | Konfiguracja hostingu Firebase (w tym nagłówki bezpieczeństwa CSP i cache'owania) oraz reguły dostępu do bazy Cloud Firestore. |
| `icons/` | Zestaw ikon aplikacji PWA (`64x64`, `192x192`, `512x512`). |

---

## 3. Przepływ działania krok po kroku

1. **Wejście na stronę i start (`app.js`, `storage.js`, `sw.js`)**
   - Przeglądarka wczytuje `index.html`, `style.css` i ładuje skrypty Firebase oraz moduły `js/*.js` w ustalonej kolejności (`defer`).
   - Rejestruje się Service Worker (`sw.js`), który zapisuje zasoby lokalne w cache na potrzeby pracy offline.
   - Moduł `Storage` natychmiast odczytuje lokalną kopię historii z `localStorage`, aby użytkownik od razu zobaczył dane, a równolegle nawiązuje połączenie na żywo z Cloud Firestore (`onSnapshot`) i aktualizuje plakietkę statusu w nagłówku.
   - Moduł `Timer` sprawdza w `localStorage`, czy przed ewentualnym zamknięciem lub odświeżeniem karty trwało odliczanie. Jeśli tak, płynnie wznawia zegar, pierścień postępu, przyciski korekty i godzinę zakończenia.

2. **Wprowadzanie parametrów i obliczenia (`calculator.js`)**
   - Operator wybiera tonaż zawiesia oraz wpisuje długość roboczą `L1`, liczbę sztuk i czas normatywny (można użyć klawisza `Enter` do szybkiego przechodzenia do kolejnego pola).
   - Na każdą zmianę `Calculator` pobiera dane bazowe dla wybranego tonażu z `TONNAGE_DB` (zawierające wartości referencyjne dla `L1 = 1 m` oraz `L1 = 2 m`) i oblicza parametry dla dowolnej długości `L1`:
     - przyrost na metr dla licznika (`cnt2 - cnt1`) i wagi (`wgt2 - wgt1`),
     - ustawienie licznika maszyny i wagę jednej sztuki,
     - łączną wagę partii oraz liczbę sztuk między wymianami szpul (`Math.floor(spools * 15 / waga_1_szt)`),
     - rodzaj przędzy: `66 000 dtex` dla tonażu poniżej `5.0 t`, `132 000 dtex` od `5.0 t` wzwyż.

3. **Odliczanie czasu normatywnego (`timer.js`, `audio.js`)**
   - Po kliknięciu **Rozpocznij odliczanie** (w Kalkulatorze lub w Prostym Timerze) aplikacja zapisuje w pamięci dokładny znacznik czasu startu (`startTimeDate`) oraz docelową godzinę zakończenia (`targetTime`), inicjuje Web Audio API i włącza blokadę wygaszania ekranu (`Wake Lock`).
   - Co sekundę zegar porównuje aktualny czas (`Date.now()`) z `targetTime` (dzięki czemu uśpienie ekranu lub spowolnienie karty w tle nie rozsynchronizuje czasu), aktualizuje pierścień SVG, kolor tła przy niskim czasie, tytuł karty przeglądarki i bieżącą wydajność.
   - Na `2 min`, `1 min` i `30 s` przed końcem generowane są miękkie sygnały ostrzegawcze.
   - W trakcie odliczania można korygować normę przyciskami `-5m`, `-1m`, `+1m`, `+5m`, co od razu przelicza planowaną godzinę końca i skalę pierścienia.

4. **Przekroczenie normy i zapis zlecenia (`timer.js`, `storage.js`)**
   - Po przekroczeniu `00:00:00` czas liczony jest dalej ze znakiem minus, pojawia się ostrzeżenie o przekroczeniu normy, jednorazowo włącza się powiadomienie i alarm dźwiękowy (z automatycznym wygaszeniem po 60 sekundach lub natychmiast po kliknięciu przycisku wyłączenia alarmu).
   - Po kliknięciu **Zakończ i Zapisz** zapisywany jest nowy wpis z datą, godziną startu i końca, czasem normatywnym, czasem faktycznym oraz wyliczoną wydajnością. Wpis trafia równocześnie do `localStorage` i Cloud Firestore (lub kolejki offline, jeśli brakuje internetu).

5. **Przeglądanie, edycja i raportowanie (`history.js`)**
   - W zakładce **Dziennik & Statystyki** u góry wyświetlane są KPI zmiany (sztuki dziś/całość, waga dziś/całość, średnia efektywność dnia).
   - Poniżej wpisy są pogrupowane po dniach z paskiem postępu względem `450 minut` zmiany. Można je filtrować po zakresie dat, przeszukiwać po frazie, edytować (z automatycznym przeliczeniem wagi i wydajności), usuwać, eksportować do CSV/JSON, importować z kopii JSON oraz drukować jako czytelny raport papierowy.

---

## 4. Wykorzystane technologie, biblioteki i zależności

- **HTML5 / CSS3 / Vanilla JavaScript (ES6+)** – bez zewnętrznych frameworków UI ani bundlerów; aplikacja działa lekko i bezpośrednio w przeglądarce przy zachowaniu ścisłego Content Security Policy (`script-src 'self'`).
- **Firebase SDK Compat `10.12.5` (`firebase-app-compat`, `firebase-firestore-compat`)** – ładowane z CDN `gstatic.com` z weryfikacją integralności `integrity` (SRI), odpowiadające za synchronizację w czasie rzeczywistym i wbudowany bufor offline (`enablePersistence()`).
- **Web APIs przeglądarki**:
  - **Service Worker & Cache Storage API** – obsługa trybu offline i instalowalności PWA.
  - **Web Audio API** – synteza sygnałów ostrzegawczych i alarmów bez pobierania plików audio.
  - **Notifications API** – powiadomienia systemowe po upływie czasu.
  - **Screen Wake Lock API** – zapobieganie wygaszaniu ekranu urządzenia w trakcie trwania zlecenia.
  - **HTML `<dialog>` + Top Layer** – natywne, dostępne okna modalne edycji i potwierdzeń.
  - **FileReader & Blob API** – eksport raportów CSV (z UTF-8 BOM dla programu Excel) oraz kopii zapasowych JSON.
- **Google Fonts (`Plus Jakarta Sans`, `Inter`)** – typografia o wysokiej czytelności liczb (`tabular-nums`).

---

## 5. Lista najważniejszych ulepszeń wprowadzonych względem wersji oryginalnej

1. **Modułowa architektura (`js/*.js`)** – rozbicie prawie 2000-liniowego pliku `script.js` na 8 czytelnych, wyspecjalizowanych modułów oraz usunięcie duplikacji logiki między Głównym Timerem a Prostym Timerem poprzez wspólny silnik `createProductionTimer`.
2. **Naprawa powracającego alarmu w nadgodzinach** – w oryginale kliknięcie „Wyłącz alarm dźwiękowy” po przekroczeniu normy zerowało stan alarmu i powodowało jego ponowne uruchomienie w kolejnej sekundzie. W `v2_improved` flaga per cykl odliczania gwarantuje jednorazowe wyzwolenie alarmu, a wyciszenie działa trwale do końca danego zlecenia.
3. **Pełne odtwarzanie Głównego Timera po odświeżeniu strony** – przywracane są teraz `originalTotalMs`, przyciski korekty (`-5m/-1m/+1m/+5m`), godzina startu, blokada wygaszania ekranu (*Wake Lock*) oraz właściwy styl przycisku Stop (`inline-flex`).
4. **Poprawne działanie korekty czasu (`±1m`, `±5m`)** – aktualizuje ona od razu wyświetlaną godzinę końca zlecenia, chroni skalę pierścienia przed dzieleniem przez zero i przywraca normalny tryb odliczania, jeśli dodanie czasu wyprowadzi zegar z nadgodzin.
5. **Spójna edycja i import danych** – edycja zlecenia automatycznie przelicza również procentową wydajność (`percentage`), a import pliku JSON zapisuje nowe rekordy nie tylko lokalnie, lecz także w pamięci aplikacji i w bazie Cloud Firestore.
6. **Rzeczywisty status połączenia z chmurą** – plakietka `#firestoreSyncBadge` reaguje na stan `fromCache`, utratę sieci oraz błędy połączenia z bazą, zamiast wyświetlać zawsze na sztywno „Chmura: Aktywna”.
7. **Bezpieczne czyszczenie historii i lepszy eksport CSV** – masowe usuwanie w Firestore korzysta z transakcji wsadowych (`writeBatch` w paczkach do 500 dokumentów), a eksport CSV dodaje znacznik UTF-8 BOM (poprawne polskie znaki w Excelu), escapuje pola i zwalnia zasoby `URL.revokeObjectURL`.
8. **Usprawnienia UI/UX, wydajności i dostępności** – widoczny minimalistyczny tytuł w nagłówku, nawigacja klawiaturą po zakładkach (strzałki Lewo/Prawo, Home/End), podgląd czasu na żywo w tytule karty przeglądarki, debounce w wyszukiwarce historii, usunięcie zbędnych ciągłych animacji obciążających GPU oraz poprawiony Service Worker i styl wydruku.
