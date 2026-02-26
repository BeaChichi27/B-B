
import { Booking, DocumentStatus, PassiveInvoice, CityTaxFile } from '../types';

export const MOCK_BOOKINGS: Booking[] = [
  // OMAIT
  { booking_id: 'BK-2025-001', property: 'omait', nome: 'Alessandro', cognome: 'Bianchi', check_in: '2025-01-10', check_out: '2025-01-15', ota: 'Booking', totale_soggiorno: 550, stato_pagamento: 'Pagato' },
  { booking_id: 'BK-2025-002', property: 'omait', nome: 'Giulia', cognome: 'Rossi', check_in: '2025-01-22', check_out: '2025-01-25', ota: 'Airbnb', totale_soggiorno: 320, stato_pagamento: 'Pagato' },
  { booking_id: 'BK-2025-003', property: 'omait', nome: 'Marco', cognome: 'Verdi', check_in: '2025-02-05', check_out: '2025-02-10', ota: 'Amenitiz', totale_soggiorno: 600, stato_pagamento: 'In sospeso' },
  { booking_id: 'BK-2025-004', property: 'omait', nome: 'Elena', cognome: 'Ferrari', check_in: '2025-02-14', check_out: '2025-02-18', ota: 'Expedia', totale_soggiorno: 750, stato_pagamento: 'Pagato' },
  { booking_id: 'BK-2025-005', property: 'omait', nome: 'Luca', cognome: 'Rizzo', check_in: '2025-03-12', check_out: '2025-03-15', ota: 'Booking', totale_soggiorno: 410, stato_pagamento: 'Pagato' },
  { booking_id: 'BK-2025-006', property: 'omait', nome: 'Sara', cognome: 'Gallo', check_in: '2025-03-25', check_out: '2025-04-01', ota: 'Airbnb', totale_soggiorno: 920, stato_pagamento: 'In sospeso' },
  { booking_id: 'BK-2025-007', property: 'omait', nome: 'Davide', cognome: 'Mancini', check_in: '2025-04-10', check_out: '2025-04-15', ota: 'Telefono', totale_soggiorno: 1100, stato_pagamento: 'Pagato' },
  { booking_id: 'BK-2025-008', property: 'omait', nome: 'Martina', cognome: 'Bruno', check_in: '2025-05-08', check_out: '2025-05-12', ota: 'Booking', totale_soggiorno: 580, stato_pagamento: 'Pagato' },
  { booking_id: 'BK-2025-009', property: 'omait', nome: 'Paolo', cognome: 'Lombardi', check_in: '2025-06-15', check_out: '2025-06-20', ota: 'Expedia', totale_soggiorno: 490, stato_pagamento: 'In sospeso' },
  { booking_id: 'BK-2025-010', property: 'omait', nome: 'Chiara', cognome: 'Moretti', check_in: '2025-07-04', check_out: '2025-07-10', ota: 'Airbnb', totale_soggiorno: 390, stato_pagamento: 'Pagato' },
  
  // CB
  { booking_id: 'BK-2025-011', property: 'cb', nome: 'Roberto', cognome: 'Barbieri', check_in: '2025-08-11', check_out: '2025-08-14', ota: 'Telefono', totale_soggiorno: 300, stato_pagamento: 'Pagato' },
  { booking_id: 'BK-2025-012', property: 'cb', nome: 'Silvia', cognome: 'Fontana', check_in: '2025-09-20', check_out: '2025-09-27', ota: 'Booking', totale_soggiorno: 1250, stato_pagamento: 'In sospeso' },
  { booking_id: 'BK-2025-013', property: 'cb', nome: 'Giovanni', cognome: 'Santoro', check_in: '2025-10-05', check_out: '2025-10-10', ota: 'Expedia', totale_soggiorno: 620, stato_pagamento: 'Pagato' },
  { booking_id: 'BK-2025-014', property: 'cb', nome: 'Francesca', cognome: 'Mariani', check_in: '2025-11-10', check_out: '2025-11-13', ota: 'Airbnb', totale_soggiorno: 440, stato_pagamento: 'Pagato' },
  { booking_id: 'BK-2025-015', property: 'cb', nome: 'Andrea', cognome: 'Rinaldi', check_in: '2025-12-15', check_out: '2025-12-20', ota: 'Altro', totale_soggiorno: 680, stato_pagamento: 'In sospeso' }
];

export const MOCK_DOC_STATUS: Record<string, DocumentStatus> = {
  // OMAIT
  'BK-2025-001': { dettagli_prenotazione: true, dettagli_ospiti: true, ricevuta_alloggiati: true, fattura_ota: true, fattura_soggiorno: true },
  'BK-2025-002': { dettagli_prenotazione: true, dettagli_ospiti: false, ricevuta_alloggiati: false, fattura_ota: false, fattura_soggiorno: false },
  'BK-2025-004': { dettagli_prenotazione: true, dettagli_ospiti: true, ricevuta_alloggiati: false, fattura_ota: false, fattura_soggiorno: true },
  
  // CB
  'BK-2025-011': { dettagli_prenotazione: true, dettagli_ospiti: true, ricevuta_alloggiati: false, fattura_ota: false, fattura_soggiorno: true },
  'BK-2025-012': { dettagli_prenotazione: true, dettagli_ospiti: false, ricevuta_alloggiati: false, fattura_ota: false, fattura_soggiorno: false }
};

export const MOCK_PASSIVE_INVOICES: PassiveInvoice[] = [
  { id: 'INV-1', fornitore: 'Enel Energia', data_emissione: '2024-12-05', numero_fattura: 'E-2024-998', categoria: 'Utenze', file_name: 'enel_dic_24.pdf', created_at: '2024-12-06T10:00:00Z' },
  { id: 'INV-2', fornitore: 'Booking.com BV', data_emissione: '2024-12-02', numero_fattura: 'BK-887722', categoria: 'Commissioni OTA', file_name: 'booking_nov_24.pdf', created_at: '2024-12-03T11:00:00Z' },
  { id: 'INV-3', fornitore: 'Lavanderia Splendido', data_emissione: '2024-12-15', numero_fattura: '2024/FT/12', categoria: 'Lavanderia', file_name: 'lavanderia_15dic.pdf', created_at: '2024-12-16T09:00:00Z' },
  { id: 'INV-4', fornitore: 'Amazon Business', data_emissione: '2024-12-20', numero_fattura: 'AMZ-445566', categoria: 'Acquisti Vari', file_name: 'amazon_lenzuola.pdf', created_at: '2024-12-21T14:00:00Z' },
  { id: 'INV-5', fornitore: 'Leroy Merlin', data_emissione: '2025-01-08', numero_fattura: 'LM-2025-001', categoria: 'Manutenzione', file_name: 'vernice_maniglie.pdf', created_at: '2025-01-09T16:30:00Z' },
  { id: 'INV-6', fornitore: 'Fastweb SPA', data_emissione: '2025-01-05', numero_fattura: 'FW-JAN-25', categoria: 'Utenze', file_name: 'fibra_jan_25.pdf', created_at: '2025-01-06T12:00:00Z' },
  { id: 'INV-7', fornitore: 'Airbnb Ireland', data_emissione: '2025-01-10', numero_fattura: 'AIR-99001', categoria: 'Commissioni OTA', file_name: 'airbnb_comm_jan.pdf', created_at: '2025-01-11T10:00:00Z' },
  { id: 'INV-8', fornitore: 'Commercialista Rossi', data_emissione: '2025-01-15', numero_fattura: 'FT/01/25', categoria: 'Altro', file_name: 'consulenza_gennaio.pdf', created_at: '2025-01-16T18:00:00Z' },
  { id: 'INV-9', fornitore: 'IKEA Italia', data_emissione: '2025-01-20', numero_fattura: 'IK-554433', categoria: 'Acquisti Vari', file_name: 'arredi_camere.pdf', created_at: '2025-01-21T11:00:00Z' },
  { id: 'INV-10', fornitore: 'Idraulico Bianchi', data_emissione: '2025-01-25', numero_fattura: 'IDR-2025-10', categoria: 'Manutenzione', file_name: 'riparazione_bagno.pdf', created_at: '2025-01-26T15:00:00Z' },
  { id: 'INV-11', fornitore: 'Enel Energia', data_emissione: '2025-02-05', numero_fattura: 'E-2025-045', categoria: 'Utenze', file_name: 'enel_feb_25.pdf', created_at: '2025-02-06T10:00:00Z' },
  { id: 'INV-12', fornitore: 'Lavanderia Splendido', data_emissione: '2025-02-12', numero_fattura: '2025/FT/05', categoria: 'Lavanderia', file_name: 'lavanderia_feb.pdf', created_at: '2025-02-13T09:30:00Z' },
  { id: 'INV-13', fornitore: 'Nespresso Italia', data_emissione: '2025-02-14', numero_fattura: 'NESP-8822', categoria: 'Acquisti Vari', file_name: 'capsule_caffe.pdf', created_at: '2025-02-15T12:00:00Z' },
  { id: 'INV-14', fornitore: 'Booking.com BV', data_emissione: '2025-02-10', numero_fattura: 'BK-991144', categoria: 'Commissioni OTA', file_name: 'booking_feb_25.pdf', created_at: '2025-02-11T14:20:00Z' },
  { id: 'INV-15', fornitore: 'Comune - TARI', data_emissione: '2025-02-20', numero_fattura: 'TARI-2025-1', categoria: 'Utenze', file_name: 'tari_rata1.pdf', created_at: '2025-02-21T16:00:00Z' },
  { id: 'INV-16', fornitore: 'Amazon Business', data_emissione: '2025-02-25', numero_fattura: 'AMZ-667788', categoria: 'Acquisti Vari', file_name: 'kit_cortesia.pdf', created_at: '2025-02-26T10:00:00Z' },
  { id: 'INV-17', fornitore: 'Elettricista Verdi', data_emissione: '2025-03-02', numero_fattura: 'EL-005/25', categoria: 'Manutenzione', file_name: 'led_corridoio.pdf', created_at: '2025-03-03T11:45:00Z' },
  { id: 'INV-18', fornitore: 'Fastweb SPA', data_emissione: '2025-03-05', numero_fattura: 'FW-MAR-25', categoria: 'Utenze', file_name: 'fibra_mar_25.pdf', created_at: '2025-03-06T13:00:00Z' },
  { id: 'INV-19', fornitore: 'Airbnb Ireland', data_emissione: '2025-03-08', numero_fattura: 'AIR-00223', categoria: 'Commissioni OTA', file_name: 'airbnb_comm_mar.pdf', created_at: '2025-03-09T10:00:00Z' },
  { id: 'INV-20', fornitore: 'Lavanderia Splendido', data_emissione: '2025-03-12', numero_fattura: '2025/FT/18', categoria: 'Lavanderia', file_name: 'lavanderia_mar.pdf', created_at: '2025-03-13T09:00:00Z' }
];

export const MOCK_CITY_TAX_FILES: CityTaxFile[] = [
  // Omait - 2025
  { id: 'TAX-MOCK-1', property: 'omait', year: '2025', quarter: 1, file_name: 'Ricevuta_Pagamento_Q1_Omait.pdf', uploaded_at: '2025-04-10T10:00:00Z' },
  { id: 'TAX-MOCK-2', property: 'omait', year: '2025', quarter: 1, file_name: 'Comunicazione_Comune_Marzo.pdf', uploaded_at: '2025-04-12T11:30:00Z' },
  { id: 'TAX-MOCK-3', property: 'omait', year: '2025', quarter: 2, file_name: 'Bollettino_Acconto_Maggio.pdf', uploaded_at: '2025-05-20T09:00:00Z' },
  
  // CB - 2025
  { id: 'TAX-MOCK-4', property: 'cb', year: '2025', quarter: 1, file_name: 'CityTax_Q1_CB_Final.pdf', uploaded_at: '2025-04-05T14:00:00Z' },
  { id: 'TAX-MOCK-5', property: 'cb', year: '2025', quarter: 1, file_name: 'Rendiconto_Ospiti_Gennaio.pdf', uploaded_at: '2025-02-10T08:45:00Z' },
  { id: 'TAX-MOCK-6', property: 'cb', year: '2025', quarter: 1, file_name: 'Rendiconto_Ospiti_Febbraio.pdf', uploaded_at: '2025-03-11T10:20:00Z' },
  { id: 'TAX-MOCK-7', property: 'cb', year: '2025', quarter: 2, file_name: 'F24_Soggiorno_Giugno.pdf', uploaded_at: '2025-07-02T16:15:00Z' },
  
  // Omait - 2024 (Esempio storico)
  { id: 'TAX-MOCK-8', property: 'omait', year: '2024', quarter: 4, file_name: 'Saldo_Annuale_2024_Omait.pdf', uploaded_at: '2025-01-15T12:00:00Z' }
];
