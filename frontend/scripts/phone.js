const CODE_LENGTH = 5;
const SMS_CODE = "22222";

function getApiBase() {
    return window.location.port === "5000"
        ? window.location.origin
        : "http://localhost:5000";
}

const API_BASE = getApiBase();

let phoneSessionId = null;
let smsCode = "";

function tr(key, vars = {}) {
    if (window.maxspiseI18n) {
        return window.maxspiseI18n.t(key, vars);
    }
    const fallbacks = {
        phoneErrorFull: "Введите номер полностью",
        phoneErrorInvalid: "Неверный номер телефона",
        phoneErrorServer: "Сервер недоступен. Запустите python server.py",
        smsError: "Неверный код",
        registerOk: "Регистрация успешна: {phone}",
        verifyError: "Ошибка проверки кода",
        nameError: "Введите имя",
        photoError: "Добавьте фото профиля",
        chatMessageWelcome: "Добро пожаловать в MaxSpise! Здесь появятся ваши сообщения.",
        chatMessageSaved: "Сохраняйте сюда заметки, ссылки и файлы."
    };
    let text = fallbacks[key] || key;
    Object.entries(vars).forEach(([name, value]) => {
        text = text.replace(`{${name}}`, value);
    });
    return text;
}

function updateSmsSentText(phoneDisplay) {
    const el = document.getElementById("smsSentText");
    el.dataset.phoneDisplay = phoneDisplay;
    el.innerHTML = tr("smsSent", { phone: phoneDisplay });
}

const PROFILE_KEY = "maxspise-profile";

const screens = {
    qr: document.getElementById("screenQr"),
    phone: document.getElementById("screenPhone"),
    sms: document.getElementById("screenSms"),
    name: document.getElementById("screenName"),
    photo: document.getElementById("screenPhoto"),
    main: document.getElementById("screenMain")
};

let profileDraft = {
    phone: "",
    name: "",
    avatar: ""
};

function isMobileDevice() {
    return window.matchMedia("(max-width: 768px)").matches
        || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function applyDeviceMode() {
    document.body.classList.toggle("is-mobile", isMobileDevice());
}

function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
        el.classList.toggle("screen-active", key === name);
    });

    document.body.classList.toggle("app-main", name === "main");

    if (name === "sms") {
        focusCodeInput();
    }

    if (name === "name") {
        const input = document.getElementById("nameInput");
        input.value = profileDraft.name;
        updateNameContinueState();
        setTimeout(() => input.focus(), 80);
    }
}

function focusCodeInput() {
    const input = document.getElementById("codeInput");
    const mobile = isMobileDevice();

    input.readOnly = mobile;

    if (!mobile) {
        setTimeout(() => input.focus(), 80);
    }
}

function formatPhoneInput(value) {
    const digits = value.replace(/\D/g, "").slice(0, 10);

    if (digits.length <= 3) return digits;
    if (digits.length <= 6) {
        return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    }
    if (digits.length <= 8) {
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
}

function getPhoneDigits() {
    return document.getElementById("phoneInput").value.replace(/\D/g, "");
}

function setError(id, message) {
    const el = document.getElementById(id);
    if (!message) {
        el.textContent = "";
        el.classList.add("hidden");
        return;
    }
    el.textContent = message;
    el.classList.remove("hidden");
}

function resetSmsCode() {
    smsCode = "";
    document.getElementById("codeInput").value = "";
    renderCodeCells();
}

function renderCodeCells() {
    const cells = document.querySelectorAll(".code-cell");
    cells.forEach((cell, index) => {
        const char = smsCode[index] || "";
        cell.textContent = char;
        cell.classList.toggle(
            "code-cell-active",
            index === smsCode.length && smsCode.length < CODE_LENGTH
        );
        cell.classList.toggle("code-cell-filled", Boolean(char));
    });
}

function setSmsCode(value) {
    smsCode = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    document.getElementById("codeInput").value = smsCode;
    renderCodeCells();

    if (smsCode.length === CODE_LENGTH) {
        verifyCode();
    }
}

async function sendCode() {
    const digits = getPhoneDigits();
    setError("phoneError", "");

    if (digits.length !== 10) {
        setError("phoneError", tr("phoneErrorFull"));
        return;
    }

    const btn = document.getElementById("sendCodeBtn");
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/api/phone/send-code`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: digits })
        });

        const data = await response.json();

        if (!response.ok) {
            setError("phoneError", tr("phoneErrorInvalid"));
            return;
        }

        phoneSessionId = data.sessionId;
        updateSmsSentText(data.phoneDisplay);

        resetSmsCode();
        setError("smsError", "");
        showScreen("sms");
    } catch (err) {
        setError("phoneError", tr("phoneErrorServer"));
        console.error(err);
    } finally {
        btn.disabled = false;
    }
}

async function verifyCode() {
    if (smsCode.length !== CODE_LENGTH || !phoneSessionId) return;

    setError("smsError", "");

    if (smsCode !== SMS_CODE) {
        setError("smsError", tr("smsError"));
        resetSmsCode();
        focusCodeInput();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/phone/verify-code`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sessionId: phoneSessionId,
                code: smsCode
            })
        });

        const data = await response.json();

        if (!response.ok) {
            setError("smsError", tr("smsError"));
            resetSmsCode();
            focusCodeInput();
            return;
        }

        profileDraft.phone = data.phone || "";
        phoneSessionId = null;
        resetSmsCode();
        showScreen("name");
    } catch (err) {
        setError("smsError", tr("verifyError"));
        console.error(err);
    }
}

function appendDigit(digit) {
    if (smsCode.length >= CODE_LENGTH) return;
    setSmsCode(smsCode + digit);
}

function removeDigit() {
    setSmsCode(smsCode.slice(0, -1));
}

function initPhoneAuth() {
    document.getElementById("openPhoneBtn")?.addEventListener("click", () => {
        setError("phoneError", "");
        showScreen("phone");
        document.getElementById("phoneInput")?.focus();
    });
}

initPhoneAuth();

document.getElementById("phoneBackBtn").addEventListener("click", () => {
    showScreen("qr");
});

document.getElementById("smsBackBtn").addEventListener("click", () => {
    phoneSessionId = null;
    delete document.getElementById("smsSentText").dataset.phoneDisplay;
    resetSmsCode();
    setError("smsError", "");
    showScreen("phone");
});

document.getElementById("sendCodeBtn").addEventListener("click", sendCode);

document.getElementById("phoneInput").addEventListener("input", (e) => {
    e.target.value = formatPhoneInput(e.target.value);
});

document.getElementById("phoneInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        sendCode();
    }
});

document.getElementById("codeInput").addEventListener("input", (e) => {
    setSmsCode(e.target.value);
});

document.getElementById("codeBoxes").addEventListener("click", () => {
    focusCodeInput();
});

const numpad = document.getElementById("numpad");
if (numpad) {
    numpad.addEventListener("click", (e) => {
        const key = e.target.closest(".numpad-key");
        if (!key || key.disabled) return;

        const digit = key.dataset.digit;
        if (digit !== undefined) {
            appendDigit(digit);
        }
    });
}

document.getElementById("numpadBack").addEventListener("click", removeDigit);

document.addEventListener("keydown", (e) => {
    if (!screens.sms.classList.contains("screen-active")) return;

    if (e.key === "Backspace") {
        e.preventDefault();
        removeDigit();
        return;
    }

    if (/^\d$/.test(e.key)) {
        e.preventDefault();
        appendDigit(e.key);
    }
});

window.addEventListener("resize", applyDeviceMode);

document.addEventListener("languagechange", () => {
    const smsSent = document.getElementById("smsSentText");
    if (smsSent.dataset.phoneDisplay) {
        updateSmsSentText(smsSent.dataset.phoneDisplay);
    }
});

function updateNameContinueState() {
    const name = document.getElementById("nameInput").value.trim();
    document.getElementById("nameContinueBtn").disabled = name.length < 2;
}

function continueFromName() {
    const name = document.getElementById("nameInput").value.trim();
    setError("nameError", "");

    if (name.length < 2) {
        setError("nameError", tr("nameError"));
        return;
    }

    profileDraft.name = name;
    setError("photoError", "");
    resetPhotoPicker();
    showScreen("photo");
}

function resetPhotoPicker() {
    document.getElementById("avatarPreview").classList.add("hidden");
    document.getElementById("avatarPreview").removeAttribute("src");
    document.getElementById("avatarPlaceholder").classList.remove("hidden");
    document.getElementById("avatarFile").value = "";
    document.getElementById("photoContinueBtn").disabled = true;
    profileDraft.avatar = "";
}

function handleAvatarSelected(file) {
    if (!file || !file.type.startsWith("image/")) {
        setError("photoError", tr("photoError"));
        return;
    }

    setError("photoError", "");

    const reader = new FileReader();
    reader.onload = () => {
        profileDraft.avatar = reader.result;
        const preview = document.getElementById("avatarPreview");
        preview.src = profileDraft.avatar;
        preview.classList.remove("hidden");
        document.getElementById("avatarPlaceholder").classList.add("hidden");
        document.getElementById("photoContinueBtn").disabled = false;
    };
    reader.readAsDataURL(file);
}

function saveProfileAndEnter() {
    if (!profileDraft.avatar) {
        setError("photoError", tr("photoError"));
        return;
    }

    if (window.maxspiseStore) {
        window.maxspiseStore.setProfile({
            phone: profileDraft.phone,
            name: profileDraft.name,
            avatar: profileDraft.avatar
        });
    } else {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profileDraft));
    }

    applyProfileToMain();
    showScreen("main");
    window.maxspiseMain?.onEnterMain?.(profileDraft.phone);
}

function applyProfileToMain() {
    const initial = profileDraft.name.trim().charAt(0).toUpperCase() || "?";
    const avatarEl = document.getElementById("mainProfileAvatar");

    avatarEl.textContent = "";
    avatarEl.style.backgroundImage = "";

    if (profileDraft.avatar) {
        avatarEl.style.backgroundImage = `url('${profileDraft.avatar}')`;
    } else {
        avatarEl.textContent = initial;
    }

    window.maxspiseMain?.refreshProfile?.();
}

function restoreSessionIfAny() {
    try {
        const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
        if (!saved?.name || !saved?.avatar) return;

        profileDraft = saved;
        if (window.maxspiseStore) {
            window.maxspiseStore.setProfile({
                phone: saved.phone || "",
                name: saved.name,
                avatar: saved.avatar
            });
        }
        applyProfileToMain();
        showScreen("main");
        window.maxspiseMain?.refreshProfile?.();
    } catch {
        localStorage.removeItem(PROFILE_KEY);
    }
}

document.getElementById("nameInput").addEventListener("input", updateNameContinueState);

document.getElementById("nameInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        continueFromName();
    }
});

document.getElementById("nameContinueBtn").addEventListener("click", continueFromName);

document.getElementById("avatarPicker").addEventListener("click", () => {
    document.getElementById("avatarFile").click();
});

document.getElementById("avatarFile").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handleAvatarSelected(file);
});

document.getElementById("photoContinueBtn").addEventListener("click", saveProfileAndEnter);

applyDeviceMode();
renderCodeCells();
resetPhotoPicker();
restoreSessionIfAny();
