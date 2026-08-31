# Panel KLA — sterowanie Raspberry z Maca

Dwukrotnie kliknij **KLA Serwer.app**. Panel najpierw używa zapisanego adresu,
potem nazwy `kingslanguageacademy.local`, a na końcu sam wyszukuje właściwe
Raspberry w bieżącej sieci lokalnej i zapamiętuje jego nowy adres. Zwykła
zmiana portu Ethernet albo adresu IP nie wymaga ręcznej rekonfiguracji.
Cloudflare Tunnel jest połączeniem wychodzącym i publiczny adres
`demo.kingslanguageacademy.pl` również nie zależy od lokalnego IP.

Panel działa z Maca w tej samej sieci lokalnej. Z innej lokalizacji publiczna
aplikacja nadal działa przez Cloudflare, ale zdalne komendy administracyjne są
celowo niedostępne bez osobno skonfigurowanego Cloudflare Access albo VPN.

Klucz prywatny pozostaje w `~/.ssh/kla_raspberry_ed25519`, a nie w tym folderze
ani repozytorium. Gdy zmieni się użytkownik, port SSH lub nazwa hosta, wybierz
**Ustaw połączenie**.

Serwer ma warstwowy auto-start: LUKS/crypttab, montowanie sejfu, zależności
systemd, automatyczny restart aplikacji i tunelu, kontrolę usług co minutę,
trwały dziennik oraz sprzętowy watchdog. Opcja **Audyt startu po zaniku prądu**
sprawdza każdą warstwę osobno.

Przed pierwszym przeniesieniem urządzenia wybierz **Włącz automatyczny start po
zaniku prądu**. Jednorazowo wpiszesz dotychczasowe hasło sejfu. System zapisze
na karcie Raspberry osobny klucz techniczny dostępny wyłącznie dla konta root,
dzięki czemu po kolejnych restartach sam otworzy dysk i uruchomi aplikację.
Jeśli auto-start nie został jeszcze włączony, po restarcie użyj **Odblokuj po
restarcie**.

Opcja **Utwórz, przetestuj i pobierz backup na Maca** wykonuje nową szyfrowaną
kopię, odtwarza ją próbnie do osobnej bazy, pobiera plik wraz z sumą SHA-256 do
`~/Desktop/rasbery serwer/kopie` i sprawdza integralność także na Macu. Plik
`KLA-KLUCZ-ODZYSKIWANIA.txt` zawiera klucz age do tych kopii. Nie jest hasłem
partycji LUKS; to dwa niezależne zabezpieczenia.

Aktualizacja przyjmuje wyłącznie paczkę
`edziennik-kla-raspberry-source.tar.gz` z identyfikatorem commita i manifestem
SHA-256. Serwer przed migracją sam wykonuje szyfrowany backup, a przy błędzie
wraca do poprzedniej wersji.

Opcja **Skonfiguruj e-mail** pozwala wybrać zwykły SMTP (także hostingowy) lub
Resend. Dane wpisuje się w Terminalu, a hasło jest ukryte. Konfiguracja trafia
po SSH bezpośrednio do zaszyfrowanego sejfu Raspberry i nie zostaje w folderze
na Pulpicie.
