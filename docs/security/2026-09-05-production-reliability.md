# Production reliability and bounded security review — 2026-09-05

Baseline: v1.4.0 / 848a3c8. Fix candidate: v1.5.0. No production records,
passwords, keys, or DNS entries were changed by the probes.

## Findings

| ID | Severity | Evidence | Remediation |
| --- | --- | --- | --- |
| OPS-01 | High availability risk | MemoryHigh/MemoryMax configured, but cgroup v2 controllers omitted memory; MemoryCurrent unset | prepare boot flag, verify controller and measured usage after controlled reboot |
| OPS-02 | High integrity risk | healthcheck did not share maintenance lock | acquire same lock as restore/update/backup; preserve explicit internal restore healthcheck |
| OPS-03 | Medium | panel persisted KLA_BACKUP_RETENTION_DAYS, script used different variable | validated configured value now controls retention |
| OPS-04 | Medium | absent configured USB could still report successful backup | preserve local copy, return failure for incomplete configured destination |
| OPS-05 | Low, local-only | broker read could wait indefinitely for newline | 10-second socket receive timeout and object-type validation |

## Bounded unauthenticated HTTP probes

`node scripts/security-boundary-probe.mjs`: 19/19 expected denials on the public
application. Cases: owner/settings/editor, export and private file boundaries,
bootstrap reopening, forged cookie, middleware-header forgery, cross-origin
writes, unauthenticated administrative writes, role mass assignment, hidden
configuration and traversal paths. Requests were spaced, time-bounded and stopped
on unexpected success or server errors. No password spraying, destructive writes,
persistence, or denial-of-service flood was performed. No bypass was demonstrated.

## Resource measurement

Raspberry Pi 4, approximately 4 GiB physical RAM. Local read-only benchmark:
1/4/8/16 concurrency, 384 requests total, no unexpected failures. Accepted-request
p95 at most 48 ms in this short sample; intentional 429 responses under bursts.
Temperature 52.1–55 C; available RAM remained above 2.2 GiB. High response rates
dominated by rejections are not application throughput. This does not demonstrate
1000 simultaneous users, authenticated workload capacity or long-run stability.

## Recovery evidence and limits

Encrypted backup copied off-device to the operator's Mac with matching SHA-256.
The deployment pipeline performs real pg_restore into an isolated temporary
database on the Pi before switching release. Additionally, the downloaded copy
was decrypted and safely extracted on the Mac, then restored with PostgreSQL 17
into an isolated cluster without TCP listeners: 59 tables, 1 private file, 3 seconds
for the extraction/restore/check sequence. Temporary plaintext data and cluster
were removed after successful completion. No application or email queue was started.
This proves database/file recovery on a second device, not full service failover.
A UPS, independent external monitoring and a standby service host remain separate
operational acceptance items; see CURRENT_WORK.md.

Memory-controller configuration follows the Raspberry Pi maintainer explanation:
[memory cgroup configuration](https://github.com/raspberrypi/linux/issues/6980).
Use cgroup v2 files, not the legacy /proc/cgroups table, to verify activation.

## Acceptance of this candidate

New Python operational tests cover timer timezone, no catch-up, hostile input,
boot argument preservation, maintenance contention and retention integration.
TypeScript validates the form and required acknowledgement. Browser QA uses a
temporary local-only fixture removed before build/commit; it does not alter the
production restart policy. New UI was checked at 375×812 and 1440×900.
Final deployment and reboot results must be recorded separately after completion.
