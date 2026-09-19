import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendExpoPush } from "../../app";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("sendExpoPush", () => {
  it("does nothing and never calls fetch when there are no messages", async () => {
    await sendExpoPush([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the messages to the Expo push endpoint", async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => "" });

    const messages = [{ to: "token-1", title: "New Order", body: "A new order just came in." }];
    await sendExpoPush(messages);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-type": "application/json",
        },
        body: JSON.stringify(messages),
      },
    );
  });

  it("logs an error when Expo responds with a non-ok status", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue({ ok: false, text: async () => "invalid push token" });

    await sendExpoPush([{ to: "bad-token", title: "New Order", body: "..." }]);

    expect(consoleError).toHaveBeenCalledWith("Expo push send failed", "invalid push token");
    consoleError.mockRestore();
  });
});