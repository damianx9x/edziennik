# Etap 3 — grafik KLA

## Co działa w pierwszym odbiorze

- jeden plan pod adresem `/panel/plan`,
- dyrektor: automatyczny Asystent i pełna edycja ręczna,
- wykładowca: tylko plan przypisanych grup,
- rodzic: plan grup powiązanych dzieci,
- uczeń: własny, uproszczony plan,
- widok sześciu dni na komputerze i jednego dnia na telefonie,
- ręczne dodanie w kolejności grupa → termin → wykładowca → sala,
- wyszarzone zajęte zasoby wraz z powodem,
- kolizja sali, wykładowcy, grupy i wspólnego ucznia,
- pojemność sali,
- tygodniowa dostępność wykładowcy,
- wymagania grupy: liczba i długość lekcji, dni, zakres godzin, preferencje,
- szkic automatyczny, podgląd i osobne zatwierdzenie,
- publikacja rejestrowana w audycie,
- odwołanie lekcji dopiero po jawnym potwierdzeniu.

## Jak działa Asystent

1. Dyrektor otwiera **Grafik → Ułóż automatycznie**.
2. Raz ustawia wymagania każdej grupy.
3. Opcjonalnie zawęża dostępność wykładowców.
4. Klika **Ułóż propozycję**.
5. System pokazuje każdą proponowaną lekcję lub prostą listę braków.
6. Dopiero po zaznaczeniu potwierdzenia dyrektor publikuje plan.
7. Opublikowane lekcje pozostają na miejscu przy następnym generowaniu.
   Można je wcześniej poprawić albo odwołać w trybie ręcznym.

## Jak sprawdzić ręcznie

### Komputer 1440 × 900

1. Zaloguj się jako dyrektor demo.
2. Otwórz **Grafik**.
3. W Asystencie otwórz jedną grupę i zmień preferowaną godzinę.
4. Zapisz, wygeneruj szkic i sprawdź różne dni.
5. Przejdź do **Ułóż ręcznie**.
6. Otwórz **Dodaj zajęcia**, wybierz grupę i zajęty termin.
7. Sprawdź, czy wykładowca i sala są szare i pokazują powód.

### Telefon 375 × 812

1. Otwórz **Plan** z dolnej nawigacji.
2. Zmień dzień sześcioma dużymi przyciskami.
3. Sprawdź komunikat dnia bez zajęć.
4. Otwórz dzień z lekcją i kartę „•••”.
5. Upewnij się, że można zmienić termin bez przeciągania.

## Źródła wzorców

- W3C: przeciąganie musi mieć prostą alternatywę pojedynczego wskaźnika:
  <https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements>
- Timefold: konflikty sali, wykładowcy i grupy są twardymi ograniczeniami:
  <https://docs.timefold.ai/timefold-solver/1.x/quickstart/shared/school-timetabling/school-timetabling-constraints>
- Google Calendar: porównanie kalendarzy i wolnych sal przed wyborem terminu:
  <https://support.google.com/calendar/answer/6294878?hl=EN>
- Microsoft Outlook: zajęte terminy są wizualnie niedostępne, a AutoPick szuka
  wolnego wariantu:
  <https://support.microsoft.com/en-us/outlook/use-the-scheduling-assistant-and-room-finder-for-meetings-in-outlook>

## Pozostało w Etapie 3

- cykliczne serie i wyjątki,
- temat lekcji i szybka obecność,
- jawne blokowanie/odblokowanie pojedynczej opublikowanej lekcji,
- test dwóch równoległych żądań HTTP w pełnym przepływie,
- odbiór klientki na serwerze testowym z konkretnego commita.
