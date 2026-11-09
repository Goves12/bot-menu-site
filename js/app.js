const API_URL = 'https://bot-menu-api.vadrgnuil.workers.dev';

// Проверка токена из ссылки
const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get('token');
if (urlToken) {
  localStorage.setItem('discord_token', urlToken);
  window.history.replaceState(null, '', window.location.pathname);
}

// Глобальное состояние
let allGuilds = [];

document.getElementById('discord-login')?.addEventListener('click', () => {
  window.location.href = `${API_URL}/api/auth/login`;
});

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

// Загрузка серверов
async function loadGuilds() {
  const token = localStorage.getItem('discord_token');
  if (!token) {
    showScreen('screen-login');
    return;
  }

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
    
    // Если мы были на экране настроек, возвращаем туда
    if (localStorage.getItem('currentGuildId')) {
      const savedGuildId = localStorage.getItem('currentGuildId');
      const guild = allGuilds.find(g => g.id === savedGuildId);
      if (guild) {
        openSettings(guild.id, guild.name, false); // false = не переключать экран
      } else {
        showScreen('screen-servers');
      }
    } else {
      showScreen('screen-servers');
    }
  } catch (error) {
    console.error('Ошибка загрузки серверов:', error);
    showScreen('screen-login');
  }
}

// Отрисовка карточек
function renderGuilds(guilds) {
  const list = document.getElementById('servers-list');
  list.innerHTML = '';

  if (guilds.length === 0) {
    list.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #ed4245;">У вас нет серверов с правами администратора.</p>`;
    return;
  }

  guilds.forEach(guild => {
    const card = document.createElement('div');
    card.className = 'server-card';
    
    const iconUrl = guild.icon 
      ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/0.png`;

    const permissions = BigInt(guild.permissions || 0);
    const isAdmin = (permissions & 8n) === 8n || (permissions & 32n) === 32n;

    card.innerHTML = `
      <div class="card-icon-wrap">
         <img src="${iconUrl}" alt="${guild.name}">
      </div>
      <div class="name">${guild.name}</div>
      <button class="btn-card ${isAdmin ? 'btn-dark' : 'btn-blue'}">
        ${isAdmin ? 'Настройка' : 'Добавить'}
      </button>
    `;
    
    card.querySelector('button').addEventListener('click', () => {
      if (isAdmin) {
        openSettings(guild.id, guild.name, true);
      } else {
        alert(`У вас нет прав на управление сервером "${guild.name}".`);
      }
    });

    list.appendChild(card);
  });
}

// === ПЕРЕХОД НА 3-Й ЭКРАН ===
function openSettings(guildId, guildName, changeScreen = true) {
  localStorage.setItem('currentGuildId', guildId);
  localStorage.setItem('currentGuildName', guildName);
  
  document.getElementById('current-server-name').textContent = guildName;
  
  // Заполняем выпадающий список серверов
  const select = document.getElementById('server-select');
  select.innerHTML = '';
  allGuilds.forEach(g => {
    const option = document.createElement('option');
    option.value = g.id;
    option.textContent = g.name;
    if (g.id === guildId) option.selected = true;
    select.appendChild(option);
  });

  if (changeScreen) showScreen('screen-settings');
}

// Кнопка "Назад" на 3-м экране
document.getElementById('back-to-servers')?.addEventListener('click', () => {
  localStorage.removeItem('currentGuildId');
  localStorage.removeItem('currentGuildName');
  showScreen('screen-servers');
});

// Переключение сервера через выпадающий список на 3-м экране
document.getElementById('server-select')?.addEventListener('change', (e) => {
  const newId = e.target.value;
  const guild = allGuilds.find(g => g.id === newId);
  if (guild) {
    openSettings(guild.id, guild.name, false);
  }
});

// Запуск
window.onload = () => {
  if (localStorage.getItem('discord_token')) {
    loadGuilds();
  } else {
    showScreen('screen-login');
  }
};