import { describe, expect, it, vi } from "vitest";

import { HttpEmailProvider, resolveEmailProviderEndpoint } from "./email-provider";

const validEnvironment = {
  KLA_EMAIL_API_URL: "https://api.mail.example/v1/send",
  KLA_EMAIL_API_TOKEN: "test-token",
  KLA_EMAIL_FROM: "KLA <no-reply@example.com>",
  KLA_EMAIL_API_ALLOWED_HOSTS: "api.mail.example",
  KLA_EMAIL_API_TIMEOUT_MS: "2500",
};

const payload = {
  to: "recipient@example.com",
  subject: "KLA: nowa wiadomość w eDzienniku",
  text: "Zaloguj się do eDziennika.",
  idempotencyKey: "message:test:recipient:test",
};

describe("HTTP email provider hardening", () => {
  it("rejects plaintext, credential-bearing and fragmented endpoints", () => {
    for (const endpoint of [
      "http://api.mail.example/send",
      "https://user:pass@api.mail.example/send",
      "https://api.mail.example/send#fragment",
      "not-a-url",
    ]) {
      expect(
        resolveEmailProviderEndpoint({
          ...validEnvironment,
          KLA_EMAIL_API_URL: endpoint,
        }),
      ).toEqual({ ok: false, code: "PROVIDER_INVALID_URL" });
    }
  });

  it("uses an exact optional hostname allowlist", () => {
    expect(
      resolveEmailProviderEndpoint({
        ...validEnvironment,
        KLA_EMAIL_API_URL: "https://sub.api.mail.example/send",
      }),
    ).toEqual({ ok: false, code: "PROVIDER_HOST_NOT_ALLOWED" });
  });

  it("disables redirects and applies a bounded timeout", async () => {
    const calls: Array<[URL | RequestInfo, RequestInit | undefined]> = [];
    const fetchMock = vi.fn(async (
      input: URL | RequestInfo,
      init?: RequestInit,
    ) => {
      calls.push([input, init]);
      return new Response(null, { status: 202 });
    });
    const provider = new HttpEmailProvider(
      validEnvironment,
      fetchMock as typeof fetch,
    );

    await expect(provider.send(payload)).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = calls[0]!;
    expect(url.toString()).toBe(validEnvironment.KLA_EMAIL_API_URL);
    expect(init).toMatchObject({ method: "POST", redirect: "error" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns a stable timeout code without leaking provider details", async () => {
    const fetchMock = vi.fn(async () => {
      throw new DOMException("request timed out", "TimeoutError");
    });
    const provider = new HttpEmailProvider(
      validEnvironment,
      fetchMock as typeof fetch,
    );

    await expect(provider.send(payload)).resolves.toEqual({
      ok: false,
      code: "TIMEOUT",
    });
  });
});
