import { nanoid } from "nanoid";
import { createRequire } from "module";
import { hashPasswordSync } from "./authPassword";

const require = createRequire(import.meta.url);

type FirebaseUser = {
  id: number;
  openId: string;
  email: string;
  name: string | null;
  role: "user" | "admin" | "landlord" | "tenant";
  passwordHash?: string;
  // Legacy fallback for existing accounts stored before hashing rollout.
  password?: string;
  loginMethod?: string;
  createdAt?: string;
  updatedAt?: string;
  lastSignedIn?: string;
};

let firebaseAdminModule: any | null | undefined;

function getFirebaseAdminModule() {
  if (firebaseAdminModule !== undefined) return firebaseAdminModule;
  try {
    firebaseAdminModule = require("firebase-admin");
  } catch {
    firebaseAdminModule = null;
  }
  return firebaseAdminModule;
}

export function isFirebaseNotReadyError(error: unknown) {
  const err = error as { code?: unknown; message?: unknown } | null;
  const code = typeof err?.code === "number" ? err.code : undefined;
  const message = typeof err?.message === "string" ? err.message : "";
  return code === 5 || message.includes("NOT_FOUND");
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

function hasFirebaseConfig() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

export function getFirestoreAdmin() {
  const admin = getFirebaseAdminModule();
  if (!admin) return null;
  if (!hasFirebaseConfig()) return null;

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY as string),
      }),
    });
  }

  return admin.firestore();
}

export function isFirebaseAuthEnabled() {
  return Boolean(getFirebaseAdminModule() && hasFirebaseConfig());
}

const USERS_COLLECTION = "users";
const META_COLLECTION = "_meta";
const USER_COUNTER_DOC = "userCounters";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mapUser(data: FirebaseUser | undefined | null): FirebaseUser | null {
  if (!data) return null;
  return {
    ...data,
    email: normalizeEmail(data.email),
  };
}

async function getNextUserId(db: any): Promise<number> {
  const counterRef = db.collection(META_COLLECTION).doc(USER_COUNTER_DOC);
  const value = await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists && typeof snap.data()?.value === "number" ? snap.data().value : 0;
    const next = current + 1;
    tx.set(counterRef, { value: next }, { merge: true });
    return next;
  });
  return value;
}

export async function findFirebaseUserByEmail(email: string): Promise<FirebaseUser | null> {
  const db = getFirestoreAdmin();
  if (!db) return null;

  const normalizedEmail = normalizeEmail(email);
  const snap = await db
    .collection(USERS_COLLECTION)
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();
  if (snap.empty) return null;

  const data = snap.docs[0].data() as FirebaseUser;
  return mapUser(data);
}

export async function findFirebaseUserByOpenId(openId: string): Promise<FirebaseUser | null> {
  const db = getFirestoreAdmin();
  if (!db) return null;

  const snap = await db.collection(USERS_COLLECTION).where("openId", "==", openId).limit(1).get();
  if (snap.empty) return null;

  const data = snap.docs[0].data() as FirebaseUser;
  return mapUser(data);
}

export async function createFirebaseUser(
  email: string,
  name: string | null,
  role: FirebaseUser["role"],
  password: string
): Promise<FirebaseUser | null> {
  const db = getFirestoreAdmin();
  if (!db) return null;

  const normalizedEmail = normalizeEmail(email);
  const existing = await findFirebaseUserByEmail(normalizedEmail);
  if (existing) return null;

  const id = await getNextUserId(db);
  const openId = `firebase_${nanoid()}`;
  const now = new Date().toISOString();
  const user: FirebaseUser = {
    id,
    openId,
    email: normalizedEmail,
    name,
    role,
    passwordHash: hashPasswordSync(password),
    loginMethod: "email",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };

  await db.collection(USERS_COLLECTION).doc(openId).set(user);
  return user;
}

export async function createFirebaseOAuthUser(
  email: string,
  name: string | null,
  role: FirebaseUser["role"]
): Promise<FirebaseUser | null> {
  const db = getFirestoreAdmin();
  if (!db) return null;

  const normalizedEmail = normalizeEmail(email);
  const existing = await findFirebaseUserByEmail(normalizedEmail);
  if (existing) return null;

  const id = await getNextUserId(db);
  const openId = `firebase_${nanoid()}`;
  const now = new Date().toISOString();
  const user: FirebaseUser = {
    id,
    openId,
    email: normalizedEmail,
    name,
    role,
    loginMethod: "google",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };

  await db.collection(USERS_COLLECTION).doc(openId).set(user);
  return user;
}

export async function updateFirebaseUserLastSignedIn(openId: string): Promise<void> {
  const db = getFirestoreAdmin();
  if (!db) return;

  const now = new Date().toISOString();
  await db.collection(USERS_COLLECTION).doc(openId).set(
    {
      lastSignedIn: now,
      updatedAt: now,
    },
    { merge: true }
  );
}

export async function updateFirebaseUserPasswordHash(openId: string, passwordHash: string): Promise<void> {
  const db = getFirestoreAdmin();
  if (!db) return;

  const now = new Date().toISOString();
  await db.collection(USERS_COLLECTION).doc(openId).set(
    {
      passwordHash,
      password: null,
      updatedAt: now,
    },
    { merge: true }
  );
}
