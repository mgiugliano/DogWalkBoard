(function () {
  const auth = mcaGetAuth();
  const authError = document.getElementById('auth-error');
  const mainContent = document.getElementById('main-content');

  if (!auth) {
    authError.style.display = '';
    mainContent.style.display = 'none';
    return;
  }
  mainContent.style.display = '';

  const API_LIVE = 'api/update_live.php';
  const API_SCHEDULE = 'api/update_schedule.php';

  let me = { id: auth.user, name: auth.user, color: '#1565c0' };
  let others = []; // [{ id, name, color }, ...] — tutti gli altri utenti configurati
  let liveState = { active: false, position: null, position_updated_at: null, route: [], route_updated_at: null, updated_at: null, active_since: null };
  const othersLiveById = {}; // id -> ultimo live_<id>.json conosciuto per ogni altro utente
  const othersWasActiveById = {}; // id -> true/false, per rilevare inizio/fine passeggiata
  const othersLayersById = {}; // id -> { marker, headingArrow, positionHistory, polyline, polylineCasing }

  const greetingEl = document.getElementById('greeting');
  const proximityAlertEl = document.getElementById('proximity-alert');
  const activityAlertEl = document.getElementById('activity-alert');
  const awayAlertEl = document.getElementById('away-alert');
  const awayAlertTextEl = document.getElementById('away-alert-text');
  const awayAlertOkBtn = document.getElementById('away-alert-ok-btn');
  const activeToggle = document.getElementById('active-toggle');
  const gpsToggle = document.getElementById('gps-toggle');
  const centerMapBtn = document.getElementById('center-map-btn');
  const activeStatus = document.getElementById('active-status');
  const statusCardsEl = document.getElementById('status-cards');
  const boardPolledAtEl = document.getElementById('board-polled-at');
  const routeModeBtn = document.getElementById('route-mode-btn');
  const routeControls = document.getElementById('route-controls');
  const routeUndoBtn = document.getElementById('route-undo-btn');
  const routeClearBtn = document.getElementById('route-clear-btn');
  const routeSaveBtn = document.getElementById('route-save-btn');
  const mapNotice = document.getElementById('map-notice');
  const slotsContainer = document.getElementById('slots');
  const addSlotBtn = document.getElementById('add-slot-btn');
  const saveSlotsBtn = document.getElementById('save-slots-btn');
  const slotsNotice = document.getElementById('slots-notice');

  function setNotice(el, text, kind) {
    el.textContent = text;
    el.className = 'notice ' + kind;
    el.style.display = '';
    clearTimeout(el._mcaTimer);
    el._mcaTimer = setTimeout(() => { el.style.display = 'none'; }, 4000);
  }

  function renderMyStatusCard() {
    mcaRenderStatusCard(statusCardsEl, me, liveState);
  }

  // --- Mappa condivisa: mostra lo stato di tutti gli altri utenti (per
  //     polling) e il mio, che invece è comandato direttamente dai tocchi
  //     qui sotto. ---
  const map = L.map('map', {
    minZoom: MCA_MAP_MIN_ZOOM,
    maxBounds: MCA_MAP_BOUNDS,
    maxBoundsViscosity: 0.8,
    gestureHandling: true, // sulla mappa serve un tocco con due dita per spostarla, non uno solo (che invece scorre la pagina)
  }).setView(MCA_MAP_CENTER, MCA_MAP_ZOOM);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  function ensureOtherLayers(id) {
    if (!othersLayersById[id]) {
      othersLayersById[id] = { marker: null, headingArrow: null, positionHistory: [], polyline: null, polylineCasing: null };
    }
    return othersLayersById[id];
  }

  let positionMarker = null;
  let isDraggingPosition = false;
  let myHeadingArrow = null;
  let myPositionHistory = [];

  // Il percorso confermato (salvato) resta disegnato sulla MIA mappa finché è
  // fresco — non solo mentre lo sto modificando. Prima non c'era nessun posto
  // che lo ridisegnasse dopo il salvataggio, quindi spariva subito dalla vista
  // di chi l'aveva appena tracciato (restava visibile solo per gli altri utenti).
  const myRouteLayers = { polyline: null, polylineCasing: null };

  function renderMyConfirmedRoute() {
    mcaUpdateRouteLayers(map, myRouteLayers, me.color, liveState.route, liveState.route_updated_at);
  }

  function clearMyRouteLayers() {
    if (myRouteLayers.polylineCasing) {
      map.removeLayer(myRouteLayers.polylineCasing);
      myRouteLayers.polylineCasing = null;
    }
    if (myRouteLayers.polyline) {
      map.removeLayer(myRouteLayers.polyline);
      myRouteLayers.polyline = null;
    }
  }

  let routeMode = false;
  let pendingRoute = []; // array di {lat, lon}, in modifica durante la modalità percorso
  let routePolyline = null;
  let routePointMarkers = [];

  // Icona rotonda personalizzata per il MIO puntino: a differenza di L.circleMarker
  // (un tracciato SVG, non trascinabile), L.marker con questa icona supporta il
  // trascinamento nativo di Leaflet.
  function positionDivIcon(color) {
    return L.divIcon({
      className: 'mca-own-marker',
      html: '<span style="display:block;width:22px;height:22px;border-radius:50%;' +
        'background:' + color + ';border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);"></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

  function ensurePositionMarker(latlng) {
    if (!positionMarker) {
      positionMarker = L.marker(latlng, {
        icon: positionDivIcon(me.color),
        draggable: true,
        autoPan: true,
      }).addTo(map);
      positionMarker.on('dragstart', () => {
        isDraggingPosition = true;
      });
      positionMarker.on('dragend', () => {
        isDraggingPosition = false;
        commitPosition(positionMarker.getLatLng());
      });
    } else {
      positionMarker.setLatLng(latlng);
    }
    return positionMarker;
  }

  // Freccia di direzione anche sul MIO puntino (non solo su quelli degli altri
  // utenti), con la stessa logica condivisa usata altrove: spostamento netto
  // negli ultimi MCA_HEADING_WINDOW_MS, sopra la soglia minima di rumore.
  function updateMyHeadingArrow(latlng, sampleAt) {
    const lastSample = myPositionHistory[myPositionHistory.length - 1];
    if (!lastSample || lastSample.at !== sampleAt) {
      myPositionHistory.push({ lat: latlng.lat, lon: latlng.lng, at: sampleAt });
    }
    myPositionHistory = myPositionHistory.filter((s) => sampleAt - s.at <= MCA_HEADING_WINDOW_MS);

    const oldest = myPositionHistory[0];
    const newest = myPositionHistory[myPositionHistory.length - 1];
    const movedMeters = oldest && newest && oldest !== newest
      ? mcaHaversineMeters(oldest.lat, oldest.lon, newest.lat, newest.lon) : 0;

    if (movedMeters >= MCA_HEADING_MIN_DISTANCE_M) {
      const heading = mcaBearingDegrees(oldest.lat, oldest.lon, newest.lat, newest.lon);
      const icon = mcaHeadingArrowIcon(me.color, heading);
      if (!myHeadingArrow) {
        myHeadingArrow = L.marker(latlng, { icon, interactive: false }).addTo(map);
      } else {
        myHeadingArrow.setLatLng(latlng);
        myHeadingArrow.setIcon(icon);
      }
    } else if (myHeadingArrow) {
      map.removeLayer(myHeadingArrow);
      myHeadingArrow = null;
    }
  }

  // Ogni tocco sulla mappa, rilevamento GPS o trascinamento del puntino salva
  // subito — niente pulsante di conferma. In caso di errore il puntino torna
  // alla posizione precedente, così non mostra mai qualcosa che non è salvato.
  // `silent` evita la notifica "Posizione salvata" per gli aggiornamenti GPS
  // automatici (altrimenti comparirebbe ogni pochi secondi mentre cammini).
  // `fromGps` distingue un aggiornamento automatico da una correzione manuale
  // (tocco o trascinamento): se correggi a mano MENTRE il GPS è attivo, il GPS
  // si disattiva subito, così la correzione resta esattamente dov'è — non viene
  // più sovrascritta pochi secondi dopo dalla prossima lettura GPS.
  async function commitPosition(latlng, successMessage, opts) {
    const silent = !!(opts && opts.silent);
    const fromGps = !!(opts && opts.fromGps);
    const prevPosition = liveState.position;
    ensurePositionMarker(latlng);
    const position = { lat: latlng.lat, lon: latlng.lng };

    if (!fromGps && gpsWatchId !== null) {
      stopGpsSharing();
      successMessage = mcaT('control.positionCorrectedGpsOff');
    }

    try {
      const res = await mcaPostJSON(API_LIVE, { u: auth.user, position });
      liveState.position = position;
      liveState.updated_at = res.updated_at;
      liveState.position_updated_at = res.position_updated_at;
      updateMyHeadingArrow(latlng, new Date(res.updated_at).getTime());
      mcaTagPositionFreshness(positionMarker.getElement(), liveState);
      renderMyStatusCard();
      checkProximity();
      if (!silent) {
        setNotice(mapNotice, successMessage || mcaT('control.positionSaved'), 'success');
      }
    } catch (err) {
      setNotice(mapNotice, mcaT('common.error', { message: err.message }), 'error');
      if (prevPosition) {
        positionMarker.setLatLng(L.latLng(prevPosition.lat, prevPosition.lon));
      }
    }
  }

  // Controlla se io e qualcun altro tra gli utenti configurati siamo a meno di
  // 50 metri e, se sì, mostra un avviso — solo se questa pagina è aperta in
  // questo momento (non è una notifica push: non raggiunge chi ha il telefono
  // bloccato o il browser chiuso).
  function checkProximity() {
    const users = [me, ...others];
    const livesById = { [me.id]: liveState, ...othersLiveById };
    mcaCheckProximityAlert(proximityAlertEl, users, livesById);
  }

  function clearMyMapLayers() {
    if (positionMarker) {
      map.removeLayer(positionMarker);
      positionMarker = null;
    }
    if (myHeadingArrow) {
      map.removeLayer(myHeadingArrow);
      myHeadingArrow = null;
    }
    myPositionHistory = [];
    if (routeMode) {
      exitRouteMode();
    }
    pendingRoute = [];
    clearMyRouteLayers();
  }

  // --- GPS: condivisione continua, attivabile solo mentre sei "fuori ora". ---
  let gpsWatchId = null;
  let lastGpsCommitAt = 0;
  let lastGpsErrorNoticeAt = 0;
  const GPS_MIN_INTERVAL_MS = 8000; // non salvare più spesso di così, anche se il GPS aggiorna più frequentemente

  function stopGpsSharing(message) {
    if (gpsWatchId !== null) {
      navigator.geolocation.clearWatch(gpsWatchId);
      gpsWatchId = null;
    }
    gpsToggle.checked = false;
    if (message) {
      setNotice(mapNotice, message, 'success');
    }
  }

  function startGpsSharing() {
    if (!navigator.geolocation) {
      setNotice(mapNotice, mcaT('control.gpsUnsupported'), 'error');
      gpsToggle.checked = false;
      return;
    }
    setNotice(mapNotice, mcaT('control.gpsSharingOn'), 'success');
    gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
        const distFromCenter = mcaHaversineMeters(
          MCA_MAP_CENTER[0], MCA_MAP_CENTER[1], latlng.lat, latlng.lng
        );
        if (distFromCenter > MCA_PRIVACY_RADIUS_METERS) {
          stopGpsSharing(mcaT('control.gpsLeftZone'));
          return;
        }
        if (isDraggingPosition) return;
        const now = Date.now();
        if (now - lastGpsCommitAt < GPS_MIN_INTERVAL_MS) return;
        lastGpsCommitAt = now;
        commitPosition(latlng, null, { silent: true, fromGps: true });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          stopGpsSharing(mcaT('control.gpsPermissionDenied'));
          return;
        }
        const now = Date.now();
        if (now - lastGpsErrorNoticeAt > 15000) {
          lastGpsErrorNoticeAt = now;
          setNotice(mapNotice, mcaT('control.gpsUnavailableRetry'), 'error');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }

  gpsToggle.addEventListener('change', () => {
    if (gpsToggle.checked) {
      startGpsSharing();
    } else {
      stopGpsSharing(mcaT('control.gpsSharingOff'));
    }
  });

  // --- Centra la mappa: se qualcuno (io compreso) è "fuori" con una
  //     posizione, inquadra tutti quelli attivi; altrimenti centra sulla mia
  //     posizione GPS attuale, senza salvarla né condividerla — indipendente
  //     dallo stato di condivisione. Riusa la stessa funzione condivisa che
  //     inquadra automaticamente la mappa, invece di duplicarne la logica. ---
  centerMapBtn.addEventListener('click', () => {
    const livesById = { [me.id]: liveState, ...othersLiveById };
    const ids = [me.id, ...others.map((u) => u.id)];
    const anyoneActive = ids.some((id) => livesById[id] && livesById[id].active && livesById[id].position);

    if (anyoneActive) {
      map._mcaFitSignature = null; // forza un nuovo inquadramento anche se identico all'ultimo automatico
      mcaFitMapToActiveUsers(map, livesById, ids);
      return;
    }

    if (!navigator.geolocation) {
      setNotice(mapNotice, mcaT('control.gpsUnsupported'), 'error');
      return;
    }
    centerMapBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], MCA_MAP_ZOOM, { animate: false });
        centerMapBtn.disabled = false;
      },
      (err) => {
        let msg = mcaT('control.gpsDetectFailed');
        if (err.code === err.PERMISSION_DENIED) {
          msg = mcaT('control.gpsPermissionDeniedShort');
        } else if (err.code === err.TIMEOUT) {
          msg = mcaT('control.gpsTimeout');
        }
        setNotice(mapNotice, msg, 'error');
        centerMapBtn.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  });

  // Inquadra tutti quelli attivi, altrimenti torna alla vista iniziale del
  // quartiere — ma non mentre sto disegnando un percorso o trascinando il mio
  // puntino, per non spostarmi la mappa da sotto mentre sto lavorando.
  function maybeFitMap() {
    if (routeMode || isDraggingPosition) return;
    const livesById = { [me.id]: liveState, ...othersLiveById };
    const ids = [me.id, ...others.map((u) => u.id)];
    mcaFitMapToActiveUsers(map, livesById, ids);
  }

  function redrawPendingRoute() {
    routePointMarkers.forEach((m) => map.removeLayer(m));
    routePointMarkers = pendingRoute.map((p, i) =>
      L.circleMarker([p.lat, p.lon], { radius: 5, color: me.color, fillColor: '#fff', fillOpacity: 1, weight: 2 })
        .addTo(map)
        .bindTooltip(String(i + 1), { permanent: true, direction: 'top', offset: [0, -6] })
    );

    if (routePolyline) {
      map.removeLayer(routePolyline);
      routePolyline = null;
    }
    if (pendingRoute.length > 1) {
      routePolyline = L.polyline(pendingRoute.map((p) => [p.lat, p.lon]), {
        color: me.color, weight: 4, dashArray: '8 8', opacity: 0.85,
      }).addTo(map);
    }
  }

  function exitRouteMode() {
    routeMode = false;
    routeModeBtn.style.display = '';
    routeControls.style.display = 'none';
    routePointMarkers.forEach((m) => map.removeLayer(m));
    routePointMarkers = [];
    if (routePolyline) {
      map.removeLayer(routePolyline);
      routePolyline = null;
    }
  }

  // Con il GPS attivo, un tocco sulla mappa NON sposta più la posizione (e quindi
  // non disattiva più il GPS): prima bastava un tocco per sbaglio (es. mentre si
  // guarda la mappa) per spegnere la condivisione senza accorgersene. Per
  // correggere la posizione a mano mentre il GPS è attivo resta il trascinamento
  // del puntino, un gesto molto più deliberato e difficile da fare per errore.
  map.on('click', (e) => {
    if (routeMode) {
      pendingRoute.push({ lat: e.latlng.lat, lon: e.latlng.lng });
      redrawPendingRoute();
    } else if (gpsWatchId === null) {
      commitPosition(e.latlng);
    } else {
      setNotice(mapNotice, mcaT('control.gpsActiveDragHint'), 'error');
    }
  });

  routeModeBtn.addEventListener('click', () => {
    routeMode = true;
    // Un percorso nuovo parte sempre vuoto: prima riprendeva quello vecchio,
    // così bastava aggiungere qualche punto per finire con un percorso via via
    // più affollato invece che sostituito.
    pendingRoute = [];
    clearMyRouteLayers(); // il percorso confermato lascia il posto all'anteprima modificabile
    redrawPendingRoute();
    routeModeBtn.style.display = 'none';
    routeControls.style.display = '';
    setNotice(mapNotice, mcaT('control.routeModeHint'), 'success');
  });

  routeUndoBtn.addEventListener('click', () => {
    pendingRoute.pop();
    redrawPendingRoute();
  });

  routeClearBtn.addEventListener('click', () => {
    pendingRoute = [];
    redrawPendingRoute();
  });

  routeSaveBtn.addEventListener('click', async () => {
    try {
      const res = await mcaPostJSON(API_LIVE, { u: auth.user, route: pendingRoute });
      liveState.route = pendingRoute.slice();
      liveState.route_updated_at = res.updated_at;
      liveState.updated_at = res.updated_at;
      exitRouteMode();
      renderMyConfirmedRoute();
      renderMyStatusCard();
      setNotice(mapNotice, mcaT('control.routeSaved'), 'success');
    } catch (err) {
      setNotice(mapNotice, mcaT('common.error', { message: err.message }), 'error');
    }
  });

  // --- Interruttore "fuori ora" ---
  // Quando si disattiva, posizione e percorso vengono azzerati subito, sia sullo
  // schermo (marker/percorso rimossi) sia sul server (memoria) — non restano lì
  // in attesa della prossima passeggiata.
  activeToggle.addEventListener('change', async () => {
    const active = activeToggle.checked;
    activeToggle.disabled = true;
    const body = { u: auth.user, active };
    if (!active) {
      body.position = null;
      body.route = [];
    }
    try {
      const res = await mcaPostJSON(API_LIVE, body);
      liveState.active = active;
      liveState.updated_at = res.updated_at;
      liveState.active_since = res.active_since;
      if (!active) {
        liveState.position = null;
        liveState.route = [];
        liveState.route_updated_at = res.updated_at;
        clearMyMapLayers();
        stopGpsSharing();
      }
      gpsToggle.disabled = !active;
      renderMyStatusCard();
      maybeFitMap();
      checkProximity();
      setNotice(activeStatus, mcaT(active ? 'control.activeOn' : 'control.activeOff'), 'success');
    } catch (err) {
      activeToggle.checked = !active;
      setNotice(activeStatus, mcaT('common.error', { message: err.message }), 'error');
    } finally {
      activeToggle.disabled = false;
    }
  });

  // --- Editor orari ---
  function addSlotRow(start, end) {
    const row = document.createElement('div');
    row.className = 'slot-row';
    row.innerHTML =
      '<input type="time" class="slot-start" value="' + (start || '') + '">' +
      '<span>–</span>' +
      '<input type="time" class="slot-end" value="' + (end || '') + '">' +
      '<button type="button" class="remove-slot" aria-label="' + mcaT('common.remove') + '">✕</button>';
    row.querySelector('.remove-slot').addEventListener('click', () => row.remove());
    slotsContainer.appendChild(row);
  }

  function renderSlots(slots) {
    slotsContainer.innerHTML = '';
    slots.forEach((slot) => addSlotRow(slot.start, slot.end));
  }

  addSlotBtn.addEventListener('click', () => addSlotRow('', ''));

  saveSlotsBtn.addEventListener('click', async () => {
    const rows = Array.from(slotsContainer.querySelectorAll('.slot-row'));
    const slots = [];
    for (const row of rows) {
      const start = row.querySelector('.slot-start').value;
      const end = row.querySelector('.slot-end').value;
      if (!start || !end) {
        setNotice(slotsNotice, mcaT('control.slotsIncomplete'), 'error');
        return;
      }
      if (start >= end) {
        setNotice(slotsNotice, mcaT('control.slotsOrder'), 'error');
        return;
      }
      slots.push({ start, end });
    }
    try {
      await mcaPostJSON(API_SCHEDULE, { u: auth.user, slots });
      setNotice(slotsNotice, mcaT('control.slotsSaved'), 'success');
    } catch (err) {
      setNotice(slotsNotice, mcaT('common.error', { message: err.message }), 'error');
    }
  });

  // --- Bacheca: stato di tutti gli altri utenti, aggiornato per polling. Il
  //     mio stato non viene mai ri-letto dal server qui: sono l'unico a
  //     poterlo cambiare, quindi la copia locale aggiornata a ogni salvataggio
  //     è già sempre corretta. ---
  async function refreshOthers() {
    try {
      let anyTransition = false;
      for (const user of others) {
        const live = await mcaFetchJSON('data/live_' + user.id + '.json');
        othersLiveById[user.id] = live;
        mcaRenderStatusCard(statusCardsEl, user, live);
        mcaUpdateUserMapLayers(map, ensureOtherLayers(user.id), user, live);

        const prevActive = Object.prototype.hasOwnProperty.call(othersWasActiveById, user.id)
          ? othersWasActiveById[user.id] : null;
        othersWasActiveById[user.id] = mcaCheckActivityChange(activityAlertEl, user, prevActive, !!live.active);
        // La mappa si inquadra da sola solo alla primissima volta che sappiamo
        // se questo utente è fuori (qui, non nell'init: lì il suo stato non è
        // ancora arrivato) e poi quando inizia/finisce una passeggiata — mai
        // ad ogni polling, altrimenti annullerebbe in continuazione uno
        // zoom/spostamento fatto a mano (es. dopo aver premuto il pulsante
        // 🎯), dato che la posizione GPS cambia leggermente quasi ogni volta.
        if (prevActive === null || prevActive !== othersWasActiveById[user.id]) {
          anyTransition = true;
        }
      }
      checkProximity();
      if (anyTransition) {
        maybeFitMap();
      }
      // Non cambia mai qui, ma va ricontrollato periodicamente: dopo
      // MCA_ROUTE_TTL_MS il mio percorso confermato deve sparire da solo anche
      // se la pagina resta aperta, non solo alla prossima azione.
      if (!routeMode) {
        renderMyConfirmedRoute();
      }
      boardPolledAtEl.textContent = mcaT('common.lastCheck', { time: mcaFormatTime(new Date().toISOString()) });
    } catch (err) {
      boardPolledAtEl.textContent = mcaT('common.lastCheckError', { message: err.message });
    }
  }

  // --- Caricamento iniziale ---
  async function init() {
    try {
      const usersData = await mcaFetchJSON('data/public_users.json');
      const users = usersData.users || [];
      const foundMe = users.find((u) => u.id === auth.user);
      if (foundMe) me = foundMe;
      others = users.filter((u) => u.id !== auth.user);
      greetingEl.textContent = mcaT('control.greeting', { name: me.name });
    } catch (err) {
      // mantiene i valori predefiniti
    }

    try {
      liveState = await mcaFetchJSON('data/live_' + auth.user + '.json');
      activeToggle.checked = !!liveState.active;
      gpsToggle.disabled = !liveState.active;
      if (liveState.position) {
        ensurePositionMarker(L.latLng(liveState.position.lat, liveState.position.lon));
        mcaTagPositionFreshness(positionMarker.getElement(), liveState);
      }
      renderMyConfirmedRoute();
    } catch (err) {
      // mantiene i valori predefiniti
    }
    renderMyStatusCard();
    maybeFitMap();
    mcaInitProximityDismiss(proximityAlertEl);
    mcaInitActivityDismiss(activityAlertEl);

    try {
      const schedule = await mcaFetchJSON('data/schedule_' + auth.user + '.json');
      renderSlots(Array.isArray(schedule.slots) ? schedule.slots : []);
    } catch (err) {
      renderSlots([]);
    }

    mcaStartPolling(refreshOthers, MCA_BOARD_POLL_MS);
  }

  // --- Avviso "sei stato via": se torni sulla pagina dopo essere stato con
  //     un'altra app in primo piano (o schermo spento) per più di
  //     MCA_POSITION_STALE_MS mentre eri "fuori ora", la tua posizione
  //     potrebbe non essersi aggiornata nel frattempo senza che tu te ne
  //     accorgessi — molti browser mettono in pausa il GPS quando la pagina
  //     non è visibile. Un banner a scomparsa non basterebbe (potresti non
  //     vederlo in tempo): serve un tocco esplicito per chiuderlo, così sei
  //     sicuro di essertene accorto.
  let hiddenAt = null;

  function showAwayAlert(awayMs) {
    awayAlertTextEl.textContent = mcaT('control.awayMessage', { duration: mcaFormatDuration(awayMs) });
    awayAlertEl.style.display = '';
    mcaBeep();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      return;
    }
    if (hiddenAt === null) return;
    const awayMs = Date.now() - hiddenAt;
    hiddenAt = null;
    if (awayMs >= MCA_POSITION_STALE_MS && liveState.active) {
      showAwayAlert(awayMs);
    }
  });

  awayAlertOkBtn.addEventListener('click', () => {
    awayAlertEl.style.display = 'none';
  });

  // Bip quando la posizione di un ALTRO utente passa da fresca a "vecchia"
  // (marker che inizia a lampeggiare) — controllato ogni secondo come il
  // lampeggio stesso, non al prossimo giro di polling (fino a
  // MCA_BOARD_POLL_MS più tardi), così il suono arriva insieme al lampeggio.
  // `othersWasStaleById[id] === false` (non `undefined`) evita un bip a vuoto
  // se la pagina si apre quando la posizione di qualcuno è già vecchia.
  const othersWasStaleById = {};
  setInterval(() => {
    Object.keys(othersLiveById).forEach((id) => {
      const isStale = mcaIsPositionStale(othersLiveById[id]);
      if (othersWasStaleById[id] === false && isStale) {
        mcaBeep();
      }
      othersWasStaleById[id] = isStale;
    });
  }, 1000);

  // Al cambio lingua, ri-renderizza subito il saluto (contiene il mio nome,
  // il walker generico di i18n.js non lo sa comporre) e le card di stato —
  // mie e di tutti gli altri, che altrimenti resterebbero nella lingua
  // precedente fino al prossimo giro di polling.
  mcaInitLangToggle(() => {
    greetingEl.textContent = mcaT('control.greeting', { name: me.name });
    renderMyStatusCard();
    others.forEach((user) => {
      if (othersLiveById[user.id]) {
        mcaRenderStatusCard(statusCardsEl, user, othersLiveById[user.id]);
      }
    });
  });

  init();
})();
