const API_URL = 'https://bot-menu-api.vadrgnuil.workers.dev';

// Ловим токен из ссылки
const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get('token');
if (urlToken) {
  localStorage.setItem('discord_token', urlToken);
  window.history.replaceState(null, '', window.location.pathname);
}

let allGuilds = [];

// Кнопка входа
document.getElementById('discord-login')?.addEventListener('click', () => {
  window.location.href = `${API_URL}/api/auth/login`;
});

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

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
    await renderGuilds(allGuilds); // Добавили await, так как теперь функция асинхронная
    showScreen('screen-servers');
    
  } catch (error) {
    console.error('Ошибка:', error);
    showScreen('screen-login');
  }
}

// Функция стала асинхронной (async), чтобы проверять бота на каждом сервере
async function renderGuilds(guilds) {
  const list = document.getElementById('servers-list');
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

    // Показываем карточку сразу, кнопка будет "Проверка..."
    card.innerHTML = `
      <div class="card-icon-wrap"><img src="${icon}"></div>
      <div class="name">${guild.name}</div>
      <button class="btn-card btn-dark" disabled>Проверка...</button>
    `;
    
    list.appendChild(card);
    const btn = card.querySelector('button');

    if (isAdmin) {
      try {
        // Спрашиваем у нашего сервера, есть ли бот на этом сервере
        const checkRes = await fetch(`${API_URL}/api/check-bot?guild_id=${guild.id}`);
        const checkData = await checkRes.json();

        if (checkData.onServer) {
          // Бот есть - показываем "Настройка"
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
          // Бота нет - показываем "Добавить бота"
          btn.textContent = 'Добавить бота';
          btn.disabled = false;
          btn.className = 'btn-card btn-blue';
          btn.onclick = () => {
            // ⚠️ ЗАМЕНИ ТВОЙ_CLIENT_ID НА СВОЙ ID ПРИЛОЖЕНИЯ!
            const inviteUrl = `https://discord.com/oauth2/authorize?client_id=1502787223249223740&scope=bot%20applications.commands&permissions=8&guild_id=${guild.id}`;
            window.open(inviteUrl, '_blank');
          };
        }
      } catch (e) {
        // Если ошибка сети - даем кнопку "Добавить"
        btn.textContent = 'Добавить бота';
        btn.disabled = false;
        btn.className = 'btn-card btn-blue';
      }
    } else {
      // Если нет прав админа
      btn.textContent = 'Нет прав';
      btn.disabled = true;
      btn.className = 'btn-card btn-dark';
    }
  }
}

// Кнопка "Назад"
document.getElementById('back-to-servers')?.addEventListener('click', () => {
  showScreen('screen-servers');
});

// Запуск
window.onload = () => {
  if (localStorage.getItem('discord_token')) {
    loadGuilds();
  } else {
    showScreen('screen-login');
  }
};