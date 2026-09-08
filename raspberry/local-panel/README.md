# KLA — lokalny panel Raspberry, 1.1.2

Panel jest dodatkiem do istniejącej instalacji KLA, nie instalatorem nowej bazy.
Profil przeglądarki służy wyłącznie panelowi lokalnemu. Nie zapisuj w nim haseł
ani nie używaj go do logowania do szkoły. Panel pomija pytanie o utworzenie
pęku kluczy pulpitu, aby pierwszy start nie wymagał dodatkowej konfiguracji.
Wymaga Python 3, Chromium, systemd użytkownika oraz już skonfigurowanego
`sudo -n /usr/local/sbin/kla-control`. Nie poszerza uprawnień sudo.

## Instalacja

W rozpakowanym, zweryfikowanym pakiecie uruchom jako użytkownik pulpitu:

```bash
bash raspberry/local-panel/install.sh
```

Otwórz „KLA — serwer” w menu aplikacji lub na pulpicie. Skrót znajduje się też
w autostarcie sesji graficznej. Raspberry musi mieć skonfigurowane logowanie
do pulpitu (na obecnym serwerze istnieje autologowanie). Nie usuwaj Chromium,
labwc ani sesji graficznej, jeżeli chcesz używać monitora.

## Użytkowanie

- **Odśwież stan** pobiera rzeczywisty stan usług. Czerwony wpis oznacza problem;
  żółty — ostrzeżenie wymagające przeczytania. Brak odpowiedzi nie oznacza sukcesu.
- **Uruchom serwis** uruchamia istniejące usługi. Sejf musi być dostępny do zapisu.
- **Bezpieczny restart aplikacji** używa dotychczasowej ochrony kopii i blokad;
  nie restartuje całego komputera. Użytkownicy mogą utracić niezapisany formularz.
- **Zrób kopię teraz** zapisuje szyfrowaną kopię w skonfigurowanym miejscu.
  To nie jest pobranie kopii na Maca. Zachowuj osobną kopię poza Raspberry.
- **Sprawdź odtworzenie kopii** testuje ostatnią kopię w osobnej bazie, bez
  podmieniania danych szkoły. Poczekaj na wynik operacji.

Każde polecenie potwierdzasz w oknie. Panel pozwala na jedną operację naraz.
Po restarcie samego panelu otwórz skrót ponownie: lokalny token sesji zmienia się.
Nie kopiuj prywatnego pliku startowego ani jego adresu do innych osób.

Zamknięty sejf otwiera się dotychczasowym narzędziem `sudo kla-unlock` w Terminalu.
Przy błędach dysku lub zasilania panel nie formatuje nośnika i nie wymusza zapisu.
Nie udostępnia surowego terminala, kluczy ani haseł. Panel nie jest wystawiony
przez Cloudflare ani w sieci LAN; słucha wyłącznie na `127.0.0.1:8765`.

## Diagnostyka i cofnięcie

```bash
systemctl --user status kla-local-panel
journalctl --user -u kla-local-panel -n 30
systemctl --user restart kla-local-panel
```

Aby wyłączyć panel: `systemctl --user disable --now kla-local-panel` oraz
przenieś `~/.config/autostart/kla-local-panel.desktop` poza folder autostartu.
Aplikacja szkoły pozostaje uruchomiona. Poprzednie pliki panelu są zachowane
w `~/.local/share/kla-local-panel/previous-*` po aktualizacji istniejącej instalacji.

Bezpieczeństwo: token losowy na czas procesu, plik startowy 0600 w prywatnym
katalogu runtime, kontrola Host/Origin/Authorization, brak CORS, CSP, jawna lista
poleceń bez shell interpolation. Zaufana granica to konto użytkownika pulpitu.
Osoba z dostępem do odblokowanego pulpitu może sterować usługą; zamykaj dostęp
fizyczny do urządzenia. `--demo` służy wyłącznie lokalnym testom i nie uruchamia sudo.
