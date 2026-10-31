import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface VerificationRecord {
  id: string;
  userId: string;
  companyName: string;
  senderEmail: string | null;
  websiteUrl: string | null;
  score: number;
  verdict: "Safe" | "Suspicious" | "Likely Scam";
  extracted: any;
  checks: any[];
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  records: VerificationRecord[];
}

function getDbPath(): string {
  // On Vercel serverless functions, write to /tmp
  if (process.env.VERCEL) {
    return path.join("/tmp", "offercheck-store.json");
  }
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // ignore
    }
  }
  return path.join(dir, "store.json");
}

let inMemoryDb: DatabaseSchema | null = null;

function readDb(): DatabaseSchema {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  const filePath = getDbPath();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      inMemoryDb = JSON.parse(content);
      return inMemoryDb!;
    }
  } catch (err) {
    console.warn("Could not read db from disk, initializing fresh memory store:", err);
  }

  inMemoryDb = {
    users: [],
    sessions: [],
    records: [],
  };
  return inMemoryDb;
}

function saveDb(data: DatabaseSchema): void {
  inMemoryDb = data;
  const filePath = getDbPath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist db to disk (in-memory will remain active):", err);
  }
}

// ---------------------------------------------------------------------------
// Auth Helpers
// ---------------------------------------------------------------------------
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

export function findUserByEmail(email: string): User | null {
  const db = readDb();
  const normalized = email.toLowerCase().trim();
  return db.users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export function findUserById(id: string): User | null {
  const db = readDb();
  return db.users.find((u) => u.id === id) || null;
}

export function createUser(name: string, email: string, password: string): User {
  const db = readDb();
  const normalizedEmail = email.toLowerCase().trim();

  if (findUserByEmail(normalizedEmail)) {
    throw new Error("An account with this email already exists.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);

  const newUser: User = {
    id: "usr_" + crypto.randomUUID().slice(0, 8),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDb(db);
  return newUser;
}

export function verifyPassword(user: User, password: string): boolean {
  const hash = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.passwordHash));
}

export function createSession(userId: string): Session {
  const db = readDb();
  const token = crypto.randomBytes(32).toString("hex");

  // Expires in 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const session: Session = {
    token,
    userId,
    expiresAt,
  };

  db.sessions.push(session);
  saveDb(db);
  return session;
}

export function getUserFromSession(token: string): User | null {
  if (!token) return null;
  const db = readDb();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    deleteSession(token);
    return null;
  }

  return findUserById(session.userId);
}

export function deleteSession(token: string): void {
  const db = readDb();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  saveDb(db);
}

// ---------------------------------------------------------------------------
// Verification Records Helpers
// ---------------------------------------------------------------------------
export function saveVerificationRecord(
  userId: string,
  record: {
    companyName: string;
    senderEmail?: string | null;
    websiteUrl?: string | null;
    score: number;
    verdict: "Safe" | "Suspicious" | "Likely Scam";
    extracted: any;
    checks: any[];
  }
): VerificationRecord {
  const db = readDb();
  const newRecord: VerificationRecord = {
    id: "rec_" + crypto.randomUUID().slice(0, 8),
    userId,
    companyName: record.companyName || "Unknown Company",
    senderEmail: record.senderEmail || null,
    websiteUrl: record.websiteUrl || null,
    score: record.score,
    verdict: record.verdict,
    extracted: record.extracted,
    checks: record.checks,
    createdAt: new Date().toISOString(),
  };

  db.records.unshift(newRecord);
  saveDb(db);
  return newRecord;
}

export function getUserRecords(userId: string): VerificationRecord[] {
  const db = readDb();
  return db.records.filter((r) => r.userId === userId);
}

export function deleteUserRecord(userId: string, recordId: string): boolean {
  const db = readDb();
  const initialLength = db.records.length;
  db.records = db.records.filter((r) => !(r.userId === userId && r.id === recordId));
  if (db.records.length !== initialLength) {
    saveDb(db);
    return true;
  }
  return false;
}
