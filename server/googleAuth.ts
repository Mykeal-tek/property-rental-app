import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export type GoogleProfile = {
  email: string;
  name: string | null;
  subject: string;
};

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const googleClientId = getGoogleClientId();
  if (!googleClientId) {
    throw new Error("Google auth is not configured. Set GOOGLE_CLIENT_ID.");
  }

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: GOOGLE_ISSUERS,
    audience: googleClientId,
  });

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const emailVerified = payload.email_verified === true;
  const subject = typeof payload.sub === "string" ? payload.sub : "";
  const name = typeof payload.name === "string" ? payload.name : null;

  if (!email || !emailVerified || !subject) {
    throw new Error("Invalid Google token payload");
  }

  return {
    email,
    name,
    subject,
  };
}

