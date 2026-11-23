// Dates as YYYY-MM-DD in the user's LOCAL timezone (IST on site).
// `date.toISOString().split("T")[0]` returns the UTC date, which is still
// "yesterday" between 00:00 and 05:30 IST — never use it for calendar dates.
export const toLocalISO = (d = new Date()) => {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const todayISO = () => toLocalISO(new Date());
