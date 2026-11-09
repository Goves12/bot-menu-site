const API_URL = 'https://bot-menu-api.vadrgnuil.workers.dev';

// Ловим токен из ссылки
const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get('token');
if (urlToken) {
  localStorage.setItem('discord_token', urlToken);
  window.history.replaceState(null, '', window.location.pathname);
}

let allGuilds = [];
let selectedRoles = []; 
let selectedPubChannel = null;
let selectedPubChannelName = '';
let selectedLogChannel = null;
let selectedLogChannelName = '';

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

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
        loadAccountingData(); // Загружаем данные из базы при входе
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
  const modalTitle = document.getElementById('modal-title');

  btnOpenModal?.addEventListener('click', () => {
    document.getElementById('acc-name').value = 'Новый учёт';
    document.getElementById('acc-title').value = '';
    document.getElementById('selected-roles').textContent = 'Выберите роли...';
    document.getElementById('selected-pub-channel').textContent = 'Выберите канал...';
    document.getElementById('selected-log-channel').textContent = 'Выберите канал...';
    document.getElementById('objects-list').innerHTML = '<p>Нет добавленных объектов</p>';
    document.getElementById('objects-list').classList.add('empty-state');
    
    selectedRoles = [];
    selectedPubChannel = null;
    selectedLogChannel = null;

    modalTitle.textContent = 'Новый учёт';
    modal.classList.add('active');
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
      <input type="text" class="form-input obj-name" placeholder="Название объекта">
      <input type="number" class="form-input obj-count" placeholder="Кол-во" style="max-width:100px;">
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

  // 6. Кнопки Отмена / Сохранить / Опубликовать
  const btnCancel = document.getElementById('btn-cancel');
  const btnSave = document.getElementById('btn-save');
  const btnPublish = document.getElementById('btn-publish');

  btnCancel?.addEventListener('click', () => modal.classList.remove('active'));
  btnSave?.addEventListener('click', () => modal.classList.remove('active'));

  // Кнопка Опубликовать - отправляет данные
  btnPublish?.addEventListener('click', async () => {
    const name = document.getElementById('acc-name').value;
    const guildId = localStorage.getItem('currentGuildId');
    
    if (!name || !selectedPubChannel) {
      if (!name) document.getElementById('acc-name').style.borderColor = '#ed4245';
      if (!selectedPubChannel) alert("Пожалуйста, выберите канал публикации!");
      return; 
    }

    document.getElementById('acc-name').style.borderColor = '';

    const originalText = btnPublish.textContent;
    btnPublish.textContent = "Публикация...";
    btnPublish.disabled = true;
    btnPublish.style.opacity = '0.7';

    try {
      // Собираем объекты
      const items = [];
      document.querySelectorAll('.object-item').forEach(item => {
          items.push({
              name: item.querySelector('.obj-name').value,
              count: parseInt(item.querySelector('.obj-count').value) || 0
          });
      });

      // 1. Отправляем данные на Worker (сохраняем в БД)
      const saveResponse = await fetch(`${API_URL}/api/accounting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: guildId,
          name: name,
          channelId: selectedPubChannel,
          channelName: selectedPubChannelName,
          items: items
        })
      });

      if (!saveResponse.ok) throw new Error('Ошибка сохранения в БД');

      // 2. Отправляем данные боту для отправки в Discord
      const botResponse = await fetch(`${API_URL}/api/send-accounting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: guildId,
          channelId: selectedPubChannel,
          title: name,
          name: name,
          objects: items
        })
      });

      const result = await botResponse.json();
      if (!result.success) throw new Error(result.error || 'Бот не отвечает');

      // 3. Добавляем строку в таблицу на сайте
      addAccountingRow(name, selectedPubChannel, selectedPubChannelName, items);
      
      modal.classList.remove('active');
    } catch (error) {
      alert("Ошибка при публикации: " + error.message);
    } finally {
      btnPublish.textContent = originalText;
      btnPublish.disabled = false;
      btnPublish.style.opacity = '1';
    }
  });

  if (localStorage.getItem('discord_token')) {
    loadGuilds();
  } else {
    showScreen('screen-login');
  }
});

// --- ФУНКЦИИ ДЛЯ РАБОТЫ С БАЗОЙ ---

// Загрузка данных из базы при входе на экран
async function loadAccountingData() {
  const guildId = localStorage.getItem('currentGuildId');
  if (!guildId) return;

  try {
    const response = await fetch(`${API_URL}/api/accounting?guild_id=${guildId}`);
    const data = await response.json();
    
    // Очищаем таблицу
    const container = document.getElementById('accounting-rows');
    container.innerHTML = '';
    
    if (data.length === 0) {
      container.innerHTML = 'У вас пока нет созданных учётов...';
      container.style.padding = '40px'; container.style.textAlign = 'center';
      document.querySelector('.badge').textContent = '0 опубликованных';
      document.querySelector('.limit-text').textContent = '0/100 использовано';
      return;
    }

    document.querySelector('.badge').textContent = `${data.length} опубликованных`;
    document.querySelector('.limit-text').textContent = `${data.length}/100 использовано`;
    container.style.padding = '0'; container.style.textAlign = 'left'; container.style.color = 'inherit';

    data.forEach(item => {
      addAccountingRow(item.name, item.channel_id, item.channel_name, item.items);
    });
  } catch (e) {
    console.error('Ошибка загрузки:', e);
  }
}

function addAccountingRow(name, channelId, channelName, items = []) {
  const container = document.getElementById('accounting-rows');
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU') + ' в ' + now.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'});

  let itemsHtml = '';
  if (items && items.length > 0) {
    itemsHtml = '<div style="font-size:12px; color:#9aa0b0; margin-top:8px; line-height:1.4;">';
    items.forEach((item, index) => {
      itemsHtml += `<div>${index + 1}. ${item.name} - ${item.count} шт</div>`;
    });
    itemsHtml += '</div>';
  }

  const row = document.createElement('div');
  row.className = 'table-row';
  row.innerHTML = `
    <div class="table-cell-main">
      <div class="accounting-name">${name}</div>
      <div class="accounting-channels"># ${channelName}</div>
      ${itemsHtml}
    </div>
    <div class="table-cell-status">
      <span class="status-badge status-green">✓ Опубликован</span>
    </div>
    <div class="table-cell-time">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      ${dateStr}
    </div>
    <div class="table-cell-actions" style="position:relative;">
      <button class="btn-icon btn-menu-toggle">⋮</button>
      <div class="action-menu">
        <button class="edit-btn">Изменить</button>
        <button class="delete-btn delete">Удалить</button>
      </div>
    </div>
  `;

  const toggleBtn = row.querySelector('.btn-menu-toggle');
  const menu = row.querySelector('.action-menu');
  
  toggleBtn.onclick = (e) => {
    e.stopPropagation();
    document.querySelectorAll('.action-menu').forEach(m => { if(m !== menu) m.classList.remove('active'); });
    menu.classList.toggle('active');
  };

  row.querySelector('.delete-btn').onclick = () => {
    row.remove();
    if (container.children.length === 0) {
      container.innerHTML = 'У вас пока нет созданных учётов...';
      container.style.padding = '40px'; container.style.textAlign = 'center';
      document.querySelector('.badge').textContent = '0 опубликованных';
      document.querySelector('.limit-text').textContent = '0/100 использовано';
    }
  };

  row.querySelector('.edit-btn').onclick = () => {
    document.getElementById('modal-accounting').classList.add('active');
    document.getElementById('modal-title').textContent = 'Редактирование учёта';
    document.getElementById('acc-name').value = name;
  };

  container.appendChild(row);
}

document.addEventListener('click', () => {
  document.querySelectorAll('.action-menu').forEach(m => m.classList.remove('active'));
});

// --- ОСТАЛЬНЫЕ ФУНКЦИИ (ЗАГРУЗКА СЕРВЕРОВ, КАНАЛОВ, РОЛЕЙ) ---
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

async function openRoleSelect() {
  const dropdown = document.getElementById('roles-dropdown');
  document.querySelectorAll('.dropdown-content').forEach(d => { if(d !== dropdown) d.style.display = 'none'; });
  if (dropdown.style.display === 'block') { dropdown.style.display = 'none'; return; }
  dropdown.style.display = 'block';
  
  if (dropdown.innerHTML.includes('Загрузка')) {
    const guildId = localStorage.getItem('currentGuildId');
    const res = await fetch(`${API_URL}/api/guild-roles?guild_id=${guildId}`);
    const roles = await res.json();
    
    dropdown.innerHTML = '';
    roles.forEach(r => {
      const isChecked = selectedRoles.some(role => role.id === r.id) ? 'checked' : '';
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.innerHTML = `<input type="checkbox" value="${r.id}" ${isChecked} onchange="toggleRole('${r.id}', '${r.name}', this)"> <span>${r.name}</span>`;
      dropdown.appendChild(item);
    });

    const submitBtn = document.createElement('button');
    submitBtn.className = 'dropdown-submit-btn';
    submitBtn.textContent = 'Готово';
    submitBtn.onclick = () => { dropdown.style.display = 'none'; };
    dropdown.appendChild(submitBtn);
  }
}

function toggleRole(id, name, checkbox) {
  if (checkbox.checked) selectedRoles.push({ id, name });
  else selectedRoles = selectedRoles.filter(r => r.id !== id);
  const box = document.getElementById('selected-roles');
  if (selectedRoles.length === 0) box.textContent = 'Выберите роли...';
  else box.textContent = selectedRoles.map(r => r.name).join(', ');
}

async function openChannelSelect(type) {
  const dropdownId = type === 'pub' ? 'pub-dropdown' : 'log-dropdown';
  const dropdown = document.getElementById(dropdownId);
  document.querySelectorAll('.dropdown-content').forEach(d => { if(d !== dropdown) d.style.display = 'none'; });
  if (dropdown.style.display === 'block') { dropdown.style.display = 'none'; return; }
  dropdown.style.display = 'block';

  if (dropdown.innerHTML.includes('Загрузка')) {
    const guildId = localStorage.getItem('currentGuildId');
    const res = await fetch(`${API_URL}/api/guild-channels?guild_id=${guildId}`);
    const channels = await res.json();

    dropdown.innerHTML = '';
    channels.forEach(c => {
      const isChecked = (type === 'pub' && selectedPubChannel === c.id) || (type === 'log' && selectedLogChannel === c.id) ? 'checked' : '';
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.innerHTML = `<input type="radio" name="${type}-channel" value="${c.id}" ${isChecked} onchange="selectChannel('${type}', '${c.id}', '${c.name}')"> <span># ${c.name}</span>`;
      dropdown.appendChild(item);
    });

    const submitBtn = document.createElement('button');
    submitBtn.className = 'dropdown-submit-btn';
    submitBtn.textContent = 'Готово';
    submitBtn.onclick = () => { dropdown.style.display = 'none'; };
    dropdown.appendChild(submitBtn);
  }
}

function selectChannel(type, id, name) {
  if (type === 'pub') {
    selectedPubChannel = id;
    selectedPubChannelName = name;
    document.getElementById('selected-pub-channel').textContent = '# ' + name;
  } else {
    selectedLogChannel = id;
    selectedLogChannelName = name;
    document.getElementById('selected-log-channel').textContent = '# ' + name;
  }
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.custom-select-box') && !e.target.closest('.dropdown-content')) {
    document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');
  }
});