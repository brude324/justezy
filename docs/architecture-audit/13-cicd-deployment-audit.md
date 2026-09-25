# Section M: CI/CD & Deployment Audit

## 1. CI/CD Pipeline Analysis

- **GitHub Actions Workflows**: **NON-EXISTENT**. No `.github/workflows/` directory exists.
- **GitLab CI / Bitbucket Pipelines / CircleCI**: **NON-EXISTENT**.
- **Automated Verification**: Currently, no automated checks run on pull requests or commits. Commits can be pushed directly to `main` without running `next lint`, `tsc --noEmit`, or `next build`.
- **Database Migration Pipeline**: There is no automated pipeline handling `prisma migrate deploy` across staging or production environments.

---

## 2. Containerization & Deployment Configuration Audit

### 2.1 Dockerfile Audit ([Dockerfile](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/Dockerfile))

```dockerfile
# Use Node.js as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Database
RUN npx prisma migrate dev --name init

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "start"]
```

#### Deficiencies in `Dockerfile`:
1. **Broken Migration in Image Build (Line 17)**:
   - `RUN npx prisma migrate dev --name init` executes during `docker build`. At build time, no PostgreSQL database is running or reachable. This command causes `docker build` to fail immediately unless a live database connection string is injected as a build arg.
   - Even in production, migrations should execute via an entrypoint script at runtime (`prisma migrate deploy`), never via `prisma migrate dev` inside an immutable image build.
2. **Missing Multi-Stage Build**:
   - Single-stage build leaves all development dependencies, source code, and build caches inside the final image, producing an oversized container (> 1.2 GB).
   - Should use standard Next.js standalone multi-stage build (`deps` -> `builder` -> `runner`).
3. **Running as Root**:
   - The container runs as root. A dedicated non-root user (`nodejs:nextjs` with UID 1001) should execute the process.

### 2.2 Docker Compose Audit ([docker-compose.yml](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docker-compose.yml))

```yaml
version: '3.8'

services:
  postgress:
    image: postgres:15
    container_name: postgres_db
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
      POSTGRES_DB: mydb
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  app:
    build: .
    container_name: nextjs_app
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL: postgresql://myuser:mypassword@[YOUR_SERVER_IP]:5432/mydb
    depends_on:
      - postgres

volumes:
  postgres_data:
```

#### Deficiencies in `docker-compose.yml`:
1. **Service Name Mismatch**:
   - PostgreSQL service is named `postgress` (two 's's).
   - Line 24 specifies `depends_on: - postgres` (one 's').
   - Running `docker compose up` fails with: `service "app" depends on undefined service "postgres"`.
2. **Hardcoded Placeholder**:
   - Line 22 contains `[YOUR_SERVER_IP]` instead of referencing the internal container network service name (`postgress:5432`).
3. **Missing Supporting Services**:
   - No Redis container defined for background queues.

---

## 3. Production Environment Readiness Checklist

| Requirement | Current State | Required State for SaaS |
| :--- | :--- | :--- |
| **CI Lint & Typecheck** | Absent | GitHub Actions running `npm run lint` and `npx tsc --noEmit` on all PRs |
| **Automated Testing** | Absent | Vitest unit/integration suite + Playwright E2E smoke tests |
| **Prisma Migration Gate** | Defective (`migrate dev` in Dockerfile) | Standalone release phase running `npx prisma migrate deploy` |
| **Container Optimization** | Fat single-stage image | Multi-stage Docker build utilizing Next.js `output: 'standalone'` |
| **Environment Segregation** | Flat `.env.local` | Separate development, preview, staging, and production environments |
| **Secrets Management** | Leaked in `.env.example` | GitHub Secrets / AWS Secrets Manager / Doppler |
| **Zero-Downtime Rollback** | None | Blue/Green deployment or container orchestrator rollback strategy |
