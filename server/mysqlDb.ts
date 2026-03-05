import { eq, and, gte, lte, like, desc, asc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  properties,
  bookings,
  payments,
  complaints,
  favorites,
  reviews,
  notifications,
  propertyAvailability
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER OPERATIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available. Please ensure DATABASE_URL is set and MySQL server is running.");
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "phone", "profileImage", "bio"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ PROPERTY OPERATIONS ============

export async function createProperty(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { minLeaseMonths, maxLeaseMonths, ...rest } = data;
  
  const result = await db.insert(properties).values({
    ...rest,
    amenities: JSON.stringify(rest.amenities || []),
    images: JSON.stringify(rest.images || []),
  });
  return result;
}

export async function updateProperty(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { ...data };
  delete updateData.minLeaseMonths;
  delete updateData.maxLeaseMonths;
  if (data.amenities) updateData.amenities = JSON.stringify(data.amenities);
  if (data.images) updateData.images = JSON.stringify(data.images);
  
  return await db.update(properties).set(updateData).where(eq(properties.id, id));
}

export async function getPropertyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  if (result.length === 0) return undefined;
  
  const prop = result[0];
  return {
    ...prop,
    amenities: prop.amenities ? JSON.parse(prop.amenities) : [],
    images: prop.images ? JSON.parse(prop.images) : [],
  };
}

export async function getPropertiesByLandlord(landlordId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select().from(properties).where(eq(properties.landlordId, landlordId));
  return results.map(prop => ({
    ...prop,
    amenities: prop.amenities ? JSON.parse(prop.amenities) : [],
    images: prop.images ? JSON.parse(prop.images) : [],
  }));
}

export async function searchProperties(filters: {
  city?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  isAvailable?: boolean;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions: any[] = [];
  
  if (filters.city) {
    conditions.push(like(properties.city, `%${filters.city}%`));
  }
  if (filters.propertyType) {
    conditions.push(eq(properties.propertyType, filters.propertyType as any));
  }
  if (filters.minPrice !== undefined) {
    conditions.push(gte(properties.pricePerNight, String(filters.minPrice)));
  }
  if (filters.maxPrice !== undefined) {
    conditions.push(lte(properties.pricePerNight, String(filters.maxPrice)));
  }
  if (filters.bedrooms !== undefined) {
    conditions.push(eq(properties.bedrooms, filters.bedrooms));
  }
  if (filters.isAvailable !== undefined) {
    conditions.push(eq(properties.isAvailable, filters.isAvailable));
  }
  
  let baseQuery = db.select().from(properties);
  
  if (conditions.length > 0) {
    baseQuery = baseQuery.where(and(...conditions)) as any;
  }
  
  const results = await baseQuery.limit(filters.limit || 20).offset(filters.offset || 0);
  
  return results.map((prop: any) => ({
    ...prop,
    amenities: prop.amenities ? JSON.parse(prop.amenities) : [],
    images: prop.images ? JSON.parse(prop.images) : [],
  }));
}

export async function deleteProperty(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(properties).where(eq(properties.id, id));
}

// ============ BOOKING OPERATIONS ============

export async function createBooking(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(bookings).values(data);
}

export async function getBookingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBookingsByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bookings).where(eq(bookings.tenantId, tenantId));
}

export async function getBookingsByLandlord(landlordId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bookings).where(eq(bookings.landlordId, landlordId));
}

export async function getBookingsByProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bookings).where(eq(bookings.propertyId, propertyId));
}

export async function updateBooking(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(bookings).set(data).where(eq(bookings.id, id));
}

// ============ PAYMENT OPERATIONS ============

export async function createPayment(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(payments).values(data);
}

export async function getPaymentsByBooking(bookingId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(payments).where(eq(payments.bookingId, bookingId));
}

export async function getPaymentsByLandlord(landlordId: number) {
  const db = await getDb();
  if (!db) return [];

  const landlordBookings = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.landlordId, landlordId));

  const bookingIds = landlordBookings.map(b => b.id);
  if (bookingIds.length === 0) return [];

  return await db
    .select()
    .from(payments)
    .where(inArray(payments.bookingId, bookingIds))
    .orderBy(desc(payments.createdAt));
}

export async function updatePayment(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(payments).set(data).where(eq(payments.id, id));
}

// ============ COMPLAINT OPERATIONS ============

export async function createComplaint(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(complaints).values({
    ...data,
    images: JSON.stringify(data.images || []),
  });
}

export async function getComplaintsByProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select().from(complaints).where(eq(complaints.propertyId, propertyId));
  return results.map(c => ({
    ...c,
    images: c.images ? JSON.parse(c.images) : [],
  }));
}

export async function getComplaintsByLandlord(landlordId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select().from(complaints).where(eq(complaints.landlordId, landlordId));
  return results.map(c => ({
    ...c,
    images: c.images ? JSON.parse(c.images) : [],
  }));
}

export async function updateComplaint(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { ...data };
  if (data.images) updateData.images = JSON.stringify(data.images);
  
  return await db.update(complaints).set(updateData).where(eq(complaints.id, id));
}

// ============ FAVORITE OPERATIONS ============

export async function addFavorite(tenantId: number, propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(favorites).values({ tenantId, propertyId });
}

export async function removeFavorite(tenantId: number, propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(favorites).where(
    and(eq(favorites.tenantId, tenantId), eq(favorites.propertyId, propertyId))
  );
}

export async function getFavoritesByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(favorites).where(eq(favorites.tenantId, tenantId));
}

// ============ REVIEW OPERATIONS ============

export async function createReview(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(reviews).values(data);
}

export async function getReviewsByProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(reviews).where(eq(reviews.propertyId, propertyId));
}

// ============ NOTIFICATION OPERATIONS ============

export async function createNotification(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(notifications).values(data);
}

export async function getNotificationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}
