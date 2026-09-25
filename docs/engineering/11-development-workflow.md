# Local Development Workflow & Branching Standards

## 1. Local Development Environment Setup

**Status**: TARGET / PROPOSED

To ensure rapid onboarding and reproducible developer environments across macOS, Linux, and Windows, local services are orchestrated via Docker Compose:

1. **Prerequisites**:
   - Node.js `20.x` or `22.x` LTS
   - Docker Desktop & Docker Compose
   - Git CLI
2. **Local Services (`docker-compose.dev.yml`)**:
   - PostgreSQL 15 (Port `5432`)
   - Redis 7 (Port `6379`)
3. **Environment Setup**:
   ```bash
   cp .env.example .env.local
   # Fill in local DB credentials & Clerk development keys
   npm install
   npx prisma generate
   npx prisma migrate dev
   npm run dev
   ```

---

## 2. Git Branching & Commit Conventions

1. **Branch Naming Standard**:
   - `feature/TENANT-123-short-description` (New capabilities)
   - `fix/TENANT-456-bug-fix-description` (Bug fixes)
   - `refactor/TENANT-789-clean-up-domain` (Refactoring)
   - `docs/update-architecture-specs` (Documentation updates)
2. **Conventional Commits**:
   - `feat(auth): implement server-side tenant resolver`
   - `fix(attendance): resolve student attendance NaN percentage calculation`
   - `test(rbac): add unit tests for access scope evaluation`
   - `docs(adr): record storage service S3 abstraction decision`

---

## 3. Pull Request & Code Review Governance

1. **PR Description Requirements**:
   - Context & problem statement.
   - Summary of changes.
   - Evidence of passing tests (unit, integration, or E2E).
   - Screenshot or video demo for UI alterations.
2. **Pre-Commit Enforcement (Husky + lint-staged)**:
   - Formats staged files with Prettier.
   - Runs ESLint on modified files.
   - Executes `tsc --noEmit` to ensure zero type errors before commit.
