# Tymczasowe testy eDziennika z Maca

To rozwiązanie służy wyłącznie do krótkich testów klientki na danych
syntetycznych. Mac pozostaje serwerem aplikacji i bazy.

## Dlaczego link HTTPS zamiast adresu IP

Mac ma lokalny adres za routerem. Sam publiczny adres operatora nie otworzy
aplikacji bez publicznego IPv4, przekierowania portów, DNS i certyfikatu.
Logowanie wymaga dodatkowo poprawnego adresu HTTPS dla bezpiecznych ciasteczek.

Dlatego test używa nazwanego Cloudflare Tunnel:

- połączenie jest inicjowane z Maca na zewnątrz,
- nie otwieramy portów routera,
- klientka zawsze używa `https://demo.kingslanguageacademy.pl`,
- certyfikat HTTPS działa automatycznie,
- tunel `kla-demo` działa jako usługa użytkownika macOS.

Adres pozostaje stały. Mac nadal jest tymczasowym serwerem testowym i nie jest
hostingiem produkcyjnym.

## Uruchomienie

W katalogu projektu:

```bash
npm run host:mac:start
```

Uruchomienie jest dozwolone dopiero po lokalnych testach i commicie. Skrypt
odmówi startu, jeśli repozytorium zawiera niezatwierdzone pliki. Dzięki temu
klientka zawsze testuje jedną, możliwą do odtworzenia wersję.

Skrypt:

1. sprawdza działanie usługi tunelu `kla-demo`,
2. używa stałego adresu HTTPS prowadzącego do portu 3100,
3. eksportuje bieżący commit do prywatnego katalogu
   `~/Library/Application Support/KLA Demo Host/runtime`,
4. uruchamia lokalną bazę, jeśli po restarcie Maca jeszcze nie działa,
5. stosuje wszystkie migracje przed uruchomieniem nowego commita,
6. usuwa z runtime hasło właściciela i hasło danych demo,
7. buduje aplikację z publicznym adresem logowania,
8. uruchamia produkcyjny serwer Next.js,
9. sprawdza aplikację razem z połączeniem do bazy,
10. instaluje aplikację jako usługę użytkownika macOS,
11. co 30 sekund sprawdza aplikację i bazę; błąd lokalny naprawia od razu,
    a tunel restartuje po trzech kolejnych błędach publicznego HTTPS,
12. zapobiega uśpieniu Maca podczas działania aplikacji,
13. tworzy prywatny plik z adresem i kontami testowymi.

Przy pierwszym dodaniu subdomeny Cloudflare może jeszcze przygotowywać jej
certyfikat HTTPS. Skrypt nie wyłącza wtedy aplikacji. `npm run host:mac:status`
osobno pokazuje stan trasy tunelu i gotowość poprawnego HTTPS.

Plik przekazania i polecenie statusu pokazują skrót commita udostępnionego
klientce.

Limit prób logowania działa w pamięci pojedynczego procesu testowego i zeruje
się po restarcie hosta. Docelowy VPS używa limitera bazodanowego.

Dane do przekazania klientce:

`~/Library/Application Support/KLA Demo Host/PRZEKAZ_KLIENTCE.txt`

Plik ma uprawnienia tylko dla właściciela konta na Macu i nie trafia do Git.
Nie przekazuj klientce konta `bog`.

Dyrektor w bieżącym pilocie loguje się bez MFA. Konto `Bóg` nadal wymaga MFA i
nie jest przekazywane klientce.

## Warunki działania

- Mac musi pozostać włączony,
- zasilacz powinien być podłączony,
- internet Play musi działać,
- użytkownik macOS musi pozostać zalogowany,
- nie uruchamiaj testów na prawdziwych danych dzieci.

Terminal ani Codex nie muszą pozostać otwarte. Ekran może się wygasić. Usługa
blokuje uśpienie systemu, pilnuje procesu, aplikacji i połączenia z bazą oraz
automatycznie wstaje po awarii. Po restarcie Maca aplikacja, lokalna baza i
tunel uruchomią się po zalogowaniu użytkownika.

To nadal nie jest gwarancja dostępności 24/7: wyłączenie Maca, brak prądu,
awaria łącza Play lub wylogowanie użytkownika zatrzyma pokaz. Taką gwarancję
może dać dopiero staging na VPS z zewnętrznym monitoringiem.

## Status i logi

```bash
npm run host:mac:status
```

Logi:

- `~/Library/Application Support/KLA Demo Host/logs/service.log`,
- `~/Library/Application Support/KLA Demo Host/logs/service-error.log`,
- `~/Library/Application Support/KLA Demo Host/logs/watchdog.log`,
- `~/Library/Application Support/KLA Demo Host/logs/migrate.log`,
- `~/Library/Logs/com.cloudflare.cloudflared.out.log`,
- `~/Library/Application Support/KLA Demo Host/logs/build.log`.

Logi nie zawierają pliku `.env` ani hasła konta właściciela.

## Zatrzymanie

```bash
npm run host:mac:stop
```

Zatrzymuje aplikację i blokadę uśpienia. Stały tunel pozostaje uruchomiony,
ale bez aplikacji zwróci błąd połączenia. Lokalny serwer programistyczny na
porcie 3000 pozostaje nietknięty.

## Sieć Play

Play oferuje osobną usługę publicznego IPv4 dla wybranych taryf. Nawet po jej
aktywacji bezpośredni hosting wymaga konfiguracji routera i poprawnego HTTPS.
Do testu używamy tunelu, a docelowo VPS — nie wystawiamy portu 3000 z domowej
sieci.
