"use client";

import { useEffect, useMemo, useState } from "react";

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
};

type BookingRow = {
  _id: string;
  reference: string;
  status: "active" | "cancelled";
  passengerName: string;
  passengerEmail: string;
  createdAt: string;
  cancelledAt?: string;
  schedule: Schedule | null;
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

export default function TripsClient() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const airportByCode = useMemo(() => new Map(airports.map((a) => [a.code, a])), [airports]);

  const [email, setEmail] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [single, setSingle] = useState<BookingRow | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    fetch("/api/airports")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAirports(Array.isArray(data?.airports) ? data.airports : []);
      })
      .catch(() => {
        if (cancelled) return;
        setAirports([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mounted) {
      const ref = new URLSearchParams(window.location.search).get("reference") ?? "";
      if (ref) {
        setReference(ref);
        void lookupByReference(ref);
      }
    }
  }, [mounted]);

  async function lookupByEmail(emailValue: string) {
    setLoading(true);
    setError(null);
    setBookings([]);
    setSingle(null);
    try {
      const url = new URL("/api/bookings", window.location.origin);
      url.searchParams.set("email", emailValue);
      const res = await fetch(url.toString());
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "Lookup failed");
        return;
      }
      setBookings(Array.isArray(json?.bookings) ? json.bookings : []);
    } catch {
      setError("Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function lookupByReference(refValue: string) {
    setLoading(true);
    setError(null);
    setBookings([]);
    setSingle(null);
    try {
      const url = new URL("/api/bookings", window.location.origin);
      url.searchParams.set("reference", refValue);
      const res = await fetch(url.toString());
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "Lookup failed");
        return;
      }
      setSingle(json?.booking ?? null);
    } catch {
      setError("Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function cancel(refValue: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(refValue)}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "Cancel failed");
        return;
      }
      if (single?.reference === refValue) {
        await lookupByReference(refValue);
      } else if (email.trim()) {
        await lookupByEmail(email.trim());
      }
    } catch {
      setError("Cancel failed");
    } finally {
      setLoading(false);
    }
  }

  async function refreshBooking(refValue: string) {
    setLoading(true);
    setError(null);
    try {
      if (single?.reference === refValue) {
        await lookupByReference(refValue);
      } else if (email.trim()) {
        await lookupByEmail(email.trim());
      }
    } catch {
      setError("Refresh failed");
    } finally {
      setLoading(false);
    }
  }

  const rows: BookingRow[] = single ? [single] : bookings;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">My trips</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Look up your bookings by passenger email or booking reference.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm font-semibold">By email</div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 flex-1 rounded-xl border border-black/10 bg-white px-3 dark:border-white/15 dark:bg-black"
              placeholder="alex@example.com"
            />
            <button
              type="button"
              disabled={loading || !email.trim()}
              onClick={() => lookupByEmail(email.trim())}
              className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Search
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm font-semibold">By reference</div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="h-10 flex-1 rounded-xl border border-black/10 bg-white px-3 tracking-wider dark:border-white/15 dark:bg-black"
              placeholder="e.g. A1B2C3D4"
            />
            <button
              type="button"
              disabled={loading || !reference.trim()}
              onClick={() => lookupByReference(reference.trim())}
              className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Find
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

      <div className="mt-8">
        <div className="text-sm font-semibold">Bookings</div>
        <div className="mt-3 grid gap-3">
          {rows.length === 0 && !loading ? (
            <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
              No bookings loaded yet.
            </div>
          ) : null}

          {rows.map((b) => {
            const s = b.schedule;
            const originAirport = s ? airportByCode.get(s.origin) : undefined;
            const destinationAirport = s ? airportByCode.get(s.destination) : undefined;
            const dep = s && originAirport ? formatInZone(s.departureAtUtc, originAirport.timeZone) : null;
            const arr = s && destinationAirport ? formatInZone(s.arrivalAtUtc, destinationAirport.timeZone) : null;
            return (
              <div
                key={b._id}
                className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-zinc-950"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold">
                      {b.reference}{" "}
                      <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400">({b.status})</span>
                    </div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      Passenger: {b.passengerName} · {b.passengerEmail}
                    </div>
                    {s ? (
                      <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {s.origin} → {s.destination}{" "}
                        <span className="text-xs font-normal">({s.flightNumber})</span>
                        <br />
                        Departs: {dep}
                        <br />
                        Arrives: {arr}
                        <br />
                        Price: ${s.priceNZD} NZD
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Schedule not available.</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => refreshBooking(b.reference)}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-white/15 dark:bg-zinc-950 dark:hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Refresh
                    </button>
                    <button
                      type="button"
                      disabled={loading || b.status !== "active"}
                      onClick={() => cancel(b.reference)}
                      className="inline-flex h-10 items-center justify-center rounded-full bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
