import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/db/schema";
import { isAuthed } from "@/lib/auth";
export async function POST(req: Request) { if (!(await isAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 }); const sub = await req.json(); await db.insert(pushSubscriptions).values({ endpoint: sub.endpoint, subscription: JSON.stringify(sub), createdAt: new Date() }).onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { subscription: JSON.stringify(sub) } }); return NextResponse.json({ ok: true }); }
