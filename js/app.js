const API_URL = 'https://bot-menu-api.vadrgnuil.workers.dev';

// 1. СРАЗУ ПРОВЕРЯЕМ ССЫЛКУ НА ТОКЕН
const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get('token');

if (urlToken) {
  localStorage.setItem('discord_token', urlToken);
  window.history.replaceState(null, '', window.location.pathname);
}

// Кнопка входа
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

    const guilds = await response.json();
    const list = document.getElementById('servers-list');
    list.innerHTML = '';

    if (guilds.length === 0) {
      list.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #ed4245;">У вас нет серверов с правами администратора.</p>`;
    } else {
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
            // Вызываем функцию перехода вместо алерта
            openSettings(guild.id, guild.name);
          } else {
            // Если нет прав, просто делаем кнопку неактивной визуально или меняем текст
            alert(`У вас нет прав на управление сервером "${guild.name}".`); // Тут можно оставить для неправильных действий
          }
        });

        list.appendChild(card);
      });
    }
  } catch (error) {
    console.error('Ошибка загрузки серверов:', error);
    showScreen('screen-login');
  }
}

// === ФУНКЦИЯ ПЕРЕХОДА НА 3-Й ЭКРАН ===
function openSettings(guildId, guildName) {
  // Сохраняем выбранный сервер
  localStorage.setItem('currentGuildId', guildId);
  localStorage.setItem('currentGuildName', guildName);
  
  // Меняем название на 3-м экране
  const titleEl = document.getElementById('current-server-name');
  if (titleEl) titleEl.textContent = guildName;

  // Переключаем экран
  showScreen('screen-settings');
}

// Кнопка "Назад" на 3-м экране
document.getElementById('back-to-servers')?.addEventListener('click', () => {
  showScreen('screen-servers');
});

// Запускаем при загрузке страницы
window.onload = () => {
  const token = localStorage.getItem('discord_token');
  if (token) {
    showScreen('screen-servers');
    loadGuilds();
  } else {
    showScreen('screen-login');
  }
};