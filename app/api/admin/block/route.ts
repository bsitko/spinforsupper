import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { block, unblock } from "@/lib/store";

// POST {id, name} blocks a place everywhere; DELETE {id} unblocks it.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const { id, name } = (await req.json().catch(() => ({}))) as { id?: string; name?: string };
  if (!id) return NextResponse.json({ error: "Missing place id." }, { status: 400 });
  await block(String(id).slice(0, 200), String(name || id).slice(0, 120));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "Missing place id." }, { status: 400 });
  await unblock(String(id));
  return NextResponse.json({ ok: true });
}
