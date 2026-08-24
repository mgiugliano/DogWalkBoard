(function () {
  const stepWho = document.getElementById('step-who');
  const stepAction = document.getElementById('step-action');
  const whoButtonsEl = document.getElementById('who-buttons');
  const actionGreeting = document.getElementById('action-greeting');
  const actionWalk = document.getElementById('action-walk');
  const actionSchedule = document.getElementById('action-schedule');
  const changeUserBtn = document.getElementById('change-user-btn');

  let currentUser = null; // per ri-tradurre il saluto se cambio lingua mentre è visibile

  function showAction(user) {
    currentUser = user;
    actionGreeting.textContent = mcaT('index.greeting', { name: user.name });
    // "Vai a passeggio" atterra in cima (interruttore + mappa sono già lì);
    // "Imposta orari" salta più giù, dritto all'editor degli orari.
    actionWalk.href = 'control.html?u=' + encodeURIComponent(user.id);
    actionSchedule.href = 'control.html?u=' + encodeURIComponent(user.id) + '#orari';
    stepWho.style.display = 'none';
    stepAction.style.display = '';
  }

  changeUserBtn.addEventListener('click', () => {
    stepAction.style.display = 'none';
    stepWho.style.display = '';
  });

  async function init() {
    try {
      const data = await mcaFetchJSON('data/public_users.json');
      const users = data.users || [];
      whoButtonsEl.innerHTML = '';
      users.forEach((user) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn primary';
        btn.style.background = user.color;
        btn.style.borderColor = user.color;
        btn.textContent = user.name;
        btn.addEventListener('click', () => showAction(user));
        whoButtonsEl.appendChild(btn);
      });
    } catch (err) {
      whoButtonsEl.innerHTML = '<p class="notice error">' + mcaT('index.loadError') + '</p>';
    }
  }

  init();

  mcaInitLangToggle(() => {
    if (currentUser) {
      actionGreeting.textContent = mcaT('index.greeting', { name: currentUser.name });
    }
  });
})();
