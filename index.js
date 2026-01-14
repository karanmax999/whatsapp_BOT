require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const axios = require('axios');
const logger = require('./logger');

// Configuration
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const SPAM_LINKS = ['http://', 'https://', 't.me/', 'wa.me/'];

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Perplexity AI Integration
async function askPerplexity(prompt) {
    try {
        const response = await axios.post('https://api.perplexity.ai/chat/completions', {
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
                { role: 'system', content: 'You are Karan\'s helpful AI assistant. Answer casually and concisely. If someone asks for Karan, tell them he will be back soon.' },
                { role: 'user', content: prompt }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        logger.error('Perplexity AI Error:', error.message);
        return "Hey! Karan's AI here. I'm having a bit of trouble connecting, but Karan will get back to you soon! 🚀";
    }
}

client.on('qr', async (qr) => {
    logger.info('QR Code received!');

    // Save QR as image
    try {
        await qrcode.toFile('./qr-code.png', qr, {
            width: 300,
            margin: 2
        });
        logger.info('✅ QR Code saved to qr-code.png');

        // Also generate data URL
        const qrDataURL = await qrcode.toDataURL(qr);
        console.log('📱 Copy this URL and paste in browser to see QR:');
        console.log(qrDataURL);
    } catch (err) {
        logger.error('Error generating QR:', err);
    }
});

client.on('ready', () => {
    logger.info('✅ Client is ready!');
});

client.on('authenticated', () => {
    logger.info('✅ Authenticated successfully!');
});

// Group Join Event (Welcome Message)
client.on('group_join', async (notification) => {
    const chat = await notification.getChat();
    const contact = await client.getContactById(notification.recipientIds[0]);
    logger.info(`User ${contact.pushname} joined group ${chat.name}`);
    await chat.sendMessage(`Welcome @${contact.id.user}! 👋 Glad to have you here.`, { mentions: [contact] });
});

client.on('message', async (message) => {
    const chat = await message.getChat();
    const body = message.body.toLowerCase();

    // 1. Auto-Reactions
    if (body.includes('nice') || body.includes('good') || body.includes('awesome')) {
        await message.react('👍');
    } else if (body.includes('love') || body.includes('thanks') || body.includes('thank you')) {
        await message.react('❤️');
    }

    // 2. Group Admin Features
    if (chat.isGroup) {
        // Anti-Spam
        const hasSpam = SPAM_LINKS.some(link => body.includes(link));
        const me = chat.groupMetadata.participants.find(p => p.id._serialized === client.info.wid._serialized);

        if (hasSpam && me && me.isAdmin) {
            logger.info(`Spam detected from ${message.from}. Kicking...`);
            await message.reply('Spam detected. Goodbye! 🚫');
            await chat.removeParticipants([message.author || message.from]);
        }

        // !everyone command
        if (body === '!everyone') {
            let text = 'Hey everyone! �\n\n';
            let mentions = [];
            for (let participant of chat.participants) {
                const contact = await client.getContactById(participant.id._serialized);
                mentions.push(contact);
                text += `@${participant.id.user} `;
            }
            await chat.sendMessage(text, { mentions });
        }
    }
    // 3. Private Chat AI Auto-Reply
    else if (!chat.isGroup) {
        logger.info(`AI Auto-replying to ${message.from}`);
        await chat.sendStateTyping();

        const aiResponse = await askPerplexity(message.body);
        await message.reply(aiResponse);
    }
});

client.on('disconnected', (reason) => {
    logger.error('Client was disconnected', reason);
});

logger.info('Initializing bot...');
client.initialize();
