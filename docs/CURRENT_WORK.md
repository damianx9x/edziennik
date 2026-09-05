# Produkcja i rozwój

Stan: 5 września 2026. Adres operacyjny: https://demo.kingslanguageacademy.pl.
Pozostałe domeny czekają na osobne zadanie. Wydanie bazowe: 1.4.0 (wdrożone); kandydat: 1.5.0.
Numer etapu opisuje historię, nie status dostępności modułu.

## Ewaluacja zakresu 0–7

| Obszar | Co zweryfikowano w tej rundzie | Granica dowodu |
| --- | --- | --- |
| Fundament i role (0–1) | testy sesji, centralnych uprawnień, MFA, zaproszeń, resetów, modułów | nie zastępuje przejścia MFA na urządzeniu dyrektora |
| Kartoteki (2) | testy relacji, importu, identyfikatorów, plików i autoryzacji | nie wykonano masowego importu na produkcji |
| Grafik (3) | testy solvera, kolizji, blokad zasobów, dziennika i prezentacji | brak nowego pełnego odbioru planu przez każdą rolę |
| Umowy i płatności (4) | testy kwalifikacji odbiorców, schematów i pakietów dokumentów | test kodu nie jest opinią prawną konkretnej umowy |
| Komunikacja (5) | testy kolejki, odbiorców i powiadomień e-mail | rzeczywista dostarczalność zależy od SMTP i domeny nadawcy |
| Nauka (6) | testy materiałów, uprawnień, postępów i PWA | nie diagnozujemy ani automatycznie nie oceniamy dzieci |
| Operacje (7) | testy eksportu, konfiguracji kopii, diagnostyki, migracji i paczki | status usług nie dowodzi odporności na utratę całego urządzenia |

Regresja automatyczna: 71 plików / 248 testów w pierwszym przebiegu tej rundy.
Skan zależności produkcyjnych npm: 0 znanych podatności w chwili sprawdzenia.
To nie jest certyfikat bezpieczeństwa ani deklaracja braku wszystkich błędów.

## Naprawy kandydata 1.4.0

- Błąd niezawodności: blokada localStorage mogła zamienić udany zapis w komunikat
  błędu. Serwer jest teraz jedynym źródłem prawdy, synchronizacja kart jest opcjonalna.
- Błąd ładowania: brak limitu oczekiwania i zależność od IndexedDB mogły zatrzymać
  ekran. Odczyt ma limit 15 s, zapis 30 s, brak potwierdzenia daje bezpieczny komunikat.
- Błąd informacji zwrotnej: HTML strony logowania nie może udawać poprawnej
  odpowiedzi zapisu. Zapis wymaga JSON z `ok: true`.
- Ryzyko zużycia pamięci: API treści ogranicza strumień do 15 MiB również bez
  Content-Length. Dotychczas sprawdzało rozmiar dopiero po wczytaniu całości.
- Kontrast: tekst granatowego widgetu dobiera wariant do tła i jego krycia.
  Najechanie myszą nie nadpisuje wybranego obramowania.
- Edytor: stan zapisu, ochrona przed podwójnym kliknięciem, zachowanie szkicu przy
  błędzie, ostrzeżenie przed zamknięciem z niezapisanymi zmianami, odrzucanie szkicu,
  powielanie i ukrywanie widgetów, wyrównanie, odstępy i podgląd wyglądu.
- Operacje: każdy pomyślny test odtworzenia aktualizuje datę w centrum systemu;
  dotychczas test wykonywany przez aktualizator nie odświeżał tego wskaźnika.

Nie zmieniamy danych szkoły, treści jej strony, haseł, kluczy ani DNS.
Nie wykonujemy destrukcyjnego odtwarzania produkcyjnej bazy. Kontrolowany restart
urządzenia jest dopuszczony w oknie serwisowym; nie symulujemy wyciągania zasilania.

## Kandydat 1.5.0 — niezawodność produkcji

- Zaplanowane restarty aplikacji w ustawieniach właściciela: codziennie/niedziela,
  czas Europe/Warsaw, domyślnie wyłączone, bez nadrabiania po starcie.
- Wspólna blokada chroni backup, aktualizację i odtwarzanie przed watchdogiem oraz
  planowanym restartem. Wewnętrzny healthcheck odtwarzania działa mimo własnej blokady.
- Restart wymaga kopii młodszej niż 48 h z poprawną sumą; ma 15-minutową przerwę
  między próbami. Nie restartuje bazy ani tunelu.
- Retencja kopii odczytuje rzeczywiste ustawienie panelu. Brak skonfigurowanego USB
  zgłasza niepełną kopię jako błąd, zachowując poprawny eksport lokalny.
- Przygotowanie kontrolera pamięci w konfiguracji bootu (bez automatycznego rebootu
  podczas aktualizacji); diagnostyka nie myli braku kontrolera z samym restartem usługi.
- Broker ma ograniczony czas odbioru polecenia i sprawdza typ głównego obiektu JSON.

### Stan dziesięciu priorytetów — dowody i pozostała praca

| Priorytet | Stan w tej rundzie | Co nadal wymaga odbioru |
| --- | --- | --- |
| Kopia poza Pi / UPS | zaszyfrowana kopia pobrana na Maca, SHA-256 zgodne | automatyczny niezależny cel i fizyczny UPS |
| Monitoring zewnętrzny | publiczny HTTPS sprawdzany z Maca podczas prac | całodobowy monitor na niezależnym hoście oraz kanał alertu |
| Drugie urządzenie | Mac: odszyfrowanie, bezpieczne rozpakowanie, pg_restore PostgreSQL 17; 59 tabel i 1 plik, 3 s | pełne uruchomienie aplikacji na zapasowym hoście i pomiar przełączenia ruchu |
| Cztery role na telefonach | regresja uprawnień automatyczna, nowe UI sprawdzone w rozmiarach mobilnym i desktop | rzeczywiste iOS/Android oraz użytkownicy każdej roli |
| E-mail | nie zmieniano SMTP ani DNS | wiadomości próbne, nagłówki Authentication-Results i kolejka błędów |
| Grafik | istniejące testy solvera i kolizji w regresji | odbiór rzeczywistego planu i czasów przejazdu |
| Redakcja strony | szkic/podgląd i odrzucanie zmian wdrożone w 1.4.0 | trwała historia publikacji z przywracaniem wersji |
| WCAG | formularz restartów: etykiety, fokus, walidacja, bez poziomego przewijania | pełny audyt czytnikiem ekranu i urządzeniami |
| Wydajność | 384 ograniczone żądania odczytu, 0 nieoczekiwanych błędów, kontrolowane 429 | sesje zalogowane i długi test stabilności; kontroler pamięci po reboot |
| Dane / incydenty | procedury istnieją, brak nowego automatycznego kasowania danych biznesowych | formalne zatwierdzenie retencji, odpowiedzialnych osób i zgód publikacji |

Test zewnętrzny 1.4.0: 19/19 ograniczonych prób negatywnych bez obejścia uprawnień,
bez użycia znanych kont, bez tworzenia kont i bez odczytu danych prywatnych.
To nie jest pełny pentest, test DDoS ani certyfikat bezpieczeństwa. Raport techniczny:
`docs/security/2026-09-05-production-reliability.md`.

## Zasady utrzymania

### Dodatkowy test zewnętrzny bez konta — 5 września

Przeprowadzono ograniczony test przez publiczny HTTPS, bez sesji, znanych haseł
i dostępu SSH w ścieżce ataku. Rejestracja „GPT6 ASTRA Hacked” i wariant z
wstrzykniętym polem roli otrzymały HTTP 400 / EMAIL_PASSWORD_SIGN_UP_DISABLED.
Administracyjne tworzenie konta bez sesji: HTTP 401. Panel właściciela,
edytor i zakończony instalator przekierowały do logowania (307). Nagłówek
próbujący ominąć middleware nie zmienił wyniku. Konto nie zostało utworzone.
Nie wykazano obejścia w tych próbach; nie jest to pełny pentest ani test DDoS.

Retencję wieloletnią dla 1000 kont / 3–5 równoległych sesji opisuje
`docs/OPERACJE_RASPBERRY.md`. Nie włączono nowego kasowania danych. Istniejący
timer retencji plików nie jest kompletną retencją bazy — to jawne zadanie rozwojowe.

1. Najpierw incydent i możliwość odzyskania danych, potem rozwój.
2. Jedno wydanie = sprawdzony commit, pięć aktualnych podręczników, podpisana paczka.
3. Aktualizacja obok bieżącej wersji; kopia i test odtworzenia przed przełączeniem.
4. Zachowujemy aktualne wydanie i poprzednie do cofnięcia. Stare artefakty przenosimy
   odzyskiwalnie do Kosza, nie kasujemy kopii danych ani kluczy.
5. Nie przepisujemy wspólnej historii Gita. Dostęp do funkcji kontroluje serwer.
6. Zakres ręcznych testów i ograniczenia raportujemy oddzielnie od testów jednostkowych.

## Dziesięć kolejnych priorytetów

1. **Kopia poza Raspberry + UPS** — chronią przed awarią dysku i zanikiem prądu.
2. **Monitoring spoza urządzenia** — alert także wtedy, gdy sama Raspberry nie działa.
3. **Próba odtworzenia na drugim urządzeniu** — zmierzyć czas i potwierdzić kompletny powrót pracy.
4. **Odbiór czterech ról na rzeczywistych telefonach** — sprawdzić codzienną pracę, nie tylko komponenty.
5. **Dostarczalność e-mail** — SPF/DKIM/DMARC, próby dostarczenia i czytelna kolejka błędów.
6. **Dopracowanie grafiku na rzeczywistych ograniczeniach** — brak teleportacji, konflikty i czytelne powody braku terminu.
7. **Redakcyjny podgląd całej strony** — wersje robocze, historia publikacji i cofanie bez ręcznego importu JSON.
8. **Dostępność WCAG** — klawiatura, czytnik ekranu, kontrast i duży tekst na wszystkich ważnych przepływach.
9. **Budżet wydajności Raspberry** — pomiary przy realistycznej liczbie sesji i limit kosztownych operacji.
10. **Procedury danych i incydentów** — zatwierdzona retencja, zgody publikacji zdjęć, role odpowiedzialnych osób.

Wymagania formalne, kopia poza urządzeniem i faktyczny odbiór użytkowników pozostają
zadaniami operacyjnymi. Nie oznaczamy ich jako wykonane samą zmianą nazwy na produkcję.
