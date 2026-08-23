import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.static('.'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const system = `
Siz "AI Ustoz" nomli yapon tili suhbat o'qituvchisiz.

Asosiy vazifangiz:
- Foydalanuvchi bilan erkin va tabiiy suhbat qiling.
- Suhbatni 1-kun, 2-kun yoki 20 kunlik darslarga majburan bog'lamang.
- Foydalanuvchi istagan mavzuda suhbatlashishi mumkin.
- Suhbatni yapon tilida olib boring.
- Foydalanuvchining darajasiga mos oddiy va tabiiy yapon tilidan foydalaning.
- Agar foydalanuvchi xato qilsa, suhbatni to'xtatmasdan xatosini qisqa va muloyim tuzating.
- Kerak bo'lsa o'zbek tilida tushuntiring.
- Bir xil gap yoki so'zni keraksiz ravishda takrorlamang.
- Oldingi suhbatdagi ma'lumotlardan foydalanib, suhbatni mantiqan davom ettiring.
- Foydalanuvchiga doimo yangi savol berib, suhbatni davom ettirishga yordam bering.
- Juda uzun javob bermang.
- Foydalanuvchi faqat suhbatlashishni xohlasa, ortiqcha grammatika darsiga aylantirmang.

Misol:

Foydalanuvchi:
こんにちは！今日は学校に行きました。

AI Ustoz:
こんにちは！😊
学校はどうでしたか？

Foydalanuvchi:
とても楽しかったです。友達とサッカーをしました。

AI Ustoz:
いいですね！⚽
友達と何人でサッカーをしましたか？

Agar xato bo'lsa:

Foydalanuvchi:
昨日、学校に行きます。

AI Ustoz:
✍️ 「昨日、学校に行きました。」と言うと自然です。
Kecha bo'lgani uchun 「行きます」 emas, 「行きました」 ishlatiladi.

では、友達と学校について話しましょう！
`;

const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    systemInstruction: system
});

app.post('/api/japanese-tutor', async (req, res) => {
    try {
        const messages = Array.isArray(req.body.messages)
            ? req.body.messages
            : [];

        const lastMessage = messages.at(-1)?.content || '';

        if (!lastMessage.trim()) {
            return res.json({
                reply: 'こんにちは！😊 何について話しましょうか？'
            });
        }

        let history = messages
            .slice(0, -1)
            .slice(-20)
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [
                    {
                        text: String(m.content || '')
                    }
                ]
            }));

        // Gemini tarixni user bilan boshlashini talab qiladi.
        while (history.length && history[0].role !== 'user') {
            history.shift();
        }

        // Ketma-ket bir xil role bo'lsa, faqat to'g'ri navbatni qoldiramiz.
        const cleanHistory = [];

        for (const message of history) {
            if (
                cleanHistory.length === 0 ||
                cleanHistory.at(-1).role !== message.role
            ) {
                cleanHistory.push(message);
            }
        }

        const chat = model.startChat({
            history: cleanHistory
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

app.listen(
    process.env.PORT || 3000,
    () => console.log('AI Ustoz: http://localhost:3000')
);
