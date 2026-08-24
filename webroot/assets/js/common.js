// Shared constants and helpers used by board.js, schedules.js and control.js.
// MCA_MAP_CENTER / MCA_MAP_ZOOM / MCA_MAP_MIN_ZOOM / MCA_MAP_BOUNDS_RADIUS_DEG /
// MCA_PRIVACY_RADIUS_METERS / MCA_BOARD_NAME come from config.js, loaded
// before this file — see config.example.js for what each one does.

const MCA_MAP_BOUNDS = [
  [MCA_MAP_CENTER[0] - MCA_MAP_BOUNDS_RADIUS_DEG, MCA_MAP_CENTER[1] - MCA_MAP_BOUNDS_RADIUS_DEG],
  [MCA_MAP_CENTER[0] + MCA_MAP_BOUNDS_RADIUS_DEG, MCA_MAP_CENTER[1] + MCA_MAP_BOUNDS_RADIUS_DEG],
];

// Dopo quanto tempo un percorso pianificato smette di essere mostrato come attuale.
const MCA_ROUTE_TTL_MS = 30 * 60 * 1000;

const MCA_BOARD_POLL_MS = 10 * 1000;
const MCA_SCHEDULES_POLL_MS = 60 * 1000;

// Sotto questa distanza tra due posizioni live, mostra un avviso di prossimità.
const MCA_PROXIMITY_ALERT_METERS = 50;

// Oltre questa durata di camminata continua, il tempo trascorso viene mostrato
// con un colore di avviso — utile per accorgersi se "fuori ora" è rimasto acceso
// per dimenticanza.
const MCA_LONG_WALK_WARNING_MS = 2 * 60 * 60 * 1000; // 2 ore

// Oltre questa durata senza un vero aggiornamento della POSIZIONE (non basta un
// qualsiasi tocco al record: un cambio di orari o un percorso salvato non
// contano), il marker sulla mappa lampeggia e l'orario "Aggiornato" si colora —
// un pin fermo da troppo tempo potrebbe non riflettere più dove sei/è davvero.
const MCA_POSITION_STALE_MS = 30 * 1000;

/**
 * true se `live` è "fuori" con una posizione che non viene aggiornata da più di
 * MCA_POSITION_STALE_MS. Usa position_updated_at se presente (aggiornato SOLO
 * quando cambia la posizione); i record salvati prima che questo campo
 * esistesse ripiegano su updated_at, per non segnare tutto come "vecchio" appena
 * dopo il rilascio di questa funzione.
 */
function mcaIsPositionStale(live) {
  if (!live || !live.active || !live.position) return false;
  const ref = live.position_updated_at || live.updated_at;
  if (!ref) return false;
  return (Date.now() - new Date(ref).getTime()) > MCA_POSITION_STALE_MS;
}

/**
 * Segna un elemento del DOM (marker o testo "Aggiornato") con l'istante
 * dell'ultimo aggiornamento di posizione, perché mcaTickPositionFreshness lo
 * possa ricontrollare ogni secondo — non solo a ogni giro di polling — così lo
 * stato "non aggiornato da 30s" compare subito, non fino a 10s dopo.
 */
function mcaTagPositionFreshness(el, live) {
  if (!el) return;
  const isActive = !!(live && live.active && live.position);
  const ref = isActive ? (live.position_updated_at || live.updated_at) : null;
  if (ref) {
    el.setAttribute('data-position-updated-at', String(new Date(ref).getTime()));
  } else {
    el.removeAttribute('data-position-updated-at');
    el.classList.remove('mca-position-stale');
  }
}

function mcaTickPositionFreshness() {
  const now = Date.now();
  document.querySelectorAll('[data-position-updated-at]').forEach((el) => {
    const ts = Number(el.getAttribute('data-position-updated-at'));
    el.classList.toggle('mca-position-stale', now - ts > MCA_POSITION_STALE_MS);
  });
}

setInterval(mcaTickPositionFreshness, 1000);

/** Formatta una durata in millisecondi come "42 min" o "1h 05min". */
function mcaFormatDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) {
    return mcaT('duration.seconds', { n: Math.max(0, Math.floor(ms / 1000)) });
  }
  if (totalMin < 60) {
    return mcaT('duration.minutes', { n: totalMin });
  }
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return mcaT('duration.hoursMinutes', { h: h, m: (m < 10 ? '0' : '') + m });
}

/** Distanza approssimata in metri tra due coordinate (formula di Haversine). */
function mcaHaversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Finestra di tempo su cui stimare la direzione di marcia (freccia sul marker),
// e spostamento minimo perché la direzione sia considerata affidabile (sotto
// questa soglia è solo rumore GPS/tocco, non un vero movimento).
const MCA_HEADING_WINDOW_MS = 30 * 1000;
const MCA_HEADING_MIN_DISTANCE_M = 3;

/** Rotta iniziale (gradi, 0=nord/90=est/...) dal punto 1 al punto 2. */
function mcaBearingDegrees(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLon = toRad(lon2 - lon1);
  const y = Math.sin(deltaLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Icona di una piccola freccia colorata, ruotata secondo la direzione stimata. */
function mcaHeadingArrowIcon(color, headingDeg) {
  return L.divIcon({
    className: 'mca-heading-arrow',
    html: '<div style="width:28px;height:28px;transform:rotate(' + headingDeg + 'deg);">' +
      '<svg width="28" height="28" viewBox="0 0 28 28">' +
      '<polygon points="14,2 18,13 10,13" fill="' + color + '" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>' +
      '</svg></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

/**
 * Legge l'utente dalla query string (?u=). Non c'è un token segreto — pensato
 * per un piccolo gruppo fisso di persone che non condivide pubblicamente
 * questi link — e non viene salvato da nessuna parte (né cookie né localStorage).
 */
function mcaGetAuth() {
  const params = new URLSearchParams(window.location.search);
  const user = params.get('u');
  if (user) {
    return { user };
  }
  return null;
}

/** Fetch di un JSON pubblico con cache-busting: sempre i dati più recenti. */
async function mcaFetchJSON(url) {
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(url + sep + 't=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(mcaT('common.requestFailedStatus', { status: res.status }));
  }
  return res.json();
}

/** POST JSON verso un endpoint PHP di scrittura, con gestione errori uniforme. */
async function mcaPostJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error(mcaT('common.invalidResponse'));
  }
  if (!res.ok || !data || data.ok !== true) {
    throw new Error((data && data.error) || mcaT('common.requestFailed'));
  }
  return data;
}

function mcaLocale() {
  return mcaGetLang() === 'it' ? 'it-IT' : 'en-GB';
}

function mcaFormatDateTime(iso) {
  if (!iso) return mcaT('common.never');
  const d = new Date(iso);
  return d.toLocaleString(mcaLocale(), {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function mcaFormatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString(mcaLocale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Tema chiaro/scuro: di default segue le preferenze del sistema (vedi CSS), ma un
 * clic sul pulsante lo fissa manualmente e lo ricorda per le visite successive.
 * L'attributo data-theme viene già impostato appena possibile da un piccolo script
 * inline in <head> di ogni pagina, per evitare un lampo del tema sbagliato.
 */
function mcaGetStoredTheme() {
  const t = localStorage.getItem('mca_theme');
  return t === 'light' || t === 'dark' ? t : null;
}

function mcaApplyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

function mcaEffectiveTheme() {
  const stored = mcaGetStoredTheme();
  if (stored) return stored;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function mcaInitThemeToggle() {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;

  function updateButton() {
    const eff = mcaEffectiveTheme();
    btn.textContent = eff === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-label', eff === 'dark' ? mcaT('theme.switchToLight') : mcaT('theme.switchToDark'));
  }

  btn.addEventListener('click', () => {
    const next = mcaEffectiveTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem('mca_theme', next);
    mcaApplyTheme(next);
    updateButton();
  });

  updateButton();
}

document.addEventListener('DOMContentLoaded', mcaInitThemeToggle);

/**
 * Aggiorna marker (posizione live), freccia di direzione stimata, e polyline
 * (percorso previsto, se ancora fresco) di un utente su una mappa Leaflet, in
 * base al contenuto del suo live_<id>.json. `layers` è un oggetto persistente
 * { marker, headingArrow, positionHistory, polyline, polylineCasing } per
 * quell'utente, mutato in place — usata sia dalla bacheca di sola lettura sia
 * dalla pagina di controllo (lì per ogni ALTRO utente: i propri livelli
 * restano sotto controllo diretto dei tocchi sulla mappa, per non essere
 * sovrascritti da un polling di mezzo).
 */
function mcaUpdateUserMapLayers(map, layers, user, live) {
  const isActive = !!live.active;
  layers.positionHistory = layers.positionHistory || [];

  // Anello bianco spesso attorno al colore pieno: resta leggibile su qualsiasi
  // sfondo della mappa (verde, blu, sentieri chiari...), non solo su alcuni.
  if (isActive && live.position) {
    const latlng = [live.position.lat, live.position.lon];
    if (!layers.marker) {
      layers.marker = L.circleMarker(latlng, {
        radius: 10, color: '#ffffff', weight: 3, fillColor: user.color, fillOpacity: 1,
      }).addTo(map).bindPopup(user.name);
    } else {
      layers.marker.setLatLng(latlng);
    }
    mcaTagPositionFreshness(layers.marker.getElement(), live);

    // Stima la direzione di marcia dallo spostamento netto nella finestra degli
    // ultimi MCA_HEADING_WINDOW_MS, usando l'orario vero della posizione
    // (live.updated_at) — non quello del polling — così la finestra riflette il
    // tempo realmente trascorso, non la frequenza con cui la pagina controlla.
    const sampleAt = live.updated_at ? new Date(live.updated_at).getTime() : Date.now();
    const lastSample = layers.positionHistory[layers.positionHistory.length - 1];
    if (!lastSample || lastSample.at !== sampleAt) {
      layers.positionHistory.push({ lat: live.position.lat, lon: live.position.lon, at: sampleAt });
    }
    layers.positionHistory = layers.positionHistory.filter((s) => sampleAt - s.at <= MCA_HEADING_WINDOW_MS);

    const oldest = layers.positionHistory[0];
    const newest = layers.positionHistory[layers.positionHistory.length - 1];
    const movedMeters = oldest && newest && oldest !== newest
      ? mcaHaversineMeters(oldest.lat, oldest.lon, newest.lat, newest.lon) : 0;

    if (movedMeters >= MCA_HEADING_MIN_DISTANCE_M) {
      const heading = mcaBearingDegrees(oldest.lat, oldest.lon, newest.lat, newest.lon);
      const icon = mcaHeadingArrowIcon(user.color, heading);
      if (!layers.headingArrow) {
        layers.headingArrow = L.marker(latlng, { icon, interactive: false }).addTo(map);
      } else {
        layers.headingArrow.setLatLng(latlng);
        layers.headingArrow.setIcon(icon);
      }
    } else if (layers.headingArrow) {
      map.removeLayer(layers.headingArrow);
      layers.headingArrow = null;
    }
  } else {
    if (layers.marker) {
      map.removeLayer(layers.marker);
      layers.marker = null;
    }
    if (layers.headingArrow) {
      map.removeLayer(layers.headingArrow);
      layers.headingArrow = null;
    }
    layers.positionHistory = [];
  }

  mcaUpdateRouteLayers(map, layers, user.color, live.route, live.route_updated_at);
}

/**
 * Disegna (o rimuove) la polyline di un percorso, con guaina bianca di contrasto,
 * se ha almeno 2 punti ed è ancora "fresco" (entro MCA_ROUTE_TTL_MS dal suo
 * ultimo salvataggio). `layers` è un oggetto persistente { polyline, polylineCasing }.
 * Condivisa tra il rendering del percorso di ogni ALTRO utente (dentro
 * mcaUpdateUserMapLayers) e quello del proprio percorso confermato — quest'ultimo
 * altrimenti non avrebbe mai un posto dove ridisegnarsi dopo il salvataggio.
 */
function mcaUpdateRouteLayers(map, layers, color, route, routeUpdatedAt) {
  const routeFresh = !!routeUpdatedAt &&
    (Date.now() - new Date(routeUpdatedAt).getTime()) < MCA_ROUTE_TTL_MS;
  const hasRoute = Array.isArray(route) && route.length > 1;

  // Il percorso ha una "guaina" bianca sotto la linea colorata tratteggiata,
  // per lo stesso motivo di contrasto del marker.
  if (routeFresh && hasRoute) {
    const latlngs = route.map((p) => [p.lat, p.lon]);
    if (!layers.polylineCasing) {
      layers.polylineCasing = L.polyline(latlngs, {
        color: '#ffffff', weight: 7, opacity: 0.9, lineCap: 'round', lineJoin: 'round',
      }).addTo(map);
      layers.polyline = L.polyline(latlngs, {
        color: color, weight: 4, dashArray: '8 8', opacity: 0.95,
      }).addTo(map);
    } else {
      layers.polylineCasing.setLatLngs(latlngs);
      layers.polyline.setLatLngs(latlngs);
    }
  } else {
    if (layers.polylineCasing) {
      map.removeLayer(layers.polylineCasing);
      layers.polylineCasing = null;
    }
    if (layers.polyline) {
      map.removeLayer(layers.polyline);
      layers.polyline = null;
    }
  }
}

/**
 * Se almeno due utenti tra quelli indicati sono "fuori" e hanno una posizione,
 * inquadra la mappa per mostrarli tutti (zoomando fuori quanto serve, ma mai
 * più vicino del livello di zoom iniziale del quartiere). Se è uno solo,
 * centra su di lui. Altrimenti torna alla vista iniziale. Non fa nulla se la
 * situazione osservata è identica all'ultima volta (tenuta in memoria su
 * `map`), per non disturbare inutilmente un utente che nel frattempo ha
 * spostato/zoomato la mappa a mano.
 */
function mcaFitMapToActiveUsers(map, livesById, userIds) {
  const signature = userIds.map((id) => {
    const live = livesById[id];
    if (!live || !live.active || !live.position) return id + ':fuori-no';
    return id + ':' + live.position.lat.toFixed(5) + ',' + live.position.lon.toFixed(5);
  }).join('|');

  if (map._mcaFitSignature === signature) return;
  map._mcaFitSignature = signature;

  const activePositions = userIds
    .map((id) => livesById[id])
    .filter((live) => live && live.active && live.position)
    .map((live) => [live.position.lat, live.position.lon]);

  // `animate: false`: con l'animazione di default, se il riquadro non è a fuoco
  // o lo schermo del telefono è spento (molto comune proprio mentre si cammina),
  // Chrome può bloccare i frame dell'animazione e la mappa resta "a metà
  // strada" — spesso proprio sulla vista iniziale invece che su quella nuova.
  // Uno spostamento istantaneo non dipende da quei frame ed è più adatto a un
  // avviso di sicurezza: meglio vedere subito la posizione giusta.
  if (activePositions.length >= 2) {
    map.fitBounds(activePositions, { padding: [40, 40], maxZoom: MCA_MAP_ZOOM, animate: false });
  } else if (activePositions.length === 1) {
    map.setView(activePositions[0], MCA_MAP_ZOOM, { animate: false });
  } else {
    map.setView(MCA_MAP_CENTER, MCA_MAP_ZOOM, { animate: false });
  }
}

/** Crea o aggiorna la card di stato ("Fuori ora" / "Non fuori — ...") di un utente. */
function mcaRenderStatusCard(container, user, live) {
  let el = document.getElementById('status-card-' + user.id);
  if (!el) {
    el = document.createElement('div');
    el.className = 'card';
    el.id = 'status-card-' + user.id;
    container.appendChild(el);
  }

  const isActive = !!live.active;
  const chipClass = isActive ? 'active' : 'inactive';
  const chipText = isActive
    ? mcaT('status.active')
    : mcaT('status.inactive', { time: mcaFormatTime(live.updated_at) });

  // Il timer della durata (data-active-since) viene aggiornato ogni secondo da
  // mcaStartWalkDurationTicker, non qui — qui si mette solo il segnaposto.
  const durationAttr = isActive && live.active_since
    ? ' data-active-since="' + live.active_since + '"' : '';
  const durationSpan = isActive && live.active_since
    ? ' <span class="walk-duration"></span>' : '';

  el.innerHTML =
    '<h2><span class="color-dot" style="background:' + user.color + '"></span>' + user.name + '</h2>' +
    '<span class="status-chip ' + chipClass + '"' + durationAttr + '><span class="dot"></span>' + chipText + durationSpan + '</span>' +
    '<p class="meta-line mca-updated-line">' + mcaT('common.updated', { time: mcaFormatDateTime(live.updated_at) }) + '</p>';

  const chipEl = el.querySelector('.status-chip');
  if (isActive && live.active_since) {
    mcaTickWalkDuration(chipEl);
  }
  mcaTagPositionFreshness(el.querySelector('.mca-updated-line'), live);
}

/** Aggiorna il testo/colore della durata su una singola status-chip. */
function mcaTickWalkDuration(chipEl) {
  const since = chipEl.getAttribute('data-active-since');
  if (!since) return;
  const ms = Date.now() - new Date(since).getTime();
  const durationEl = chipEl.querySelector('.walk-duration');
  if (durationEl) {
    durationEl.textContent = mcaT('status.since', { duration: mcaFormatDuration(ms) });
  }
  chipEl.classList.toggle('long-walk', ms > MCA_LONG_WALK_WARNING_MS);
}

/**
 * Esegue fn() subito e poi ogni intervalMs, mettendo in pausa quando la scheda
 * non è visibile (per risparmiare batteria/dati) e riprendendo subito al ritorno.
 */
function mcaStartWalkDurationTicker() {
  setInterval(() => {
    document.querySelectorAll('.status-chip[data-active-since]').forEach(mcaTickWalkDuration);
  }, 1000);
}

mcaStartWalkDurationTicker();

// Il banner si nasconde da solo un po' prima del prossimo controllo (non resta
// bloccato in cima allo schermo), e il beep non si ripete più spesso di così
// anche se mcaCheckProximityAlert viene richiamata da più punti ravvicinati
// (es. un'azione manuale subito prima di un giro di polling).
const MCA_PROXIMITY_ALERT_AUTOHIDE_MS = 8 * 1000;
const MCA_PROXIMITY_BEEP_MIN_INTERVAL_MS = 5 * 1000;

/**
 * I browser permettono l'audio solo dopo un gesto dell'utente, e solo se
 * l'AudioContext viene creato/ripreso DENTRO il gestore dell'evento stesso —
 * un bip innescato più tardi da un giro di polling (come il nostro avviso di
 * prossimità) non basta da solo. Sblocca quindi l'audio al primissimo
 * tocco/clic ovunque sulla pagina, così quando serve davvero è già pronto.
 */
function mcaUnlockAudioOnFirstInteraction() {
  const unlock = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!window._mcaAudioCtx) {
          window._mcaAudioCtx = new AudioCtx();
        }
        if (window._mcaAudioCtx.state === 'suspended') {
          window._mcaAudioCtx.resume();
        }
      }
    } catch (e) {
      // Se non riesce qui, mcaBeep() ritenterà comunque più avanti.
    }
    document.removeEventListener('click', unlock);
    document.removeEventListener('touchstart', unlock);
  };
  document.addEventListener('click', unlock);
  document.addEventListener('touchstart', unlock);
}

mcaUnlockAudioOnFirstInteraction();

/** Due brevi bip — nessun file audio da ospitare, generati al volo via Web Audio. */
function mcaBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window._mcaAudioCtx) {
      window._mcaAudioCtx = new AudioCtx();
    }
    const ctx = window._mcaAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const playTone = (startAt) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.35, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + 0.2);
    };
    const now = ctx.currentTime;
    playTone(now);
    playTone(now + 0.22);
  } catch (e) {
    // Niente audio se il browser lo blocca (es. nessuna interazione utente
    // ancora avvenuta su questa pagina) — il banner visivo resta comunque.
  }
}

/**
 * Controlla se due utenti attivi tra quelli indicati sono più vicini di
 * MCA_PROXIMITY_ALERT_METERS e, se sì, mostra un banner e fa un doppio bip —
 * a ogni controllo (quindi "ripete" da solo, circa ogni MCA_BOARD_POLL_MS,
 * mentre restano vicini), non solo alla prima rilevazione. Il banner si
 * nasconde da solo dopo pochi secondi e ricompare/ribeepa al giro successivo
 * se sono ancora vicini; smette del tutto (banner e suono) appena la distanza
 * torna sopra soglia — non c'è un limite di tempo fisso, si ferma quando la
 * condizione non è più vera. Con più di due persone attive, segnala la prima
 * coppia trovata sotto soglia.
 *
 * IMPORTANTE: funziona solo per chi ha in quel momento una pagina dell'app
 * aperta (bacheca o pagina di controllo) — non è una notifica push, quindi non
 * raggiunge chi ha il telefono bloccato o il browser chiuso.
 */
function mcaCheckProximityAlert(bannerEl, users, livesById) {
  if (!bannerEl) return;

  const withPosition = users
    .map((u) => ({ user: u, live: livesById[u.id] }))
    .filter((e) => e.live && e.live.active && e.live.position);

  let closePair = null;
  for (let i = 0; i < withPosition.length && !closePair; i++) {
    for (let j = i + 1; j < withPosition.length; j++) {
      const a = withPosition[i];
      const b = withPosition[j];
      const meters = mcaHaversineMeters(
        a.live.position.lat, a.live.position.lon,
        b.live.position.lat, b.live.position.lon
      );
      if (meters < MCA_PROXIMITY_ALERT_METERS) {
        closePair = [a.user, b.user];
        break;
      }
    }
  }

  clearTimeout(bannerEl._mcaHideTimer);

  if (!closePair) {
    bannerEl.style.display = 'none';
    return;
  }

  const textEl = bannerEl.querySelector('.proximity-alert-text');
  if (textEl) {
    textEl.textContent = mcaT('proximity.text', { a: closePair[0].name, b: closePair[1].name });
  }
  bannerEl.style.display = '';

  const now = Date.now();
  if (!bannerEl._mcaLastBeepAt || now - bannerEl._mcaLastBeepAt >= MCA_PROXIMITY_BEEP_MIN_INTERVAL_MS) {
    bannerEl._mcaLastBeepAt = now;
    mcaBeep();
  }

  bannerEl._mcaHideTimer = setTimeout(() => {
    bannerEl.style.display = 'none';
  }, MCA_PROXIMITY_ALERT_AUTOHIDE_MS);
}

function mcaInitProximityDismiss(bannerEl) {
  if (!bannerEl) return;
  const dismissBtn = bannerEl.querySelector('.proximity-alert-dismiss');
  if (!dismissBtn) return;
  dismissBtn.addEventListener('click', () => {
    clearTimeout(bannerEl._mcaHideTimer);
    bannerEl.style.display = 'none';
  });
}

// Quanto resta visibile l'avviso "qualcuno è appena uscito/rientrato" prima di
// nascondersi da solo — è un avviso "una tantum" per ogni cambiamento, non si
// ripete come quello di prossimità (non c'è una condizione continua da tenere
// sotto controllo, solo un evento singolo già successo).
const MCA_ACTIVITY_ALERT_AUTOHIDE_MS = 10 * 1000;

function mcaShowActivityAlert(bannerEl, text) {
  if (!bannerEl) return;
  const textEl = bannerEl.querySelector('.activity-alert-text');
  if (textEl) {
    textEl.textContent = text;
  }
  bannerEl.style.display = '';
  mcaBeep();
  clearTimeout(bannerEl._mcaHideTimer);
  bannerEl._mcaHideTimer = setTimeout(() => {
    bannerEl.style.display = 'none';
  }, MCA_ACTIVITY_ALERT_AUTOHIDE_MS);
}

function mcaInitActivityDismiss(bannerEl) {
  if (!bannerEl) return;
  const dismissBtn = bannerEl.querySelector('.activity-alert-dismiss');
  if (!dismissBtn) return;
  dismissBtn.addEventListener('click', () => {
    clearTimeout(bannerEl._mcaHideTimer);
    bannerEl.style.display = 'none';
  });
}

/**
 * Confronta lo stato "fuori ora" precedente e nuovo di un utente e, se è
 * appena cambiato, mostra un avviso ben visibile — anche senza alcun rischio
 * di vicinanza in quel momento, così si sa in anticipo che una passeggiata è
 * appena iniziata o finita. `wasActive` deve essere `null` finché non si
 * conosce ancora un valore precedente per quell'utente (es. al primissimo
 * caricamento della pagina): altrimenti scatterebbe un avviso a vuoto solo
 * perché la pagina si è appena aperta. Restituisce il valore da conservare
 * per il confronto successivo.
 */
function mcaCheckActivityChange(bannerEl, user, wasActive, isActive) {
  if (wasActive !== null && wasActive !== isActive) {
    const text = isActive
      ? mcaT('activity.started', { name: user.name })
      : mcaT('activity.stopped', { name: user.name });
    mcaShowActivityAlert(bannerEl, text);
  }
  return isActive;
}

/**
 * Esegue fn() subito e poi ogni intervalMs, mettendo in pausa quando la scheda
 * non è visibile (per risparmiare batteria/dati) e riprendendo subito al ritorno.
 */
function mcaStartPolling(fn, intervalMs) {
  let timer = null;

  function start() {
    if (timer) return;
    fn();
    timer = setInterval(fn, intervalMs);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });

  start();
  return { start, stop };
}
