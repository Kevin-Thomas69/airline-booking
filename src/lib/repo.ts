import "server-only";

import crypto from "crypto";
import { MongoServerError, ObjectId } from "mongodb";
import fs from "node:fs";

import { getClient, getDb } from "@/lib/mongodb";
import type { Schedule as DomainSchedule } from "@/lib/domain";
import { isEmail, normalizeEmail } from "@/lib/domain";

type RepoError = { ok: false; status: number; error: string };

type RepoBooking = {
  _id: string;
  reference: string;
  scheduleId: string;
  passengerId: string;
  passengerName: string;
  passengerEmail: string;
  status: "active" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
};

type RepoSchedule = DomainSchedule & { seatsLeft: number };

function toRepoSchedule(doc: unknown): RepoSchedule {
  const d = (doc ?? {}) as Record<string, unknown>;
  const idRaw = (d as { _id?: unknown })._id;
  const id =
    typeof idRaw === "object" &&
    idRaw !== null &&
    "toString" in idRaw &&
    typeof (idRaw as { toString: unknown }).toString === "function"
      ? (idRaw as { toString: () => string }).toString()
      : String(idRaw ?? "");

  const capacity = Number(d.capacity ?? 0);
  const bookedCount = Number(d.bookedCount ?? 0);
  return {
    _id: id,
    routeKey: String(d.routeKey ?? ""),
    flightNumber: String(d.flightNumber ?? ""),
    aircraftCode: String(d.aircraftCode ?? ""),
    origin: String(d.origin ?? ""),
    destination: String(d.destination ?? ""),
    departureAtUtc: String(d.departureAtUtc ?? ""),
    arrivalAtUtc: String(d.arrivalAtUtc ?? ""),
    priceNZD: Number(d.priceNZD ?? 0),
    capacity,
    bookedCount,
    seatsLeft: Math.max(0, capacity - bookedCount),
  };
}

function toObjectId(id: string) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

let indexesEnsured = false;

async function ensureIndexes() {
  if (indexesEnsured) return;
  const db = await getDb();

  await Promise.all([
    db.collection("airports").createIndex({ code: 1 }, { unique: true }),
    db.collection("schedules").createIndex({ departureAtUtc: 1 }),
    db.collection("schedules").createIndex({ origin: 1, destination: 1, departureAtUtc: 1 }),
    db.collection("passengers").createIndex({ email: 1 }, { unique: true }),
    db.collection("bookings").createIndex({ reference: 1 }, { unique: true }),
    db.collection("bookings").createIndex({ passengerId: 1, status: 1 }),
    db.collection("bookings").createIndex({ scheduleId: 1, status: 1 }),
  ]);

  indexesEnsured = true;
}

export async function listAirports() {
  await ensureIndexes();
  const db = await getDb();
  const items = await db.collection("airports").find({}, { projection: { _id: 0 } }).sort({ code: 1 }).toArray();
  return items;
}

export async function searchSchedules(params: {
  origin: string;
  destination: string;
  date1: string;
  date2: string;
}): Promise<RepoSchedule[]> {
  await ensureIndexes();
  const db = await getDb();

  const { origin, destination, date1, date2 } = params;
  const query = {
    origin,
    destination,
    departureAtUtc: { $gte: date1, $lte: date2 },
  };

  const schedules = await db
    .collection("schedules")
    .find(query)
    .sort({ departureAtUtc: 1 })
    .toArray();

  return schedules.map(toRepoSchedule);
}

export async function getScheduleById(id: string): Promise<RepoSchedule | null> {
  await ensureIndexes();
  const db = await getDb();
  const oid = toObjectId(id);
  if (!oid) return null;
  const schedule = await db.collection("schedules").findOne({ _id: oid });
  if (!schedule) return null;
  return toRepoSchedule(schedule);
}

function generateReference() {
  return crypto.randomBytes(5).toString("hex").toUpperCase();
}

export async function createBooking(input: { scheduleId: string; name: string; email: string }) {
  await ensureIndexes();
  const db = await getDb();

  const scheduleOid = toObjectId(input.scheduleId);
  if (!scheduleOid) {
    // #region debug-point E:invalid-scheduleid
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
          hypothesisId: "E",
          location: "repo:createBooking",
          msg: "[DEBUG] Invalid scheduleId (ObjectId parse failed)",
          data: { scheduleIdLen: input.scheduleId.length },
          ts: Date.now(),
        }),
      }).catch(() => {});
    })();
    // #endregion
    return { ok: false, status: 400, error: "Invalid scheduleId" } satisfies RepoError;
  }

  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (!name) return { ok: false, status: 400, error: "Name is required" } satisfies RepoError;
  if (!isEmail(email)) return { ok: false, status: 400, error: "Invalid email" } satisfies RepoError;

  // #region debug-point B:validated-input
  (() => {
    const p = ".dbg/booking-failed.env";
    let u = "http://127.0.0.1:7777/event",
      s = "booking-failed";
    try {
      const e = fs.readFileSync(p, "utf8");
      u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
      s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
    } catch {}
    const emailDomain = email.includes("@") ? email.split("@")[1] : "";
    fetch(u, {
      method: "POST",
      body: JSON.stringify({
        sessionId: s,
        runId: "pre",
        hypothesisId: "B",
        location: "repo:createBooking",
        msg: "[DEBUG] createBooking input validated",
        data: { scheduleId: input.scheduleId, nameLen: name.length, emailDomain },
        ts: Date.now(),
      }),
    }).catch(() => {});
  })();
  // #endregion

  try {
    const schedule = await db.collection("schedules").findOne({ _id: scheduleOid });
    if (!schedule) {
      // #region debug-point E:schedule-not-found
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
            hypothesisId: "E",
            location: "repo:createBooking",
            msg: "[DEBUG] Schedule not found for scheduleId",
            data: { scheduleId: input.scheduleId },
            ts: Date.now(),
          }),
        }).catch(() => {});
      })();
      // #endregion
      return { ok: false, status: 404, error: "Schedule not found" };
    }
    const capacity = schedule.capacity ?? 0;
    const bookedCount = schedule.bookedCount ?? 0;
    if (bookedCount >= capacity) {
      // #region debug-point A:flight-full-early
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
            location: "repo:createBooking",
            msg: "[DEBUG] Flight is full (pre-check)",
            data: { capacity, bookedCount, scheduleId: input.scheduleId },
            ts: Date.now(),
          }),
        }).catch(() => {});
      })();
      // #endregion
      return { ok: false, status: 409, error: "Flight is full" };
    }

    await db.collection("passengers").updateOne(
      { email },
      {
        $setOnInsert: { email, createdAt: new Date() },
        $set: { name, updatedAt: new Date() },
      },
      { upsert: true },
    );
    const passenger = await db.collection("passengers").findOne({ email });
    if (!passenger) return { ok: false, status: 500, error: "Failed to create passenger" };

    // #region debug-point B:passenger-upserted
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
          location: "repo:createBooking",
          msg: "[DEBUG] Passenger upserted",
          data: { passengerId: passenger._id.toString() },
          ts: Date.now(),
        }),
      }).catch(() => {});
    })();
    // #endregion

    const scheduleUpdate = await db
      .collection("schedules")
      .updateOne({ _id: scheduleOid, bookedCount: { $lt: capacity } }, { $inc: { bookedCount: 1 }, $set: { updatedAt: new Date() } });
    if (scheduleUpdate.modifiedCount !== 1) {
      // #region debug-point A:flight-full-update
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
            location: "repo:createBooking",
            msg: "[DEBUG] Flight is full (conditional update failed)",
            data: { capacity, scheduleId: input.scheduleId },
            ts: Date.now(),
          }),
        }).catch(() => {});
      })();
      // #endregion
      return { ok: false, status: 409, error: "Flight is full" };
    }

    let reference = generateReference();
    for (let i = 0; i < 5; i += 1) {
      try {
        const bookingDoc: Omit<RepoBooking, "_id" | "scheduleId" | "passengerId"> & {
          scheduleId: ObjectId;
          passengerId: ObjectId;
        } = {
          reference,
          scheduleId: scheduleOid,
          passengerId: passenger._id as ObjectId,
          passengerName: name,
          passengerEmail: email,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const insert = await db.collection("bookings").insertOne(bookingDoc);
        // #region debug-point B:booking-inserted
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
              location: "repo:createBooking",
              msg: "[DEBUG] Booking inserted",
              data: { bookingId: insert.insertedId.toString(), reference },
              ts: Date.now(),
            }),
          }).catch(() => {});
        })();
        // #endregion
        return {
          ok: true,
          booking: {
            _id: insert.insertedId.toString(),
            reference: bookingDoc.reference,
            scheduleId: input.scheduleId,
            passengerId: passenger._id.toString(),
            passengerName: bookingDoc.passengerName,
            passengerEmail: bookingDoc.passengerEmail,
            status: bookingDoc.status,
            createdAt: bookingDoc.createdAt,
            updatedAt: bookingDoc.updatedAt,
          },
        };
      } catch (err) {
        if (err instanceof MongoServerError && err.code === 11000) {
          // #region debug-point D:reference-collision
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
                hypothesisId: "D",
                location: "repo:createBooking",
                msg: "[DEBUG] Booking reference collision (retrying)",
                ts: Date.now(),
              }),
            }).catch(() => {});
          })();
          // #endregion
          reference = generateReference();
          continue;
        }
        throw err;
      }
    }
    throw new Error("Failed to allocate booking reference");
  } catch (err) {
    // #region debug-point C:transaction-error
    (() => {
      const p = ".dbg/booking-failed.env";
      let u = "http://127.0.0.1:7777/event",
        s = "booking-failed";
      try {
        const e = fs.readFileSync(p, "utf8");
        u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
        s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
      } catch {}
      const e = err as { name?: unknown; message?: unknown; code?: unknown; codeName?: unknown; stack?: unknown };
      fetch(u, {
        method: "POST",
        body: JSON.stringify({
          sessionId: s,
          runId: "pre",
          hypothesisId: "C",
          location: "repo:createBooking",
          msg: "[DEBUG] createBooking threw",
          data: {
            name: typeof e?.name === "string" ? e.name : undefined,
            message: typeof e?.message === "string" ? e.message : undefined,
            code: typeof e?.code === "number" || typeof e?.code === "string" ? e.code : undefined,
            codeName: typeof e?.codeName === "string" ? e.codeName : undefined,
            stack: typeof e?.stack === "string" ? e.stack.split("\n").slice(0, 6).join("\n") : undefined,
          },
          ts: Date.now(),
        }),
      }).catch(() => {});
    })();
    // #endregion
    return { ok: false, status: 500, error: "Booking failed" } satisfies RepoError;
  }
}

export async function getBookingsByPassengerEmail(emailRaw: string) {
  await ensureIndexes();
  const db = await getDb();
  const email = normalizeEmail(emailRaw);
  if (!isEmail(email)) return { ok: false, status: 400, error: "Invalid email" };

  const passenger = await db.collection("passengers").findOne({ email });
  if (!passenger) return { ok: true, bookings: [], passenger: null };

  const bookings = await db
    .collection("bookings")
    .find({ passengerId: passenger._id })
    .sort({ createdAt: -1 })
    .toArray();

  const scheduleIds = bookings.map((b) => b.scheduleId).filter(Boolean);
  const schedules = await db
    .collection("schedules")
    .find({ _id: { $in: scheduleIds } })
    .toArray();
  const schedulesById = new Map(schedules.map((s) => [s._id.toString(), { ...s, _id: s._id.toString() }]));

  return {
    ok: true,
    passenger: { _id: passenger._id.toString(), name: passenger.name, email: passenger.email },
    bookings: bookings.map((b) => ({
      _id: b._id.toString(),
      reference: b.reference,
      status: b.status,
      passengerName: b.passengerName,
      passengerEmail: b.passengerEmail,
      createdAt: b.createdAt,
      cancelledAt: b.cancelledAt,
      schedule: schedulesById.get(b.scheduleId.toString()) ?? null,
    })),
  };
}

export async function getBookingByReference(referenceRaw: string) {
  await ensureIndexes();
  const db = await getDb();
  const reference = referenceRaw.trim().toUpperCase();
  if (!reference) return { ok: false, status: 400, error: "Reference is required" };

  const booking = await db.collection("bookings").findOne({ reference });
  if (!booking) return { ok: true, booking: null };

  const schedule = await db.collection("schedules").findOne({ _id: booking.scheduleId });
  return {
    ok: true,
    booking: {
      _id: booking._id.toString(),
      reference: booking.reference,
      status: booking.status,
      passengerName: booking.passengerName,
      passengerEmail: booking.passengerEmail,
      createdAt: booking.createdAt,
      cancelledAt: booking.cancelledAt,
      schedule: schedule ? { ...schedule, _id: schedule._id.toString() } : null,
    },
  };
}

export async function cancelBooking(referenceRaw: string) {
  await ensureIndexes();
  const db = await getDb();
  const reference = referenceRaw.trim().toUpperCase();
  if (!reference) return { ok: false, status: 400, error: "Reference is required" };

  const booking = await db.collection("bookings").findOne({ reference });
  if (!booking) return { ok: false, status: 404, error: "Booking not found" };
  if (booking.status === "cancelled") return { ok: true, cancelled: true };

  const updated = await db
    .collection("bookings")
    .updateOne(
      { _id: booking._id, status: "active" },
      { $set: { status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() } },
    );
  if (updated.modifiedCount !== 1) return { ok: true, cancelled: true };

  await db
    .collection("schedules")
    .updateOne({ _id: booking.scheduleId, bookedCount: { $gt: 0 } }, { $inc: { bookedCount: -1 }, $set: { updatedAt: new Date() } });

  return { ok: true, cancelled: true };
}
