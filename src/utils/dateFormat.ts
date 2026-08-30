

export function beijingWallDate(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value as string | number);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function toBeijingInstant(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value as string | number);
  if (isNaN(d.getTime())) return null;
  
  return new Date(d.getTime() - 8 * 60 * 60 * 1000);
}


export function beijingRfc2822(value: unknown): string {
  const d = toBeijingInstant(value);
  return d ? d.toUTCString() : new Date().toUTCString();
}
