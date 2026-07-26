# Tymczasowe testy eDziennika z Maca

To rozwiązanie służy wyłącznie do krótkich testów klientki na danych
syntetycznych. Mac pozostaje serwerem aplikacji i bazy.

## Dlaczego link HTTPS zamiast adresu IP

Mac ma lokalny adres za routerem. Sam publiczny adres operatora nie otworzy
aplikacji bez publicznego IPv4, przekierowania portów, DNS i certyfikatu.
Logowanie wymaga dodatkowo poprawnego adresu HTTPS dla bezpiecznych ciasteczek.

Dlatego test używa Cloudflare Quick Tunnel:

- połączenie jest inicjowane z Maca na zewnątrz,
- nie otwieramy portów routera,
- klientka dostaje losowy adres `https://....trycloudflare.com`,
- certyfikat HTTPS działa automatycznie,
- tunel nie wymaga konta Cloudflare.

Adres jest tymczasowy i zmieni się po ponownym uruchomieniu tunelu. Quick
Tunnel nie ma gwarancji dostępności i nie jest hostingiem produkcyjnym.

## Uruchomienie

W katalogu projektu:

```bash
npm run host:mac:start
```

Uruchomienie jest dozwolone dopiero po lokalnych testach i commicie. Skrypt
odmówi startu, jeśli repozytorium zawiera niezatwierdzone pliki. Dzięki temu
klientka zawsze testuje jedną, możliwą do odtworzenia wersję.

Skrypt:

1. pobiera przypiętą wersję `cloudflared` dla Apple Silicon,
2. sprawdza SHA-256 pobranego pliku,
3. uruchamia tunel HTTPS do portu 3100,
4. eksportuje bieżący commit do `.data/mac-test-host/runtime`,
5. usuwa z jej środowiska hasło właściciela i hasło danych demo,
6. buduje aplikację z publicznym adresem logowania,
7. uruchamia produkcyjny serwer Next.js,
8. sprawdza odpowiedź lokalną i publiczną,
9. zapobiega uśpieniu Maca podczas działania aplikacji,
10. tworzy prywatny plik z adresem i kontami testowymi.

Plik przekazania i polecenie statusu pokazują skrót commita udostępnionego
klientce.

Limit prób logowania działa w pamięci pojedynczego procesu testowego i zeruje
się po restarcie hosta. Docelowy VPS używa limitera bazodanowego.

Dane do przekazania klientce:

`.data/mac-test-host/PRZEKAZ_KLIENTCE.txt`

Plik ma uprawnienia tylko dla właściciela konta na Macu i nie trafia do Git.
Nie przekazuj klientce konta `bog`.

Dyrektor w bieżącym pilocie loguje się bez MFA. Konto `Bóg` nadal wymaga MFA i
nie jest przekazywane klientce.

## Warunki działania

- Mac musi pozostać włączony,
- zasilacz powinien być podłączony,
- internet Play musi działać,
- nie wyłączaj procesu Terminal/Codex odpowiedzialnego za test,
- nie restartuj Maca,
- nie uruchamiaj testów na prawdziwych danych dzieci.

Ekran może się wygasić. Skrypt blokuje tylko uśpienie systemu.

## Status i logi

```bash
npm run host:mac:status
```

Logi:

- `.data/mac-test-host/logs/app.log`,
- `.data/mac-test-host/logs/tunnel.log`,
- `.data/mac-test-host/logs/build.log`.

Logi nie zawierają pliku `.env` ani hasła konta właściciela.

## Zatrzymanie

```bash
npm run host:mac:stop
```

Zatrzymuje aplikację, tunel i blokadę uśpienia. Publiczny adres od razu
przestaje działać. Lokalny serwer programistyczny na porcie 3000 pozostaje
nietknięty.

## Sieć Play

Play oferuje osobną usługę publicznego IPv4 dla wybranych taryf. Nawet po jej
aktywacji bezpośredni hosting wymaga konfiguracji routera i poprawnego HTTPS.
Do testu używamy tunelu, a docelowo VPS — nie wystawiamy portu 3000 z domowej
sieci.
