import { isFirebaseAuthEnabled } from "./firebaseDb";
import * as firestoreDb from "./firestoreDb";
import * as mysqlDb from "./mysqlDb";

function useFirestore() {
  return isFirebaseAuthEnabled();
}

export async function getDb() {
  return useFirestore() ? firestoreDb : mysqlDb.getDb();
}

export async function upsertUser(user: any): Promise<void> {
  if (useFirestore()) return firestoreDb.upsertUser(user);
  return mysqlDb.upsertUser(user);
}

export async function getUserByOpenId(openId: string) {
  if (useFirestore()) return firestoreDb.getUserByOpenId(openId);
  return mysqlDb.getUserByOpenId(openId);
}

export async function getUserById(id: number) {
  if (useFirestore()) return firestoreDb.getUserById(id);
  return mysqlDb.getUserById(id);
}

export async function getUserByEmail(email: string) {
  if (useFirestore()) return firestoreDb.getUserByEmail(email);
  return mysqlDb.getUserByEmail(email);
}

export async function createProperty(data: any) {
  if (useFirestore()) return firestoreDb.createProperty(data);
  return mysqlDb.createProperty(data);
}

export async function updateProperty(id: number, data: any) {
  if (useFirestore()) return firestoreDb.updateProperty(id, data);
  return mysqlDb.updateProperty(id, data);
}

export async function getPropertyById(id: number) {
  if (useFirestore()) return firestoreDb.getPropertyById(id);
  return mysqlDb.getPropertyById(id);
}

export async function getPropertiesByLandlord(landlordId: number) {
  if (useFirestore()) return firestoreDb.getPropertiesByLandlord(landlordId);
  return mysqlDb.getPropertiesByLandlord(landlordId);
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
  if (useFirestore()) return firestoreDb.searchProperties(filters);
  return mysqlDb.searchProperties(filters);
}

export async function deleteProperty(id: number) {
  if (useFirestore()) return firestoreDb.deleteProperty(id);
  return mysqlDb.deleteProperty(id);
}

export async function createBooking(data: any) {
  if (useFirestore()) return firestoreDb.createBooking(data);
  return mysqlDb.createBooking(data);
}

export async function getBookingById(id: number) {
  if (useFirestore()) return firestoreDb.getBookingById(id);
  return mysqlDb.getBookingById(id);
}

export async function getBookingsByTenant(tenantId: number) {
  if (useFirestore()) return firestoreDb.getBookingsByTenant(tenantId);
  return mysqlDb.getBookingsByTenant(tenantId);
}

export async function getBookingsByLandlord(landlordId: number) {
  if (useFirestore()) return firestoreDb.getBookingsByLandlord(landlordId);
  return mysqlDb.getBookingsByLandlord(landlordId);
}

export async function getBookingsByProperty(propertyId: number) {
  if (useFirestore()) return firestoreDb.getBookingsByProperty(propertyId);
  return mysqlDb.getBookingsByProperty(propertyId);
}

export async function updateBooking(id: number, data: any) {
  if (useFirestore()) return firestoreDb.updateBooking(id, data);
  return mysqlDb.updateBooking(id, data);
}

export async function createPayment(data: any) {
  if (useFirestore()) return firestoreDb.createPayment(data);
  return mysqlDb.createPayment(data);
}

export async function getPaymentsByBooking(bookingId: number) {
  if (useFirestore()) return firestoreDb.getPaymentsByBooking(bookingId);
  return mysqlDb.getPaymentsByBooking(bookingId);
}

export async function getPaymentsByLandlord(landlordId: number) {
  if (useFirestore()) return firestoreDb.getPaymentsByLandlord(landlordId);
  return mysqlDb.getPaymentsByLandlord(landlordId);
}

export async function updatePayment(id: number, data: any) {
  if (useFirestore()) return firestoreDb.updatePayment(id, data);
  return mysqlDb.updatePayment(id, data);
}

export async function createComplaint(data: any) {
  if (useFirestore()) return firestoreDb.createComplaint(data);
  return mysqlDb.createComplaint(data);
}

export async function getComplaintsByProperty(propertyId: number) {
  if (useFirestore()) return firestoreDb.getComplaintsByProperty(propertyId);
  return mysqlDb.getComplaintsByProperty(propertyId);
}

export async function getComplaintsByLandlord(landlordId: number) {
  if (useFirestore()) return firestoreDb.getComplaintsByLandlord(landlordId);
  return mysqlDb.getComplaintsByLandlord(landlordId);
}

export async function updateComplaint(id: number, data: any) {
  if (useFirestore()) return firestoreDb.updateComplaint(id, data);
  return mysqlDb.updateComplaint(id, data);
}

export async function addFavorite(tenantId: number, propertyId: number) {
  if (useFirestore()) return firestoreDb.addFavorite(tenantId, propertyId);
  return mysqlDb.addFavorite(tenantId, propertyId);
}

export async function removeFavorite(tenantId: number, propertyId: number) {
  if (useFirestore()) return firestoreDb.removeFavorite(tenantId, propertyId);
  return mysqlDb.removeFavorite(tenantId, propertyId);
}

export async function getFavoritesByTenant(tenantId: number) {
  if (useFirestore()) return firestoreDb.getFavoritesByTenant(tenantId);
  return mysqlDb.getFavoritesByTenant(tenantId);
}

export async function createReview(data: any) {
  if (useFirestore()) return firestoreDb.createReview(data);
  return mysqlDb.createReview(data);
}

export async function getReviewsByProperty(propertyId: number) {
  if (useFirestore()) return firestoreDb.getReviewsByProperty(propertyId);
  return mysqlDb.getReviewsByProperty(propertyId);
}

export async function createNotification(data: any) {
  if (useFirestore()) return firestoreDb.createNotification(data);
  return mysqlDb.createNotification(data);
}

export async function getNotificationsByUser(userId: number) {
  if (useFirestore()) return firestoreDb.getNotificationsByUser(userId);
  return mysqlDb.getNotificationsByUser(userId);
}

export async function markNotificationAsRead(id: number) {
  if (useFirestore()) return firestoreDb.markNotificationAsRead(id);
  return mysqlDb.markNotificationAsRead(id);
}
