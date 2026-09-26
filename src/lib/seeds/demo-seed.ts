/**
 * Tier 2: Staging & Local Development Demo Fixtures
 * Derived from docs/database/18-seed-strategy.md
 * 
 * Strict Security Policy:
 * 1. Strictly isolated to development and staging environments.
 * 2. Gated by NODE_ENV !== 'production'.
 * 3. Idempotent upsert semantics.
 */

export const DEMO_TENANT = {
  id: "tnt_demo_greenwood",
  slug: "greenwood-academy",
  name: "Greenwood International Academy",
  legalName: "Greenwood Educational Trust",
  planTier: "ENTERPRISE" as const,
  status: "ACTIVE" as const,
  currency: "INR",
  timezone: "Asia/Kolkata",
};

export const DEMO_ACADEMIC_YEAR = {
  id: "ay_2026_2027",
  tenantId: DEMO_TENANT.id,
  yearLabel: "2026-2027",
  status: "ACTIVE" as const,
  startDate: new Date("2026-04-01T00:00:00.000Z"),
  endDate: new Date("2027-03-31T23:59:59.000Z"),
};

export const DEMO_TERMS = [
  {
    id: "term_2026_t1",
    tenantId: DEMO_TENANT.id,
    academicYearId: DEMO_ACADEMIC_YEAR.id,
    termName: "Term 1 (Autumn)",
    termOrder: 1,
    startDate: new Date("2026-04-01T00:00:00.000Z"),
    endDate: new Date("2026-09-30T23:59:59.000Z"),
  },
  {
    id: "term_2026_t2",
    tenantId: DEMO_TENANT.id,
    academicYearId: DEMO_ACADEMIC_YEAR.id,
    termName: "Term 2 (Spring)",
    termOrder: 2,
    startDate: new Date("2026-10-01T00:00:00.000Z"),
    endDate: new Date("2027-03-31T23:59:59.000Z"),
  },
];

export const DEMO_GRADES = [
  { id: "grd_9", tenantId: DEMO_TENANT.id, gradeLevel: 9, name: "Grade 9" },
  { id: "grd_10", tenantId: DEMO_TENANT.id, gradeLevel: 10, name: "Grade 10" },
];

export const DEMO_CLASSES = [
  { id: "cls_9a", tenantId: DEMO_TENANT.id, academicYearId: DEMO_ACADEMIC_YEAR.id, gradeId: "grd_9", sectionName: "9-A", studentCapacity: 35 },
  { id: "cls_9b", tenantId: DEMO_TENANT.id, academicYearId: DEMO_ACADEMIC_YEAR.id, gradeId: "grd_9", sectionName: "9-B", studentCapacity: 35 },
  { id: "cls_10a", tenantId: DEMO_TENANT.id, academicYearId: DEMO_ACADEMIC_YEAR.id, gradeId: "grd_10", sectionName: "10-A", studentCapacity: 35 },
  { id: "cls_10b", tenantId: DEMO_TENANT.id, academicYearId: DEMO_ACADEMIC_YEAR.id, gradeId: "grd_10", sectionName: "10-B", studentCapacity: 35 },
];

export const DEMO_SUBJECTS = [
  { id: "sub_math", tenantId: DEMO_TENANT.id, name: "Mathematics", subjectCode: "MATH-01" },
  { id: "sub_phys", tenantId: DEMO_TENANT.id, name: "Physics", subjectCode: "PHYS-01" },
  { id: "sub_chem", tenantId: DEMO_TENANT.id, name: "Chemistry", subjectCode: "CHEM-01" },
  { id: "sub_eng", tenantId: DEMO_TENANT.id, name: "English Language & Literature", subjectCode: "ENG-01" },
  { id: "sub_cs", tenantId: DEMO_TENANT.id, name: "Computer Science", subjectCode: "CS-01" },
];
