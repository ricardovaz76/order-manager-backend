import { describe, it, expect, vi } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { handleVerification } from "../../app";

vi.mock("../../lib/getSecrets", () => ({
  getSecrets: vi.fn().mockResolvedValue({
    SUPABASE_SERVICE_ROLE_KEY: "unused-in-this-test",
    META_VERIFY_TOKEN: "test-verify-token",
    META_APP_SECRET: "unused-in-this-test",
    ANTHROPIC_API_KEY: "unused-in-this-test",
  }),
}));

function verificationEvent(
  queryStringParameters: APIGatewayProxyEvent["queryStringParameters"],
): APIGatewayProxyEvent {
  return { queryStringParameters } as unknown as APIGatewayProxyEvent;
}

describe("handleVerification", () => {
  it("returns 200 with the challenge when mode and token are both correct", async () => {
    const event = verificationEvent({
      "hub.mode": "subscribe",
      "hub.verify_token": "test-verify-token",
      "hub.challenge": "some-challenge-string",
    });
    const result = await handleVerification(event);
    expect(result).toEqual({ statusCode: 200, body: "some-challenge-string" });
  });

  it("returns 403 when the verify token is wrong", async () => {
    const event = verificationEvent({
      "hub.mode": "subscribe",
      "hub.verify_token": "wrong-token",
      "hub.challenge": "some-challenge-string",
    });
    const result = await handleVerification(event);
    expect(result).toEqual({ statusCode: 403, body: "Forbidden" });
  });

  it("returns 403 when the mode isn't 'subscribe'", async () => {
    const event = verificationEvent({
      "hub.mode": "unsubscribe",
      "hub.verify_token": "test-verify-token",
      "hub.challenge": "some-challenge-string",
    });
    const result = await handleVerification(event);
    expect(result).toEqual({ statusCode: 403, body: "Forbidden" });
  });

  it("returns 403 when queryStringParameters is null", async () => {
    const event = verificationEvent(null);
    const result = await handleVerification(event);
    expect(result).toEqual({ statusCode: 403, body: "Forbidden" });
  });

  it("returns 403 when mode and token are both missing", async () => {
    const event = verificationEvent({});
    const result = await handleVerification(event);
    expect(result).toEqual({ statusCode: 403, body: "Forbidden" });
  });

  it("returns 200 with an empty body when the challenge param is missing but mode/token are valid", async () => {
    const event = verificationEvent({
      "hub.mode": "subscribe",
      "hub.verify_token": "test-verify-token",
    });
    const result = await handleVerification(event);
    expect(result).toEqual({ statusCode: 200, body: "" });
  });
});