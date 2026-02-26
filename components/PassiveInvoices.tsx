
import React, { useState, useEffect, useMemo } from 'react';
import { 
  fetchPassiveInvoices, 
  uploadPassiveInvoice, 
  deletePassiveInvoice, 
  getPassiveInvoiceUrl,
  downloadPassiveInvoiceBlob 
} from '../services/apiService';
import { PassiveInvoice } from '../types';
import JSZip from 'jszip';
import { 
  BanknotesIcon, 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  CalendarIcon, 
  XMarkIcon, 
  DocumentArrowUpIcon,
  EyeIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  HashtagIcon,
  FolderArrowDownIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const CATEGORIES = ['Acquisti Vari', 'Commissioni OTA', 'Lavanderia', 'Utenze', 'Manutenzione', 'Altro'] as const;

const MONTHS = [
  { v: '01', l: 'Gennaio' }, { v: '02', l: 'Febbraio' }, { v: '03', l: 'Marzo' },
  { v: '04', l: 'Aprile' }, { v: '05', l: 'Maggio' }, { v: '06', l: 'Giugno' },
  { v: '07', l: 'Luglio' }, { v: '08', l: 'Agosto' }, { v: '09', l: 'Settembre' },
  { v: '10', l: 'Ottobre' }, { v: '11', l: 'Novembre' }, { v: '12', l: 'Dicembre' },
];

const YEARS = ['2025', '2026', '2027', '2028', '2029', '2030'];

const PassiveInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<PassiveInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PassiveInvoice | null>(null);
  const [downloadingSingle, setDownloadingSingle] = useState<string | null>(null);

  const [filters, setFilters] = useState({ search: '', year: '', month: '', category: '' });
  const [newInvoice, setNewInvoice] = useState<Partial<PassiveInvoice>>({
    fornitore: '',
    data_emissione: new Date().toISOString().split('T')[0],
    numero_fattura: '',
    categoria: 'Acquisti Vari'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [exportDates, setExportDates] = useState({ start: '', end: '' });
  const [exportProgress, setExportProgress] = useState<{current: number, total: number} | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchPassiveInvoices();
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !newInvoice.fornitore || !newInvoice.numero_fattura) {
      alert("Completa tutti i campi (Fornitore, Nº Fattura) e seleziona un file PDF.");
      return;
    }
    setIsSaving(true);
    try {
      const dataToSave = {
        ...newInvoice,
        file_name: selectedFile.name,
        created_at: new Date().toISOString()
      } as Omit<PassiveInvoice, 'id'>;
      
      await uploadPassiveInvoice(dataToSave, selectedFile);
      setIsModalOpen(false);
      setSelectedFile(null);
      setNewInvoice({ fornitore: '', data_emissione: new Date().toISOString().split('T')[0], numero_fattura: '', categoria: 'Acquisti Vari' });
      await loadData();
    } catch (err) {
      alert("Errore durante il caricamento.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setLoading(true);
      await deletePassiveInvoice(confirmDelete.id, confirmDelete.file_name);
      setConfirmDelete(null);
      await loadData();
    } catch (e) {
      alert("Errore cancellazione.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSingle = async (inv: PassiveInvoice) => {
    try {
      setDownloadingSingle(inv.id);
      const blob = await downloadPassiveInvoiceBlob(inv.id, inv.file_name);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeFornitore = inv.fornitore.replace(/\s+/g, '_');
        const safeNum = inv.numero_fattura.replace(/[\\/]/g, '-');
        a.download = `${inv.data_emissione}_${safeFornitore}_${safeNum}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert("File non trovato.");
      }
    } catch (err) {
      alert("Errore durante il download.");
    } finally {
      setDownloadingSingle(null);
    }
  };

  const handleExport = async () => {
    if (!exportDates.start || !exportDates.end) {
      alert("Inserisci entrambe le date per l'esportazione.");
      return;
    }

    const start = new Date(exportDates.start);
    const end = new Date(exportDates.end);

    const filtered = invoices.filter(inv => {
      const iDate = new Date(inv.data_emissione);
      return iDate >= start && iDate <= end;
    });

    if (filtered.length === 0) {
      alert("Nessuna fattura trovata in questo intervallo di date.");
      return;
    }

    const zip = new JSZip();
    let filesCount = 0;
    const totalFiles = filtered.length;
    
    setExportProgress({ current: 0, total: totalFiles });

    for (const inv of filtered) {
      const blob = await downloadPassiveInvoiceBlob(inv.id, inv.file_name);
      if (blob) {
        const safeFornitore = inv.fornitore.replace(/\s+/g, '_');
        const safeNum = inv.numero_fattura.replace(/[\\/]/g, '-');
        const fileName = `${inv.data_emissione}_${safeFornitore}_${safeNum}.pdf`;
        zip.file(fileName, blob);
      }
      filesCount++;
      setExportProgress({ current: filesCount, total: totalFiles });
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `Archivio_Fatture_Passive_${exportDates.start}_${exportDates.end}.zip`;
    link.click();
    
    setExportProgress(null);
    setIsExportModalOpen(false);
    setExportDates({ start: '', end: '' });
  };

  const openPreview = async (inv: PassiveInvoice) => {
    const url = await getPassiveInvoiceUrl(inv.id, inv.file_name);
    if (url) window.open(url, '_blank');
    else alert("File non trovato.");
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.fornitore.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory = !filters.category || inv.categoria === filters.category;
      const matchesYear = !filters.year || inv.data_emissione.startsWith(filters.year);
      const matchesMonth = !filters.month || inv.data_emissione.split('-')[1] === filters.month;
      return matchesSearch && matchesCategory && matchesYear && matchesMonth;
    });
  }, [invoices, filters]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
        <p className="text-slate-500 font-medium italic">Caricamento Amministrazione...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <BanknotesIcon className="w-8 h-8 text-slate-700" />
            Fatture Passive
          </h2>
          <p className="text-slate-500 text-sm">Archivio digitale delle fatture fornitori e commissioni.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all font-bold text-sm"
          >
            <FolderArrowDownIcon className="w-5 h-5 text-slate-400" />
            Esporta Archivio
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-slate-900 transition-all font-bold text-sm"
          >
            <PlusIcon className="w-5 h-5" />
            Registra Fattura
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Fornitore..." 
              className="pl-10 w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
          <div className="relative">
            <FunnelIcon className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <select 
              className="pl-10 w-full border border-slate-200 rounded-lg p-2 text-sm outline-none appearance-none bg-white focus:ring-2 focus:ring-slate-200"
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
            >
              <option value="">Tutte le Categorie</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="relative">
            <CalendarIcon className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <select 
              className="pl-10 w-full border border-slate-200 rounded-lg p-2 text-sm outline-none appearance-none bg-white focus:ring-2 focus:ring-slate-200"
              value={filters.year}
              onChange={(e) => setFilters({...filters, year: e.target.value})}
            >
              <option value="">Tutti gli Anni</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="relative">
            <CalendarIcon className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <select 
              className="pl-10 w-full border border-slate-200 rounded-lg p-2 text-sm outline-none appearance-none bg-white focus:ring-2 focus:ring-slate-200"
              value={filters.month}
              onChange={(e) => setFilters({...filters, month: e.target.value})}
            >
              <option value="">Tutti i Mesi</option>
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end pt-2 border-t border-slate-50">
          <div className="text-sm bg-white border border-slate-200 rounded-lg px-4 py-2 shadow-sm text-slate-600">
            Fatture in elenco: <span className="font-bold text-slate-800">{filteredInvoices.length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Emissione</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornitore</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">nº fattura</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">
                    {inv.data_emissione.split('-').reverse().join('/')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{inv.fornitore}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                      inv.categoria === 'Commissioni OTA' ? 'bg-amber-50 text-amber-600' :
                      inv.categoria === 'Lavanderia' ? 'bg-blue-50 text-blue-600' :
                      inv.categoria === 'Acquisti Vari' ? 'bg-purple-50 text-purple-600' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {inv.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-lg w-fit">
                       <HashtagIcon className="w-3 h-3 text-slate-400" />
                       {inv.numero_fattura}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openPreview(inv)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                        Visualizza
                      </button>
                      <button 
                        disabled={downloadingSingle === inv.id}
                        onClick={() => handleDownloadSingle(inv)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm disabled:opacity-50"
                      >
                        {downloadingSingle === inv.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                        )}
                        Scarica
                      </button>
                      <button 
                        onClick={() => setConfirmDelete(inv)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all shadow-sm"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        Cancella
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Nessuna fattura trovata per i filtri selezionati.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Registra Nuova Fattura</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornitore</label>
                    <input required type="text" placeholder="Es. Enel, Lavasecco..." className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-slate-100 outline-none" 
                      value={newInvoice.fornitore} onChange={e => setNewInvoice({...newInvoice, fornitore: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">nº fattura</label>
                    <input required type="text" placeholder="Es. 2024/A1, 123..." className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-slate-100 outline-none font-mono" 
                      value={newInvoice.numero_fattura} onChange={e => setNewInvoice({...newInvoice, numero_fattura: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Emissione</label>
                    <input required type="date" className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-slate-100 outline-none" 
                      value={newInvoice.data_emissione} onChange={e => setNewInvoice({...newInvoice, data_emissione: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</label>
                    <select className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-slate-100 outline-none bg-white" 
                      value={newInvoice.categoria} onChange={e => setNewInvoice({...newInvoice, categoria: e.target.value as any})}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <label className={`w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${selectedFile ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <DocumentArrowUpIcon className={`w-10 h-10 mb-2 ${selectedFile ? 'text-slate-800' : 'text-slate-300'}`} />
                    <span className="text-sm font-bold text-slate-600 text-center">
                      {selectedFile ? selectedFile.name : 'Seleziona PDF Fattura'}
                    </span>
                    <input type="file" className="hidden" accept=".pdf" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-600 font-bold bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">Annulla</button>
                <button disabled={isSaving} type="submit" className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-900 shadow-xl shadow-slate-200 transition-all disabled:opacity-50">
                  {isSaving ? 'Registrazione...' : 'Salva Fattura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Esporta Archivio Fatture</h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 text-sm leading-relaxed italic">
                Verrà generato un file ZIP contenente tutte le fatture caricate nel periodo selezionato (data emissione).
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Inizio</label>
                  <input type="date" className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-slate-100"
                    value={exportDates.start} onChange={e => setExportDates({...exportDates, start: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Fine</label>
                  <input type="date" className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-slate-100"
                    value={exportDates.end} onChange={e => setExportDates({...exportDates, end: e.target.value})} />
                </div>
              </div>

              {exportProgress ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Compressione in corso...</span>
                    <span>{exportProgress.current} / {exportProgress.total}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-slate-800 h-2 rounded-full transition-all duration-300" 
                         style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}></div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button onClick={() => setIsExportModalOpen(false)} className="flex-1 py-3 text-slate-600 font-bold bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">Annulla</button>
                  <button onClick={handleExport} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-900 shadow-xl shadow-slate-200 inline-flex items-center justify-center gap-2">
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Scarica ZIP
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-sm overflow-hidden p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600">
              <ExclamationTriangleIcon className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Elimina Documento?</h3>
              <p className="text-slate-500 text-sm">
                Stai eliminando la fattura di <span className="font-bold text-slate-800">{confirmDelete.fornitore}</span> (nº {confirmDelete.numero_fattura}). Questa operazione non può essere annullata.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-colors">Annulla</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 shadow-lg shadow-red-100">Conferma</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassiveInvoices;
