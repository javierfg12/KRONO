
import { NavLink, BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
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
import React from "react";

type Obligation = {
  id: number;
  name: string;
  description: string;
  date: string;
  amount?: number;
  status: "Próxima" | "En plazo" | "Vencida";
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

  const upcoming = obligations
    .filter((item) => item.status !== "Vencida")
    .slice(0, 3);

  const nextCount = upcoming.filter(
    (item) => item.status === "Próxima"
  ).length;

  const total = obligations.reduce(
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
  const obligations = readObligations();

  return (
    <main className="screen">
      <ScreenHeader
        title="Mis obligaciones"
        subtitle="Consulta y organiza tus obligaciones."
      />
      <div className="page-content">
        {obligations.map((item) => (
          <article className="simple-obligation" key={item.id}>
            <div>
              <strong>{item.name}</strong>
              <p>{item.description} · Vence el {item.date}</p>
            </div>
            <ChevronRight size={18} />
          </article>
        ))}
      </div>
    </main>
  );
}

function AddPage() {
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState("");
  const [amount, setAmount] = React.useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !date) return;

    const obligations = readObligations();

    const newObligation: Obligation = {
      id: Date.now(),
      name: name.trim(),
      description: description.trim() || "Obligación personal",
      date: new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      amount: amount ? Number(amount) : undefined,
      status: "En plazo",
    };

    saveObligations([...obligations, newObligation]);
    navigate("/");
  }

  return (
    <main className="screen">
      <ScreenHeader
        title="Añadir obligación"
        subtitle="Registra algo importante para no olvidarlo."
        back
      />
      <form className="obligation-form" onSubmit={handleSubmit}>
        <label htmlFor="name">Nombre de la obligación</label>
        <input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej. Renovar DNI"
          required
        />

        <label htmlFor="description">Tipo o descripción</label>
        <input
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ej. Documento, pago, cita..."
        />

        <label htmlFor="date">Fecha de vencimiento</label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />

        <label htmlFor="amount">Importe (€), si corresponde</label>
        <input
          id="amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0,00"
        />

        <button className="primary-button" type="submit">
          Guardar obligación
        </button>
      </form>
    </main>
  );
}

function AlertsPage() {
  return (
    <main className="screen">
      <ScreenHeader
        title="Alertas"
        subtitle="Mantente al día de tus próximos avisos."
      />
      <div className="empty-message">
        No hay avisos pendientes.
      </div>
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
  const total = obligations.reduce(
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
        <span className="economy-label">TOTAL REGISTRADO</span>
        <strong>{formatAmount(total)}</strong>
      </section>
    </main>
  );
}

function AppRoutes() {
  return (
    <>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/obligaciones" element={<ObligationsPage />} />
          <Route path="/anadir" element={<AddPage />} />
          <Route path="/alertas" element={<AlertsPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/resumen" element={<SummaryPage />} />
        </Routes>
        <Navigation />
      </div>
    </>
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
