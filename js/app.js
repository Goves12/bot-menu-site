document.getElementById('discord-login').addEventListener('click', () => {
  // Адрес твоего сервера на Cloudflare
  const API_URL = 'https://bot-menu-api.vadrgnuil.workers.dev';
  
  // Перенаправляем пользователя на страницу входа
  window.location.href = `${API_URL}/api/auth/login`;
});