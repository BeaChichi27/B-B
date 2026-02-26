
import { Booking, DocumentStatus, FullBooking, FirestoreBookingData, PassiveInvoice, CityTaxFile, PropertyId } from '../types';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, setDoc, deleteDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, getBlob, deleteObject, listAll } from 'firebase/storage';
import { MOCK_BOOKINGS, MOCK_DOC_STATUS, MOCK_PASSIVE_INVOICES, MOCK_CITY_TAX_FILES } from './mockData';

// CONFIGURAZIONE FIREBASE
const firebaseConfig = {
  apiKey: "IL_TUO_API_KEY",
  authDomain: "IL_TUO_PROJECT_ID.firebaseapp.com",
  projectId: "IL_TUO_PROJECT_ID",
  storageBucket: "IL_TUO_PROJECT_ID.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

let app: any;
let db: any;
let storage: any;

try {
  if (firebaseConfig.apiKey !== "IL_TUO_API_KEY") {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
  }
} catch (e) {
  console.warn("Firebase non collegato. Modalità Demo attiva.");
}

// Database temporaneo per la sessione
const MEMORY_DB: Record<string, FirestoreBookingData> = {};
const DELETED_BOOKINGS = new Set<string>(); // Registro eliminazioni locali
const PASSIVE_INVOICES_MEMORY: PassiveInvoice[] = [...MOCK_PASSIVE_INVOICES];
const CITY_TAX_MEMORY: CityTaxFile[] = [...MOCK_CITY_TAX_FILES];

// --- FUNZIONI PRENOTAZIONI ---

export const fetchBookingsFromSheets = async (): Promise<Booking[]> => {
  try {
    const response = await fetch('/.netlify/functions/getBookings');
    if (!response.ok) throw new Error("Errore nel recupero dati");
    const data = await response.json();
    return (data as Booking[]).filter(b => !DELETED_BOOKINGS.has(b.booking_id));
  } catch (error) {
    console.error("Netlify Function non disponibile, uso i Mock:", error);
    return MOCK_BOOKINGS.filter(b => !DELETED_BOOKINGS.has(b.booking_id));
  }
};

export const fetchManualBookings = async (): Promise<Booking[]> => {
  if (!db) {
    return Object.values(MEMORY_DB)
      .filter((b: any) => b.is_manual && !DELETED_BOOKINGS.has(b.booking_id)) as unknown as Booking[];
  }
  try {
    const q = query(collection(db, 'prenotazioni'), where('is_manual', '==', true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => ({ booking_id: doc.id, ...doc.data() } as Booking))
      .filter(b => !DELETED_BOOKINGS.has(b.booking_id));
  } catch (e) { return []; }
};

export const fetchBookingMetadata = async (id: string): Promise<FirestoreBookingData | null> => {
  if (DELETED_BOOKINGS.has(id)) return null;
  if (db) {
    try {
      const docRef = doc(db, 'prenotazioni', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) return docSnap.data() as FirestoreBookingData;
    } catch (e) {}
  }
  if (MEMORY_DB[id]) return MEMORY_DB[id];
  if (MOCK_DOC_STATUS[id]) {
    return { documenti: { ...MOCK_DOC_STATUS[id] }, note_interne: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  }
  return null;
};

export const saveInternalNotes = async (bookingId: string, notes: string): Promise<void> => {
  if (db) await setDoc(doc(db, 'prenotazioni', bookingId), { note_interne: notes, updated_at: new Date().toISOString() }, { merge: true });
  else {
    if (!MEMORY_DB[bookingId]) {
      const meta = await fetchBookingMetadata(bookingId);
      MEMORY_DB[bookingId] = meta || { documenti: {} as DocumentStatus, note_interne: '', created_at: '', updated_at: '' };
    }
    MEMORY_DB[bookingId].note_interne = notes;
    MEMORY_DB[bookingId].updated_at = new Date().toISOString();
  }
};

export const updateDocumentStatus = async (bookingId: string, docKey: keyof DocumentStatus, status: boolean): Promise<void> => {
  if (db) await setDoc(doc(db, 'prenotazioni', bookingId), { documenti: { [docKey]: status }, updated_at: new Date().toISOString() }, { merge: true });
  else { 
    if (!MEMORY_DB[bookingId]) {
      const meta = await fetchBookingMetadata(bookingId);
      MEMORY_DB[bookingId] = meta || { documenti: {} as DocumentStatus, note_interne: '', created_at: '', updated_at: '' };
    }
    MEMORY_DB[bookingId].documenti[docKey] = status; 
    MEMORY_DB[bookingId].updated_at = new Date().toISOString();
  }
};

export const uploadDocumentFile = async (bookingId: string, docType: string, file: File): Promise<void> => {
  if (storage) {
    const fileRef = ref(storage, `documenti/${bookingId}/${docType}.pdf`);
    await uploadBytes(fileRef, file);
  }
};

export const getDocumentUrl = async (bookingId: string, docType: string): Promise<string | null> => {
  if (storage) {
    try {
      return await getDownloadURL(ref(storage, `documenti/${bookingId}/${docType}.pdf`));
    } catch (e) { return null; }
  }
  return "#mock-preview";
};

export const downloadDocumentBlob = async (bookingId: string, docType: string): Promise<Blob | null> => {
  if (storage) {
    try {
      return await getBlob(ref(storage, `documenti/${bookingId}/${docType}.pdf`));
    } catch (e) { return null; }
  }
  return new Blob(["Contenuto Demo PDF"], { type: 'application/pdf' });
};

export const deleteDocumentFile = async (bookingId: string, docType: string): Promise<void> => {
  if (storage) {
    try {
      await deleteObject(ref(storage, `documenti/${bookingId}/${docType}.pdf`));
    } catch (e) {}
  }
};

export const deleteBooking = async (bookingId: string): Promise<void> => {
  DELETED_BOOKINGS.add(bookingId);
  if (db) {
    try {
      await deleteDoc(doc(db, 'prenotazioni', bookingId));
      if (storage) {
        const folderRef = ref(storage, `documenti/${bookingId}`);
        const list = await listAll(folderRef);
        await Promise.all(list.items.map(item => deleteObject(item)));
      }
    } catch (e) {
      console.error("Errore eliminazione Firebase:", e);
    }
  }
  delete MEMORY_DB[bookingId];
};

export const addManualBooking = async (booking: Booking): Promise<void> => {
  const data = { ...booking, is_manual: true, documenti: { dettagli_prenotazione: false, dettagli_ospiti: false, ricevuta_alloggiati: false, fattura_ota: false, fattura_soggiorno: false }, note_interne: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (db) await setDoc(doc(db, 'prenotazioni', booking.booking_id), data);
  else (MEMORY_DB as any)[booking.booking_id] = data;
};

export const updateBookingData = async (bookingId: string, data: Partial<FullBooking>): Promise<void> => {
  if (db) await setDoc(doc(db, 'prenotazioni', bookingId), { ...data, updated_at: new Date().toISOString() }, { merge: true });
  else {
    const existing = MEMORY_DB[bookingId] || {} as any;
    MEMORY_DB[bookingId] = { ...existing, ...data, updated_at: new Date().toISOString() };
  }
};

// --- FUNZIONI FATTURE PASSIVE ---

export const fetchPassiveInvoices = async (): Promise<PassiveInvoice[]> => {
  if (!db) return PASSIVE_INVOICES_MEMORY;
  try {
    const q = query(collection(db, 'fatture_passive'), orderBy('data_emissione', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PassiveInvoice));
  } catch (e) { return []; }
};

export const uploadPassiveInvoice = async (invoice: Omit<PassiveInvoice, 'id'>, file: File): Promise<void> => {
  const id = `INV-${Date.now()}`;
  if (db) {
    // 1. Carica File
    if (storage) {
      const fileRef = ref(storage, `fatture_passive/${id}/${file.name}`);
      await uploadBytes(fileRef, file);
    }
    // 2. Salva Metadati
    await setDoc(doc(db, 'fatture_passive', id), invoice);
  } else {
    PASSIVE_INVOICES_MEMORY.push({ id, ...invoice });
  }
};

export const deletePassiveInvoice = async (id: string, fileName: string): Promise<void> => {
  if (db) {
    try {
      await deleteDoc(doc(db, 'fatture_passive', id));
      if (storage) {
        await deleteObject(ref(storage, `fatture_passive/${id}/${fileName}`));
      }
    } catch (e) {}
  } else {
    const index = PASSIVE_INVOICES_MEMORY.findIndex(inv => inv.id === id);
    if (index > -1) PASSIVE_INVOICES_MEMORY.splice(index, 1);
  }
};

export const getPassiveInvoiceUrl = async (id: string, fileName: string): Promise<string | null> => {
  if (storage) {
    try {
      return await getDownloadURL(ref(storage, `fatture_passive/${id}/${fileName}`));
    } catch (e) { return null; }
  }
  return "#mock-pdf";
};

export const downloadPassiveInvoiceBlob = async (id: string, fileName: string): Promise<Blob | null> => {
  if (storage) {
    try {
      return await getBlob(ref(storage, `fatture_passive/${id}/${fileName}`));
    } catch (e) { return null; }
  }
  return new Blob(["Contenuto Demo Fattura"], { type: 'application/pdf' });
};

// --- FUNZIONI IMPOSTA DI SOGGIORNO ---

export const fetchCityTaxFiles = async (property: PropertyId, year: string): Promise<CityTaxFile[]> => {
  if (!db) return CITY_TAX_MEMORY.filter(f => f.property === property && f.year === year);
  try {
    const q = query(collection(db, 'imposta_soggiorno'), 
      where('property', '==', property), 
      where('year', '==', year),
      orderBy('uploaded_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CityTaxFile));
  } catch (e) { return []; }
};

export const uploadCityTaxFile = async (fileData: Omit<CityTaxFile, 'id'>, file: File): Promise<void> => {
  const id = `TAX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  if (db) {
    if (storage) {
      const fileRef = ref(storage, `imposta_soggiorno/${id}/${file.name}`);
      await uploadBytes(fileRef, file);
    }
    await setDoc(doc(db, 'imposta_soggiorno', id), fileData);
  } else {
    CITY_TAX_MEMORY.push({ id, ...fileData });
  }
};

export const deleteCityTaxFile = async (id: string, fileName: string): Promise<void> => {
  if (db) {
    try {
      await deleteDoc(doc(db, 'imposta_soggiorno', id));
      if (storage) {
        await deleteObject(ref(storage, `imposta_soggiorno/${id}/${fileName}`));
      }
    } catch (e) {}
  } else {
    const index = CITY_TAX_MEMORY.findIndex(f => f.id === id);
    if (index > -1) CITY_TAX_MEMORY.splice(index, 1);
  }
};

export const getCityTaxFileUrl = async (id: string, fileName: string): Promise<string | null> => {
  if (storage) {
    try {
      return await getDownloadURL(ref(storage, `imposta_soggiorno/${id}/${fileName}`));
    } catch (e) { return null; }
  }
  return "#mock-tax-pdf";
};

export const downloadCityTaxBlob = async (id: string, fileName: string): Promise<Blob | null> => {
  if (storage) {
    try {
      return await getBlob(ref(storage, `imposta_soggiorno/${id}/${fileName}`));
    } catch (e) { return null; }
  }
  return new Blob(["Contenuto Demo Imposta Soggiorno"], { type: 'application/pdf' });
};
