# Elite Ops Suite (MVP Foundation)

This project is the internal operations app that pairs with **Elite Service Suite**.

## Current MVP Scope Implemented

- Lead intake webhook: `POST /api/leads` with shared-secret verification via `X-WEBHOOK-SECRET`
- Lead inbox endpoint: `GET /api/leads`
- Lead conversion endpoint: `POST /api/leads/:leadId/convert` to create Customer + Property
- Quote creation + status updates
- Quote-to-job conversion with one-time or recurring visit generation (default 8 weeks)
- Visit listing and update endpoints for assignment/status changes
- Seed admin user in storage (`admin` / `change-me`)

> Note: this repository currently uses in-memory storage for fast iteration. Data resets on restart.

## Run locally

```bash
npm install
WEBHOOK_SECRET=replace-this-with-a-long-random-secret npm run dev
```

## Type-check

```bash
npm run check
```

## Database / migrations

The data model is defined in `shared/schema.ts` and can be migrated to Postgres using Drizzle.

```bash
npm run db:push
```

If using a database, make sure `DATABASE_URL` is set before running `db:push`.

## Webhook setup (Elite Service Suite -> Elite Ops Suite)

Configure the public website app to call this endpoint:

- `POST https://<ops-app-url>/api/leads`
- Header: `X-WEBHOOK-SECRET: <your-shared-secret>`
- Header: `Content-Type: application/json`

For your specific intake site (`www.mainecleaning.company`), configure the backend/webhook automation layer to call the Ops API endpoint above server-to-server. Then use the dashboard at `/` in this app to verify health and new leads arriving.

### Example curl

```bash
curl -X POST "http://localhost:5000/api/leads" \
  -H "Content-Type: application/json" \
  -H "X-WEBHOOK-SECRET: replace-this-with-a-long-random-secret" \
  -d '{
    "source": "elite_service_suite",
    "customer": { "name": "Jane Doe", "phone": "207-555-1234", "email": "jane@email.com" },
    "property": { "address": "12 Ocean Ave, Portland ME" },
    "request": {
      "serviceType": "Standard Clean",
      "frequency": "biweekly",
      "preferredDate": "2026-03-05",
      "notes": "2 bathrooms, dog friendly",
      "estimateRange": "$180-$220"
    }
  }'
```

## API summary

- `POST /api/leads` (webhook)
- `GET /api/leads`
- `POST /api/leads/:leadId/convert`
- `POST /api/quotes`
- `PATCH /api/quotes/:quoteId/status`
- `POST /api/quotes/:quoteId/convert-to-job`
- `GET /api/visits?cleanerId=<id>`
- `PATCH /api/visits/:visitId`
- `GET /api/health`
