# Core Product Principles

## 1. Executive Summary

**Status**: TARGET / PROPOSED

These product principles establish the operational criteria that guide every UX decision, workflow interaction, and system feature across the platform.

---

## 2. The Five Guiding Product Principles

### Principle 1: Zero Cognitive Friction for Educators
- **Rule**: Teachers and academic staff must never spend more than 60 seconds performing routine daily tasks (such as taking morning attendance or entering quiz marks).
- **UX Requirement**:
  - One-tap status toggling (defaults to "All Present"; teacher only taps absentees).
  - High-density tabular marks entry with keyboard navigation (`Enter` advances row, `Tab` advances column).
  - Elimination of multi-step confirmation modals for non-destructive, high-frequency actions.

### Principle 2: Mobile-First, Bandwidth-Resilient Design
- **Rule**: Every screen and operational workflow must work flawlessly on entry-level Android smartphones operating over intermittent 3G/4G connections.
- **UX Requirement**:
  - PWA compliance: installable directly to the home screen without app store friction.
  - Strict client payload budgets (< 150 KB initial gzip bundle).
  - Optimistic UI updates with offline queuing for field-based operations (e.g., bus attendance, physical sports ground checks).

### Principle 3: Absolute Tenant Privacy & Boundary Enforcement
- **Rule**: No user of any institution shall ever perceive, deduce, or access data belonging to another institution.
- **UX Requirement**:
  - Institution branding (name, crest/logo, institutional color palette) must be prominently displayed to reaffirm tenant context.
  - URL paths and slug structures must clearly represent the institution's designated space (`subdomain.schoolyard.in` or equivalent).
  - Generic error messages ("Entity not found") instead of permission denial ("Unauthorized access to Tenant X") to avoid leaking tenant data existence.

### Principle 4: Granular, Transparent Parental Communication
- **Rule**: Parents must never be kept in the dark regarding student safety, attendance status, or critical deadlines.
- **UX Requirement**:
  - Proactive, automated push/SMS notifications dispatched within 15 minutes of unexcused morning absences.
  - Clean, jargon-free summary cards explaining grade distributions and academic standing.
  - Multi-child switcher enabling parents with multiple enrolled children to navigate between profiles with one tap.

### Principle 5: Tamper-Evident Academic & Financial Integrity
- **Rule**: Historical academic records (final exam marks, report cards) and financial transactions must be legally defensible and auditable.
- **UX Requirement**:
  - All modifications to finalized marks require entering an administrative remark/reason.
  - Full audit trail visible to school leadership detailing who modified a record, at what timestamp, and from what IP address.
  - Once an academic year is officially archived/closed, records become strictly read-only.
