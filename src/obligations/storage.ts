// Persistencia de obligaciones (E4PA-84).
// Guarda en localStorage para que los datos sigan al cerrar y reabrir la app.

import {
  isValidISODate,
  normalizeObligation,
  parseDisplayDate,
  validateObligation,
  type NewObligationInput,
  type Obligation,
  type ObligationStatus,
} from "./model";

export const STORAGE_KEY = "krono-obligations";

/** Lo mínimo que necesitamos de localStorage (permite probarlo con uno falso). */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

const STATUSES: ObligationStatus[] = [
  "Próxima",
  "En plazo",
  "Vencida",
  "Completada",
  "Cancelada",
];

/** Datos de ejemplo que se ven mientras el usuario no ha guardado nada. */
export const initialObligations: Obligation[] = [
  {
    id: 1,
    name: "Netflix",
    description: "Suscripción",
    dueDate: "2026-11-25",
    amount: 12.99,
    status: "Próxima",
  },
  {
    id: 2,
    name: "Renovación DNI",
    description: "Documento",
    dueDate: "2026-12-12",
    status: "En plazo",
  },
  {
    id: 3,
    name: "Factura de luz",
    description: "Suministro",
    dueDate: "2026-12-18",
    amount: 84.5,
    status: "Próxima",
  },
].map((item) => normalizeObligation(item as Obligation));

function defaultStorage(): KeyValueStorage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

/**
 * Convierte lo que haya guardado (incluido el formato antiguo, que guardaba
 * la fecha como texto "25 nov 2026") en una Obligation válida.
 * Devuelve undefined si el registro no se puede recuperar.
 */
function recoverObligation(raw: unknown): Obligation | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const item = raw as Record<string, unknown>;

  if (typeof item.id !== "number" || !Number.isFinite(item.id)) return undefined;
  if (typeof item.name !== "string") return undefined;

  const dueDate =
    typeof item.dueDate === "string" && isValidISODate(item.dueDate)
      ? item.dueDate
      : typeof item.date === "string"
      ? parseDisplayDate(item.date)
      : undefined;
  if (!dueDate) return undefined;

  const status = STATUSES.includes(item.status as ObligationStatus)
    ? (item.status as ObligationStatus)
    : "En plazo";

  const amount = typeof item.amount === "number" ? item.amount : undefined;
  const reminderDays =
    typeof item.reminderDays === "number" ? item.reminderDays : undefined;

  if (validateObligation({ name: item.name, dueDate, amount, reminderDays }).length > 0) {
    return undefined;
  }

  const text = (value: unknown) => (typeof value === "string" ? value : undefined);

  return normalizeObligation({
    id: item.id,
    name: item.name,
    description: text(item.description) ?? "",
    dueDate,
    amount,
    status,
    category: text(item.category),
    reminderDays,
    reminderSnoozedUntil: text(item.reminderSnoozedUntil),
    cancelledAt: text(item.cancelledAt),
  });
}

/** Quita ids repetidos: si un id aparece dos veces se queda con el último. */
function dedupeById(list: Obligation[]): Obligation[] {
  const byId = new Map<number, Obligation>();
  for (const item of list) byId.set(item.id, item);
  return [...byId.values()];
}

function write(list: Obligation[], storage: KeyValueStorage | undefined): Obligation[] {
  const clean = dedupeById(list.map((item) => normalizeObligation(item)));
  storage?.setItem(STORAGE_KEY, JSON.stringify(clean));
  return clean;
}

/**
 * Lee las obligaciones guardadas. Si no hay nada guardado devuelve los datos
 * de ejemplo; si lo guardado está corrupto, también.
 */
export function loadObligations(
  storage: KeyValueStorage | undefined = defaultStorage()
): Obligation[] {
  try {
    const text = storage?.getItem(STORAGE_KEY) ?? null;
    if (text === null) return initialObligations;

    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return initialObligations;

    return dedupeById(
      parsed
        .map(recoverObligation)
        .filter((item): item is Obligation => item !== undefined)
    );
  } catch {
    return initialObligations;
  }
}

/** Guarda la lista completa (normalizada y sin ids repetidos). */
export function saveObligations(
  list: Obligation[],
  storage: KeyValueStorage | undefined = defaultStorage()
): Obligation[] {
  return write(list, storage);
}

export type AddResult =
  | { ok: true; obligation: Obligation }
  | { ok: false; errors: string[] };

/** Valida, asigna un id nuevo y guarda una obligación. */
export function addObligation(
  input: NewObligationInput,
  storage: KeyValueStorage | undefined = defaultStorage()
): AddResult {
  const errors = validateObligation(input);
  if (errors.length > 0) return { ok: false, errors };

  const current = loadObligations(storage);
  const id = current.reduce((max, item) => Math.max(max, item.id), 0) + 1;

  const obligation = normalizeObligation({
    id,
    name: input.name.trim(),
    description: input.description,
    dueDate: input.dueDate,
    amount: input.amount,
    status: input.status ?? "En plazo",
    category: input.category,
    reminderDays: input.reminderDays,
  });

  write([...current, obligation], storage);
  return { ok: true, obligation };
}

/**
 * Sustituye la obligación que tenga el mismo id. No crea registros nuevos:
 * si el id no existe no hace nada y devuelve undefined.
 */
export function updateObligation(
  updated: Obligation,
  storage: KeyValueStorage | undefined = defaultStorage()
): Obligation[] | undefined {
  const current = loadObligations(storage);
  if (!current.some((item) => item.id === updated.id)) return undefined;

  return write(
    current.map((item) => (item.id === updated.id ? updated : item)),
    storage
  );
}
