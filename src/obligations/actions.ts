/**
 * Acciones persistentes sobre una obligación. E4PA-88.
 *
 * El detalle y las pruebas llaman a las MISMAS funciones: las comprobaciones
 * no simulan una implementación distinta de la que utiliza la interfaz.
 */
import { isValidISODate, type Obligation } from "./model";
import { loadObligations, updateObligation, type KeyValueStorage } from "./storage";

export type PostponePeriod = 1 | 3 | 7 | "month";
export type ActionError = "not_found" | "already_finished" | "invalid_period" | "storage_failed";
export type ActionResult =
  | { ok: true; obligation: Obligation; obligations: Obligation[] }
  | { ok: false; error: ActionError };

export const POSTPONE_PERIODS: ReadonlyArray<{ value: PostponePeriod; label: string }> = [
  { value: 1, label: "Posponer 1 día" },
  { value: 3, label: "Posponer 3 días" },
  { value: 7, label: "Posponer 1 semana" },
  { value: "month", label: "Posponer 1 mes" },
];

/** Suma días de calendario en UTC para evitar saltos por horario de verano. */
function addCalendarDays(dateISO: string, days: number): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Un mes de calendario, ajustando días inexistentes (31 ene → 28/29 feb). */
function addCalendarMonth(dateISO: string): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const firstNextMonth = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(
    Date.UTC(firstNextMonth.getUTCFullYear(), firstNextMonth.getUTCMonth() + 1, 0)
  ).getUTCDate();
  firstNextMonth.setUTCDate(Math.min(day, lastDay));
  return firstNextMonth.toISOString().slice(0, 10);
}

export function getPostponedDate(today: string, period: PostponePeriod): string {
  if (!isValidISODate(today)) throw new Error("Fecha de referencia inválida");
  if (period === "month") return addCalendarMonth(today);
  if (period !== 1 && period !== 3 && period !== 7) {
    throw new Error("Plazo de aplazamiento no permitido");
  }
  return addCalendarDays(today, period);
}

function persistAction(
  id: number,
  transform: (obligation: Obligation) => Obligation,
  storage?: KeyValueStorage
): ActionResult {
  try {
    const obligation = loadObligations(storage).find((item) => item.id === id);
    if (!obligation) return { ok: false, error: "not_found" };
    if (obligation.status === "Completada" || obligation.status === "Cancelada") {
      return { ok: false, error: "already_finished" };
    }

    const updated = updateObligation(transform(obligation), storage);
    if (!updated) return { ok: false, error: "not_found" };
    const saved = updated.find((item) => item.id === id);
    if (!saved) return { ok: false, error: "storage_failed" };
    return { ok: true, obligation: saved, obligations: updated };
  } catch {
    return { ok: false, error: "storage_failed" };
  }
}

/** Marca como resuelta, limpia el aplazamiento y conserva el resto de campos. */
export function resolveObligation(id: number, storage?: KeyValueStorage): ActionResult {
  return persistAction(id, (item) => ({
    ...item,
    status: "Completada",
    reminderSnoozedUntil: undefined,
  }), storage);
}

/**
 * Pospone el PRÓXIMO aviso sin modificar el vencimiento ni la antelación
 * originalmente elegidos. getNextReminderDate utiliza la fecha pospuesta.
 */
export function postponeObligation(
  id: number,
  period: PostponePeriod,
  today: string,
  storage?: KeyValueStorage
): ActionResult {
  let until: string;
  try {
    until = getPostponedDate(today, period);
  } catch {
    return { ok: false, error: "invalid_period" };
  }
  return persistAction(id, (item) => ({
    ...item,
    reminderSnoozedUntil: until,
  }), storage);
}
