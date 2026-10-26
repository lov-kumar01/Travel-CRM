# TravelCRM AI — Flight Operations Upgrade

A MERN starter for travel agencies with user-owned CRM records, flight booking records, passenger profiles, optional live Amadeus flight search, and optional Stripe-hosted card checkout.

## Requirements
- Node.js 20+ recommended
- MongoDB Atlas or a local MongoDB instance
- Optional Amadeus for Developers credentials for live flight-offer search
- Optional Stripe account/API keys for hosted USD/card checkout

## Install and run
From the project root:

```bash
npm install
npm run install:all
```

Copy `server/.env.example` to `server/.env`, configure `MONGODB_URI` and `JWT_SECRET`, then:

```bash
npm run dev
```

Frontend: http://localhost:5173
API health: http://localhost:4000/api/health

## Flight search (optional)
Add `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET` in `server/.env`. The default base URL uses Amadeus test environment (`https://test.api.amadeus.com`). Test environment inventory/pricing may differ from production. Flight search uses IATA airport codes and returns offers only; it does not create a PNR or issue tickets. Production booking, ticketing, seat/baggage ancillaries, schedule change notifications, cancellations, and refunds require a contracted provider and separate booking APIs/workflows.

## Payments (optional)
Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `server/.env`. Configure a Stripe webhook endpoint at `/api/payments/webhook` for `checkout.session.completed`. The CRM creates Stripe-hosted Checkout sessions and never collects or stores raw card number, expiry, or CVV. Payment amount is calculated from the booking fare, taxes, airline fees, service fee, and markup. Configure your Stripe account and legal/business requirements before accepting real payments. AVS/CVC outcomes depend on Stripe and the card issuer; the CRM does not expose raw card details.

## Data and privacy
- No demo users or demo records are seeded.
- Register your own account through the app. Records are scoped to the authenticated account.
- Passenger profile supports passport last-four metadata only. Do not store full passport numbers, document scans, card data, or CVV in ordinary CRM fields.
- Use a dedicated secure document-vault solution if you need passport/visa scans, with access controls, retention policies, and encryption.

## Current feature boundaries
Included: authentication, leads, customers, trips, quotes, tasks, suppliers, passenger profiles, flight booking records/PNR fields, booking/payment statuses, optional Amadeus offer search, optional Stripe-hosted checkout, dashboard counts.

Not yet included as a production-ready workflow: shared organization/team tenancy and admin-wide booking dashboard, automated agent assignment, concurrent booking locks, actual GDS PNR creation/ticket issuance, seat maps/ancillaries, flight-status alerts, WhatsApp Business API, telephony/call recording, automated invoice/e-ticket PDF generation, refunds/reissues, and full finance/tax ledger. These require provider credentials, business rules, and additional tested workflows; the app does not fake these operations.
