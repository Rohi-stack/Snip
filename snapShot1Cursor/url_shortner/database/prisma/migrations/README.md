# Migrations

## First-time setup

```bash
cd database
cp .env.example .env          # or use the provided .env
npm install
npm run db:up                 # starts PostgreSQL (Docker)
npm run db:migrate            # creates tables
npm run db:generate           # generates Prisma Client
```

## Partial indexes (recommended second migration)

```bash
npx prisma migrate dev --name partial_indexes --create-only
```

Paste SQL from `partial_indexes.sql` into the new `migration.sql`, then:

```bash
npx prisma migrate dev
```

## Production

```bash
npx prisma migrate deploy
```
