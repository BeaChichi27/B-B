
export type OTA = 'Amenitiz' | 'Booking' | 'Airbnb' | 'Expedia' | 'Telefono' | 'Altro';
export type PropertyId = 'omait' | 'cb';

export interface Booking {
  booking_id: string;
  property: PropertyId;
  nome: string;
  cognome: string;
  check_in: string;
  check_out: string;
  ota: OTA;
  totale_soggiorno: number;
  stato_pagamento: 'Pagato' | 'In sospeso' | 'Rimborsato';
}

export interface DocumentStatus {
  dettagli_prenotazione: boolean;
  dettagli_ospiti: boolean;
  ricevuta_alloggiati: boolean;
  fattura_ota: boolean;
  fattura_soggiorno: boolean;
}

export interface FirestoreBookingData {
  documenti: DocumentStatus;
  note_interne: string;
  created_at: string;
  updated_at: string;
}

export type FullBooking = Booking & Partial<FirestoreBookingData>;

export interface DashboardFilters {
  search: string;
  year: string;
  month: string;
  ota: string;
  incompleteOnly: boolean;
}

export interface PassiveInvoice {
  id: string;
  fornitore: string;
  data_emissione: string;
  numero_fattura: string;
  categoria: 'Acquisti Vari' | 'Commissioni OTA' | 'Lavanderia' | 'Utenze' | 'Manutenzione' | 'Altro';
  note?: string;
  file_name: string;
  created_at: string;
}

export interface CityTaxFile {
  id: string;
  property: PropertyId;
  year: string;
  quarter: number; // 1, 2, 3, 4
  file_name: string;
  uploaded_at: string;
}
