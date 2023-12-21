const express = require('express');
const cors = require('cors');
const fs = require('fs');
const session = require('express-session');
const levenshtein = require('fast-levenshtein');
const app = express();
const port = 3000;

// Initialize captchaData
let captchaData = [];

// Load CAPTCHA data from JSON file
fs.readFile('captchaData.json', 'utf8', (err, data) => {
    if (err) {
        console.error("Error reading file from disk:", err);
        return;
    }
    try {
        captchaData = JSON.parse(data);
    } catch (err) {
        console.error("Error parsing JSON string:", err);
    }
});

app.use(express.json());
app.use(cors());
app.use(session({
    secret: 'captcha secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Middleware to initialize or reset captcha session data
app.use((req, res, next) => {
    if (!req.session.captcha || (req.session.captcha.attempts >= 3 && Date.now() - req.session.captcha.timestamp >= 3000)) {
        resetCaptcha(req);
    }
    next();
});

// Function to reset the captcha session data
function resetCaptcha(req) {
    const randomIndex = Math.floor(Math.random() * captchaData.length);
    req.session.captcha = {
        attempts: 0,
        question: captchaData[randomIndex].question,
        hash: captchaData[randomIndex].hash,
        timestamp: Date.now()
    };
}

// Serve CAPTCHA questions
app.get('/captcha', (req, res) => {
    res.json({
        question: req.session.captcha.question,
        hash: req.session.captcha.hash
    });
});

// Check answers
app.get('/check-answer/:hash/:yourAnswer', (req, res) => {
    const { hash, yourAnswer } = req.params;

    if (req.session.captcha.hash !== hash) {
        return res.json({ answer: false });
    }

    const captchaEntry = captchaData.find(entry => entry.hash === hash);

    if (captchaEntry) {
        const correctAnswer = captchaEntry.answer.toLowerCase();
        const userAnswer = yourAnswer.toLowerCase();
        const distance = levenshtein.get(correctAnswer, userAnswer);
        const similarity = (correctAnswer.length - distance) / correctAnswer.length;

        if (similarity >= 0.8) {
            resetCaptcha(req); // Reset CAPTCHA session data on correct answer
            return res.json({ answer: true });
        }
    }

    req.session.captcha.attempts += 1;
    res.json({ answer: false });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
