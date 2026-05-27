import { NextResponse } from "next/server";
import fs from "node:fs";

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
    // #region debug-point A:invalid-json
    (() => {
      const p = ".dbg/booking-failed.env";
      let u = "http://127.0.0.1:7777/event",
        s = "booking-failed";
      try {
        const e = fs.readFileSync(p, "utf8");
        u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
        s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
      } catch {}
      fetch(u, {
        method: "POST",
        body: JSON.stringify({
          sessionId: s,
          runId: "pre",
          hypothesisId: "A",
          location: "api/bookings:POST",
          msg: "[DEBUG] Invalid JSON body",
          ts: Date.now(),
        }),
      }).catch(() => {});
    })();
    // #endregion
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scheduleId = typeof body?.scheduleId === "string" ? body.scheduleId : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const email = typeof body?.email === "string" ? body.email : "";

  // #region debug-point A:post-entry
  (() => {
    const p = ".dbg/booking-failed.env";
    let u = "http://127.0.0.1:7777/event",
      s = "booking-failed";
    try {
      const e = fs.readFileSync(p, "utf8");
      u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
      s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
    } catch {}
    const emailDomain = typeof email === "string" && email.includes("@") ? email.split("@")[1] : "";
    fetch(u, {
      method: "POST",
      body: JSON.stringify({
        sessionId: s,
        runId: "pre",
        hypothesisId: "A",
        location: "api/bookings:POST",
        msg: "[DEBUG] POST /api/bookings",
        data: { scheduleIdLen: scheduleId.length, nameLen: name.trim().length, emailDomain },
        ts: Date.now(),
      }),
    }).catch(() => {});
  })();
  // #endregion

  const out = await createBooking({ scheduleId, name, email });
  if (!out.ok) {
    // #region debug-point B:post-error
    (() => {
      const p = ".dbg/booking-failed.env";
      let u = "http://127.0.0.1:7777/event",
        s = "booking-failed";
      try {
        const e = fs.readFileSync(p, "utf8");
        u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
        s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
      } catch {}
      fetch(u, {
        method: "POST",
        body: JSON.stringify({
          sessionId: s,
          runId: "pre",
          hypothesisId: "B",
          location: "api/bookings:POST",
          msg: "[DEBUG] createBooking returned error",
          data: { status: out.status, error: out.error },
          ts: Date.now(),
        }),
      }).catch(() => {});
    })();
    // #endregion
    return NextResponse.json({ error: out.error }, { status: out.status });
  }

  // #region debug-point B:post-ok
  (() => {
    const p = ".dbg/booking-failed.env";
    let u = "http://127.0.0.1:7777/event",
      s = "booking-failed";
    try {
      const e = fs.readFileSync(p, "utf8");
      u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
      s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
    } catch {}
    fetch(u, {
      method: "POST",
      body: JSON.stringify({
        sessionId: s,
        runId: "pre",
        hypothesisId: "B",
        location: "api/bookings:POST",
        msg: "[DEBUG] createBooking success",
        data: { reference: out.booking.reference },
        ts: Date.now(),
      }),
    }).catch(() => {});
  })();
  // #endregion
  return NextResponse.json({ booking: out.booking });
}
