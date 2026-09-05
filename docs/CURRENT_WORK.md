# Stan wdrożenia i dalsze prace

Aktualizacja: 4 września 2026.

## Co działa

- Etapy 0–6 są zamknięte technicznie i objęte testami regresji.
- Etap 7 działa na Raspberry Pi w trybie przedprodukcyjnym.
- Publiczna strona, logowanie, role, kartoteki, grafik, umowy, płatności,
  wiadomości, powiadomienia, nauka i postępy są połączone jednym modelem ról.
- Właściciel może włączać moduły osobno dla ról bez kasowania danych.
- Dyrektor może otrzymać delegowany dostęp do edycji strony oraz importu i
  eksportu kartotek; import danych jest domyślnie wyłączony.
- Wydanie Raspberry jest podpisane, sprawdza migracje, zasoby przeglądarki,
  zdrowie usługi i wykonuje rollback przy błędzie.

## Co jest aktualnie wdrażane

- jednoznaczny dział „Kartoteki i konta” z zakładkami zamiast dublowania pozycji;
- rozbudowane, lecz ograniczone do bezpiecznego katalogu style widgetów;
- publiczne adresy szkoły i przekierowanie krótkiej domeny;
- aktualna galeria i polsko-angielska dokumentacja projektu;
- zadaniowy odbiór na telefonie i komputerze każdej roli.

## Warunki decyzji produkcyjnej

- [ ] zaakceptowane teksty umów, informacji konsumenckich i procedur RODO;
- [ ] MFA dyrektora zweryfikowane na urządzeniu docelowym;
- [ ] działające SMTP wraz z próbą dostarczenia i obsługą błędu;
- [ ] zewnętrzna, zaszyfrowana kopia oraz udokumentowany test odtworzenia;
- [ ] retencja ustalona osobno dla umów, wiadomości, obecności i audytu;
- [ ] testy odbiorowe dyrektora, wykładowcy, rodzica i ucznia na telefonie;
- [ ] decyzja o docelowym hostingu, UPS i osobie odpowiedzialnej za incydenty.

Prawdziwych danych dzieci nie należy wprowadzać przed zamknięciem tej listy.
