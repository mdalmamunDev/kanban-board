/**
 * Timestamp helpers for log output, formatted in GMT+6 (Asia/Dhaka).
 *
 * Uses the IANA zone "Asia/Dhaka" (fixed UTC+6, no DST) via the native
 * Intl API, so the output is correct regardless of the server's timezone.
 */

const dhakaFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  // h23 keeps "00"–"23" (hour12: false alone can emit "24" at midnight).
  hourCycle: "h23",
});

/** e.g. "2026-09-07 14:30:05" */
export const logTimestamp = (date: Date = new Date()): string => {
  const parts = Object.fromEntries(
    dhakaFormatter.formatToParts(date).map((p) => [p.type, p.value])
  ) as Record<string, string>;
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
};
