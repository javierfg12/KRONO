// Modelo de datos de una Obligación (E4PA-84).
//
// Campos del alcance de la tarea y dónde viven:
//   tipo               -> description (p. ej. "Suscripción de pago") y category
//   nombre / concepto  -> name
//   importe opcional   -> amount
//   fecha límite       -> dueDate (ISO yyyy-mm-dd)
//   días de antelación -> reminderDays
//   fecha del aviso    -> noticeDate (CALCULADA: dueDate - reminderDays)
//   estado             -> state ("pendiente" | "resuelta", CALCULADO desde status)

export type ObligationStatus =
  | "Próxima"
  | "En plazo"
  | "Vencida"
  | "Completada"
  | "Cancelada";

export type ObligationState = "pendiente" | "resuelta";

export type Obligation = {
  id: number;
  name: string;
  /** Tipo de obligación (Suscripción de pago, Factura / Suministro...). */
  description: string;
  /** Fecha límite en formato ISO yyyy-mm-dd. */
  dueDate: string;
  amount?: number;
  /** Etiqueta que muestra la interfaz. */
  status: ObligationStatus;
  /** pendiente | resuelta. Nunca se asigna a mano: lo fija normalizeObligation. */
  state: ObligationState;
  category?: string;
  /** Días de antelación del aviso. */
  reminderDays?: number;
  /** Fecha del aviso (ISO). Nunca se asigna a mano: lo fija normalizeObligation. */
  noticeDate?: string;
  reminderSnoozedUntil?: string;
  cancelledAt?: string;
};

/** Datos que hacen falta para crear una obligación nueva. */
export type NewObligationInput = {
  name: string;
  description: string;
  dueDate: string;
  amount?: number;
  category?: string;
  reminderDays?: number;
  status?: ObligationStatus;
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const match = ISO_DATE.exec(value);
  if (!match) return false;

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Resta `days` días a una fecha ISO (sin depender de zona horaria ni de horario de verano). */
export function computeNoticeDate(dueDate: string, reminderDays: number): string {
  const [year, month, day] = dueDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day - reminderDays));

  return date.toISOString().slice(0, 10);
}

export function stateFromStatus(status: ObligationStatus): ObligationState {
  return status === "Completada" ? "resuelta" : "pendiente";
}

/**
 * Devuelve la lista de problemas de una obligación (vacía si es válida).
 * Se usa antes de guardar para no persistir registros rotos.
 */
export function validateObligation(
  data: Pick<NewObligationInput, "name" | "dueDate" | "amount" | "reminderDays">
): string[] {
  const errors: string[] = [];

  if (typeof data.name !== "string" || !data.name.trim()) {
    errors.push("El nombre es obligatorio.");
  }

  if (!isValidISODate(data.dueDate)) {
    errors.push("La fecha límite no es válida.");
  }

  if (
    data.amount !== undefined &&
    (typeof data.amount !== "number" || !Number.isFinite(data.amount) || data.amount < 0)
  ) {
    errors.push("El importe debe ser un número igual o mayor que 0.");
  }

  if (
    data.reminderDays !== undefined &&
    (!Number.isInteger(data.reminderDays) || data.reminderDays < 0)
  ) {
    errors.push("Los días de antelación deben ser un número entero igual o mayor que 0.");
  }

  return errors;
}

/**
 * Punto único donde se fijan los campos calculados (state y noticeDate).
 * Se aplica en cada guardado, así que nunca pueden quedar desincronizados
 * con status, dueDate y reminderDays.
 */
export function normalizeObligation(
  obligation: Omit<Obligation, "state" | "noticeDate"> &
    Partial<Pick<Obligation, "state" | "noticeDate">>
): Obligation {
  const { state: _state, noticeDate: _noticeDate, ...rest } = obligation;
  void _state;
  void _noticeDate;

  return {
    ...rest,
    state: stateFromStatus(rest.status),
    noticeDate:
      rest.reminderDays !== undefined
        ? computeNoticeDate(rest.dueDate, rest.reminderDays)
        : undefined,
  };
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-11-25" -> "25 nov 2026" (el formato que ya mostraba la app). */
export function formatDisplayDate(dueDate: string): string {
  if (!isValidISODate(dueDate)) return dueDate;

  const [year, month, day] = dueDate.split("-");
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
}

/** "25 nov 2026" / "25 nov. 2026" -> "2026-11-25". Devuelve undefined si no se entiende. */
export function parseDisplayDate(text: string): string | undefined {
  const parts = text.replace(/\./g, "").trim().split(/\s+/);
  if (parts.length !== 3) return undefined;

  const month = MONTHS.indexOf(parts[1].toLowerCase());
  if (month === -1) return undefined;

  const iso = `${parts[2]}-${String(month + 1).padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  return isValidISODate(iso) ? iso : undefined;
}
