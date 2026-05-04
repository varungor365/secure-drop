import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  validateSlideData,
  sanitizeText,
  validateFileSize,
  validateMimeType,
} from "@/lib/validation";

describe("Validation Utilities", () => {
  describe("escapeHtml", () => {
    it("should escape HTML special characters", () => {
      const input = "<script>alert('xss')</script>";
      const result = escapeHtml(input);
      
      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;");
    });

    it("should handle empty strings", () => {
      expect(escapeHtml("")).toBe("");
    });

    it("should preserve normal text", () => {
      const text = "Hello World";
      expect(escapeHtml(text)).toBe("Hello World");
    });
  });

  describe("validateSlideData", () => {
    const validSlide = {
      title: "Test Slide",
      speaker: "John Doe",
      notes: "This is a test slide",
    };

    it("should validate correct slide data", () => {
      expect(validateSlideData(validSlide)).toBe(true);
    });

    it("should reject null or undefined", () => {
      expect(validateSlideData(null)).toBe(false);
      expect(validateSlideData(undefined)).toBe(false);
    });

    it("should reject invalid title", () => {
      expect(validateSlideData({ ...validSlide, title: 123 })).toBe(false);
      expect(validateSlideData({ ...validSlide, title: "x".repeat(501) })).toBe(false);
    });

    it("should reject invalid speaker", () => {
      expect(validateSlideData({ ...validSlide, speaker: 123 })).toBe(false);
      expect(validateSlideData({ ...validSlide, speaker: "x".repeat(101) })).toBe(false);
    });

    it("should reject invalid notes", () => {
      expect(validateSlideData({ ...validSlide, notes: 123 })).toBe(false);
      expect(validateSlideData({ ...validSlide, notes: "x".repeat(5001) })).toBe(false);
    });
  });

  describe("sanitizeText", () => {
    it("should remove angle brackets", () => {
      const input = "This <script>alert('xss')</script> text";
      const result = sanitizeText(input);
      
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
    });

    it("should respect max length", () => {
      const input = "x".repeat(100);
      const result = sanitizeText(input, 50);
      
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it("should trim whitespace", () => {
      expect(sanitizeText("  test  ")).toBe("test");
    });

    it("should handle empty input", () => {
      expect(sanitizeText("")).toBe("");
      expect(sanitizeText("  ")).toBe("");
    });
  });

  describe("validateFileSize", () => {
    it("should accept files within limit", () => {
      const file = new File(["a".repeat(1000)], "test.txt", { type: "text/plain" });
      const result = validateFileSize(file, 100);
      
      expect(result.valid).toBe(true);
    });

    it("should reject files exceeding limit", () => {
      const file = new File(["a"], "test.txt", { type: "text/plain" });
      Object.defineProperty(file, "size", { value: 101 * 1024 * 1024 });
      const result = validateFileSize(file, 100);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("exceeds");
    });

    it("should use custom max size", () => {
      const file = new File(["a"], "test.txt", { type: "text/plain" });
      Object.defineProperty(file, "size", { value: 60 * 1024 * 1024 });
      const result = validateFileSize(file, 50);
      
      expect(result.valid).toBe(false);
    });
  });

  describe("validateMimeType", () => {
    it("should accept allowed MIME types", () => {
      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      const result = validateMimeType(file, ["application/pdf"]);
      
      expect(result.valid).toBe(true);
    });

    it("should reject disallowed MIME types", () => {
      const file = new File(["test"], "test.exe", { type: "application/octet-stream" });
      const result = validateMimeType(file, ["application/pdf"]);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not allowed");
    });

    it("should accept multiple allowed types", () => {
      const file = new File(["test"], "test.png", { type: "image/png" });
      const result = validateMimeType(file, ["image/png", "image/jpeg"]);
      
      expect(result.valid).toBe(true);
    });
  });
});
