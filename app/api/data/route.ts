import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { clients, projects, payments, notes } from "@/db/schema";
import { isAuthed } from "@/lib/auth";

const unauthorized = () => NextResponse.json({ error: "No autorizado" }, { status: 401 });
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function GET() {
  if (!(await isAuthed())) return unauthorized();
  return NextResponse.json({
    clients: await db.select().from(clients),
    projects: await db.select().from(projects).orderBy(desc(projects.createdAt)),
    payments: await db.select().from(payments).orderBy(desc(payments.createdAt)),
    notes: await db.select().from(notes).orderBy(desc(notes.createdAt)),
  });
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return unauthorized();
  const body = await req.json();
  const now = new Date();
  if (body.type === "client") return NextResponse.json(await db.insert(clients).values({ name: body.name, email: body.email || null, phone: body.phone || null, notes: body.notes || null, createdAt: now }).returning());
  if (body.type === "project") {
    const created = await db.insert(projects).values({ clientId: Number(body.clientId), name: body.name, budget: Number(body.budget || 0), stage: body.stage || "Junta inicial", internalStatus: body.internalStatus || "En diseño", startDate: body.startDate || null, advanceDate: body.advanceDate || null, deliveryDate: body.deliveryDate || null, createdAt: now }).returning();
    const project = created[0]; const budget = Number(body.budget || 0);
    if (project && budget > 0) await db.insert(payments).values([{ projectId: project.id, amount: Math.round(budget / 2), label: "Anticipo", status: "Pendiente", createdAt: now }, { projectId: project.id, amount: budget - Math.round(budget / 2), label: "Contraentrega", status: "Pendiente", dueDate: body.deliveryDate || null, createdAt: now }]);
    return NextResponse.json(created);
  }
  if (body.type === "payment") return NextResponse.json(await db.insert(payments).values({ projectId: Number(body.projectId), amount: Number(body.amount), label: body.label || "Pago", status: body.status || "Pagado", paidAt: body.status === "Pendiente" ? null : (body.paidAt || new Date().toISOString().slice(0, 10)), dueDate: body.dueDate || null, createdAt: now }).returning());
  if (body.type === "note") return NextResponse.json(await db.insert(notes).values({ projectId: Number(body.projectId), body: body.body, createdAt: now }).returning());
  return bad("Tipo inválido");
}

export async function PATCH(req: Request) {
  if (!(await isAuthed())) return unauthorized();
  const body = await req.json(); const id = Number(body.id); if (!id || !body.changes) return bad("Faltan datos para guardar");
  const c = body.changes;
  if (body.type === "client") return NextResponse.json(await db.update(clients).set({ name: c.name, email: c.email || null, phone: c.phone || null, notes: c.notes || null }).where(eq(clients.id, id)).returning());
  if (body.type === "project") return NextResponse.json(await db.update(projects).set({ clientId: c.clientId === undefined ? undefined : Number(c.clientId), name: c.name, stage: c.stage, internalStatus: c.internalStatus, budget: c.budget === undefined ? undefined : Number(c.budget), startDate: c.startDate || null, advanceDate: c.advanceDate || null, deliveryDate: c.deliveryDate || null }).where(eq(projects.id, id)).returning());
  if (body.type === "payment") return NextResponse.json(await db.update(payments).set({ projectId: c.projectId === undefined ? undefined : Number(c.projectId), amount: c.amount === undefined ? undefined : Number(c.amount), label: c.label, status: c.status, dueDate: c.dueDate || null, paidAt: c.status === "Pagado" ? (c.paidAt || new Date().toISOString().slice(0, 10)) : null }).where(eq(payments.id, id)).returning());
  if (body.type === "note") return NextResponse.json(await db.update(notes).set({ projectId: c.projectId === undefined ? undefined : Number(c.projectId), body: c.body }).where(eq(notes.id, id)).returning());
  return bad("Tipo inválido");
}

export async function DELETE(req: Request) {
  if (!(await isAuthed())) return unauthorized();
  const body = await req.json(); const id = Number(body.id); if (!id) return bad("Falta el registro");
  if (body.type === "payment") return NextResponse.json(await db.delete(payments).where(eq(payments.id, id)).returning());
  if (body.type === "note") return NextResponse.json(await db.delete(notes).where(eq(notes.id, id)).returning());
  return bad("Solo se pueden borrar pagos y notas desde aquí");
}
