import { describe, expect, it } from "vitest";
import { defaultCategoryForType, todayISO, validateAddForm } from "./formValidation";

const TODAY = "2026-11-19";
const valid = { name: "Netflix", amount: "12.99", date: "2026-12-01" };

describe("validateAddForm", () => {
  it("no da errores con datos válidos, con y sin importe", () => {
    expect(validateAddForm(valid, TODAY)).toEqual({});
    expect(validateAddForm({ ...valid, amount: "" }, TODAY)).toEqual({});
    expect(validateAddForm({ ...valid, amount: "0" }, TODAY)).toEqual({});
    expect(validateAddForm({ ...valid, amount: "12,99" }, TODAY)).toEqual({});
  });

  it("exige nombre y fecha (campos obligatorios) y los señala por separado", () => {
    const errors = validateAddForm({ name: "   ", amount: "", date: "" }, TODAY);

    expect(Object.keys(errors).sort()).toEqual(["date", "name"]);
    expect(errors.amount).toBeUndefined();
  });

  it("acepta hoy pero rechaza una fecha pasada", () => {
    expect(validateAddForm({ ...valid, date: TODAY }, TODAY)).toEqual({});
    expect(validateAddForm({ ...valid, date: "2026-11-18" }, TODAY).date).toMatch(/anterior a hoy/);
  });

  it("rechaza formatos de fecha inválidos", () => {
    for (const date of ["19/11/2026", "2026-13-01", "2026-02-30", "mañana", "20266-01-01"]) {
      expect(validateAddForm({ ...valid, date }, TODAY).date).toMatch(/formato/);
    }
  });

  it("rechaza importes negativos o que no son números", () => {
    expect(validateAddForm({ ...valid, amount: "-5" }, TODAY).amount).toBeDefined();
    expect(validateAddForm({ ...valid, amount: "abc" }, TODAY).amount).toBeDefined();
  });
});

describe("utilidades", () => {
  it("todayISO usa la fecha local, no la UTC", () => {
    expect(todayISO(new Date(2026, 10, 19, 0, 30))).toBe("2026-11-19");
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("propone una categoría según el tipo elegido", () => {
    expect(defaultCategoryForType("Suscripción de pago")).toBe("Suscripción");
    expect(defaultCategoryForType("Factura / Suministro")).toBe("Factura");
    expect(defaultCategoryForType("Documento oficial")).toBe("Documento");
    expect(defaultCategoryForType("otro")).toBe("");
  });
});
