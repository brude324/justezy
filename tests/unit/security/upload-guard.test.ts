import { describe, it, expect } from "vitest";
import {
  sanitizeFilename,
  validateFileMetadata,
  generateTenantStoragePath,
} from "../../../src/lib/security/upload-guard";
import { ValidationError } from "../../../src/lib/errors";

describe("Upload Guard & File Security (Step 5)", () => {
  describe("sanitizeFilename", () => {
    it("should strip path traversal sequences and dangerous characters", () => {
      expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
      expect(sanitizeFilename("..\\..\\windows\\system32\\cmd.exe")).toBe("cmd.exe");
      expect(sanitizeFilename("student_report (1).pdf")).toBe("student_report__1_.pdf");
    });

    it("should prevent hidden files (.env, .htaccess)", () => {
      expect(sanitizeFilename(".env")).toBe("safe_.env");
      expect(sanitizeFilename(".htaccess")).toBe("safe_.htaccess");
    });

    it("should generate fallback name when input is empty", () => {
      const sanitized = sanitizeFilename("");
      expect(sanitized.startsWith("file_")).toBe(true);
    });
  });

  describe("validateFileMetadata", () => {
    it("should accept valid PDF and image documents within size limit", () => {
      const result = validateFileMetadata("marksheet.pdf", "application/pdf", 1024 * 1024);
      expect(result.safeFilename).toBe("marksheet.pdf");
      expect(result.ext).toBe(".pdf");

      const imgResult = validateFileMetadata("photo.png", "image/png", 500 * 1024);
      expect(imgResult.safeFilename).toBe("photo.png");
      expect(imgResult.ext).toBe(".png");
    });

    it("should reject files exceeding maximum permitted size", () => {
      expect(() => {
        validateFileMetadata("huge_video.pdf", "application/pdf", 10 * 1024 * 1024);
      }).toThrow(ValidationError);
    });

    it("should reject disallowed MIME types", () => {
      expect(() => {
        validateFileMetadata("script.sh", "application/x-sh", 1024);
      }).toThrow(ValidationError);

      expect(() => {
        validateFileMetadata("payload.exe", "application/octet-stream", 1024);
      }).toThrow(ValidationError);
    });

    it("should reject extension spoofing when extension does not match permitted extensions", () => {
      expect(() => {
        validateFileMetadata("script.php", "application/pdf", 1024);
      }).toThrow(ValidationError);
    });
  });

  describe("generateTenantStoragePath", () => {
    it("should generate unpredictable, tenant-partitioned storage path", () => {
      const path1 = generateTenantStoragePath("tnt_alpha", "report.png");
      expect(path1.startsWith("tenants/tnt_alpha/documents/")).toBe(true);
      expect(path1.endsWith("_report.png")).toBe(true);

      const path2 = generateTenantStoragePath("tnt_alpha", "report.png");
      expect(path1).not.toBe(path2); // Random UUID ensures uniqueness and unpredictability
    });

    it("should reject empty tenantId", () => {
      expect(() => {
        generateTenantStoragePath("", "report.png");
      }).toThrow(ValidationError);
    });
  });
});
