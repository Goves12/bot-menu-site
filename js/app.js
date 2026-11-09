const API_URL = 'https://bot-menu-api.vadrgnuil.workers.dev';

// Ловим токен из ссылки
const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get('token');
if (urlToken) {
  localStorage.setItem('discord_token', urlToken);
  window.history.replaceState(null, '', window.location.pathname);
}

let allGuilds = [];

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

// Запуск при загрузке
window.addEventListener('DOMContentLoaded', () => {
  // 1. Кнопка входа
  const loginBtn = document.getElementById('discord-login');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      window.location.href = `${API_URL}/api/auth/login`;
    });
  }

  // 2. Переход на экран Учёта
  document.querySelectorAll('.module-card').forEach(card => {
    const title = card.querySelector('h3').textContent;
    if (title === 'Учёт') {
      card.querySelector('button').onclick = () => {
        showScreen('screen-accounting');
      };
    }
  });

  // 3. Кнопки "Назад"
  document.getElementById('back-to-servers')?.addEventListener('click', () => showScreen('screen-servers'));
  document.getElementById('back-to-settings')?.addEventListener('click', () => showScreen('screen-settings'));

  // 4. Модальное окно учёта
  const modal = document.getElementById('modal-accounting');
  const btnOpenModal = document.getElementById('open-create-modal');
  const btnCloseModal = document.getElementById('close-modal');

  btnOpenModal?.addEventListener('click', () => {
    modal.classList.add('active');
    loadDiscordData(); // Загружаем каналы и роли
  });

  btnCloseModal?.addEventListener('click', () => modal.classList.remove('active'));
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

  // 5. Добавление объектов в форму
  const addObjBtn = document.getElementById('add-object-btn');
  const objectsList = document.getElementById('objects-list');

  addObjBtn?.addEventListener('click', () => {
    if (objectsList.classList.contains('empty-state')) {
      objectsList.classList.remove('empty-state');
      objectsList.innerHTML = '';
    }

    const objDiv = document.createElement('div');
    objDiv.className = 'object-item';
    objDiv.innerHTML = `
      <input type="text" class="form-input obj-name" placeholder="Название объекта (напр. Автомат)">
      <input type="text" class="form-input obj-desc" placeholder="Описание (необязательно)">
      <button class="btn-remove-obj" type="button">✕</button>
    `;

    objDiv.querySelector('.btn-remove-obj').onclick = () => {
      objDiv.remove();
      if (objectsList.children.length === 0) {
        objectsList.classList.add('empty-state');
        objectsList.innerHTML = '<p>Нет добавленных объектов</p>';
      }
    };
    objectsList.appendChild(objDiv);
  });

  // 6. Проверяем, авторизован ли пользователь
  if (localStorage.getItem('discord_token')) {
    loadGuilds();
  } else {
    showScreen('screen-login');
  }
});

// Загрузка серверов
async function loadGuilds() {
  const token = localStorage.getItem('discord_token');
  if (!token) { showScreen('screen-login'); return; }

  try {
    const response = await fetch(`${API_URL}/api/user/guilds`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      localStorage.removeItem('discord_token');
      showScreen('screen-login'); 
      return;
    }

    allGuilds = await response.json();
    await renderGuilds(allGuilds); 
    showScreen('screen-servers');
    
  } catch (error) {
    console.error('Ошибка:', error);
    showScreen('screen-login');
  }
}

// Отрисовка серверов
async function renderGuilds(guilds) {
  const list = document.getElementById('servers-list');
  if(!list) return;
  list.innerHTML = '';

  if (guilds.length === 0) {
    list.innerHTML = `<p style="text-align:center; width:100%; color:#ed4245;">Нет серверов с правами администратора.</p>`;
    return;
  }

  for (const guild of guilds) {
    const card = document.createElement('div');
    card.className = 'server-card';
    const icon = guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`;
    
    const isAdmin = (BigInt(guild.permissions || 0) & 8n) === 8n || (BigInt(guild.permissions || 0) & 32n) === 32n;

    card.innerHTML = `
      <div class="card-icon-wrap"><img src="${icon}"></div>
      <div class="name">${guild.name}</div>
      <button class="btn-card btn-dark" disabled>Проверка...</button>
    `;
    
    list.appendChild(card);
    const btn = card.querySelector('button');

    if (isAdmin) {
      try {
        const checkRes = await fetch(`${API_URL}/api/check-bot?guild_id=${guild.id}`);
        const checkData = await checkRes.json();

        if (checkData.onServer) {
          btn.textContent = 'Настройка';
          btn.disabled = false;
          btn.className = 'btn-card btn-dark';
          btn.onclick = () => {
            localStorage.setItem('currentGuildId', guild.id);
            localStorage.setItem('currentGuildName', guild.name);
            document.getElementById('current-server-name').textContent = guild.name;
            showScreen('screen-settings');
          };
        } else {
          btn.textContent = 'Добавить бота';
          btn.disabled = false;
          btn.className = 'btn-card btn-blue';
          btn.onclick = () => {
            const redirectUri = encodeURIComponent(`${API_URL}/api/auth/invite-callback`);
            const inviteUrl = `https://discord.com/oauth2/authorize?client_id=1502787223249223740&scope=bot%20applications.commands&permissions=8&guild_id=${guild.id}&redirect_uri=${redirectUri}&response_type=code`;
            window.open(inviteUrl, '_blank');
          };
        }
      } catch (e) {
        btn.textContent = 'Добавить бота';
        btn.disabled = false;
        btn.className = 'btn-card btn-blue';
      }
    } else {
      btn.textContent = 'Нет прав';
      btn.disabled = true;
      btn.className = 'btn-card btn-dark';
    }
  }
}

// Загрузка каналов и ролей для модального окна
async function loadDiscordData() {
  const guildId = localStorage.getItem('currentGuildId');
  if (!guildId) return;

  try {
    const chRes = await fetch(`${API_URL}/api/guild-channels?guild_id=${guildId}`);
    const channels = await chRes.json();
    const chSelect = document.getElementById('channel-public');
    const logSelect = document.getElementById('channel-logs');

    if(chSelect && logSelect) {
      chSelect.innerHTML = '<option value="">Выберите канал...</option>';
      logSelect.innerHTML = '<option value="">Выберите канал...</option>';
      channels.forEach(c => {
        chSelect.innerHTML += `<option value="${c.id}"># ${c.name}</option>`;
        logSelect.innerHTML += `<option value="${c.id}"># ${c.name}</option>`;
      });
    }

    const roleRes = await fetch(`${API_URL}/api/guild-roles?guild_id=${guildId}`);
    const roles = await roleRes.json();
    const rolesSelect = document.getElementById('roles-moderator');
    
    if (rolesSelect) {
       rolesSelect.innerHTML = '<option value="">Выберите роли...</option>';
       roles.forEach(r => {
         rolesSelect.innerHTML += `<option value="${r.id}">${r.name}</option>`;
       });
    }
  } catch (e) {
    console.error('Ошибка загрузки данных Discord:', e);
  }
}