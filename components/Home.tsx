
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  fetchBookingsFromSheets, 
  fetchManualBookings, 
  fetchBookingMetadata,
  fetchPassiveInvoices
} from '../services/apiService';
import { FullBooking, PassiveInvoice } from '../types';
import { 
  BuildingOfficeIcon, 
  BuildingOffice2Icon,
  BanknotesIcon,
  CreditCardIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

const Home: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    omait: { total: 0, pending: 0 },
    cb: { total: 0, pending: 0 },
    invoicesCount: 0,
    recentInvoices: [] as PassiveInvoice[]
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [sheets, manual, invoices] = await Promise.all([
        fetchBookingsFromSheets(),
        fetchManualBookings(),
        fetchPassiveInvoices()
      ]);

      const allBookings = [...sheets, ...manual];
      
      const enrichedBookings = await Promise.all(allBookings.map(async b => {
        const meta = await fetchBookingMetadata(b.booking_id);
        return { ...b, ...meta } as FullBooking;
      }));

      const omait = enrichedBookings.filter(b => b.property === 'omait');
      const cb = enrichedBookings.filter(b => b.property === 'cb');

      const countPending = (list: FullBooking[]) => list.filter(b => {
        if (!b.documenti) return true;
        return Object.values(b.documenti).some(v => v === false);
      }).length;

      setStats({
        omait: { total: omait.length, pending: countPending(omait) },
        cb: { total: cb.length, pending: countPending(cb) },
        invoicesCount: invoices.length,
        recentInvoices: invoices.slice(0, 3)
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const greetings = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buongiorno";
    if (hour < 18) return "Buon pomeriggio";
    return "Buonasera";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        <p className="text-slate-500 font-medium italic">Preparazione Panoramica...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Welcome Header */}
      <header>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          {greetings()}, Mario!
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Ecco lo stato attuale delle tue strutture e della tua amministrazione.</p>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* OMAIT CARD */}
        <div className="group bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 hover:shadow-xl hover:shadow-indigo-100 transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 -mt-12 -mr-12 bg-indigo-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-100">
                <BuildingOffice2Icon className="w-8 h-8" />
              </div>
              <Link to="/omait" className="text-indigo-600 hover:text-indigo-800 font-bold text-sm flex items-center gap-2 group/link">
                Apri Dashboard
                <ArrowRightIcon className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
              </Link>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Omait</h2>
              <p className="text-slate-400 font-medium">Gestione Prenotazioni</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-2xl font-black text-slate-900">{stats.omait.total}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prenotazioni</div>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <div className="text-2xl font-black text-amber-600">{stats.omait.pending}</div>
                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Incomplete</div>
              </div>
            </div>
          </div>
        </div>

        {/* CB CARD */}
        <div className="group bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 hover:shadow-xl hover:shadow-emerald-100 transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 -mt-12 -mr-12 bg-emerald-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="p-4 bg-emerald-600 rounded-3xl text-white shadow-lg shadow-emerald-100">
                <BuildingOfficeIcon className="w-8 h-8" />
              </div>
              <Link to="/cb" className="text-emerald-600 hover:text-emerald-800 font-bold text-sm flex items-center gap-2 group/link">
                Apri Dashboard
                <ArrowRightIcon className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
              </Link>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">CB</h2>
              <p className="text-slate-400 font-medium">Gestione Prenotazioni</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-2xl font-black text-slate-900">{stats.cb.total}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prenotazioni</div>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <div className="text-2xl font-black text-amber-600">{stats.cb.pending}</div>
                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Incomplete</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PASSIVE INVOICES BOX */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-black text-slate-900 flex items-center gap-3">
              <BanknotesIcon className="w-6 h-6 text-slate-500" />
              Ultime Fatture Registrate
            </h3>
            <Link to="/fatture-passive" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Vedi tutte</Link>
          </div>
          <div className="flex-1 p-2">
            <div className="divide-y divide-slate-100">
              {stats.recentInvoices.map(inv => (
                <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-2.5 rounded-xl text-slate-400">
                      <BanknotesIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{inv.fornitore}</div>
                      <div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{inv.categoria} • {inv.data_emissione.split('-').reverse().join('/')}</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-400">#{inv.numero_fattura}</div>
                </div>
              ))}
              {stats.recentInvoices.length === 0 && (
                <div className="p-12 text-center text-slate-400 italic">Nessuna fattura presente.</div>
              )}
            </div>
          </div>
        </div>

        {/* CITY TAX BOX */}
        <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col justify-between shadow-2xl shadow-slate-200">
          <div className="space-y-4">
            <div className="p-4 bg-amber-500 rounded-3xl w-fit shadow-lg shadow-amber-500/20">
              <CreditCardIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-black leading-tight">Imposta di Soggiorno</h3>
            <p className="text-slate-400 text-sm font-medium">Archivia i rendiconti trimestrali e le ricevute di pagamento per il Comune.</p>
          </div>
          <div className="pt-8">
            <Link to="/imposta-soggiorno" className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition-all">
              Gestisci Archivio
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;
