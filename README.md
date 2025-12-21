# InvoiceMaker

Clinic invoice management app built with Next.js, TypeScript, Prisma, and NextAuth. It handles patients, products/categories, invoices, roles/permissions, and user management.

## Architecture (MVC-oriented)
- **Models**: Prisma schema/entities in `prisma/schema.prisma`.
- **Repositories**: Direct Prisma access per domain (e.g., `server/repositories/*Repository.ts`).
- **Services (business logic)**: Validation, permissions, and rules (e.g., `server/services/*Service.ts`).
- **Controllers**: Thin API route handlers under `app/api/**` that parse requests and call services.
- **Views**: React server/client components under `app/**` and `components/**`.

## Tech Stack
- Next.js 15, React 19, TypeScript
- Prisma ORM
- NextAuth (credentials)
- Tailwind CSS 4
- bcryptjs, html2canvas, jsPDF

## Requirements
- Node.js (LTS recommended)
- PostgreSQL database (default Prisma provider). If you switch providers, update `prisma/schema.prisma` and `DATABASE_URL` accordingly.

## Environment Variables (`.env`)
```
DATABASE_URL="postgresql://user:password@localhost:5432/invoicemaker"
NEXTAUTH_SECRET="a-strong-secret"
NEXTAUTH_URL="http://localhost:3000"
```

## Setup & Run
```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
# visit http://localhost:3000
```

## Scripts
- `npm run dev` – start Next.js (Turbopack) dev server
- `npm run build` / `npm start` – production build and start
- `npm run lint` – lint
- `npm run db:seed` – seed initial data
- `npm run db:init-counter` – initialize invoice counter
- `npm run test:invoice-numbers` / `npm run test:simple` – helper scripts for invoices
