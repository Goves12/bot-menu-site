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
let editingId = null; 

// Переменные для заявок
let appSelectedPub = null;
let appSelectedLog = null;
let appSelectedCategory = null;
let appSelectedRoles = [];

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

  // 2. Переход на экран Учёта и Заявок
  document.querySelectorAll('.module-card').forEach(card => {
    const title = card.querySelector('h3').textContent;
    if (title === 'Учёт') {
      card.querySelector('button').onclick = () => {
        showScreen('screen-accounting');
        loadAccountingData(); 
      };
    }
    if (title === 'Заявки') {
      card.querySelector('button').onclick = () => {
        showScreen('screen-applications');
        loadApplicationsData(); 
      };
    }
  });

  // 3. Кнопки "Назад"
  document.getElementById('back-to-servers')?.addEventListener('click', () => showScreen('screen-servers'));
  document.getElementById('back-to-settings')?.addEventListener('click', () => showScreen('screen-settings'));
  document.getElementById('back-to-settings-apps')?.addEventListener('click', () => showScreen('screen-settings'));

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
    editingId = null;

    modalTitle.textContent = 'Новый учёт';
    modal.classList.add('active');
  });

  btnCloseModal?.addEventListener('click', () => modal.classList.remove('active'));
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

  // 5. Добавление объектов в форму (Учёт)
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

  // 6. Кнопки Отмена / Сохранить / Опубликовать (Учёт)
  const btnCancel = document.getElementById('btn-cancel');
  const btnSave = document.getElementById('btn-save');
  const btnPublish = document.getElementById('btn-publish');

  btnCancel?.addEventListener('click', () => modal.classList.remove('active'));
  btnSave?.addEventListener('click', () => {
    showToast("Черновик сохранён (пока не реализовано)", "success");
    modal.classList.remove('active');
  });

  btnPublish?.addEventListener('click', async () => {
    const name = document.getElementById('acc-name').value;
    const guildId = localStorage.getItem('currentGuildId');
    
    if (!name || !selectedPubChannel) {
      if (!name) document.getElementById('acc-name').style.borderColor = '#ed4245';
      if (!selectedPubChannel) showToast("Пожалуйста, выберите канал публикации!", "error");
      return; 
    }

    document.getElementById('acc-name').style.borderColor = '';

    const originalText = btnPublish.textContent;
    btnPublish.textContent = "Публикация...";
    btnPublish.disabled = true;
    btnPublish.style.opacity = '0.7';

    try {
      const items = [];
      document.querySelectorAll('.object-item').forEach(item => {
          items.push({
              name: item.querySelector('.obj-name').value,
              count: parseInt(item.querySelector('.obj-count').value) || 0
          });
      });

      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${API_URL}/api/accounting/${editingId}` : `${API_URL}/api/accounting`;

      const saveResponse = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: guildId,
          name: name,
          channelId: selectedPubChannel,
          channelName: selectedPubChannelName,
          channelLogsId: selectedLogChannel,
          items: items
        })
      });

      if (!saveResponse.ok) throw new Error('Ошибка сохранения в БД');

      const botResponse = await fetch(`${API_URL}/api/send-accounting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: guildId,
          channelId: selectedPubChannel,
          channelLogsId: selectedLogChannel,
          title: name,
          name: name,
          objects: items
        })
      });

      const result = await botResponse.json();
      if (!result.success) throw new Error(result.error || 'Бот не отвечает');

      loadAccountingData();
      
      modal.classList.remove('active');
      showToast(editingId ? "Учёт обновлен!" : "Учёт создан!", "success");
      editingId = null;
      
    } catch (error) {
      showToast("Ошибка при публикации: " + error.message, "error");
    } finally {
      btnPublish.textContent = originalText;
      btnPublish.disabled = false;
      btnPublish.style.opacity = '1';
    }
  });

  // 7. Модальное окно ЗАЯВОК
  const appModal = document.getElementById('modal-application');
  const openAppModal = document.getElementById('open-application-modal');
  const closeAppModal = document.getElementById('close-application-modal');
  const cancelAppBtn = document.getElementById('cancel-app-btn');
  const publishAppBtn = document.getElementById('publish-app-btn');

  openAppModal?.addEventListener('click', () => {
    appModal.classList.add('active');
    document.getElementById('app-modal-title').textContent = 'Новая заявка';
    document.getElementById('app-fields-list').innerHTML = ''; 
    // Сброс переменных
    appSelectedPub = null; appSelectedLog = null; appSelectedCategory = null; appSelectedRoles = [];
    document.getElementById('app-selected-pub').textContent = 'Выберите канал...';
    document.getElementById('app-selected-log').textContent = 'Выберите канал...';
    document.getElementById('app-selected-category').textContent = 'Выберите категорию...';
    document.getElementById('app-selected-roles').textContent = 'Выберите роли...';
  });

  closeAppModal?.addEventListener('click', () => appModal.classList.remove('active'));
  cancelAppBtn?.addEventListener('click', () => appModal.classList.remove('active'));
  appModal?.addEventListener('click', (e) => { if (e.target === appModal) appModal.classList.remove('active'); });

  // Добавление вопроса в заявку
  document.getElementById('add-app-field')?.addEventListener('click', () => {
    const list = document.getElementById('app-fields-list');
    if (list.innerText.includes('Нет добавленных вопросов')) list.innerHTML = '';

    const fieldDiv = document.createElement('div');
    fieldDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center; background: #1e222d; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);';
    
    fieldDiv.innerHTML = `
      <input type="text" class="form-input app-field-title" placeholder="Вопрос (например: Ваш ник)" style="flex: 2; margin: 0; padding: 8px 12px; font-size: 13px;">
      <div style="display: flex; gap: 5px;">
        <button class="btn-tab active app-field-type" data-type="short" style="background: #5865f2; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px;">Кор.</button>
        <button class="btn-tab app-field-type" data-type="long" style="background: #36393f; color: #b9bbbe; padding: 4px 8px; border-radius: 4px; font-size: 11px;">Бол.</button>
      </div>
      <input type="text" class="form-input app-field-hint" placeholder="Подсказка" style="flex: 1; margin: 0; padding: 8px 12px; font-size: 13px; background: #0f1117;">
      <button class="btn-icon delete-app-field" style="color: #ed4245; background: rgba(237, 66, 69, 0.1); border-radius: 4px; padding: 4px 8px;">✕</button>
    `;

    fieldDiv.querySelector('.delete-app-field').onclick = () => {
      fieldDiv.remove();
      if (list.children.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 20px; color: #9aa0b0; border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px;">Нет добавленных вопросов. Нажмите «Добавить вопрос».</div>';
      }
    };

    fieldDiv.querySelectorAll('.app-field-type').forEach(btn => {
      btn.onclick = () => {
        fieldDiv.querySelectorAll('.app-field-type').forEach(b => {
          b.style.background = '#36393f'; b.style.color = '#b9bbbe'; b.classList.remove('active');
        });
        btn.style.background = '#5865f2'; btn.style.color = '#fff'; btn.classList.add('active');
      };
    });

    list.appendChild(fieldDiv);
  });

  // ОТПРАВКА ЗАЯВКИ
  publishAppBtn?.addEventListener('click', async () => {
    const name = document.getElementById('app-name').value;
    const guildId = localStorage.getItem('currentGuildId');
    
    if (!name || !appSelectedPub) {
      showToast("Пожалуйста, заполните название и выберите канал публикации!", "error");
      return;
    }

    // Собираем вопросы
    const questions = [];
    document.querySelectorAll('.app-field-title').forEach((input) => {
      const title = input.value;
      const typeBtn = input.closest('div').nextElementSibling.querySelector('.app-field-type.active');
      const type = typeBtn ? typeBtn.dataset.type : 'short';
      const hint = input.closest('div').parentElement.querySelector('.app-field-hint').value;
      
      if (title) {
        questions.push({ title, type, hint });
      }
    });

    const originalText = publishAppBtn.textContent;
    publishAppBtn.textContent = "Отправка...";
    publishAppBtn.disabled = true;
    publishAppBtn.style.opacity = '0.7';

    try {
      const response = await fetch(`${API_URL}/api/send-application`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: guildId,
          name: name,
          channelId: appSelectedPub,
          channelLogsId: appSelectedLog,
          categoryId: appSelectedCategory,
          buttonText: document.getElementById('app-btn-text').value,
          buttonColor: 'Primary',
          messageText: document.getElementById('app-msg-text').value,
          questions: questions,
          roles: appSelectedRoles
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка отправки');
      }

      showToast("Заявка успешно опубликована!", "success");
      appModal.classList.remove('active');
      
    } catch (error) {
      showToast("Ошибка: " + error.message, "error");
    } finally {
      publishAppBtn.textContent = originalText;
      publishAppBtn.disabled = false;
      publishAppBtn.style.opacity = '1';
    }
  });

  if (localStorage.getItem('discord_token')) {
    loadGuilds();
  } else {
    showScreen('screen-login');
  }
});

// --- ФУНКЦИИ ДЛЯ УЧЁТА ---

async function loadAccountingData() {
  const guildId = localStorage.getItem('currentGuildId');
  if (!guildId) return;

  try {
    const response = await fetch(`${API_URL}/api/accounting?guild_id=${guildId}`);
    const data = await response.json();
    
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
      addAccountingRow(item.id, item.name, item.channel_id, item.channel_name, item.items);
    });
  } catch (e) {
    console.error('Ошибка загрузки:', e);
  }
}

function addAccountingRow(id, name, channelId, channelName, items = []) {
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

  row.querySelector('.delete-btn').onclick = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот учёт?')) return;

    try {
      const response = await fetch(`${API_URL}/api/accounting/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Ошибка удаления');

      row.remove();
      showToast("Учёт успешно удалён!", "success");

      if (container.children.length === 0) {
        container.innerHTML = 'У вас пока нет созданных учётов...';
        container.style.padding = '40px'; container.style.textAlign = 'center';
        document.querySelector('.badge').textContent = '0 опубликованных';
        document.querySelector('.limit-text').textContent = '0/100 использовано';
      }
    } catch (e) {
      showToast('Не удалось удалить: ' + e.message, 'error');
    }
  };

  row.querySelector('.edit-btn').onclick = () => {
    openEditModal(id);
  };

  container.appendChild(row);
}

async function openEditModal(id) {
  try {
    const response = await fetch(`${API_URL}/api/accounting/${id}`);
    if (!response.ok) throw new Error('Не удалось загрузить данные');
    const data = await response.json();

    editingId = id;
    document.getElementById('modal-accounting').classList.add('active');
    document.getElementById('modal-title').textContent = 'Редактирование учёта';

    document.getElementById('acc-name').value = data.name;
    
    selectedPubChannel = data.channel_id;
    selectedPubChannelName = data.channel_name;
    document.getElementById('selected-pub-channel').textContent = '# ' + data.channel_name;

    if (data.channel_logs_id) {
      selectedLogChannel = data.channel_logs_id;
      document.getElementById('selected-log-channel').textContent = '# ' + (data.channel_logs_id ? 'Канал логов' : '');
    }

    const objectsList = document.getElementById('objects-list');
    objectsList.innerHTML = '';
    
    if (data.items && data.items.length > 0) {
      objectsList.classList.remove('empty-state');
      data.items.forEach(item => {
        const objDiv = document.createElement('div');
        objDiv.className = 'object-item';
        objDiv.innerHTML = `
          <input type="text" class="form-input obj-name" value="${item.name}">
          <input type="number" class="form-input obj-count" value="${item.count}" style="max-width:100px;">
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
    } else {
      objectsList.classList.add('empty-state');
      objectsList.innerHTML = '<p>Нет добавленных объектов</p>';
    }

  } catch (e) {
    showToast('Ошибка загрузки: ' + e.message, 'error');
  }
}

document.addEventListener('click', () => {
  document.querySelectorAll('.action-menu').forEach(m => m.classList.remove('active'));
});

// --- ФУНКЦИИ ДЛЯ ЗАЯВОК ---

async function loadApplicationsData() {
  document.querySelector('#applications-rows').innerHTML = 'Заявки пока не подключены к базе. (Скоро)';
}

async function openAppRoleSelect() {
  const dropdown = document.getElementById('app-roles-dropdown');
  document.querySelectorAll('.dropdown-content').forEach(d => { if(d !== dropdown) d.style.display = 'none'; });
  
  if (dropdown.style.display === 'block') { dropdown.style.display = 'none'; return; }
  dropdown.style.display = 'block';

  if (dropdown.innerHTML.includes('Загрузка')) {
    const guildId = localStorage.getItem('currentGuildId');
    const res = await fetch(`${API_URL}/api/guild-roles?guild_id=${guildId}`);
    const roles = await res.json();
    
    dropdown.innerHTML = '';
    roles.forEach(r => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.innerHTML = `<input type="checkbox" value="${r.id}" onchange="toggleAppRole('${r.id}', '${r.name}', this)"> <span>${r.name}</span>`;
      dropdown.appendChild(item);
    });

    const submitBtn = document.createElement('button');
    submitBtn.className = 'dropdown-submit-btn';
    submitBtn.textContent = 'Готово';
    submitBtn.onclick = () => { dropdown.style.display = 'none'; };
    dropdown.appendChild(submitBtn);
  }
}

function toggleAppRole(id, name, checkbox) {
  if (checkbox.checked) {
    appSelectedRoles.push({ id, name });
  } else {
    appSelectedRoles = appSelectedRoles.filter(r => r.id !== id);
  }
  
  const box = document.getElementById('app-selected-roles');
  if (appSelectedRoles.length === 0) box.textContent = 'Выберите роли...';
  else box.textContent = appSelectedRoles.map(r => r.name).join(', ');
}

async function openAppChannelSelect(type) {
  const dropdownId = `app-${type}-dropdown`;
  const dropdown = document.getElementById(dropdownId);
  
  document.querySelectorAll('.dropdown-content').forEach(d => { if(d !== dropdown) d.style.display = 'none'; });
  
  if (dropdown.style.display === 'block') { dropdown.style.display = 'none'; return; }
  dropdown.style.display = 'block';

  if (!dropdown.innerHTML.includes('Загрузка')) return;

  try {
    const guildId = localStorage.getItem('currentGuildId');
    const res = await fetch(`${API_URL}/api/guild-channels?guild_id=${guildId}`);
    const data = await res.json();

    if (Array.isArray(data)) {
      dropdown.innerHTML = '<p style="padding: 10px; color: #ed4245;">Сервер отдаёт старый формат! Сделайте wrangler deploy.</p>';
      return;
    }

    const { categories, channels } = data;

    let html = `
      <div class="channel-selector-menu active" style="position: static; display: flex; box-shadow: none; border: none; margin: 0;">
        <div class="channel-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa0b0" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" placeholder="Поиск..." oninput="filterChannels(this)">
        </div>
        <div class="channel-list">
    `;

    if (type === 'cat') {
      categories.forEach(cat => {
        html += `
          <div class="channel-item" onclick="selectAppChannel('cat', '${cat.id}', '${cat.name}')">
            <span style="color:#9aa0b0;">📁</span> <span>${cat.name}</span>
          </div>
        `;
      });
    } else {
      const uncategorized = channels.filter(c => !c.parent_id);
      if (uncategorized.length > 0) {
        html += `
          <div class="channel-category" onclick="toggleCategory(this)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            Без категории
          </div>
        `;
        uncategorized.forEach(c => {
          html += `
            <div class="channel-item" onclick="selectAppChannel('${type}', '${c.id}', '${c.name}')">
              <span style="color:#9aa0b0;">#</span> <span>${c.name}</span>
            </div>
          `;
        });
      }

      categories.forEach(cat => {
        const catChannels = channels.filter(c => c.parent_id === cat.id);
        if (catChannels.length === 0) return;

        html += `
          <div class="channel-category" onclick="toggleCategory(this)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            ${cat.name}
          </div>
        `;
        catChannels.forEach(c => {
          html += `
            <div class="channel-item" onclick="selectAppChannel('${type}', '${c.id}', '${c.name}')">
              <span style="color:#9aa0b0;">#</span> <span>${c.name}</span>
            </div>
          `;
        });
      });
    }

    html += `</div></div>`;
    dropdown.innerHTML = html;

    const submitBtn = document.createElement('button');
    submitBtn.className = 'dropdown-submit-btn';
    submitBtn.textContent = 'Готово';
    submitBtn.onclick = () => { dropdown.style.display = 'none'; };
    dropdown.appendChild(submitBtn);
  } catch (e) {
    dropdown.innerHTML = `<p style="padding: 10px; color: #ed4245;">Ошибка: ${e.message}</p>`;
  }
}

function selectAppChannel(type, id, name) {
  if (type === 'pub') {
    appSelectedPub = id;
    document.getElementById('app-selected-pub').textContent = '# ' + name;
  } else if (type === 'log') {
    appSelectedLog = id;
    document.getElementById('app-selected-log').textContent = '# ' + name;
  } else if (type === 'cat') {
    appSelectedCategory = id;
    document.getElementById('app-selected-category').textContent = '📁 ' + name;
  }
  document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');
}

function filterChannels(input) {
  const filter = input.value.toLowerCase();
  const items = input.closest('.channel-selector-menu').querySelectorAll('.channel-item');
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    if (text.includes(filter)) {
      item.classList.remove('hidden');
    } else {
      item.classList.add('hidden');
    }
  });
}

function toggleCategory(header) {
  header.classList.toggle('collapsed');
  let next = header.nextElementSibling;
  while (next && next.classList.contains('channel-item')) {
    next.style.display = header.classList.contains('collapsed') ? 'none' : 'flex';
    next = next.nextElementSibling;
  }
}

// --- ОСТАЛЬНЫЕ ФУНКЦИИ ---
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
    const data = await res.json();
    
    if (Array.isArray(data)) {
      dropdown.innerHTML = '<p style="padding: 10px; color: #ed4245;">Сервер отдаёт старый формат!</p>';
      return;
    }

    const { categories, channels } = data;

    let html = `
      <div class="channel-selector-menu active" style="position: static; display: flex; box-shadow: none; border: none; margin: 0;">
        <div class="channel-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa0b0" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" placeholder="Поиск каналов..." oninput="filterChannels(this)">
        </div>
        <div class="channel-list">
    `;

    const uncategorized = channels.filter(c => !c.parent_id);
    if (uncategorized.length > 0) {
      html += `
        <div class="channel-category" onclick="toggleCategory(this)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          Без категории
        </div>
      `;
      uncategorized.forEach(c => {
        html += `
          <div class="channel-item" onclick="selectChannel('${type}', '${c.id}', '${c.name}')">
            <span style="color:#9aa0b0;">#</span> <span>${c.name}</span>
          </div>
        `;
      });
    }

    categories.forEach(cat => {
      const catChannels = channels.filter(c => c.parent_id === cat.id);
      if (catChannels.length === 0) return;

      html += `
        <div class="channel-category" onclick="toggleCategory(this)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          ${cat.name}
        </div>
      `;
      catChannels.forEach(c => {
        html += `
          <div class="channel-item" onclick="selectChannel('${type}', '${c.id}', '${c.name}')">
            <span style="color:#9aa0b0;">#</span> <span>${c.name}</span>
          </div>
        `;
      });
    });

    html += `</div></div>`;
    dropdown.innerHTML = html;

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
  document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');
}

function showToast(message, type = 'success') {
  const oldToast = document.querySelector('.toast-notification');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${type === 'success' ? '#57F287' : '#ed4245'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${type === 'success' 
        ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
        : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
      }
    </svg>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}