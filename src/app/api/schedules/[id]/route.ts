import { NextResponse } from "next/server";

import { getScheduleById } from "@/lib/repo";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const schedule = await getScheduleById(id);
  if (!schedule) return NextResponse.json({ schedule: null }, { status: 404 });
  return NextResponse.json({ schedule });
}

