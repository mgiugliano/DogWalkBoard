(function () {
  const usersContainer = document.getElementById('users');

  function renderUserCard(user, schedule) {
    let el = document.getElementById('sched-card-' + user.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'card';
      el.id = 'sched-card-' + user.id;
      usersContainer.appendChild(el);
    }

    const slots = Array.isArray(schedule.slots) ? schedule.slots : [];
    let listHtml;
    if (slots.length === 0) {
      listHtml = '<p class="slot-list empty">' + mcaT('schedules.noSlots') + '</p>';
    } else {
      listHtml = '<ul class="slot-list">' +
        slots.map((s) => '<li>' + s.start + ' – ' + s.end + '</li>').join('') +
        '</ul>';
    }

    el.innerHTML =
      '<h2><span class="color-dot" style="background:' + user.color + '"></span>' + user.name + '</h2>' +
      listHtml +
      '<p class="meta-line">' + mcaT('schedules.lastEdit', { time: mcaFormatDateTime(schedule.updated_at) }) + '</p>';
  }

  async function refresh() {
    try {
      const usersData = await mcaFetchJSON('data/public_users.json');
      const users = usersData.users || [];

      if (!usersContainer.dataset.loaded) {
        usersContainer.innerHTML = '';
        usersContainer.dataset.loaded = '1';
      }

      for (const user of users) {
        const schedule = await mcaFetchJSON('data/schedule_' + user.id + '.json');
        renderUserCard(user, schedule);
      }
    } catch (err) {
      usersContainer.innerHTML = '<p class="notice error">' + mcaT('schedules.loadError', { message: err.message }) + '</p>';
    }
  }

  mcaStartPolling(refresh, MCA_SCHEDULES_POLL_MS);

  mcaInitLangToggle(() => refresh());
})();
