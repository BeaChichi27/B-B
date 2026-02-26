
# MAS Database - Guida al Deploy su Netlify

Segui questi passi per collegare il tuo Google Sheets e pubblicare il sito:

### 1. Configurazione Google Sheets
- Crea il foglio con le colonne: `booking_id`, `property`, `nome`, `cognome`, `check_in`, `check_out`, `ota`, `totale_soggiorno`, `stato_pagamento`.
- Nella colonna `property` inserisci `omait` o `cb`.

### 2. Variabili d'Ambiente su Netlify
Vai su Netlify > Il tuo Progetto > **Site Configuration** > **Environment variables** e aggiungi:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: L'email del tuo Service Account Google.
- `GOOGLE_PRIVATE_KEY`: La chiave privata (quella che inizia con `-----BEGIN PRIVATE KEY-----`).
- `GOOGLE_SHEET_ID`: L'ID che trovi nell'URL del tuo foglio.

### 3. Firebase (Per i Documenti)
- Crea un progetto su Firebase.
- Abilita **Firestore Database** e **Storage**.
- In **Storage**, vai in "Rules" e imposta l'accesso pubblico in lettura/scrittura (o configura l'auth):
  `allow read, write: if true;` (Attenzione: per produzione, aggiungi regole di sicurezza).
- Copia le chiavi in `services/apiService.ts`.

### 4. Deploy
- Collega il tuo repository GitHub a Netlify o trascina la cartella del progetto.
- Netlify leggerà il file `netlify.toml` e attiverà automaticamente la funzione per leggere i dati da Sheets.

Ogni volta che modifichi il file Sheets, la Dashboard si aggiornerà automaticamente al ricaricamento!
