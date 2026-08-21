# KLA na Raspberry Pi 4B 8 GB

Ten wariant jest przeznaczony do pilota i testów: do 500 kont oraz zwykle 1–10
osób jednocześnie. Raspberry Pi musi mieć **64-bitowy Raspberry Pi OS** i
zewnętrzny SSD. Karta microSD nie powinna przechowywać bazy produkcyjnej.

## Instalacja od zera

1. Zainstaluj Raspberry Pi OS Lite 64-bit i w Raspberry Pi Imager włącz SSH.
2. Podłącz SSD, Internet po kablu i zasilacz USB-C 5 V / 3 A.
3. Skopiuj cały folder projektu na Raspberry Pi, np.:
   `scp -r edziennik pi@ADRES_PI:/home/pi/`.
4. Połącz się: `ssh pi@ADRES_PI`.
5. Wejdź do projektu i uruchom:
   `cd /home/pi/edziennik && chmod +x raspberry/*.sh && sudo ./raspberry/install.sh`.
6. Jako adres wpisz docelowe HTTPS, jeśli tunel/domena są już gotowe. W sieci
   lokalnej wpisz tymczasowo `http://ADRES_PI`.
   Instalator może opcjonalnie utworzyć wyłącznie fikcyjną bazę testową i poda
   jednorazowo wspólne, losowe hasło kont `dyrektor`, `wykladowca`, `rodzic`,
   `uczen`. Nie wybieraj tej opcji dla bazy z prawdziwymi danymi.
7. Wydrukuj i schowaj klucz kopii:
   `sudo edziennik-kla-print-recovery-key | lpr` albo zapisz go ręcznie poza Pi.
8. Sprawdź `http://ADRES_PI`, a potem:
   `sudo systemctl status edziennik-kla --no-pager`.

Instalator tworzy PostgreSQL, losowe sekrety, aplikację systemd, nginx,
kontrolę HTTP co 2 minuty oraz szyfrowaną kopię codziennie o 03:15.

## Aktualizacja

Skopiuj nowszy, zaakceptowany commit do osobnego katalogu i uruchom z niego
`sudo ./raspberry/update.sh`. Skrypt najpierw buduje i testuje nową wersję,
wykonuje kopię, migracje, dopiero potem przełącza usługę. Poprzednia wersja
zostaje w `/opt/kla/previous`.

## Kopie i odtwarzanie

- Kopie: `/var/backups/kla`, zaszyfrowane `age`, retencja 30 dni.
- Ręczna kopia: `sudo edziennik-kla-backup`.
- Lustro na podłączony dysk/NAS: dodaj w pliku usługi backupu zmienną
  `Environment=KLA_BACKUP_MIRROR=/mnt/backup-kla`, potem `systemctl daemon-reload`.
- Odtworzenie: `sudo edziennik-kla-restore /var/backups/kla/database-....dump.age`.

Kopia nie gwarantuje dowolnego „cofnięcia” wersji aplikacji. Odtwarzanie uruchamia
migracje bieżącego wydania; dlatego archiwizuj razem kopię bazy, commit i paczkę.

## Udostępnienie w Internecie

Nie przekierowuj portu 3000 na routerze. Użyj Cloudflare Tunnel albo reverse
proxy z prawidłowym HTTPS. Domena może wskazywać na Pi, ale aplikacja przestanie
działać przy braku prądu lub Internetu w budynku. Do pilota zalecane są UPS,
monitoring temperatury i zapasowy SSD. Produkcyjnie bezpieczniejszy jest VPS.

## Diagnostyka

- Logi: `sudo journalctl -u edziennik-kla -n 200 --no-pager`
- Timery: `systemctl list-timers 'edziennik-kla*'`
- Restart: `sudo systemctl restart edziennik-kla`
- Port lokalny: `curl -I http://127.0.0.1:3000`
- Temperatura: `vcgencmd measure_temp`
