import path from "path";
import crypto from "crypto";
import { ValidationError } from "@/lib/errors";

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

export const DEFAULT_UPLOAD_CONSTRAINTS: FileValidationOptions = {
  maxSizeBytes: 5 * 1024 * 1024, // 5 MB
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".pdf"],
};

/**
 * Sanitizes a user-supplied filename to prevent directory traversal, null-byte injection,
 * and shell metacharacter vulnerabilities.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== "string") {
    return `file_${crypto.randomUUID().substring(0, 8)}`;
  }

  // Remove directory paths and null bytes
  const basename = path.basename(filename).replace(/\0/g, "");

  // Normalize and replace unsafe characters
  const clean = basename.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Prevent hidden files or extensions-only files (.env, .htaccess)
  return clean.startsWith(".") ? `safe_${clean}` : clean;
}

/**
 * Validates file metadata before permitting upload or storage binding.
 */
export function validateFileMetadata(
  filename: string,
  mimeType: string,
  sizeBytes: number,
  options: FileValidationOptions = DEFAULT_UPLOAD_CONSTRAINTS
): { safeFilename: string; ext: string } {
  const maxSize = options.maxSizeBytes || DEFAULT_UPLOAD_CONSTRAINTS.maxSizeBytes!;
  if (sizeBytes > maxSize) {
    throw new ValidationError(
      `File size exceeds maximum permitted limit of ${Math.round(maxSize / (1024 * 1024))}MB`
    );
  }

  const allowedMimes = options.allowedMimeTypes || DEFAULT_UPLOAD_CONSTRAINTS.allowedMimeTypes!;
  if (!allowedMimes.includes(mimeType.toLowerCase())) {
    throw new ValidationError(`Unsupported file type: ${mimeType}. Permitted: ${allowedMimes.join(", ")}`);
  }

  const ext = path.extname(filename).toLowerCase();
  const allowedExts = options.allowedExtensions || DEFAULT_UPLOAD_CONSTRAINTS.allowedExtensions!;
  if (!allowedExts.includes(ext)) {
    throw new ValidationError(`Unsupported file extension: ${ext}. Permitted: ${allowedExts.join(", ")}`);
  }

  const safeFilename = sanitizeFilename(filename);
  return { safeFilename, ext };
}

/**
 * Generates an isolated, unpredictable tenant storage path to prevent cross-tenant enumeration.
 */
export function generateTenantStoragePath(tenantId: string, filename: string): string {
  if (!tenantId || typeof tenantId !== "string") {
    throw new ValidationError("Valid tenantId required for storage allocation");
  }

  const { safeFilename } = validateFileMetadata(filename, "image/png", 100);
  const randomPrefix = crypto.randomUUID();
  return `tenants/${tenantId}/documents/${randomPrefix}_${safeFilename}`;
}
