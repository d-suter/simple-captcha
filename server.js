const express = require('express');
const crypto = require('crypto');
const app = express();
const port = 3000;

// Import CAPTCHA data and generate hashes
const rawCaptchaData = require('./captchaData.json');
const captchaData = rawCaptchaData.map(item => {
    const hash = crypto.createHash('sha256').update(item.question + item.answer).digest('hex');
    return { ...item, hash };
});

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to track CAPTCHA attempts
app.use((req, res, next) => {
    if (!req.session) {
        req.session = {};
    }

    if (!req.session.attempts) {
        req.session.attempts = 0;
    }

    next();
});

// Route to get a CAPTCHA question
app.get('/captcha', (req, res) => {
    if (req.session.attempts >= 3) {
        req.session.attempts = 0; // Reset attempts after 3
    }

    const randomIndex = Math.floor(Math.random() * captchaData.length);
    const captcha = captchaData[randomIndex];
    res.json({ question: captcha.question, hash: captcha.hash });
});

// Route to post CAPTCHA answers
app.post('/captcha', (req, res) => {
    const { hash, answer } = req.body;
    const original = captchaData.find(item => item.hash === hash);

    if (original && original.answer === answer) {
        req.session.attempts = 0; // Reset attempts on correct answer
        res.json({ correct: true });
    } else {
        req.session.attempts += 1;
        res.json({ correct: false, attempts: req.session.attempts });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
