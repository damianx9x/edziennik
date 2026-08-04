import { describe, expect, it } from "vitest";

import { resolveDatabasePoolMax } from "./database-pool";

describe("resolveDatabasePoolMax", () => {
  it("uses a single connection for the local Prisma Dev server", () => {
    expect(
      resolveDatabasePoolMax(
        "postgresql://demo:demo@127.0.0.1:51214/postgres",
      ),
    ).toBe(1);
  });

  it("keeps the regular PostgreSQL default", () => {
    expect(
      resolveDatabasePoolMax("postgresql://demo:demo@127.0.0.1:5432/kla"),
    ).toBe(5);
  });

  it("honours a valid override and caps excessive values", () => {
    const url = "postgresql://demo:demo@db.invalid:5432/kla";
    expect(resolveDatabasePoolMax(url, "3")).toBe(3);
    expect(resolveDatabasePoolMax(url, "99")).toBe(20);
  });

  it("falls back safely when an override is invalid", () => {
    expect(
      resolveDatabasePoolMax(
        "postgresql://demo:demo@localhost:51214/postgres",
        "brak",
      ),
    ).toBe(1);
  });
});
