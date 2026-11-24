
import {
  NavLink,
  Navigate,
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Home,
  ClipboardList,
  Plus,
  Bell,
  UserRound,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import "./App.css";
import React, { useState } from "react";
import {
  POSTPONE_PERIODS,
  postponeObligation,
  resolveObligation,
  type PostponePeriod,
} from "./obligations/actions";
import {
  addObligation,
  loadObligations,
  updateObligation as persistObligation,
} from "./obligations/storage";
import {
  formatDisplayDate,
  getDisplayStatus,
  type Obligation,
} from "./obligations/model";
import {
  describeReminderDistance,
  getNextReminderDate,
  planReminder,
} from "./obligations/reminders";
import {
  FIELD_ORDER,
  defaultCategoryForType,
  todayISO,
  validateAddForm,
  type AddFormErrors,
  type AddFormField,
} from "./obligations/formValidation";

function formatAmount(amount: number) {
  return amount.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

function getLocalDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatISODate(date: string) {
  if (!date) return "";

  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function isSubscription(obligation: Obligation) {
  const description = obligation.description.toLowerCase();
  const category = (obligation.category || "").toLowerCase();

  return (
    description.includes("suscrip") ||
    category.includes("suscrip")
  );
}

function getStatusClass(status: Obligation["status"]) {
  if (status === "Completada") return "status-completed";
  if (status === "Cancelada") return "status-cancelled";
  if (status === "Vencida") return "status-overdue";
  if (status === "En plazo") return "status-ok";

  return "status-upcoming";
}

function Navigation() {
  const items = [
    { to: "/", label: "Inicio", icon: Home, end: true },
    { to: "/obligaciones", label: "Obligaciones", icon: ClipboardList },
    { to: "/anadir", label: "Añadir", icon: Plus },
    { to: "/alertas", label: "Alertas", icon: Bell },
    { to: "/perfil", label: "Perfil", icon: UserRound },
  ];

  return (
    <nav className="bottom-navigation">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `nav-item ${isActive ? "nav-item-active" : ""}`
          }
        >
          <Icon size={21} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function ScreenHeader({
  title,
  subtitle,
  back = false,
}: {
  title: string;
  subtitle: string;
  back?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <header className="screen-header">
      {back && (
        <button
          className="back-button"
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <div className="brand-mark" />
      <h1>{title}</h1>
      <div className="header-divider" />
      <p>{subtitle}</p>
    </header>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const obligations = loadObligations();
  const today = todayISO();

  const activeObligations = obligations.filter(
    (item) =>
      item.status !== "Completada" &&
      item.status !== "Cancelada"
  );

  // Las más urgentes primero (las vencidas salen arriba).
  const upcoming = [...activeObligations]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);

  const nextCount = upcoming.filter(
    (item) => getDisplayStatus(item, today) === "Próxima"
  ).length;

  const total = activeObligations.reduce(
    (sum, item) => sum + (item.amount ?? 0),
    0
  );

  return (
    <main className="screen home-screen">
      <ScreenHeader
        title="Tus próximos vencimientos"
        subtitle="Todo lo importante, de un vistazo."
      />

      <section className="upcoming-section">
        <div className="section-heading">
          <h2>Próximos vencimientos</h2>
          <span className="count-chip">
            {nextCount} PRÓXIMAS
          </span>
        </div>

        <div className="obligation-preview-list">
          {upcoming.length > 0 ? (
            upcoming.map((item) => (
              <button
                className="obligation-preview"
                key={item.id}
                onClick={() => navigate(`/obligaciones/${item.id}`)}
              >
                <span className="obligation-info">
                  <strong>{item.name}</strong>
                  <small>
                    {item.amount !== undefined
                      ? `${formatAmount(item.amount)} · `
                      : `${item.description} · `}
                    Vence el {formatDisplayDate(item.dueDate)}
                  </small>
                </span>
                <span
                  className={`status-chip ${getStatusClass(
                    getDisplayStatus(item, today)
                  )}`}
                >
                  {getDisplayStatus(item, today)}
                </span>
              </button>
            ))
          ) : (
            <div className="empty-preview">
              No tienes próximos vencimientos.
            </div>
          )}
        </div>

        <button
          className="outline-button"
          onClick={() => navigate("/obligaciones")}
        >
          Ver todas las obligaciones
        </button>
      </section>

      <section className="economy-summary">
        <span className="economy-label">RESUMEN ECONÓMICO</span>
        <strong>{formatAmount(total)}</strong>
        <button onClick={() => navigate("/resumen")}>
          Ver resumen <span>→</span>
        </button>
      </section>
    </main>
  );
}


function ObligationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const actionNotice = (location.state as { actionNotice?: string } | null)?.actionNotice;

  const [filter, setFilter] = useState<
    "Todas" | "Pendientes" | "Completadas" | "Canceladas"
  >("Todas");

  const obligations = loadObligations();
  const today = todayISO();

  const filteredObligations = obligations.filter((item) => {
    if (filter === "Completadas") {
      return item.status === "Completada";
    }

    if (filter === "Canceladas") {
      return item.status === "Cancelada";
    }

    if (filter === "Pendientes") {
      return (
        item.status !== "Completada" &&
        item.status !== "Cancelada"
      );
    }

    return true;
  });

  function getShortDate(date: string) {
    const parts = date.split(" ");

    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1].replace(".", "")}`;
    }

    return date;
  }

  return (
    <main className="screen obligations-screen">
      <div className="brand-mark" />

      <h1 className="obligations-title">Mis obligaciones</h1>
      <div className="header-divider" />

      <p className="obligations-subtitle">
        Consulta y organiza todo lo que tienes pendiente.
      </p>

      {actionNotice && (
        <p className="detail-action-message" role="status">{actionNotice}</p>
      )}

      <div className="obligation-filters">
        {(
          ["Todas", "Pendientes", "Completadas", "Canceladas"] as const
        ).map((item) => (
          <button
            key={item}
            className={`filter-chip ${
              filter === item ? "filter-chip-active" : ""
            }`}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <section className="obligations-list">
        {filteredObligations.length > 0 ? (
          filteredObligations.map((item) => (
            <button
              type="button"
              className="obligation-list-card"
              key={item.id}
              onClick={() => navigate(`/obligaciones/${item.id}`)}
            >
              <span className="obligation-list-info">
                <strong>{item.name}</strong>

                <small>
                  {item.amount !== undefined
                    ? `${item.description} · ${formatAmount(item.amount)} · ${getShortDate(formatDisplayDate(item.dueDate))}`
                    : `${item.description} · ${getShortDate(formatDisplayDate(item.dueDate))}`}
                </small>
              </span>

              <span
                className={`status-chip ${getStatusClass(
                  getDisplayStatus(item, today)
                )}`}
              >
                {getDisplayStatus(item, today)}
              </span>
            </button>
          ))
        ) : (
          <div className="obligations-empty">
            {filter === "Completadas"
              ? "Todavía no has completado ninguna obligación."
              : filter === "Canceladas"
              ? "No tienes servicios cancelados."
              : filter === "Pendientes"
              ? "No tienes obligaciones pendientes."
              : "Todavía no tienes obligaciones registradas."}
          </div>
        )}
      </section>
    </main>
  );
}


function ObligationDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const today = todayISO();
  const { id } = useParams();

  const [obligations, setObligations] = useState<Obligation[]>(() =>
    loadObligations()
  );

  const [showPostponeOptions, setShowPostponeOptions] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const obligation = obligations.find(
    (item) => item.id === Number(id)
  );

  function updateObligation(updatedObligation: Obligation) {
    const updated = persistObligation(updatedObligation);

    if (updated) setObligations(updated);
  }

  // Vuelve a la pantalla de la que venía (inicio, lista o alertas).
  // Si se abrió el detalle directamente, no hay historial: va al inicio.
  function goBack() {
    if (location.key === "default") {
      navigate("/");
      return;
    }

    navigate(-1);
  }

  function markAsCompleted() {
    if (!obligation) return;
    const result = resolveObligation(obligation.id);
    if (!result.ok) {
      setActionMessage("No se pudo actualizar la obligación. Inténtalo de nuevo.");
      return;
    }
    setObligations(result.obligations);
    navigate("/obligaciones", {
      state: { actionNotice: "Obligación marcada como resuelta." },
    });
  }

  function postponeReminder(period: PostponePeriod) {
    if (!obligation) return;
    const result = postponeObligation(obligation.id, period, today);
    if (!result.ok) {
      setActionMessage("No se pudo posponer el aviso. Inténtalo de nuevo.");
      return;
    }
    setObligations(result.obligations);
    setShowPostponeOptions(false);
    setActionMessage(
      `Aviso pospuesto hasta el ${formatISODate(result.obligation.reminderSnoozedUntil ?? "")}.`
    );
  }

  function cancelSubscription() {
    if (!obligation || !isSubscription(obligation)) return;

    const confirmed = window.confirm(
      `¿Seguro que quieres dar de baja ${obligation.name}? Esta acción marcará el servicio como cancelado.`
    );

    if (!confirmed) return;

    updateObligation({
      ...obligation,
      status: "Cancelada",
      cancelledAt: getLocalDateISO(),
      reminderSnoozedUntil: undefined,
    });

    navigate("/obligaciones");
  }

  if (!obligation) {
    return (
      <main className="screen">
        <ScreenHeader
          title="Obligación no encontrada"
          subtitle="No hemos podido localizar esta obligación."
          back
        />

        <button
          className="primary-button"
          onClick={() => navigate("/obligaciones")}
        >
          Volver a mis obligaciones
        </button>
      </main>
    );
  }

  const isActive =
    obligation.status !== "Completada" &&
    obligation.status !== "Cancelada";

  const subscription = isSubscription(obligation);

  return (
    <main className="screen detail-screen">
      <div className="brand-mark" />

      <div className="detail-heading">
        <button
          className="detail-back"
          onClick={goBack}
          aria-label="Volver"
        >
          <ArrowLeft size={21} />
        </button>

        <h1>Detalle de la obligación</h1>
      </div>

      <div className="header-divider" />

      <p className="detail-subtitle">
        Consulta los datos y gestiona esta obligación.
      </p>

      <section className="detail-main-card">
        <div>
          <strong>{obligation.name}</strong>
          <span>{obligation.description}</span>
        </div>

        <span
          className={`status-chip ${getStatusClass(
            getDisplayStatus(obligation, today)
          )}`}
        >
          {getDisplayStatus(obligation, today)}
        </span>
      </section>

      <section className="detail-data">
        <div className="detail-data-row">
          <span>
            {subscription ? "Próximo cobro" : "Próximo vencimiento"}
          </span>
          <strong>{formatISODate(obligation.dueDate)}</strong>
        </div>

        <div className="detail-data-row">
          <span>Importe</span>
          <strong>
            {obligation.amount !== undefined
              ? formatAmount(obligation.amount)
              : "No especificado"}
          </strong>
        </div>

        <div className="detail-data-row">
          <span>Fecha de aviso</span>
          <strong>
            {obligation.noticeDate
              ? formatISODate(obligation.noticeDate)
              : "No configurada"}
          </strong>
        </div>

        <div className="detail-data-row">
          <span>Alerta configurada</span>
          <strong>
            {obligation.reminderDays !== undefined
              ? `${obligation.reminderDays} días antes`
              : "No configurada"}
          </strong>
        </div>

        <div className="detail-data-row">
          <span>Categoría</span>
          <strong>{obligation.category || obligation.description}</strong>
        </div>

        {obligation.reminderSnoozedUntil && isActive && (
          <div className="detail-data-row">
            <span>Aviso pospuesto hasta</span>
            <strong>
              {formatISODate(obligation.reminderSnoozedUntil)}
            </strong>
          </div>
        )}

        {obligation.status === "Cancelada" && obligation.cancelledAt && (
          <div className="detail-data-row">
            <span>Fecha de baja</span>
            <strong>{formatISODate(obligation.cancelledAt)}</strong>
          </div>
        )}
      </section>

      {isActive && (
        <div className="detail-actions">
          <button
            className="primary-button detail-complete"
            onClick={markAsCompleted}
          >
            Marcar como resuelta
          </button>

          <button
            className="outline-button detail-action"
            onClick={() =>
              setShowPostponeOptions(!showPostponeOptions)
            }
          >
            Posponer aviso
          </button>

          {showPostponeOptions && (
            <section className="detail-postpone-options">
              <p>¿Cuándo quieres recibir el aviso?</p>

              {POSTPONE_PERIODS.map((period) => (
                <button
                  className="outline-button detail-action"
                  key={period.value}
                  onClick={() => postponeReminder(period.value)}
                >
                  {period.label}
                </button>
              ))}
            </section>
          )}

          {subscription && (
            <button
              className="outline-button detail-action detail-cancel"
              onClick={cancelSubscription}
            >
              Dar de baja servicio
            </button>
          )}
        </div>
      )}

      {actionMessage && (
        <p className="detail-action-message" role="status">
          {actionMessage}
        </p>
      )}

      {obligation.status === "Completada" && (
        <p className="detail-completed-message">
          Esta obligación ya está completada.
        </p>
      )}

      {obligation.status === "Cancelada" && (
        <p className="detail-completed-message">
          Este servicio está cancelado y se conserva en tu historial.
        </p>
      )}
    </main>
  );
}


function AddPage() {
  const navigate = useNavigate();

  const [selectedType, setSelectedType] = useState("");

  const types = [
    {
      id: "Suscripción de pago",
      title: "Suscripción de pago",
      description: "Pagos periódicos recurrentes",
    },
    {
      id: "Factura / Suministro",
      title: "Factura / Suministro",
      description: "Luz, agua, internet y recibos",
    },
    {
      id: "Documento oficial",
      title: "Documento oficial",
      description: "DNI, pasaporte, permisos, etc.",
    },
  ];

  function continueToForm() {
    if (!selectedType) return;

    sessionStorage.setItem("krono-draft-type", selectedType);
    navigate("/anadir/formulario");
  }

  return (
    <main className="screen add-screen">
      <ScreenHeader
        title="¿Qué quieres añadir?"
        subtitle="Elige el tipo de obligación."
      />

      <section className="type-selection">
        {types.map((type) => (
          <button
            key={type.id}
            type="button"
            className={`type-card ${
              selectedType === type.id ? "type-card-selected" : ""
            }`}
            onClick={() => setSelectedType(type.id)}
          >
            <strong>{type.title}</strong>
            <small>{type.description}</small>
          </button>
        ))}
      </section>

      <button
        className="primary-button add-continue"
        disabled={!selectedType}
        onClick={continueToForm}
      >
        Continuar
      </button>
    </main>
  );
}

function FieldError({
  field,
  message,
}: {
  field: AddFormField;
  message?: string;
}) {
  if (!message) return null;

  return (
    <p className="field-error" id={`obligation-${field}-error`} role="alert">
      {message}
    </p>
  );
}

function AddFormPage() {
  const navigate = useNavigate();

  const selectedType =
    sessionStorage.getItem("krono-draft-type") || "";

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState(
    defaultCategoryForType(selectedType)
  );
  const [errors, setErrors] = useState<AddFormErrors>({});

  const today = todayISO();

  // Sin tipo elegido no tiene sentido el formulario: se vuelve al paso anterior.
  if (!selectedType) {
    return <Navigate to="/anadir" replace />;
  }

  // Al corregir un campo, su error desaparece.
  function clearError(field: AddFormField) {
    setErrors((current) => {
      if (!current[field]) return current;

      const rest = { ...current };
      delete rest[field];
      return rest;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validateAddForm({ name, amount, date }, today);
    setErrors(found);

    const firstInvalid = FIELD_ORDER.find((field) => found[field]);
    if (firstInvalid) {
      document.getElementById(`obligation-${firstInvalid}`)?.focus();
      return;
    }

    const normalizedAmount = amount.trim().replace(",", ".");

    const draft = {
      name: name.trim(),
      amount: normalizedAmount ? Number(normalizedAmount) : undefined,
      date,
      category,
      description: selectedType,
    };

    sessionStorage.setItem("krono-draft", JSON.stringify(draft));
    navigate("/anadir/aviso");
  }

  function fieldProps(field: AddFormField) {
    return {
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": errors[field] ? `obligation-${field}-error` : undefined,
      className: errors[field] ? "input-invalid" : undefined,
    };
  }

  return (
    <main className="screen">
      <ScreenHeader
        title="Datos de la obligación"
        subtitle="Introduce la información para tenerla siempre a mano."
        back
      />

      <form className="figma-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="obligation-name">
          Nombre de la obligación
        </label>
        <input
          id="obligation-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearError("name");
          }}
          placeholder="Introduce un nombre"
          {...fieldProps("name")}
        />
        <FieldError field="name" message={errors.name} />

        <label htmlFor="obligation-amount">
          Importe aproximado (€) · opcional
        </label>
        <input
          id="obligation-amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            clearError("amount");
          }}
          placeholder="Ej. 12,99"
          {...fieldProps("amount")}
        />
        <FieldError field="amount" message={errors.amount} />

        <label htmlFor="obligation-date">
          Fecha de vencimiento
        </label>
        <input
          id="obligation-date"
          type="date"
          min={today}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            clearError("date");
          }}
          {...fieldProps("date")}
        />
        <FieldError field="date" message={errors.date} />

        <label htmlFor="obligation-category">Categoría</label>
        <select
          id="obligation-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Selecciona una categoría</option>
          <option value="Suscripción">Suscripción</option>
          <option value="Factura">Factura</option>
          <option value="Suministro">Suministro</option>
          <option value="Documento">Documento</option>
          <option value="Trámite">Trámite</option>
        </select>

        <button className="primary-button" type="submit">
          Siguiente
        </button>
      </form>

      <button
        className="example-validation"
        type="button"
        onClick={() =>
          setErrors({
            name: "Introduce un nombre para la obligación.",
            date: "La fecha no puede ser anterior a hoy.",
          })
        }
      >
        Ver ejemplo de validación
      </button>
    </main>
  );
}

function readDraftDueDate(): string | undefined {
  try {
    const draft = JSON.parse(sessionStorage.getItem("krono-draft") ?? "null");
    return typeof draft?.date === "string" ? draft.date : undefined;
  } catch {
    return undefined;
  }
}

function ReminderPage() {
  const navigate = useNavigate();

  const [reminderDays, setReminderDays] = useState(3);
  const dueDate = readDraftDueDate();
  const today = todayISO();

  // Sin borrador no hay nada que configurar: se vuelve al paso de alta.
  if (!dueDate) {
    return <Navigate to="/anadir" replace />;
  }

  const plan = planReminder(dueDate, reminderDays, today);

  function saveObligation() {
    const draftText = sessionStorage.getItem("krono-draft");

    if (!draftText) {
      navigate("/anadir");
      return;
    }

    const draft = JSON.parse(draftText);

    const result = addObligation({
      name: draft.name,
      description: draft.description,
      dueDate: draft.date,
      amount: draft.amount,
      category: draft.category,
      reminderDays,
    });

    if (!result.ok) {
      navigate("/anadir/formulario");
      return;
    }

    sessionStorage.setItem(
      "krono-last-created",
      JSON.stringify(result.obligation)
    );

    sessionStorage.removeItem("krono-draft");
    sessionStorage.removeItem("krono-draft-type");

    navigate("/anadir/confirmacion");
  }

  const options = [
    { value: 1, label: "1 día antes" },
    { value: 3, label: "3 días antes (recomendado)" },
    { value: 7, label: "1 semana antes" },
  ];

  return (
    <main className="screen">
      <ScreenHeader
        title="Configurar aviso"
        subtitle="Elige con cuánta antelación quieres recibirlo."
        back
      />

      <section className="reminder-options">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            className={`reminder-option ${
              reminderDays === option.value ? "reminder-selected" : ""
            }`}
            onClick={() => setReminderDays(option.value)}
          >
            <span className="radio-circle">
              {reminderDays === option.value ? "◉" : "○"}
            </span>
            <span>{option.label}</span>
          </button>
        ))}

        <div className="reminder-option reminder-disabled">
          <span>—</span>
          <span>1 mes antes · No disponible</span>
        </div>
      </section>

      <div className="reminder-summary">
        Vencimiento: {formatISODate(dueDate)}
        <br />
        <strong className="reminder-date">
          Fecha del aviso: {formatISODate(plan.noticeDate)}
        </strong>
      </div>

      {plan.isInPast && (
        <p className="field-error reminder-warning" role="alert">
          Esa fecha ya ha pasado. Te avisaremos hoy,{" "}
          {formatISODate(plan.effectiveDate)}. Elige menos antelación si
          prefieres otra fecha.
        </p>
      )}

      <button
        className="primary-button reminder-save"
        onClick={saveObligation}
      >
        Guardar obligación
      </button>
    </main>
  );
}

function CreationConfirmation() {
  const navigate = useNavigate();

  const savedText = sessionStorage.getItem("krono-last-created");

  const obligation: Obligation | null = savedText
    ? JSON.parse(savedText)
    : null;

  if (!obligation) {
    return (
      <main className="screen">
        <ScreenHeader
          title="Confirmación"
          subtitle="No hay ninguna obligación reciente."
        />
        <button
          className="primary-button"
          onClick={() => navigate("/anadir")}
        >
          Volver
        </button>
      </main>
    );
  }

  return (
    <main className="screen confirmation-screen">
      <ScreenHeader
        title="¡Obligación registrada!"
        subtitle="Tu obligación se ha guardado correctamente."
      />

      <div className="confirmation-status">COMPLETADO</div>

      <h2>¡Obligación registrada!</h2>

      <p className="confirmation-copy">
        Tu obligación se ha guardado correctamente.
      </p>

      <section className="confirmation-card">
        <strong>
          {obligation.name} · {obligation.description}
        </strong>

        <span>Fecha límite: {formatDisplayDate(obligation.dueDate)}</span>

        {obligation.amount !== undefined && (
          <span>
            Importe: {formatAmount(obligation.amount)}
          </span>
        )}

        <span>
          {obligation.reminderDays} días antes
        </span>
      </section>

      <button
        className="primary-button confirmation-return"
        onClick={() => {
          sessionStorage.removeItem("krono-last-created");
          navigate("/");
        }}
      >
        Volver
      </button>
    </main>
  );
}

function AlertsPage() {
  const navigate = useNavigate();
  const today = todayISO();

  const reminders = loadObligations()
    .map((item) => ({ item, next: getNextReminderDate(item, today) }))
    .filter(
      (entry): entry is { item: Obligation; next: string } =>
        entry.next !== undefined
    )
    .sort((a, b) => a.next.localeCompare(b.next));

  return (
    <main className="screen">
      <ScreenHeader
        title="Alertas"
        subtitle="Mantente al día de tus próximos avisos."
      />

      <section className="obligations-list">
        {reminders.length > 0 ? (
          reminders.map(({ item, next }) => (
            <button
              type="button"
              className="obligation-list-card"
              key={item.id}
              onClick={() => navigate(`/obligaciones/${item.id}`)}
            >
              <span className="obligation-list-info">
                <strong>{item.name}</strong>
                <small>
                  {next <= today
                    ? `Aviso activo · Vence el ${formatDisplayDate(item.dueDate)}`
                    : item.reminderSnoozedUntil === next
                    ? `Aviso pospuesto hasta ${formatISODate(next)}`
                    : `Aviso el ${formatISODate(next)} (${describeReminderDistance(next, today)}) · Vence el ${formatDisplayDate(item.dueDate)}`}
                </small>
              </span>

              <Bell size={19} />
            </button>
          ))
        ) : (
          <div className="obligations-empty">
            No tienes avisos pendientes configurados.
          </div>
        )}
      </section>
    </main>
  );
}

function ProfilePage() {
  return (
    <main className="screen">
      <ScreenHeader
        title="Mi perfil"
        subtitle="Gestiona tu cuenta y tus preferencias."
      />
      <div className="page-content">
        <div className="simple-obligation">
          <strong>Configuración de la cuenta</strong>
          <ChevronRight size={18} />
        </div>
      </div>
    </main>
  );
}

function SummaryPage() {
  const obligations = loadObligations();

  const activeObligations = obligations.filter(
    (item) =>
      item.status !== "Completada" &&
      item.status !== "Cancelada"
  );

  const total = activeObligations.reduce(
    (sum, item) => sum + (item.amount ?? 0),
    0
  );

  return (
    <main className="screen">
      <ScreenHeader
        title="Resumen económico"
        subtitle="Consulta tus próximos pagos."
        back
      />

      <section className="economy-summary summary-page-card">
        <span className="economy-label">
          TOTAL PENDIENTE REGISTRADO
        </span>
        <strong>{formatAmount(total)}</strong>
      </section>
    </main>
  );
}

function AppRoutes() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/obligaciones" element={<ObligationsPage />} />
        <Route path="/obligaciones/:id" element={<ObligationDetailPage />} />
        <Route path="/anadir" element={<AddPage />} />
        <Route path="/anadir/formulario" element={<AddFormPage />} />
        <Route path="/anadir/aviso" element={<ReminderPage />} />
        <Route
          path="/anadir/confirmacion"
          element={<CreationConfirmation />}
        />
        <Route path="/alertas" element={<AlertsPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/resumen" element={<SummaryPage />} />
        {/* Una URL desconocida no debe dejar solo la navegación inferior visible. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Navigation />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
