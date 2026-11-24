/**
 * Integración entre formulario, modelo, almacenamiento, recordatorios y
 * acciones persistentes. E4PA-89.
 *
 * No es una prueba de interfaz en navegador ni una validación con usuarios.
 */
import { describe, expect, it } from "vitest";
import { validateAddForm } from "./formValidation";
import { getDueReminders, getNextReminderDate, planReminder } from "./reminders";
import { addObligation, loadObligations, saveObligations, type KeyValueStorage } from "./storage";
import { postponeObligation, resolveObligation } from "./actions";

function storageFixture(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}
const TODAY = "2026-11-24";

describe("E4PA-89: integración del ciclo de vida", () => {
  it("alta válida → aviso calculado → listado/detalle → posponer → persistencia → resolver", () => {
    const storage = storageFixture();
    saveObligations([], storage); // espacio limpio, sin las tarjetas de ejemplo
    const form = { name: "Netflix", amount: "12,99", date: "2026-11-28" };
    expect(validateAddForm(form, TODAY)).toEqual([]);
    const result = addObligation({
      name: form.name, amount: Number(form.amount.replace(",", ".")),
      description: "Suscripción de pago", category: "Suscripción",
      dueDate: form.date, reminderDays: 3,
    }, storage);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const id = result.obligation.id;
    const firstVisit = loadObligations(storage);
    expect(firstVisit).toHaveLength(1);
    expect(firstVisit[0]).toMatchObject({
      name: "Netflix", amount: 12.99, dueDate: "2026-11-28",
      reminderDays: 3, noticeDate: "2026-11-25", state: "pendiente",
    });
    expect(planReminder(form.date, 3, TODAY).noticeDate).toBe("2026-11-25");
    expect(getNextReminderDate(firstVisit[0], TODAY)).toBe("2026-11-25");

    const postponed = postponeObligation(id, 7, TODAY, storage);
    expect(postponed.ok).toBe(true);
    const secondVisit = loadObligations(storage);
    expect(secondVisit[0].reminderSnoozedUntil).toBe("2026-12-01");
    expect(getDueReminders(secondVisit, "2026-11-25")).toEqual([]);
    expect(getDueReminders(secondVisit, "2026-12-01")).toHaveLength(1);

    const completed = resolveObligation(id, storage);
    expect(completed.ok).toBe(true);
    const thirdVisit = loadObligations(storage);
    expect(thirdVisit[0]).toMatchObject({ id, status: "Completada", state: "resuelta" });
    expect(thirdVisit[0].reminderSnoozedUntil).toBeUndefined();
    expect(getDueReminders(thirdVisit, "2026-12-01")).toEqual([]);
    expect(thirdVisit.filter(item => item.status !== "Completada")).toEqual([]);
  });

  it("campos inválidos y fecha pasada no generan nuevas obligaciones", () => {
    const storage = storageFixture();
    saveObligations([], storage);
    const form = { name: " ", amount: "-3", date: "2026-11-23" };
    const errors = validateAddForm(form, TODAY);
    expect(errors.name).toBeTruthy();
    expect(errors.amount).toBeTruthy();
    expect(errors.date).toBeTruthy();
    expect(loadObligations(storage)).toHaveLength(0);
  });

  it("cambio de antelación cambia la fecha lógica, sin programar push real", () => {
    expect(planReminder("2027-01-02", 1, TODAY).noticeDate).toBe("2027-01-01");
    expect(planReminder("2027-01-02", 7, TODAY).noticeDate).toBe("2026-12-26");
  });
});
