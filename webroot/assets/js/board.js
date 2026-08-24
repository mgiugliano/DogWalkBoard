(function () {
  const map = L.map('map', {
    minZoom: MCA_MAP_MIN_ZOOM,
    maxBounds: MCA_MAP_BOUNDS,
    maxBoundsViscosity: 0.8,
    gestureHandling: true, // due dita per spostare la mappa, per non scorrerla per sbaglio mentre scorri la pagina
  }).setView(MCA_MAP_CENTER, MCA_MAP_ZOOM);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const usersContainer = document.getElementById('users');
  const polledAtEl = document.getElementById('polled-at');
  const proximityAlertEl = document.getElementById('proximity-alert');
  const activityAlertEl = document.getElementById('activity-alert');
  mcaInitProximityDismiss(proximityAlertEl);
  mcaInitActivityDismiss(activityAlertEl);

  const userLayers = {}; // id -> { marker, polyline, polylineCasing }
  const wasActiveById = {}; // id -> true/false/undefined (sconosciuto finché non si vede almeno un dato)
  const latestLivesById = {}; // id -> ultimo live_<id>.json conosciuto, per il controllo di lampeggio ogni secondo qui sotto

  function ensureUserLayers(id) {
    if (!userLayers[id]) {
      userLayers[id] = { marker: null, headingArrow: null, positionHistory: [], polyline: null, polylineCasing: null };
    }
    return userLayers[id];
  }

  async function refresh() {
    try {
      const usersData = await mcaFetchJSON('data/public_users.json');
      const users = usersData.users || [];

      const isFirstLoad = !usersContainer.dataset.loaded;
      if (isFirstLoad) {
        usersContainer.innerHTML = '';
        usersContainer.dataset.loaded = '1';
      }

      const livesById = {};
      let anyTransition = false;
      for (const user of users) {
        const live = await mcaFetchJSON('data/live_' + user.id + '.json');
        livesById[user.id] = live;
        latestLivesById[user.id] = live;
        mcaRenderStatusCard(usersContainer, user, live);
        mcaUpdateUserMapLayers(map, ensureUserLayers(user.id), user, live);

        const prevActive = Object.prototype.hasOwnProperty.call(wasActiveById, user.id)
          ? wasActiveById[user.id] : null;
        wasActiveById[user.id] = mcaCheckActivityChange(activityAlertEl, user, prevActive, !!live.active);
        if (prevActive !== null && prevActive !== wasActiveById[user.id]) {
          anyTransition = true;
        }
      }
      // La mappa si inquadra da sola solo al primo caricamento o quando qualcuno
      // inizia/finisce una passeggiata — non ad ogni polling, altrimenti
      // annullerebbe in continuazione uno zoom/spostamento fatto a mano.
      if (isFirstLoad || anyTransition) {
        mcaFitMapToActiveUsers(map, livesById, users.map((u) => u.id));
      }
      mcaCheckProximityAlert(proximityAlertEl, users, livesById);

      polledAtEl.textContent = mcaT('common.lastCheck', { time: mcaFormatTime(new Date().toISOString()) });
    } catch (err) {
      polledAtEl.textContent = mcaT('common.lastCheckError', { message: err.message });
    }
  }

  mcaStartPolling(refresh, MCA_BOARD_POLL_MS);

  // Al cambio lingua, ri-renderizza subito le card di stato (già in inglese/
  // italiano nel prossimo giro di polling comunque, ma così è immediato).
  mcaInitLangToggle(() => refresh());

  // Bip quando la posizione di un utente passa da fresca a "vecchia" (marker
  // che inizia a lampeggiare) — controllato ogni secondo come il lampeggio
  // stesso, non al prossimo giro di polling (fino a MCA_BOARD_POLL_MS più
  // tardi), così il suono arriva insieme al lampeggio. `wasStaleById[id] ===
  // false` (non `undefined`) evita un bip a vuoto se la pagina si apre quando
  // la posizione di qualcuno è già vecchia.
  const wasStaleById = {};
  setInterval(() => {
    Object.keys(latestLivesById).forEach((id) => {
      const isStale = mcaIsPositionStale(latestLivesById[id]);
      if (wasStaleById[id] === false && isStale) {
        mcaBeep();
      }
      wasStaleById[id] = isStale;
    });
  }, 1000);
})();
