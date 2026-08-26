# KLA — Raspberry Pi 4B: lokalne demo w jednym uruchomieniu

Ta instrukcja jest dla osoby nietechnicznej. Efektem będzie eDziennik pod
adresem lokalnym, np. `http://192.168.1.50:8080`, widoczny na Raspberry,
telefonie i komputerze w tej samej sieci Wi-Fi/LAN.

## Potrzebujesz

- Raspberry Pi 4B 8 GB, zasilacz, monitor, klawiaturę i mysz;
- Ethernet (zalecany) albo Wi-Fi;
- microSD 32 GB lub większą — tylko system;
- **osobny SSD USB 3.0** 128 GB lub większy — instalator całkowicie go wyczyści
  i zamieni w zaszyfrowany sejf aplikacji.

Nie używaj pendrive’a ani tej samej karty microSD jako sejfu bazy.

## 1. Czysty system

Na Macu pobierz Raspberry Pi Imager. Wybierz kolejno:

1. urządzenie: `Raspberry Pi 4`;
2. system: `Raspberry Pi OS (64-bit)` z Desktopem;
3. kartę microSD;
4. w ustawieniach: własny login i silne hasło, Polska/Warszawa, Wi‑Fi tylko
   jeśli nie używasz kabla.

Uruchom Raspberry z Internetem. Po starcie wykonaj aktualizację z menu systemu
albo w Terminalu:

```bash
sudo apt update && sudo apt full-upgrade -y
```

## 2. Kopiowanie paczki

Przenieś plik `edziennik-kla-raspberry-source.tar.gz` z Maca na pendrive albo
do folderu `Downloads` Raspberry. Podłącz także **pusty SSD**.

## 3. Jedno polecenie instalacji

Otwórz Terminal i wklej dokładnie to:

```bash
cd ~/Downloads && tar -xzf edziennik-kla-raspberry-source.tar.gz && cd edziennik-kla && sudo ./raspberry/install-local-demo.sh
```

Przy pytaniu o dysk wybierz tylko zewnętrzny SSD po rozmiarze/modelu, najczęściej
`/dev/sda`. Nie wybieraj `mmcblk0` — to karta systemowa.

Instalator robi sam:

- aktualizacje systemu i zaporę sieciową;
- pełne szyfrowanie SSD (LUKS2) oraz pokazanie jednorazowego klucza odzyskiwania;
- PostgreSQL z pustą bazą, migracje i bogate dane **wyłącznie fikcyjnej** szkoły;
- Node.js, nginx, antywirus dokumentów, automatyczne kopie i testy odtworzenia;
- usługę startującą ponownie po chwilowym błędzie;
- dostęp tylko z prywatnych adresów sieciowych na porcie 8080.

Po zakończeniu przepisz pokazany adres do Chrome/Safari na urządzeniu w tej
samej sieci. Loginy są proste: `kinga`, `dyrektor`, `wykladowca`, `rodzic` i
`uczen`. Wspólne, losowe hasło instalator pokaże tylko na ekranie.

## 4. Po restarcie Raspberry

Sejf jest celowo zamknięty po odłączeniu prądu. Po zalogowaniu do Raspberry
otwórz Terminal i wpisz:

```bash
sudo kla-unlock
```

Następnie status:

```bash
kla-status
```

## 5. Gdy adres nie działa

1. Sprawdź, czy urządzenie testowe jest w tej samej sieci co Raspberry.
2. Na Raspberry wykonaj `sudo kla-local-url`.
3. Skopiuj wyświetlony adres do przeglądarki.
4. Jeśli nadal nie działa, wykonaj `kla-status` i zapisz zdjęcie wyniku.

Po pomyślnym teście utwórz w routerze rezerwację DHCP dla Raspberry Pi. Dzięki
niej lokalny adres nie będzie się zmieniał. Nie ustawiaj statycznego adresu
bezpośrednio na Raspberry bez znajomości ustawień routera.

## Ważne

To jest tryb odbiorowy po HTTP dla fikcyjnej bazy. Nie dodawaj danych dzieci,
umów ani skanów dokumentów. Do użycia w szkole przechodzimy na wariant
produkcyjny: HTTPS przez Cloudflare, osobne konta, MFA dyrektora, politykę
retencji i przetestowany zewnętrzny backup SFTP.
