
import * as functions from "firebase-functions";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

/**
 * Questa funzione viene eseguita sul server di Firebase.
 * Mantiene segrete le tue credenziali di Google.
 */
export const getBookingsFromSheets = functions.https.onCall(async (data, context) => {
  // 1. Configura l'accesso con il Service Account
  const serviceAccountAuth = new JWT({
    email: 'IL_TUO_SERVICE_ACCOUNT_EMAIL',
    key: 'LA_TUA_PRIVATE_KEY_DAL_JSON'.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  // 2. Carica il foglio
  const doc = new GoogleSpreadsheet('ID_DEL_TUO_FOGLIO_GOOGLE', serviceAccountAuth);
  await doc.loadInfo(); 
  
  const sheet = doc.sheetsByIndex[0]; // Prendi il primo foglio
  const rows = await sheet.getRows();

  // 3. Mappa i dati nelle righe secondo l'interfaccia dell'app
  return rows.map(row => ({
    booking_id: row.get('booking_id'),
    nome: row.get('nome'),
    cognome: row.get('cognome'),
    check_in: row.get('check_in'),
    check_out: row.get('check_out'),
    ota: row.get('ota'),
    stato_pagamento: row.get('stato_pagamento')
  }));
});
