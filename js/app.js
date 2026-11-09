// public/js/app.js (фрагмент)
document.getElementById('discord-login').addEventListener('click', () => {
  // Перенаправляем на наш Worker, который запустит OAuth
  window.location.href = '/api/auth/login';
});

// ... остальная логика показа экранов ...