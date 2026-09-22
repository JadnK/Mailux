/** "Jane Doe" -> "JD", "root" -> "RO", "" -> "?" */
export function initialsOf(value: string): string {
  const clean = value.trim();
  if (!clean) return "?";

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
