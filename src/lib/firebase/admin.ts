import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Stand-in user for `npm run dev` without Firebase. Nothing is stored for it.
export const LOCAL_DEV_UID = "local-dev";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

function serviceAccount(): App {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    return initializeApp({
      credential: cert(JSON.parse(json) as Parameters<typeof cert>[0]),
      projectId,
    });
  }
  return initializeApp({ credential: applicationDefault(), projectId });
}

function hasGcloudLogin(): boolean {
  const configDir = process.env.APPDATA ? join(process.env.APPDATA, "gcloud") : join(homedir(), ".config", "gcloud");
  return existsSync(join(configDir, "application_default_credentials.json"));
}

// Verifying ID tokens only needs the project ID, but Firestore needs real credentials.
// Without them every Firestore call retries for a long time before failing, so local
// dev skips server-side storage unless a service account or gcloud login is present.
export function canUseAdminFirestore(): boolean {
  if (process.env.NODE_ENV === "production") return true;
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS || hasGcloudLogin(),
  );
}

export function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  return serviceAccount();
}

export async function requireUid(request: Request): Promise<string> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const token = match?.[1]?.trim();
  // Lets `npm run dev` work before Firebase is set up. Deployed builds always require a token.
  if (!token && process.env.NODE_ENV === "development") return LOCAL_DEV_UID;
  if (!token) throw new AuthError("Missing bearer token.");
  try {
    const decoded = await getAuth(adminApp()).verifyIdToken(token);
    return decoded.uid;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Invalid bearer token.");
  }
}
