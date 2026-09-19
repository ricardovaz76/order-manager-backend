import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notifyOptedInUsersOfNewOrder } from "../../app";

const { fromMock, selectMock, eqMock } = vi.hoisted(() => {
  const eqMock = vi.fn();
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  return { fromMock, selectMock, eqMock };
});

vi.mock("../../lib/supabase", () => ({
  getSupabaseClient: vi.fn().mockResolvedValue({ from: fromMock }),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue({ ok: true, text: async () => "" });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("notifyOptedInUsersOfNewOrder", () => {
  it("sends a push message to every opted-in staff member's token", async () => {
    eqMock.mockResolvedValue({
      data: [{ expo_push_token: "token-1" }, { expo_push_token: "token-2" }],
      error: null,
    });

    await notifyOptedInUsersOfNewOrder();

    expect(fromMock).toHaveBeenCalledWith("push_token");
    expect(selectMock).toHaveBeenCalledWith(
      "expo_push_token, users!inner(new_order_notifications_enabled)",
    );
    expect(eqMock).toHaveBeenCalledWith("users.new_order_notifications_enabled", true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestInit.body)).toEqual([
      { to: "token-1", title: "New Order", body: "A new order just came in." },
      { to: "token-2", title: "New Order", body: "A new order just came in." },
    ]);
  });

  it("does not call fetch when the query returns an error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    eqMock.mockResolvedValue({ data: null, error: new Error("query failed") });

    await notifyOptedInUsersOfNewOrder();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("does not call fetch when there are no opted-in tokens", async () => {
    eqMock.mockResolvedValue({ data: [], error: null });
    await notifyOptedInUsersOfNewOrder();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not call fetch when data comes back null with no error", async () => {
    eqMock.mockResolvedValue({ data: null, error: null });
    await notifyOptedInUsersOfNewOrder();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});