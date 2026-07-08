import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
  Calendar, 
  PlusCircle, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  PiggyBank,
  ArrowUpRight,
  ChevronRight,
  Layers,
  History
} from 'lucide-react';

export default function App() {
  // ----------------------------------------------------
  // ESTADOS CON CARGA INICIAL DESDE LOCALSTORAGE
  // ----------------------------------------------------
  
  // 1. Transacciones (Gastos e Ingresos mensuales)
  const [transacciones, setTransacciones] = useState(() => {
    const guardado = localStorage.getItem("app_transacciones");
    if (guardado) return JSON.parse(guardado);
    // Datos por defecto si está vacío
    return [
      { id: 1, tipo: 'gasto', categoria: 'Alquiler', detalle: 'Mes corriente', monto: 180000, fecha: '2026-03-01', pagado: true },
      { id: 2, tipo: 'gasto', categoria: 'Servicios', detalle: 'Luz y Gas', monto: 25000, fecha: '2026-03-05', pagado: true },
      { id: 3, tipo: 'ingreso', categoria: 'Sueldo', detalle: 'Haberes principales', monto: 650000, fecha: '2026-03-02', pagado: true },
      { id: 4, tipo: 'gasto', categoria: 'Supermercado', detalle: 'Compra mensual', monto: 85000, fecha: '2026-03-06', pagado: false },
    ];
  });

  // 2. Tarjetas de Crédito
  const [tarjetas, setTarjetas] = useState(() => {
    const guardado = localStorage.getItem("app_tarjetas");
    if (guardado) return JSON.parse(guardado);
    return [
      { id: 1, banco: 'Santander', nombre: 'Visa Black', cierre: '2026-03-20', vencimiento: '2026-03-28', saldoPesos: 125000, saldoDolares: 45, pagada: false },
      { id: 2, banco: 'Galicia', nombre: 'Mastercard Gold', cierre: '2026-03-15', vencimiento: '2026-03-23', saldoPesos: 68000, saldoDolares: 0, pagada: false }
    ];
  });

  // 3. Inversiones Mensuales
  const [inversiones, setInversiones] = useState(() => {
    const guardado = localStorage.getItem("app_inversiones");
    if (guardado) return JSON.parse(guardado);
    return [
      { id: 1, tipo: 'CEDEAR', activo: 'AAPL', cantidad: 3, montoPesos: 45000, fecha: '2026-03-03' },
      { id: 2, tipo: 'FCI', activo: 'Mercado Fondo', cantidad: 1, montoPesos: 100000, fecha: '2026-03-01' },
      { id: 3, tipo: 'Cripto', activo: 'BTC', cantidad: 0.0005, montoPesos: 35000, fecha: '2026-03-05' }
    ];
  });

  // 4. Cotización del Dólar y su historial
  const [precioDolar, setPrecioDolar] = useState(() => {
    const guardado = localStorage.getItem("app_precio_dolar");
    return guardado ? Number(guardado) : 1250;
  });

  const [historialDolar, setHistorialDolar] = useState(() => {
    const guardado = localStorage.getItem("app_historial_dolar");
    if (guardado) return JSON.parse(guardado);
    return [
      { fecha: '2026-01', precio: 1100 },
      { fecha: '2026-02', precio: 1180 },
      { fecha: '2026-03', precio: 1250 }
    ];
  });

  // Estados visuales de la interfaz
  const [vistaActual, setVistaActual] = useState('dashboard');
  const [filtroMes, setFiltroMes] = useState('2026-03');

  // Estados de formularios
  const [nuevoGasto, setNuevoGasto] = useState({ categoria: '', detalle: '', monto: '', fecha: new Date().toISOString().split('T')[0], tipo: 'gasto' });
  const [nuevaInversion, setNuevaInversion] = useState({ tipo: 'CEDEAR', activo: '', cantidad: '', montoPesos: '', fecha: new Date().toISOString().split('T')[0] });
  const [nuevoPrecioDolar, setNuevoPrecioDolar] = useState(precioDolar.toString());

  // ----------------------------------------------------
  // WATCHERS / EFFECTOS PARA DISPARAR EL GUARDADO
  // ----------------------------------------------------
  useEffect(() => {
    localStorage.setItem("app_transacciones", JSON.stringify(transacciones));
  }, [transacciones]);

  useEffect(() => {
    localStorage.setItem("app_tarjetas", JSON.stringify(tarjetas));
  }, [tarjetas]);

  useEffect(() => {
    localStorage.setItem("app_inversiones", JSON.stringify(inversiones));
  }, [inversiones]);

  useEffect(() => {
    localStorage.setItem("app_precio_dolar", precioDolar.toString());
  }, [precioDolar]);

  useEffect(() => {
    localStorage.setItem("app_historial_dolar", JSON.stringify(historialDolar));
  }, [historialDolar]);


  // ----------------------------------------------------
  // LOGICA Y CALCULOS DERIVADOS
  // ----------------------------------------------------
  const calculos = useMemo(() => {
    const ingresosTotal = transacciones
      .filter(t => t.tipo === 'ingreso')
      .reduce((acc, curr) => acc + curr.monto, 0);

    const gastosTotal = transacciones
      .filter(t => t.tipo === 'gasto')
      .reduce((acc, curr) => acc + curr.monto, 0);

    const deudaTarjetasPesos = tarjetas
      .filter(t => !t.pagada)
      .reduce((acc, curr) => acc + curr.saldoPesos + (curr.saldoDolares * precioDolar), 0);

    const inversionesTotal = inversiones
      .reduce((acc, curr) => acc + curr.montoPesos, 0);

    const saldoDisponible = ingresosTotal - gastosTotal - (tarjetas.filter(t => !t.pagada).reduce((acc, curr) => acc + curr.saldoPesos, 0));

    return {
      ingresosTotal,
      gastosTotal,
      deudaTarjetasPesos,
      inversionesTotal,
      saldoDisponible
    };
  }, [transacciones, tarjetas, inversiones, precioDolar]);

  // ----------------------------------------------------
  // ACCIONES / MANEJADORES DE EVENTOS
  // ----------------------------------------------------
  const handleAgregarTransaccion = (e) => {
    e.preventDefault();
    if (!nuevoGasto.categoria || !nuevoGasto.monto) return;

    const nueva = {
      id: Date.now(),
      tipo: nuevoGasto.tipo,
      categoria: nuevoGasto.categoria,
      detalle: nuevoGasto.detalle || 'Sin detalle',
      monto: parseFloat(nuevoGasto.monto),
      fecha: nuevoGasto.fecha,
      pagado: nuevoGasto.tipo === 'ingreso' ? true : false
    };

    setTransacciones([nueva, ...transacciones]);
    setNuevoGasto({ categoria: '', detalle: '', monto: '', fecha: new Date().toISOString().split('T')[0], tipo: 'gasto' });
  };

  const handleAgregarInversion = (e) => {
    e.preventDefault();
    if (!nuevaInversion.activo || !nuevaInversion.montoPesos) return;

    const nueva = {
      id: Date.now(),
      tipo: nuevaInversion.tipo,
      activo: nuevaInversion.activo.toUpperCase(),
      cantidad: nuevaInversion.cantidad ? parseFloat(nuevaInversion.cantidad) : 1,
      montoPesos: parseFloat(nuevaInversion.montoPesos),
      fecha: nuevaInversion.fecha
    };

    setInversiones([nueva, ...inversiones]);
    setNuevaInversion({ tipo: 'CEDEAR', activo: '', cantidad: '', montoPesos: '', fecha: new Date().toISOString().split('T')[0] });
  };

  const handleActualizarDolar = (e) => {
    e.preventDefault();
    const nuevoValor = parseFloat(nuevoPrecioDolar);
    if (isNaN(nuevoValor) || nuevoValor <= 0) return;

    setPrecioDolar(nuevoValor);
    
    const mesActual = new Date().toISOString().slice(0, 7);
    setHistorialDolar(prev => {
      const filtrado = prev.filter(h => h.fecha !== mesActual);
      return [...filtrado, { fecha: mesActual, precio: nuevoValor }].sort((a, b) => a.fecha.localeCompare(b.fecha));
    });
  };

  const handleAlternarPagoTransaccion = (id) => {
    setTransacciones(transacciones.map(t => t.id === id ? { ...t, pagado: !t.pagado } : t));
  };

  const handleAlternarPagoTarjeta = (id) => {
    setTarjetas(tarjetas.map(t => t.id === id ? { ...t, pagada: !t.pagada } : t));
  };

  const handleEliminarTransaccion = (id) => {
    setTransacciones(transacciones.filter(t => t.id !== id));
  };

  const handleEliminarInversion = (id) => {
    setInversiones(inversiones.filter(i => i.id !== id));
  };

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24">
      {/* HEADER DE LA APP */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 p-2 rounded-xl text-slate-950 shadow-lg shadow-emerald-500/20">
            <Layers size={20} />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight text-white">FinanzasPro</h1>
            <p className="text-xs text-slate-400">Control de Gastos y Tarjetas</p>
          </div>
        </div>
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-full px-3 py-1 flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium text-slate-300">USD Blue: {formatearMoneda(precioDolar)}</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* PESTAÑA 1: DASHBOARD PRINCIPAL */}
        {vistaActual === 'dashboard' && (
          <>
            {/* CARD DISPONIBLE */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
              <p className="text-xs font-medium text-slate-400 tracking-wider uppercase">Saldo Neto Mensual Disponible</p>
              <h2 className={`text-3xl font-extrabold mt-1 tracking-tight ${calculos.saldoDisponible >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatearMoneda(calculos.saldoDisponible)}
              </h2>
              <p className="text-[10px] text-slate-500 mt-1">* Descontando gastos fijos asentados y tarjetas de crédito</p>
              
              <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><TrendingUp size={16} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-medium">Ingresos</p>
                    <p className="text-sm font-semibold text-slate-200">{formatearMoneda(calculos.ingresosTotal)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400"><TrendingDown size={16} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-medium">Gastos</p>
                    <p className="text-sm font-semibold text-slate-200">{formatearMoneda(calculos.gastosTotal)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RESUMEN TARJETAS E INVESTMENTS */}
            <div className="grid grid-cols-2 gap-3">
              <div onClick={() => setVistaActual('tarjetas')} className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl cursor-pointer hover:bg-slate-900 transition flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <CreditCard size={18} className="text-amber-400" />
                  <ChevronRight size={14} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Deuda Tarjetas</p>
                  <p className="text-md font-bold text-amber-400 mt-0.5">{formatearMoneda(calculos.deudaTarjetasPesos)}</p>
                </div>
              </div>

              <div onClick={() => setVistaActual('inversiones')} className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl cursor-pointer hover:bg-slate-900 transition flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <PiggyBank size={18} className="text-indigo-400" />
                  <ChevronRight size={14} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Inversiones</p>
                  <p className="text-md font-bold text-indigo-400 mt-0.5">{formatearMoneda(calculos.inversionesTotal)}</p>
                </div>
              </div>
            </div>

            {/* LISTA RAPIDA DE TRANSACCIONES */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-200 tracking-wide">Transacciones Recientes</h3>
                <span onClick={() => setVistaActual('transacciones')} className="text-xs text-emerald-400 font-medium cursor-pointer hover:underline">Ver todas</span>
              </div>

              <div className="space-y-2">
                {transacciones.slice(0, 4).map((t) => (
                  <div key={t.id} className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${t.tipo === 'ingreso' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {t.tipo === 'ingreso' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{t.categoria}</p>
                        <p className="text-[10px] text-slate-400">{t.detalle}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <p className={`text-xs font-bold ${t.tipo === 'ingreso' ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {t.tipo === 'ingreso' ? '+' : '-'}{formatearMoneda(t.monto)}
                        </p>
                        <p className="text-[9px] text-slate-500">{t.fecha}</p>
                      </div>
                      <button 
                        onClick={() => handleAlternarPagoTransaccion(t.id)}
                        className={`p-1 rounded-md transition ${t.pagado ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'}`}
                      >
                        <CheckCircle size={16} fill={t.pagado ? 'currentColor' : 'none'} className={t.pagado ? 'text-slate-950' : ''} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* PESTAÑA 2: CONTROL DE TRANSACCIONES */}
        {vistaActual === 'transacciones' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-bold text-white">Ingresos y Gastos</h2>
              <button onClick={() => setVistaActual('dashboard')} className="text-xs text-slate-400 hover:text-white">Volver</button>
            </div>

            {/* RECUADRO AGREGAR */}
            <form onSubmit={handleAgregarTransaccion} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-3">
              <p className="text-xs font-bold text-slate-300">Añadir Nueva Transacción</p>
              
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button 
                  type="button"
                  onClick={() => setNuevoGasto({ ...nuevoGasto, tipo: 'gasto' })}
                  className={`py-1.5 text-xs font-medium rounded-lg transition ${nuevoGasto.tipo === 'gasto' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400'}`}
                >
                  Gasto
                </button>
                <button 
                  type="button"
                  onClick={() => setNuevoGasto({ ...nuevoGasto, tipo: 'ingreso' })}
                  className={`py-1.5 text-xs font-medium rounded-lg transition ${nuevoGasto.tipo === 'ingreso' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400'}`}
                >
                  Ingreso
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" 
                  placeholder="Categoría (Ej: Súper)" 
                  value={nuevoGasto.categoria}
                  onChange={(e) => setNuevoGasto({ ...nuevoGasto, categoria: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <input 
                  type="number" 
                  placeholder="Monto ($)" 
                  value={nuevoGasto.monto}
                  onChange={(e) => setNuevoGasto({ ...nuevoGasto, monto: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <input 
                type="text" 
                placeholder="Detalle u observación corta" 
                value={nuevoGasto.detalle}
                onChange={(e) => setNuevoGasto({ ...nuevoGasto, detalle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />

              <div className="flex gap-2 items-center">
                <input 
                  type="date" 
                  value={nuevoGasto.fecha}
                  onChange={(e) => setNuevoGasto({ ...nuevoGasto, fecha: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                />
                <button type="submit" className="flex-1 bg-emerald-500 text-slate-950 font-bold text-xs py-2 rounded-xl hover:bg-emerald-400 transition flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/10">
                  <PlusCircle size={14} /> Registrar
                </button>
              </div>
            </form>

            {/* LISTADO DETALLADO */}
            <div className="space-y-2">
              {transacciones.map((t) => (
                <div key={t.id} className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleAlternarPagoTransaccion(t.id)}
                      className={`p-1 rounded-md ${t.pagado ? 'text-emerald-400' : 'text-slate-600'}`}
                    >
                      <CheckCircle size={18} fill={t.pagado ? 'currentColor' : 'none'} className={t.pagado ? 'text-slate-950' : ''} />
                    </button>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-200">{t.categoria}</span>
                        <span className={`text-[8px] px-1.5 py-0.2 rounded-full font-bold uppercase ${t.pagado ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {t.pagado ? 'Asentado' : 'Pendiente'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">{t.detalle} • <span className="text-slate-500">{t.fecha}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${t.tipo === 'ingreso' ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {t.tipo === 'ingreso' ? '+' : '-'}{formatearMoneda(t.monto)}
                    </span>
                    <button onClick={() => handleEliminarTransaccion(t.id)} className="text-slate-600 hover:text-rose-400 p-1 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PESTAÑA 3: TARJETAS DE CRÉDITO */}
        {vistaActual === 'tarjetas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-bold text-white">Tarjetas de Crédito</h2>
              <button onClick={() => setVistaActual('dashboard')} className="text-xs text-slate-400 hover:text-white">Volver</button>
            </div>

            <div className="space-y-3">
              {tarjetas.map((tarjeta) => {
                const totalTarjetaPesos = tarjeta.saldoPesos + (tarjeta.saldoDolares * precioDolar);
                return (
                  <div key={tarjeta.id} className={`border rounded-2xl p-4 transition relative overflow-hidden ${tarjeta.pagada ? 'bg-slate-900/20 border-slate-900 opacity-60' : 'bg-gradient-to-r from-slate-900 to-slate-900/60 border-slate-800'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">{tarjeta.banco}</p>
                        <h3 className="text-sm font-bold text-white">{tarjeta.nombre}</h3>
                      </div>
                      <button 
                        onClick={() => handleAlternarPagoTarjeta(tarjeta.id)}
                        className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border transition ${tarjeta.pagada ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-950 border-slate-800 text-amber-400'}`}
                      >
                        <CheckCircle size={10} /> {tarjeta.pagada ? 'PAGADA' : 'MARCAR PAGADA'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-3 bg-slate-950/40 p-2 rounded-xl border border-slate-800/40">
                      <div>
                        <p className="text-[9px] text-slate-400">Consumo en Pesos</p>
                        <p className="font-semibold text-slate-200">{formatearMoneda(tarjeta.saldoPesos)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400">Consumo en Dólares</p>
                        <p className="font-semibold text-slate-200">US$ {tarjeta.saldoDolares}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-800/60">
                      <div className="flex gap-3 text-slate-400">
                        <span>Cierre: <b>{tarjeta.cierre}</b></span>
                        <span>Vence: <b>{tarjeta.vencimiento}</b></span>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-medium">Total Estimado</p>
                        <p className="text-sm font-black text-amber-400">{formatearMoneda(totalTarjetaPesos)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PESTAÑA 4: INVERSIONES Y CONFIGURACION DOLAR */}
        {vistaActual === 'inversiones' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-bold text-white">Portafolio e Inversiones</h2>
              <button onClick={() => setVistaActual('dashboard')} className="text-xs text-slate-400 hover:text-white">Volver</button>
            </div>

            {/* ACTUALIZAR VALOR DEL BLUE */}
            <form onSubmit={handleActualizarDolar} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-200">Ajustar Cotización Dólar</p>
                <p className="text-[10px] text-slate-400">Afecta el cálculo de tus tarjetas</p>
              </div>
              <div className="flex gap-2 items-center">
                <input 
                  type="number" 
                  value={nuevoPrecioDolar}
                  onChange={(e) => setNuevoPrecioDolar(e.target.value)}
                  className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-center text-white font-bold focus:outline-none"
                />
                <button type="submit" className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white p-1.5 rounded-xl transition">
                  Actualizar
                </button>
              </div>
            </form>

            {/* FORMULARIO AGREGAR ACTIVO */}
            <form onSubmit={handleAgregarInversion} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-3">
              <p className="text-xs font-bold text-slate-300">Registrar Compra / Inversión</p>
              <div className="grid grid-cols-3 gap-2">
                <select 
                  value={nuevaInversion.tipo}
                  onChange={(e) => setNuevaInversion({ ...nuevaInversion, tipo: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="CEDEAR">CEDEAR</option>
                  <option value="FCI">FCI</option>
                  <option value="Cripto">Cripto</option>
                  <option value="Dólar MEP">Dólar MEP</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Activo (AAPL)" 
                  value={nuevaInversion.activo}
                  onChange={(e) => setNuevaInversion({ ...nuevaInversion, activo: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                />
                <input 
                  type="number" 
                  placeholder="Monto ARS" 
                  value={nuevaInversion.montoPesos}
                  onChange={(e) => setNuevaInversion({ ...nuevaInversion, montoPesos: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="flex gap-2 justify-between items-center">
                <input 
                  type="number" 
                  step="any"
                  placeholder="Cantidad (Opcional)" 
                  value={nuevaInversion.cantidad}
                  onChange={(e) => setNuevaInversion({ ...nuevaInversion, cantidad: e.target.value })}
                  className="w-1/3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                />
                <button type="submit" className="flex-1 bg-indigo-500 text-white font-bold text-xs py-2 rounded-xl hover:bg-indigo-400 transition flex items-center justify-center gap-1 shadow-lg shadow-indigo-500/10">
                  <ArrowUpRight size={14} /> Cargar Activo
                </button>
              </div>
            </form>

            {/* PORTAFOLIO LISTADO */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 px-1">Distribución de Activos</p>
              {inversiones.map((inv) => (
                <div key={inv.id} className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <PiggyBank size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{inv.activo}</span>
                        <span className="text-[8px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded-md font-medium tracking-wide">{inv.tipo}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Cantidad: {inv.cantidad} • <span className="text-slate-500">{inv.fecha}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-400">{formatearMoneda(inv.montoPesos)}</span>
                    <button onClick={() => handleEliminarInversion(inv.id)} className="text-slate-600 hover:text-rose-400 p-1 transition">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MENÚ DE NAVEGACIÓN INFERIOR (ESTILO MOBILE) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 px-6 py-2 flex justify-between items-center max-w-md mx-auto z-50 rounded-t-2xl shadow-2xl">
        <button 
          onClick={() => setVistaActual('dashboard')}
          className={`flex flex-col items-center gap-0.5 p-2 transition ${vistaActual === 'dashboard' ? 'text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Layers size={18} />
          <span className="text-[9px]">Inicio</span>
        </button>
        <button 
          onClick={() => setVistaActual('transacciones')}
          className={`flex flex-col items-center gap-0.5 p-2 transition ${vistaActual === 'transacciones' ? 'text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <DollarSign size={18} />
          <span className="text-[9px]">Gastos</span>
        </button>
        <button 
          onClick={() => setVistaActual('tarjetas')}
          className={`flex flex-col items-center gap-0.5 p-2 transition ${vistaActual === 'tarjetas' ? 'text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <CreditCard size={18} />
          <span className="text-[9px]">Tarjetas</span>
        </button>
        <button 
          onClick={() => setVistaActual('inversiones')}
          className={`flex flex-col items-center gap-0.5 p-2 transition ${vistaActual === 'inversiones' ? 'text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <PiggyBank size={18} />
          <span className="text-[9px]">Inversión</span>
        </button>
      </nav>
    </div>
  );
}
