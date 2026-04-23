
const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const mongoose = require('mongoose');

// 🔗 MongoDB 연결
mongoose.connect(process.env.MONGO)
  .then(() => console.log('MongoDB 연결 성공'))
  .catch(err => console.error(err));

// 📊 유저 스키마
const userSchema = new mongoose.Schema({
  userId: String,
  balance: { type: Number, default: 1000 },
  lastClaim: { type: String, default: null }
});

const User = mongoose.model('User', userSchema);

// 🤖 디스코드 봇
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', () => {
  console.log(`로그인됨: ${client.user.tag}`);
});

// 🎮 명령어 처리
client.on('interactionCreate', async interaction => {

  // =========================
  // 🔹 1. 버튼 처리
  // =========================
  if (interaction.isButton()) {
    await interaction.deferUpdate();

    const data = interaction.customId.split('_');

    // 🎰 도박
    if (data[0] === 'gamble') {
      const userId = data[1];
      const bet = parseInt(data[2]);
      const winChance = parseFloat(data[3]);

      if (interaction.user.id !== userId) {
        return interaction.followUp({ content: '❌ 본인만 사용 가능!', ephemeral: true });
      }

      let user = await User.findOne({ userId });
      if (!user) user = new User({ userId });

      if (user.balance < bet) {
        return interaction.editReply({ content: '❌ 돈 부족!', components: [] });
      }

      const win = Math.random() < winChance;

      if (win) user.balance += bet;
      else user.balance -= bet;

      await user.save();

      return interaction.editReply({
        content: win
          ? `🎉 승리! (+${bet})\n💰 ${user.balance}원`
          : `💀 패배... (-${bet})\n💰 ${user.balance}원`,
        components: []
      });
    }

    // 🎟 복권
    if (data[0] === 'lottery') {
      const userId = data[1];
      const bet = parseInt(data[2]);

      if (interaction.user.id !== userId) {
        return interaction.followUp({ content: '❌ 본인만 사용 가능!', ephemeral: true });
      }

      let user = await User.findOne({ userId });
      if (!user) user = new User({ userId });

      if (user.balance < bet) {
        return interaction.editReply({ content: '❌ 돈 부족!', components: [] });
      }

      user.balance -= bet;

      const symbols = ['🍒', '🍋', '🍇', '💎', '7️⃣', '⭐'];
      const pick = () => symbols[Math.floor(Math.random() * symbols.length)];

      const s1 = pick();
      const s2 = pick();
      const s3 = pick();

      const result = `${s1} | ${s2} | ${s3}`;

      let multiplier = 0;

      if (s1 === s2 && s2 === s3) {
        if (s1 === '⭐') multiplier = 4;
        else if (s1 === '7️⃣') multiplier = 3;
        else if (s1 === '💎') multiplier = 2;
      }

      const reward = bet * multiplier;
      user.balance += reward;

      await user.save();

      return interaction.editReply({
        content: multiplier > 0
          ? `🎰 ${result}\n🎉 ${multiplier}배 당첨! +${reward}원\n💰 ${user.balance}원`
          : `🎰 ${result}\n💀 꽝... -${bet}원\n💰 ${user.balance}원`,
        components: []
      });
    }
  }

  // =========================
  // 🔹 2. 슬래시 명령어
  // =========================
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  let user = await User.findOne({ userId });
  if (!user) {
    user = new User({ userId });
    await user.save();
  }

  // 💰 잔액
  if (interaction.commandName === '잔액') {
    return interaction.reply(`💰 현재 잔액: ${user.balance}원`);
  }

  // 💸 돈줘
  if (interaction.commandName === '돈줘') {
    const today = new Date().toLocaleDateString();

    if (user.lastClaim === today) {
      return interaction.reply('⏳ 이미 받음');
    }

    user.balance += 100000;
    user.lastClaim = today;
    await user.save();

    return interaction.reply('💰 100000원 지급!');
  }

  // 🎰 도박
  if (interaction.commandName === '도박') {
    await interaction.editReply();
    const bet = interaction.options.getInteger('금액');

    if (bet <= 0) return interaction.reply('❌ 1원 이상');
    if (user.balance < bet) return interaction.reply('❌ 돈 부족');

    const winChance = Math.random() * 0.5 + 0.3;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`gamble_${userId}_${bet}_${winChance}`)
        .setLabel('🎰 도박')
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      content: `🎲 ${(winChance * 100).toFixed(1)}%\n💰 ${bet}원`,
      components: [row]
    });
  }

  // 🎲 주사위
  if (interaction.commandName === '주사위') {
    await interaction.editReply();
    const bet = interaction.options.getInteger('금액');

    if (bet <= 0) return interaction.reply('❌ 1원 이상');
    if (user.balance < bet) return interaction.reply('❌ 돈 부족');

    const dice = Math.floor(Math.random() * 6) + 1;

    if (dice >= 4) {
      user.balance += bet;
      await user.save();
      return interaction.editReply(`🎲 ${dice} → 🎉 +${bet}`);
    } else {
      user.balance -= bet;
      await user.save();
      return interaction.editReply(`🎲 ${dice} → 💀 -${bet}`);
    }
  }

  // 🎟 복권
  if (interaction.commandName === '복권') {
    await interaction.editReply();
    const bet = interaction.options.getInteger('금액');

    if (bet <= 0) return interaction.reply('❌ 1원 이상');
    if (user.balance < bet) return interaction.reply('❌ 돈 부족');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`lottery_${userId}_${bet}`)
        .setLabel('🎟 복권')
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      content: `🎟 복권 구매\n💰 ${bet}원`,
      components: [row]
    });
  }

  // 💸 송금
  if (interaction.commandName === '송금') {
    await interaction.editReply();
    const target = interaction.options.getUser('유저');
    const amount = interaction.options.getInteger('금액');

    if (target.id === interaction.user.id) {
      return interaction.reply('❌ 자기 자신에게 보낼 수 없습니다!');
    }

    if (amount <= 0) {
      return interaction.reply('❌ 1원 이상 입력하세요!');
    }

    if (user.balance < amount) {
      return interaction.reply('❌ 돈이 부족합니다!');
    }

    let targetUser = await User.findOne({ userId: target.id });
    if (!targetUser) targetUser = new User({ userId: target.id });

    user.balance -= amount;
    targetUser.balance += amount;

    await user.save();
    await targetUser.save();

    return interaction.reply(
      `💸 ${target.username}님에게 ${amount}원 송금 완료!\n💰 내 잔액: ${user.balance}원`
    );
  }

  // 🏆 랭킹
  if (interaction.commandName === '랭킹') {
    await interaction.editReply();
    const topUsers = await User.find().sort({ balance: -1 }).limit(10);

    let msg = '🏆 돈 랭킹 TOP 10\n\n';

    for (let i = 0; i < topUsers.length; i++) {
      const u = topUsers[i];

      let name = '알 수 없음';
      try {
        const userObj = await client.users.fetch(u.userId);
        name = userObj.username;
      } catch {}

      const medal = ['🥇', '🥈', '🥉'][i] || '';

      msg += `${i + 1}위 ${medal} ${name} - ${u.balance}원\n`;
    }

    return interaction.editReply(msg);
  }

});

// ===== 웹서버 (Render 유지용) =====
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('봇 살아있음');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`웹서버 실행됨 ${PORT}`);
});

console.log("로그인 시도");

// ✅ 디스코드 로그인 (맨 마지막)
client.login(process.env.TOKEN)
  .then(() => console.log('디코 로그인 성공'))
  .catch(err => console.error('디코 로그인 실패:', err));