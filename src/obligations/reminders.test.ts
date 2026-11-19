import { describe, expect, it } from "vitest";
import { daysBetween, getDisplayStatus, normalizeObligation, type Obligation } from "./model";
import {
  describeReminderDistance,
  getDueReminders,
  getNextReminderDate,
  planReminder,
} from "./reminders";

const TODAY = "2026-11-19";

function make(partial: Partial<Obligation> & Pick<Obligation, "dueDate">): Obligation {
  return normalizeObligation({
    id: 1,
    name: "X",
    description: "Factura",
    status: "En plazo",
    ...partial,
  });
}

describe("planReminder", () => {
  it("resta los días de antelación a la fecha límite", () => {
    expect(planReminder("2026-12-20", 1, TODAY).noticeDate).toBe("2026-12-19");
    expect(planReminder("2026-12-20", 3, TODAY).noticeDate).toBe("2026-12-17");
    expect(planReminder("2026-12-20", 7, TODAY).noticeDate).toBe("2026-12-13");
  });

  it("casos límite: cambio de mes, de año y bisiesto", () => {
    expect(planReminder("2027-01-02", 3, TODAY).noticeDate).toBe("2026-12-30");
    expect(planReminder("2028-03-02", 7, "2028-01-01").noticeDate).toBe("2028-02-24");
    expect(planReminder("2027-03-02", 7, "2027-01-01").noticeDate).toBe("2027-02-23");
  });

  it("un aviso en el futuro se programa tal cual", () => {
    const plan = planReminder("2026-12-20", 3, TODAY);
    expect(plan).toEqual({ noticeDate: "2026-12-17", isInPast: false, effectiveDate: "2026-12-17" });
  });

  it("un aviso que cae hoy no está en el pasado", () => {
    const plan = planReminder("2026-11-22", 3, TODAY);
    expect(plan).toEqual({ noticeDate: TODAY, isInPast: false, effectiveDate: TODAY });
  });

  it("un aviso anterior a hoy se detecta y se adelanta a hoy", () => {
    const plan = planReminder("2026-11-21", 7, TODAY);
    expect(plan.noticeDate).toBe("2026-11-14");
    expect(plan.isInPast).toBe(true);
    expect(plan.effectiveDate).toBe(TODAY);
  });

  it("antelación 0 avisa el mismo día del vencimiento", () => {
    expect(planReminder("2026-12-01", 0, TODAY).noticeDate).toBe("2026-12-01");
  });

  it("al cambiar la fecha límite o la antelación el resultado se actualiza", () => {
    expect(planReminder("2026-12-20", 3, TODAY).noticeDate).toBe("2026-12-17");
    expect(planReminder("2026-12-25", 3, TODAY).noticeDate).toBe("2026-12-22");
    expect(planReminder("2026-12-25", 7, TODAY).noticeDate).toBe("2026-12-18");
  });
});

describe("simulación del disparo", () => {
  it("avisa cuando llega la fecha y no antes", () => {
    const item = make({ dueDate: "2026-11-24", reminderDays: 5 }); // aviso: hoy
    expect(getDueReminders([item], TODAY)).toHaveLength(1);
    expect(getDueReminders([item], "2026-11-18")).toHaveLength(0);
  });

  it("sigue avisando mientras no se resuelva, aunque el aviso ya haya pasado", () => {
    const item = make({ dueDate: "2026-11-21", reminderDays: 7 });
    expect(getDueReminders([item], TODAY)).toHaveLength(1);
  });

  it("no avisa de lo resuelto, cancelado o sin antelación", () => {
    const list = [
      make({ id: 1, dueDate: "2026-11-20", reminderDays: 3, status: "Completada" }),
      make({ id: 2, dueDate: "2026-11-20", reminderDays: 3, status: "Cancelada" }),
      make({ id: 3, dueDate: "2026-11-20" }),
    ];
    expect(getDueReminders(list, TODAY)).toEqual([]);
  });

  it("un aviso pospuesto no salta hasta la fecha a la que se pospuso", () => {
    const item = make({ dueDate: "2026-11-21", reminderDays: 3, reminderSnoozedUntil: "2026-11-21" });

    expect(getNextReminderDate(item, TODAY)).toBe("2026-11-21");
    expect(getDueReminders([item], TODAY)).toHaveLength(0);
    expect(getDueReminders([item], "2026-11-21")).toHaveLength(1);
  });

  it("ordena los avisos por fecha límite", () => {
    const late = make({ id: 1, dueDate: "2026-12-01", reminderDays: 30 });
    const soon = make({ id: 2, dueDate: "2026-11-20", reminderDays: 3 });
    expect(getDueReminders([late, soon], TODAY).map((i) => i.id)).toEqual([2, 1]);
  });

  it("describe la distancia en lenguaje sencillo", () => {
    expect(describeReminderDistance(TODAY, TODAY)).toBe("hoy");
    expect(describeReminderDistance("2026-11-20", TODAY)).toBe("mañana");
    expect(describeReminderDistance("2026-11-25", TODAY)).toBe("en 6 días");
  });
});

describe("estado que se enseña", () => {
  it("calcula Vencida, Próxima y En plazo según la fecha límite", () => {
    expect(getDisplayStatus({ status: "En plazo", dueDate: "2026-11-18" }, TODAY)).toBe("Vencida");
    expect(getDisplayStatus({ status: "En plazo", dueDate: TODAY }, TODAY)).toBe("Próxima");
    expect(getDisplayStatus({ status: "En plazo", dueDate: "2026-11-26" }, TODAY)).toBe("Próxima");
    expect(getDisplayStatus({ status: "En plazo", dueDate: "2026-11-27" }, TODAY)).toBe("En plazo");
  });

  it("respeta Completada y Cancelada aunque la fecha haya pasado", () => {
    expect(getDisplayStatus({ status: "Completada", dueDate: "2020-01-01" }, TODAY)).toBe("Completada");
    expect(getDisplayStatus({ status: "Cancelada", dueDate: "2020-01-01" }, TODAY)).toBe("Cancelada");
  });

  it("daysBetween cuenta días reales, también con cambio de hora", () => {
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-11-20", "2026-11-19")).toBe(-1);
  });
});
