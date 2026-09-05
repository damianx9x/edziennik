# KLA Server — Raspberry Pi 4B

Pakiet ma dwa wyraźnie rozdzielone warianty:

- **lokalne demo** — proste testy po adresie `http://IP_RASPBERRY:8080` i
  wyłącznie bogate, syntetyczne dane demonstracyjne;
- **publiczny pilot** — `https://demo.kingslanguageacademy.pl`, pusta baza na
  osobnej partycji `KLA_DATA` i bezpieczny kreator pierwszego uruchomienia;
- **produkcja** — publiczny HTTPS przez Cloudflare Tunnel, 2FA dyrektora i
  prawdziwe dane dopiero po zamknięciu odbioru/RODO.

Baza PostgreSQL i wszystkie prywatne pliki są w jednym szyfrowanym sejfie
LUKS2 na zewnętrznym dysku USB. SSD jest wariantem zalecanym, a HDD jest
wspierany w profilu pilota z ostrożniejszymi ustawieniami bazy. Karta microSD
zawiera system i aplikację, ale nie
bazę, dokumenty, hasło bazy ani sekret sesji.

## Zachowanie przy nagłym większym ruchu

### Horyzont wieloletni: do 1000 kont, zwykle 3–5 osób jednocześnie

To profil do pomiaru, nie gwarancja pojemności. Sama liczba kont nie jest
głównym kosztem: rosną przede wszystkim załączniki, historia odwiedzin i kopie.
Kod ma jedną ograniczoną pulę PostgreSQL na proces, limity zapytań i indeksy
szkoła/czas w historii. Nie należy zwiększać puli do liczby użytkowników.
Nie ma obecnie kompletnej automatycznej retencji wszystkich tabel.

**Co już robi system:** cotygodniowy timer usuwa prywatne pliki uprzednio
zarchiwizowane zgodnie z konfiguracją `/etc/kla/retention.env`. Wartość 0 nie
usuwa danej kategorii. Ten mechanizm nie jest retencją wszystkich rozmów,
statystyk, audytu, sesji ani całej dokumentacji szkoły. Kopie mają osobną politykę.

**Propozycja do następnego wydania, bez włączania kasowania danych teraz:**

| Dane | Proponowane postępowanie | Warunek |
| --- | --- | --- |
| wygasłe sesje i tokeny | małe dzienne porcje, poza czasem zajęć | test, że aktywne sesje/MFA nie znikają |
| surowe odwiedziny | np. 30–90 dni, później anonimowe sumy dzienne | zachować uzgodnioną historię trendów bez identyfikatorów |
| logi dostarczenia e-mail | usunąć zbędne szczegóły po uzgodnionym czasie | nie usuwać niewysłanej kolejki ani nierozwiązanych błędów |
| materiały i czaty | archiwum roku szkolnego i reguły per kategoria | uprzednia decyzja administratora danych |
| umowy, raty, obecności, audyt | osobna retencja i blokada przy sporze | nie przyjmować jednej liczby dni dla całej szkoły |
| backup | rotacja lokalna i niezależna kopia poza urządzeniem | możliwość odtworzenia + instrukcja ponownego stosowania retencji po restore |

Usuwanie powinno mieć najpierw podgląd liczby rekordów i rozmiaru, potem
zatwierdzenie; wykonanie porcjami z limitem czasu, audytem i blokadą równoległych
operacji. Nie uruchamiać `VACUUM FULL` na działającej aplikacji. Utrzymywać
autovacuum, analizować wolne zapytania i realny przyrost indeksów przed partycjonowaniem.

Przykład planowania pojemności (założenie, nie pomiar): 1000 osób × 10 MB
nowych plików miesięcznie = około 10 GB/miesiąc. Jedna pełna kopia może wymagać
podobnego miejsca co dane, a przygotowanie i test odtworzenia wymagają dodatkowej
przestrzeni. Trzydzieści pełnych kopii nie oznacza trzydziestu małych przyrostów.
Dlatego monitorować osobno: bazę, pliki, kopie i wolne miejsce. Progi robocze
ostrzeżenia 25% wolnego, krytyczny 15% należy dopasować do wielkości pełnej kopii.

Odbiór skalowania: syntetyczne dane 1000 kont na osobnej bazie, 5 równoległych
sesji, pomiar p95, błędów, pamięci i czasu backupu; dopiero po tym korekta limitów.
Nie testować wzrostu przez tworzenie 1000 kont w produkcyjnej bazie.

Publiczny ruch przechodzi przez Cloudflare Tunnel, a prywatny origin nasłuchuje
wyłącznie na `127.0.0.1`. Nginx kompresuje odpowiedzi, utrzymuje długi cache dla
wersjonowanych plików Next.js oraz ogranicza liczbę równoległych połączeń i prób
logowania dla pseudonimowego klienta. Usługa deklaruje limity pamięci, małą pulę
PostgreSQL i watchdog systemd. Limity systemd stają się aktywne dopiero, gdy
kernel ma włączony kontroler pamięci cgroup; panel właściciela pokazuje ten
stan zamiast udawać ochronę. Przeciążenie powinno więc zwolnić lub zwrócić
HTTP 429, zamiast wyczerpać pamięć całego urządzenia.

Raspberry Pi 4B jest serwerem pilota, a nie infrastrukturą dla nieograniczonego
ruchu. Przed produkcją należy wykonać test obciążenia na kopii danych, włączyć
reguły WAF Cloudflare i przygotować migrację na VPS, jeżeli stały ruch przekroczy
możliwości urządzenia.

> Lokalny tryb demo działa po HTTP tylko w prywatnej sieci. Nie wpisuj tam
> prawdziwych danych dzieci, umów ani dokumentów.

## Co trzeba przygotować

- Raspberry Pi 4B 4 GB lub 8 GB; 8 GB jest zalecane, profil 4 GB ma mniejszy
  heap Node.js i wymaga szczególnie dobrego zasilania;
- oficjalny zasilacz i kabel sieciowy;
- karta microSD 32 GB lub większa;
- osobny dysk USB 3.0 (SSD zalecany; HDD wspierany testowo; instalator usunie
  całą zawartość wskazanego nośnika);
- dla HDD zalecane jest osobne zasilanie lub aktywny hub USB;
- najlepiej UPS dla Raspberry Pi i dysku;
- drugi komputer do zapisania klucza odzyskiwania;
- opcjonalnie konto SFTP na innym urządzeniu lub u dostawcy backupu.
- dla produkcji: domenę dodaną do Cloudflare oraz utworzony tunel z publicznym
  adresem HTTPS; w routingu tunelu ustaw usługę `http://localhost:8080` i
  skopiuj token instalacyjny. Token traktuj jak hasło.
- dane zwykłego serwera SMTP (host, port 465/587, login, hasło i nadawca) albo
  opcjonalnie konto Resend. Możesz ustawić je podczas pierwszego uruchomienia
  albo później w Centrum systemu. Jednorazowy kod instalacyjny pozwala świadomie
  utworzyć pierwszego właściciela bez poczty, ale zaproszenia, odzyskiwanie hasła
  i powiadomienia e-mail pozostaną zablokowane do czasu poprawnego testu SMTP.

## 1. System z Raspberry Pi Imager

1. Przy monitorze, klawiaturze i myszy wybierz **Raspberry Pi OS (64-bit) z
   Desktopem**. Lite też zadziała, ale Desktop ułatwi pierwsze testy w
   przeglądarce na samym Raspberry.
2. W ustawieniach Imagera ustaw nazwę `kla-server`, własnego użytkownika,
   mocne hasło, polską strefę czasową i włącz SSH.
3. Najlepiej dodaj klucz SSH. Nie używaj domyślnego użytkownika `pi`.
4. Uruchom Raspberry, podłącz Internet kablem i dopiero potem podłącz dysk danych.

## 2. Jedna instalacja lokalnego demo

Rozpakuj paczkę `edziennik-kla-raspberry-source.tar.gz` na Raspberry (np. do
folderu `Downloads`) i wklej w Terminalu jedną linię:

```bash
cd ~/Downloads && tar -xzf edziennik-kla-raspberry-source.tar.gz && cd edziennik-kla && sudo ./raspberry/install-local-demo.sh
```

Jeśli folder nazywa się `Pobrane`, zastąp w poleceniu `Downloads` słowem
`Pobrane`. Instalator pokaże dokładny lokalny adres i jednorazowe hasło dla
kont `kinga`, `dyrektor`, `wykladowca`, `rodzic`, `uczen`.

Szczegółową instrukcję dla osoby nietechnicznej zawiera
sekcji lokalnego uruchomienia w tym dokumencie.

Jeśli router po restarcie poda nowy adres IP, uruchom:

```bash
sudo kla-local-url
```

Skrypt poda nowy adres i przebuduje aplikację pod niego. Docelowo ustaw w
routerze rezerwację DHCP dla Raspberry Pi, aby adres lokalny był stały.

## 3. Publiczny pilot i pierwsze konto

Publiczne demo korzystające z istniejącego dysku uruchamiaj dopiero po
utworzeniu na Macu osobnej partycji `KLA_DATA` (minimum 40 GiB):

```bash
sudo ./raspberry/install-public-demo.sh
```

Instalator poprosi o token Cloudflare i pozwoli wybrać SMTP, Resend albo
konfigurację poczty później. Na końcu pokaże jednorazowy kod pierwszego uruchomienia. Zapisz go w
menedżerze haseł — na Raspberry pozostaje wyłącznie jego hash.

1. Otwórz `https://demo.kingslanguageacademy.pl/pierwsze-uruchomienie`.
2. Wpisz kod instalacyjny, nazwę szkoły, imię i nazwisko, własny e-mail oraz
   nowe hasło.
3. Jeżeli SMTP zostało sprawdzone, kliknij link aktywacyjny z poczty. Jeżeli
   świadomie wybrano konfigurację bez poczty, konto aktywuje kod instalacyjny,
   a panel od razu przypomni o brakujących funkcjach e-mail.
4. Zeskanuj kod MFA aplikacją na telefonie i zapisz kody awaryjne poza Pi.
5. W centrum systemu wybierz **Zaproś pierwszą osobę**. Role dyrektora,
   wykładowcy, rodzica i ucznia powstają wyłącznie przez zaproszenia.

Baza przed tym procesem nie zawiera szkoły, kont, grup ani kartotek. Nie ma
publicznej rejestracji i nie istnieje fabryczne hasło administratora.

## 4. Instalacja produkcyjna

Skrypt odmawia użycia całego dysku, partycji systemowej i partycji bez etykiety
`KLA_DATA`. Formatuje wyłącznie wskazaną nową partycję po dokładnym
potwierdzeniu. Nie zmniejsza APFS na Linuksie.

Skopiuj rozpakowaną paczkę na Raspberry, połącz się przez SSH i uruchom:

```bash
cd ~/edziennik-kla
sudo ./raspberry/install.sh
```

Instalator pokaże dyski i poprosi o wskazanie dysku danych, np. `/dev/sda`. Dwa razy
sprawdź jego rozmiar/model. Skrypt odmawia użycia dysku systemowego i wymaga
przepisania dokładnego potwierdzenia przed usunięciem danych.

Podczas instalacji:

1. ustawisz hasło codziennego odblokowania (minimum 16 znaków);
2. otrzymasz losowy **klucz odzyskiwania sejfu** — jest pokazany tylko raz;
3. zapiszesz go w menedżerze haseł i na papierze poza Raspberry Pi;
4. instalator skonfiguruje PostgreSQL, Node.js, nginx, zaporę, aktualizacje,
   ClamAV, kontrolę działania, retencję i szyfrowane backupy;
5. aplikacja przejdzie testy, migracje i produkcyjny build przed startem.
6. `cloudflared` zostanie usługą systemową; nginx będzie słuchał wyłącznie na
   `127.0.0.1:8080`, dlatego nieszyfrowany origin nie jest dostępny z sieci LAN.

## 5. Po restarcie i automatyczny start

Bez konfiguracji auto-startu po pełnym restarcie połącz się przez SSH i wykonaj:

```bash
sudo kla-unlock
```

Stan sprawdzisz przez:

```bash
sudo kla-status
```

Pełny test każdej warstwy startu wykonasz przez:

```bash
sudo kla-startup-audit
```

Wynik ma zawierać wyłącznie wpisy `[OK]`. Test rozróżnia hasło/recovery key
LUKS od klucza `age` używanego do plików kopii. Klucz `AGE-SECRET-KEY-...` nie
otwiera partycji i jest prawidłowy dopiero podczas importu pliku `.tar.age`.

Na serwerze pilotowym można świadomie włączyć bezobsługowy start z panelu na
Macu albo poleceniem `sudo kla-enable-auto-unlock`. Klucz techniczny trafia wtedy
do pliku `root-only` na karcie systemowej, a system automatycznie montuje sejf i
uruchamia wszystkie usługi po zaniku prądu. To zapewnia ciągłość pracy, lecz
osłabia ochronę przy kradzieży całego zestawu Raspberry + karta + dysk. Klucz
odzyskiwania eksportów nadal jest osobny i zapisany poza urządzeniem. Wersja
docelowa może przenieść auto-start do TPM lub fizycznego klucza USB.

Profil runtime zapisuje journal trwale przez 14 dni, włącza sprzętowy watchdog
systemd i wymusza restart tunelu Cloudflare. Dzięki temu po kolejnym zdarzeniu
można odczytać także logi poprzedniego uruchomienia. Watchdog nie zastępuje UPS
ani dobrego zasilacza i nie potrafi odblokować sejfu bez prawidłowego klucza.

## 6. Backup SFTP

Najprościej otworzyć w eDzienniku **Ustawienia serwera → Backup i eksport**.
Panel przeprowadza przez porównanie odcisku serwera, dodanie klucza publicznego
i test połączenia. Poniższe polecenie pozostaje drogą awaryjną dla technika.

Uruchom:

```bash
sudo kla-configure-sftp-backup
```

Podaj host, port, login i folder. Skrypt wygeneruje osobny klucz SSH, pokaże
klucz publiczny do wklejenia u dostawcy i każe porównać odcisk serwera.
Codzienna kopia o 03:15 zawiera bazę, prywatne pliki i numer wersji aplikacji.
Archiwum jest szyfrowane `age` jeszcze przed wysłaniem przez SFTP.

## Panel właściciela i publiczna prezentacja

Właściciel z aktywnym MFA otwiera **Ustawienia serwera** i może przełączyć
wyłącznie stronę główną między **Stroną szkoły** oraz **Pokazem systemu**.
Zmiana nie przełącza bazy, nie kopiuje danych i nie zmienia logowania, umów,
wiadomości ani plików. Tryb produktu pokazuje syntetyczne przykłady czterech ról.

SMTP, nośnik backupu, eksport, import i ten przełącznik korzystają z lokalnej
usługi `kla-web-control`. Aplikacja nie ma uprawnienia do dowolnych komend i nie
uruchamia `sudo`; broker przyjmuje tylko zamkniętą listę operacji. Jego stan:

```bash
sudo systemctl status kla-web-control --no-pager
sudo journalctl -u kla-web-control -n 100 --no-pager
```

Sekcja **Wersja i zależności** pokazuje numer wydania, commit oraz wynik audytu
zależności zapisany w podpisanej paczce. Zależności aktualizuje się przez nowe
wydanie i pełny cykl testów — nigdy przez `npm update` na działającej bazie.

Pierwszy pełny test wykonaj tak:

```bash
sudo edziennik-kla-backup --test-restore
```

Test odszyfrowuje kopię, sprawdza dokumenty i odtwarza bazę do tymczasowej
bazy kontrolnej, po czym ją usuwa. Wynik musi zawierać `TEST ODTWORZENIA OK`.
System powtarza go automatycznie raz w miesiącu. Uruchom go także po zmianie
miejsca backupu. Datę ostatniego sukcesu pokazuje `kla-status`.

## 7. Retencja

Plik `/etc/kla/retention.env` zawiera zatwierdzone okresy. `0` oznacza brak
automatycznego kasowania. Importy mają domyślnie 30 dni po archiwizacji.
Umowy i załączniki wiadomości pozostają na `0`, dopóki prawnik/IOD nie określi
okresu. Cotygodniowe usuwanie obejmuje wyłącznie pliki wcześniej oznaczone jako
zarchiwizowane i zapisuje zdarzenie audytowe.

## Aktualizacja i awaria

- Aktualizacja zaakceptowanej, rozpakowanej paczki: wejdź do jej katalogu i
  uruchom `sudo kla-update "$PWD"` (lub `sudo ./raspberry/update.sh` przed
  pierwszą instalacją skrótu). Skrót nie zgaduje położenia plików aktualizacji.
- Aktualizator blokuje równoległe uruchomienie, robi szyfrowaną kopię, wykonuje
  tylko bezpieczne migracje i automatycznie wraca do poprzedniego kodu, jeśli
  test zdrowia nowej wersji się nie powiedzie.
- Aktualizator przyjmuje wyłącznie paczkę z konkretnym commitem i poprawnym
  manifestem SHA-256. Nie aktualizuj z przypadkowego katalogu ani ZIP-a.
- Ręczny backup: `sudo edziennik-kla-backup`.
- Logi: `sudo journalctl -u edziennik-kla -n 200 --no-pager`.
- Pełne odtworzenie wymaga wpisania dokładnego potwierdzenia:
  `sudo edziennik-kla-restore /srv/kla-vault/backups/kla-....tar.age`.
- Pełną kopię można również pobrać albo wgrać w **Ustawieniach serwera**.
  Import przesyła plik fragmentami, prosi o klucz instalacji źródłowej i przed
  odtworzeniem wykonuje pełny test. Klucz nie jest zapisywany.
- Utrata hasła i klucza odzyskiwania oznacza trwałą utratę danych.
- Backup na tym samym dysku nie chroni przed awarią/kradzieżą; SFTP musi być poza
  Raspberry Pi i najlepiej poza lokalem szkoły.

## Granica rozwiązania

To solidny serwer pilota, ale nie wysokodostępna chmura. Brak prądu, Internetu
lub awaria jednego Raspberry wyłączą usługę. Przed prawdziwymi danymi trzeba
zamknąć checklistę z `BEZPIECZENSTWO_PRAWO_RODO.md`, włączyć HTTPS, 2FA dyrektora,
UPS, monitoring oraz wykonać udokumentowany test odtworzenia.
## Profil wydajności i zasilania

Wbudowany `kla-benchmark-readonly` wykonuje krótki, ograniczony mikro-test
wyłącznie przez lokalny nginx. Nie loguje się, nie zapisuje danych i nie uderza
w domenę publiczną. Raportuje opóźnienia, odpowiedzi HTTP 429, temperaturę,
pamięć oraz bieżące bity zasilania/ograniczenia CPU. Nie zastępuje testu
obciążenia na oddzielnym środowisku.

Nie podkręcaj Raspberry, jeśli `vcgencmd get_throttled` pokazuje bieżące lub
historyczne problemy z zasilaniem albo temperaturą. Najpierw popraw zasilacz,
chłodzenie i zasilanie dysku. Stabilność i integralność bazy są ważniejsze niż
kilka procent taktowania.

## Przybliżona mapa wejść w panelu właściciela

Kraj jest przekazywany przez Cloudflare automatycznie. Aby zobaczyć także
województwa, w Cloudflare dla domeny włącz regułę **Managed Transforms → Add
visitor location headers**. Aplikacja wykorzysta wyłącznie kod i nazwę regionu;
nie zapisuje surowego adresu IP ani pełnego identyfikatora przeglądarki.
