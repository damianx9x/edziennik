# Model bezpieczeństwa urządzenia KLA

## Chronione dane

Sejf `/srv/kla-vault` zawiera bazę PostgreSQL, prywatne dokumenty, sekret sesji,
hasło techniczne bazy, klucze backupów i lokalne kopie. Chroni je LUKS2. Aplikacja działa jako osobny
użytkownik `kla`, PostgreSQL jako `postgres`, a usługi mają ograniczenia
systemd. Port Node słucha wyłącznie na `127.0.0.1`; ruch przyjmuje nginx.

## Przed czym to chroni

- odczyt bazy i dokumentów z ukradzionego/odłączonego SSD;
- przypadkowe wystawienie dokumentów w katalogu publicznym;
- zapis pliku bez skanu antywirusowego na produkcji;
- podsłuch przesyłania backupu (SFTP) i odczyt kopii u dostawcy (`age`);
- niezauważalnie uszkodzoną kopię dzięki sumie SHA-256 i realnemu testowi
  odtworzenia do tymczasowej bazy;
- podstawowe ataki sieciowe przez zaporę, fail2ban, aktualizacje i brak
  publicznego portu PostgreSQL/Node.

## Czego to nie gwarantuje

- nie chroni danych po poprawnym odblokowaniu przed administratorem systemu;
- nie zastępuje 2FA, prawidłowych uprawnień aplikacji, HTTPS ani procedur RODO;
- nie zapewnia pracy podczas awarii prądu, Internetu, SSD lub samego Pi;
- nie odzyska danych bez hasła/klucza sejfu i klucza kopii;
- nie zatwierdza prawnie okresów retencji — robi to szkoła z prawnikiem/IOD.

## Reguły operacyjne

1. Nie zapisuj klucza odzyskiwania na Raspberry Pi, karcie microSD ani SFTP.
2. Nie wysyłaj kluczy e-mailem, Messengerem ani w zgłoszeniu błędu.
3. SFTP ma mieć osobne konto, ograniczone do folderu kopii i najlepiej zakaz
   usuwania najnowszych kopii przez konto urządzenia.
4. `kla-status` sprawdzaj po restarcie; nie ignoruj braku testu odtworzenia.
5. Co kwartał zapisz protokół testu: data, użyta kopia, wynik, osoba i czas.
6. Przy utracie urządzenia zmień sekrety sesji, hasła techniczne i klucz SFTP,
   nawet jeżeli sejf pozostał zamknięty.
