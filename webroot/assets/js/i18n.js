// Testi dell'interfaccia in italiano/inglese, con un pulsante per cambiare
// lingua sempre visibile — stesso meccanismo del pulsante tema chiaro/scuro
// già presente in common.js (localStorage + default rilevato dal browser).
//
// UI strings in Italian/English, with an always-visible language toggle —
// same mechanism as the existing light/dark theme button in common.js
// (localStorage + a default guessed from the browser).

const MCA_STRINGS = {
  it: {
    'common.close': 'Chiudi',
    'common.updated': 'Aggiornato: {time}',
    'common.never': 'mai',
    'common.lastCheck': 'Ultimo controllo: {time}',
    'common.lastCheckPending': 'Ultimo controllo: —',
    'common.lastCheckError': 'Ultimo controllo: errore — {message}',
    'common.loading': 'Caricamento…',
    'common.requestFailedStatus': 'Richiesta fallita ({status})',
    'common.requestFailed': 'Richiesta fallita.',
    'common.invalidResponse': 'Risposta del server non valida.',
    'common.error': 'Errore: {message}',
    'common.remove': 'Rimuovi',

    'theme.toggleAriaLabel': 'Cambia tema',
    'theme.switchToLight': 'Passa al tema chiaro',
    'theme.switchToDark': 'Passa al tema scuro',
    'lang.toggleAriaLabel': 'Cambia lingua',

    'duration.seconds': '{n} s',
    'duration.minutes': '{n} min',
    'duration.hoursMinutes': '{h}h {m}min',

    'status.active': 'Fuori ora',
    'status.inactive': 'Non fuori — ultimo aggiornamento {time}',
    'status.since': '· da {duration}',

    'activity.started': '🚶 {name} ha iniziato una passeggiata.',
    'activity.stopped': '🏠 {name} ha finito la passeggiata.',

    'proximity.text': '⚠️ {a} e {b} sono a meno di 50 metri di distanza.',

    'index.title': 'Bacheca cani — {board}',
    'index.h1': 'Bacheca cani',
    'index.subtitle': 'Quartiere di {board}',
    'index.whoHeading': 'Chi sei?',
    'index.whoHint': 'Tocca il tuo nome per aggiornare il tuo stato o i tuoi orari.',
    'index.greeting': 'Ciao, {name}!',
    'index.actionHint': 'Cosa vuoi fare?',
    'index.actionWalk': '🐕 Vai a passeggio',
    'index.actionSchedule': '🗓️ Imposta orari',
    'index.changeUser': '← Non sono io',
    'index.readonlyHeading': 'Solo lettura',
    'index.readonlyHint': "Per dare un'occhiata senza modificare nulla.",
    'index.navBoard': 'Bacheca dal vivo',
    'index.navSchedules': 'Orari abituali',
    'index.footer': 'Gli aggiornamenti vengono inseriti dai proprietari tramite questa pagina.',
    'index.loadError': 'Errore nel caricamento degli utenti.',

    'board.title': 'Bacheca dal vivo — {board}',
    'board.h1': 'Bacheca dal vivo',
    'board.subtitle': 'Si aggiorna da sola ogni 10 secondi',
    'board.navSchedules': 'Orari abituali',
    'board.navHome': 'Home',
    'board.footer': 'Solo lettura.',

    'schedules.title': 'Orari abituali — {board}',
    'schedules.h1': 'Orari abituali',
    'schedules.subtitle': 'Fasce orarie tipiche in cui i cani sono in giro (non è una promessa)',
    'schedules.navBoard': 'Bacheca dal vivo',
    'schedules.navHome': 'Home',
    'schedules.footer': 'Solo lettura.',
    'schedules.noSlots': 'Nessuna fascia oraria indicata.',
    'schedules.lastEdit': 'Ultima modifica: {time}',
    'schedules.loadError': 'Errore nel caricamento: {message}',

    'control.title': 'Il mio stato — {board}',
    'control.h1': 'Il mio stato',
    'control.greetingDefault': 'Ciao',
    'control.greeting': 'Ciao, {name}',
    'control.authErrorTitle': 'Link non valido',
    'control.authErrorBody': "Apri il link privato che ti è stato inviato, con il tuo nome utente nell'indirizzo.",
    'control.activeLabel': 'Fuori ora',
    'control.gpsLabel': 'GPS',
    'control.centerMapAriaLabel': 'Centra la mappa (su tutti quelli fuori, altrimenti su di me)',
    'control.boardHeading': 'Bacheca',
    'control.positionHeading': 'La mia posizione e percorso',
    'control.positionHint': 'Tocca la mappa qui sopra per impostare la tua posizione, oppure trascina il puntino per correggerla — si salva subito. Attiva "GPS" qui sopra per aggiornarla da sola mentre cammini.',
    'control.newRoute': 'Nuovo percorso previsto',
    'control.undoPoint': 'Annulla ultimo punto',
    'control.clearRoute': 'Cancella percorso',
    'control.saveRoute': 'Salva percorso',
    'control.scheduleHeading': 'Orari abituali',
    'control.scheduleHint': 'Fasce orarie tipiche in cui esci con il cane, ogni giorno.',
    'control.addSlot': '+ Aggiungi fascia oraria',
    'control.saveSlots': 'Salva orari',
    'control.navSchedulesAll': 'Orari abituali (tutti)',
    'control.navBoardReadonly': 'Bacheca di sola lettura',
    'control.footer': 'Link privato — non condividerlo.',
    'control.awayOk': 'Capito',

    'control.positionSaved': 'Posizione salvata ✓',
    'control.positionCorrectedGpsOff': 'Posizione corretta a mano — GPS disattivato per non sovrascriverla.',
    'control.gpsUnsupported': 'Il tuo browser non supporta la geolocalizzazione.',
    'control.gpsSharingOn': 'Condivisione GPS attivata — la posizione si aggiorna da sola mentre cammini.',
    'control.gpsLeftZone': 'Sei uscito dalla zona abituale — condivisione GPS disattivata automaticamente per privacy.',
    'control.gpsPermissionDenied': 'Permesso GPS negato — condivisione GPS disattivata.',
    'control.gpsUnavailableRetry': 'GPS momentaneamente non disponibile (copertura scarsa?) — continuo a riprovare.',
    'control.gpsSharingOff': 'Condivisione GPS disattivata.',
    'control.gpsActiveDragHint': 'GPS attivo: trascina il puntino per correggere la posizione, oppure disattiva il GPS.',
    'control.gpsPermissionDeniedShort': 'Permesso GPS negato.',
    'control.gpsTimeout': 'Rilevamento GPS troppo lento (copertura scarsa?).',
    'control.gpsDetectFailed': 'Impossibile rilevare la posizione GPS.',
    'control.routeModeHint': 'Tocca la mappa per aggiungere punti al percorso, in ordine.',
    'control.routeSaved': 'Percorso salvato ✓',
    'control.activeOn': 'Sei "fuori ora" — salvato ✓',
    'control.activeOff': 'Segnato come non fuori: posizione e percorso azzerati ✓',
    'control.slotsIncomplete': 'Completa entrambi gli orari di ogni fascia (o rimuovila).',
    'control.slotsOrder': "L'orario di inizio deve precedere quello di fine.",
    'control.slotsSaved': 'Orari salvati ✓',
    'control.awayMessage': 'Sei stato via {duration}: la tua posizione potrebbe non essersi aggiornata nel frattempo. Controlla il GPS.',
  },
  en: {
    'common.close': 'Close',
    'common.updated': 'Updated: {time}',
    'common.never': 'never',
    'common.lastCheck': 'Last check: {time}',
    'common.lastCheckPending': 'Last check: —',
    'common.lastCheckError': 'Last check: error — {message}',
    'common.loading': 'Loading…',
    'common.requestFailedStatus': 'Request failed ({status})',
    'common.requestFailed': 'Request failed.',
    'common.invalidResponse': 'Invalid server response.',
    'common.error': 'Error: {message}',
    'common.remove': 'Remove',

    'theme.toggleAriaLabel': 'Change theme',
    'theme.switchToLight': 'Switch to light theme',
    'theme.switchToDark': 'Switch to dark theme',
    'lang.toggleAriaLabel': 'Change language',

    'duration.seconds': '{n}s',
    'duration.minutes': '{n} min',
    'duration.hoursMinutes': '{h}h {m}min',

    'status.active': 'Out now',
    'status.inactive': 'Not out — last updated {time}',
    'status.since': '· for {duration}',

    'activity.started': '🚶 {name} started a walk.',
    'activity.stopped': '🏠 {name} finished the walk.',

    'proximity.text': '⚠️ {a} and {b} are less than 50 meters apart.',

    'index.title': 'Dog Board — {board}',
    'index.h1': 'Dog Board',
    'index.subtitle': '{board} neighborhood',
    'index.whoHeading': 'Who are you?',
    'index.whoHint': 'Tap your name to update your status or your schedule.',
    'index.greeting': 'Hi, {name}!',
    'index.actionHint': 'What do you want to do?',
    'index.actionWalk': '🐕 Go for a walk',
    'index.actionSchedule': '🗓️ Set schedule',
    'index.changeUser': "← That's not me",
    'index.readonlyHeading': 'Read-only',
    'index.readonlyHint': 'To take a look without changing anything.',
    'index.navBoard': 'Live board',
    'index.navSchedules': 'Usual schedule',
    'index.footer': 'Updates are entered by the participants themselves through this page.',
    'index.loadError': 'Error loading the participants.',

    'board.title': 'Live Board — {board}',
    'board.h1': 'Live board',
    'board.subtitle': 'Refreshes itself every 10 seconds',
    'board.navSchedules': 'Usual schedule',
    'board.navHome': 'Home',
    'board.footer': 'Read-only.',

    'schedules.title': 'Usual Schedule — {board}',
    'schedules.h1': 'Usual schedule',
    'schedules.subtitle': "Typical time windows the dogs are out (not a promise)",
    'schedules.navBoard': 'Live board',
    'schedules.navHome': 'Home',
    'schedules.footer': 'Read-only.',
    'schedules.noSlots': 'No time window set.',
    'schedules.lastEdit': 'Last edited: {time}',
    'schedules.loadError': 'Error loading: {message}',

    'control.title': 'My Status — {board}',
    'control.h1': 'My status',
    'control.greetingDefault': 'Hi',
    'control.greeting': 'Hi, {name}',
    'control.authErrorTitle': 'Invalid link',
    'control.authErrorBody': 'Open the private link you were sent, with your username in the address.',
    'control.activeLabel': 'Out now',
    'control.gpsLabel': 'GPS',
    'control.centerMapAriaLabel': 'Center the map (on everyone out, otherwise on me)',
    'control.boardHeading': 'Board',
    'control.positionHeading': 'My position and route',
    'control.positionHint': 'Tap the map above to set your position, or drag the pin to correct it — it saves immediately. Turn on "GPS" above to update it automatically while you walk.',
    'control.newRoute': 'New planned route',
    'control.undoPoint': 'Undo last point',
    'control.clearRoute': 'Clear route',
    'control.saveRoute': 'Save route',
    'control.scheduleHeading': 'Usual schedule',
    'control.scheduleHint': 'Typical time windows you take the dog out, every day.',
    'control.addSlot': '+ Add time window',
    'control.saveSlots': 'Save schedule',
    'control.navSchedulesAll': 'Usual schedule (everyone)',
    'control.navBoardReadonly': 'Read-only board',
    'control.footer': "Private link — don't share it.",
    'control.awayOk': 'Got it',

    'control.positionSaved': 'Position saved ✓',
    'control.positionCorrectedGpsOff': "Position corrected by hand — GPS turned off so it doesn't get overwritten.",
    'control.gpsUnsupported': "Your browser doesn't support geolocation.",
    'control.gpsSharingOn': 'GPS sharing turned on — your position updates itself while you walk.',
    'control.gpsLeftZone': 'You left the usual area — GPS sharing turned off automatically for privacy.',
    'control.gpsPermissionDenied': 'GPS permission denied — GPS sharing turned off.',
    'control.gpsUnavailableRetry': 'GPS temporarily unavailable (poor coverage?) — still retrying.',
    'control.gpsSharingOff': 'GPS sharing turned off.',
    'control.gpsActiveDragHint': 'GPS is on: drag the pin to correct your position, or turn GPS off.',
    'control.gpsPermissionDeniedShort': 'GPS permission denied.',
    'control.gpsTimeout': 'GPS detection too slow (poor coverage?).',
    'control.gpsDetectFailed': 'Could not detect GPS position.',
    'control.routeModeHint': 'Tap the map to add points to the route, in order.',
    'control.routeSaved': 'Route saved ✓',
    'control.activeOn': 'You\'re "out now" — saved ✓',
    'control.activeOff': 'Marked as not out: position and route cleared ✓',
    'control.slotsIncomplete': 'Fill in both times for each window (or remove it).',
    'control.slotsOrder': 'The start time must be before the end time.',
    'control.slotsSaved': 'Schedule saved ✓',
    'control.awayMessage': 'You were away for {duration}: your position may not have updated in the meantime. Check your GPS.',
  },
};

/** Sostituisce i segnaposto {chiave} in una stringa con i valori di `vars`. */
function mcaInterpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match);
}

/**
 * Traduce `key` nella lingua corrente, con interpolazione di `vars`. Ripiega
 * sull'altra lingua e poi sulla chiave grezza se manca una voce — così un
 * deploy con traduzioni incomplete non mostra mai una stringa vuota.
 */
function mcaT(key, vars) {
  const lang = mcaGetLang();
  const table = MCA_STRINGS[lang] || {};
  const fallbackLang = lang === 'it' ? 'en' : 'it';
  const raw = Object.prototype.hasOwnProperty.call(table, key)
    ? table[key]
    : (MCA_STRINGS[fallbackLang] && MCA_STRINGS[fallbackLang][key]) || key;
  return mcaInterpolate(raw, vars);
}

const MCA_LANG_STORAGE_KEY = 'mca_lang';

function mcaGetStoredLang() {
  const l = localStorage.getItem(MCA_LANG_STORAGE_KEY);
  return l === 'it' || l === 'en' ? l : null;
}

/** Lingua di default se non è mai stata scelta esplicitamente: dal browser. */
function mcaDetectDefaultLang() {
  const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
  return nav.indexOf('it') === 0 ? 'it' : 'en';
}

function mcaGetLang() {
  return mcaGetStoredLang() || mcaDetectDefaultLang();
}

function mcaSetLang(lang) {
  if (lang !== 'it' && lang !== 'en') return;
  localStorage.setItem(MCA_LANG_STORAGE_KEY, lang);
  document.documentElement.lang = lang;
}

/**
 * Applica le traduzioni a tutti gli elementi statici della pagina: testo per
 * [data-i18n="chiave"], attributi per [data-i18n-attr="attr1:chiave1,attr2:chiave2"].
 * Va richiamata di nuovo a ogni cambio lingua — il contenuto generato
 * dinamicamente (status card, avvisi...) chiama mcaT() direttamente al
 * momento del rendering, quindi si aggiorna da sé al giro di polling
 * successivo; le funzioni che lo richiedono lo ri-eseguono comunque subito
 * (vedi mcaInitLangToggle).
 */
function mcaApplyI18n() {
  document.documentElement.lang = mcaGetLang();
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = mcaT(el.getAttribute('data-i18n'));
  });
  // Come [data-i18n], ma interpola anche {board} con MCA_BOARD_NAME (da
  // config.js) — per i sottotitoli che citano il nome del quartiere/bacheca.
  document.querySelectorAll('[data-i18n-board]').forEach((el) => {
    el.textContent = mcaT(el.getAttribute('data-i18n-board'), { board: typeof MCA_BOARD_NAME !== 'undefined' ? MCA_BOARD_NAME : '' });
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.getAttribute('data-i18n-attr').split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, mcaT(key));
    });
  });
  if (document.title && document.body.dataset.i18nTitle) {
    document.title = mcaT(document.body.dataset.i18nTitle, { board: typeof MCA_BOARD_NAME !== 'undefined' ? MCA_BOARD_NAME : '' });
  }
}

/**
 * Pulsante di cambio lingua nell'intestazione, accanto a quello del tema —
 * stessa convenzione del pulsante ☀️/🌙: l'etichetta mostra la lingua a cui
 * si passerebbe cliccando, non quella corrente.
 */
function mcaInitLangToggle(onSwitch) {
  const btn = document.getElementById('lang-toggle-btn');
  if (!btn) return;

  function updateButton() {
    const current = mcaGetLang();
    btn.textContent = current === 'it' ? 'EN' : 'IT';
    btn.setAttribute('aria-label', mcaT('lang.toggleAriaLabel'));
  }

  btn.addEventListener('click', () => {
    mcaSetLang(mcaGetLang() === 'it' ? 'en' : 'it');
    mcaApplyI18n();
    updateButton();
    if (typeof onSwitch === 'function') onSwitch();
  });

  updateButton();
}

// Applica subito le traduzioni statiche. NON inizializza qui il pulsante di
// cambio lingua: ogni pagina lo fa da sé (in genere in fondo al proprio *.js,
// vicino a dove inizializza il resto), passando un callback che ri-renderizza
// il proprio contenuto dinamico (nomi, orari, avvisi già mostrati...) — che il
// walker generico di mcaApplyI18n() non conosce. Registrarlo qui una volta e
// poi di nuovo in una pagina raddoppierebbe il gestore di click sullo stesso
// pulsante.
document.addEventListener('DOMContentLoaded', mcaApplyI18n);
