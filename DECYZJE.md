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
