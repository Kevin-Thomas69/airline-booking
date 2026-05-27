export type Airport = {
  code: string;
  name: string;
  city: string;
  country: string;
  timeZone: string;
};

export type Schedule = {
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
};

export type BookingStatus = "active" | "cancelled";

export type Booking = {
  _id: string;
  reference: string;
  scheduleId: string;
  passengerId: string;
  passengerName: string;
  passengerEmail: string;
  status: BookingStatus;
  createdAt: string;
  cancelledAt?: string;
};

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

