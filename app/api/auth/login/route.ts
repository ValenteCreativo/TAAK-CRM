import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth";
export async function POST(req: Request) { const { password } = await req.json(); if (!password || password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 }); const res = NextResponse.json({ ok: true }); res.cookies.set(sessionCookie()); return res; }
