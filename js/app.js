const API_URL = 'https://bot-menu-api.vadrgnuil.workers.dev';

document.getElementById('discord-login')?.addEventListener('click', () => {
  window.location.href = `${API_URL}/api/auth/login`;
});

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

async function loadGuilds() {
  // Берём токен из памяти браузера
  const token = localStorage.getItem('discord_token');
  
  if (!token) {
    showScreen('screen-login');
    return;
  }

  try {
    // Передаём токен в заголовке Authorization
    const response = await fetch(`${API_URL}/api/user/guilds`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      // Если токен просрочен или неверный — просим войти заново
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
            localStorage.setItem('currentGuildId', guild.id);
            localStorage.setItem('currentGuildName', guild.name);
            alert(`Переход к настройкам сервера: ${guild.name}`);
          } else {
            alert(`У вас нет прав на управление сервером "${guild.name}".`);
          }
        });

        list.appendChild(card);
      });
    }
  } catch (error) {
    console.error('Ошибка:', error);
    showScreen('screen-login');
  }
}

// Проверяем, не вернул ли нас Discord с токеном в адресной строке
window.onload = () => {
  const hash = window.location.hash;
  if (hash && hash.includes('token=')) {
    // Извлекаем токен из #token=...
    const token = hash.split('token=')[1];
    if (token) {
      localStorage.setItem('discord_token', token);
      // Очищаем адресную строку, чтобы токен не мозолил глаза
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  // Если токен есть — показываем сервера, иначе — экран входа
  if (localStorage.getItem('discord_token')) {
    showScreen('screen-servers');
    loadGuilds();
  } else {
    showScreen('screen-login');
  }
};