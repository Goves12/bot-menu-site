const API_URL = 'https://bot-menu-api.vadrgnuil.workers.dev';

// Кнопка входа
document.getElementById('discord-login')?.addEventListener('click', () => {
  window.location.href = `${API_URL}/api/auth/login`;
});

// Функция смены экранов
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
      // Если токен не подошел — удаляем его и просим войти заново
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
            // Здесь в будущем будет showScreen('screen-settings');
          } else {
            alert(`У вас нет прав на управление сервером "${guild.name}".`);
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

// === ЛОВИМ ТОКЕН ИЗ АДРЕСНОЙ СТРОКИ ===
window.onload = () => {
  // Ищем токен в обычной ссылке (например, ?token=12345)
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');
  
  if (urlToken) {
    // Сохраняем в память и убираем из ссылки
    localStorage.setItem('discord_token', urlToken);
    window.history.replaceState(null, '', window.location.pathname);
  }

  // Проверяем, есть ли токен в памяти
  if (localStorage.getItem('discord_token')) {
    showScreen('screen-servers'); // Показываем экран с серверами
    loadGuilds(); // Загружаем список
  } else {
    showScreen('screen-login'); // Если нет - на вход
  }
};