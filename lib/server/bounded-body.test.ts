import { describe, expect, it } from "vitest";
import { BodyTooLargeError, readBoundedText } from "./bounded-body";

describe("bounded request body", () => {
  const request = (body: string) => new Request("https://example.test", { method: "POST", body });
  it("accepts exactly the byte limit", async () => {
    expect(await readBoundedText(request("ą"), 2)).toBe("ą");
  });
  it("rejects UTF-8 bytes rather than counting characters", async () => {
    await expect(readBoundedText(request("ą"), 1)).rejects.toBeInstanceOf(BodyTooLargeError);
  });
  it("does not need a content-length header", async () => {
    await expect(readBoundedText(request("oversized"), 3)).rejects.toBeInstanceOf(BodyTooLargeError);
  });
  it("rejects a declared large body before consuming it", async () => {
    const req = request("x"); req.headers.set("content-length", "1000");
    await expect(readBoundedText(req, 10)).rejects.toBeInstanceOf(BodyTooLargeError);
    expect(req.bodyUsed).toBe(false);
  });
});
