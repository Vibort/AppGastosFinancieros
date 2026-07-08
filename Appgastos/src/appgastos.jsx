import { useState, useEffect, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Wallet, PieChart as PieIcon, CreditCard, DollarSign, Pencil, Trash2,
  Plus, X, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Banknote,
  Download, PiggyBank, Users, Repeat,
} from "lucide-react";

/* ---------------------------------------------------------
   CONSTANTES Y HELPERS DE FECHA / MES
--------------------------------------------------------- */
const CATEGORIES = [
  { id: "comida", label: "Comida", color: "#f97316" },
  { id: "transporte", label: "Transporte", color: "#3b82f6" },
  { id: "vivienda", label: "Alquiler/Vivienda", color: "#0ea5e9" },
  { id: "servicios", label: "Servicios", color: "#eab308" },
  { id: "salud", label: "Salud", color: "#ef4444" },
  { id: "ocio", label: "Ocio", color: "#a855f7" },
  { id: "ahorro", label: "Ahorro/Inversión", color: "#22c55e" },
  { id: "otros", label: "Otros", color: "#64748b" },
];
const catInfo = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

const CARD_TYPES = [
  { id: "Visa", color: "#1a56db" },
  { id: "Mastercard", color: "#eb001b" },
  { id: "Otra", color: "#64748b" },
];

const STORAGE_KEY = "finance-app-state-v1";

function pad2(n) { return String(n).padStart(2, "0"); }
function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function parseMonth(m) {
  const [y, mo] = m.split("-").map(Number);
  return { y, mo };
}
function monthDiff(a, b) {
  const A = parseMonth(a), B = parseMonth(b);
  return (A.y - B.y) * 12 + (A.mo - B.mo);
}
function addMonths(m, delta) {
  const { y, mo } = parseMonth(m);
  const total = y * 12 + (mo - 1) + delta;
  const ny = Math.floor(total / 12);
  const nmo = (total % 12) + 1;
  return `${ny}-${pad2(nmo)}`;
}
function monthLabel(m) {
  const { y, mo } = parseMonth(m);
  return new Date(y, mo - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}
function monthShort(m) {
  const { y, mo } = parseMonth(m);
  return new Date(y, mo - 1, 1).toLocaleDateString("es-AR", { month: "short" });
}
function fmt(n) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);
}
function fmtUSD(n) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n || 0);
}
function defaultDateForMonth(monthStr) {
  return monthStr === currentMonthStr() ? todayISO() : `${monthStr}-01`;
}
function daysInMonth(monthStr) {
  const { y, mo } = parseMonth(monthStr);
  return new Date(y, mo, 0).getDate();
}
function clampDateForMonth(monthStr, day) {
  const d = Math.min(Math.max(1, Number(day) || 1), daysInMonth(monthStr));
  return `${monthStr}-${pad2(d)}`;
}

/* ---------------------------------------------------------
   LÓGICA DE CUOTAS (sin loops: pura aritmética de meses)
--------------------------------------------------------- */
function getInstallmentInfo(card, monthStr) {
  const diff = monthDiff(monthStr, card.startMonth);
  const num = diff + 1;
  const amount = card.totalAmount / card.installments;
  if (num < 1) return { status: "pendiente", num: 0, amount: 0, remaining: card.installments };
  if (num > card.installments) return { status: "finalizada", num: card.installments, amount: 0, remaining: 0 };
  return { status: "activa", num, amount, remaining: card.installments - num };
}

/* Datos semilla (cargados desde tus capturas) */
const seedExpenses = [
  { id: 1, desc: "Empleada doméstica", amount: 99200, category: "otros", type: "variable", date: "2026-07-30" },
  { id: 2, desc: "Meli+", amount: 21000, category: "ocio", type: "variable", date: "2026-07-22" },
  { id: 3, desc: "HBO max", amount: 8500, category: "ocio", type: "variable", date: "2026-07-18" },
  { id: 4, desc: "Luz", amount: 25000, category: "servicios", type: "fijo", date: "2026-07-10" },
  { id: 5, desc: "Peluquería", amount: 30000, category: "otros", type: "fijo", date: "2026-07-10" },
  { id: 6, desc: "Inversiones fede", amount: 11000, category: "ahorro", type: "fijo", date: "2026-07-10" },
  { id: 7, desc: "Celular", amount: 16000, category: "servicios", type: "variable", date: "2026-07-10" },
  { id: 8, desc: "Gastos auto patente y vtv", amount: 40000, category: "transporte", type: "fijo", date: "2026-07-10" },
  { id: 9, desc: "Alquiler", amount: 299000, category: "vivienda", type: "fijo", date: "2026-07-10" },
  { id: 10, desc: "Manutención", amount: 350000, category: "otros", type: "fijo", date: "2026-07-07" },
  { id: 11, desc: "huevos", amount: 2000, category: "comida", type: "variable", date: "2026-07-06" },
  { id: 12, desc: "queso cremoso lasañas", amount: 14069, category: "comida", type: "variable", date: "2026-07-06" },
  { id: 13, desc: "bolsas y envases para microondas lasaña", amount: 12600, category: "comida", type: "variable", date: "2026-07-06" },
  { id: 14, desc: "salsa para lasaña", amount: 2500, category: "comida", type: "variable", date: "2026-07-06" },
  { id: 15, desc: "Pedidos ya+", amount: 6400, category: "comida", type: "variable", date: "2026-07-06" },
  { id: 16, desc: "Gas", amount: 25000, category: "servicios", type: "fijo", date: "2026-07-06" },
  { id: 17, desc: "Internet", amount: 32820, category: "servicios", type: "variable", date: "2026-07-06" },
];
const seedCards = [
  { id: 101, name: "Multiprocesadora", totalAmount: 67511, installments: 12, startMonth: "2026-03", cardType: "Visa", owner: "Propio" },
  { id: 102, name: "Celular mama", totalAmount: 349999, installments: 12, startMonth: "2026-03", cardType: "Mastercard", owner: "Propio" },
  { id: 103, name: "Mochila viaje", totalAmount: 49699, installments: 6, startMonth: "2026-04", cardType: "Visa", owner: "Propio" },
  { id: 104, name: "Termo regalo rena", totalAmount: 32200, installments: 1, startMonth: "2026-07", cardType: "Otra", owner: "Propio" },
  { id: 105, name: "Cobertura de salud", totalAmount: 99400, installments: 3, startMonth: "2026-05", cardType: "Visa", owner: "Propio" },
  { id: 106, name: "Nafta", totalAmount: 298045, installments: 1, startMonth: "2026-07", cardType: "Mastercard", owner: "Propio" },
  { id: 107, name: "Seguro de auto", totalAmount: 1000000, installments: 12, startMonth: "2026-07", cardType: "Mastercard", owner: "Propio" },
  { id: 108, name: "Vaso termico rena", totalAmount: 23028, installments: 3, startMonth: "2026-05", cardType: "Visa", owner: "Propio" },
  { id: 109, name: "Balanza y picadora", totalAmount: 14367, installments: 3, startMonth: "2026-05", cardType: "Visa", owner: "Propio" },
  { id: 110, name: "Organizador zapatos", totalAmount: 29206, installments: 6, startMonth: "2026-04", cardType: "Visa", owner: "Propio" },
  { id: 111, name: "PC", totalAmount: 677708, installments: 3, startMonth: "2026-05", cardType: "Mastercard", owner: "Franco miras" },
  { id: 112, name: "Freidora de aire", totalAmount: 80007, installments: 9, startMonth: "2026-06", cardType: "Visa", owner: "Propio" },
  { id: 113, name: "Zapatillas lule", totalAmount: 90999, installments: 6, startMonth: "2026-06", cardType: "Visa", owner: "Lule González" },
  { id: 114, name: "Cotillón luminoso", totalAmount: 54668, installments: 3, startMonth: "2026-07", cardType: "Visa", owner: "Rena" },
  { id: 115, name: "Regalo papa celular", totalAmount: 289999, installments: 6, startMonth: "2026-07", cardType: "Visa", owner: "Propio y yael" },
  { id: 116, name: "Costo lasañas", totalAmount: 110959, installments: 1, startMonth: "2026-07", cardType: "Visa", owner: "Propio" },
  { id: 117, name: "Helado pedidos ya", totalAmount: 11440, installments: 1, startMonth: "2026-07", cardType: "Mastercard", owner: "Propio" },
  { id: 118, name: "Carne molida día del padre", totalAmount: 13207, installments: 1, startMonth: "2026-07", cardType: "Visa", owner: "Propio" },
  { id: 119, name: "Paramount+", totalAmount: 4725, installments: 1, startMonth: "2026-07", cardType: "Visa", owner: "Propio" },
  { id: 120, name: "Mercadería varias", totalAmount: 31277, installments: 1, startMonth: "2026-07", cardType: "Visa", owner: "Propio" },
  { id: 121, name: "Disfraz Elsa Guille", totalAmount: 64990, installments: 3, startMonth: "2026-07", cardType: "Visa", owner: "Rena" },
  { id: 122, name: "Helado Michel", totalAmount: 15000, installments: 1, startMonth: "2026-08", cardType: "Mastercard", owner: "Propio" },
];
const seedIncome = { sueldoNeto: 1752000 };
const seedExtraIncomes = [
  { id: 1, name: "Pagos tarjeta", amount: 283308, date: "2026-07-01" },
  { id: 2, name: "Aguinaldo", amount: 894000, date: "2026-07-01" },
  { id: 3, name: "Pizzetas y lasañas", amount: 168000, date: "2026-07-01" },
];
const seedIdeal = { vivienda: 25, fijos: 25, variables: 20, ahorro: 20, tarjetas: 10 };
const seedUsdExpenses = [];
const seedUsdPurchases = [];
const seedSavingsGoal = 1000000;

export default function ExpenseTracker() {
  const [loaded, setLoaded] = useState(false);
  const [expenses, setExpenses] = useState(seedExpenses);
  const [cards, setCards] = useState(seedCards);
  const [income, setIncome] = useState(seedIncome);
  const [extraIncomes, setExtraIncomes] = useState(seedExtraIncomes);
  const [idealPercents, setIdealPercents] = useState(seedIdeal);
  const [usdRate, setUsdRate] = useState(1000);
  const [usdExpenses, setUsdExpenses] = useState(seedUsdExpenses);
  const [usdPurchases, setUsdPurchases] = useState(seedUsdPurchases);
  const [savingsGoal, setSavingsGoal] = useState(seedSavingsGoal);

  const [tab, setTab] = useState("gastos");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [editingId, setEditingId] = useState(null);
  const [editingCardId, setEditingCardId] = useState(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddExtraIncome, setShowAddExtraIncome] = useState(false);
  const [showAddUsdExpense, setShowAddUsdExpense] = useState(false);
  const [showAddUsdPurchase, setShowAddUsdPurchase] = useState(false);

  const [form, setForm] = useState({ desc: "", amount: "", category: "comida", type: "variable", date: todayISO(), repeat: true, repeatMonths: "12" });
  const [cardForm, setCardForm] = useState({ name: "", totalAmount: "", installments: "", startMonth: currentMonthStr(), cardType: "Visa", owner: "Propio" });
  const [extraIncomeForm, setExtraIncomeForm] = useState({ name: "", amount: "", date: todayISO() });
  const [usdExpenseForm, setUsdExpenseForm] = useState({ desc: "", amount: "", date: todayISO() });
  const [usdPurchaseForm, setUsdPurchaseForm] = useState({ amount: "", price: "", date: todayISO() });

  /* --------- Carga inicial desde almacenamiento persistente --------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const data = JSON.parse(res.value);
          if (data.expenses) setExpenses(data.expenses);
          if (data.cards) {
            setCards(data.cards.map((c) => ({ cardType: "Visa", owner: "Propio", ...c })));
          }
          if (data.income) setIncome(data.income);
          if (data.extraIncomes) setExtraIncomes(data.extraIncomes);
          if (data.idealPercents) setIdealPercents(data.idealPercents);
          if (data.usdRate) setUsdRate(data.usdRate);
          if (data.usdExpenses) setUsdExpenses(data.usdExpenses);
          if (data.usdPurchases) setUsdPurchases(data.usdPurchases);
          if (data.savingsGoal) setSavingsGoal(data.savingsGoal);
        }
      } catch (e) {
        // primera vez que se usa el artefacto: no hay datos guardados todavía
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  /* --------- Guardado persistente (una sola clave combinada) --------- */
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await window.storage.set(
          STORAGE_KEY,
          JSON.stringify({ expenses, cards, income, extraIncomes, idealPercents, usdRate, usdExpenses, usdPurchases, savingsGoal }),
          false
        );
      } catch (e) {
        console.error("No se pudo guardar el estado:", e);
      }
    })();
  }, [expenses, cards, income, extraIncomes, idealPercents, usdRate, usdExpenses, usdPurchases, savingsGoal, loaded]);

  /* --------- Gastos del mes seleccionado --------- */
  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.slice(0, 7) === selectedMonth),
    [expenses, selectedMonth]
  );
  const totalMonthExpenses = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);

  /* --------- Ingresos extra del mes seleccionado --------- */
  const monthExtraIncomes = useMemo(
    () => extraIncomes.filter((x) => x.date.slice(0, 7) === selectedMonth),
    [extraIncomes, selectedMonth]
  );
  const extrasMonthTotal = monthExtraIncomes.reduce((s, x) => s + Number(x.amount), 0);

  /* --------- Gastos y compras en USD del mes seleccionado --------- */
  const monthUsdExpenses = useMemo(
    () => usdExpenses.filter((x) => x.date.slice(0, 7) === selectedMonth),
    [usdExpenses, selectedMonth]
  );
  const monthUsdPurchases = useMemo(
    () => usdPurchases.filter((x) => x.date.slice(0, 7) === selectedMonth),
    [usdPurchases, selectedMonth]
  );
  const totalUsdExpensesMonth = monthUsdExpenses.reduce((s, x) => s + Number(x.amount), 0);
  const totalUsdPurchasedMonth = monthUsdPurchases.reduce((s, x) => s + Number(x.amount), 0);
  const totalArsInvertidoMonth = monthUsdPurchases.reduce((s, x) => s + Number(x.amount) * Number(x.price), 0);
  const valorActualComprasMonth = totalUsdPurchasedMonth * usdRate;
  const gananciaPerdidaMonth = valorActualComprasMonth - totalArsInvertidoMonth;
  const arsEquivGastosUsdMonth = totalUsdExpensesMonth * usdRate;

  /* --------- Total histórico invertido en USD (para ahorro acumulado) --------- */
  const totalUsdInvertidoAllTime = useMemo(
    () => usdPurchases.reduce((s, x) => s + Number(x.amount) * Number(x.price), 0),
    [usdPurchases]
  );

  /* --------- Cuotas activas del mes seleccionado --------- */
  const activeInstallments = useMemo(
    () => cards.map((c) => ({ card: c, info: getInstallmentInfo(c, selectedMonth) })).filter((x) => x.info.status === "activa"),
    [cards, selectedMonth]
  );
  const totalCardsMonth = activeInstallments.reduce((s, x) => s + x.info.amount, 0);
  const thirdPartyCardsMonth = activeInstallments
    .filter((x) => x.card.owner && x.card.owner !== "Propio")
    .reduce((s, x) => s + x.info.amount, 0);

  /* --------- Cuotas que terminan pronto (última cuota este mes) --------- */
  const endingSoonCards = useMemo(
    () => activeInstallments.filter((x) => x.info.remaining === 0).map((x) => x.card),
    [activeInstallments]
  );

  /* --------- Deudas de terceros agrupadas por quién debe --------- */
  const debtorsSummary = useMemo(() => {
    const map = {};
    cards.forEach((c) => {
      if (!c.owner || c.owner === "Propio") return;
      const info = getInstallmentInfo(c, selectedMonth);
      if (!map[c.owner]) map[c.owner] = { owner: c.owner, totalPrestado: 0, cuotaMes: 0, items: 0 };
      map[c.owner].totalPrestado += c.totalAmount;
      map[c.owner].cuotaMes += info.status === "activa" ? info.amount : 0;
      map[c.owner].items += 1;
    });
    return Object.values(map).sort((a, b) => b.totalPrestado - a.totalPrestado);
  }, [cards, selectedMonth]);

  /* --------- Proyección de deuda (6 meses desde el mes seleccionado) --------- */
  const projectionData = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 6; i++) {
      const m = addMonths(selectedMonth, i);
      const total = cards.reduce((s, c) => {
        const info = getInstallmentInfo(c, m);
        return s + (info.status === "activa" ? info.amount : 0);
      }, 0);
      arr.push({ month: m, label: monthShort(m), total });
    }
    return arr;
  }, [cards, selectedMonth]);

  /* --------- Comparativa histórica: total gastado en los últimos 6 meses --------- */
  const historicalData = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const m = addMonths(selectedMonth, -i);
      const expTotal = expenses.filter((e) => e.date.slice(0, 7) === m).reduce((s, e) => s + Number(e.amount), 0);
      const cardsTotal = cards.reduce((s, c) => {
        const info = getInstallmentInfo(c, m);
        return s + (info.status === "activa" ? info.amount : 0);
      }, 0);
      const usdTotal = usdExpenses.filter((x) => x.date.slice(0, 7) === m).reduce((s, x) => s + Number(x.amount), 0) * usdRate;
      arr.push({ month: m, label: monthShort(m), total: expTotal + cardsTotal + usdTotal });
    }
    return arr;
  }, [expenses, cards, usdExpenses, usdRate, selectedMonth]);

  /* --------- Pie por categoría (mes seleccionado) --------- */
  const pieData = useMemo(() => {
    const byCat = {};
    monthExpenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });
    return Object.entries(byCat)
      .map(([cat, value]) => ({ name: catInfo(cat).label, value, color: catInfo(cat).color, id: cat }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses]);

  /* --------- Fijos vs Variables (incluye cuotas como fijo) --------- */
  const fijoVariable = useMemo(() => {
    const fijoExpenses = monthExpenses.filter((e) => e.type === "fijo").reduce((s, e) => s + Number(e.amount), 0);
    const variableExpenses = monthExpenses.filter((e) => e.type === "variable").reduce((s, e) => s + Number(e.amount), 0);
    const fijo = fijoExpenses + totalCardsMonth;
    const total = fijo + variableExpenses;
    return {
      fijo, variable: variableExpenses, total,
      fijoPct: total ? (fijo / total) * 100 : 0,
      variablePct: total ? (variableExpenses / total) * 100 : 0,
    };
  }, [monthExpenses, totalCardsMonth]);

  /* --------- Meta de ahorro: progreso histórico acumulado (categoría Ahorro + compras USD) --------- */
  const totalAhorroAllTime = useMemo(
    () => expenses.filter((e) => e.category === "ahorro").reduce((s, e) => s + Number(e.amount), 0) + totalUsdInvertidoAllTime,
    [expenses, totalUsdInvertidoAllTime]
  );
  const savingsProgressPct = savingsGoal > 0 ? Math.min(100, (totalAhorroAllTime / savingsGoal) * 100) : 0;

  /* --------- Ingresos y comparador ideal vs real --------- */
  const incomeTotal = Number(income.sueldoNeto || 0) + extrasMonthTotal;
  const percentSum = Object.values(idealPercents).reduce((s, v) => s + Number(v || 0), 0);

  /* --------- Balance del mes: ingresos vs. gastos totales (incluye compra de USD como salida hacia ahorro) --------- */
  const totalGastosGlobal = totalMonthExpenses + totalCardsMonth + arsEquivGastosUsdMonth + totalArsInvertidoMonth;
  const balanceMes = incomeTotal - totalGastosGlobal;

  const groupReal = useMemo(() => {
    const vivienda = monthExpenses.filter((e) => e.category === "vivienda").reduce((s, e) => s + Number(e.amount), 0);
    const ahorroCat = monthExpenses.filter((e) => e.category === "ahorro").reduce((s, e) => s + Number(e.amount), 0);
    const ahorro = ahorroCat + totalArsInvertidoMonth;
    const fijos = monthExpenses.filter((e) => e.type === "fijo" && e.category !== "vivienda" && e.category !== "ahorro").reduce((s, e) => s + Number(e.amount), 0);
    const variables = monthExpenses.filter((e) => e.type === "variable" && e.category !== "vivienda" && e.category !== "ahorro").reduce((s, e) => s + Number(e.amount), 0);
    return { vivienda, fijos, variables, ahorro, tarjetas: totalCardsMonth };
  }, [monthExpenses, totalCardsMonth, totalArsInvertidoMonth]);

  const GROUP_LABELS = {
    vivienda: "Alquiler/Vivienda", fijos: "Gastos Fijos", variables: "Variables/Estilo de vida",
    ahorro: "Ahorro/Inversión", tarjetas: "Tarjetas",
  };

  /* --------- Acciones: gastos --------- */
  function updateCategory(id, category) {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, category } : e)));
  }
  function updateType(id, type) {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, type } : e)));
  }
  function deleteExpense(id) { setExpenses((prev) => prev.filter((e) => e.id !== id)); }
  function deleteExpenseSeries(recurringId, fromDate) {
    setExpenses((prev) => prev.filter((e) => !(e.recurringId === recurringId && e.date >= fromDate)));
  }
  function addExpense() {
    if (!form.desc.trim() || !form.amount) return;
    const isFijo = form.type === "fijo";
    const months = isFijo && form.repeat ? Math.min(60, Math.max(1, parseInt(form.repeatMonths, 10) || 1)) : 1;
    const recurringId = months > 1 ? Date.now() : null;
    const baseMonth = form.date.slice(0, 7);
    const day = form.date.slice(8, 10);
    const newOnes = [];
    for (let i = 0; i < months; i++) {
      const m = addMonths(baseMonth, i);
      const dateStr = i === 0 ? form.date : clampDateForMonth(m, day);
      newOnes.push({
        id: Date.now() + i,
        desc: form.desc.trim(),
        amount: Number(form.amount),
        category: form.category,
        type: form.type,
        date: dateStr,
        recurringId,
      });
    }
    setExpenses((prev) => [...newOnes, ...prev]);
    setForm({ desc: "", amount: "", category: "comida", type: "variable", date: defaultDateForMonth(selectedMonth), repeat: true, repeatMonths: "12" });
    setShowAddExpense(false);
  }

  /* --------- Acciones: tarjetas --------- */
  function deleteCard(id) { setCards((prev) => prev.filter((c) => c.id !== id)); }
  function updateCardType(id, cardType) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, cardType } : c)));
  }
  function updateCardOwner(id, owner) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, owner } : c)));
  }
  function addCard() {
    const total = Number(cardForm.totalAmount);
    const installments = parseInt(cardForm.installments, 10);
    if (!cardForm.name.trim() || !total || !installments || installments < 1) return;
    setCards((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: cardForm.name.trim(),
        totalAmount: total,
        installments,
        startMonth: cardForm.startMonth,
        cardType: cardForm.cardType,
        owner: cardForm.owner.trim() || "Propio",
      },
    ]);
    setCardForm({ name: "", totalAmount: "", installments: "", startMonth: selectedMonth, cardType: "Visa", owner: "Propio" });
    setShowAddCard(false);
  }

  /* --------- Acciones: ingresos extra --------- */
  function addExtraIncome() {
    if (!extraIncomeForm.name.trim() || !extraIncomeForm.amount) return;
    setExtraIncomes((prev) => [
      { id: Date.now(), name: extraIncomeForm.name.trim(), amount: Number(extraIncomeForm.amount), date: extraIncomeForm.date },
      ...prev,
    ]);
    setExtraIncomeForm({ name: "", amount: "", date: defaultDateForMonth(selectedMonth) });
    setShowAddExtraIncome(false);
  }
  function deleteExtraIncome(id) { setExtraIncomes((prev) => prev.filter((x) => x.id !== id)); }

  /* --------- Acciones: USD --------- */
  function addUsdExpense() {
    if (!usdExpenseForm.desc.trim() || !usdExpenseForm.amount) return;
    setUsdExpenses((prev) => [
      { id: Date.now(), desc: usdExpenseForm.desc.trim(), amount: Number(usdExpenseForm.amount), date: usdExpenseForm.date },
      ...prev,
    ]);
    setUsdExpenseForm({ desc: "", amount: "", date: defaultDateForMonth(selectedMonth) });
    setShowAddUsdExpense(false);
  }
  function deleteUsdExpense(id) { setUsdExpenses((prev) => prev.filter((x) => x.id !== id)); }
  function addUsdPurchase() {
    if (!usdPurchaseForm.amount || !usdPurchaseForm.price) return;
    setUsdPurchases((prev) => [
      { id: Date.now(), amount: Number(usdPurchaseForm.amount), price: Number(usdPurchaseForm.price), date: usdPurchaseForm.date },
      ...prev,
    ]);
    setUsdPurchaseForm({ amount: "", price: "", date: defaultDateForMonth(selectedMonth) });
    setShowAddUsdPurchase(false);
  }
  function deleteUsdPurchase(id) { setUsdPurchases((prev) => prev.filter((x) => x.id !== id)); }

  function changeMonth(delta) { setSelectedMonth((m) => addMonths(m, delta)); }

  /* --------- Exportar todos los datos a JSON --------- */
  function exportData() {
    const data = {
      expenses, cards, income, extraIncomes, idealPercents, usdRate, usdExpenses, usdPurchases, savingsGoal,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `control-financiero-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* =========================================================
     RENDER
  ========================================================= */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header + selector de mes (global) */}
      <div className="px-5 pt-6 pb-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Control Financiero</h1>
          <button onClick={exportData} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition" title="Exportar datos a JSON">
            <Download size={18} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-3 bg-slate-800/60 rounded-xl px-2 py-1.5">
          <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-700 active:scale-95 transition">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium capitalize">{monthLabel(selectedMonth)}</span>
          <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-700 active:scale-95 transition">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        {tab === "gastos" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex-1 mr-2">
                <p className="text-slate-400 text-xs">Total gastos del mes</p>
                <p className="text-2xl font-bold">{fmt(totalMonthExpenses)}</p>
              </div>
              <button
                onClick={() => { setForm((f) => ({ ...f, date: defaultDateForMonth(selectedMonth) })); setShowAddExpense(true); }}
                className="bg-orange-500 hover:bg-orange-600 active:scale-95 transition rounded-2xl p-4"
              >
                <Plus size={22} />
              </button>
            </div>

            {monthExpenses.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">No hay gastos cargados este mes.</p>
            )}

            {monthExpenses
              .slice()
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((e) => {
                const info = catInfo(e.category);
                return (
                  <div key={e.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: info.color }} />
                        <div className="min-w-0">
                          <p className="font-medium truncate flex items-center gap-1.5">
                            {e.desc}
                            {e.recurringId && <Repeat size={12} className="text-sky-400 shrink-0" />}
                          </p>
                          <p className="text-xs text-slate-400">
                            {e.date} · <span className={e.type === "fijo" ? "text-sky-400" : "text-fuchsia-400"}>{e.type === "fijo" ? "Fijo" : "Variable"}</span>
                            {e.recurringId && <span className="text-sky-400"> · Recurrente</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold">{fmt(e.amount)}</span>
                        <button onClick={() => setEditingId(editingId === e.id ? null : e.id)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 transition">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteExpense(e.id)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900 active:scale-95 transition">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {editingId === e.id && (
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
                        <div>
                          <p className="text-xs text-slate-400 mb-2">Cambiar categoría</p>
                          <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => updateCategory(e.id, c.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${e.category === c.id ? "border-transparent text-white" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}
                                style={e.category === c.id ? { backgroundColor: c.color } : {}}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-2">Tipo de gasto</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateType(e.id, "fijo")}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${e.type === "fijo" ? "bg-sky-500 border-transparent text-white" : "border-slate-700 text-slate-300"}`}
                            >
                              Fijo
                            </button>
                            <button
                              onClick={() => updateType(e.id, "variable")}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${e.type === "variable" ? "bg-fuchsia-500 border-transparent text-white" : "border-slate-700 text-slate-300"}`}
                            >
                              Variable
                            </button>
                          </div>
                        </div>
                        {e.recurringId && (
                          <button
                            onClick={() => deleteExpenseSeries(e.recurringId, e.date)}
                            className="w-full flex items-center justify-center gap-2 text-xs font-medium text-red-300 bg-red-950/40 border border-red-800 rounded-xl py-2 hover:bg-red-950/70 active:scale-95 transition"
                          >
                            <Trash2 size={13} /> Eliminar esta y las próximas repeticiones
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {tab === "tarjetas" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex-1 mr-2">
                <p className="text-slate-400 text-xs">Cuotas activas este mes</p>
                <p className="text-2xl font-bold">{fmt(totalCardsMonth)}</p>
                {thirdPartyCardsMonth > 0 && (
                  <p className="text-[11px] text-amber-400 mt-1">De las cuales {fmt(thirdPartyCardsMonth)} son de gastos prestados a terceros.</p>
                )}
              </div>
              <button onClick={() => { setCardForm((f) => ({ ...f, startMonth: selectedMonth })); setShowAddCard(true); }} className="bg-orange-500 hover:bg-orange-600 active:scale-95 transition rounded-2xl p-4">
                <Plus size={22} />
              </button>
            </div>

            {endingSoonCards.length > 0 && (
              <div className="bg-amber-950/40 border border-amber-800 rounded-2xl p-4 space-y-1.5">
                <p className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                  <AlertTriangle size={16} /> Cuotas que terminan este mes
                </p>
                {endingSoonCards.map((c) => (
                  <p key={c.id} className="text-xs text-amber-200">
                    {c.name} — es la última cuota, el mes que viene se libera {fmt(c.totalAmount / c.installments)}
                  </p>
                ))}
              </div>
            )}

            {cards.length === 0 && <p className="text-slate-500 text-sm text-center py-6">No hay tarjetas / financiaciones cargadas.</p>}

            <div className="space-y-2">
              {cards.map((c) => {
                const info = getInstallmentInfo(c, selectedMonth);
                const badge =
                  info.status === "activa" ? { text: `Cuota ${info.num}/${c.installments}`, cls: "bg-sky-500/20 text-sky-300" } :
                  info.status === "finalizada" ? { text: "Finalizada", cls: "bg-slate-700 text-slate-300" } :
                  { text: "Aún no inicia", cls: "bg-amber-500/20 text-amber-300" };
                const typeColor = CARD_TYPES.find((t) => t.id === c.cardType)?.color || "#64748b";
                return (
                  <div key={c.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{c.name}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white" style={{ backgroundColor: typeColor }}>
                            {c.cardType || "Otra"}
                          </span>
                          {c.owner && c.owner !== "Propio" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                              Prestada a: {c.owner}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{fmt(c.totalAmount)} en {c.installments} cuotas · inicio {monthLabel(c.startMonth)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setEditingCardId(editingCardId === c.id ? null : c.id)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 transition">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteCard(c.id)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900 active:scale-95 transition">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${badge.cls}`}>{badge.text}</span>
                      <span className="font-semibold">{info.status === "activa" ? fmt(info.amount) : fmt(0)}</span>
                    </div>

                    {editingCardId === c.id && (
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
                        <div>
                          <p className="text-xs text-slate-400 mb-2">Tipo de tarjeta</p>
                          <div className="flex gap-2">
                            {CARD_TYPES.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => updateCardType(c.id, t.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${c.cardType === t.id ? "border-transparent text-white" : "border-slate-700 text-slate-300"}`}
                                style={c.cardType === t.id ? { backgroundColor: t.color } : {}}
                              >
                                {t.id}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-2">¿De quién es el gasto? ("Propio" si es tuyo)</p>
                          <input
                            value={c.owner || ""}
                            onChange={(e) => updateCardOwner(c.id, e.target.value)}
                            className="w-full bg-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <p className="text-sm font-semibold mb-2">Proyección de deuda (6 meses)</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                    <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => l} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#fff" }} />
                    <Bar dataKey="total" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {debtorsSummary.length > 0 && (
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Users size={16} /> Deudas de terceros
                </p>
                <div className="space-y-2">
                  {debtorsSummary.map((d) => (
                    <div key={d.owner} className="bg-slate-800/60 rounded-xl px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{d.owner}</span>
                        <span className="text-[11px] text-slate-400">{d.items} ítem{d.items > 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <span className="text-slate-400">Prestado en total</span>
                        <span className="font-semibold">{fmt(d.totalPrestado)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Cuota de {monthLabel(selectedMonth)}</span>
                        <span className="font-semibold text-amber-300">{fmt(d.cuotaMes)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "ingresos" && (
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
              <p className="text-sm font-semibold">Ingresos del mes</p>
              <div>
                <label className="text-xs text-slate-400">Sueldo neto mensual</label>
                <input
                  type="number"
                  value={income.sueldoNeto}
                  onChange={(e) => setIncome((i) => ({ ...i, sueldoNeto: e.target.value === "" ? "" : Number(e.target.value) }))}
                  className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 mt-1"
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400 text-sm">Ingreso total (sueldo + extras del mes)</span>
                <span className="font-bold text-lg">{fmt(incomeTotal)}</span>
              </div>
            </div>

            <div className={`rounded-2xl p-4 border space-y-2 ${balanceMes >= 0 ? "bg-emerald-950/40 border-emerald-800" : "bg-red-950/40 border-red-800"}`}>
              <p className="text-sm font-semibold">Resumen — Balance del mes</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Ingresos totales</span>
                <span className="font-medium text-emerald-400">{fmt(incomeTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Gastos (variables + fijos)</span>
                <span className="font-medium text-red-400">- {fmt(totalMonthExpenses)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Cuotas de tarjetas</span>
                <span className="font-medium text-red-400">- {fmt(totalCardsMonth)}</span>
              </div>
              {arsEquivGastosUsdMonth > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Gastos en USD (equiv. ARS)</span>
                  <span className="font-medium text-red-400">- {fmt(arsEquivGastosUsdMonth)}</span>
                </div>
              )}
              {totalArsInvertidoMonth > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Compra de USD (va a ahorro/inversión)</span>
                  <span className="font-medium text-red-400">- {fmt(totalArsInvertidoMonth)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                <span className="text-sm font-semibold">Balance disponible</span>
                <span className={`font-bold text-xl ${balanceMes >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {balanceMes >= 0 ? "+" : ""}{fmt(balanceMes)}
                </span>
              </div>
              {balanceMes < 0 && (
                <p className="text-[11px] text-red-300 flex items-center gap-1"><AlertTriangle size={12} /> Estás gastando más de lo que ingresa este mes.</p>
              )}
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Ingresos extras</p>
                  <p className="text-xs text-slate-400">{monthLabel(selectedMonth)} · Total: {fmt(extrasMonthTotal)}</p>
                </div>
                <button
                  onClick={() => { setExtraIncomeForm((f) => ({ ...f, date: defaultDateForMonth(selectedMonth) })); setShowAddExtraIncome(true); }}
                  className="bg-orange-500 hover:bg-orange-600 active:scale-95 transition rounded-xl p-2.5"
                >
                  <Plus size={18} />
                </button>
              </div>

              {monthExtraIncomes.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">Todavía no cargaste ingresos extra este mes.</p>
              )}

              <div className="space-y-2">
                {monthExtraIncomes
                  .slice()
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((x) => (
                    <div key={x.id} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">Ingreso de {x.name}</p>
                        <p className="text-xs text-slate-400">{x.date}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-sm">{fmt(x.amount)}</span>
                        <button onClick={() => deleteExtraIncome(x.id)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900 active:scale-95 transition">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Distribución ideal (%)</p>
                {percentSum === 100 ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 size={14} /> 100%</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-400"><AlertTriangle size={14} /> Suma {percentSum}%</span>
                )}
              </div>
              {Object.keys(idealPercents).map((g) => (
                <div key={g} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-300">{GROUP_LABELS[g]}</span>
                  <input
                    type="number"
                    value={idealPercents[g]}
                    onChange={(e) => setIdealPercents((p) => ({ ...p, [g]: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className="w-20 bg-slate-800 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              ))}
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
              <p className="text-sm font-semibold">Ideal vs. Real — {monthLabel(selectedMonth)}</p>
              {Object.keys(idealPercents).map((g) => {
                const ideal = incomeTotal * (Number(idealPercents[g] || 0) / 100);
                const real = groupReal[g] || 0;
                const pct = ideal > 0 ? Math.min(150, (real / ideal) * 100) : real > 0 ? 150 : 0;
                const over = ideal > 0 && real > ideal;
                return (
                  <div key={g}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-300">{GROUP_LABELS[g]}</span>
                      <span className={over ? "text-red-400 flex items-center gap-1" : "text-slate-400"}>
                        {over && <AlertTriangle size={12} />} {fmt(real)} / {fmt(ideal)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${over ? "bg-red-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-slate-500">* "Ahorro/Inversión" incluye la categoría Ahorro y las compras de USD del mes.</p>
            </div>
          </div>
        )}

        {tab === "usd" && (
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <label className="text-xs text-slate-400">Precio del dólar (ARS por USD)</label>
              <input
                type="number"
                value={usdRate}
                onChange={(e) => setUsdRate(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 mt-1"
              />
              <p className="text-[11px] text-slate-500 mt-1">Actualizá este valor y todos los importes en ARS se recalculan solos.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                <p className="text-slate-400 text-xs">Gastado en USD (mes)</p>
                <p className="text-lg font-bold">{fmtUSD(totalUsdExpensesMonth)}</p>
                <p className="text-xs text-slate-400">≈ {fmt(arsEquivGastosUsdMonth)}</p>
              </div>
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                <p className="text-slate-400 text-xs">Comprado USD (mes)</p>
                <p className="text-lg font-bold">{fmtUSD(totalUsdPurchasedMonth)}</p>
                <p className="text-xs text-slate-400">Invertido: {fmt(totalArsInvertidoMonth)}</p>
              </div>
            </div>

            {totalUsdPurchasedMonth > 0 && (
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Valor actual de esas compras</span>
                  <span className="font-semibold">{fmt(valorActualComprasMonth)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Ganancia / Pérdida vs. precio de compra</span>
                  <span className={`font-semibold ${gananciaPerdidaMonth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {gananciaPerdidaMonth >= 0 ? "+" : ""}{fmt(gananciaPerdidaMonth)}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1">
                  <PiggyBank size={12} /> Este monto ya suma como ahorro/inversión en Ingresos y Dashboard.
                </p>
              </div>
            )}

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Gastos en USD</p>
                <button
                  onClick={() => { setUsdExpenseForm((f) => ({ ...f, date: defaultDateForMonth(selectedMonth) })); setShowAddUsdExpense(true); }}
                  className="bg-orange-500 hover:bg-orange-600 active:scale-95 transition rounded-xl p-2.5"
                >
                  <Plus size={18} />
                </button>
              </div>
              {monthUsdExpenses.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No hay gastos en USD este mes.</p>
              )}
              <div className="space-y-2">
                {monthUsdExpenses
                  .slice()
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((x) => (
                    <div key={x.id} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{x.desc}</p>
                        <p className="text-xs text-slate-400">{x.date} · ≈ {fmt(Number(x.amount) * usdRate)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-sm">{fmtUSD(x.amount)}</span>
                        <button onClick={() => deleteUsdExpense(x.id)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900 active:scale-95 transition">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Compra de dólares</p>
                <button
                  onClick={() => { setUsdPurchaseForm((f) => ({ ...f, date: defaultDateForMonth(selectedMonth) })); setShowAddUsdPurchase(true); }}
                  className="bg-orange-500 hover:bg-orange-600 active:scale-95 transition rounded-xl p-2.5"
                >
                  <Plus size={18} />
                </button>
              </div>
              {monthUsdPurchases.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No hay compras de dólares este mes.</p>
              )}
              <div className="space-y-2">
                {monthUsdPurchases
                  .slice()
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((x) => (
                    <div key={x.id} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">Compra a {fmt(x.price)} / USD</p>
                        <p className="text-xs text-slate-400">{x.date} · Invertido: {fmt(Number(x.amount) * Number(x.price))}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-sm">{fmtUSD(x.amount)}</span>
                        <button onClick={() => deleteUsdPurchase(x.id)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900 active:scale-95 transition">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {tab === "dashboard" && (
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <p className="text-slate-400 text-xs">Total gastado (gastos + cuotas) — {monthLabel(selectedMonth)}</p>
              <p className="text-2xl font-bold">{fmt(fijoVariable.total)}</p>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2"><PiggyBank size={16} /> Meta de ahorro</p>
              <div>
                <label className="text-xs text-slate-400">Meta total (ARS)</label>
                <input
                  type="number"
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 mt-1"
                />
              </div>
              <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${savingsProgressPct}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Ahorrado histórico (categoría Ahorro + compras de USD)</span>
                <span className="font-semibold text-emerald-400">{fmt(totalAhorroAllTime)} / {fmt(savingsGoal)}</span>
              </div>
              {totalUsdInvertidoAllTime > 0 && (
                <p className="text-[11px] text-slate-500">De ese total, {fmt(totalUsdInvertidoAllTime)} corresponden a compras de dólares.</p>
              )}
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <p className="text-sm font-semibold mb-3">Fijos vs. Variables</p>
              <div className="h-3 rounded-full bg-slate-800 overflow-hidden flex">
                <div className="h-full bg-sky-500" style={{ width: `${fijoVariable.fijoPct}%` }} />
                <div className="h-full bg-fuchsia-500" style={{ width: `${fijoVariable.variablePct}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-sky-400">Fijos {fijoVariable.fijoPct.toFixed(0)}% · {fmt(fijoVariable.fijo)}</span>
                <span className="text-fuchsia-400">Variables {fijoVariable.variablePct.toFixed(0)}% · {fmt(fijoVariable.variable)}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">* Incluye cuotas de tarjetas activas dentro de "Fijos".</p>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <p className="text-sm font-semibold mb-2">Comparativa — últimos 6 meses</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                    <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => l} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#fff" }} />
                    <Bar dataKey="total" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <p className="text-sm font-semibold mb-2">Gastos por categoría</p>
              {pieData.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">Sin datos este mes.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                        {pieData.map((entry) => (
                          <Cell key={entry.id} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => fmt(value)} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#fff" }} />
                      <Legend verticalAlign="bottom" height={36} formatter={(value) => <span style={{ color: "#cbd5e1", fontSize: 12 }}>{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2">
              <p className="text-sm font-semibold mb-1">Detalle por categoría</p>
              {pieData.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-300">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">{((d.value / totalMonthExpenses) * 100 || 0).toFixed(0)}%</span>
                    <span className="font-medium">{fmt(d.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: nuevo gasto */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-20">
          <div className="bg-slate-900 rounded-t-2xl w-full max-w-md p-5 border-t border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold">Nuevo gasto</p>
              <button onClick={() => setShowAddExpense(false)} className="p-1 rounded-lg bg-slate-800"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Descripción" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              <input placeholder="Monto" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.id} onClick={() => setForm({ ...form, category: c.id })} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${form.category === c.id ? "border-transparent text-white" : "border-slate-700 text-slate-300"}`} style={form.category === c.id ? { backgroundColor: c.color } : {}}>
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setForm({ ...form, type: "fijo" })} className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition ${form.type === "fijo" ? "bg-sky-500 border-transparent text-white" : "border-slate-700 text-slate-300"}`}>Fijo</button>
                <button onClick={() => setForm({ ...form, type: "variable" })} className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition ${form.type === "variable" ? "bg-fuchsia-500 border-transparent text-white" : "border-slate-700 text-slate-300"}`}>Variable</button>
              </div>

              {form.type === "fijo" && (
                <div className="bg-sky-950/40 border border-sky-800 rounded-xl p-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-sky-200">
                    <input
                      type="checkbox"
                      checked={form.repeat}
                      onChange={(e) => setForm({ ...form, repeat: e.target.checked })}
                      className="accent-sky-500"
                    />
                    <Repeat size={14} /> Repetir automáticamente en los meses siguientes
                  </label>
                  {form.repeat && (
                    <div>
                      <label className="text-xs text-sky-300">¿Por cuántos meses (incluyendo este)?</label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={form.repeatMonths}
                        onChange={(e) => setForm({ ...form, repeatMonths: e.target.value })}
                        className="w-full bg-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 mt-1"
                      />
                      <p className="text-[11px] text-sky-300/70 mt-1">Se va a cargar este gasto en {monthLabel(selectedMonth)} y en los {Math.max(0, (parseInt(form.repeatMonths, 10) || 1) - 1)} meses siguientes.</p>
                    </div>
                  )}
                </div>
              )}

              <button onClick={addExpense} className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 transition rounded-xl py-2.5 font-semibold">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nueva tarjeta / financiación */}
      {showAddCard && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-20">
          <div className="bg-slate-900 rounded-t-2xl w-full max-w-md p-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold">Nueva tarjeta / financiación</p>
              <button onClick={() => setShowAddCard(false)} className="p-1 rounded-lg bg-slate-800"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Nombre del gasto/tarjeta" value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              <input placeholder="Monto total" type="number" value={cardForm.totalAmount} onChange={(e) => setCardForm({ ...cardForm, totalAmount: e.target.value })} className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              <input placeholder="Cantidad de cuotas" type="number" value={cardForm.installments} onChange={(e) => setCardForm({ ...cardForm, installments: e.target.value })} className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              <div>
                <label className="text-xs text-slate-400">Mes de inicio (cuota 1)</label>
                <input type="month" value={cardForm.startMonth} onChange={(e) => setCardForm({ ...cardForm, startMonth: e.target.value })} className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 mt-1" />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-2">Tipo de tarjeta</p>
                <div className="flex gap-2">
                  {CARD_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setCardForm({ ...cardForm, cardType: t.id })}
                      className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition ${cardForm.cardType === t.id ? "border-transparent text-white" : "border-slate-700 text-slate-300"}`}
                      style={cardForm.cardType === t.id ? { backgroundColor: t.color } : {}}
                    >
                      {t.id}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400">¿De quién es el gasto? ("Propio" si es tuyo)</label>
                <input
                  placeholder="Propio"
                  value={cardForm.owner}
                  onChange={(e) => setCardForm({ ...cardForm, owner: e.target.value })}
                  className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 mt-1"
                />
              </div>
              <p className="text-[11px] text-slate-500">La cuota actual se calcula automáticamente para cada mes según el mes de inicio.</p>
              <button onClick={addCard} className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 transition rounded-xl py-2.5 font-semibold">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nuevo ingreso extra */}
      {showAddExtraIncome && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-20">
          <div className="bg-slate-900 rounded-t-2xl w-full max-w-md p-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold">Nuevo ingreso extra</p>
              <button onClick={() => setShowAddExtraIncome(false)} className="p-1 rounded-lg bg-slate-800"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Ingreso de</label>
                <input
                  placeholder="Ej: Freelance, Venta, Cliente X..."
                  value={extraIncomeForm.name}
                  onChange={(e) => setExtraIncomeForm({ ...extraIncomeForm, name: e.target.value })}
                  className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 mt-1"
                />
              </div>
              <input placeholder="Monto" type="number" value={extraIncomeForm.amount} onChange={(e) => setExtraIncomeForm({ ...extraIncomeForm, amount: e.target.value })} className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              <input type="date" value={extraIncomeForm.date} onChange={(e) => setExtraIncomeForm({ ...extraIncomeForm, date: e.target.value })} className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              <button onClick={addExtraIncome} className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 transition rounded-xl py-2.5 font-semibold">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nuevo gasto en USD */}
      {showAddUsdExpense && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-20">
          <div className="bg-slate-900 rounded-t-2xl w-full max-w-md p-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold">Nuevo gasto en USD</p>
              <button onClick={() => setShowAddUsdExpense(false)} className="p-1 rounded-lg bg-slate-800"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Descripción" value={usdExpenseForm.desc} onChange={(e) => setUsdExpenseForm({ ...usdExpenseForm, desc: e.target.value })} className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              <input placeholder="Monto en USD" type="number" value={usdExpenseForm.amount} onChange={(e) => setUsdExpenseForm({ ...usdExpenseForm, amount: e.target.value })} className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              <input type="date" value={usdExpenseForm.date} onChange={(e) => setUsdExpenseForm({ ...usdExpenseForm, date: e.target.value })} className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              {usdExpenseForm.amount && (
                <p className="text-xs text-slate-400">≈ {fmt(Number(usdExpenseForm.amount) * usdRate)} al tipo de cambio actual</p>
              )}
              <button onClick={addUsdExpense} className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 transition rounded-xl py-2.5 font-semibold">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nueva compra de dólares */}
      {showAddUsdPurchase && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-20">
          <div className="bg-slate-900 rounded-t-2xl w-full max-w-md p-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold">Nueva compra de dólares</p>
              <button onClick={() => setShowAddUsdPurchase(false)} className="p-1 rounded-lg bg-slate-800"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Cantidad de USD comprados" type="number" value={usdPurchaseForm.amount} onChange={(e) => setUsdPurchaseForm({ ...usdPurchaseForm, amount: e.target.value })} className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              <input placeholder="Precio pagado (ARS por USD)" type="number" value={usdPurchaseForm.price} onChange={(e) => setUsdPurchaseForm({ ...usdPurchaseForm, price: e.target.value })} className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              <input type="date" value={usdPurchaseForm.date} onChange={(e) => setUsdPurchaseForm({ ...usdPurchaseForm, date: e.target.value })} className="w-full bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              {usdPurchaseForm.amount && usdPurchaseForm.price && (
                <p className="text-xs text-slate-400">Total invertido: {fmt(Number(usdPurchaseForm.amount) * Number(usdPurchaseForm.price))}</p>
              )}
              <p className="text-[11px] text-emerald-400 flex items-center gap-1"><PiggyBank size={12} /> Esta compra va a sumar como ahorro/inversión y a descontarse del balance del mes.</p>
              <button onClick={addUsdPurchase} className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 transition rounded-xl py-2.5 font-semibold">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Nav inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex items-center justify-around py-2 px-1 max-w-md mx-auto">
        <button onClick={() => setTab("gastos")} className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition ${tab === "gastos" ? "text-orange-400" : "text-slate-500"}`}>
          <Wallet size={19} /><span className="text-[10px]">Gastos</span>
        </button>
        <button onClick={() => setTab("tarjetas")} className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition ${tab === "tarjetas" ? "text-orange-400" : "text-slate-500"}`}>
          <CreditCard size={19} /><span className="text-[10px]">Tarjetas</span>
        </button>
        <button onClick={() => setTab("ingresos")} className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition ${tab === "ingresos" ? "text-orange-400" : "text-slate-500"}`}>
          <DollarSign size={19} /><span className="text-[10px]">Ingresos</span>
        </button>
        <button onClick={() => setTab("usd")} className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition ${tab === "usd" ? "text-orange-400" : "text-slate-500"}`}>
          <Banknote size={19} /><span className="text-[10px]">USD</span>
        </button>
        <button onClick={() => setTab("dashboard")} className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition ${tab === "dashboard" ? "text-orange-400" : "text-slate-500"}`}>
          <PieIcon size={19} /><span className="text-[10px]">Dashboard</span>
        </button>
      </div>
    </div>
  );
}