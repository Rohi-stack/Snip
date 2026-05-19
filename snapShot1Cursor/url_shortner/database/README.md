# Database (PostgreSQL + Prisma)

## Fix: `Environment variable not found: DATABASE_URL`

Prisma loads env from `database/.env` (already created). Run commands from this folder:

```bash
cd database
```

Edit `.env` with your real Postgres user and password. If `migrate deploy` worked before, **do not overwrite** a working `.env` with `.env.example`.

```bash
# Only if .env is missing:
cp .env.example .env
```

## Start PostgreSQL

### Option A — Docker (recommended)

Install [Docker Compose](https://docs.docker.com/compose/install/), then:

```bash
npm run db:up
```

Uses `docker-compose.yml` (user `postgres`, password `postgres`, DB `url_shortener`).

### Option B — Local PostgreSQL

Create the database:

```sql
CREATE DATABASE url_shortener;
```

Ensure `DATABASE_URL` in `.env` matches your credentials.

## Migrate & generate

```bash
npm install
npx prisma validate
npx prisma migrate deploy    # applies init + partial_indexes
npx prisma generate
```

For development (interactive):

```bash
npm run db:migrate
```

## Verify

```bash
npx prisma studio
```

## Migrations included

| Migration | Purpose |
|-----------|---------|
| `20260518120000_init` | Tables, enums, FKs, Prisma indexes |
| `20260518120001_partial_indexes` | Soft-delete uniques, CHECK constraint |
