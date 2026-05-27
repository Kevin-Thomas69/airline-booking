import { NextResponse } from "next/server";

import { listAirports } from "@/lib/repo";

export const runtime = "nodejs";

export async function GET() {
  const airports = await listAirports();
  return NextResponse.json({ airports });
}

