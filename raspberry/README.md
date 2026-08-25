# KLA Server — Raspberry Pi 4B 8 GB

Gotowy wariant pilota dla standardowego **Raspberry Pi OS 64-bit**. Baza
PostgreSQL i wszystkie prywatne pliki są w jednym szyfrowanym sejfie LUKS2 na
zewnętrznym SSD. Karta microSD zawiera system i aplikację, ale nie bazę,
dokumenty, hasło bazy ani sekret sesji.

## Co trzeba przygotować

- Raspberry Pi 4B 8 GB, oficjalny zasilacz i kabel sieciowy;
- karta microSD 32 GB lub większa;
- osobny SSD USB 3.0 (instalator usunie z niego całą zawartość);
- najlepiej UPS dla Raspberry Pi i SSD;
- drugi komputer do zapisania klucza odzyskiwania;
- opcjonalnie konto SFTP na innym urządzeniu lub u dostawcy backupu.
- domenę dodaną do Cloudflare oraz utworzony tunel z publicznym adresem HTTPS;
  w routingu tunelu ustaw usługę `http://localhost:8080` i skopiuj token
  instalacyjny. Token traktuj jak hasło.

## 1. System z Raspberry Pi Imager

1. Wybierz **Raspberry Pi OS Lite (64-bit)**. Wersja Desktop też zadziała, ale
   Lite jest prostsza i bezpieczniejsza dla serwera.
2. W ustawieniach Imagera ustaw nazwę `kla-server`, własnego użytkownika,
   mocne hasło, polską strefę czasową i włącz SSH.
3. Najlepiej dodaj klucz SSH. Nie używaj domyślnego użytkownika `pi`.
4. Uruchom Raspberry, podłącz Internet kablem i dopiero potem podłącz SSD.

## 2. Jedna instalacja

Skopiuj rozpakowaną paczkę na Raspberry, połącz się przez SSH i uruchom:

```bash
cd ~/edziennik-kla
chmod +x raspberry/*.sh
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

## 3. Po restarcie

Raspberry Pi 4B nie ma wbudowanego TPM. Klucz nie jest więc zapisywany obok
danych, bo zniweczyłoby to szyfrowanie. Po pełnym restarcie połącz się przez SSH
i wykonaj jedną komendę:

```bash
sudo kla-unlock
```

Potem całość działa automatycznie. Stan sprawdzisz przez:

```bash
kla-status
```

Pełny automatyczny start bez hasła wymaga sprzętowego modułu TPM 2.0 lub
fizycznego klucza USB. Nie zapisujemy klucza na karcie microSD.

## 4. Backup SFTP

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

## 5. Retencja

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
zamknąć checklistę z `BEZPIECZENSTWO_I_RODO.md`, włączyć HTTPS, 2FA dyrektora,
UPS, monitoring oraz wykonać udokumentowany test odtworzenia.
