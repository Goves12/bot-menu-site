document.getElementById('discord-login').addEventListener('click', () => {
  // ⚠️ ЗАМЕНИТЕ ЭТУ ССЫЛКУ НА ВАШ URL РАБОЧЕГО (Worker)
  const API_URL = 'https://bot-menu-api.ВАШ_СУБДОМЕН.workers.dev'; 
  window.location.href = `${API_URL}/api/auth/login`;
});