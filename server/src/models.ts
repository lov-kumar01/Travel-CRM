import mongoose, { Schema, Types } from "mongoose";

const owned = { ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true } };

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

const customerSchema = new Schema({
  ...owned,
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, default: "", trim: true },
  email: { type: String, default: "", trim: true, lowercase: true },
  phone: { type: String, default: "", trim: true },
  country: { type: String, default: "" },
  notes: { type: String, default: "" }
}, { timestamps: true });

const leadSchema = new Schema({
  ...owned,
  name: { type: String, required: true, trim: true },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  source: { type: String, enum: ["Website", "WhatsApp", "Email", "Phone", "Referral", "Facebook", "Instagram", "Other"], default: "Website" },
  destination: { type: String, required: true, trim: true },
  departureDate: { type: Date },
  returnDate: { type: Date },
  travelers: { type: Number, min: 1, default: 2 },
  budget: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ["New", "Contacted", "Qualified", "Itinerary Sent", "Quote Sent", "Negotiation", "Booked", "Lost"], default: "New" },
  priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
  score: { type: Number, min: 0, max: 100, default: 0 },
  notes: { type: String, default: "" },
  nextFollowUpAt: { type: Date }
}, { timestamps: true });

const tripSchema = new Schema({
  ...owned,
  customerName: { type: String, required: true },
  destination: { type: String, required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  travelers: { type: Number, default: 2 },
  status: { type: String, enum: ["Planning", "Confirmed", "In Progress", "Completed", "Cancelled"], default: "Planning" },
  itinerary: [{ day: Number, title: String, description: String }]
}, { timestamps: true });

const quoteSchema = new Schema({
  ...owned,
  customerName: { type: String, required: true },
  destination: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "INR" },
  status: { type: String, enum: ["Draft", "Sent", "Accepted", "Rejected", "Expired"], default: "Draft" },
  validUntil: { type: Date },
  notes: { type: String, default: "" }
}, { timestamps: true });

const taskSchema = new Schema({
  ...owned,
  title: { type: String, required: true },
  dueDate: { type: Date },
  status: { type: String, enum: ["Open", "In Progress", "Done"], default: "Open" },
  priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
  relatedLead: { type: String, default: "" }
}, { timestamps: true });

const supplierSchema = new Schema({
  ...owned,
  name: { type: String, required: true },
  type: { type: String, enum: ["Hotel", "Transport", "Activity", "Airline", "DMC", "Guide", "Other"], default: "Other" },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  destination: { type: String, default: "" },
  notes: { type: String, default: "" }
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
export const Customer = mongoose.model("Customer", customerSchema);
export const Lead = mongoose.model("Lead", leadSchema);
export const Trip = mongoose.model("Trip", tripSchema);
export const Quote = mongoose.model("Quote", quoteSchema);
export const Task = mongoose.model("Task", taskSchema);
export const Supplier = mongoose.model("Supplier", supplierSchema);
export type AuthUser = { id: string; email: string; name: string };
export type OwnedDoc = { ownerId: Types.ObjectId };


const passengerSchema = new Schema({
  ...owned,
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, default: "", trim: true },
  email: { type: String, default: "", lowercase: true, trim: true },
  phone: { type: String, default: "", trim: true },
  dateOfBirth: { type: Date },
  nationality: { type: String, default: "" },
  passportLastFour: { type: String, default: "" },
  passportExpiry: { type: Date },
  frequentFlyerNumber: { type: String, default: "" },
  seatPreference: { type: String, enum: ["Window", "Aisle", "Middle", "No preference"], default: "No preference" },
  mealPreference: { type: String, default: "" },
  notes: { type: String, default: "" }
}, { timestamps: true });

const bookingSchema = new Schema({
  ...owned,
  bookingReference: { type: String, required: true, trim: true },
  gdsConfirmation: { type: String, default: "" },
  customerName: { type: String, required: true, trim: true },
  customerEmail: { type: String, default: "" },
  customerPhone: { type: String, default: "" },
  airline: { type: String, required: true, trim: true },
  flightNumber: { type: String, default: "" },
  origin: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  departureAt: { type: Date },
  arrivalAt: { type: Date },
  tripType: { type: String, enum: ["One-way", "Round-trip", "Multi-city"], default: "One-way" },
  passengers: { type: Number, min: 1, default: 1 },
  seatSelections: { type: String, default: "" },
  baggage: { type: String, default: "" },
  baseFare: { type: Number, min: 0, default: 0 },
  taxes: { type: Number, min: 0, default: 0 },
  airlineFees: { type: Number, min: 0, default: 0 },
  serviceFee: { type: Number, min: 0, default: 0 },
  currency: { type: String, enum: ["USD", "INR", "EUR", "GBP"], default: "USD" },
  commission: { type: Number, min: 0, default: 0 },
  markup: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ["Pending Verification", "Payment Pending", "Ticketed", "Cancelled", "Refund Pending", "Refunded", "Reissued"], default: "Pending Verification" },
  paymentStatus: { type: String, enum: ["Unpaid", "Checkout Created", "Paid", "Failed", "Refunded"], default: "Unpaid" },
  assignedAgentName: { type: String, default: "" },
  notes: { type: String, default: "" }
}, { timestamps: true });
bookingSchema.index({ ownerId: 1, bookingReference: 1 }, { unique: true });

export const Passenger = mongoose.model("Passenger", passengerSchema);
export const Booking = mongoose.model("Booking", bookingSchema);
