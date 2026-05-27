import { NextResponse } from "next/server";

import { cancelBooking, getBookingByReference } from "@/lib/repo";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ reference: string }> }) {
  const { reference } = await context.params;
  const out = await getBookingByReference(reference);
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ booking: out.booking });
}

export async function DELETE(_: Request, context: { params: Promise<{ reference: string }> }) {
  const { reference } = await context.params;
  const out = await cancelBooking(reference);
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ cancelled: true });
}

