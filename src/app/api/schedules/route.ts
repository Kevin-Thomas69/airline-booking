import { NextResponse } from "next/server";
import { DateTime } from "luxon";

import { getDb } from "@/lib/mongodb";
import { searchSchedules } from "@/lib/repo";

export const runtime = "nodejs";

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const origin = (searchParams.get("origin") || "").trim().toUpperCase();
  const destination = (searchParams.get("destination") || "").trim().toUpperCase();
  const date1Raw = (searchParams.get("date1") || "").trim();
  const date2Raw = (searchParams.get("date2") || "").trim();

  if (!origin || !destination || !date1Raw || !date2Raw) {
    return NextResponse.json({ error: "Missing origin/destination/date1/date2" }, { status: 400 });
  }
  if (!isIsoDate(date1Raw) || !isIsoDate(date2Raw)) {
    return NextResponse.json({ error: "date1/date2 must be YYYY-MM-DD" }, { status: 400 });
  }

  const db = await getDb();
  const originAirport = await db.collection("airports").findOne({ code: origin }, { projection: { timeZone: 1 } });
  const zone = originAirport?.timeZone || "Pacific/Auckland";

  const startLocal = DateTime.fromISO(date1Raw, { zone }).startOf("day");
  const endLocal = DateTime.fromISO(date2Raw, { zone }).endOf("day");
  if (!startLocal.isValid || !endLocal.isValid) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const date1 = startLocal.toUTC().toISO();
  const date2 = endLocal.toUTC().toISO();
  if (!date1 || !date2) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const schedules = await searchSchedules({ origin, destination, date1, date2 });
  return NextResponse.json({ schedules });
}

