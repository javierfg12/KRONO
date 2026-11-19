// Cálculo y programación lógica de recordatorios (E4PA-86).
// No envía notificaciones reales: calcula cuándo toca avisar y permite
// simular el disparo (qué avisos están activos hoy).

import {
  computeNoticeDate,
  daysBetween,
  type Obligation,
} from "./model";

export type ReminderPlan = {
  /** Fecha exacta del aviso: fecha límite menos días de antelación. */
  noticeDate: string;
  /** true si esa fecha ya ha pasado respecto a hoy. */
  isInPast: boolean;
  /** Fecha en la que de verdad se avisará: nunca antes de hoy. */
  effectiveDate: string;
};

export function planReminder(dueDate: string, reminderDays: number, today: string): ReminderPlan {
  const noticeDate = computeNoticeDate(dueDate, reminderDays);
  const isInPast = noticeDate < today;

  return { noticeDate, isInPast, effectiveDate: isInPast ? today : noticeDate };
}

function isPending(obligation: Obligation): boolean {
  return obligation.status !== "Completada" && obligation.status !== "Cancelada";
}

/**
 * Fecha en la que le toca avisar a una obligación, o undefined si no hay aviso
 * (sin antelación configurada, o ya resuelta/cancelada).
 * Un aviso pospuesto no salta antes de la fecha a la que se pospuso.
 */
export function getNextReminderDate(obligation: Obligation, today: string): string | undefined {
  if (!isPending(obligation) || obligation.reminderDays === undefined) return undefined;

  const { effectiveDate } = planReminder(obligation.dueDate, obligation.reminderDays, today);

  return obligation.reminderSnoozedUntil && obligation.reminderSnoozedUntil > effectiveDate
    ? obligation.reminderSnoozedUntil
    : effectiveDate;
}

/** Simula el disparo: avisos que tocan hoy o que ya tocaban y siguen sin resolverse. */
export function getDueReminders(list: Obligation[], today: string): Obligation[] {
  return list
    .filter((item) => {
      const next = getNextReminderDate(item, today);
      return next !== undefined && next <= today;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Texto corto para la pantalla: "hoy", "mañana" o "en N días". */
export function describeReminderDistance(date: string, today: string): string {
  const days = daysBetween(today, date);

  if (days <= 0) return "hoy";
  if (days === 1) return "mañana";
  return `en ${days} días`;
}
