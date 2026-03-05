import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { parse as parseCookie } from "cookie";
import { findLocalByOpenId } from "../localDb";
import {
  findFirebaseUserByOpenId,
  isFirebaseAuthEnabled,
  isFirebaseNotReadyError,
} from "../firebaseDb";
import { COOKIE_NAME } from "@shared/const";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  const cookieHeader = opts.req.headers.cookie;
  const cookies = cookieHeader ? parseCookie(cookieHeader) : null;
  const session = cookies?.[COOKIE_NAME];

  // Support local email/password sessions in every environment.
  if (session) {
    if (isFirebaseAuthEnabled()) {
      try {
        const firebaseUser = await findFirebaseUserByOpenId(session);
        if (firebaseUser) {
          user = firebaseUser as unknown as User;
        }
      } catch (error) {
        if (!isFirebaseNotReadyError(error)) {
          throw error;
        }
      }
    }

    if (!user) {
      const local = findLocalByOpenId(session);
      if (local) {
        // Cast to User - properties not used in local mode will be undefined.
        user = local as unknown as User;
      }
    }
  }

  if (!user && process.env.DATABASE_URL) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
