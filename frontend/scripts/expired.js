
const title = document.querySelector('.title');
const subtitle = document.querySelector('.subtitle');
const authError = document.getElementById('auth-error');

function showExpiredText() {
    if (!title || !subtitle) return;

    title.textContent   = 'QR‑код устарел';
    subtitle.textContent = 'Обновите его, чтобы войти в профиль или скачать приложение';

    authError.textContent = 'Авторизационная сессия не найдена';
    authError.classList.remove('hidden');
}

function resetExpiredText() {
    if (!title || !subtitle) return;

    title.textContent   = 'Войдите в Maxgram по QR‑коду';
    subtitle.textContent =
        'Наведите камеру на QR‑код, чтобы войти в профиль или скачать приложение';
    authError.classList.add('hidden');
}

