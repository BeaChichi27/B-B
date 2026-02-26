
import React, { useState, useEffect } from 'react';
import { PropertyId, CityTaxFile } from '../types';
import { 
  fetchCityTaxFiles, 
  uploadCityTaxFile, 
  deleteCityTaxFile, 
  getCityTaxFileUrl,
  downloadCityTaxBlob 
} from '../services/apiService';
import { 
  CreditCardIcon, 
  PlusIcon, 
  CalendarIcon, 
  XMarkIcon, 
  DocumentArrowUpIcon,
  EyeIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const YEARS = ['2025', '2026', '2027', '2028', '2029', '2030'];
const QUARTERS = [
  { id: 1, label: '1º Trimestre', months: 'Gen-Feb-Mar' },
  { id: 2, label: '2º Trimestre', months: 'Apr-Mag-Giu' },
  { id: 3, label: '3º Trimestre', months: 'Lug-Ago-Set' },
  { id: 4, label: '4º Trimestre', months: 'Ott-Nov-Dic' },
];

const CityTax: React.FC = () => {
  const [activeProperty, setActiveProperty] = useState<PropertyId>('omait');
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [files, setFiles] = useState<CityTaxFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingQuarter, setUploadingQuarter] = useState<number | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CityTaxFile | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchCityTaxFiles(activeProperty, selectedYear);
      setFiles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProperty, selectedYear]);

  const handleFileUpload = async (quarter: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploadingQuarter(quarter);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.type !== 'application/pdf') {
          alert(`Il file ${file.name} non è un PDF.`);
          continue;
        }
        const fileData: Omit<CityTaxFile, 'id'> = {
          property: activeProperty,
          year: selectedYear,
          quarter: quarter,
          file_name: file.name,
          uploaded_at: new Date().toISOString()
        };
        await uploadCityTaxFile(fileData, file);
      }
      await loadData();
    } catch (err) {
      alert("Errore durante il caricamento.");
    } finally {
      setUploadingQuarter(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setLoading(true);
      await deleteCityTaxFile(confirmDelete.id, confirmDelete.file_name);
      setConfirmDelete(null);
      await loadData();
    } catch (e) {
      alert("Errore cancellazione.");
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (file: CityTaxFile) => {
    const url = await getCityTaxFileUrl(file.id, file.file_name);
    if (url) window.open(url, '_blank');
    else alert("File non trovato.");
  };

  const handleDownload = async (file: CityTaxFile) => {
    try {
      setDownloadingFile(file.id);
      const blob = await downloadCityTaxBlob(file.id, file.file_name);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert("File non trovato.");
      }
    } catch (err) {
      alert("Errore download.");
    } finally {
      setDownloadingFile(null);
    }
  };

  if (loading && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        <p className="text-slate-500 font-medium italic">Caricamento Imposta di Soggiorno...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <CreditCardIcon className="w-8 h-8 text-amber-600" />
            Imposta di Soggiorno
          </h2>
          <p className="text-slate-500 text-sm">Archivio trimestrale dei pagamenti e comunicazioni.</p>
        </div>
        
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
           <button 
             onClick={() => setActiveProperty('omait')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeProperty === 'omait' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
           >
             Omait
           </button>
           <button 
             onClick={() => setActiveProperty('cb')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeProperty === 'cb' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
           >
             CB
           </button>
        </div>
      </header>

      {/* Year Filter */}
      <div className="flex justify-end">
        <div className="relative w-48">
          <CalendarIcon className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
          <select 
            className="pl-10 w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none appearance-none bg-white focus:ring-2 focus:ring-amber-100 shadow-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Quarters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {QUARTERS.map(q => {
          const quarterFiles = files.filter(f => f.quarter === q.id);
          const isUploading = uploadingQuarter === q.id;
          
          return (
            <div key={q.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{q.label}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{q.months}</p>
                </div>
                <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isUploading ? 'bg-slate-100 text-slate-400' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}>
                  {isUploading ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <DocumentArrowUpIcon className="w-3 h-3" />}
                  Carica File
                  <input multiple type="file" className="hidden" accept=".pdf" disabled={isUploading} onChange={(e) => handleFileUpload(q.id, e)} />
                </label>
              </div>

              <div className="flex-1 p-6 space-y-3">
                {quarterFiles.length > 0 ? (
                  <div className="space-y-2">
                    {quarterFiles.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-amber-200 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <CreditCardIcon className="w-5 h-5 text-amber-500 shrink-0" />
                          <div className="truncate">
                            <div className="text-xs font-bold text-slate-700 truncate" title={file.file_name}>{file.file_name}</div>
                            <div className="text-[9px] text-slate-400 font-medium">Caricato il {new Date(file.uploaded_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button onClick={() => handleView(file)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors" title="Visualizza">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button disabled={downloadingFile === file.id} onClick={() => handleDownload(file)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors" title="Scarica">
                            {downloadingFile === file.id ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArrowDownTrayIcon className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setConfirmDelete(file)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors" title="Elimina">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-2xl">
                    <CreditCardIcon className="w-8 h-8 text-slate-200 mb-2" />
                    <p className="text-xs font-medium text-slate-400 italic">Nessun file caricato per questo trimestre.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-sm overflow-hidden p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600">
              <ExclamationTriangleIcon className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Elimina File?</h3>
              <p className="text-slate-500 text-sm">
                Stai eliminando <span className="font-bold text-slate-800">{confirmDelete.file_name}</span>. Questa operazione non può essere annullata.
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

export default CityTax;
