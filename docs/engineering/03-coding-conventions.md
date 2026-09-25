# Coding Conventions & Development Standards

## 1. TypeScript Strictness & Type Safety

**Status**: DECISION

The platform enforces strict TypeScript configuration (`strict: true` in `tsconfig.json`). 

1. **Zero `any` Policy**:
   - The use of `any` is strictly prohibited. Use `unknown` with type narrowing (via type guards or Zod parsing) when handling dynamic or external payloads.
2. **Explicit Return Types for Services & Server Actions**:
   - All exported domain functions, services, and Server Actions MUST define explicit return types to prevent accidental API surface mutations.
3. **Immutability Conventions**:
   - Do not mutate date objects or arrays in-place (addressing the bug identified in `src/lib/utils.ts` during Step 0). Use pure transformation functions returning new instances.

---

## 2. Server vs. Client Component Boundaries

**Status**: TARGET / PROPOSED

Next.js App Router performance depends on keeping the client-side JavaScript bundle as minimal as possible:

1. **Default to React Server Components (RSC)**:
   - All pages, layouts, and container views MUST be Server Components unless interactivity is explicitly required.
2. **When to Mark `'use client'`**:
   - Include `'use client'` ONLY at the leaf nodes of the component tree when a component:
     - Uses React state (`useState`, `useReducer`).
     - Uses browser event listeners (`onClick`, `onChange`).
     - Uses React lifecycle hooks (`useEffect`, `useCallback`).
     - Consumes browser DOM APIs or interactive third-party client wrappers (`recharts`, `react-big-calendar`).
3. **No Direct Secret Exposure**:
   - Never import server-only modules (`prisma`, `@clerk/nextjs/server`, `ioredis`) into Client Components. Enforced via `import 'server-only'`.

---

## 3. Suspense & Error Boundaries

1. **Loading Skeletons**:
   - Every dashboard and list route MUST provide a dedicated `loading.tsx` containing an accessible Tailwind skeleton matching the table or chart layout.
2. **Isolated Error Boundaries**:
   - Complex interactive widgets (e.g. `AttendanceChartContainer`, `BigCalendarContainer`) MUST be wrapped in React Error Boundaries so that a localized data error does not crash the entire institutional dashboard.
