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
    renderGuilds(allGuilds);
    showScreen('screen-servers');
    
  } catch (error) {
    console.error('Ошибка:', error);
    showScreen('screen-login');
  }
}

function renderGuilds(guilds) {
  const list = document.getElementById('servers-list');
  list.innerHTML = '';

  if (guilds.length === 0) {
    list.innerHTML = `<p style="text-align:center; width:100%; color:#ed4245;">Нет серверов с правами администратора.</p>`;
    return;
  }

  guilds.forEach(guild => {
    const card = document.createElement('div');
    card.className = 'server-card';
    const icon = guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`;
    
    // Проверяем права
    const isAdmin = (BigInt(guild.permissions || 0) & 8n) === 8n || (BigInt(guild.permissions || 0) & 32n) === 32n;

    card.innerHTML = `
      <div class="card-icon-wrap"><img src="${icon}"></div>
      <div class="name">${guild.name}</div>
      <button class="btn-card ${isAdmin ? 'btn-dark' : 'btn-blue'}">${isAdmin ? 'Настройка' : 'Добавить'}</button>
    `;
    
    card.querySelector('button').onclick = () => {
      if (isAdmin) {
        // Просто и надежно: сохраняем ID и имя, переключаем экран
        localStorage.setItem('currentGuildId', guild.id);
        localStorage.setItem('currentGuildName', guild.name);
        document.getElementById('current-server-name').textContent = guild.name;
        showScreen('screen-settings');
      }
    };
    list.appendChild(card);
  });
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