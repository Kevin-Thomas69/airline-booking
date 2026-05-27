import { MongoClient } from "mongodb";
import { DateTime } from "luxon";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (!key) continue;
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadEnv() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(here, "..");
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));
}

loadEnv();

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function buildTimetable() {
  const airports = [
    { code: "NZNE", name: "Dairy Flat", city: "Auckland", country: "New Zealand", timeZone: "Pacific/Auckland" },
    { code: "YSSY", name: "Sydney", city: "Sydney", country: "Australia", timeZone: "Australia/Sydney" },
    { code: "NZRO", name: "Rotorua", city: "Rotorua", country: "New Zealand", timeZone: "Pacific/Auckland" },
    { code: "NZGB", name: "Claris (Great Barrier Island)", city: "Great Barrier Island", country: "New Zealand", timeZone: "Pacific/Auckland" },
    { code: "NZCI", name: "Tuuta (Chatham Islands)", city: "Chatham Islands", country: "New Zealand", timeZone: "Pacific/Chatham" },
    { code: "NZTL", name: "Lake Tekapo", city: "Lake Tekapo", country: "New Zealand", timeZone: "Pacific/Auckland" },
  ];

  const aircraft = {
    SJ30I: { code: "SJ30I", name: "SyberJet SJ30i", capacity: 6 },
    SF50_A: { code: "SF50-A", name: "Cirrus SF50", capacity: 4 },
    SF50_B: { code: "SF50-B", name: "Cirrus SF50", capacity: 4 },
    HJET_A: { code: "HJET-A", name: "HondaJet Elite", capacity: 5 },
    HJET_B: { code: "HJET-B", name: "HondaJet Elite", capacity: 5 },
  };

  const routes = [
    {
      routeKey: "NZNE-YSSY-prestige",
      origin: "NZNE",
      destination: "YSSY",
      aircraftCode: aircraft.SJ30I.code,
      priceNZD: 899,
      durationMinutes: 240,
      departureLocal: { weekday: 5, hour: 10, minute: 0 },
      flightNumberBase: 100,
    },
    {
      routeKey: "YSSY-NZNE-prestige",
      origin: "YSSY",
      destination: "NZNE",
      aircraftCode: aircraft.SJ30I.code,
      priceNZD: 799,
      durationMinutes: 210,
      departureLocal: { weekday: 7, hour: 15, minute: 30 },
      flightNumberBase: 101,
    },
    {
      routeKey: "NZNE-NZRO-shuttle-am",
      origin: "NZNE",
      destination: "NZRO",
      aircraftCode: aircraft.SF50_A.code,
      priceNZD: 149,
      durationMinutes: 55,
      departureLocal: { weekday: "weekday", hour: 7, minute: 15 },
      flightNumberBase: 200,
    },
    {
      routeKey: "NZRO-NZNE-shuttle-am",
      origin: "NZRO",
      destination: "NZNE",
      aircraftCode: aircraft.SF50_A.code,
      priceNZD: 149,
      durationMinutes: 55,
      departureLocal: { weekday: "weekday", hour: 9, minute: 0 },
      flightNumberBase: 201,
    },
    {
      routeKey: "NZNE-NZRO-shuttle-pm",
      origin: "NZNE",
      destination: "NZRO",
      aircraftCode: aircraft.SF50_A.code,
      priceNZD: 149,
      durationMinutes: 55,
      departureLocal: { weekday: "weekday", hour: 16, minute: 45 },
      flightNumberBase: 202,
    },
    {
      routeKey: "NZRO-NZNE-shuttle-pm",
      origin: "NZRO",
      destination: "NZNE",
      aircraftCode: aircraft.SF50_A.code,
      priceNZD: 149,
      durationMinutes: 55,
      departureLocal: { weekday: "weekday", hour: 18, minute: 30 },
      flightNumberBase: 203,
    },
    {
      routeKey: "NZNE-NZGB-cirrus",
      origin: "NZNE",
      destination: "NZGB",
      aircraftCode: aircraft.SF50_B.code,
      priceNZD: 219,
      durationMinutes: 65,
      departureLocal: { weekday: [1, 3, 5], hour: 9, minute: 30 },
      flightNumberBase: 300,
    },
    {
      routeKey: "NZGB-NZNE-cirrus",
      origin: "NZGB",
      destination: "NZNE",
      aircraftCode: aircraft.SF50_B.code,
      priceNZD: 219,
      durationMinutes: 65,
      departureLocal: { weekday: [2, 4, 6], hour: 10, minute: 15 },
      flightNumberBase: 301,
    },
    {
      routeKey: "NZNE-NZCI-hondajet",
      origin: "NZNE",
      destination: "NZCI",
      aircraftCode: aircraft.HJET_A.code,
      priceNZD: 499,
      durationMinutes: 130,
      departureLocal: { weekday: [2, 5], hour: 11, minute: 0 },
      flightNumberBase: 400,
    },
    {
      routeKey: "NZCI-NZNE-hondajet",
      origin: "NZCI",
      destination: "NZNE",
      aircraftCode: aircraft.HJET_A.code,
      priceNZD: 499,
      durationMinutes: 120,
      departureLocal: { weekday: [3, 6], hour: 10, minute: 45 },
      flightNumberBase: 401,
    },
    {
      routeKey: "NZNE-NZTL-hondajet",
      origin: "NZNE",
      destination: "NZTL",
      aircraftCode: aircraft.HJET_B.code,
      priceNZD: 329,
      durationMinutes: 95,
      departureLocal: { weekday: 1, hour: 14, minute: 15 },
      flightNumberBase: 500,
    },
    {
      routeKey: "NZTL-NZNE-hondajet",
      origin: "NZTL",
      destination: "NZNE",
      aircraftCode: aircraft.HJET_B.code,
      priceNZD: 329,
      durationMinutes: 90,
      departureLocal: { weekday: 2, hour: 12, minute: 0 },
      flightNumberBase: 501,
    },
  ];

  return { airports, aircraft, routes };
}

function datesBetweenInclusive(start, end) {
  const out = [];
  let cur = start.startOf("day");
  const final = end.startOf("day");
  while (cur <= final) {
    out.push(cur);
    cur = cur.plus({ days: 1 });
  }
  return out;
}

function matchesWeekday(spec, weekday) {
  if (spec === "weekday") return weekday >= 1 && weekday <= 5;
  if (Array.isArray(spec)) return spec.includes(weekday);
  return spec === weekday;
}

function createScheduleInstances({ airportsByCode, aircraftByCode, routes, startDate, endDate }) {
  const days = datesBetweenInclusive(startDate, endDate);
  const schedules = [];

  for (const route of routes) {
    const origin = airportsByCode[route.origin];
    const destination = airportsByCode[route.destination];
    const plane = Object.values(aircraftByCode).find((a) => a.code === route.aircraftCode);
    if (!origin || !destination || !plane) continue;

    for (const day of days) {
      const localDay = DateTime.fromObject({ year: day.year, month: day.month, day: day.day }, { zone: origin.timeZone });
      if (!matchesWeekday(route.departureLocal.weekday, localDay.weekday)) continue;

      const departureLocal = localDay.set({
        hour: route.departureLocal.hour,
        minute: route.departureLocal.minute,
        second: 0,
        millisecond: 0,
      });
      const departureUtc = departureLocal.toUTC();
      const arrivalUtc = departureUtc.plus({ minutes: route.durationMinutes });

      const flightNumber = `DF${route.flightNumberBase}`;
      const capacity = plane.capacity;

      schedules.push({
        routeKey: route.routeKey,
        flightNumber,
        aircraftCode: route.aircraftCode,
        origin: route.origin,
        destination: route.destination,
        departureAtUtc: departureUtc.toISO(),
        arrivalAtUtc: arrivalUtc.toISO(),
        priceNZD: route.priceNZD,
        capacity,
        bookedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  schedules.sort((a, b) => (a.departureAtUtc < b.departureAtUtc ? -1 : 1));
  return schedules;
}

async function main() {
  const uri = getEnv("MONGODB_URI");
  const dbName = process.env.MONGODB_DB || "airline_booking";

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const { airports, aircraft, routes } = buildTimetable();

  const airportsByCode = Object.fromEntries(airports.map((a) => [a.code, a]));
  const aircraftByCode = aircraft;

  const startDate = DateTime.now().setZone("Pacific/Auckland").startOf("day");
  const endDate = startDate.plus({ weeks: 6 }).endOf("day");
  const schedules = createScheduleInstances({ airportsByCode, aircraftByCode, routes, startDate, endDate });

  const airportsCol = db.collection("airports");
  const schedulesCol = db.collection("schedules");
  const passengersCol = db.collection("passengers");
  const bookingsCol = db.collection("bookings");

  await Promise.all([
    airportsCol.createIndex({ code: 1 }, { unique: true }),
    schedulesCol.createIndex({ departureAtUtc: 1 }),
    schedulesCol.createIndex({ origin: 1, destination: 1, departureAtUtc: 1 }),
    passengersCol.createIndex({ email: 1 }, { unique: true }),
    bookingsCol.createIndex({ reference: 1 }, { unique: true }),
    bookingsCol.createIndex({ passengerId: 1, status: 1 }),
    bookingsCol.createIndex({ scheduleId: 1, status: 1 }),
  ]);

  await airportsCol.deleteMany({});
  await schedulesCol.deleteMany({});
  await passengersCol.deleteMany({});
  await bookingsCol.deleteMany({});

  if (airports.length) await airportsCol.insertMany(airports);
  if (schedules.length) await schedulesCol.insertMany(schedules);

  await client.close();

  console.log(`Seeded DB "${dbName}": ${airports.length} airports, ${schedules.length} schedules`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
