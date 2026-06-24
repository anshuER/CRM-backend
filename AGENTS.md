# WorkPilot Backend — AGENTS.md

## Stack
- **NestJS 11** (TypeScript, nodenext module resolution)
- **Prisma 7** with PostgreSQL (driver adapter `@prisma/adapter-pg`, not the node-gyp one)
- **Zod** for request validation (custom `ZodValidationPipes` pipe, not class-validator)
- **Swagger** at `/api` (bearer auth)
- **Auth**: OTP via email (Resend), JWT access + refresh tokens, bcrypt hashing, session tracking

## Setup quirks
- `pnpm-workspace.yaml` uses `allowBuilds` only (no `packages:` — this is NOT a monorepo workspace). The `bcrypt` and `prisma` entries say `set this to true or false` — set to `true` before `pnpm install`.
- Prisma config is split: `prisma.config.ts` (new Prama config format) + `prisma/schema.prisma`.
- TypeScript `nodenext` module resolution requires explicit `.js` extensions in relative imports (e.g., `import './foo.js'`).

## Commands
```bash
pnpm install              # install deps (after fixing allowBuilds)
pnpm run start:dev        # dev server with watch
pnpm run build            # nest build -> dist/
pnpm run start:prod       # node dist/main
pnpm run lint             # eslint --fix
pnpm run format           # prettier --write
pnpm run test             # jest (unit, rootDir: src, *.spec.ts)
pnpm run test:e2e         # jest (e2e, rootDir: test, *.e2e-spec.ts)
pnpm run test:cov         # jest --coverage
```

## Prisma
```bash
pnpm prisma generate      # after schema changes
pnpm prisma migrate dev   # local dev only
pnpm prisma db push       # sync schema without migration
```

## Architecture
- `src/main.ts` — bootstrap, Swagger setup
- `src/app.module.ts` — root module, `ConfigModule.forRoot({ isGlobal: true })`
- `src/prisma/` — `PrismaModule` (global), `PrismaService` wraps `PrismaClient` with `PrismaPg` adapter
- `src/auth/` — OTP flow, JWT strategy, guards, Zod schemas, Resend email
- `src/users/` — user CRUD
- `src/organizations/` — multi-tenant orgs with roles (ORG_ADMIN / MANAGER / EMPLOYEE)
- `src/common/` — shared guards: `roles.guard.ts` (RBAC), `tenant.guard.ts` (multi-tenant isolation)

## Testing
- Unit tests: `*.spec.ts` in `src/` (jest rootDir: src)
- E2E tests: `*.e2e-spec.ts` in `test/` (separate jest config at `test/jest-e2e.json`)
- No CI workflows found. No pre-commit hooks configured.
- No integration test prerequisites documented (assumes local Postgres at DATABASE_URL).

## Conventions
- `singleQuote: true`, `trailingComma: "all"` (Prettier)
- ESLint: `@typescript-eslint/no-explicit-any: off`, `no-floating-promises: warn`
- Validation via Zod schemas in `schema/` dirs, applied through `ZodValidationPipes`
- Decorators: `@CurrentUser()` (auth), `@CurrentTenant()` (common), `@Roles()` (common)
- Imports use `src/` path alias (e.g., `import { PrismaService } from 'src/prisma/prisma.service'`)
