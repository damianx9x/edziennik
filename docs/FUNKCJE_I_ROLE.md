# Funkcje i role · v1.0

## Co wspólne

Jedno logowanie rozpoznaje rolę. Każdy ma Start, swój grafik, powiadomienia,
wiadomości, pomoc i zgłoszenie błędu. Interfejs działa na telefonie, tablecie i
komputerze, wspiera motyw ciemny, MFA i instalację PWA.

## Właściciel systemu

Konfiguruje serwer, e-mail, SMS, backup USB/SFTP, diagnostykę Raspberry i pełny
zaszyfrowany eksport. Może wykonywać kontrolowane aktualizacje oraz otworzyć
osobny terminal SSH chroniony Cloudflare Access. Nie otrzymuje „terminala
root” wewnątrz aplikacji. Klucz odtworzenia jest pokazywany tylko raz.

## Dyrektor

- zarządza kartotekami, relacjami rodzin, grupami, salami i lokalizacjami;
- zaprasza role e-mailem albo czasowym QR;
- układa grafik ręcznie albo generuje podgląd bez kolizji; może opublikować
  poprawną część propozycji i później uzupełnić braki;
- publikuje/odwołuje zajęcia, zatwierdza zmiany wykładowców i monitoruje
  obecności;
- wysyła wersjonowane pakiety umowy, kosztorysu/rat i harmonogramu;
- prowadzi ręczne statusy rat, wiadomości, ogłoszenia, materiały, zadania i
  opisowe postępy;
- widzi statystyki i audyt. MFA jest obowiązkowe przed prawdziwymi danymi.

## Wykładowca

Widzi przypisane grupy i uczniów, podaje dostępność z lokalizacją, prowadzi
temat i obecność, publikuje materiały/zadania, ocenia wykonanie i komunikuje się
w dozwolonych kanałach. Zmiany grafiku trafiają do akceptacji dyrektora.

## Rodzic

Może mieć kilkoro dzieci w różnych grupach. Widzi ich grafik, odwołania,
obecności, materiały, zadania, postępy, umowy i raty. Umowę akceptuje
elektronicznie po otwarciu wymaganych dokumentów albo pobiera, podpisuje i
wgrywa skan. System zapisuje niezmienny dowód decyzji.

## Uczeń

Widzi tylko własny plan, lekcje, obecności, materiały, zadania, postępy i
dozwolone rozmowy. Może zgłosić obecność/preferencje, ale ostateczny zapis
lekcji należy do szkoły.

## Dane i ciągłość

PostgreSQL przechowuje wszystkie rekordy i treść strony; prywatne pliki są poza
katalogiem publicznym. Pełny eksport zawiera bazę, dokumenty, materiały,
ustawienia, historię zmian i sekrety ciągłości zaszyfrowane `age`. Osobny klucz
odtworzenia trzeba przechowywać poza Raspberry.
