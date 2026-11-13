
import { NavLink, BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
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

type Obligation = {
  id: number;
  name: string;
  description: string;
  date: string;
  amount?: number;
  status: "Próxima" | "En plazo" | "Vencida" | "Completada" | "Cancelada";
  category?: string;
  reminderDays?: number;
  reminderSnoozedUntil?: string;
  cancelledAt?: string;
};

const initialObligations: Obligation[] = [
  {
    id: 1,
    name: "Netflix",
    description: "Suscripción",
    date: "25 nov 2026",
    amount: 12.99,
    status: "Próxima",
  },
  {
    id: 2,
    name: "Renovación DNI",
    description: "Documento",
    date: "12 dic 2026",
    status: "En plazo",
  },
  {
    id: 3,
    name: "Factura de luz",
    description: "Suministro",
    date: "18 dic 2026",
    amount: 84.5,
    status: "Próxima",
  },
];

function readObligations(): Obligation[] {
  try {
    const saved = localStorage.getItem("krono-obligations");
    return saved ? JSON.parse(saved) : initialObligations;
  } catch {
    return initialObligations;
  }
}

function saveObligations(obligations: Obligation[]) {
  localStorage.setItem("krono-obligations", JSON.stringify(obligations));
}

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

function addDaysToToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return getLocalDateISO(date);
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
  const obligations = readObligations();

    const activeObligations = obligations.filter(
    (item) =>
      item.status !== "Completada" &&
      item.status !== "Cancelada"
  );

  const upcoming = activeObligations
    .filter((item) => item.status !== "Vencida")
    .slice(0, 3);

  const nextCount = upcoming.filter(
    (item) => item.status === "Próxima"
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
                onClick={() => navigate("/obligaciones")}
              >
                <span className="obligation-info">
                  <strong>{item.name}</strong>
                  <small>
                    {item.amount !== undefined
                      ? `${formatAmount(item.amount)} · `
                      : `${item.description} · `}
                    Vence el {item.date}
                  </small>
                </span>
                <span
                  className={`status-chip ${
                    item.status === "En plazo"
                      ? "status-ok"
                      : "status-upcoming"
                  }`}
                >
                  {item.status}
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

  const [filter, setFilter] = useState<
    "Todas" | "Pendientes" | "Completadas" | "Canceladas"
  >("Todas");

  const obligations = readObligations();

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

  function getStatusClass(status: Obligation["status"]) {
    if (status === "Completada") return "status-completed";
    if (status === "Cancelada") return "status-cancelled";
    if (status === "Vencida") return "status-overdue";
    if (status === "En plazo") return "status-ok";

    return "status-upcoming";
  }

  return (
    <main className="screen obligations-screen">
      <div className="brand-mark" />

      <h1 className="obligations-title">Mis obligaciones</h1>
      <div className="header-divider" />

      <p className="obligations-subtitle">
        Consulta y organiza todo lo que tienes pendiente.
      </p>

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
                    ? `${item.description} · ${formatAmount(item.amount)} · ${getShortDate(item.date)}`
                    : `${item.description} · ${getShortDate(item.date)}`}
                </small>
              </span>

              <span className={`status-chip ${getStatusClass(item.status)}`}>
                {item.status}
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
  const { id } = useParams();

  const [obligations, setObligations] = useState<Obligation[]>(
    readObligations()
  );

  const [showPostponeOptions, setShowPostponeOptions] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const obligation = obligations.find(
    (item) => item.id === Number(id)
  );

  function updateObligation(updatedObligation: Obligation) {
    const updated = obligations.map((item) =>
      item.id === updatedObligation.id ? updatedObligation : item
    );

    setObligations(updated);
    saveObligations(updated);
  }

  function formatDetailDate(date: string) {
    const months: Record<string, string> = {
      ene: "01",
      feb: "02",
      mar: "03",
      abr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      ago: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dic: "12",
    };

    const parts = date.replace(".", "").split(" ");

    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = months[parts[1].toLowerCase()];

      if (month) {
        return `${day}/${month}/${parts[2]}`;
      }
    }

    return date;
  }

  function markAsCompleted() {
    if (!obligation) return;

    updateObligation({
      ...obligation,
      status: "Completada",
      reminderSnoozedUntil: undefined,
    });

    navigate("/obligaciones");
  }

  function postponeReminder(days: number) {
    if (!obligation) return;

    const postponedDate = addDaysToToday(days);

    updateObligation({
      ...obligation,
      reminderSnoozedUntil: postponedDate,
    });

    setShowPostponeOptions(false);
    setActionMessage(
      `Aviso pospuesto hasta el ${formatISODate(postponedDate)}.`
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

  function getStatusClass(status: Obligation["status"]) {
    if (status === "Completada") return "status-completed";
    if (status === "Cancelada") return "status-cancelled";
    if (status === "Vencida") return "status-overdue";
    if (status === "En plazo") return "status-ok";

    return "status-upcoming";
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
          onClick={() => navigate("/obligaciones")}
          aria-label="Volver a obligaciones"
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

        <span className={`status-chip ${getStatusClass(obligation.status)}`}>
          {obligation.status}
        </span>
      </section>

      <section className="detail-data">
        <div className="detail-data-row">
          <span>
            {subscription ? "Próximo cobro" : "Próximo vencimiento"}
          </span>
          <strong>{formatDetailDate(obligation.date)}</strong>
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

              <button
                className="outline-button detail-action"
                onClick={() => postponeReminder(1)}
              >
                Posponer 1 día
              </button>

              <button
                className="outline-button detail-action"
                onClick={() => postponeReminder(3)}
              >
                Posponer 3 días
              </button>
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

function AddFormPage() {
  const navigate = useNavigate();

  const selectedType =
    sessionStorage.getItem("krono-draft-type") || "";

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState(selectedType);
  const [error, setError] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !name.trim() ||
      !date ||
      date < today ||
      (amount !== "" && Number(amount) < 0)
    ) {
      setError(true);
      return;
    }

    const draft = {
      name: name.trim(),
      amount: amount ? Number(amount) : undefined,
      date,
      category,
      description: selectedType,
    };

    sessionStorage.setItem("krono-draft", JSON.stringify(draft));
    setError(false);
    navigate("/anadir/aviso");
  }

  return (
    <main className="screen">
      <ScreenHeader
        title="Datos de la obligación"
        subtitle="Introduce la información para tenerla siempre a mano."
        back
      />

      <form className="figma-form" onSubmit={handleSubmit}>
        <label htmlFor="obligation-name">
          Nombre de la obligación
        </label>
        <input
          id="obligation-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Introduce un nombre"
        />

        <label htmlFor="obligation-amount">
          Importe aproximado (€)
        </label>
        <input
          id="obligation-amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ej. 12,99"
        />

        <label htmlFor="obligation-date">
          Fecha de vencimiento
        </label>
        <input
          id="obligation-date"
          type="date"
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

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

        {error && (
          <p className="form-error">
            Revisa los datos. El nombre y la fecha son obligatorios,
            y la fecha no puede ser anterior a hoy.
          </p>
        )}

        <button className="primary-button" type="submit">
          Siguiente
        </button>
      </form>

      <button
        className="example-validation"
        type="button"
        onClick={() => setError(true)}
      >
        Ver ejemplo de validación
      </button>
    </main>
  );
}

function ReminderPage() {
  const navigate = useNavigate();

  const [reminderDays, setReminderDays] = useState(3);

  function saveObligation() {
    const draftText = sessionStorage.getItem("krono-draft");

    if (!draftText) {
      navigate("/anadir");
      return;
    }

    const draft = JSON.parse(draftText);

    const obligation: Obligation = {
      id: Date.now(),
      name: draft.name,
      description: draft.description,
      date: new Date(`${draft.date}T12:00:00`).toLocaleDateString(
        "es-ES",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      ),
      amount: draft.amount,
      category: draft.category,
      reminderDays,
      status: "En plazo",
    };

    const obligations = readObligations();

    saveObligations([...obligations, obligation]);

    sessionStorage.setItem(
      "krono-last-created",
      JSON.stringify(obligation)
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
        El aviso se programará para {reminderDays} día(s) antes de la fecha
        de vencimiento.
      </div>

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

        <span>Fecha límite: {obligation.date}</span>

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

  const obligations = readObligations()
    .filter(
      (item) =>
        item.status !== "Completada" &&
        item.status !== "Cancelada" &&
        item.reminderDays !== undefined
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <main className="screen">
      <ScreenHeader
        title="Alertas"
        subtitle="Mantente al día de tus próximos avisos."
      />

      <section className="obligations-list">
        {obligations.length > 0 ? (
          obligations.map((item) => (
            <button
              type="button"
              className="obligation-list-card"
              key={item.id}
              onClick={() => navigate(`/obligaciones/${item.id}`)}
            >
              <span className="obligation-list-info">
                <strong>{item.name}</strong>
                <small>
                  {item.reminderSnoozedUntil
                    ? `Aviso pospuesto hasta ${formatISODate(item.reminderSnoozedUntil)}`
                    : `Aviso ${item.reminderDays} días antes · Vence el ${item.date}`}
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
  const obligations = readObligations();

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
