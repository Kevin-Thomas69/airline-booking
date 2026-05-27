"use client";

import { useEffect, useMemo, useState } from "react";

type Airport = {
  code: string;
  name: string;
  city: string;
  country: string;
  timeZone: string;
};

type ScheduleRow = {
  _id: string;
  routeKey: string;
  flightNumber: string;
  aircraftCode: string;
  origin: string;
  destination: string;
  departureAtUtc: string;
  arrivalAtUtc: string;
  priceNZD: number;
  capacity: number;
  bookedCount: number;
  seatsLeft?: number;
};

function todayIsoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysIsoDate(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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

export default function SearchClient() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [origin, setOrigin] = useState("NZNE");
  const [destination, setDestination] = useState("NZRO");
  const [date1, setDate1] = useState(todayIsoDate());
  const [date2, setDate2] = useState(addDaysIsoDate(todayIsoDate(), 14));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);

  const airportByCode = useMemo(() => {
    const map = new Map<string, Airport>();
    for (const a of airports) map.set(a.code, a);
    return map;
  }, [airports]);

  useEffect(() => {
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

  async function runSearch() {
    setLoading(true);
    setError(null);
    setSchedules([]);
    try {
      const url = new URL("/api/schedules", window.location.origin);
      url.searchParams.set("origin", origin);
      url.searchParams.set("destination", destination);
      url.searchParams.set("date1", date1);
      url.searchParams.set("date2", date2);
      const res = await fetch(url.toString());
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "Search failed");
        return;
      }
      setSchedules(Array.isArray(json?.schedules) ? json.schedules : []);
    } catch {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Search flights</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Pick an origin, destination, and date range to see scheduled flights.
      </p>

      <div className="mt-6 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Origin</span>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="h-10 rounded-xl border border-black/10 bg-white px-3 dark:border-white/15 dark:bg-black"
            >
              {airports.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.city}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Destination</span>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="h-10 rounded-xl border border-black/10 bg-white px-3 dark:border-white/15 dark:bg-black"
            >
              {airports.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.city}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">From</span>
            <input
              type="date"
              value={date1}
              onChange={(e) => setDate1(e.target.value)}
              className="h-10 rounded-xl border border-black/10 bg-white px-3 dark:border-white/15 dark:bg-black"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">To</span>
            <input
              type="date"
              value={date2}
              onChange={(e) => setDate2(e.target.value)}
              className="h-10 rounded-xl border border-black/10 bg-white px-3 dark:border-white/15 dark:bg-black"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            {origin === destination ? "Origin and destination must be different." : null}
          </div>
          <button
            type="button"
            disabled={loading || origin === destination}
            onClick={runSearch}
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
      </div>

      <div className="mt-8">
        <div className="text-sm font-semibold">Results</div>
        <div className="mt-3 grid gap-3">
          {schedules.length === 0 ? (
            <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
              Run a search to see available flights.
            </div>
          ) : null}

          {schedules.map((s) => {
            const originAirport = airportByCode.get(s.origin);
            const destinationAirport = airportByCode.get(s.destination);
            const dep = originAirport ? formatInZone(s.departureAtUtc, originAirport.timeZone) : s.departureAtUtc;
            const arr = destinationAirport ? formatInZone(s.arrivalAtUtc, destinationAirport.timeZone) : s.arrivalAtUtc;
            const seatsLeft = typeof s.seatsLeft === "number" ? s.seatsLeft : Math.max(0, s.capacity - s.bookedCount);
            return (
              <div
                key={s._id}
                className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-zinc-950"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold">
                      {s.origin} → {s.destination}{" "}
                      <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400">({s.flightNumber})</span>
                    </div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      Departs: {dep}
                      <br />
                      Arrives: {arr}
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="font-medium">${s.priceNZD} NZD</span>{" "}
                      <span className="text-zinc-600 dark:text-zinc-400">
                        · {s.aircraftCode} · {seatsLeft} seats left
                      </span>
                    </div>
                  </div>

                  <a
                    href={`/book/${s._id}`}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    Book
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

