import { getFirestoreAdmin } from "./firebaseDb";

const META_COLLECTION = "_meta";
const COUNTERS_DOC = "counters";

type CounterKey =
  | "userId"
  | "propertyId"
  | "bookingId"
  | "paymentId"
  | "complaintId"
  | "favoriteId"
  | "reviewId"
  | "notificationId";

function ensureDb() {
  const db = getFirestoreAdmin();
  if (!db) throw new Error("Firestore not available");
  return db;
}

function isTimestampLike(value: unknown): value is { toDate: () => Date } {
  return !!value && typeof value === "object" && typeof (value as any).toDate === "function";
}

function normalizeFirestoreValue<T = any>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => normalizeFirestoreValue(item)) as T;
  }
  if (isTimestampLike(value)) {
    return value.toDate() as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = normalizeFirestoreValue(val);
    }
    return out as T;
  }
  return value;
}

async function nextId(counterKey: CounterKey): Promise<number> {
  const db = ensureDb();
  const ref = db.collection(META_COLLECTION).doc(COUNTERS_DOC);
  const id = await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? (snap.data() as Record<string, unknown>) : {};
    const current = typeof data[counterKey] === "number" ? (data[counterKey] as number) : 0;
    const next = current + 1;
    tx.set(ref, { [counterKey]: next }, { merge: true });
    return next;
  });
  return id;
}

function userDocRefByOpenId(openId: string) {
  return ensureDb().collection("users").doc(openId);
}

function propertyDocRef(id: number) {
  return ensureDb().collection("properties").doc(String(id));
}

function bookingDocRef(id: number) {
  return ensureDb().collection("bookings").doc(String(id));
}

function paymentDocRef(id: number) {
  return ensureDb().collection("payments").doc(String(id));
}

function complaintDocRef(id: number) {
  return ensureDb().collection("complaints").doc(String(id));
}

function reviewDocRef(id: number) {
  return ensureDb().collection("reviews").doc(String(id));
}

function notificationDocRef(id: number) {
  return ensureDb().collection("notifications").doc(String(id));
}

function favoriteDocRef(tenantId: number, propertyId: number) {
  return ensureDb().collection("favorites").doc(`${tenantId}_${propertyId}`);
}

export async function upsertUser(user: any): Promise<void> {
  if (!user?.openId) throw new Error("User openId is required for upsert");
  const ref = userDocRefByOpenId(user.openId);
  const current = await ref.get();
  const existing = current.exists ? (current.data() as Record<string, unknown>) : {};

  let id = existing.id as number | undefined;
  if (typeof id !== "number") {
    id = await nextId("userId");
  }

  const now = new Date();
  await ref.set(
    {
      ...existing,
      ...user,
      id,
      createdAt: existing.createdAt ?? now,
      updatedAt: now,
      lastSignedIn: user.lastSignedIn ?? existing.lastSignedIn ?? now,
    },
    { merge: true }
  );
}

export async function getUserByOpenId(openId: string) {
  const snap = await userDocRefByOpenId(openId).get();
  if (!snap.exists) return undefined;
  return normalizeFirestoreValue(snap.data());
}

export async function getUserById(id: number) {
  const db = ensureDb();
  const snap = await db.collection("users").where("id", "==", id).limit(1).get();
  if (snap.empty) return undefined;
  return normalizeFirestoreValue(snap.docs[0].data());
}

export async function getUserByEmail(email: string) {
  const db = ensureDb();
  const normalized = email.trim().toLowerCase();
  const snap = await db.collection("users").where("email", "==", normalized).limit(1).get();
  if (snap.empty) return undefined;
  return normalizeFirestoreValue(snap.docs[0].data());
}

export async function createProperty(data: any) {
  const id = await nextId("propertyId");
  const now = new Date();
  const payload = {
    ...data,
    id,
    amenities: data.amenities ?? [],
    images: data.images ?? [],
    minLeaseMonths: data.minLeaseMonths ?? 1,
    maxLeaseMonths: data.maxLeaseMonths ?? 12,
    isAvailable: data.isAvailable ?? true,
    createdAt: now,
    updatedAt: now,
  };
  await propertyDocRef(id).set(payload);
  return payload;
}

export async function updateProperty(id: number, data: any) {
  const payload = { ...data, updatedAt: new Date() };
  await propertyDocRef(id).set(payload, { merge: true });
  return { id, ...payload };
}

export async function getPropertyById(id: number) {
  const snap = await propertyDocRef(id).get();
  if (!snap.exists) return undefined;
  return normalizeFirestoreValue(snap.data());
}

export async function getPropertiesByLandlord(landlordId: number) {
  const db = ensureDb();
  const snap = await db.collection("properties").where("landlordId", "==", landlordId).get();
  return snap.docs.map((doc: any) => normalizeFirestoreValue(doc.data()));
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
  const db = ensureDb();
  const snap = await db.collection("properties").get();
  const all = snap.docs.map((doc: any) => normalizeFirestoreValue<any>(doc.data()));

  const filtered = all.filter((prop: any) => {
    if (filters.city && !String(prop.city ?? "").toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.propertyType && prop.propertyType !== filters.propertyType) return false;
    if (filters.minPrice !== undefined && Number(prop.pricePerNight) < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && Number(prop.pricePerNight) > filters.maxPrice) return false;
    if (filters.bedrooms !== undefined && Number(prop.bedrooms) !== filters.bedrooms) return false;
    if (filters.bathrooms !== undefined && Number(prop.bathrooms) !== filters.bathrooms) return false;
    if (filters.isAvailable !== undefined && Boolean(prop.isAvailable) !== filters.isAvailable) return false;
    return true;
  });

  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 20;
  return filtered.slice(offset, offset + limit);
}

export async function deleteProperty(id: number) {
  await propertyDocRef(id).delete();
  return { success: true };
}

export async function createBooking(data: any) {
  const id = await nextId("bookingId");
  const now = new Date();
  const payload = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };
  await bookingDocRef(id).set(payload);
  return payload;
}

export async function getBookingById(id: number) {
  const snap = await bookingDocRef(id).get();
  if (!snap.exists) return undefined;
  return normalizeFirestoreValue(snap.data());
}

export async function getBookingsByTenant(tenantId: number) {
  const db = ensureDb();
  const snap = await db.collection("bookings").where("tenantId", "==", tenantId).get();
  return snap.docs.map((doc: any) => normalizeFirestoreValue(doc.data()));
}

export async function getBookingsByLandlord(landlordId: number) {
  const db = ensureDb();
  const snap = await db.collection("bookings").where("landlordId", "==", landlordId).get();
  return snap.docs.map((doc: any) => normalizeFirestoreValue(doc.data()));
}

export async function getBookingsByProperty(propertyId: number) {
  const db = ensureDb();
  const snap = await db.collection("bookings").where("propertyId", "==", propertyId).get();
  return snap.docs.map((doc: any) => normalizeFirestoreValue(doc.data()));
}

export async function updateBooking(id: number, data: any) {
  const payload = { ...data, updatedAt: new Date() };
  await bookingDocRef(id).set(payload, { merge: true });
  return { id, ...payload };
}

export async function createPayment(data: any) {
  const id = await nextId("paymentId");
  const now = new Date();
  const payload = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };
  await paymentDocRef(id).set(payload);
  return payload;
}

export async function getPaymentsByBooking(bookingId: number) {
  const db = ensureDb();
  const snap = await db.collection("payments").where("bookingId", "==", bookingId).get();
  return snap.docs.map((doc: any) => normalizeFirestoreValue(doc.data()));
}

export async function getPaymentsByLandlord(landlordId: number) {
  const bookings = await getBookingsByLandlord(landlordId);
  const bookingIds = new Set(bookings.map((b: any) => b.id));
  if (bookingIds.size === 0) return [];
  const db = ensureDb();
  const snap = await db.collection("payments").get();
  return snap.docs
    .map((doc: any) => normalizeFirestoreValue<any>(doc.data()))
    .filter((payment: any) => bookingIds.has(payment.bookingId))
    .sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function updatePayment(id: number, data: any) {
  const payload = { ...data, updatedAt: new Date() };
  await paymentDocRef(id).set(payload, { merge: true });
  return { id, ...payload };
}

export async function createComplaint(data: any) {
  const id = await nextId("complaintId");
  const now = new Date();
  const payload = {
    ...data,
    id,
    images: data.images ?? [],
    createdAt: now,
    updatedAt: now,
  };
  await complaintDocRef(id).set(payload);
  return payload;
}

export async function getComplaintsByProperty(propertyId: number) {
  const db = ensureDb();
  const snap = await db.collection("complaints").where("propertyId", "==", propertyId).get();
  return snap.docs.map((doc: any) => normalizeFirestoreValue(doc.data()));
}

export async function getComplaintsByLandlord(landlordId: number) {
  const db = ensureDb();
  const snap = await db.collection("complaints").where("landlordId", "==", landlordId).get();
  return snap.docs.map((doc: any) => normalizeFirestoreValue(doc.data()));
}

export async function updateComplaint(id: number, data: any) {
  const payload = { ...data, updatedAt: new Date() };
  await complaintDocRef(id).set(payload, { merge: true });
  return { id, ...payload };
}

export async function addFavorite(tenantId: number, propertyId: number) {
  const now = new Date();
  const payload = {
    id: await nextId("favoriteId"),
    tenantId,
    propertyId,
    createdAt: now,
  };
  await favoriteDocRef(tenantId, propertyId).set(payload);
  return payload;
}

export async function removeFavorite(tenantId: number, propertyId: number) {
  await favoriteDocRef(tenantId, propertyId).delete();
  return { success: true };
}

export async function getFavoritesByTenant(tenantId: number) {
  const db = ensureDb();
  const snap = await db.collection("favorites").where("tenantId", "==", tenantId).get();
  return snap.docs.map((doc: any) => normalizeFirestoreValue(doc.data()));
}

export async function createReview(data: any) {
  const id = await nextId("reviewId");
  const now = new Date();
  const payload = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };
  await reviewDocRef(id).set(payload);
  return payload;
}

export async function getReviewsByProperty(propertyId: number) {
  const db = ensureDb();
  const snap = await db.collection("reviews").where("propertyId", "==", propertyId).get();
  return snap.docs.map((doc: any) => normalizeFirestoreValue(doc.data()));
}

export async function createNotification(data: any) {
  const id = await nextId("notificationId");
  const now = new Date();
  const payload = {
    ...data,
    id,
    isRead: data.isRead ?? false,
    createdAt: now,
  };
  await notificationDocRef(id).set(payload);
  return payload;
}

export async function getNotificationsByUser(userId: number) {
  const db = ensureDb();
  const snap = await db.collection("notifications").where("userId", "==", userId).get();
  return snap.docs
    .map((doc: any) => normalizeFirestoreValue<any>(doc.data()))
    .sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function markNotificationAsRead(id: number) {
  await notificationDocRef(id).set({ isRead: true }, { merge: true });
  return { success: true };
}
