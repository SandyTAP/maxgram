const phoneLoginBtn = document.getElementById("phoneLoginBtn");
const phoneForm = document.getElementById("phoneForm");
const phoneStep = document.getElementById("phoneStep");
const phoneInput = document.getElementById("phoneInput");
const phoneContinueBtn = document.getElementById("phoneContinueBtn");
const codeForm = document.getElementById("codeForm");
const codeInput = document.getElementById("codeInput");
const codeContinueBtn = document.getElementById("codeContinueBtn");
const backQrBtn = document.getElementById("backQrBtn");
const phoneMessage = document.getElementById("phoneMessage");
const devCode = document.getElementById("devCode");
const loginBox = document.querySelector(".login-box");

let phoneToken = null;

function setPhoneMessage(text, type = "") {
    phoneMessage.textContent = text;
    phoneMessage.className = "phone-message";

    if (type) {
        phoneMessage.classList.add(type);
    }
}

function normalizePhone(value) {
    let digits = value.replace(/\D/g, "");

    if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
        digits = digits.slice(1);
    }

    return digits.slice(0, 10);
}

function formatPhone(value) {
    const digits = normalizePhone(value);
    const parts = [];

    if (digits.slice(0, 3)) parts.push(digits.slice(0, 3));
    if (digits.slice(3, 6)) parts.push(digits.slice(3, 6));
    if (digits.slice(6, 8)) parts.push(digits.slice(6, 8));
    if (digits.slice(8, 10)) parts.push(digits.slice(8, 10));

    return parts.join(" ");
}

function showPhoneLogin() {
    window.stopQrPolling?.();

    qr.closest(".qr-wrapper").classList.add("hidden");
    loginBox.classList.add("phone-mode");
    phoneLoginBtn.classList.add("hidden");
    phoneForm.classList.remove("hidden");
    phoneStep.classList.remove("hidden");
    codeForm.classList.add("hidden");
    authError.classList.add("hidden");
    setPhoneMessage("");

    title.textContent = "С каким номером телефона хотите войти?";
    subtitle.textContent = "На него придёт SMS с кодом";

    phoneInput.focus();
}

function showQrLogin() {
    phoneForm.classList.add("hidden");
    loginBox.classList.remove("phone-mode");
    phoneLoginBtn.classList.remove("hidden");
    qr.closest(".qr-wrapper").classList.remove("hidden");

    phoneInput.value = "";
    codeInput.value = "";
    phoneToken = null;
    phoneContinueBtn.disabled = true;
    codeContinueBtn.disabled = true;
    phoneStep.classList.remove("hidden");
    codeForm.classList.add("hidden");
    devCode.textContent = "";
    setPhoneMessage("");

    resetExpiredText();
    window.loadQR?.();
}

async function startPhoneLogin() {
    const phone = `7${normalizePhone(phoneInput.value)}`;

    phoneContinueBtn.disabled = true;
    setPhoneMessage("Отправляем код...");

    try {
        const response = await fetch("http://localhost:5000/api/phone/start", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ phone })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Не удалось отправить код");
        }

        phoneToken = data.token;
        phoneStep.classList.add("hidden");
        codeForm.classList.remove("hidden");
        devCode.textContent = `Тестовый SMS-код: ${data.devCode}`;
        title.textContent = "Введите код из SMS";
        subtitle.textContent = "Мы отправили код на ваш номер";
        setPhoneMessage("");
        codeInput.focus();
    } catch (err) {
        setPhoneMessage(err.message, "error");
    } finally {
        phoneContinueBtn.disabled = normalizePhone(phoneInput.value).length !== 10;
    }
}

async function verifyPhoneCode() {
    codeContinueBtn.disabled = true;
    setPhoneMessage("Проверяем код...");

    try {
        const response = await fetch("http://localhost:5000/api/phone/verify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                token: phoneToken,
                code: codeInput.value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Не удалось войти");
        }

        setPhoneMessage(`Вход выполнен: +${data.phone}`, "success");
    } catch (err) {
        setPhoneMessage(err.message, "error");
    } finally {
        codeContinueBtn.disabled = codeInput.value.replace(/\D/g, "").length !== 6;
    }
}

phoneLoginBtn.addEventListener("click", showPhoneLogin);
backQrBtn.addEventListener("click", showQrLogin);

phoneInput.addEventListener("input", () => {
    phoneInput.value = formatPhone(phoneInput.value);
    phoneContinueBtn.disabled = normalizePhone(phoneInput.value).length !== 10;
});

codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
    codeContinueBtn.disabled = codeInput.value.length !== 6;
});

phoneContinueBtn.addEventListener("click", startPhoneLogin);
codeContinueBtn.addEventListener("click", verifyPhoneCode);
