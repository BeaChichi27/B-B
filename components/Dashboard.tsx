
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  fetchBookingsFromSheets, 
  fetchManualBookings, 
  fetchBookingMetadata, 
  addManualBooking,
  downloadDocumentBlob,
  deleteBooking
} from '../services/apiService';
import { Booking, DashboardFilters, FullBooking, OTA, PropertyId } from '../types';
import JSZip from 'jszip';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  CalendarIcon, 
  ExclamationCircleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
  FolderArrowDownIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline';

const MONTH_NAMES = [
  { value: '01', label: 'Gennaio' }, { value: '02', label: 'Febbraio' }, { value: '03', label: 'Marzo' },
  { value: '04', label: 'Aprile' }, { value: '05', label: 'Maggio' }, { value: '06', label: 'Giugno' },
  { value: '07', label: 'Luglio' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Settembre' },
  { value: '10', label: 'Ottobre' }, { value: '11', label: 'Novembre' }, { value: '12', label: 'Dicembre' },
];

const YEARS = ['2025', '2026', '2027', '2028', '2029', '2030'];

interface DashboardProps {
  propertyId: PropertyId;
}

const Dashboard: React.FC<DashboardProps> = ({ propertyId }) => {
  const [bookings, setBookings] = useState<FullBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<FullBooking | null>(null);
  
  const [exportDates, setExportDates] = useState({ start: '', end: '' });
  const [exportProgress, setExportProgress] = useState<{current: number, total: number} | null>(null);

  const [newBooking, setNewBooking] = useState<Partial<Booking>>({
    ota: 'Telefono',
    stato_pagamento: 'In sospeso',
    totale_soggiorno: 0,
    property: propertyId
  });
  const [isSaving, setIsSaving] = useState(false);

  // Colori dinamici
  const primaryColor = propertyId === 'omait' ? 'indigo' : 'emerald';
  const primaryClass = propertyId === 'omait' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700';
  const textPrimaryClass = propertyId === 'omait' ? 'text-indigo-600' : 'text-emerald-600';
  const ringPrimaryClass = propertyId === 'omait' ? 'focus:ring-indigo-500' : 'focus:ring-emerald-500';
  const shadowPrimaryClass = propertyId === 'omait' ? 'shadow-indigo-100' : 'shadow-emerald-100';

  const [filters, setFilters] = useState<DashboardFilters>({
    search: '', year: '', month: '', ota: '', incompleteOnly: false
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [sheetsData, manualData] = await Promise.all([
        fetchBookingsFromSheets(),
        fetchManualBookings()
      ]);
      const allBasic = [...sheetsData, ...manualData];
      const propertyBasic = allBasic.filter(b => b.property === propertyId);
      const enriched = await Promise.all(propertyBasic.map(async (b) => {
        const meta = await fetchBookingMetadata(b.booking_id);
        return { ...b, ...meta };
      }));
      setBookings(enriched);
    } catch (error) {
      console.error("Error loading data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setNewBooking(prev => ({ ...prev, property: propertyId }));
  }, [propertyId]);

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBooking.nome || !newBooking.cognome || !newBooking.check_in || !newBooking.check_out) {
      alert("Compila tutti i campi obbligatori");
      return;
    }
    setIsSaving(true);
    try {
      const bookingToSave: Booking = { ...newBooking as Booking, property: propertyId, booking_id: `MAN-${Date.now()}` };
      await addManualBooking(bookingToSave);
      setIsModalOpen(false);
      setNewBooking({ ota: 'Telefono', stato_pagamento: 'In sospeso', totale_soggiorno: 0, property: propertyId });
      await loadData();
    } catch (err) {
      alert("Errore durante il salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!bookingToDelete) return;
    try {
      setLoading(true);
      await deleteBooking(bookingToDelete.booking_id);
      setBookingToDelete(null);
      await loadData();
    } catch (err) {
      alert("Errore durante la cancellazione");
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!exportDates.start || !exportDates.end) {
      alert("Inserisci entrambe le date per l'esportazione.");
      return;
    }

    const start = new Date(exportDates.start);
    const end = new Date(exportDates.end);

    const filtered = bookings.filter(b => {
      const bDate = new Date(b.check_in);
      return bDate >= start && bDate <= end;
    });

    if (filtered.length === 0) {
      alert("Nessuna prenotazione trovata in questo intervallo di date.");
      return;
    }

    const zip = new JSZip();
    let filesCount = 0;
    const totalFiles = filtered.reduce((acc, b) => acc + (b.documenti ? Object.values(b.documenti).filter(v => v === true).length : 0), 0);
    
    if (totalFiles === 0) {
      alert("Nessun documento trovato per le prenotazioni in questo intervallo.");
      return;
    }

    const sortedFiltered = [...filtered].sort((a,b) => a.check_in.localeCompare(b.check_in));

    setExportProgress({ current: 0, total: totalFiles });

    for (const b of sortedFiltered) {
      const folderName = `${b.nome}_${b.cognome}`.replace(/\s+/g, '_');
      const guestFolder = zip.folder(folderName);
      
      if (b.documenti && guestFolder) {
        for (const [docKey, isPresent] of Object.entries(b.documenti)) {
          if (isPresent) {
            const blob = await downloadDocumentBlob(b.booking_id, docKey);
            if (blob) {
              const label = docKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('_');
              guestFolder.file(`${label}.pdf`, blob);
              filesCount++;
              setExportProgress({ current: filesCount, total: totalFiles });
            }
          }
        }
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `Export_${propertyId.toUpperCase()}_${exportDates.start}_${exportDates.end}.zip`;
    link.click();
    
    setExportProgress(null);
    setIsExportModalOpen(false);
    setExportDates({ start: '', end: '' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y.substring(2)}`;
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = `${b.nome} ${b.cognome}`.toLowerCase().includes(filters.search.toLowerCase());
      const matchesOTA = filters.ota === '' || b.ota === filters.ota;
      const bookingYear = b.check_in.substring(0, 4);
      const bookingMonth = b.check_in.substring(5, 7);
      const matchesYear = filters.year === '' || bookingYear === filters.year;
      const matchesMonth = filters.month === '' || bookingMonth === filters.month;
      const isComplete = b.documenti ? Object.values(b.documenti).every(v => v === true) : false;
      const matchesIncomplete = !filters.incompleteOnly || !isComplete;
      return matchesSearch && matchesOTA && matchesYear && matchesMonth && matchesIncomplete;
    }).sort((a, b) => a.check_in.localeCompare(b.check_in));
  }, [bookings, filters]);

  const otas = Array.from(new Set(bookings.map(b => b.ota)));

  if (loading && bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${textPrimaryClass.replace('text', 'border')}`}></div>
        <p className="text-slate-500 font-medium italic">Sincronizzazione {propertyId.toUpperCase()}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {propertyId === 'omait' ? 'Omait' : 'CB'} 
            <span className="text-slate-400 font-normal text-lg ml-2">Dashboard</span>
          </h2>
          <p className="text-slate-500 text-sm">Gestionale prenotazioni e documenti della struttura.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 transition-all font-semibold text-sm"
          >
            <FolderArrowDownIcon className="w-5 h-5 text-slate-400" />
            Esporta Archivio
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className={`inline-flex items-center gap-2 text-white px-4 py-2 rounded-lg shadow-md transition-all font-semibold text-sm ${primaryClass} ${shadowPrimaryClass}`}
          >
            <PlusIcon className="w-5 h-5" />
            Nuova Prenotazione
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative md:col-span-2">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cerca per nome..." 
              className={`pl-10 w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 ${ringPrimaryClass}`}
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
          <div className="relative">
            <CalendarIcon className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <select 
              className={`pl-10 w-full border border-slate-200 rounded-lg p-2 text-sm outline-none appearance-none bg-white focus:ring-2 ${ringPrimaryClass}`}
              value={filters.year}
              onChange={(e) => setFilters({...filters, year: e.target.value})}
            >
              <option value="">Anni</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="relative">
            <CalendarIcon className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <select 
              className={`pl-10 w-full border border-slate-200 rounded-lg p-2 text-sm outline-none appearance-none bg-white focus:ring-2 ${ringPrimaryClass}`}
              value={filters.month}
              onChange={(e) => setFilters({...filters, month: e.target.value})}
            >
              <option value="">Mesi</option>
              {MONTH_NAMES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="relative">
            <FunnelIcon className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <select 
              className={`pl-10 w-full border border-slate-200 rounded-lg p-2 text-sm outline-none appearance-none bg-white focus:ring-2 ${ringPrimaryClass}`}
              value={filters.ota}
              onChange={(e) => setFilters({...filters, ota: e.target.value})}
            >
              <option value="">Tutte le OTA</option>
              {otas.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="incomplete"
              className={`w-4 h-4 border-slate-300 rounded ${textPrimaryClass.replace('text', 'text')}`}
              checked={filters.incompleteOnly}
              onChange={(e) => setFilters({...filters, incompleteOnly: e.target.checked})}
            />
            <label htmlFor="incomplete" className="text-sm text-slate-600 font-medium cursor-pointer select-none">
              Mostra solo documenti incompleti
            </label>
          </div>
          <div className="text-sm bg-white border border-slate-200 rounded-lg px-4 py-2 shadow-sm text-slate-600">
            Risultati: <span className={`font-bold ${textPrimaryClass}`}>{filteredBookings.length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ospite</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Soggiorno</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Canale</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Documenti</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length > 0 ? filteredBookings.map((booking) => {
                const docStatus = booking.documenti;
                const totalDocs = 5;
                const completedDocs = docStatus ? Object.values(docStatus).filter(v => v === true).length : 0;
                const isAllComplete = completedDocs === totalDocs;
                return (
                  <tr key={booking.booking_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{booking.nome} {booking.cognome}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 font-medium">
                        {formatDate(booking.check_in)} 
                        <span className="text-slate-300 mx-1.5">-</span> 
                        {formatDate(booking.check_out)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        booking.ota === 'Booking' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        booking.ota === 'Airbnb' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                        booking.ota === 'Amenitiz' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                        booking.ota === 'Expedia' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        booking.ota === 'Telefono' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        'bg-slate-50 text-slate-600 border border-slate-100'
                      }`}>
                        {booking.ota}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {isAllComplete ? <CheckCircleIcon className="w-5 h-5 text-green-500" /> : <ExclamationCircleIcon className="w-5 h-5 text-amber-500" />}
                        <span className={`text-xs font-bold ${isAllComplete ? 'text-green-600' : 'text-amber-600'}`}>
                          {completedDocs}/{totalDocs}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => setBookingToDelete(booking)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Elimina Prenotazione"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                        <Link 
                          to={`/booking/${booking.booking_id}`} 
                          className={`${textPrimaryClass} hover:opacity-80 font-bold text-sm inline-flex items-center gap-1 bg-white border border-slate-100 px-3 py-1.5 rounded-lg shadow-sm`}
                        >
                          Apri <ChevronRightIcon className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    {loading ? 'Aggiornamento lista...' : 'Nessuna prenotazione trovata per i criteri selezionati.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Nuova Prenotazione ({propertyId.toUpperCase()})</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSaveManual} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</label>
                  <input required type="text" className={`w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 ${ringPrimaryClass}`} 
                    value={newBooking.nome || ''} onChange={e => setNewBooking({...newBooking, nome: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cognome</label>
                  <input required type="text" className={`w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 ${ringPrimaryClass}`} 
                    value={newBooking.cognome || ''} onChange={e => setNewBooking({...newBooking, cognome: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Check-in</label>
                  <input required type="date" className={`w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 ${ringPrimaryClass}`} 
                    value={newBooking.check_in || ''} onChange={e => setNewBooking({...newBooking, check_in: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Check-out</label>
                  <input required type="date" className={`w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 ${ringPrimaryClass}`} 
                    value={newBooking.check_out || ''} onChange={e => setNewBooking({...newBooking, check_out: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">OTA / Canale</label>
                <select className={`w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white focus:ring-2 ${ringPrimaryClass}`} 
                  value={newBooking.ota} onChange={e => setNewBooking({...newBooking, ota: e.target.value as OTA})}>
                  <option value="Amenitiz">Amenitiz</option>
                  <option value="Booking">Booking</option>
                  <option value="Airbnb">Airbnb</option>
                  <option value="Expedia">Expedia</option>
                  <option value="Telefono">Telefono</option>
                  <option value="Altro">Altro</option>
                </select>
              </div>
              <div className="pt-4 border-t border-slate-50 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">Annulla</button>
                <button disabled={isSaving} type="submit" className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-bold shadow-lg disabled:opacity-50 ${primaryClass} ${shadowPrimaryClass}`}>
                  {isSaving ? 'Salvataggio...' : 'Crea Prenotazione'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Quick Delete */}
      {bookingToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center space-y-4">
              {/* Fixed the "Cannot find name 'primaryId'" error by using 'propertyId' */}
              <div className={`mx-auto w-16 h-16 ${propertyId === 'cb' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'} rounded-full flex items-center justify-center`}>
                <NoSymbolIcon className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">Elimina Prenotazione?</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Stai eliminando <span className="font-bold text-slate-800">{bookingToDelete.nome} {bookingToDelete.cognome}</span>. Verranno cancellati anche i relativi documenti caricati.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setBookingToDelete(null)} className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-colors">Chiudi</button>
                <button onClick={executeDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-100">Conferma</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Esporta Archivio Documenti</h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-sm leading-relaxed">
                Verrà generato un file ZIP contenente una cartella per ogni ospite con i relativi documenti caricati.
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dal (Check-in)</label>
                  <input type="date" className={`w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 ${ringPrimaryClass}`}
                    value={exportDates.start} onChange={e => setExportDates({...exportDates, start: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Al (Check-in)</label>
                  <input type="date" className={`w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 ${ringPrimaryClass}`}
                    value={exportDates.end} onChange={e => setExportDates({...exportDates, end: e.target.value})} />
                </div>
              </div>

              {exportProgress ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>Generazione archivio...</span>
                    <span>{exportProgress.current} / {exportProgress.total} file</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`${primaryClass} h-2 rounded-full transition-all duration-300`} 
                         style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}></div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setIsExportModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">Annulla</button>
                  <button onClick={handleExport} className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-bold shadow-lg inline-flex items-center justify-center gap-2 ${primaryClass} ${shadowPrimaryClass}`}>
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Genera ZIP
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
