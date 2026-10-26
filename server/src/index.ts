import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { z } from "zod";
import { User, Customer, Lead, Trip, Quote, Task, Supplier, Passenger, Booking } from "./models.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb", verify: (req: any, _res, buf) => { req.rawBody = Buffer.from(buf); } }));

type AuthedRequest = Request & { userId?: string; userEmail?: string };
const secret = process.env.JWT_SECRET || "development-only-change-me";

function auth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    const payload = jwt.verify(token, secret) as { id: string; email: string };
    req.userId = payload.id; req.userEmail = payload.email; next();
  } catch { return res.status(401).json({ message: "Session expired. Please sign in again." }); }
}
const asyncHandler = (fn: (req: AuthedRequest, res: Response) => Promise<unknown>) =>
  (req: AuthedRequest, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next);

app.get("/api/health", (_req, res) => res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected", service: "TravelCRM AI API" }));

app.post("/api/auth/register", asyncHandler(async (req, res) => {
  const body = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8) }).parse(req.body);
  const email = body.email.toLowerCase();
  if (await User.findOne({ email })) return res.status(409).json({ message: "Email already registered" });
  const user = await User.create({ name: body.name, email, passwordHash: await bcrypt.hash(body.password, 12) });
  const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: "7d" });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
}));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const user = await User.findOne({ email: body.email.toLowerCase() });
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) return res.status(401).json({ message: "Invalid email or password" });
  const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
}));

app.post("/api/payments/webhook", asyncHandler(async (req, res) => {
  const key = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !webhookSecret) return res.status(503).json({ message: "Stripe webhook is not configured" });
  const stripe = new Stripe(key);
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent((req as any).rawBody, req.headers["stripe-signature"] as string, webhookSecret); }
  catch (err: any) { return res.status(400).json({ message: `Invalid Stripe signature: ${err.message}` }); }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    const ownerId = session.metadata?.ownerId;
    if (bookingId && ownerId && session.payment_status === "paid") await Booking.findOneAndUpdate({ _id: bookingId, ownerId }, { $set: { paymentStatus: "Paid" } });
  }
  res.json({ received: true });
}));

app.use("/api", auth);

const resources: Record<string, any> = { customers: Customer, leads: Lead, trips: Trip, quotes: Quote, tasks: Task, suppliers: Supplier, passengers: Passenger, bookings: Booking };
for (const [path, Model] of Object.entries(resources)) {
  app.get(`/api/${path}`, asyncHandler(async (req, res) => {
    const search = String(req.query.search || "").trim();
    const query: any = { ownerId: req.userId };
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const fields: Record<string, string[]> = {
        customers: ["firstName", "lastName", "email", "phone"],
        leads: ["name", "destination", "email", "phone", "status"],
        trips: ["customerName", "destination", "status"],
        quotes: ["customerName", "destination", "status"],
        tasks: ["title", "relatedLead", "status"],
        suppliers: ["name", "type", "destination", "email"],
        passengers: ["firstName", "lastName", "email", "phone", "nationality"],
        bookings: ["bookingReference", "customerName", "customerEmail", "airline", "flightNumber", "origin", "destination", "status", "assignedAgentName"]
      };
      query.$or = (fields[path] || ["name"]).map((field) => ({ [field]: rx }));
    }
    const items = await Model.find(query).sort({ createdAt: -1 }).limit(250).lean();
    res.json(items);
  }));
  app.post(`/api/${path}`, asyncHandler(async (req, res) => {
    const item = await Model.create({ ...req.body, ownerId: req.userId });
    res.status(201).json(item);
  }));
  app.patch(`/api/${path}/:id`, asyncHandler(async (req, res) => {
    const updates = { ...req.body }; delete updates.ownerId; delete updates._id; delete updates.createdAt; delete updates.updatedAt;
    const item = await Model.findOneAndUpdate({ _id: req.params.id, ownerId: req.userId }, { $set: updates }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Record not found" });
    res.json(item);
  }));
  app.delete(`/api/${path}/:id`, asyncHandler(async (req, res) => {
    const item = await Model.findOneAndDelete({ _id: req.params.id, ownerId: req.userId });
    if (!item) return res.status(404).json({ message: "Record not found" });
    res.json({ success: true });
  }));
}

app.post("/api/payments/checkout-session", asyncHandler(async (req, res) => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(503).json({ message: "Stripe checkout is not configured. Add STRIPE_SECRET_KEY to server/.env. Card details are handled by Stripe Checkout and are never stored in this CRM." });
  const body = z.object({ bookingId: z.string().min(1), successUrl: z.string().url().optional(), cancelUrl: z.string().url().optional() }).parse(req.body);
  const booking: any = await Booking.findOne({ _id: body.bookingId, ownerId: req.userId });
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  const amount = Number(booking.baseFare || 0) + Number(booking.taxes || 0) + Number(booking.airlineFees || 0) + Number(booking.serviceFee || 0) + Number(booking.markup || 0);
  if (amount <= 0) return res.status(400).json({ message: "Booking total must be greater than zero before checkout" });
  const stripe = new Stripe(key);
  const session = await stripe.checkout.sessions.create({ mode: "payment", customer_email: booking.customerEmail || undefined, success_url: body.successUrl || `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/bookings?payment=success`, cancel_url: body.cancelUrl || `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/bookings?payment=cancelled`, payment_method_types: ["card"], line_items: [{ quantity: 1, price_data: { currency: String(booking.currency || "USD").toLowerCase(), unit_amount: Math.round(amount * 100), product_data: { name: `Flight booking ${booking.bookingReference}`, description: `${booking.origin} to ${booking.destination} · ${booking.customerName}` } } }], metadata: { bookingId: String(booking._id), ownerId: String(req.userId) } });
  booking.paymentStatus = "Checkout Created"; await booking.save();
  res.json({ checkoutUrl: session.url, sessionId: session.id });
}));

// Real flight search adapter. It intentionally fails closed instead of returning fake inventory.
app.post("/api/flights/search", asyncHandler(async (req, res) => {
  const body = z.object({ origin: z.string().length(3), destination: z.string().length(3), departureDate: z.string(), returnDate: z.string().optional(), adults: z.coerce.number().int().min(1).max(9).default(1), currencyCode: z.string().length(3).default("USD") }).parse(req.body);
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(503).json({ message: "Live flight search is not configured. Add AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET from your Amadeus developer account to server/.env. No sample flights are shown." });
  const base = process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com";
  const tokenResponse = await fetch(`${base}/v1/security/oauth2/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }) });
  const tokenData: any = await tokenResponse.json();
  if (!tokenResponse.ok) return res.status(502).json({ message: "Flight provider authentication failed", provider: tokenData.error_description || tokenData.error || "Amadeus error" });
  const params = new URLSearchParams({ originLocationCode: body.origin.toUpperCase(), destinationLocationCode: body.destination.toUpperCase(), departureDate: body.departureDate, adults: String(body.adults), currencyCode: body.currencyCode.toUpperCase(), max: "20" });
  if (body.returnDate) params.set("returnDate", body.returnDate);
  const flightResponse = await fetch(`${base}/v2/shopping/flight-offers?${params}`, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
  const flightData: any = await flightResponse.json();
  if (!flightResponse.ok) return res.status(502).json({ message: "Flight provider search failed", provider: flightData.errors?.[0]?.detail || "Amadeus error" });
  res.json({ source: "Amadeus", currency: body.currencyCode.toUpperCase(), offers: flightData.data || [], dictionaries: flightData.dictionaries || {} });
}));

app.get("/api/dashboard", asyncHandler(async (req, res) => {
  const ownerId = req.userId;
  const [leads, customers, trips, quotes, tasks, pipeline, bookings, ticketedBookings] = await Promise.all([
    Lead.countDocuments({ ownerId }),
    Customer.countDocuments({ ownerId }),
    Trip.countDocuments({ ownerId }),
    Quote.find({ ownerId }).lean(),
    Task.countDocuments({ ownerId, status: { $ne: "Done" } }),
    Lead.aggregate([{ $match: { ownerId: new mongoose.Types.ObjectId(ownerId) } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Booking.countDocuments({ ownerId }),
    Booking.countDocuments({ ownerId, status: "Ticketed" })
  ]);
  res.json({
    leads, customers, trips, openTasks: tasks, bookings, ticketedBookings,
    quoteValue: quotes.filter((q: any) => !["Rejected", "Expired"].includes(q.status)).reduce((sum: number, q: any) => sum + Number(q.amount || 0), 0),
    pipeline: pipeline.map((p: any) => ({ status: p._id, count: p.count })),
    recentLeads: await Lead.find({ ownerId }).sort({ createdAt: -1 }).limit(5).lean(),
    upcomingTasks: await Task.find({ ownerId, status: { $ne: "Done" } }).sort({ dueDate: 1 }).limit(5).lean()
  });
}));

app.post("/api/ai/lead-insights", asyncHandler(async (req, res) => {
  const body = z.object({
    destination: z.string().optional().default(""),
    budget: z.coerce.number().optional().default(0),
    travelers: z.coerce.number().optional().default(2),
    departureDate: z.string().optional().default(""),
    status: z.string().optional().default("New"),
    notes: z.string().optional().default("")
  }).parse(req.body);
  let score = 20;
  const reasons: string[] = [];
  if (body.destination.trim()) { score += 15; reasons.push("Destination is defined"); }
  if (body.budget > 0) { score += 15; reasons.push("Budget is available"); }
  if (body.travelers > 0) { score += 10; reasons.push("Traveler count is known"); }
  if (body.departureDate) {
    const days = (new Date(body.departureDate).getTime() - Date.now()) / 86400000;
    if (days >= 0 && days < 90) { score += 20; reasons.push("Travel date is within 90 days"); }
    else { score += 10; reasons.push("Travel date is specified"); }
  }
  if (/book|ready|confirm|urgent|today|quote/i.test(body.notes)) { score += 20; reasons.push("Notes indicate purchase intent"); }
  score = Math.min(100, score);
  const priority = score >= 75 ? "High" : score >= 45 ? "Medium" : "Low";
  const nextAction = body.status === "Quote Sent" ? "Follow up on the quote and offer to clarify inclusions." :
    body.status === "New" ? "Contact the traveler, confirm dates and budget, then qualify the enquiry." :
    "Confirm the next missing travel detail and schedule a follow-up.";
  res.json({ score, priority, reasons, nextAction, disclaimer: "Local heuristic demo; replace with an evaluated model before relying on predictive scoring." });
}));

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: err.issues });
  if (err?.name === "ValidationError") return res.status(400).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

const port = Number(process.env.PORT || 4000);
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MongoDB connection failed: MONGODB_URI is missing. Create server/.env from server/.env.example and add your own database URI.");
  process.exit(1);
}

mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 }).then(() => {
  console.log("MongoDB connected successfully");
  app.listen(port, () => console.log(`TravelCRM API listening on http://localhost:${port}`));
}).catch((err) => {
  console.error("MongoDB connection failed:", err.message);
  console.error("Check the URI, database username/password, Atlas Network Access, and database-user permissions.");
  process.exit(1);
});
