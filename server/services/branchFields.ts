import type { InsertBranch } from "@shared/schema";

/**
 * Splits a single free-text manager name into the four name columns the
 * `branches` table actually stores. Jordanian names are commonly
 * "first father grandfather family", so the first two tokens map to
 * first/second name, the last token to the family name, and anything left
 * over is kept in the middle name rather than being dropped.
 */
export function splitManagerName(fullName: string): {
  managerFirstName: string | null;
  managerSecondName: string | null;
  managerMiddleName: string | null;
  managerLastName: string | null;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      managerFirstName: null,
      managerSecondName: null,
      managerMiddleName: null,
      managerLastName: null,
    };
  }

  if (parts.length === 1) {
    return {
      managerFirstName: parts[0],
      managerSecondName: null,
      managerMiddleName: null,
      managerLastName: null,
    };
  }

  const [first, ...rest] = parts;
  const last = rest.pop()!;
  const second = rest.shift() ?? null;
  const middle = rest.length > 0 ? rest.join(" ") : null;

  return {
    managerFirstName: first,
    managerSecondName: second,
    managerMiddleName: middle,
    managerLastName: last,
  };
}

/**
 * The registration and renewal forms collect `managerName`, `managerMobile` and
 * `area`, none of which exist as columns on `branches` — Drizzle silently drops
 * unknown keys, so these values used to vanish on insert. Map them onto the
 * columns that do exist before writing.
 */
export function toBranchColumns(branch: InsertBranch): Record<string, unknown> {
  const { managerName, managerMobile, area, ...rest } = branch as InsertBranch & {
    managerName?: string | null;
    managerMobile?: string | null;
    area?: string | null;
  };

  const mapped: Record<string, unknown> = { ...rest };

  if (managerName != null && String(managerName).trim() !== "") {
    Object.assign(mapped, splitManagerName(String(managerName)));
  }

  if (managerMobile != null && String(managerMobile).trim() !== "") {
    mapped.mobile = String(managerMobile).trim();
  }

  if (area != null && String(area).trim() !== "") {
    mapped.region = String(area).trim();
  }

  return mapped;
}
