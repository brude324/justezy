# 11 — Communications & Notifications Data Model

## 1. Architectural Policy: Provider-Independent Abstraction

**Status**: TARGET / SPECIFICATION  
**Scope**: Institutional Announcements, Academic Calendar Events, In-App Notifications, and Multi-Channel Delivery Preferences.

The communications domain serves two primary operational needs:
1. **Institutional Notice Board & Calendar**: Announcements (circulars) and master calendar events scheduled by school administrators and broadcast to specific student cohorts, faculty groups, or the whole institution.
2. **Personalized In-App & Multi-Channel Alerts**: Automated system alerts triggered by domain actions (attendance absence, exam results, homework assignments) routed according to personal preferences across In-App, Web Push, SMS, and Email.

**Provider Decoupling**: The database schema does NOT store provider-specific schemas (e.g., Twilio message SIDs or Gupshup DLT webhook payloads) in primary tables. Instead, it utilizes generic delivery abstractions, delegating vendor specifics to background BullMQ workers.

---

## 2. Conceptual Communications Entity Graph

```
┌─────────────────────────────────┐
│             Tenant              │
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐       * ┌─────────────────────────────┐
│          Announcement           ├────────►│            Event            │
│  - title, category              │         │  - title, eventType         │
│  - targetAudienceScope          │         │  - startDateTime            │
│  - isUrgent, publishedAt        │         │  - isSchoolClosed           │
└─────────────────────────────────┘         └─────────────────────────────┘
                │
                │ (Triggers Notification Payload)
                ▼
┌─────────────────────────────────┐       * ┌─────────────────────────────┐
│          Notification           ├────────►│   NotificationPreference    │
│  - userId                       │ 1       │  - userId                   │
│  - title, message, deepLinkUrl  │         │  - category                 │
│  - isRead, readAt               │         │  - sms/email/push toggles   │
└─────────────────────────────────┘         └─────────────────────────────┘
```

---

## 3. Detailed Entity Specifications

### 3.1 `Announcement`
- **Definition**: Official institutional notice or circular.
- **Attributes**:
  - `id`: Unique identifier (CUID).
  - `tenantId`: Foreign key to `Tenant`.
  - `title`: String.
  - `category`: Enum (`ACADEMIC`, `HOLIDAY`, `URGENT`, `EVENT`, `ADMINISTRATIVE`, `GENERAL`).
  - `bodyMarkdown`: Text.
  - `attachmentUrls`: String array (PDF circulars, image posters).
  - `targetAudienceScope`: Enum (`ALL_SCHOOL`, `ROLES`, `GRADES`, `SPECIFIC_CLASSES`).
  - `targetRolesJson`: Optional JSON array of role keys (e.g. `["TEACHER", "PARENT"]`).
  - `targetGradesJson`: Optional JSON array of grade IDs (e.g. `["cls_grade10", "cls_grade12"]`).
  - `isUrgent`: Boolean (`true` pins notice to top of feed).
  - `publishedAt`: Timestamp.
  - `authorUserId`: Foreign key to `User`.
  - `status`: Enum (`DRAFT`, `PUBLISHED`, `ARCHIVED`).

### 3.2 `Event`
- **Definition**: Institutional calendar milestone.
- **Attributes**:
  - `id`: Unique identifier (CUID).
  - `tenantId`: Foreign key to `Tenant`.
  - `academicYearId`: Foreign key to `AcademicYear`.
  - `title`: String.
  - `eventType`: Enum (`HOLIDAY`, `EXAMINATION`, `SPORTS`, `CULTURAL`, `PTM`, `ACADEMIC`, `GENERAL`).
  - `startDateTime`: Timestamp with timezone (UTC).
  - `endDateTime`: Timestamp with timezone (UTC).
  - `allDay`: Boolean.
  - `isSchoolClosed`: Boolean (`true` indicates no instructional classes on this day).
  - `location`: Optional string (e.g., "Auditorium", "Sports Complex").
  - `targetAudienceJson`: JSON array of target roles or classes.
  - `description`: Text.

### 3.3 `Notification`
- **Definition**: User inbox item for system and social alerts.
- **Attributes**:
  - `id`: Unique identifier (CUID).
  - `tenantId`: Foreign key to `Tenant`.
  - `userId`: Foreign key to recipient `User`.
  - `eventType`: String (e.g., `ATTENDANCE_ABSENT`, `EXAM_RESULT_PUBLISHED`, `ASSIGNMENT_DUE`, `ANNOUNCEMENT_NEW`).
  - `title`: String.
  - `message`: Text.
  - `deepLinkUrl`: String (e.g., `/tenant/attendance/reports` or `/tenant/results`).
  - `isRead`: Boolean (defaults to `false`).
  - `readAt`: Optional timestamp.
  - `createdAt`: Timestamp.

### 3.4 `NotificationPreference`
- **Definition**: Granular user controls for delivery channels.
- **Attributes**:
  - `id`: Unique identifier (CUID).
  - `userId`: Foreign key to `User`.
  - `category`: Enum (`ATTENDANCE_ALERT`, `HOMEWORK_ALERT`, `EXAM_RESULT`, `CIRCULAR`, `GENERAL`).
  - `inAppEnabled`: Boolean (defaults to `true`).
  - `pushEnabled`: Boolean (Web Push via Service Worker).
  - `smsEnabled`: Boolean (defaults to `true` for Attendance; `false` for routine notices).
  - `emailEnabled`: Boolean.
- **Composite Uniqueness**: `@@unique([userId, category])`.
- **Policy Constraint**: Emergency attendance absence alerts to parents cannot be toggled to `smsEnabled = false` if the institution mandates parent SMS delivery in `TenantPolicy.autoSmsOnAbsence`.
