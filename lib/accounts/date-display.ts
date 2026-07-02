/** Accounts module date display helpers — not for use outside `/accounts`. */

/** ISO date (yyyy-mm-dd) → display (dd-mm-yyyy) */
export function isoToDisplayDate(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

/** Display date (dd-mm-yyyy) → ISO (yyyy-mm-dd) */
export function displayToIsoDate(display: string): string {
  const trimmed = display.trim();
  if (!trimmed) return "";
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (!match) return "";
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}
