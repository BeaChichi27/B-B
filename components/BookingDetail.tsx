
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { 
  fetchBookingsFromSheets, 
  fetchManualBookings,
  fetchBookingMetadata, 
  saveInternalNotes, 
  updateDocumentStatus,
  uploadDocumentFile,
  getDocumentUrl,
  downloadDocumentBlob,
  deleteDocumentFile,
  updateBookingData,
  deleteBooking
} from '../services/apiService';
import { FullBooking, DocumentStatus, PropertyId, OTA } from '../types';
import { 
  ArrowLeftIcon, 
  CloudArrowUpIcon,
  CheckBadgeIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  PencilSquareIcon,
  ArchiveBoxArrowDownIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline';

const getDocumentLabels = (propertyId: PropertyId | undefined): Record<keyof DocumentStatus, string> => {
  const baseLabels: Record<keyof DocumentStatus, string> = {
    dettagli_prenotazione: 'Dettagli Prenotazione',
    dettagli_ospiti: 'Documenti Ospiti',
    ricevuta_alloggiati: 'Ricevuta Alloggiati',
    fattura_ota: 'Fattura OTA',
    fattura_soggiorno: 'Fattura Soggiorno'
  };

  if (propertyId === 'cb') {
    return {
      ...baseLabels,
      fattura_soggiorno: 'Ricevuta Soggiorno'
    };
  }

  return baseLabels;
};

const BookingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<FullBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const [dragOverDoc, setDragOverDoc] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{key: keyof DocumentStatus, label: string} | null>(null);
  const [confirmDeleteBooking, setConfirmDeleteBooking] = useState(false);
  const [editForm, setEditForm] = useState<Partial<FullBooking>>({});

  const notesTimeoutRef = useRef<number | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [sheetsData, manualData] = await Promise.all([
        fetchBookingsFromSheets(),
        fetchManualBookings()
      ]);
      
      const allSourceData = [...sheetsData, ...manualData];
      const baseData = allSourceData.find(b => b.booking_id === id);
      const meta = await fetchBookingMetadata(id);
      
      if (!baseData && !meta) throw new Error("Prenotazione non trovata");

      const merged = { ...(baseData || {}), ...(meta || {}) } as FullBooking;
      
      if (!merged.documenti) {
        merged.documenti = {
          dettagli_prenotazione: false,
          dettagli_ospiti: false,
          ricevuta_alloggiati: false,
          fattura_ota: false,
          fattura_soggiorno: false
        };
      }
      
      setBooking(merged);
      setEditForm(merged);
    } catch (error) {
      console.error("Error loading detail", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!booking) return;
    const newNotes = e.target.value;
    setBooking({ ...booking, note_interne: newNotes });

    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = window.setTimeout(async () => {
      setSavingNotes(true);
      await saveInternalNotes(booking.booking_id, newNotes);
      setSavingNotes(false);
    }, 1000);
  };

  const processFile = async (docType: keyof DocumentStatus, file: File) => {
    if (!file || !booking) return;
    if (file.type !== 'application/pdf') {
      alert("Sono accettati solo file PDF.");
      return;
    }

    try {
      setUploadingDoc(docType);
      await uploadDocumentFile(booking.booking_id, docType, file);
      await updateDocumentStatus(booking.booking_id, docType, true);
      
      setBooking(prev => {
        if (!prev) return null;
        return {
          ...prev,
          documenti: { ...(prev.documenti || {} as DocumentStatus), [docType]: true }
        };
      });
    } catch (err) {
      alert("Caricamento fallito.");
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleFileUpload = (docType: keyof DocumentStatus, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(docType, file);
  };

  const executeDelete = async () => {
    if (!booking || !confirmDelete) return;
    const { key } = confirmDelete;

    try {
      setDeletingDoc(key);
      setConfirmDelete(null);
      await deleteDocumentFile(booking.booking_id, key);
      await updateDocumentStatus(booking.booking_id, key, false);
      
      setBooking(prev => {
        if (!prev) return null;
        return {
          ...prev,
          documenti: {
            ...(prev.documenti || {} as DocumentStatus),
            [key]: false
          }
        };
      });
    } catch (err) {
      alert("Errore durante l'eliminazione.");
    } finally {
      setDeletingDoc(null);
    }
  };

  const executeDeleteBooking = async () => {
    if (!booking) return;
    try {
      setLoading(true);
      setConfirmDeleteBooking(false);
      await deleteBooking(booking.booking_id);
      const backPath = booking.property === 'cb' ? '/cb' : '/omait';
      navigate(backPath);
    } catch (err) {
      alert("Errore cancellazione prenotazione.");
      setLoading(false);
    }
  };

  const handlePreview = async (docType: string) => {
    if (!booking) return;
    const url = await getDocumentUrl(booking.booking_id, docType);
    if (url) {
      if (url === "#mock-preview") {
        const blob = await downloadDocumentBlob(booking.booking_id, docType as any);
        if (blob) {
          const fakeUrl = URL.createObjectURL(blob);
          window.open(fakeUrl, '_blank');
        }
      } else {
        window.open(url, '_blank');
      }
    } else {
      alert("Documento non disponibile.");
    }
  };

  const handleDownloadSingle = async (docType: keyof DocumentStatus, label: string) => {
    if (!booking) return;
    try {
      setDownloadingDoc(docType);
      const blob = await downloadDocumentBlob(booking.booking_id, docType);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${label}_${booking.nome}_${booking.cognome}.pdf`;
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
      setDownloadingDoc(null);
    }
  };

  const handleExportZip = async () => {
    if (!booking) return;
    setIsExportingZip(true);
    try {
      const zip = new JSZip();
      const folderName = `${booking.nome}_${booking.cognome}`.replace(/\s+/g, '_');
      const folder = zip.folder(folderName);
      if (!folder) return;

      const labels = getDocumentLabels(booking.property);
      for (const [key, label] of Object.entries(labels)) {
        if (booking.documenti?.[key as keyof DocumentStatus]) {
          const blob = await downloadDocumentBlob(booking.booking_id, key);
          if (blob) folder.file(`${label}.pdf`, blob);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `Scheda_${folderName}.zip`;
      link.click();
    } catch (err) {
      alert("Errore ZIP.");
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    try {
      setLoading(true);
      await updateBookingData(booking.booking_id, editForm);
      await loadData();
      setIsEditModalOpen(false);
    } catch (err) {
      alert("Errore.");
    } finally {
      setLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent, docType: string) => { e.preventDefault(); setDragOverDoc(docType); };
  const onDragLeave = () => { setDragOverDoc(null); };
  const onDrop = (e: React.DragEvent, docType: keyof DocumentStatus) => {
    e.preventDefault(); setDragOverDoc(null);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(docType, file);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y.substring(2)}`;
  };

  if (loading || !booking) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
        <p className="italic text-slate-500 font-medium">Sincronizzazione...</p>
      </div>
    );
  }

  const documentLabels = getDocumentLabels(booking.property);
  const backPath = booking.property === 'cb' ? '/cb' : '/omait';
  const isCB = booking.property === 'cb';
  
  const propertyStyles = {
    text: isCB ? 'text-emerald-600' : 'text-indigo-600',
    bg: isCB ? 'bg-emerald-600' : 'bg-indigo-600',
    hoverBg: isCB ? 'hover:bg-emerald-700' : 'hover:bg-indigo-700',
    hoverText: isCB ? 'hover:text-emerald-600' : 'hover:text-indigo-600',
    ring: isCB ? 'focus:ring-emerald-50' : 'focus:ring-indigo-50',
    dragBg: isCB ? 'bg-emerald-50' : 'bg-indigo-50',
    dragRing: isCB ? 'ring-emerald-400' : 'ring-indigo-400',
    shadow: isCB ? 'shadow-emerald-100' : 'shadow-indigo-100'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link to={backPath} className={`inline-flex items-center gap-2 text-slate-600 ${propertyStyles.hoverText} transition-colors font-medium group`}>
          <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={() => setConfirmDeleteBooking(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-100 rounded-xl text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all shadow-sm">
            <NoSymbolIcon className="w-4 h-4" />
            Cancella Prenotazione
          </button>
          <button onClick={() => { setEditForm(booking); setIsEditModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <PencilSquareIcon className="w-4 h-4" />
            Modifica
          </button>
          <button onClick={handleExportZip} disabled={isExportingZip}
            className={`inline-flex items-center gap-2 px-4 py-2 ${propertyStyles.bg} ${propertyStyles.hoverBg} text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${propertyStyles.shadow} disabled:opacity-50`}>
            {isExportingZip ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArchiveBoxArrowDownIcon className="w-4 h-4" />}
            ZIP
          </button>
        </div>
      </div>

      <header className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between gap-6">
        <div className="space-y-1">
          <div className={`text-sm font-bold uppercase tracking-widest ${propertyStyles.text}`}>{booking.ota}</div>
          <h1 className="text-3xl font-bold text-slate-900">{booking.nome} {booking.cognome}</h1>
        </div>
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-[10px] text-slate-400 uppercase font-black mb-1 tracking-widest">In</div>
            <div className="text-sm font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">{formatDate(booking.check_in)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-400 uppercase font-black mb-1 tracking-widest">Out</div>
            <div className="text-sm font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">{formatDate(booking.check_out)}</div>
          </div>
        </div>
      </header>

      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <DocumentTextIcon className={`w-5 h-5 ${propertyStyles.text}`} />
            File della Prenotazione
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {(Object.keys(documentLabels) as Array<keyof DocumentStatus>).map((docKey) => {
            const isPresent = booking.documenti?.[docKey];
            const isUploading = uploadingDoc === docKey;
            const isDownloading = downloadingDoc === docKey;
            const isDeleting = deletingDoc === docKey;
            const isDragging = dragOverDoc === docKey;

            return (
              <div key={docKey} onDragOver={(e) => onDragOver(e, docKey)} onDragLeave={onDragLeave} onDrop={(e) => onDrop(e, docKey)}
                className={`p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200 ${isDragging ? `${propertyStyles.dragBg} ring-2 ring-inset ${propertyStyles.dragRing} ring-dashed` : 'hover:bg-slate-50'}`}>
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-2 rounded-xl">
                    {isPresent ? <CheckBadgeIcon className="w-6 h-6 text-green-600" /> : <DocumentArrowUpIcon className="w-6 h-6 text-slate-400" />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{documentLabels[docKey]}</div>
                    <div className={`text-[10px] uppercase tracking-widest font-black ${isPresent ? 'text-green-600' : 'text-slate-400'}`}>
                      {isPresent ? 'Disponibile' : 'Mancante'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isPresent && !isDeleting && (
                    <>
                      <button onClick={() => handlePreview(docKey)} title="Anteprima" className="text-slate-400 hover:text-slate-600 p-2 bg-white border border-slate-200 rounded-lg"> <EyeIcon className="w-4 h-4" /> </button>
                      <button disabled={isDownloading} onClick={() => handleDownloadSingle(docKey, documentLabels[docKey])} title="Scarica" className="text-slate-400 hover:text-slate-600 p-2 bg-white border border-slate-200 rounded-lg"> {isDownloading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArrowDownTrayIcon className="w-4 h-4" />} </button>
                      <button onClick={() => setConfirmDelete({key: docKey, label: documentLabels[docKey]})} title="Elimina" className="text-slate-400 hover:text-red-600 p-2 bg-white border border-slate-200 rounded-lg"> <TrashIcon className="w-4 h-4" /> </button>
                    </>
                  )}
                  {isDeleting && <ArrowPathIcon className="w-5 h-5 animate-spin text-red-400 mr-4" />}
                  
                  <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${isUploading ? 'bg-slate-100 text-slate-400' : isPresent ? 'bg-white border border-slate-200 text-slate-600' : `${propertyStyles.bg} text-white shadow-md`}`}>
                    {isUploading ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <CloudArrowUpIcon className="w-3 h-3" />}
                    {isUploading ? '...' : isPresent ? 'Sostituisci' : 'Carica'}
                    <input type="file" className="hidden" accept=".pdf" disabled={isUploading} onChange={(e) => handleFileUpload(docKey, e)} />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Note</h3>
          {savingNotes && <div className="animate-pulse text-[10px] font-black uppercase text-slate-400">Salvataggio...</div>}
        </div>
        <textarea className={`w-full h-32 border border-slate-200 rounded-xl p-4 text-slate-700 outline-none resize-none transition-all focus:ring-4 ${propertyStyles.ring}`} value={booking.note_interne || ''} onChange={handleNotesChange} />
      </section>

      {/* Modale Conferma Eliminazione DOCUMENTO */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600">
                <ExclamationTriangleIcon className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Sei sicuro?</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Stai per eliminare definitivamente il documento <span className="font-bold text-slate-700">"{confirmDelete.label}"</span>.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-colors">Annulla</button>
                <button onClick={executeDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-100">Elimina</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale Conferma Eliminazione PRENOTAZIONE */}
      {confirmDeleteBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600">
                <NoSymbolIcon className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Elimina Prenotazione?</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Stai eliminando l'intera pratica di <span className="font-bold text-slate-700">{booking.nome} {booking.cognome}</span>. Verranno cancellati anche tutti i documenti caricati.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setConfirmDeleteBooking(false)} className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-colors">Annulla</button>
                <button onClick={executeDeleteBooking} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-100">Elimina Tutto</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale Modifica Dati */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Modifica Prenotazione</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 p-1"> <XMarkIcon className="w-6 h-6" /> </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</label>
                  <input required type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-100" value={editForm.nome || ''} onChange={e => setEditForm({...editForm, nome: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cognome</label>
                  <input required type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-100" value={editForm.cognome || ''} onChange={e => setEditForm({...editForm, cognome: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Check-in</label>
                  <input required type="date" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-100" value={editForm.check_in || ''} onChange={e => setEditForm({...editForm, check_in: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Check-out</label>
                  <input required type="date" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-100" value={editForm.check_out || ''} onChange={e => setEditForm({...editForm, check_out: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">OTA / Canale</label>
                <select className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-100 bg-white" 
                  value={editForm.ota} onChange={e => setEditForm({...editForm, ota: e.target.value as OTA})}>
                  <option value="Amenitiz">Amenitiz</option>
                  <option value="Booking">Booking</option>
                  <option value="Airbnb">Airbnb</option>
                  <option value="Expedia">Expedia</option>
                  <option value="Telefono">Telefono</option>
                  <option value="Altro">Altro</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-50">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Chiudi</button>
                <button type="submit" className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg ${propertyStyles.bg} ${propertyStyles.hoverBg}`}>Salva Modifiche</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetail;
