export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-12">
      <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Online booking for a point-to-point airline
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
          Search scheduled flights from Dairy Flat (NZNE), book a seat, get a unique booking reference, and manage your
          trips. No login required.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href="/search"
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Search flights
          </a>
          <a
            href="/trips"
            className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium hover:bg-zinc-50 dark:border-white/15 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            My trips
          </a>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm font-semibold">Routes</div>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>NZNE ⇄ YSSY (weekly)</li>
            <li>NZNE ⇄ NZRO (weekday shuttle, twice daily)</li>
            <li>NZNE ⇄ NZGB (Mon/Wed/Fri outbound)</li>
            <li>NZNE ⇄ NZCI (Tue/Fri outbound)</li>
            <li>NZNE ⇄ NZTL (weekly)</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm font-semibold">How it works</div>
          <ol className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>1. Pick origin, destination, and dates</li>
            <li>2. Select a scheduled flight</li>
            <li>3. Enter passenger details and confirm</li>
            <li>4. Use your booking reference to view or cancel</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
