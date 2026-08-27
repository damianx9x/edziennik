# KLA Server — Raspberry Pi 4B 8 GB

Pakiet ma dwa wyraźnie rozdzielone warianty:

- **lokalne demo** — proste testy po adresie `http://IP_RASPBERRY:8080` i
  wyłącznie bogate, syntetyczne dane demonstracyjne;
- **publiczny pilot** — `https://demo.kingslanguageacademy.pl`, pusta baza na
  osobnej partycji `KLA_DATA` i bezpieczny kreator pierwszego uruchomienia;
- **produkcja** — publiczny HTTPS przez Cloudflare Tunnel, 2FA dyrektora i
  prawdziwe dane dopiero po zamknięciu odbioru/RODO.

Baza PostgreSQL i wszystkie prywatne pliki są w jednym szyfrowanym sejfie
LUKS2 na zewnętrznym SSD. Karta microSD zawiera system i aplikację, ale nie
bazę, dokumenty, hasło bazy ani sekret sesji.

> Lokalny tryb demo działa po HTTP tylko w prywatnej sieci. Nie wpisuj tam
> prawdziwych danych dzieci, umów ani dokumentów.

## Co trzeba przygotować

- Raspberry Pi 4B 8 GB, oficjalny zasilacz i kabel sieciowy;
- karta microSD 32 GB lub większa;
- osobny SSD USB 3.0 (instalator usunie z niego całą zawartość);
- najlepiej UPS dla Raspberry Pi i SSD;
- drugi komputer do zapisania klucza odzyskiwania;
- opcjonalnie konto SFTP na innym urządzeniu lub u dostawcy backupu.
- dla produkcji: domenę dodaną do Cloudflare oraz utworzony tunel z publicznym
  adresem HTTPS; w routingu tunelu ustaw usługę `http://localhost:8080` i
  skopiuj token instalacyjny. Token traktuj jak hasło.
- dane zwykłego serwera SMTP (host, port 465/587, login, hasło i nadawca) albo
  opcjonalnie konto Resend. Możesz ustawić je później z panelu na Macu. Bez
  działającego e-maila kreator celowo nie utworzy pierwszego konta.

## 1. System z Raspberry Pi Imager

1. Przy monitorze, klawiaturze i myszy wybierz **Raspberry Pi OS (64-bit) z
   Desktopem**. Lite też zadziała, ale Desktop ułatwi pierwsze testy w
   przeglądarce na samym Raspberry.
2. W ustawieniach Imagera ustaw nazwę `kla-server`, własnego użytkownika,
   mocne hasło, polską strefę czasową i włącz SSH.
3. Najlepiej dodaj klucz SSH. Nie używaj domyślnego użytkownika `pi`.
4. Uruchom Raspberry, podłącz Internet kablem i dopiero potem podłącz SSD.

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
3. Kliknij link aktywacyjny z poczty i zaloguj się swoim adresem.
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

Instalator pokaże dyski i poprosi o wskazanie SSD, np. `/dev/sda`. Dwa razy
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

Na serwerze pilotowym można świadomie włączyć bezobsługowy start z panelu na
Macu albo poleceniem `sudo kla-enable-auto-unlock`. Klucz techniczny trafia wtedy
do pliku `root-only` na karcie systemowej, a system automatycznie montuje sejf i
uruchamia wszystkie usługi po zaniku prądu. To zapewnia ciągłość pracy, lecz
osłabia ochronę przy kradzieży całego zestawu Raspberry + karta + SSD. Klucz
odzyskiwania eksportów nadal jest osobny i zapisany poza urządzeniem. Wersja
docelowa może przenieść auto-start do TPM lub fizycznego klucza USB.

## 6. Backup SFTP

Uruchom:

```bash
sudo kla-configure-sftp-backup
```

Podaj host, port, login i folder. Skrypt wygeneruje osobny klucz SSH, pokaże
klucz publiczny do wklejenia u dostawcy i każe porównać odcisk serwera.
Codzienna kopia o 03:15 zawiera bazę, prywatne pliki i numer wersji aplikacji.
Archiwum jest szyfrowane `age` jeszcze przed wysłaniem przez SFTP.

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
- Utrata hasła i klucza odzyskiwania oznacza trwałą utratę danych.
- Backup na tym samym SSD nie chroni przed awarią/kradzieżą; SFTP musi być poza
  Raspberry Pi i najlepiej poza lokalem szkoły.

## Granica rozwiązania

To solidny serwer pilota, ale nie wysokodostępna chmura. Brak prądu, Internetu
lub awaria jednego Raspberry wyłączą usługę. Przed prawdziwymi danymi trzeba
zamknąć checklistę z `BEZPIECZENSTWO_PRAWO_RODO.md`, włączyć HTTPS, 2FA dyrektora,
UPS, monitoring oraz wykonać udokumentowany test odtworzenia.
