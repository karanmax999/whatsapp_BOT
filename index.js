const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const logger = require('./logger');

// Initialize the client
// Using LocalAuth for simple session persistence (works locally and with persistent disks)
// For stateless containers (like free Render), you might need RemoteAuth with Mongo/Redis later.
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    logger.info('QR Code received. Please scan it with your phone.');
    // Generate with small size for better rendering in logs
    qrcode.generate(qr, { small: true }, (code) => {
        console.log(code);
    });
});

client.on('ready', () => {
    logger.info('Client is ready!');
});

client.on('message', async (message) => {
    logger.info(`Message received from ${message.from}: ${message.body}`);

    // Check if the message is from a group or private chat
    const chat = await message.getChat();

    // Only auto-reply to private chats to avoid spamming groups
    if (!chat.isGroup) {
        // Casual reply from Karan
        const replyText = "Hey there! 👋 Karan here.\n\nThanks for reaching out! I'm currently offline/busy, but I've received your message and will get back to you really soon! 🚀";

        // Simulating typing delay for a more natural feel
        await chat.sendStateTyping();
        setTimeout(async () => {
            await message.reply(replyText);
        }, 2000); // 2 second delay
    } else {
        // Optional: Keep the ping command for groups/debug
        if (message.body === '!ping') {
            await message.reply('pong');
        }
    }
});

client.on('disconnected', (reason) => {
    logger.error('Client was disconnected', reason);
});

// Initialize
logger.info('Initializing bot...');
client.initialize();
