"use client";

import { useMemo, useState } from "react";

type Airport = {
  code: string;
  name: string;
  city: string;
  country: string;
  timeZone: string;
};

type Schedule = {
  _id: string;
  flightNumber: string;
  aircraftCode: string;
  origin: string;
  destination: string;
  departureAtUtc: string;
  arrivalAtUtc: string;
  priceNZD: number;
  capacity: number;
  bookedCount: number;
  seatsLeft: number;
};

type Booking = {
  _id: string;
  reference: string;
  scheduleId: string;
  passengerId: string;
  passengerName: string;
  passengerEmail: string;
  status: string;
  createdAt: string;
};

function formatInZone(isoUtc: string, timeZone: string) {
  const dt = new Date(isoUtc);
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
}

export default function BookingClient(props: { schedule: Schedule; airports: Airport[] }) {
  const { schedule } = props;
  const airportByCode = useMemo(() => new Map(props.airports.map((a) => [a.code, a])), [props.airports]);
  const originAirport = airportByCode.get(schedule.origin);
  const destinationAirport = airportByCode.get(schedule.destination);

  const dep = originAirport ? formatInZone(schedule.departureAtUtc, originAirport.timeZone) : schedule.departureAtUtc;
  const arr = destinationAirport ? formatInZone(schedule.arrivalAtUtc, destinationAirport.timeZone) : schedule.arrivalAtUtc;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scheduleId: schedule._id, name, email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "Booking failed");
        return;
      }
      setBooking(json.booking);
    } catch {
      setError("Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Confirm booking</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {schedule.origin} → {schedule.destination} ({schedule.flightNumber})
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm font-semibold">Flight details</div>
          <div className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <div>
              Departs: <span className="text-zinc-950 dark:text-zinc-50">{dep}</span>
            </div>
            <div>
              Arrives: <span className="text-zinc-950 dark:text-zinc-50">{arr}</span>
            </div>
            <div>
              Aircraft: <span className="text-zinc-950 dark:text-zinc-50">{schedule.aircraftCode}</span>
            </div>
            <div>
              Seats left: <span className="text-zinc-950 dark:text-zinc-50">{schedule.seatsLeft}</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-black">
            <div className="flex items-center justify-between">
              <div className="font-medium">Total</div>
              <div className="font-semibold">${schedule.priceNZD} NZD</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
          {booking ? (
            <div>
              <div className="text-sm font-semibold">Invoice</div>
              <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                Booking reference:
                <div className="mt-1 text-lg font-semibold tracking-wider text-zinc-950 dark:text-zinc-50">
                  {booking.reference}
                </div>
                <div className="mt-4">
                  Passenger: <span className="text-zinc-950 dark:text-zinc-50">{booking.passengerName}</span>
                  <br />
                  Email: <span className="text-zinc-950 dark:text-zinc-50">{booking.passengerEmail}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href={`/trips?reference=${encodeURIComponent(booking.reference)}`}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  View booking
                </a>
                <a
                  href="/search"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium hover:bg-zinc-50 dark:border-white/15 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                >
                  Book another flight
                </a>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm font-semibold">Passenger details</div>
              <div className="mt-3 grid gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Full name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 rounded-xl border border-black/10 bg-white px-3 dark:border-white/15 dark:bg-black"
                    placeholder="e.g. Alex Taylor"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 rounded-xl border border-black/10 bg-white px-3 dark:border-white/15 dark:bg-black"
                    placeholder="e.g. alex@example.com"
                  />
                </label>
              </div>

              {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

              <button
                type="button"
                onClick={submit}
                disabled={submitting || !name.trim() || !email.trim() || schedule.seatsLeft <= 0}
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {schedule.seatsLeft <= 0 ? "Flight is full" : submitting ? "Booking…" : "Confirm and pay"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

