import { describe, it, expect, vi } from "vitest";
import { createHmac } from "crypto";
import { isValidSignature } from "../../validation/validateMetaSignature";

vi.mock("../../lib/getSecrets", () => ({
  getSecrets: vi.fn().mockResolvedValue({
    SUPABASE_SERVICE_ROLE_KEY: "unused-in-this-test",
    META_VERIFY_TOKEN: "unused-in-this-test",
    META_APP_SECRET: "test-app-secret",
    ANTHROPIC_API_KEY: "unused-in-this-test",
  }),
}));

const APP_SECRET = "test-app-secret";

function sign(body: string, secret = APP_SECRET) {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

describe("isValidSignature", () => {
  it("returns true for a correctly signed payload", async () => {
    const body = JSON.stringify({ hello: "world" });
    const header = sign(body);
    await expect(isValidSignature(body, header)).resolves.toBe(true);
  });

  it("returns false when the payload has been tampered with after signing", async () => {
    const body = JSON.stringify({ hello: "world" });
    const header = sign(body);
    const tamperedBody = JSON.stringify({ hello: "world!" });
    await expect(isValidSignature(tamperedBody, header)).resolves.toBe(false);
  });

  it("returns false when the signature header is missing", async () => {
    const body = JSON.stringify({ hello: "world" });
    await expect(isValidSignature(body, null)).resolves.toBe(false);
  });

  it("returns false when the algorithm prefix isn't sha256", async () => {
    const body = JSON.stringify({ hello: "world" });
    const digest = createHmac("sha256", APP_SECRET).update(body).digest("hex");
    await expect(isValidSignature(body, `sha1=${digest}`)).resolves.toBe(false);
  });

  it("returns false when the signature was produced with the wrong secret", async () => {
    const body = JSON.stringify({ hello: "world" });
    const header = sign(body, "a-completely-different-secret");
    await expect(isValidSignature(body, header)).resolves.toBe(false);
  });

  it("returns false when the header has no signature value after the algorithm", async () => {
    await expect(isValidSignature("{}", "sha256=")).resolves.toBe(false);
  });

  it("returns false when the received signature has a different length than expected", async () => {
    await expect(isValidSignature("{}", "sha256=abcd")).resolves.toBe(false);
  });
});