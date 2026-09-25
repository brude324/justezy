# 13 — Files, Media & Documents Reference Data Model

## 1. Architectural Policy: Metadata Storage vs. Object Storage

**Status**: TARGET / SPECIFICATION  
**Scope**: Provider-Independent File Attachment and Media Asset Architecture.

Storing binary file blobs (e.g., student photos, PDF worksheets, scanned medical certificates, report card snapshots) directly inside a relational PostgreSQL database degrades database cache performance, balloons backup sizes, and limits scalable CDN distribution.

The target architecture enforces a strict separation:
1. **Object Storage Engine (S3-Compatible)**: AWS S3, Cloudflare R2, or local MinIO stores the raw binary bytes, organized by tenant prefixes (e.g., `tenants/{tenantId}/students/{studentId}/avatar.webp`).
2. **PostgreSQL Relational Storage**: Stores structured metadata, cryptographic hashes, MIME types, file sizes, ownership boundaries, and access clearance levels via `DocumentReference`.

---

## 2. Conceptual Document Entity Graph

```
┌─────────────────────────────────┐
│             Tenant              │
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐       1 ┌─────────────────────────────┐
│        DocumentReference        ├────────►│            User             │
│  - storageKey (S3 path)         │         │  (Uploader Identity)        │
│  - fileName, mimeType, size     │         └─────────────────────────────┘
│  - accessLevel (PUBLIC/PRIVATE) │
│  - entityType, entityId         │
└─────────────────────────────────┘
```

---

## 3. Detailed Entity Specifications

### `DocumentReference`
- **Definition**: The authoritative metadata record for any persistent digital file asset.
- **Attributes**:
  - `id`: Unique identifier (CUID).
  - `tenantId`: Foreign key to `Tenant`.
  - `storageProvider`: Enum (`S3_AWS`, `CLOUDFLARE_R2`, `LOCAL_MINIO`).
  - `bucketName`: String.
  - `storageKey`: String (Unique object path; e.g., `tenants/tnt_101/homework/asn_502/worksheet.pdf`).
  - `fileName`: String (Original uploaded filename; e.g., "Calculus_Homework_1.pdf").
  - `fileMimeType`: String (e.g., `application/pdf`, `image/webp`, `image/png`).
  - `fileSizeBytes`: BigInt / Integer (Size in bytes for tenant storage quota calculations).
  - `sha256Checksum`: Optional string (For tamper verification).
  - `accessLevel`: Enum:
    - `PUBLIC`: Publicly readable via CDN without presigned tokens (e.g., School Logo, Public Circulars).
    - `TENANT_RESTRICTED`: Accessible by authenticated tenant members (e.g., Course syllabus).
    - `PRIVATE`: Strictly requires pre-signed temporary URL with permission check (e.g., Student medical record, Report card PDF, Teacher payslip).
  - `entityType`: String (e.g., `StudentProfile`, `Assignment`, `ReportCard`, `TenantBranding`).
  - `entityId`: String (ID of the associated domain record).
  - `uploadedByUserId`: Foreign key to `User`.
  - `createdAt`: Timestamp.
  - `deletedAt`: Optional timestamp for soft-deletion and asynchronous bucket cleanup.

---

## 4. Security & Storage Quota Invariants

1. **Direct-to-Cloud Uploads (Presigned URLs)**:
   - Client browsers and mobile PWAs never upload heavy files through the Next.js web application server.
   - Flow: (1) Client requests presigned upload URL from Server Action; (2) Server Action verifies tenant quota and permission; (3) Client uploads directly to Cloudflare R2 / S3; (4) Client notifies Server Action to create `DocumentReference` record.
2. **Tenant Quota Tracking**:
   - Every `DocumentReference` insert or delete automatically updates the tenant's cumulative storage footprint:
     `SELECT SUM(fileSizeBytes) FROM DocumentReference WHERE tenantId = :tenantId AND deletedAt IS NULL`.
   - If storage exceeds `Tenant.storageQuotaGb`, upload URL generation is halted with an upgrade notification.
