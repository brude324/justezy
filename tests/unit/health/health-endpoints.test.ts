import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as healthGet } from "../../../src/app/api/health/route";
import { GET as readyGet } from "../../../src/app/api/health/ready/route";
import { prismaTarget } from "../../../src/lib/prisma-target";

vi.mock("../../../src/lib/prisma-target", () => ({
  prismaTarget: {
    $queryRaw: vi.fn(),
  },
}));

describe("Health Check Endpoints (Step 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/health (Liveness Probe)", () => {
    it("should return HTTP 200 with status ok and uptime", async () => {
      const response = await healthGet();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("ok");
      expect(data.uptime).toBeDefined();
      expect(typeof data.uptime).toBe("number");
      expect(data.timestamp).toBeDefined();
      expect(data.version).toBe("1.0.0");

      // Verify no sensitive keys are leaked
      expect(data.database).toBeUndefined();
      expect(data.connectionString).toBeUndefined();
      expect(data.secret).toBeUndefined();
    });
  });

  describe("GET /api/health/ready (Readiness Probe)", () => {
    it("should return HTTP 200 with database connected when ping succeeds", async () => {
      vi.mocked(prismaTarget.$queryRaw).mockResolvedValueOnce([{ ping: 1 }]);

      const response = await readyGet();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("ready");
      expect(data.database).toBe("connected");
      expect(data.timestamp).toBeDefined();

      // Invariant: no database credentials, schema or internal tables exposed
      expect(data.url).toBeUndefined();
      expect(data.host).toBeUndefined();
    });

    it("should return HTTP 503 Service Unavailable when database query fails", async () => {
      vi.mocked(prismaTarget.$queryRaw).mockRejectedValueOnce(new Error("Connection refused"));

      const response = await readyGet();
      expect(response.status).toBe(503);

      const data = await response.json();
      expect(data.status).toBe("unhealthy");
      expect(data.database).toBe("disconnected");
      expect(data.timestamp).toBeDefined();

      // Invariant: stack trace or internal error message not exposed in response body
      expect(data.message).toBeUndefined();
      expect(data.stack).toBeUndefined();
    });
  });
});
