const STICKERS = ["😀", "😂", "🥰", "😎", "🔥", "👍", "❤️", "🎉", "🤔", "😭", "🙏", "💯", "✨", "🫡", "🎈"];
const ANIMOJI = ["🎉", "❤️", "😀", "🔥", "👋", "⭐", "💫", "🚀", "🎊", "💜"];

let activeMainTab = "chats";
let activeChatId = null;
let mainAppReady = false;
let searchQuery = "";

function tr(key, vars = {}) {
    return window.maxspiseI18n?.t(key, vars) ?? key;
}

function store() {
    return window.maxspiseStore || null;
}

function resolveMainTab(tabEl, index) {
    if (tabEl?.dataset.tab) return tabEl.dataset.tab;
    return index === 1 ? "calls" : "chats";
}

function setChatsAsideVisible(visible) {
    document.getElementById("mainPanelChats")?.classList.toggle("hidden", !visible);
    document.getElementById("callsPane")?.classList.toggle("hidden", visible);
}

function setMainTab(tab) {
    activeMainTab = tab;
    document.querySelectorAll(".main-nav__tab").forEach((el, index) => {
        const tabId = resolveMainTab(el, index);
        el.classList.toggle("main-nav__tab--active", tabId === tab);
    });
    setChatsAsideVisible(tab === "chats");
    if (tab === "calls") {
        closeChat();
        renderCallsList();
    }
}

function renderCallsList() {
    const pane = document.getElementById("callsPane");
    if (!pane) return;
    const calls = store().getCalls();
    if (!calls.length) {
        pane.innerHTML = `<p class="calls-pane__text">${tr("callsEmpty")}</p>`;
        return;
    }
    const labels = { incoming: "callIncoming", outgoing: "callOutgoing", missed: "callMissed" };
    pane.innerHTML = `<div class="calls-list">${calls.map((c) => {
        const icon = c.type === "incoming" ? "📲" : c.type === "missed" ? "📵" : "📞";
        const dur = c.duration ? `${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, "0")}` : "";
        const label = tr(labels[c.type] || "callOutgoing");
        return `<button type="button" class="call-item">
            <span class="call-item__icon">${icon}</span>
            <span class="call-item__body">
                <span class="call-item__title">${escapeHtml(c.contact)}</span>
                <span class="call-item__meta">${label} · ${store().formatTime(c.ts)}${dur ? ` · ${dur}` : ""}</span>
            </span>
        </button>`;
    }).join("")}</div>`;
}

function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
}

function renderChatList() {
    const list = document.getElementById("chatList");
    if (!list) return;
    const chats = store().searchChats(searchQuery);
    list.innerHTML = chats.map((chat) => {
        const last = store().getLastMessage(chat.id);
        const preview = last ? store().previewText(last) : (chat.id === store().SAVED_ID ? tr("chatSavedPreview") : tr("chatServicePreview"));
        const time = last ? store().formatTime(last.ts) : (chat.id === store().SAVED_ID ? tr("yesterday") : "");
        const accent = chat.accent ? " chat-item__avatar--accent" : "";
        const active = chat.id === activeChatId ? " chat-item--active" : "";
        const title = chat.id === store().BOT_ID ? "MaxSpise" : escapeHtml(chat.title);
        return `<button type="button" class="chat-item${active}" data-chat-id="${chat.id}">
            <span class="chat-item__avatar${accent}">${escapeHtml(chat.avatar || "?")}</span>
            <span class="chat-item__body">
                <span class="chat-item__row">
                    <span class="chat-item__title">${title}</span>
                    <span class="chat-item__time">${time}</span>
                </span>
                <span class="chat-item__preview">${escapeHtml(preview)}</span>
            </span>
        </button>`;
    }).join("");
}

function renderMessageBubble(msg) {
    const wrap = document.createElement("div");
    wrap.className = `chat-bubble-wrap${msg.outgoing ? " chat-bubble-wrap--out" : ""}`;
    if (msg.type === "service") {
        wrap.innerHTML = `<div class="chat-bubble chat-bubble--service">
            ${msg.serviceLabel ? `<div class="chat-bubble__label">${escapeHtml(msg.serviceLabel)}</div>` : ""}
            <div class="chat-bubble__text">${formatMessageText(msg.text)}</div>
        </div>`;
        wrap.querySelector(".chat-bubble__text")?.replaceWith(document.createTextNode(""));
        const bubble = wrap.querySelector(".chat-bubble--service");
        if (bubble) {
            const textEl = document.createElement("div");
            textEl.className = "chat-bubble__text";
            textEl.innerHTML = formatMessageText(msg.text);
            bubble.appendChild(textEl);
            if (msg.serviceLabel) bubble.insertBefore(wrap.querySelector(".chat-bubble__label") || createLabel(msg.serviceLabel), textEl);
        }
        return wrap;
    }
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble${msg.outgoing ? " chat-bubble--out" : ""}`;
    if (msg.type === "media") {
        if (msg.mediaKind === "video") {
            bubble.innerHTML = `<video src="${msg.url}" controls class="chat-bubble__media"></video>`;
        } else {
            bubble.innerHTML = `<img src="${msg.url}" alt="" class="chat-bubble__media">`;
        }
        if (msg.text) {
            const cap = document.createElement("div");
            cap.className = "chat-bubble__caption";
            cap.textContent = msg.text;
            bubble.appendChild(cap);
        }
    } else if (msg.type === "sticker") {
        bubble.className += " chat-bubble--sticker";
        bubble.textContent = msg.text;
    } else if (msg.type === "animoji") {
        bubble.className += " chat-bubble--animoji";
        bubble.innerHTML = `<span class="animoji-play">${msg.text}</span>`;
    } else if (msg.type === "system") {
        bubble.className = "chat-bubble chat-bubble--system";
        bubble.textContent = msg.text;
    } else {
        bubble.innerHTML = formatMessageText(msg.text);
    }
    wrap.appendChild(bubble);
    const time = document.createElement("span");
    time.className = "chat-bubble__time";
    time.textContent = new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    wrap.appendChild(time);
    return wrap;
}

function createLabel(text) {
    const el = document.createElement("div");
    el.className = "chat-bubble__label";
    el.textContent = text;
    return el;
}

function formatMessageText(text) {
    return escapeHtml(text || "").replace(/\n/g, "<br>");
}

function renderChatPanel(chatId) {
    const chat = store().getChat(chatId);
    const titleEl = document.getElementById("chatPanelTitle");
    const subtitleEl = document.getElementById("chatPanelSubtitle");
    const bodyEl = document.getElementById("chatPanelMessages");
    const composer = document.getElementById("chatComposer");
    const callBtn = document.getElementById("chatCallBtn");

    if (titleEl) titleEl.textContent = chat?.title || "MaxSpise";
    if (subtitleEl) {
        if (chat?.type === "service") {
            subtitleEl.textContent = tr("chatServiceSubtitle");
            subtitleEl.classList.remove("hidden");
        } else if (chat?.type === "group") {
            subtitleEl.textContent = tr("groupMembers", { n: chat.members || 1 });
            subtitleEl.classList.remove("hidden");
        } else if (chat?.type === "channel") {
            subtitleEl.textContent = tr("channelSubscribers");
            subtitleEl.classList.remove("hidden");
        } else {
            subtitleEl.classList.add("hidden");
        }
    }

    if (bodyEl) {
        bodyEl.innerHTML = "";
        const messages = store().getMessages(chatId);
        if (!messages.length && chatId === store().SAVED_ID) {
            bodyEl.innerHTML = `<p class="chat-hint">${tr("chatSavedHint")}</p>`;
        }
        messages.forEach((msg) => {
            bodyEl.appendChild(renderMessageBubble(msg));
        });
        bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    const canSend = store().canSendToChat(chatId);
    composer?.classList.toggle("hidden", !canSend);
    callBtn?.classList.toggle("hidden", chatId === store().BOT_ID || chatId === store().SAVED_ID);
}

function openChat(chatId) {
    if (!chatId || activeMainTab !== "chats") return;
    activeChatId = chatId;
    renderChatPanel(chatId);
    renderChatList();
    document.getElementById("mainEmpty")?.classList.add("hidden");
    document.getElementById("chatPanel")?.classList.remove("hidden");
    document.getElementById("mainApp")?.classList.add("main-app--chat-open");
    closeStickerPicker();
}

function closeChat() {
    activeChatId = null;
    document.getElementById("mainEmpty")?.classList.remove("hidden");
    document.getElementById("chatPanel")?.classList.add("hidden");
    document.getElementById("mainApp")?.classList.remove("main-app--chat-open");
    renderChatList();
    closeStickerPicker();
}

function sendTextMessage() {
    const input = document.getElementById("chatInput");
    if (!activeChatId || !input) return;
    const text = input.value.trim();
    if (!text) return;
    store().sendUserMessage(activeChatId, { type: "text", text });
    input.value = "";
    input.style.height = "auto";
    renderChatPanel(activeChatId);
    renderChatList();
}

function sendSticker(emoji) {
    if (!activeChatId) return;
    store().sendUserMessage(activeChatId, { type: "sticker", text: emoji });
    store().addStickerRecent(emoji);
    renderChatPanel(activeChatId);
    renderChatList();
    closeStickerPicker();
}

function sendAnimoji(emoji) {
    if (!activeChatId) return;
    store().sendUserMessage(activeChatId, { type: "animoji", text: emoji });
    renderChatPanel(activeChatId);
    renderChatList();
    closeAnimojiPicker();
}

function handleMediaFile(file) {
    if (!activeChatId || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const isVideo = file.type.startsWith("video/");
        store().sendUserMessage(activeChatId, {
            type: "media",
            url: reader.result,
            mediaKind: isVideo ? "video" : "image",
            text: ""
        });
        renderChatPanel(activeChatId);
        renderChatList();
    };
    reader.readAsDataURL(file);
}

function toggleStickerPicker() {
    document.getElementById("stickerPicker")?.classList.toggle("hidden");
    document.getElementById("animojiPicker")?.classList.add("hidden");
}

function closeStickerPicker() {
    document.getElementById("stickerPicker")?.classList.add("hidden");
    document.getElementById("animojiPicker")?.classList.add("hidden");
}

function toggleAnimojiPicker() {
    document.getElementById("animojiPicker")?.classList.toggle("hidden");
    document.getElementById("stickerPicker")?.classList.add("hidden");
}

function openOverlay(id) {
    document.getElementById(id)?.classList.remove("hidden");
    document.body.classList.add("overlay-open");
}

function closeOverlay(id) {
    document.getElementById(id)?.classList.add("hidden");
    if (!document.querySelector(".overlay:not(.hidden)")) {
        document.body.classList.remove("overlay-open");
    }
}

function openSettings(tab = "general") {
    fillSettingsForm();
    openOverlay("settingsOverlay");
    switchSettingsTab(tab);
}

function switchSettingsTab(tab) {
    document.querySelectorAll(".settings-nav__item").forEach((el) => {
        el.classList.toggle("settings-nav__item--active", el.dataset.settingsTab === tab);
    });
    document.querySelectorAll(".settings-section").forEach((el) => {
        el.classList.toggle("hidden", el.dataset.settingsPanel !== tab);
    });
}

function fillSettingsForm() {
    const st = store();
    if (!st) return;
    const p = st.getProfile();
    const s = st.getSettings();
    const nameEl = document.getElementById("settingsName");
    const bioEl = document.getElementById("settingsBio");
    const userEl = document.getElementById("settingsUsername");
    const themeEl = document.getElementById("settingsTheme");
    const notifEl = document.getElementById("settingsNotifications");
    const avatarEl = document.getElementById("settingsAvatarPreview");
    if (nameEl) nameEl.value = p.name || "";
    if (bioEl) bioEl.value = p.bio || "";
    if (userEl) userEl.value = p.username || "";
    if (themeEl) themeEl.value = s.theme || "dark";
    if (notifEl) notifEl.checked = s.notifications !== false;
    if (avatarEl) {
        if (p.avatar) {
            avatarEl.style.backgroundImage = `url('${p.avatar}')`;
            avatarEl.textContent = "";
        } else {
            avatarEl.style.backgroundImage = "";
            avatarEl.textContent = (p.name || "?").charAt(0).toUpperCase();
        }
    }
}

function saveSettingsProfile() {
    store().setProfile({
        name: document.getElementById("settingsName")?.value.trim(),
        bio: document.getElementById("settingsBio")?.value.trim(),
        username: document.getElementById("settingsUsername")?.value.trim()
    });
    applyProfileToNav();
    if (activeChatId) renderChatPanel(activeChatId);
    renderChatList();
}

function saveSettingsPrefs() {
    store().setSettings({
        theme: document.getElementById("settingsTheme")?.value,
        notifications: document.getElementById("settingsNotifications")?.checked
    });
}

function applyProfileToNav() {
    const st = store();
    if (!st) return;
    const p = st.getProfile();
    const el = document.getElementById("mainProfileAvatar");
    if (!el) return;
    el.textContent = "";
    el.style.backgroundImage = p.avatar ? `url('${p.avatar}')` : "";
    if (!p.avatar) el.textContent = (p.name || "?").charAt(0).toUpperCase();
}

function openNewChatMenu() {
    openOverlay("newChatOverlay");
}

function confirmNewGroup() {
    const name = document.getElementById("newGroupName")?.value.trim();
    if (!name) return;
    const id = store().createGroup(name);
    closeOverlay("newChatOverlay");
    document.getElementById("newGroupName").value = "";
    renderChatList();
    openChat(id);
}

function confirmNewChannel() {
    const name = document.getElementById("newChannelName")?.value.trim();
    if (!name) return;
    const id = store().createChannel(name);
    closeOverlay("newChatOverlay");
    document.getElementById("newChannelName").value = "";
    renderChatList();
    openChat(id);
}

function startCallFromChat() {
    if (!activeChatId) return;
    const chat = store().getChat(activeChatId);
    store().addCall(chat?.title || tr("unknownContact"), "outgoing");
    alert(tr("callStarted", { name: chat?.title || "" }));
}

function initPickers() {
    const stickerEl = document.getElementById("stickerGrid");
    if (stickerEl) {
        stickerEl.innerHTML = STICKERS.map((s) =>
            `<button type="button" class="picker-item" data-sticker="${s}">${s}</button>`
        ).join("");
        stickerEl.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-sticker]");
            if (btn) sendSticker(btn.dataset.sticker);
        });
    }
    const animojiEl = document.getElementById("animojiGrid");
    if (animojiEl) {
        animojiEl.innerHTML = ANIMOJI.map((s) =>
            `<button type="button" class="picker-item picker-item--animoji" data-animoji="${s}"><span class="animoji-play">${s}</span></button>`
        ).join("");
        animojiEl.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-animoji]");
            if (btn) sendAnimoji(btn.dataset.animoji);
        });
    }
}

function initMainApp() {
    if (mainAppReady || !document.getElementById("screenMain")) return;
    mainAppReady = true;

    document.querySelectorAll(".main-nav__tab").forEach((tab, index) => {
        tab.addEventListener("click", () => setMainTab(resolveMainTab(tab, index)));
    });

    document.getElementById("chatList")?.addEventListener("click", (e) => {
        const item = e.target.closest(".chat-item");
        if (item?.dataset.chatId) openChat(item.dataset.chatId);
    });

    document.getElementById("chatBackBtn")?.addEventListener("click", closeChat);
    document.getElementById("chatSendBtn")?.addEventListener("click", sendTextMessage);
    document.getElementById("chatInput")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendTextMessage();
        }
    });
    document.getElementById("chatInput")?.addEventListener("input", (e) => {
        e.target.style.height = "auto";
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    });

    document.getElementById("chatAttachBtn")?.addEventListener("click", () => {
        document.getElementById("chatMediaInput")?.click();
    });
    document.getElementById("chatMediaInput")?.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) handleMediaFile(file);
        e.target.value = "";
    });
    document.getElementById("chatStickerBtn")?.addEventListener("click", toggleStickerPicker);
    document.getElementById("chatAnimojiBtn")?.addEventListener("click", toggleAnimojiPicker);
    document.getElementById("chatCallBtn")?.addEventListener("click", startCallFromChat);

    document.getElementById("mainProfileBtn")?.addEventListener("click", () => openSettings("profile"));
    document.getElementById("mainSettingsBtn")?.addEventListener("click", () => openSettings("profile"));
    document.getElementById("mainNewChatBtn")?.addEventListener("click", openNewChatMenu);

    document.getElementById("chatSearch")?.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderChatList();
    });

    document.querySelectorAll("[data-close-overlay]").forEach((btn) => {
        btn.addEventListener("click", () => closeOverlay(btn.dataset.closeOverlay));
    });

    document.querySelectorAll(".settings-nav__item").forEach((btn) => {
        btn.addEventListener("click", () => switchSettingsTab(btn.dataset.settingsTab));
    });

    document.getElementById("settingsSaveProfile")?.addEventListener("click", () => {
        saveSettingsProfile();
        saveSettingsPrefs();
    });
    document.getElementById("settingsTheme")?.addEventListener("change", saveSettingsPrefs);
    document.getElementById("settingsNotifications")?.addEventListener("change", saveSettingsPrefs);

    document.getElementById("settingsAvatarBtn")?.addEventListener("click", () => {
        document.getElementById("settingsAvatarInput")?.click();
    });
    document.getElementById("settingsAvatarInput")?.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            store().setProfile({ avatar: reader.result });
            fillSettingsForm();
            applyProfileToNav();
        };
        reader.readAsDataURL(file);
    });

    document.getElementById("newGroupBtn")?.addEventListener("click", confirmNewGroup);
    document.getElementById("newChannelBtn")?.addEventListener("click", confirmNewChannel);

    document.querySelectorAll("[data-new-chat-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("[data-new-chat-tab]").forEach((b) => b.classList.toggle("active", b === btn));
            document.querySelectorAll("[data-new-chat-panel]").forEach((p) => {
                p.classList.toggle("hidden", p.dataset.newChatPanel !== btn.dataset.newChatTab);
            });
        });
    });

    initPickers();
    applyProfileToNav();
    renderChatList();
    setMainTab("chats");
}

function onEnterMain(phone) {
    const st = store();
    if (!st) return;
    const p = st.getProfile();
    if (phone) st.setProfile({ phone });
    if (p.phone || phone) st.recordLogin(p.phone || phone);
    applyProfileToNav();
    renderChatList();
    window.maxspiseMain?.refreshProfile?.();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMainApp);
} else {
    initMainApp();
}

document.addEventListener("languagechange", () => {
    renderChatList();
    if (activeChatId) renderChatPanel(activeChatId);
    if (activeMainTab === "calls") renderCallsList();
});

window.maxspiseMain = {
    openChat,
    closeChat,
    setMainTab,
    refreshProfile: () => {
        applyProfileToNav();
        renderChatList();
        if (activeChatId) renderChatPanel(activeChatId);
    },
    onEnterMain
};
