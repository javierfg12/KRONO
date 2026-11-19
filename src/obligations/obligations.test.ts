import { beforeEach, describe, expect, it } from "vitest";
import {
  computeNoticeDate,
  formatDisplayDate,
  isValidISODate,
  parseDisplayDate,
  validateObligation,
} from "./model";
import {
  STORAGE_KEY,
  addObligation,
  initialObligations,
  loadObligations,
  saveObligations,
  updateObligation,
  type KeyValueStorage,
} from "./storage";

/** localStorage falso: sobrevive entre "aperturas" de la app dentro de un test. */
function fakeStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

function created(result: ReturnType<typeof addObligation>) {
  if (!result.ok) throw new Error(result.errors.join(" "));
  return result.obligation;
}

describe("fechas", () => {
  it("calcula la fecha del aviso restando los días de antelación", () => {
    expect(computeNoticeDate("2026-12-12", 3)).toBe("2026-12-09");
    expect(computeNoticeDate("2026-12-12", 7)).toBe("2026-12-05");
  });

  it("cruza cambios de mes, de año y años bisiestos", () => {
    expect(computeNoticeDate("2026-12-02", 3)).toBe("2026-11-29");
    expect(computeNoticeDate("2027-01-01", 1)).toBe("2026-12-31");
    expect(computeNoticeDate("2028-03-01", 1)).toBe("2028-02-29");
    expect(computeNoticeDate("2026-03-29", 1)).toBe("2026-03-28"); // cambio de hora
  });

  it("valida fechas ISO reales", () => {
    expect(isValidISODate("2026-02-28")).toBe(true);
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("25/11/2026")).toBe(false);
    expect(isValidISODate(undefined)).toBe(false);
  });

  it("convierte entre texto de pantalla e ISO", () => {
    expect(formatDisplayDate("2026-11-25")).toBe("25 nov 2026");
    expect(parseDisplayDate("25 nov 2026")).toBe("2026-11-25");
    expect(parseDisplayDate("05 dic. 2026")).toBe("2026-12-05");
    expect(parseDisplayDate("pronto")).toBeUndefined();
  });
});

describe("validación", () => {
  const ok = { name: "Gym", dueDate: "2026-12-01" };

  it("acepta una obligación válida, con y sin importe", () => {
    expect(validateObligation(ok)).toEqual([]);
    expect(validateObligation({ ...ok, amount: 0, reminderDays: 3 })).toEqual([]);
  });

  it("rechaza nombre vacío, fecha inválida, importe negativo y antelación inválida", () => {
    expect(validateObligation({ ...ok, name: "   " })).toHaveLength(1);
    expect(validateObligation({ ...ok, dueDate: "mañana" })).toHaveLength(1);
    expect(validateObligation({ ...ok, amount: -1 })).toHaveLength(1);
    expect(validateObligation({ ...ok, amount: NaN })).toHaveLength(1);
    expect(validateObligation({ ...ok, reminderDays: 1.5 })).toHaveLength(1);
    expect(validateObligation({ ...ok, reminderDays: -2 })).toHaveLength(1);
  });
});

describe("persistencia", () => {
  let storage: ReturnType<typeof fakeStorage>;

  beforeEach(() => {
    storage = fakeStorage();
  });

  // Criterio 1
  it("guarda una obligación válida con todos sus campos", () => {
    const saved = created(
      addObligation(
        {
          name: "  Netflix  ",
          description: "Suscripción de pago",
          dueDate: "2026-12-20",
          amount: 12.99,
          category: "Suscripción",
          reminderDays: 3,
        },
        storage
      )
    );

    expect(saved).toMatchObject({
      name: "Netflix",
      description: "Suscripción de pago",
      dueDate: "2026-12-20",
      amount: 12.99,
      category: "Suscripción",
      reminderDays: 3,
      noticeDate: "2026-12-17",
      state: "pendiente",
      status: "En plazo",
    });

    const stored = loadObligations(storage).find((item) => item.id === saved.id);
    expect(stored).toEqual(saved);
  });

  it("el importe es opcional y no se inventa", () => {
    const saved = created(
      addObligation({ name: "DNI", description: "Documento", dueDate: "2027-01-10" }, storage)
    );

    expect(saved.amount).toBeUndefined();
    expect(saved.noticeDate).toBeUndefined();
    expect(loadObligations(storage).find((i) => i.id === saved.id)?.amount).toBeUndefined();
  });

  it("no guarda una obligación inválida", () => {
    const result = addObligation(
      { name: "", description: "Documento", dueDate: "2026-13-40" },
      storage
    );

    expect(result.ok).toBe(false);
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
  });

  // Criterio 2
  it("recupera las obligaciones guardadas al reiniciar la app", () => {
    created(addObligation({ name: "A", description: "Factura", dueDate: "2026-12-01", amount: 10, reminderDays: 1 }, storage));
    created(addObligation({ name: "B", description: "Documento", dueDate: "2026-12-05" }, storage));
    created(addObligation({ name: "C", description: "Suscripción", dueDate: "2026-12-09", amount: 5.5, reminderDays: 7 }, storage));

    // "Reinicio": se descarta todo lo que hubiera en memoria y se vuelve a leer el almacenamiento.
    const afterRestart = loadObligations(storage);
    const names = afterRestart.map((item) => item.name);

    expect(names).toEqual([...initialObligations.map((i) => i.name), "A", "B", "C"]);
    expect(afterRestart.at(-1)).toMatchObject({ name: "C", amount: 5.5, noticeDate: "2026-12-02" });
  });

  it("sin datos guardados muestra los de ejemplo, y con JSON corrupto también", () => {
    expect(loadObligations(storage)).toEqual(initialObligations);

    storage.setItem(STORAGE_KEY, "{no es json");
    expect(loadObligations(storage)).toEqual(initialObligations);

    storage.setItem(STORAGE_KEY, JSON.stringify({ no: "es una lista" }));
    expect(loadObligations(storage)).toEqual(initialObligations);
  });

  // Criterio 3
  it("actualizar el estado no duplica registros", () => {
    created(addObligation({ name: "A", description: "Factura", dueDate: "2026-12-01" }, storage));
    const target = created(
      addObligation({ name: "B", description: "Factura", dueDate: "2026-12-02", reminderDays: 3 }, storage)
    );
    const before = loadObligations(storage);

    updateObligation({ ...target, status: "Completada" }, storage);
    updateObligation({ ...target, status: "Completada" }, storage); // repetido: tampoco duplica

    const after = loadObligations(storage);
    expect(after).toHaveLength(before.length);
    expect(new Set(after.map((i) => i.id)).size).toBe(after.length);

    const updated = after.find((i) => i.id === target.id);
    expect(updated).toMatchObject({ status: "Completada", state: "resuelta", noticeDate: "2026-11-29" });
    // El resto no cambia.
    expect(after.filter((i) => i.id !== target.id)).toEqual(before.filter((i) => i.id !== target.id));
  });

  it("actualizar un id que no existe no crea nada", () => {
    created(addObligation({ name: "A", description: "Factura", dueDate: "2026-12-01" }, storage));
    const before = loadObligations(storage);

    const ghost = { ...before[0], id: 9999 };
    expect(updateObligation(ghost, storage)).toBeUndefined();
    expect(loadObligations(storage)).toEqual(before);
  });

  it("los ids nuevos nunca se repiten", () => {
    const ids = Array.from({ length: 10 }, (_, n) =>
      created(addObligation({ name: `O${n}`, description: "Factura", dueDate: "2026-12-01" }, storage)).id
    );

    expect(new Set(ids).size).toBe(10);
  });

  it("si el almacenamiento trae ids repetidos, se queda con uno solo", () => {
    const [first] = initialObligations;
    storage.setItem(STORAGE_KEY, JSON.stringify([first, { ...first, name: "Repetida" }]));

    const loaded = loadObligations(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("Repetida");
  });

  it("cambiar la antelación recalcula la fecha del aviso al guardar", () => {
    const saved = created(
      addObligation({ name: "A", description: "Factura", dueDate: "2026-12-10", reminderDays: 3 }, storage)
    );

    updateObligation({ ...saved, reminderDays: 7 }, storage);

    expect(loadObligations(storage).find((i) => i.id === saved.id)?.noticeDate).toBe("2026-12-03");
  });

  it("migra el formato antiguo (fecha como texto) sin perder datos", () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: 1700000000000,
          name: "Gym",
          description: "Suscripción de pago",
          date: "05 dic 2026",
          amount: 30,
          status: "En plazo",
          category: "Suscripción",
          reminderDays: 3,
        },
        { id: 2, name: "Rota", description: "x", date: "sin fecha", status: "En plazo" },
      ])
    );

    const loaded = loadObligations(storage);
    expect(loaded).toHaveLength(1); // la irrecuperable se descarta
    expect(loaded[0]).toMatchObject({
      id: 1700000000000,
      dueDate: "2026-12-05",
      noticeDate: "2026-12-02",
      amount: 30,
      state: "pendiente",
    });
  });

  it("saveObligations normaliza y evita duplicados", () => {
    const [first] = initialObligations;
    const result = saveObligations([first, { ...first, status: "Completada" }], storage);

    expect(result).toHaveLength(1);
    expect(result[0].state).toBe("resuelta");
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!)).toHaveLength(1);
  });
});
