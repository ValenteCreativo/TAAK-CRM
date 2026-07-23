import { cookies } from "next/headers";
import crypto from "node:crypto";
const secret = () => process.env.SESSION_SECRET || "dev-only-secret";
export function sign(value: string) { return crypto.createHmac("sha256", secret()).update(value).digest("hex"); }
export async function isAuthed() { const c = await cookies(); const token = c.get("taak_session")?.value; return !!token && token === sign("admin"); }
export const sessionCookie = () => ({ name: "taak_session", value: sign("admin"), httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
