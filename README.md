# EduCore Question Parser

A NestJS-based API and processing pipeline for extracting, parsing, and processing exam questions from PDF documents.

## Prerequisites

- **Node.js** (v20+ recommended)
- **PostgreSQL** (v15+ recommended)
- **Redis** (v7+ recommended)

## Environment Variables

Copy the `.env.example` file (if available) or create a new `.env` file in the root directory. You will need to configure the following core variables:

```env
# Application
NODE_ENV=development
PORT=3000

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=educore

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Third-party Integrations
ANTHROPIC_API_KEY=your_anthropic_key_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## Installation

```bash
npm install
```

## Database Setup

This project uses TypeORM with migrations. To quickly initialize the database structure and populate it with seed data (Exam Types and Subjects):

```bash
npm run db:setup
```

Other available database commands:
- `npm run db:migrate` — Runs pending migrations.
- `npm run db:fresh` — Reverts all migrations, runs them afresh, and re-seeds the database.
- `npm run migration:generate --name=MigrationName` — Generates a new migration after making entity changes.

## Running the App

```bash
# development
npm run start

# watch mode (recommended for development)
npm run start:dev

# production mode
npm run start:prod
```

## Deployment (Railway)

This application is containerized and ready for deployment on Railway.

1. Connect your GitHub repository to Railway.
2. Provision **PostgreSQL** and **Redis** plugins in your Railway project.
3. Configure the environment variables in Railway:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `DB_HOST=${{Postgres.PGHOST}}`
   - `DB_PORT=${{Postgres.PGPORT}}`
   - `DB_USERNAME=${{Postgres.PGUSER}}`
   - `DB_PASSWORD=${{Postgres.PGPASSWORD}}`
   - `DB_NAME=${{Postgres.PGDATABASE}}`
   - `REDIS_HOST=${{Redis.REDISHOST}}`
   - `REDIS_PORT=${{Redis.REDISPORT}}`
   - _Plus your Anthropic and Cloudinary credentials._

> **Note (Docker / Railway with this `Dockerfile`)**:
> - The container **entrypoint** runs pending **migrations**, then **seeds** (exam types and subjects), then starts the API. This only runs the DB setup when `NODE_ENV=production` (as in the table above).
> - The image sets `TYPEORM_RUN_MIGRATIONS_ON_STARTUP=false` so Nest does not run migrations a second time; the entrypoint already did.
> - To run the same steps locally after `npm run build`, use `npm run migration:run:dist` and `npm run seed:all:prod` (with `DB_*` env set). To restore the old “migrations on Nest boot” behavior in production, set `TYPEORM_RUN_MIGRATIONS_ON_STARTUP=true` in the service env and run the app without the Docker entrypoint (not recommended for this image).
