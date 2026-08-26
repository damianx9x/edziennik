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
**Ustaw połączenie**. Po pełnym restarcie wybierz **Odblokuj po restarcie**,
ponieważ klucz LUKS celowo nie jest zapisany na karcie Raspberry.

Serwer ma trzy warstwy samonaprawy: restart każdej usługi przez systemd,
kontrolę aplikacji, bazy, nginx, antywirusa i tunelu co minutę oraz sprzętowy
watchdog restartujący Raspberry po zawieszeniu systemu. Pełny zanik zasilania
nie otworzy sam szyfrowanego sejfu — po starcie użyj **Odblokuj po restarcie**.

Aktualizacja przyjmuje wyłącznie paczkę
`edziennik-kla-raspberry-source.tar.gz` z identyfikatorem commita i manifestem
SHA-256. Serwer przed migracją sam wykonuje szyfrowany backup, a przy błędzie
wraca do poprzedniej wersji.

Opcja **Skonfiguruj e-mail** pozwala wybrać zwykły SMTP (także hostingowy) lub
Resend. Dane wpisuje się w Terminalu, a hasło jest ukryte. Konfiguracja trafia
po SSH bezpośrednio do zaszyfrowanego sejfu Raspberry i nie zostaje w folderze
na Pulpicie.
