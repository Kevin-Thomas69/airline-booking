import { notFound } from "next/navigation";

import BookingClient from "@/app/book/[scheduleId]/BookingClient";
import { getScheduleById, listAirports } from "@/lib/repo";

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

export default async function BookPage(props: { params: Promise<{ scheduleId: string }> }) {
  const { scheduleId } = await props.params;
  const [schedule, airports] = await Promise.all([getScheduleById(scheduleId), listAirports()]);

  if (!schedule) return notFound();

  const scheduleForClient: Schedule = {
    _id: String(schedule._id),
    flightNumber: String(schedule.flightNumber ?? ""),
    aircraftCode: String(schedule.aircraftCode ?? ""),
    origin: String(schedule.origin ?? ""),
    destination: String(schedule.destination ?? ""),
    departureAtUtc: String(schedule.departureAtUtc ?? ""),
    arrivalAtUtc: String(schedule.arrivalAtUtc ?? ""),
    priceNZD: Number(schedule.priceNZD ?? 0),
    capacity: Number(schedule.capacity ?? 0),
    bookedCount: Number(schedule.bookedCount ?? 0),
    seatsLeft: Number(schedule.seatsLeft ?? Math.max(0, Number(schedule.capacity ?? 0) - Number(schedule.bookedCount ?? 0))),
  };

  const airportsForClient: Airport[] = airports.map((a) => ({
    code: String(a.code ?? ""),
    name: String(a.name ?? ""),
    city: String(a.city ?? ""),
    country: String(a.country ?? ""),
    timeZone: String(a.timeZone ?? "Pacific/Auckland"),
  }));

  return <BookingClient schedule={scheduleForClient} airports={airportsForClient} />;
}
