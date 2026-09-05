# eDziennik KLA

[Polski](README.md) · [English](README.en.md)

A mobile-first operating system for a small private English-language school.
It brings scheduling, people and family relationships, contracts, instalments,
messages, teaching materials, attendance and student progress into one
role-aware application.

**Public pilot:** [demo.kingslanguageacademy.pl](https://demo.kingslanguageacademy.pl)
**Design and development:** Damian Eron · [damianx9x@me.com](mailto:damianx9x@me.com)

## Why this project exists

The central business problem is a conflict-free timetable built around three
scarce resources: room, teacher and group. The scheduling assistant also
checks student availability, room capacity, location preferences and travel
time between locations. Every generated proposal must be reviewed before it
is published.

The same domain model powers:

- people, groups, rooms, locations and parent–child relationships;
- immutable contract PDF versions, acceptance evidence and signed scans;
- instalment schedules with manual payment status and audit history;
- direct and group messaging, announcements, attachments and read receipts;
- learning materials, assignments, private submissions and feedback;
- attendance, descriptive progress observations and non-diagnostic trends;
- encrypted backups, tested restores, signed updates and operational health.

## Roles and privacy

- A **director** manages the school and approves timetable changes.
- A **teacher** sees assigned groups, availability, lessons and learning work.
- A **parent** sees only linked children and their relevant formal matters.
- A **student** sees their own plan, learning, attendance and progress—never a
  parent's contracts or payments.
- A **system owner** maintains infrastructure and auditability without bypassing
  data-integrity rules.

Authorization is enforced on the server for every read and write. Hiding a UI
control is never considered a security boundary.

## Architecture

The application is a modular monolith built with Next.js 16, React 19,
TypeScript, PostgreSQL and Prisma 7. Better Auth provides session and TOTP MFA
flows. A Raspberry Pi deployment uses systemd, nginx, Cloudflare Tunnel,
LUKS2, age-encrypted backups, ClamAV, fail2ban and unattended upgrades.

This structure keeps a single-school deployment understandable while retaining
clear `modules/<feature>` boundaries and replaceable adapters for e-mail,
files, SMS and future object storage.

## Current status

This repository is **pre-production**. Stages 0–6 are technically complete;
Stage 7 is the acceptance and operational-readiness phase. Real student data
requires completed privacy/legal review, retention settings, director MFA,
working outbound mail, an off-device encrypted backup and a documented restore
test. See [current work](docs/CURRENT_WORK.md), [product scope](docs/PRODUCT_SCOPE.md)
and [security](SECURITY.md).

## Local development

Requirements: Node.js 22–24 and PostgreSQL.

```bash
cp .env.example .env
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run dev
```

Before a commit:

```bash
npm run check
npm run build
npm run check:raspberry
```

The full engineering rationale, risks and scaling path are documented in
[docs/ENGINEERING_HANDOFF.md](docs/ENGINEERING_HANDOFF.md). Product screenshots
are available in [docs/GALLERY.md](docs/GALLERY.md).

## License

Source code is licensed under [GNU AGPL-3.0](LICENSE). School names and marks
are handled separately in [NOTICE](NOTICE). Responsible security reports must
follow [SECURITY.md](SECURITY.md).
