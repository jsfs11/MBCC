import request from "supertest";
import { jest } from "@jest/globals";

jest.mock("@xenova/transformers", () => ({
  pipeline: jest.fn(() => async () => []),
}));

const ORIGINAL_ENV = process.env;

async function loadCreateApp() {
  let module: typeof import("../src/index") | undefined;
  await jest.isolateModulesAsync(async () => {
    module = await import("../src/index");
  });
  if (!module) {
    throw new Error("Failed to load server module");
  }
  return module.createApp;
}

describe("rate limiting configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  it("respects valid overrides", async () => {
    process.env.RATE_LIMIT_MAX = "2";
    process.env.RATE_LIMIT_WINDOW = "1000";

    const createApp = await loadCreateApp();
    const app = createApp();

    const first = await request(app).get("/api/health");
    expect(first.status).toBe(200);

    const second = await request(app).get("/api/health");
    expect(second.status).toBe(200);

    const blocked = await request(app).get("/api/health");
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toContain("Limit: 2 requests per 1 seconds");
  });

  it("falls back to defaults and warns on invalid overrides", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    process.env.RATE_LIMIT_MAX = "0";
    process.env.RATE_LIMIT_WINDOW = "not-a-number";

    const createApp = await loadCreateApp();
    const app = createApp();

    for (let i = 0; i < 100; i++) {
      const response = await request(app).get("/api/health");
      expect(response.status).toBe(200);
    }

    const blocked = await request(app).get("/api/health");
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toContain("Limit: 100 requests per 900 seconds");

    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy.mock.calls[0][0]).toContain("RATE_LIMIT_WINDOW");
    expect(warnSpy.mock.calls[1][0]).toContain("RATE_LIMIT_MAX");
  });
});
