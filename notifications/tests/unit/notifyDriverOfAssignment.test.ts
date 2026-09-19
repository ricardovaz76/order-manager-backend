import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notifyDriverOfAssignment } from "../../app";

const {
  fromMock,
  driverSelectMock,
  driverEqMock,
  driverSingleMock,
  pushSelectMock,
  pushEqMock,
} = vi.hoisted(() => {
  const driverSingleMock = vi.fn();
  const driverEqMock = vi.fn(() => ({ single: driverSingleMock }));
  const driverSelectMock = vi.fn(() => ({ eq: driverEqMock }));

  const pushEqMock = vi.fn();
  const pushSelectMock = vi.fn(() => ({ eq: pushEqMock }));

  const fromMock = vi.fn((table: string) => {
    if (table === "delivery_drivers") return { select: driverSelectMock };
    if (table === "push_token") return { select: pushSelectMock };
    throw new Error(`Unexpected table in test: ${table}`);
  });

  return {
    fromMock,
    driverSelectMock,
    driverEqMock,
    driverSingleMock,
    pushSelectMock,
    pushEqMock,
  };
});

vi.mock("../../lib/supabase", () => ({
  getSupabaseClient: vi.fn().mockResolvedValue({ from: fromMock }),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue({ ok: true, text: async () => "" });

  // sane defaults for the happy path; individual tests override
  driverSingleMock.mockResolvedValue({
    data: { user_id: "driver-user-1" },
    error: null,
  });
  pushEqMock.mockResolvedValue({
    data: [{ expo_push_token: "ExponentPushToken[abc]" }],
    error: null,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("notifyDriverOfAssignment", () => {
  it("does nothing when driver_id is null", async () => {
    await notifyDriverOfAssignment({ driver_id: null }, null);

    expect(fromMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when driver_id is unchanged from oldRecord", async () => {
    await notifyDriverOfAssignment(
      { driver_id: "driver-1" },
      { driver_id: "driver-1" },
    );

    expect(fromMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proceeds when driver_id is newly assigned and oldRecord is null", async () => {
    await notifyDriverOfAssignment({ driver_id: "driver-1" }, null);

    expect(fromMock).toHaveBeenCalledWith("delivery_drivers");
    expect(driverEqMock).toHaveBeenCalledWith("id", "driver-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("proceeds when driver_id changes from one driver to another", async () => {
    await notifyDriverOfAssignment(
      { driver_id: "driver-2" },
      { driver_id: "driver-1" },
    );

    expect(driverEqMock).toHaveBeenCalledWith("id", "driver-2");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("logs and returns early when the driver lookup errors", async () => {
    driverSingleMock.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await notifyDriverOfAssignment({ driver_id: "driver-1" }, null);

    expect(consoleSpy).toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalledWith("push_token");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs and returns early when driverData is missing despite no error", async () => {
    driverSingleMock.mockResolvedValue({ data: null, error: null });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await notifyDriverOfAssignment({ driver_id: "driver-1" }, null);

    expect(consoleSpy).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs and returns early when the push token lookup errors", async () => {
    pushEqMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await notifyDriverOfAssignment({ driver_id: "driver-1" }, null);

    expect(consoleSpy).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs and returns early when the driver has no push tokens", async () => {
    pushEqMock.mockResolvedValue({ data: [], error: null });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await notifyDriverOfAssignment({ driver_id: "driver-1" }, null);

    expect(consoleSpy).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("queries push_token by the driver's user_id, not the driver row id", async () => {
    driverSingleMock.mockResolvedValue({
      data: { user_id: "user-99" },
      error: null,
    });

    await notifyDriverOfAssignment({ driver_id: "driver-1" }, null);

    expect(fromMock).toHaveBeenCalledWith("push_token");
    expect(pushEqMock).toHaveBeenCalledWith("user_id", "user-99");
  });

  it("sends one push message per token when the driver has multiple devices", async () => {
    pushEqMock.mockResolvedValue({
      data: [
        { expo_push_token: "ExponentPushToken[aaa]" },
        { expo_push_token: "ExponentPushToken[bbb]" },
      ],
      error: null,
    });

    await notifyDriverOfAssignment({ driver_id: "driver-1" }, null);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toHaveLength(2);
    expect(body[0]).toMatchObject({
      to: "ExponentPushToken[aaa]",
      title: "New Delivery assigned",
    });
    expect(body[1]).toMatchObject({
      to: "ExponentPushToken[bbb]",
      title: "New Delivery assigned",
    });
  });
});