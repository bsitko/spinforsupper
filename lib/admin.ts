// Admin auth: one password from the ADMIN_PASSWORD env var. The login sets an httpOnly cookie holding an
// HMAC of the password, so changing the password logs everyone out.
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "sfs_admin";

export function adminToken() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHmac("sha256", pw).update("spin-for-supper-admin").digest("hex");
}

export function passwordMatches(input: string) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(pw);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isAdmin() {
  const want = adminToken();
  if (!want) return false;
  const got = (await cookies()).get(ADMIN_COOKIE)?.value || "";
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
