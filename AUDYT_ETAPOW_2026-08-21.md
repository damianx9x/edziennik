# Audyt etapów i uwag z przeglądu — 21 sierpnia 2026

## Stan etapów

| Etap | Stan | Co realnie działa |
| --- | --- | --- |
| 0–0.7 | zakończony | Fundament, marka KLA, strona publiczna, slider, responsywny panel demonstracyjny i edytor treści. |
| 1 | zakończony | Jedno logowanie, role, zaproszenia e-mail/QR, odzyskanie dostępu, sesje i 2FA gotowe do wymuszenia. |
| 2 | zakończony | Kartoteki osób, grup, sal i lokalizacji, relacje, archiwizacja, import/podgląd/eksport CSV i historia zmian. |
| 3 | zakończony | Grafik ręczny, kolizje sali/wykładowcy/grupy, asystent, publikacja po podglądzie, widoki ról i obecności. |
| 4 | zakończony funkcjonalnie | Wersjonowane PDF, przypisanie rodzic–dziecko, akceptacja append-only, osobne informacje konsumenckie, FAQ, ręczny status płatności i powiadomienia. Odbiór prawny wzorca pozostaje bramką przed produkcją. |
| 5 | funkcjonalny, do odbioru | Rozmowy grupowe i bezpośrednie, ogłoszenia, załączniki, potwierdzenia przeczytania, kolejka e-mail oraz audyt dostępu dyrektora. Integracja z Meta nie jest wdrożona. |
| 6 | niewykonany | Materiały, zadania domowe, monitoring wykonania oraz pełna PWA. |
| 7 | niewykonany | Test pilota z klientką, szkolenie, test odtwarzania kopii, retencja, monitoring produkcyjny i formalny odbiór prawny/RODO. |

## Uwagi z załączonego PDF

| Uwaga | Wynik po audycie |
| --- | --- |
| Drugie zdjęcie przepełnia pamięć | Naprawione: treść i obrazy przeniesiono z małego `localStorage` do IndexedDB; starszy zapis migruje się automatycznie. |
| Szeroka grafika jest ucinana | Naprawione: dyrektor wybiera układ obok tekstu albo szeroki baner oraz „wypełnij” / „pokaż całe zdjęcie”. |
| Skalowanie wielu urządzeń | Sprawdzone po pełnym buildzie przy 375×812 i 1440×900; brak poziomego przewijania i błędów konsoli na badanych ekranach. Dalsze moduły muszą powtarzać ten test. |
| Ciemny tryb wygląda jak negatyw | Poprawione tokeny powierzchni i kontrastu; zdjęcia nie są już sztucznie przyciemniane. |
| Zmiana nie pokazuje starej wartości | Naprawione: dyrektor widzi „Było” i „Będzie”, także nazwę lokalizacji zamiast UUID. |
| Dostępność wykładowcy | Naprawione: wykładowca wpisuje własne dni/godziny; tylko dyrektor publikuje plan. |
| Godzina końca szkoły dziecka | Do etapu planistycznego 3.1: potrzebny osobny model preferencji dziecka/rodzica i reguła pierwszeństwa bez ujawniania rozkładu innym rolom. |
| Modułowy kreator strony | Częściowo: treści, zdjęcia, kolejność i układ slidera są edytowalne. Dowolne widgety, rozciąganie i globalna publikacja wymagają serwerowego CMS — osobny etap. |
| Techniczne informacje dla dyrektora | Spełnione: ekran Ustawień używa języka czynności i stanu danych, bez SQL/Prisma. Głęboka diagnostyka pozostaje poza rolą dyrektora. |
| Aktualizacje bez zmiany bazy | Skorygowane założenie: nowe funkcje czasem wymagają migracji. Stosujemy migracje rozszerzające i kompatybilne wstecz, nie obietnicę „bez zmian bazy”. |
| Klucz odzyskania i kopie | Przygotowane dla Raspberry: drukowalny klucz `age`, kopie codzienne, retencja i odtwarzanie. Panelowa konfiguracja celu kopii nadal należy do etapu 7. |
| Przeczytane powiadomienie niewidoczne | Naprawione: przeczytana karta ma trwały zielony stan i etykietę. |
| Wiadomości na telefonie | Podstawowy mobilny wątek, odbiorcy, pliki i potwierdzenia są. Pełny test manualny jest częścią odbioru tej poprawki. |
| Messenger Facebook | Świadomie niewdrożony: najpierw potwierdzenie zakresu oficjalnego API i zgód. System nie udaje dostępu do istniejących prywatnych grup. |
| Umowy, SMS, VAT | Mechanika wersji i dowodów działa. SMS nie jest nazywany podpisem. VAT nie jest hardkodowany — wymaga decyzji księgowej. Wzorzec i ścieżka konsumencka wymagają prawnika. |
| Relacje i wyszukiwanie kartotek | Relacje są w bazie i kartach; dopracowanie jednego wielokierunkowego edytora przypisań pozostaje poprawką 2.1. |
| Wiadomość z karty osoby | Rozmowy bezpośrednie są gotowe; przejście z każdej karty trzeba objąć końcowym testem hiperłączy. |
| Zaproszenia | E-mail i czasowy QR z rolą działają; mikrocopy i test z osobą nietechniczną pozostają częścią odbioru. |
| RODO i prawo | Audyt zapisano w `BEZPIECZENSTWO_I_RODO.md`; nie zastępuje opinii prawnika/IOD. |
| Raspberry Pi 4B 8 GB | Przygotowano instalację natywną w `raspberry/`; właściwa dla pilota 1–10 jednoczesnych osób przy SSD, UPS i zewnętrznej kopii. |

## Najbliższa kolejność

1. Dokończyć odbiór Etapu 5 na telefonie i desktopie dla każdej roli.
2. Zrobić preferencje godzin ucznia/rodzica i wielokierunkowy edytor relacji jako małe wydanie 3.1/2.1.
3. Zrealizować Etap 6: materiały, zadania, monitoring i PWA.
4. Przed prawdziwymi danymi wykonać Etap 7: prawnik/IOD/księgowa, 2FA dyrektora, test backup–restore, retencja, monitoring i szkolenie.
