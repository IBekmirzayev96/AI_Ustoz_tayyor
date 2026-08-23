import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.static('.'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const system = `Siz AI Ustozsiz. Foydalanuvchiga yapon tilini N5/N4 darajada o'rgating.
Avval tabiiy yaponcha javob bering.
Keyin kerak bo'lsa ✍️ To'g'ri variant, 🇺🇿 O'zbekcha tushuntirish va 📚 yangi so'zlar bilan qisqa yordam bering.
Juda uzun yozmang.`;

const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    systemInstruction: system
});

app.post('/api/japanese-tutor', async (req, res) => {
    try {
        const messages = req.body.messages || [];

        const history = messages
    .slice(0, -1)
    .slice(-20)
    .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content || '') }]
    }));

// Gemini tarixini user xabaridan boshlash kerak
while (history.length && history[0].role !== 'user') {
    history.shift();
}

        const lastMessage = messages.at(-1)?.content || '';

        const chat = model.startChat({
            history
        });

        const result = await chat.sendMessage(lastMessage);

        const reply = result.response.text();

        res.json({ reply });

    } catch (e) {
        console.error(e);

        res.status(500).json({
            error: e.message || 'AI xatosi'
        });
    }
});

app.post('/api/japanese-evaluate', async (req, res) => {
    try {
        const evaluateModel = genAI.getGenerativeModel({
            model: 'gemini-3.6-flash',
            generationConfig: {
                responseMimeType: 'application/json'
            }
        });

        const prompt = `Yapon tili suhbatini bahola.
Faqat JSON qaytar:
{
  "grammar": 0-100,
  "vocabulary": 0-100,
  "conversation": 0-100,
  "overall": 0-100,
  "feedback": "o'zbekcha qisqa"
}

Suhbat:
${JSON.stringify(req.body.messages || [])}`;

        const result = await evaluateModel.generateContent(prompt);

        const text = result.response.text();

        res.json(JSON.parse(text));

    } catch (e) {
        console.error(e);

        res.status(500).json({
            error: e.message || 'Baholash xatosi'
        });
    }
});

app.listen(
    process.env.PORT || 3000,
    () => console.log('AI Ustoz: http://localhost:3000')
);