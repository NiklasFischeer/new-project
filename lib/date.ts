import { format, formatDistanceToNowStrict, isPast } from "date-fns";

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy");
}

export function followUpLabel(date: Date | string | null | undefined): string {
  if (!date) return "No date";
  const d = typeof date === "string" ? new Date(date) : date;
  const relative = formatDistanceToNowStrict(d, { addSuffix: true });
  if (isPast(d)) return `Overdue (${relative})`;
  return relative;
}
