import { hashPasswordSync } from "./authPassword";

export type LocalUser = {
  id: number;
  openId: string;
  email: string;
  name: string | null;
  role: "user" | "admin" | "landlord" | "tenant";
  passwordHash?: string;
  // Legacy fallback; kept to auto-migrate existing in-memory users.
  password?: string;
};

export const localUsers: LocalUser[] = [
  {
    id: 1,
    openId: "local_1",
    email: "test@gmail.com",
    name: "Dev User",
    role: "landlord",
    passwordHash: hashPasswordSync("password123"),
  },
  {
    id: 2,
    openId: "local_2",
    email: "tenant@test.com",
    name: "Test Tenant",
    role: "tenant",
    passwordHash: hashPasswordSync("password123"),
  },
  {
    id: 3,
    openId: "local_3",
    email: "landlord@test.com",
    name: "Test Landlord",
    role: "landlord",
    passwordHash: hashPasswordSync("password123"),
  },
];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function findLocalByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  return localUsers.find((u) => normalizeEmail(u.email) === normalizedEmail);
}

export function findLocalByOpenId(openId: string) {
  return localUsers.find((u) => u.openId === openId);
}

export function createLocalUser(
  email: string,
  name: string | null,
  role: LocalUser["role"],
  password: string
) {
  const id = localUsers.length + 1;
  const openId = `local_${id}`;
  const user: LocalUser = {
    id,
    openId,
    email: normalizeEmail(email),
    name,
    role,
    passwordHash: hashPasswordSync(password),
  };
  localUsers.push(user);
  return user;
}
