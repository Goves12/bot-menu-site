const API_URL = 'https://bot-menu-api.vadrgnuil.workers.dev';

// Ловим токен из ссылки
const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get('token');
if (urlToken) {
  localStorage.setItem('discord_token', urlToken);
  window.history.replaceState(null, '', window.location.pathname);
}

let allGuilds = [];

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
    
    // Если мы были в настройках, возвращаем туда
    const savedId = localStorage.getItem('currentGuildId');
    if (savedId) {
      const guild = allGuilds.find(g => g.id === savedId);
      if (guild) openSettings(guild.id, guild.name, false);
      else showScreen('screen-servers');
    } else {
      showScreen('screen-servers');
    }
  } catch (error) {
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
    const isAdmin = (BigInt(guild.permissions) & 8n) === 8n || (BigInt(guild.permissions) & 32n) === 32n;

    card.innerHTML = `
      <div class="card-icon-wrap"><img src="${icon}"></div>
      <div class="name">${guild.name}</div>
      <button class="btn-card ${isAdmin ? 'btn-dark' : 'btn-blue'}">${isAdmin ? 'Настройка' : 'Добавить'}</button>
    `;
    
    card.querySelector('button').onclick = () => {
      if (isAdmin) openSettings(guild.id, guild.name, true);
    };
    list.appendChild(card);
  });
}

function openSettings(guildId, guildName, changeScreen = true) {
  localStorage.setItem('currentGuildId', guildId);
  localStorage.setItem('currentGuildName', guildName);
  document.getElementById('current-server-name').textContent = guildName;
  
  const select = document.getElementById('server-select');
  select.innerHTML = '';
  allGuilds.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    if (g.id === guildId) opt.selected = true;
    select.appendChild(opt);
  });

  if (changeScreen) showScreen('screen-settings');
}

document.getElementById('back-to-servers')?.addEventListener('click', () => {
  localStorage.removeItem('currentGuildId');
  showScreen('screen-servers');
});

document.getElementById('server-select')?.addEventListener('change', (e) => {
  const guild = allGuilds.find(g => g.id === e.target.value);
  if (guild) openSettings(guild.id, guild.name, false);
});

window.onload = () => {
  if (localStorage.getItem('discord_token')) loadGuilds();
  else showScreen('screen-login');
};