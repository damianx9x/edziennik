import { describe, expect, it } from "vitest";

import {
  buildConfigurationChecks,
  sanitizeDiagnosticValue,
} from "./diagnostics";

describe("system owner diagnostics", () => {
  it("reports missing security configuration without exposing values", () => {
    const checks = buildConfigurationChecks({
      BETTER_AUTH_SECRET: "short",
      BETTER_AUTH_URL: "http://example.com",
      FILE_STORAGE_PROVIDER: "s3",
    });

    expect(checks.find((check) => check.key === "auth-secret")?.status).toBe(
      "error",
    );
    expect(checks.find((check) => check.key === "app-url")?.status).toBe(
      "warning",
    );
    expect(checks.find((check) => check.key === "storage")?.status).toBe(
      "error",
    );
    expect(
      checks.find((check) => check.key === "director-mfa")?.status,
    ).toBe("ok");
    expect(JSON.stringify(checks)).not.toContain("short");
  });

  it("warns when director MFA is disabled for pilot testing", () => {
    const checks = buildConfigurationChecks({
      KLA_REQUIRE_DIRECTOR_MFA: "0",
    });

    expect(
      checks.find((check) => check.key === "director-mfa"),
    ).toMatchObject({
      status: "warning",
    });
  });

  it("redacts nested personal data and credentials from logs", () => {
    expect(
      sanitizeDiagnosticValue({
        role: "PARENT",
        nested: {
          email: "person@example.com",
          accessToken: "sensitive",
          changedFields: ["name"],
        },
      }),
    ).toEqual({
      role: "PARENT",
      nested: {
        email: "[UKRYTO]",
        accessToken: "[UKRYTO]",
        changedFields: ["name"],
      },
    });
  });
});
