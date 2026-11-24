import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { queryOne } from "./db";
import { COOKIE_NAME, getSecret } from "./secret";

export interface User {
  id: string;
  email: string;
  name: string;
}

const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

/** Signs a JWT and stores it in an httpOnly cookie. */
export async function startSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/** Returns the logged-in user, or null. Always re-checks the database. */
export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let userId: string | undefined;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    userId = payload.sub;
  } catch {
    return null; // bad or expired token
  }
  if (!userId) return null;

  return queryOne<User>("SELECT id, email, name FROM users WHERE id = $1", [userId]);
}
