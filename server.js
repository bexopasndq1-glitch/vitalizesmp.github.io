const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const app = express();
app.use(cors());
app.use(express.json());

const playersDB = {}; 

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const DISCORD_BOT_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

client.login(DISCORD_BOT_TOKEN);

app.post('/api/register', async (req, res) => {
    const { nickname, age, about } = req.body;
    const lowerNick = nickname.toLowerCase();

    if (playersDB[lowerNick] && playersDB[lowerNick].status === 'Принят') {
        return res.json({ success: false, message: 'Этот ник уже принят на сервер!' });
    }

    playersDB[lowerNick] = { nickname, age, about, status: 'ожидание' };

    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        
        const embed = new EmbedBuilder()
            .setTitle("📝 Новая заявка на VitalizeSMP")
            .setColor(0x0093E9)
            .addFields(
                { name: "Ник игрока:", value: nickname, inline: true },
                { name: "Возраст:", value: age, inline: true },
                { name: "О себе:", value: about }
            )
            .setFooter({ text: `Ник: ${lowerNick}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`accept_${lowerNick}`).setLabel('🟢 Принять').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`reject_${lowerNick}`).setLabel('🔴 Отказать').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ embeds: [embed], components: [row] });
        res.json({ success: true, message: 'Заявка отправлена!' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Ошибка отправки боту.' });
    }
});

app.post('/api/status', (req, res) => {
    const { nickname } = req.body;
    const user = playersDB[nickname.toLowerCase()];

    if (!user) {
        return res.json({ success: false, message: 'Анкета с таким ником не найдена!' });
    }

    res.json({ success: true, status: user.status });
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [action, playerNick] = interaction.customId.split('_');
    const user = playersDB[playerNick];

    if (!user) {
        return interaction.reply({ content: 'Игрок не найден в текущей памяти бота.', ephemeral: true });
    }

    if (action === 'accept') {
        user.status = 'Принят';
        await interaction.update({ content: `✅ Заявка игрока **${user.nickname}** одобрена! Он добавлен на сервер.`, embeds: [], components: [] });
    } else if (action === 'reject') {
        user.status = 'Отказано';
        await interaction.update({ content: `❌ Игроку **${user.nickname}** отказано в заявке.`, embeds: [], components: [] });
    }
});

app.listen(10000, () => console.log('Бот запущен на Render'));
