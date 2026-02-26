
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export const handler = async (event, context) => {
  try {
    // Recuperiamo le credenziali dalle variabili d'ambiente di Netlify
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!clientEmail || !privateKey || !sheetId) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Configurazione mancante nelle variabili d'ambiente" }),
      };
    }

    const serviceAccountAuth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo();
    
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    const bookings = rows.map(row => ({
      booking_id: row.get('booking_id'),
      property: row.get('property') || 'omait',
      nome: row.get('nome'),
      cognome: row.get('cognome'),
      check_in: row.get('check_in'),
      check_out: row.get('check_out'),
      ota: row.get('ota'),
      totale_soggiorno: parseFloat(row.get('totale_soggiorno')) || 0,
      stato_pagamento: row.get('stato_pagamento') || 'In sospeso'
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(bookings),
      headers: { "Content-Type": "application/json" }
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
