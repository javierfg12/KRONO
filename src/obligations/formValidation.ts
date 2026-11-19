// Validación del formulario de alta (E4PA-85).
// Devuelve un mensaje por campo para poder mostrarlo junto a ese campo.

import { isValidISODate } from "./model";

export type AddFormValues = {
  name: string;
  /** Texto tal cual lo escribe el usuario; vacío si no hay importe. */
  amount: string;
  /** Fecha ISO yyyy-mm-dd, o vacío. */
  date: string;
};

export type AddFormField = "name" | "amount" | "date";
export type AddFormErrors = Partial<Record<AddFormField, string>>;

export const FIELD_ORDER: AddFormField[] = ["name", "amount", "date"];

/** Fecha de hoy en formato ISO usando la zona horaria del usuario (no UTC). */
export function todayISO(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function validateAddForm(values: AddFormValues, today = todayISO()): AddFormErrors {
  const errors: AddFormErrors = {};

  if (!values.name.trim()) {
    errors.name = "Introduce un nombre para la obligación.";
  }

  const amountText = values.amount.trim().replace(",", ".");
  if (amountText !== "") {
    const amount = Number(amountText);

    if (!Number.isFinite(amount) || amount < 0) {
      errors.amount = "El importe debe ser un número igual o mayor que 0.";
    }
  }

  if (!values.date) {
    errors.date = "Indica la fecha de vencimiento.";
  } else if (!isValidISODate(values.date)) {
    errors.date = "La fecha no tiene un formato válido.";
  } else if (values.date < today) {
    errors.date = "La fecha no puede ser anterior a hoy.";
  }

  return errors;
}

/** Categoría que se propone según el tipo elegido en el paso anterior. */
export function defaultCategoryForType(type: string): string {
  switch (type) {
    case "Suscripción de pago":
      return "Suscripción";
    case "Factura / Suministro":
      return "Factura";
    case "Documento oficial":
      return "Documento";
    default:
      return "";
  }
}
