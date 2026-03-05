import { 
  int, 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar,
  decimal,
  boolean,
  index
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role-based access for landlords and tenants.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "landlord", "tenant"]).default("user").notNull(),
  profileImage: text("profileImage"),
  bio: text("bio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  roleIdx: index("role_idx").on(table.role),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Properties table - stores rental property listings
 */
export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  landlordId: int("landlordId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  zipCode: varchar("zipCode", { length: 20 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  pricePerNight: decimal("pricePerNight", { precision: 10, scale: 2 }).notNull(),
  bedrooms: int("bedrooms").notNull(),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).notNull(),
  squareFeet: int("squareFeet"),
  propertyType: mysqlEnum("propertyType", ["apartment", "house", "condo", "townhouse", "studio"]).notNull(),
  amenities: text("amenities"), // JSON string
  images: text("images"), // JSON string
  isAvailable: boolean("isAvailable").default(true).notNull(),
  maxGuests: int("maxGuests").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  landlordIdx: index("landlord_idx").on(table.landlordId),
  cityIdx: index("city_idx").on(table.city),
  availableIdx: index("available_idx").on(table.isAvailable),
}));

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

/**
 * Bookings table - stores booking requests and confirmations
 */
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  tenantId: int("tenantId").notNull(),
  landlordId: int("landlordId").notNull(),
  checkInDate: timestamp("checkInDate").notNull(),
  checkOutDate: timestamp("checkOutDate").notNull(),
  numberOfGuests: int("numberOfGuests").notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled", "completed"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  propertyIdx: index("property_idx").on(table.propertyId),
  tenantIdx: index("tenant_idx").on(table.tenantId),
  landlordIdx: index("landlord_idx").on(table.landlordId),
  statusIdx: index("status_idx").on(table.status),
}));

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * Payments table - tracks all payment transactions
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }).notNull(),
  paymentType: mysqlEnum("paymentType", ["deposit", "full_payment", "partial_payment"]).notNull(),
  status: mysqlEnum("paymentStatus", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeChargeId: varchar("stripeChargeId", { length: 255 }),
  dueDate: timestamp("dueDate"),
  paidDate: timestamp("paidDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  bookingIdx: index("booking_idx").on(table.bookingId),
  statusIdx: index("payment_status_idx").on(table.status),
}));

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Complaints table - stores tenant complaints about properties
 */
export const complaints = mysqlTable("complaints", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  bookingId: int("bookingId").notNull(),
  tenantId: int("tenantId").notNull(),
  landlordId: int("landlordId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", ["damage", "cleanliness", "maintenance", "safety", "other"]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high"]).default("medium").notNull(),
  images: text("images"), // JSON string
  status: mysqlEnum("complaintStatus", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  resolution: text("resolution"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  propertyIdx: index("property_idx").on(table.propertyId),
  tenantIdx: index("tenant_idx").on(table.tenantId),
  landlordIdx: index("landlord_idx").on(table.landlordId),
  statusIdx: index("complaint_status_idx").on(table.status),
}));

export type Complaint = typeof complaints.$inferSelect;
export type InsertComplaint = typeof complaints.$inferInsert;

/**
 * Favorites table - stores tenant's favorite/saved properties
 */
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  propertyId: int("propertyId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantPropertyIdx: index("tenant_property_idx").on(table.tenantId, table.propertyId),
  tenantIdx: index("tenant_idx").on(table.tenantId),
}));

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

/**
 * Property availability calendar - tracks blocked/available dates
 */
export const propertyAvailability = mysqlTable("propertyAvailability", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  date: timestamp("date").notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  propertyDateIdx: index("property_date_idx").on(table.propertyId, table.date),
}));

export type PropertyAvailability = typeof propertyAvailability.$inferSelect;
export type InsertPropertyAvailability = typeof propertyAvailability.$inferInsert;

/**
 * Reviews table - stores property reviews from tenants
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  bookingId: int("bookingId").notNull(),
  tenantId: int("tenantId").notNull(),
  rating: int("rating").notNull(), // 1-5 stars
  title: varchar("title", { length: 255 }).notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  propertyIdx: index("property_idx").on(table.propertyId),
  tenantIdx: index("tenant_idx").on(table.tenantId),
}));

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Notifications table - stores system notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("notificationType", ["booking_request", "booking_approved", "booking_rejected", "payment_due", "complaint_filed", "complaint_resolved", "review_posted"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedId: int("relatedId"),
  relatedType: varchar("relatedType", { length: 50 }),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  isReadIdx: index("isRead_idx").on(table.isRead),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
