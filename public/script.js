// =====================================================
// NOVA AI CHATBOT - FINAL FIXED VERSION
// =====================================================

let chats = [];
let currentChatId = null;
let isSending = false;


// =====================================================
// ELEMENTS
// =====================================================

const chatList = document.getElementById("chatList");
const chatMessages = document.getElementById("chatMessages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const searchInput = document.getElementById("searchInput");
const chatTitle = document.getElementById("chatTitle");
const chatCount = document.getElementById("chatCount");
const typingIndicator = document.getElementById("typingIndicator");
const charCount = document.getElementById("charCount");
const userEmailLabel = document.getElementById("userEmailLabel");
const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
const resetPasswordForm = document.getElementById("resetPasswordForm");
const resetEmailInput = document.getElementById("resetEmail");
const resetPasswordInput = document.getElementById("resetPassword");
const cancelResetBtn = document.getElementById("cancelResetBtn");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const toggleAuthModeBtn = document.getElementById("toggleAuthModeBtn");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const logoutBtn = document.getElementById("logoutBtn");
const mobileMenu = document.querySelector(".mobile-menu");
const sidebar = document.querySelector(".sidebar");


// =====================================================
// INITIALIZE
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {

    const loggedIn = checkLogin();

    if (!loggedIn) {
        return;
    }

    await loadChats();

    if (chats.length === 0) {

        await createNewChat();

    } else {

        await openChat(chats[0].id);

    }

    setupSuggestions();
    updateCharacterCount();

});


function applyAuthState(isLoggedIn) {
    document.body.classList.toggle("logged-out", !isLoggedIn);

    if (loginModal) {
        loginModal.classList.toggle("hidden", isLoggedIn);
    }
}


// =====================================================
// LOGIN
// =====================================================

function getStoredUsers() {
    try {
        const users = JSON.parse(localStorage.getItem("nova_users") || "[]");
        return Array.isArray(users) ? users : [];
    } catch (error) {
        return [];
    }
}

function normalizeAccountEmail(email) {
    return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function saveStoredUsers(users) {
    localStorage.setItem("nova_users", JSON.stringify(users));
}

function getAuthMode() {
    return localStorage.getItem("nova_auth_mode") === "login" ? "login" : "register";
}

function setAuthMode(mode) {
    const safeMode = mode === "login" ? "login" : "register";
    localStorage.setItem("nova_auth_mode", safeMode);

    if (authSubmitBtn) {
        authSubmitBtn.textContent = safeMode === "login" ? "Login" : "Create Account";
    }

    if (toggleAuthModeBtn) {
        toggleAuthModeBtn.textContent =
            safeMode === "login"
                ? "Need an account? Create one"
                : "Already have an account? Login";
    }

    const title = document.querySelector("#loginModal h2");
    const subtitle = document.querySelector("#loginModal p");

    if (title) {
        title.textContent = safeMode === "login" ? "Welcome back" : "Create your account";
    }

    if (subtitle) {
        subtitle.textContent =
            safeMode === "login"
                ? "Sign in to continue chatting."
                : "Create an account to start chatting.";
    }
}

function checkLogin() {

    const loggedIn =
        localStorage.getItem("nova_logged_in") === "true";

    applyAuthState(loggedIn);
    syncUserEmailLabel();

    return loggedIn;
}

function syncUserEmailLabel() {
    if (!userEmailLabel) {
        return;
    }

    const email = localStorage.getItem("nova_email");

    if (email) {
        userEmailLabel.textContent = email;
        return;
    }

    userEmailLabel.textContent = "Online";
}

function getCurrentUserEmail() {
    return (localStorage.getItem("nova_email") || "").trim().toLowerCase();
}


if (loginForm) {

    loginForm.addEventListener("submit", (event) => {

        event.preventDefault();

        const email =
            document
                .getElementById("loginEmail")
                .value
                .trim()
                .toLowerCase();

        const password =
            document
                .getElementById("loginPassword")
                .value;

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || !emailPattern.test(email)) {

            alert("Please enter a valid email address.");

            return;

        }

        if (!password) {

            alert("Please enter your password.");

            return;

        }

        const users = getStoredUsers();
        const mode = getAuthMode();

        if (mode === "register") {
            const existingUser = users.find(user => normalizeAccountEmail(user?.email) === email);

            if (existingUser) {
                alert("This email already has an account. Please log in instead.");
                setAuthMode("login");
                return;
            }

            users.push({
                email,
                password
            });

            saveStoredUsers(users);

        } else {
            const existingUser = users.find(user => normalizeAccountEmail(user?.email) === email);

            if (!existingUser || existingUser.password !== password) {
                alert("Invalid email or password.");
                return;
            }
        }

        localStorage.setItem(
            "nova_logged_in",
            "true"
        );

        localStorage.setItem(
            "nova_email",
            email
        );

        applyAuthState(true);
        syncUserEmailLabel();

        if (chatMessages) {
            chatMessages.innerHTML = "";
        }

        if (window.location.pathname === "/") {
            window.location.reload();
        }

    });

}

if (toggleAuthModeBtn) {
    toggleAuthModeBtn.addEventListener("click", () => {
        const nextMode = getAuthMode() === "login" ? "register" : "login";
        setAuthMode(nextMode);
        document.getElementById("loginPassword").value = "";
        document.getElementById("loginEmail").focus();
    });
}

function showResetPasswordForm() {
    if (!resetPasswordForm) {
        return;
    }

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();

    if (email) {
        if (resetEmailInput) {
            resetEmailInput.value = email;
        }
    }

    resetPasswordForm.classList.remove("hidden");

    if (resetPasswordInput) {
        resetPasswordInput.focus();
    }
}

function hideResetPasswordForm() {
    if (!resetPasswordForm) {
        return;
    }

    resetPasswordForm.classList.add("hidden");

    if (resetPasswordInput) {
        resetPasswordInput.value = "";
    }

    if (resetEmailInput) {
        resetEmailInput.value = "";
    }
}

if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", () => {
        const email = document.getElementById("loginEmail").value.trim().toLowerCase();

        if (!email) {
            alert("Please enter your email address first.");
            document.getElementById("loginEmail").focus();
            return;
        }

        const users = getStoredUsers();
        const match = users.find(user => normalizeAccountEmail(user?.email) === email);

        if (!match) {
            alert("No account was found with that email. Please create an account first.");
            return;
        }

        showResetPasswordForm();
    });
}

if (cancelResetBtn) {
    cancelResetBtn.addEventListener("click", () => {
        hideResetPasswordForm();
    });
}

if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const email = (resetEmailInput?.value || "").trim().toLowerCase();
        const newPassword = (resetPasswordInput?.value || "").trim();

        if (!email || !newPassword) {
            alert("Please enter both email and a new password.");
            return;
        }

        const users = getStoredUsers();
        const matchIndex = users.findIndex(user => normalizeAccountEmail(user?.email) === email);

        if (matchIndex === -1) {
            alert("No account was found with that email.");
            return;
        }

        users[matchIndex].password = newPassword;
        saveStoredUsers(users);

        document.getElementById("loginEmail").value = email;
        document.getElementById("loginPassword").value = newPassword;
        hideResetPasswordForm();
        setAuthMode("login");
        alert("Password updated successfully. You can now log in with your new password.");
    });
}

setAuthMode(getAuthMode());


// =====================================================
// LOGOUT
// =====================================================

if (logoutBtn) {

    logoutBtn.addEventListener("click", () => {

        localStorage.removeItem("nova_logged_in");
        localStorage.removeItem("nova_email");

        applyAuthState(false);
        syncUserEmailLabel();
        window.location.reload();

    });

}


// =====================================================
// LOAD CHATS
// =====================================================

async function loadChats() {

    try {

        const email = getCurrentUserEmail();
        const url = email ? `/api/chats?email=${encodeURIComponent(email)}` : "/api/chats";

        const response =
            await fetch(url);

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.error ||
                "Failed to load chats"
            );

        }

        chats = data.chats || [];

        renderChatList();

        return chats;

    } catch (error) {

        console.error(
            "Load chats error:",
            error
        );

        chats = [];

        renderChatList();

        return [];

    }

}


// =====================================================
// RENDER CHAT LIST
// =====================================================

function renderChatList(filter = "") {

    if (!chatList) {
        return;
    }

    chatList.innerHTML = "";

    const search =
        filter
            .trim()
            .toLowerCase();

    const filteredChats =
        chats.filter(chat => {

            const title =
                String(chat.title || "")
                    .toLowerCase();

            const lastMessage =
                String(chat.lastMessage || "")
                    .toLowerCase();

            return (
                title.includes(search) ||
                lastMessage.includes(search)
            );

        });

    if (chatCount) {
        chatCount.textContent = chats.length;
    }

    if (filteredChats.length === 0) {

        chatList.innerHTML = `
            <div class="empty-chat">
                No chats found
            </div>
        `;

        return;

    }

    filteredChats.forEach(chat => {

        const item =
            document.createElement("div");

        item.className =
            "chat-item" +
            (
                chat.id === currentChatId
                    ? " active"
                    : ""
            );

        item.innerHTML = `
            <div class="chat-item-content">

                <div class="chat-item-title">
                    ${escapeHTML(chat.title || "New Chat")}
                </div>

                <div class="chat-item-preview">
                    ${escapeHTML(
                        chat.lastMessage ||
                        "No messages yet"
                    )}
                </div>

            </div>

            <button
                class="delete-chat"
                title="Delete chat"
                type="button"
            >
                🗑️
            </button>
        `;

        item.addEventListener("click", async (event) => {

            if (
                event.target.closest(".delete-chat")
            ) {
                return;
            }

            await openChat(chat.id);

            if (sidebar) {
                sidebar.classList.remove("open");
            }

        });

        const deleteButton =
            item.querySelector(".delete-chat");

        deleteButton.addEventListener(
            "click",
            async (event) => {

                event.stopPropagation();

                await deleteChat(chat.id);

            }
        );

        chatList.appendChild(item);

    });

}


// =====================================================
// CREATE NEW CHAT
// IMPORTANT: RETURNS CHAT ID
// =====================================================

async function createNewChat() {

    try {

        const email = getCurrentUserEmail();

        const response =
            await fetch("/api/chats", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    title: "New Chat",
                    email: email
                })

            });

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.error ||
                "Could not create chat"
            );

        }

        if (
            !data.chat ||
            !data.chat.id
        ) {

            throw new Error(
                "Server created the chat but did not return a chat ID."
            );

        }

        const chat =
            data.chat;

        // ==========================================
        // THIS IS THE IMPORTANT PART
        // ==========================================

        currentChatId = chat.id;

        // ==========================================

        chats.unshift({
            id: chat.id,
            title: chat.title || "New Chat",
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
            messageCount: 0,
            lastMessage: ""
        });

        renderChatList();

        renderMessages(chat);

        chatTitle.textContent =
            chat.title || "New Chat";

        messageInput.focus();

        console.log(
            "New chat created:",
            currentChatId
        );

        return currentChatId;

    } catch (error) {

        console.error(
            "Create chat error:",
            error
        );

        alert(
            "Could not create a new chat.\n\n" +
            error.message
        );

        return null;

    }

}


// =====================================================
// NEW CHAT BUTTON
// =====================================================

if (newChatBtn) {

    newChatBtn.addEventListener(
        "click",
        async () => {

            await createNewChat();

            if (sidebar) {
                sidebar.classList.remove("open");
            }

        }
    );

}


// =====================================================
// OPEN CHAT
// =====================================================

async function openChat(chatId) {

    if (!chatId) {

        console.error(
            "openChat called without chatId"
        );

        return false;

    }

    try {

        const email = getCurrentUserEmail();
        const url = email
            ? `/api/chats/${encodeURIComponent(chatId)}?email=${encodeURIComponent(email)}`
            : `/api/chats/${encodeURIComponent(chatId)}`;

        const response =
            await fetch(url);

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.error ||
                "Chat not found"
            );

        }

        currentChatId =
            data.chat.id;

        chatTitle.textContent =
            data.chat.title || "New Chat";

        renderMessages(data.chat);

        renderChatList(
            searchInput.value
        );

        messageInput.focus();

        console.log(
            "Opened chat:",
            currentChatId
        );

        return true;

    } catch (error) {

        console.error(
            "Open chat error:",
            error
        );

        return false;

    }

}


// =====================================================
// RENDER MESSAGES
// =====================================================

function renderMessages(chat) {

    chatMessages.innerHTML = "";

    if (
        !chat.messages ||
        chat.messages.length === 0
    ) {

        chatMessages.innerHTML = `
            <div class="welcome-screen">

                <div class="welcome-icon">
                    ✦
                </div>

                <h1>
                    How can I help you?
                </h1>

                <p>
                    Ask Nova AI anything.
                </p>

                <div class="suggestions">

                    <button class="suggestion">
                        Explain JavaScript to me
                    </button>

                    <button class="suggestion">
                        Help me build a website
                    </button>

                    <button class="suggestion">
                        Write a Python program
                    </button>

                    <button class="suggestion">
                        Give me business ideas
                    </button>

                </div>

            </div>
        `;

        setupSuggestions();

        return;

    }

    chat.messages.forEach(message => {

        addMessageToUI(
            message.role,
            message.content,
            message.timestamp
        );

    });

    scrollToBottom();

}


// =====================================================
// ADD MESSAGE TO UI
// =====================================================

function addMessageToUI(
    role,
    content,
    timestamp
) {

    const row =
        document.createElement("div");

    row.className =
        `message-row ${role}`;

    const avatar =
        role === "assistant"
            ? "✦"
            : "👤";

    row.innerHTML = `
        <div class="avatar">
            ${avatar}
        </div>

        <div class="message-content">

            <div class="message-bubble">
                ${escapeHTML(content)}
            </div>

            <div class="message-time">
                ${formatTime(timestamp)}
            </div>

        </div>
    `;

    chatMessages.appendChild(row);

}


// =====================================================
// SEND MESSAGE
// FIXED CHAT ID FLOW
// =====================================================

async function sendMessage() {

    if (isSending) {
        return;
    }

    const message =
        messageInput.value.trim();

    if (!message) {
        return;
    }

    isSending = true;

    sendBtn.disabled = true;
    messageInput.disabled = true;

    try {

        // =================================================
        // STEP 1: MAKE SURE A CHAT EXISTS
        // =================================================

        if (!currentChatId) {

            console.log(
                "No current chat. Creating one..."
            );

            const newChatId =
                await createNewChat();

            if (!newChatId) {

                throw new Error(
                    "Could not create a chat. Message was not sent."
                );

            }

            currentChatId =
                newChatId;

        }

        // =================================================
        // STEP 2: FINAL CHAT ID CHECK
        // =================================================

        if (!currentChatId) {

            throw new Error(
                "Chat ID is missing. Please click New Chat and try again."
            );

        }

        console.log(
            "Sending message with chatId:",
            currentChatId
        );

        // =================================================
        // STEP 3: DISPLAY USER MESSAGE
        // =================================================

        addMessageToUI(
            "user",
            message,
            new Date().toISOString()
        );

        messageInput.value = "";

        updateCharacterCount();

        messageInput.style.height = "auto";

        scrollToBottom();

        showTyping();

        // =================================================
        // STEP 4: SEND TO BACKEND
        // =================================================

        const response =
            await fetch("/api/ask-ai", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    chatId: currentChatId,
                    email: getCurrentUserEmail(),
                    message: message

                })

            });

        // =================================================
        // STEP 5: READ RESPONSE
        // =================================================

        const data =
            await response.json();

        hideTyping();

        // =================================================
        // STEP 6: CHECK RESPONSE
        // =================================================

        if (!response.ok || !data.success) {

            throw new Error(
                data.error ||
                "AI request failed"
            );

        }

        // =================================================
        // STEP 7: DISPLAY AI RESPONSE
        // =================================================

        addMessageToUI(
            "assistant",
            data.response,
            new Date().toISOString()
        );

        // =================================================
        // STEP 8: UPDATE TITLE
        // =================================================

        if (data.chat) {

            chatTitle.textContent =
                data.chat.title || "New Chat";

        }

        // =================================================
        // STEP 9: REFRESH SIDEBAR
        // =================================================

        await loadChats();

        renderChatList(
            searchInput.value
        );

        scrollToBottom();

    } catch (error) {

        hideTyping();

        console.error(
            "Send message error:",
            error
        );

        addMessageToUI(
            "assistant",
            "Sorry, I couldn't process your message.\n\n" +
            error.message,
            new Date().toISOString()
        );

    } finally {

        isSending = false;

        sendBtn.disabled = false;

        messageInput.disabled = false;

        messageInput.focus();

    }

}


// =====================================================
// FORM SUBMIT
// =====================================================

if (messageForm) {

    messageForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            await sendMessage();

        }
    );

}


// =====================================================
// TYPING INDICATOR
// =====================================================

function showTyping() {

    if (!typingIndicator) {
        return;
    }

    typingIndicator.classList.remove(
        "hidden"
    );

    scrollToBottom();

}


function hideTyping() {

    if (!typingIndicator) {
        return;
    }

    typingIndicator.classList.add(
        "hidden"
    );

}


// =====================================================
// CLEAR CHAT
// =====================================================

if (clearChatBtn) {

    clearChatBtn.addEventListener(
        "click",
        async () => {

            if (!currentChatId) {

                alert(
                    "There is no active chat."
                );

                return;

            }

            const confirmed =
                confirm(
                    "Clear all messages in this chat?"
                );

            if (!confirmed) {
                return;
            }

            try {

                const email = getCurrentUserEmail();
                const url = email
                    ? `/api/chats/${encodeURIComponent(currentChatId)}/messages?email=${encodeURIComponent(email)}`
                    : `/api/chats/${encodeURIComponent(currentChatId)}/messages`;

                const response =
                    await fetch(
                        url,
                        {
                            method: "DELETE"
                        }
                    );

                const data =
                    await response.json();

                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.error ||
                        "Could not clear chat"
                    );

                }

                await loadChats();

                await openChat(
                    currentChatId
                );

            } catch (error) {

                console.error(
                    "Clear chat error:",
                    error
                );

                alert(
                    "Could not clear chat.\n\n" +
                    error.message
                );

            }

        }
    );

}


// =====================================================
// DELETE CHAT
// =====================================================

async function deleteChat(chatId) {

    if (!chatId) {
        return;
    }

    const confirmed =
        confirm(
            "Delete this chat permanently?"
        );

    if (!confirmed) {
        return;
    }

    try {

        const email = getCurrentUserEmail();
        const url = email
            ? `/api/chats/${encodeURIComponent(chatId)}?email=${encodeURIComponent(email)}`
            : `/api/chats/${encodeURIComponent(chatId)}`;

        const response =
            await fetch(
                url,
                {
                    method: "DELETE"
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.error ||
                "Could not delete chat"
            );

        }

        if (
            chatId === currentChatId
        ) {

            currentChatId = null;

        }

        await loadChats();

        if (chats.length > 0) {

            await openChat(
                chats[0].id
            );

        } else {

            await createNewChat();

        }

    } catch (error) {

        console.error(
            "Delete chat error:",
            error
        );

        alert(
            "Could not delete chat.\n\n" +
            error.message
        );

    }

}


// =====================================================
// SEARCH
// =====================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        () => {

            renderChatList(
                searchInput.value
            );

        }
    );

}


// =====================================================
// CHARACTER COUNT
// =====================================================

if (messageInput) {

    messageInput.addEventListener(
        "input",
        updateCharacterCount
    );

}


function updateCharacterCount() {

    if (!messageInput || !charCount) {
        return;
    }

    const length =
        messageInput.value.length;

    charCount.textContent =
        `${length} / 4000`;

}


// =====================================================
// ENTER KEY
// =====================================================

if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                messageForm.requestSubmit();

            }

        }
    );

}


// =====================================================
// AUTO RESIZE TEXTAREA
// =====================================================

if (messageInput) {

    messageInput.addEventListener(
        "input",
        () => {

            messageInput.style.height =
                "auto";

            messageInput.style.height =
                Math.min(
                    messageInput.scrollHeight,
                    150
                ) + "px";

        }
    );

}


// =====================================================
// SUGGESTIONS
// =====================================================

function setupSuggestions() {

    document
        .querySelectorAll(".suggestion")
        .forEach(button => {

            button.onclick = () => {

                messageInput.value =
                    button.textContent.trim();

                updateCharacterCount();

                messageInput.focus();

            };

        });

}


// =====================================================
// MOBILE MENU
// =====================================================

if (mobileMenu) {

    mobileMenu.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "open"
            );

        }
    );

}


// =====================================================
// SCROLL
// =====================================================

function scrollToBottom() {

    setTimeout(() => {

        if (chatMessages) {

            chatMessages.scrollTop =
                chatMessages.scrollHeight;

        }

    }, 50);

}


// =====================================================
// FORMAT TIME
// =====================================================

function formatTime(timestamp) {

    if (!timestamp) {
        return "";
    }

    const date =
        new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;

}