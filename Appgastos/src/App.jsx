import React, { useState, useEffect, useMemo } from "react";
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
  /* Inicialización directa desde localStorage si existe, o cae en las semillas */
  const [expenses, setExpenses] = useState(() => {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try { const d = JSON.parse(local); if (d.expenses) return d.expenses; } catch(e){}
    }
    return seedExpenses;
  });

  const [cards, setCards] = useState(() => {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try { const d = JSON.parse(local); if (d.cards) return d.cards.map((c) => ({ cardType: "Visa", owner: "Propio", ...c })); } catch(e){}
    }
    return seedCards;
  });

  const [income, setIncome] = useState(() => {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try { const d = JSON.parse(local); if (d.income) return d.income; } catch(e){}
    }
    return seedIncome;
  });

  const [extraIncomes, setExtraIncomes] = useState(() => {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try { const d = JSON.parse(local); if (d.extraIncomes) return d.extraIncomes; } catch(e){}
    }
    return seedExtraIncomes;
  });

  const [idealPercents, setIdealPercents] = useState(() => {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try { const d = JSON.parse(local); if (d.idealPercents) return d.idealPercents; } catch(e){}
    }
    return seedIdeal;
  });

  const [usdRate, setUsdRate] = useState(() => {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try { const d = JSON.parse(local); if (d.usdRate) return d.usdRate; } catch(e){}
    }
    return 1000;
  });

  const [usdExpenses, setUsdExpenses] = useState(() => {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try { const d = JSON.parse(local); if (d.usdExpenses) return d.usdExpenses; } catch(e){}
    }
    return seedUsdExpenses;
  });

  const [usdPurchases, setUsdPurchases] = useState(() => {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try { const d = JSON.parse(local); if (d.usdPurchases) return d.usdPurchases; } catch(e){}
    }
    return seedUsdPurchases;
  });

  const [savingsGoal, setSavingsGoal] = useState(() => {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try { const d = JSON.parse(local); if (d.savingsGoal) return d.savingsGoal; } catch(e){}
    }
    return seedSavingsGoal;
  });

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

  /* --------- Guardado persistente sincrónico en localStorage --------- */
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ expenses, cards, income, extraIncomes, idealPercents, usdRate, usdExpenses, usdPurchases, savingsGoal })
    );
  }, [expenses, cards, income, extraIncomes, idealPercents, usdRate, usdExpenses, usdPurchases, savingsGoal]);

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
                            <button onClick={() => updateType(e.id, "fijo")} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${e.type === "fijo" ? "bg-sky-500 border-transparent text-white" : "border-slate-700 text-slate-300"}`} >
                              Fijo
                            </button>
                            <button onClick={() => updateType(e.id, "variable")} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${e.type === "variable" ? "bg-fuchsia-500 border-transparent text-white" : "border-slate-700 text-slate-300"}`} >
                              Variable
                            </button>
                          </div>
                        </div>
                        {e.recurringId && (
                          <button onClick={() => deleteExpenseSeries(e.recurringId, e.date)} className="w-full flex items-center justify-center gap-2 text-xs font-medium text-red-300 bg-red-950/40 border border-red-800 rounded-xl py-2 hover:bg-red-950/70 active:scale-95 transition" >
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
                const badge = info.status === "activa" ? { text: `Cuota ${info.num}/${c.installments}`, cls: "bg-sky-500/20 text-sky-300" } : info.status === "finalizada" ? { text: "Finalizada", cls: "bg-slate-700 text-slate-300" } : { text: "Aún no inicia", cls: "bg-amber-500/20 text-amber-300" };
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
                              <button key={t.id} onClick={() => updateCardType(c.id, t.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${c.cardType === t.id ? "bg-slate-100 border-transparent text-slate-950" : "border-slate-700 text-slate-300"}`} >
                                {t.id}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">¿A quién pertenece este consumo?</p>
                          <input type="text" value={c.owner || ""} onChange={(e) => updateCardOwner(c.id, e.target.value)} placeholder="Ej: Propio, Nombre de amigo..." className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {debtorsSummary.length > 0 && (
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Users size={16} /> Resumen de consumos prestados (Deudas)
                </h3>
                <div className="divide-y divide-slate-800">
                  {debtorsSummary.map((d) => (
                    <div key={d.owner} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-200 capitalize">{d.owner}</p>
                        <p className="text-slate-400">{d.items} financiación/es · Total original: {fmt(d.totalPrestado)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-400">{fmt(d.cuotaMes)}</p>
                        <p className="text-[10px] text-slate-500">cuota este mes</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
              <h3 className="text-sm font-semibold text-slate-300">Proyección de Deuda de Tarjetas</h3>
              <div className="h-40 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectionData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip formatter={(v) => fmt(v)} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#fff" }} />
                    <Bar dataKey="total" fill
