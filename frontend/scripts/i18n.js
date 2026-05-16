const STRINGS = {
    ru: {
        langAria: "Изменить язык",
        helpAria: "Помощь",
        refreshAria: "Обновить QR-код",
        qrTitle: "Войдите в MaxSpise по QR-коду",
        qrSubtitle:
            "Наведите камеру на QR-код, чтобы войти в&nbsp;профиль или&nbsp;скачать приложение",
        qrExpiredTitle: "QR-код устарел",
        qrExpiredSubtitle:
            "Обновите его, чтобы войти в&nbsp;профиль или&nbsp;скачать приложение",
        sessionError: "Авторизационная сессия не найдена",
        phoneRegister: "Регистрация по номеру",
        phoneTitle: "Ваш номер телефона",
        phoneHint: "Укажите номер в международном формате.<br>Мы отправим код в СМС.",
        phoneContinue: "Продолжить",
        phoneErrorFull: "Введите номер полностью",
        phoneErrorInvalid: "Неверный номер телефона",
        phoneErrorServer: "Сервер недоступен. Запустите python server.py",
        smsTitle: "Какой код пришёл в СМС?",
        smsSent: "Отправили код на {phone}.<br>Если номер неверный, вернитесь назад",
        smsError: "Неверный код",
        loginOk: "Вход выполнен",
        registerOk: "Регистрация успешна: {phone}",
        langRu: "Русский",
        langEn: "English",
        backAria: "Назад",
        deleteAria: "Удалить",
        verifyError: "Ошибка проверки кода",
        nameTitle: "Как вас зовут?",
        nameHint: "Укажите имя, которое будут видеть ваши контакты",
        namePlaceholder: "Имя",
        nameError: "Введите имя",
        photoTitle: "Добавьте фото профиля",
        photoHint: "Так вас смогут узнать друзья и близкие",
        photoPickAria: "Выбрать фото",
        photoContinue: "Продолжить",
        photoError: "Добавьте фото профиля",
        navChats: "Чаты",
        navCalls: "Звонки",
        searchPlaceholder: "Поиск",
        chatWelcome: "Добро пожаловать в MaxSpise",
        chatSaved: "Избранное",
        chatSavedPreview: "Заметки и файлы",
        mainEmptyTitle: "Выберите чат",
        mainEmptyText: "Переписки и звонки появятся здесь",
        callsEmpty: "История звонков пока пуста",
        chatBackAria: "К списку чатов",
        chatSavedHint: "Сохраняйте сюда заметки и файлы",
        chatServicePreview: "Сервисные уведомления",
        chatServiceSubtitle: "Сервисные уведомления",
        yesterday: "вчера",
        messagePlaceholder: "Сообщение",
        settingsAria: "Настройки",
        settingsTitle: "Настройки",
        settingsProfile: "Профиль",
        settingsAppearance: "Оформление",
        settingsDevices: "Устройства",
        settingsUsername: "Имя пользователя",
        settingsBio: "О себе",
        settingsSave: "Сохранить",
        settingsTheme: "Тема",
        settingsNotifications: "Уведомления",
        settingsDevicesHint: "Текущее устройство — активная сессия. Завершите другие сессии при подозрительном входе.",
        settingsThisDevice: "Это устройство",
        newChatTitle: "Новый чат",
        newGroup: "Группа",
        newChannel: "Канал",
        newGroupPlaceholder: "Название группы",
        newChannelPlaceholder: "Название канала",
        create: "Создать",
        groupMembers: "{n} участников",
        channelSubscribers: "Канал",
        callAria: "Позвонить",
        callStarted: "Звонок {name}…",
        callIncoming: "Входящий",
        callOutgoing: "Исходящий",
        callMissed: "Пропущенный",
        unknownContact: "Контакт",
        attachAria: "Прикрепить файл",
        sendAria: "Отправить"
    },
    en: {
        langAria: "Change language",
        helpAria: "Help",
        refreshAria: "Refresh QR code",
        qrTitle: "Log in to MaxSpise with QR code",
        qrSubtitle:
            "Point your camera at the QR code to log in to&nbsp;your profile or&nbsp;download the app",
        qrExpiredTitle: "QR code expired",
        qrExpiredSubtitle:
            "Refresh it to log in to&nbsp;your profile or&nbsp;download the app",
        sessionError: "Authorization session not found",
        phoneRegister: "Register by phone number",
        phoneTitle: "Your phone number",
        phoneHint: "Enter your number in international format.<br>We will send an SMS code.",
        phoneContinue: "Continue",
        phoneErrorFull: "Enter the full number",
        phoneErrorInvalid: "Invalid phone number",
        phoneErrorServer: "Server unavailable. Run python server.py",
        smsTitle: "What code did you receive?",
        smsSent: "We sent a code to {phone}.<br>If the number is wrong, go back",
        smsError: "Invalid code",
        loginOk: "Login successful",
        registerOk: "Registration successful: {phone}",
        langRu: "Русский",
        langEn: "English",
        backAria: "Back",
        deleteAria: "Delete",
        verifyError: "Code verification failed",
        nameTitle: "What is your name?",
        nameHint: "This is how your contacts will see you",
        namePlaceholder: "Name",
        nameError: "Enter your name",
        photoTitle: "Add a profile photo",
        photoHint: "So friends and family can recognize you",
        photoPickAria: "Choose photo",
        photoContinue: "Continue",
        photoError: "Add a profile photo",
        navChats: "Chats",
        navCalls: "Calls",
        searchPlaceholder: "Search",
        chatWelcome: "Welcome to MaxSpise",
        chatSaved: "Saved messages",
        chatSavedPreview: "Notes and files",
        mainEmptyTitle: "Select a chat",
        mainEmptyText: "Messages and calls will appear here",
        callsEmpty: "No call history yet",
        chatBackAria: "Back to chat list",
        chatSavedHint: "Save notes and files here",
        chatServicePreview: "Service notifications",
        chatServiceSubtitle: "Service notifications",
        yesterday: "yesterday",
        messagePlaceholder: "Message",
        settingsAria: "Settings",
        settingsTitle: "Settings",
        settingsProfile: "Profile",
        settingsAppearance: "Appearance",
        settingsDevices: "Devices",
        settingsUsername: "Username",
        settingsBio: "Bio",
        settingsSave: "Save",
        settingsTheme: "Theme",
        settingsNotifications: "Notifications",
        settingsDevicesHint: "This device is the active session.",
        settingsThisDevice: "This device",
        newChatTitle: "New chat",
        newGroup: "Group",
        newChannel: "Channel",
        newGroupPlaceholder: "Group name",
        newChannelPlaceholder: "Channel name",
        create: "Create",
        groupMembers: "{n} members",
        channelSubscribers: "Channel",
        callAria: "Call",
        callStarted: "Calling {name}…",
        callIncoming: "Incoming",
        callOutgoing: "Outgoing",
        callMissed: "Missed",
        unknownContact: "Contact",
        attachAria: "Attach file",
        sendAria: "Send"
    }
};

let currentLang = localStorage.getItem("maxspise-lang") || "ru";

function t(key, vars = {}) {
    let text = STRINGS[currentLang][key] || STRINGS.ru[key] || key;
    Object.entries(vars).forEach(([name, value]) => {
        text = text.replace(`{${name}}`, value);
    });
    return text;
}

function applyLanguage() {
    document.documentElement.lang = currentLang;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.dataset.i18n;
        if (!key) return;

        if (el.dataset.i18nHtml === "true") {
            el.innerHTML = t(key);
        } else {
            el.textContent = t(key);
        }
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
        el.setAttribute("aria-label", t(el.dataset.i18nAria));
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
    });

    const smsSent = document.getElementById("smsSentText");
    if (smsSent?.dataset.phoneDisplay) {
        smsSent.innerHTML = t("smsSent", {
            phone: smsSent.dataset.phoneDisplay
        });
    }

    document.dispatchEvent(
        new CustomEvent("languagechange", { detail: { lang: currentLang } })
    );
}

function setLanguage(lang) {
    if (!STRINGS[lang] || lang === currentLang) return;
    currentLang = lang;
    localStorage.setItem("maxspise-lang", lang);
    applyLanguage();
}

function toggleLangMenu() {
    const menu = document.getElementById("langMenu");
    menu.classList.toggle("hidden");
}

function initLanguage() {
    const langBtn = document.getElementById("langBtn");
    const langMenu = document.getElementById("langMenu");

    langBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleLangMenu();
    });

    langMenu.querySelectorAll("[data-lang]").forEach((btn) => {
        btn.addEventListener("click", () => {
            setLanguage(btn.dataset.lang);
            langMenu.classList.add("hidden");
        });
    });

    document.addEventListener("click", () => {
        langMenu.classList.add("hidden");
    });

    langMenu.addEventListener("click", (e) => e.stopPropagation());

    applyLanguage();
}

document.addEventListener("DOMContentLoaded", initLanguage);

window.maxspiseI18n = { t, setLanguage, applyLanguage, getLang: () => currentLang };
