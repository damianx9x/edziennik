# Decyzje architektoniczne

## ADR-001 — pilot zamiast pełnej produkcji

**Data:** 2026-07-25
**Decyzja:** 1 września dostarczamy pilot na danych demonstracyjnych.
**Dlaczego:** pierwotny zakres nie mieści się w budżecie/czasie, a dane dzieci
wymagają odbioru bezpieczeństwa i prawa.

## ADR-002 — natywny Next.js Node

**Data:** 2026-07-25
**Decyzja:** Next.js App Router z `output: "standalone"`, bez Vinext.
**Dlaczego:** jeden build działa lokalnie i na hostingu Node/PostgreSQL.

## ADR-003 — PostgreSQL i Prisma

**Data:** 2026-07-25
**Decyzja:** PostgreSQL + Prisma 7.
**Dlaczego:** role, rodziny, grupy, grafik i audyt wymagają relacji, transakcji
i mocnych ograniczeń.

## ADR-004 — Better Auth

**Data:** 2026-07-25
**Decyzja:** zaproszenia, weryfikacja e-mail i TOTP 2FA od Etapu 1.
**Dlaczego:** 2FA jest wymogiem, a biblioteka ma utrzymywany plugin TOTP.

## ADR-005 — MyDevil MD2

**Data:** 2026-07-25
**Decyzja:** MD2, nie MD1 ani niezarządzany VPS home.pl.
**Dlaczego:** 2 GB RAM daje rozsądniejszy margines, a użytkownik nie chce
administrować Linuksem.

## ADR-006 — jawny komunikator

**Data:** 2026-07-25
**Decyzja:** dostęp dyrektora nie jest ukrytym DW; jest opisany i audytowany.
**Dlaczego:** przejrzystość oraz proporcjonalność ograniczają ryzyko prywatności.

## ADR-007 — marka KLA bez zdjęć dzieci na stagingu

**Data:** 2026-07-25
**Decyzja:** używamy prawdziwego logo i zweryfikowanych informacji biznesowych,
ale nie kopiujemy zdjęć ani nazw dzieci do repozytorium lub stagingu.
**Dlaczego:** minimalizacja danych, trwały wygląd i prostsza procedura zgód.

## ADR-008 — zgłoszenie lokalne przed wysyłką serwerową

**Data:** 2026-07-25
**Decyzja:** Etap 0.5 przygotowuje lokalną paczkę diagnostyczną i korzysta z
systemowego udostępniania. Chroniony zapis i automatyczny e-mail włączymy po
uwierzytelnianiu w Etapie 1.
**Dlaczego:** publiczny endpoint z plikami przed logowaniem byłby źródłem spamu
i ryzyka ujawnienia danych.

## ADR-009 — kontrolowany system UI

**Data:** 2026-07-25
**Decyzja:** tokeny marki, semantyczny HTML, Nunito Sans, Lucide i oficjalne
komponenty; ImageGen tylko dla osobnych materiałów marketingowych.
**Dlaczego:** spójność, dostępność i mniejszy „generatywny” wygląd.

## ADR-010 — wyłącznie język angielski

**Data:** 2026-07-25
**Decyzja:** KLA opisujemy jako prywatną szkołę wyłącznie języka angielskiego.
Nie promujemy innych języków, matematyki, robotyki ani zajęć artystycznych.
**Dlaczego:** bezpośrednia informacja właściciela projektu jest aktualnym
źródłem prawdy i ma pierwszeństwo przed starszym opisem profilu społecznościowego.
