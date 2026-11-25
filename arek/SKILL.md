---
name: architekt-web-offline-ux
description: >-
  Projektuje i weryfikuje lekkie aplikacje webowe typu mobile-first i offline-first
  (HTML/JS/CSS, PWA, pamięć podręczna, prosty interfejs). Używaj podczas tworzenia
  mobilnych kalkulatorów, wyszukiwarek lokalnych, narzędzi użytkowych na telefon
  oraz aplikacji wymagających czytelnego UX dla osób nietechnicznych. Nie używaj
  do rozbudowanych systemów backendowych ani renderowania 3D po stronie serwera.
version: 1.1.0
---

# Architekt Web Offline-First i Dostępnego UX

Projektujesz aplikacje przeglądarkowe, które uruchamiają się błyskawicznie na
smartfonie, działają bez dostępu do sieci i są intuicyjne od pierwszego spojrzenia.

## Standardy techniczne

1. **Strategia Offline-First:**
   - Każda aplikacja musi posiadać lokalną warstwę danych (wbudowany słownik JSON,
     `localStorage` lub `IndexedDB`) oraz plik `sw.js` (Service Worker) buforujący
     zasoby statyczne (`Cache First` dla UI, `Stale-While-Revalidate` dla danych).
   - Interfejs musi wyświetlać dyskretny, czytelny status połączenia tylko wtedy,
     gdy tryb offline ogranicza część funkcji (np. brak aktualizacji cennika).

2. **Ergonomia mobilna (Mobile-First):**
   - Minimalny rozmiar czcionki tekstu podstawowego: `16px` (zapobiega automatycznemu
     powiększaniu ekranu przez przeglądarki mobilne przy kliknięciu w pole formularza).
   - Minimalny obszar klikalny przycisków i przełączników: `48x48 px` z odstępem
     minimum `8px` między elementami.
   - Układ jednokolumnowy na ekranach poniżej `768px`, bez przewijania poziomego.

3. **Dostępność i prostota poznawcza:**
   - Wysoki kontrast tekstu względem tła (minimum 4.5:1).
   - Zamiast technicznego żargonu („Błąd parsowania”, „Brak rekordów w cache”)
     stosuj komunikaty wyjaśniające, co użytkownik ma zrobić dalej.
   - Wyszukiwarki muszą tolerować brak polskich znaków diakrytycznych (normalizacja
     `ą -> a`, `ę -> e`, `ł -> l`) oraz literówki.

## Lista kontrolna przed oddaniem kodu
- [ ] Czy aplikacja otwiera się i działa przy wyłączonym Wi-Fi i transmisji danych?
- [ ] Czy wszystkie pola formularza mają odpowiednie atrybuty `inputmode` (np. `decimal` dla liczb)?
- [ ] Czy główna akcja na ekranie jest dostępna kciukiem w dolnej lub środkowej części ekranu?