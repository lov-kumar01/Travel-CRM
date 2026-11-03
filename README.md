# TravelCRM AI — Flight Operations Edition

A MERN travel CRM starter with account authentication, role-based workspaces, agent booking desk, admin control tower, sales pipeline, flight booking/passenger records, Google Gemini-powered web flight research, and Stripe-hosted checkout.

## Requirements
- Node.js 20+ (Node 22 recommended)
- MongoDB Atlas or a local MongoDB instance
- Google Gemini API key for AI sales insights and Google Search-grounded flight research
- Optional: Stripe test/live credentials for payment checkout

## Setup
1. Extract the ZIP and open a terminal in the project root.
2. Run `npm install` and `npm run install:all`.
3. Copy `server/.env.example` to `server/.env`.
4. Set `MONGODB_URI`, a long random `JWT_SECRET`, and `CLIENT_ORIGIN=http://localhost:5173`.
5. Set `ADMIN_EMAILS=owner@youragency.com` before registering the account you want to be the first admin. Multiple admin addresses can be comma-separated. Existing accounts listed there are promoted on their next login.
6. Run `npm run dev` and open `http://localhost:5173`.
7. Register your own account. Register using an email listed in `ADMIN_EMAILS` to get the admin role; other accounts are agents by default.

## Main routes
- `/login` — register/sign in
- `/agent/dashboard` — agent-specific bookings, ticketing metrics, commission and short booking locks
- `/admin/overview` — all-agent metrics, booking filters, role management and booking status overrides (admin only)
- `/admin` — private CRM workspace for admins to browse all agents and paginated records across bookings, leads, customers, trips, quotes, tasks, passengers, and suppliers
- `/pipeline` — visual lead stages
- `/pipeline/deal/:deal_id` — lead detail and checkout-ready booking list
- `/checkout/:bookingId` — booking summary and redirect to Stripe-hosted checkout
- `/bookings` — create and manage flight booking records
- `/quotes` — create editable agent booking notes that expire seven days after creation, with a reminder during the final 24 hours
- `/flight-search` — Google Search-grounded public flight research (indicative, not bookable inventory)

## Stripe checkout
Set `STRIPE_SECRET_KEY` in `server/.env`. Checkout is hosted by Stripe and requires billing address collection. The CRM never accepts or stores raw card number or CVV fields. Set `STRIPE_WEBHOOK_SECRET` and configure a Stripe webhook endpoint pointing to `/api/payments/webhook` for payment-state updates. Test with Stripe test keys and test cards before going live. This starter does not independently certify PCI compliance or guarantee an AVS result; the payment processor and issuer determine verification outcomes.

The booking editor's payment-information dialog is for recording reference details only and does not initiate a charge. It may store cardholder name, billing address, card last four and expiry, or bank name, account holder, IFSC/routing code, and transfer reference on the booking. Never enter full card numbers, CVV/security codes, or bank account numbers; these are not stored by the CRM. The separate Stripe checkout integration supports USD only, with a total of base fare + airline fees + markup. Stripe-hosted checkout handles credentials when that integration is used; bank transfer uses Stripe's US bank-transfer option. A successful payment does not automatically create a GDS PNR or issue an airline ticket.

## Google Gemini AI
Set `GEMINI_API_KEY` in `server/.env` to enable Gemini-powered AI Sales Copilot insights and Google Search-grounded flight research. Optionally set `GEMINI_MODEL` (defaults to `gemini-2.5-flash`). The key is used only by the API server and must never be placed in frontend environment variables. Flight Search uses public web results and citations, not Google Flights inventory or an airline reservation system. Prices and availability are indicative, may be stale or unavailable, and must be confirmed with the airline or seller before booking.

## Multi-agent notes
- Agents see records created under their account in the agent workspace.
- Admins see all booking records and can change roles/statuses.
- Booking locks are five-minute coordination hints using a shared resource key. They are not a GDS seat hold, do not reserve airline inventory, and are not a distributed lock for a real ticketing supplier. Production concurrency should use atomic lock acquisition and provider-side booking controls.
- New accounts default to agent. Admin role is assigned only by the `ADMIN_EMAILS` server setting or an existing admin using the admin permissions screen. Do not expose the admin setting or JWT secret in frontend code.

## Important production gaps
This is a functional starter, not a certified enterprise travel mid-office. It does not yet implement real GDS booking/ticketing, airline seat maps/ancillaries, automatic PNR generation, flight-status feeds, refund/reissue processing, full audit trails, MFA, enterprise-grade permission policies, automated WhatsApp/email journeys, tax/accounting reconciliation, or a completed PCI assessment. These require provider contracts, credentials, testing, and additional implementation.
