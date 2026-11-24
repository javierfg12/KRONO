import { describe, expect, it } from "vitest";
import { getDueReminders, getNextReminderDate } from "./reminders";
import { addObligation, loadObligations, saveObligations, type KeyValueStorage } from "./storage";
import { getPostponedDate, postponeObligation, resolveObligation } from "./actions";

function createStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
  };
}
function setup() {
  const storage = createStorage();
  saveObligations([], storage);
  const item = addObligation({
    name: "Netflix", description: "Suscripción de pago",
    dueDate: "2026-11-25", reminderDays: 3, amount: 12.99,
  }, storage);
  if (!item.ok) throw new Error("No se pudo crear la obligación del test");
  return { storage, id: item.obligation.id };
}
const TODAY = "2026-11-24";

describe("E4PA-88: resolver, posponer y persistir", () => {
  it("resolver cambia el estado y la lista de pendientes, sin duplicar registros", () => {
    const { storage, id } = setup();
    const before = loadObligations(storage);
    const result = resolveObligation(id, storage);
    expect(result.ok).toBe(true);
    const after = loadObligations(storage); // nueva lectura = otra apertura
    expect(after).toHaveLength(before.length);
    expect(after[0]).toMatchObject({ id, status: "Completada", state: "resuelta" });
    expect(new Set(after.map(x => x.id)).size).toBe(after.length);
    expect(after.filter(x => x.status !== "Completada" && x.status !== "Cancelada")).toEqual([]);
    expect(getDueReminders(after, TODAY)).toEqual([]);
  });

  it("posponer un día guarda el nuevo aviso y lo oculta hasta la fecha elegida", () => {
    const { storage, id } = setup();
    const result = postponeObligation(id, 1, TODAY, storage);
    expect(result.ok).toBe(true);
    const after = loadObligations(storage);
    const saved = after[0];
    expect(saved.reminderSnoozedUntil).toBe("2026-11-25");
    expect(saved.dueDate).toBe("2026-11-25");
    expect(saved.noticeDate).toBe("2026-11-22"); // fecha original del plan
    expect(getNextReminderDate(saved, TODAY)).toBe("2026-11-25");
    expect(getDueReminders(after, TODAY)).toHaveLength(0);
    expect(getDueReminders(after, "2026-11-25")).toHaveLength(1);
  });

  it("los cuatro plazos de Figma (1, 3, 7 días y un mes) dan fechas correctas", () => {
    expect(getPostponedDate(TODAY, 1)).toBe("2026-11-25");
    expect(getPostponedDate(TODAY, 3)).toBe("2026-11-27");
    expect(getPostponedDate(TODAY, 7)).toBe("2026-12-01");
    expect(getPostponedDate(TODAY, "month")).toBe("2026-12-24");
  });

  it("el mes de calendario respeta el fin de mes y los años bisiestos", () => {
    expect(getPostponedDate("2027-01-31", "month")).toBe("2027-02-28");
    expect(getPostponedDate("2028-01-31", "month")).toBe("2028-02-29");
    expect(getPostponedDate("2026-12-31", "month")).toBe("2027-01-31");
  });

  it("persisten todos los plazos y no crean registros nuevos", () => {
    for (const period of [3, 7, "month"] as const) {
      const { storage, id } = setup();
      const result = postponeObligation(id, period, TODAY, storage);
      expect(result.ok).toBe(true);
      expect(loadObligations(storage)).toHaveLength(1);
      expect(loadObligations(storage)[0].reminderSnoozedUntil).toBe(getPostponedDate(TODAY, period));
    }
  });

  it("prohíbe resolver o posponer una obligación ya resuelta", () => {
    const { storage, id } = setup();
    expect(resolveObligation(id, storage).ok).toBe(true);
    expect(resolveObligation(id, storage)).toEqual({ ok: false, error: "already_finished" });
    expect(postponeObligation(id, 3, TODAY, storage)).toEqual({ ok: false, error: "already_finished" });
    expect(loadObligations(storage)[0].reminderSnoozedUntil).toBeUndefined();
  });

  it("rechaza identificadores y plazos no válidos sin mutar la persistencia", () => {
    const { storage, id } = setup();
    const before = loadObligations(storage);
    expect(resolveObligation(9999, storage)).toEqual({ ok: false, error: "not_found" });
    expect(postponeObligation(id, 2 as 1, TODAY, storage)).toEqual({ ok: false, error: "invalid_period" });
    expect(postponeObligation(id, 1, "fecha mala", storage)).toEqual({ ok: false, error: "invalid_period" });
    expect(loadObligations(storage)).toEqual(before);
  });
});
