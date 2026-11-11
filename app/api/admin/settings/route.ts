import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { saveSettings, type Settings } from "@/lib/store";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Partial<Settings>;
  const patch: Partial<Settings> = {};
  if (body.dailyCap !== undefined) patch.dailyCap = Math.max(0, Math.floor(Number(body.dailyCap) || 0));
  if (body.paused !== undefined) patch.paused = !!body.paused;
  if (body.costPerCall !== undefined) patch.costPerCall = Math.max(0, Number(body.costPerCall) || 0);
  for (const k of ["bookTemplate", "orderTemplate"] as const) {
    if (body[k] !== undefined) {
      const v = String(body[k]).trim();
      if (v && !/^https:\/\//.test(v)) return NextResponse.json({ error: "Links must start with https://" }, { status: 400 });
      patch[k] = v;
    }
  }
  return NextResponse.json({ settings: await saveSettings(patch) });
}
