import { NextResponse } from "next/server";

import { createBooking, getBookingByReference, getBookingsByPassengerEmail } from "@/lib/repo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");
  const email = searchParams.get("email");

  if (reference) {
    const out = await getBookingByReference(reference);
    if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
    return NextResponse.json({ booking: out.booking });
  }

  if (email) {
    const out = await getBookingsByPassengerEmail(email);
    if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
    return NextResponse.json({ passenger: out.passenger, bookings: out.bookings });
  }

  return NextResponse.json({ error: "Missing reference or email" }, { status: 400 });
}

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scheduleId = typeof body?.scheduleId === "string" ? body.scheduleId : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const email = typeof body?.email === "string" ? body.email : "";

  const out = await createBooking({ scheduleId, name, email });
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ booking: out.booking! });
}

