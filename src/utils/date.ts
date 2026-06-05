export function toISODate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toISODateTime(value: Date): string {
  return value.toISOString();
}

export function parseDateInput(input: string): Date | null {
  const normalized = input.trim();
  if (!normalized) {
    return null;
  }

  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const dateOnly = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [_, y, m, d] = dateOnly;
    const value = new Date(`${y}-${m}-${d}T00:00:00+09:00`);
    if (!Number.isNaN(value.getTime())) {
      return value;
    }
  }

  return null;
}

export function daysSince(dateText: string | null | undefined, now: Date = new Date()): number | null {
  if (!dateText) {
    return null;
  }
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function isSameDate(dateText: string | null | undefined, target: Date): boolean {
  if (!dateText) {
    return false;
  }
  const value = new Date(dateText);
  if (Number.isNaN(value.getTime())) {
    return false;
  }
  return value.toISOString().slice(0, 10) === target.toISOString().slice(0, 10);
}

export function isWithinDays(dateText: string | null | undefined, withinDays: number, now: Date = new Date()): boolean {
  if (!dateText) {
    return false;
  }
  const value = new Date(dateText);
  if (Number.isNaN(value.getTime())) {
    return false;
  }
  const diffMs = value.getTime() - now.getTime();
  const days = diffMs / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= withinDays;
}
