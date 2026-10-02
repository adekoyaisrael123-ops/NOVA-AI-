const express = require("express");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();

// =====================================================
// CONFIGURATION
// =====================================================

const PORT = process.env.PORT || 5000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const DATA_FILE = path.join(__dirname, "chats.json");
const PUBLIC_DIR = path.join(__dirname, "public");

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend
app.use(express.static(PUBLIC_DIR));

// =====================================================
// DATABASE / CHAT FILE
// =====================================================

function initializeDatabase() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(
                DATA_FILE,
                JSON.stringify([], null, 2),
                "utf8"
            );

            console.log("Created chats.json");
        }
    } catch (error) {
        console.error("Could not initialize chats.json:", error);
    }
}

initializeDatabase();

// =====================================================
// READ CHATS
// =====================================================

function readAllChats() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            initializeDatabase();
        }

        const data = fs.readFileSync(DATA_FILE, "utf8");

        if (!data.trim()) {
            return [];
        }

        const chats = JSON.parse(data);

        return Array.isArray(chats) ? chats : [];

    } catch (error) {
        console.error("Could not read chats.json:", error);
        return [];
    }
}

function readChats(userEmail = "") {
    const chats = readAllChats();
    const targetEmail = normalizeEmail(userEmail);

    if (!targetEmail) {
        return chats;
    }

    return chats.filter(
        chat => normalizeEmail(chat.userEmail) === targetEmail
    );
}

// =====================================================
// SAVE CHATS
// =====================================================

function saveChats(chats) {
    try {
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(chats, null, 2),
            "utf8"
        );

        return true;

    } catch (error) {
        console.error("Could not save chats.json:", error);
        return false;
    }
}

// =====================================================
// GENERATE CHAT ID
// =====================================================

function generateChatId() {
    return (
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).substring(2, 10)
    );
}

function normalizeEmail(email) {
    return typeof email === "string"
        ? email.trim().toLowerCase()
        : "";
}

// =====================================================
// CREATE CHAT
// =====================================================

function createChat(title = "New Chat", userEmail = "") {
    const chats = readAllChats();

    const chat = {
        id: generateChatId(),
        userEmail: normalizeEmail(userEmail),
        title: title || "New Chat",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: []
    };

    chats.unshift(chat);

    saveChats(chats);

    return chat;
}

// =====================================================
// FIND CHAT
// =====================================================

function findChat(chatId, userEmail = "") {
    const chats = readChats(userEmail);

    return chats.find(
        chat => chat.id === chatId
    );
}

// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(PUBLIC_DIR, "index.html")
    );
});

// =====================================================
// API: TEST SERVER
// =====================================================

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Nova AI server is working",
        groqConfigured: Boolean(GROQ_API_KEY),
        model: GROQ_MODEL,
        port: PORT
    });
});

// =====================================================
// API: GET ALL CHATS
// =====================================================

app.get("/api/chats", (req, res) => {
    try {
        const requestedEmail = normalizeEmail(req.query.email);
        const chats = readChats(requestedEmail);

        const summary = chats.map(chat => ({
            id: chat.id,
            title: chat.title || "New Chat",
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
            messageCount: Array.isArray(chat.messages)
                ? chat.messages.length
                : 0,

            lastMessage:
                Array.isArray(chat.messages) &&
                chat.messages.length > 0
                    ? chat.messages[chat.messages.length - 1].content
                    : ""
        }));

        res.json({
            success: true,
            chats: summary
        });

    } catch (error) {
        console.error("GET CHATS ERROR:", error);

        res.status(500).json({
            success: false,
            error: "Unable to load chats"
        });
    }
});

// =====================================================
// API: CREATE NEW CHAT
// =====================================================

app.post("/api/chats", (req, res) => {
    try {
        const title =
            typeof req.body?.title === "string" &&
            req.body.title.trim()
                ? req.body.title.trim().substring(0, 80)
                : "New Chat";

        const userEmail = normalizeEmail(req.body?.email);

        if (!userEmail) {
            return res.status(400).json({
                success: false,
                error: "Email is required"
            });
        }

        const chat = createChat(title, userEmail);

        console.log(
            "Created chat:",
            chat.id
        );

        res.status(201).json({
            success: true,
            chat: chat
        });

    } catch (error) {
        console.error("CREATE CHAT ERROR:", error);

        res.status(500).json({
            success: false,
            error: "Could not create chat"
        });
    }
});

// =====================================================
// API: GET ONE CHAT
// =====================================================

app.get("/api/chats/:chatId", (req, res) => {
    try {
        const chatId = req.params.chatId;
        const userEmail = normalizeEmail(req.query.email);

        if (!chatId) {
            return res.status(400).json({
                success: false,
                error: "Chat ID is required"
            });
        }

        const chat = findChat(chatId, userEmail);

        if (!chat) {
            return res.status(404).json({
                success: false,
                error: "Chat not found"
            });
        }

        res.json({
            success: true,
            chat: chat
        });

    } catch (error) {
        console.error("GET CHAT ERROR:", error);

        res.status(500).json({
            success: false,
            error: "Unable to load chat"
        });
    }
});

// =====================================================
// API: DELETE CHAT
// =====================================================

app.delete("/api/chats/:chatId", (req, res) => {
    try {
        const chatId = req.params.chatId;
        const userEmail = normalizeEmail(req.query.email);

        if (!chatId) {
            return res.status(400).json({
                success: false,
                error: "Chat ID is required"
            });
        }

        const allChats = readAllChats();
        const index = allChats.findIndex(
            chat => chat.id === chatId && normalizeEmail(chat.userEmail) === userEmail
        );

        if (index === -1) {
            return res.status(404).json({
                success: false,
                error: "Chat not found"
            });
        }

        allChats.splice(index, 1);

        saveChats(allChats);

        console.log(
            "Deleted chat:",
            chatId
        );

        res.json({
            success: true,
            message: "Chat deleted"
        });

    } catch (error) {
        console.error("DELETE CHAT ERROR:", error);

        res.status(500).json({
            success: false,
            error: "Could not delete chat"
        });
    }
});

// =====================================================
// API: CLEAR CHAT
// =====================================================

app.delete("/api/chats/:chatId/messages", (req, res) => {
    try {
        const chatId = req.params.chatId;
        const userEmail = normalizeEmail(req.query.email);

        if (!chatId) {
            return res.status(400).json({
                success: false,
                error: "Chat ID is required"
            });
        }

        const allChats = readAllChats();
        const chat = allChats.find(
            item => item.id === chatId && normalizeEmail(item.userEmail) === userEmail
        );

        if (!chat) {
            return res.status(404).json({
                success: false,
                error: "Chat not found"
            });
        }

        chat.messages = [];
        chat.title = "New Chat";
        chat.updatedAt = new Date().toISOString();

        saveChats(allChats);

        console.log(
            "Cleared chat:",
            chatId
        );

        res.json({
            success: true,
            message: "Chat cleared",
            chat
        });

    } catch (error) {
        console.error("CLEAR CHAT ERROR:", error);

        res.status(500).json({
            success: false,
            error: "Could not clear chat"
        });
    }
});

// =====================================================
// GROQ AI FUNCTION
// =====================================================

async function askGroq(messages) {

    if (!GROQ_API_KEY) {
        throw new Error(
            "GROQ_API_KEY is missing from your .env file."
        );
    }

    const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`
            },

            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 2048
            })
        }
    );

    let data;

    try {
        data = await response.json();
    } catch (error) {
        throw new Error(
            "Groq returned an invalid response."
        );
    }

    if (!response.ok) {
        console.error(
            "Groq API error:",
            data
        );

        throw new Error(
            data?.error?.message ||
            `Groq API request failed with status ${response.status}`
        );
    }

    const content =
        data?.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error(
            "Groq returned an empty AI response."
        );
    }

    return content;
}

// =====================================================
// API: ASK AI
// =====================================================

app.post("/api/ask-ai", async (req, res) => {

    try {

        const chatId =
            typeof req.body?.chatId === "string"
                ? req.body.chatId.trim()
                : "";

        const userEmail = normalizeEmail(req.body?.email);

        const message =
            typeof req.body?.message === "string"
                ? req.body.message.trim()
                : "";

        // ---------------------------------------------
        // VALIDATE CHAT ID
        // ---------------------------------------------

        if (!chatId) {
            return res.status(400).json({
                success: false,
                error: "chatId is required"
            });
        }

        // ---------------------------------------------
        // VALIDATE MESSAGE
        // ---------------------------------------------

        if (!message) {
            return res.status(400).json({
                success: false,
                error: "Message cannot be empty"
            });
        }

        if (message.length > 10000) {
            return res.status(400).json({
                success: false,
                error: "Message is too long"
            });
        }

        // ---------------------------------------------
        // FIND CHAT
        // ---------------------------------------------

        const chats = readAllChats();

        const chat = chats.find(
            item => item.id === chatId && normalizeEmail(item.userEmail) === userEmail
        );

        if (!chat) {
            return res.status(404).json({
                success: false,
                error: "Chat not found"
            });
        }

        // Make sure messages exists
        if (!Array.isArray(chat.messages)) {
            chat.messages = [];
        }

        // ---------------------------------------------
        // SAVE USER MESSAGE
        // ---------------------------------------------

        const userMessage = {
            role: "user",
            content: message,
            timestamp: new Date().toISOString()
        };

        chat.messages.push(userMessage);

        // ---------------------------------------------
        // CREATE CHAT TITLE
        // ---------------------------------------------

        if (
            chat.title === "New Chat" &&
            chat.messages.length === 1
        ) {

            chat.title =
                message.substring(0, 45) +
                (message.length > 45 ? "..." : "");
        }

        chat.updatedAt =
            new Date().toISOString();

        saveChats(chats);

        console.log("");
        console.log("------------------------------------------");
        console.log("AI REQUEST");
        console.log("Chat ID:", chatId);
        console.log("Message:", message);
        console.log("------------------------------------------");

        // ---------------------------------------------
        // PREPARE GROQ MESSAGES
        // ---------------------------------------------

        const groqMessages = [
            {
                role: "system",
                content:
                    "You are Nova AI, a helpful, friendly and intelligent AI assistant. Give clear, accurate and useful answers. When explaining technical topics, provide practical examples. Keep responses easy to understand."
            }
        ];

        for (const msg of chat.messages) {

            if (
                msg.role !== "user" &&
                msg.role !== "assistant"
            ) {
                continue;
            }

            groqMessages.push({
                role: msg.role,
                content: String(msg.content || "")
            });
        }

        // ---------------------------------------------
        // ASK GROQ
        // ---------------------------------------------

        const aiResponse =
            await askGroq(groqMessages);

        // ---------------------------------------------
        // SAVE AI RESPONSE
        // ---------------------------------------------

        chat.messages.push({
            role: "assistant",
            content: aiResponse,
            timestamp: new Date().toISOString()
        });

        chat.updatedAt =
            new Date().toISOString();

        saveChats(chats);

        console.log(
            "AI response generated successfully."
        );

        // ---------------------------------------------
        // SEND RESPONSE
        // ---------------------------------------------

        res.json({
            success: true,
            response: aiResponse,
            chat: chat
        });

    } catch (error) {

        console.error("");
        console.error("==========================================");
        console.error("AI ERROR");
        console.error(error);
        console.error("==========================================");
        console.error("");

        res.status(500).json({
            success: false,
            error:
                error.message ||
                "AI request failed"
        });
    }
});

// =====================================================
// 404 API HANDLER
// =====================================================

app.use("/api", (req, res) => {

    res.status(404).json({
        success: false,
        error: "API endpoint not found"
    });

});

// =====================================================
// FRONTEND FALLBACK
// =====================================================

app.use((req, res) => {

    res.sendFile(
        path.join(PUBLIC_DIR, "index.html")
    );

});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {

    console.error(
        "GLOBAL SERVER ERROR:",
        error
    );

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        success: false,
        error: "Internal server error"
    });

});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {

    console.log("");
    console.log("==========================================");
    console.log("        NOVA AI CHATBOT SERVER");
    console.log("==========================================");
    console.log(`Server: http://localhost:${PORT}`);
    console.log(
        `Groq API: ${
            GROQ_API_KEY
                ? "Configured"
                : "NOT CONFIGURED"
        }`
    );
    console.log(`Model: ${GROQ_MODEL}`);
    console.log("Storage: chats.json");
    console.log("Database: Local JSON");
    console.log("Meta/WhatsApp: Removed");
    console.log("==========================================");
    console.log("");

});