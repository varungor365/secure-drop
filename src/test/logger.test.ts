import { describe, it, expect, beforeEach, vi } from "vitest";
import { logger } from "@/lib/logger";

describe("SecureLogger", () => {
  beforeEach(() => {
    logger.clearLogs();
    vi.clearAllMocks();
  });

  describe("info", () => {
    it("should record info messages", () => {
      logger.info("Test message");
      const logs = logger.exportLogs();
      
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe("info");
      expect(logs[0].message).toBe("Test message");
    });

    it("should include context when provided", () => {
      logger.info("Test", { userId: 123 });
      const logs = logger.exportLogs();
      
      expect(logs[0].context).toEqual({ userId: 123 });
    });
  });

  describe("warn", () => {
    it("should record warn messages", () => {
      logger.warn("Warning message");
      const logs = logger.exportLogs();
      
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe("warn");
    });
  });

  describe("error", () => {
    it("should record error messages", () => {
      const error = new Error("Test error");
      logger.error("Something failed", error);
      const logs = logger.exportLogs();
      
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe("error");
    });

    it("should sanitize Error objects", () => {
      const error = new Error("Sensitive data exposed");
      logger.error("Export failed", error);
      const logs = logger.exportLogs();
      
      const context = logs[0].context as Record<string, unknown>;
      expect(context.name).toBe("Error");
      expect(context.message).toBe("Sensitive data exposed");
    });

    it("should handle non-Error objects", () => {
      logger.error("Failed", { type: "string", data: "test" });
      const logs = logger.exportLogs();
      
      expect(logs[0].context).toBeDefined();
    });
  });

  describe("memory management", () => {
    it("should maintain max log limit", () => {
      for (let i = 0; i < 150; i++) {
        logger.info(`Message ${i}`);
      }
      
      const logs = logger.exportLogs();
      expect(logs.length).toBeLessThanOrEqual(100);
    });

    it("should keep most recent logs", () => {
      for (let i = 0; i < 110; i++) {
        logger.info(`Message ${i}`);
      }
      
      const logs = logger.exportLogs();
      const lastLog = logs[logs.length - 1];
      expect(lastLog.message).toBe("Message 109");
    });
  });

  describe("log export", () => {
    it("should export logs in development", () => {
      logger.info("Test");
      const logs = logger.exportLogs();
      
      if (import.meta.env.DEV) {
        expect(logs.length).toBeGreaterThan(0);
      }
    });

    it("should clear logs", () => {
      logger.info("Test");
      logger.clearLogs();
      const logs = logger.exportLogs();
      
      expect(logs).toHaveLength(0);
    });
  });
});
