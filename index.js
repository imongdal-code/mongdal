
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

client.once('clientReady', () => {
  console.log(`로그인됨: ${client.user.tag}`);
});

// 🎮 명령어 처리
client.on('interactionCreate', async interaction => {

  // =========================
  // 🔹 1. 버튼 처리 먼저
  // =========================
  if (interaction.isButton()) {
    await interaction.deferUpdate();

    const data = interaction.customId.split('_');

    if (data[0] === 'gamble') {
      const userId = data[1];
      const bet = parseInt(data[2]);
      const winChance = parseFloat(data[3]);

      if (interaction.user.id !== userId) {
        return interaction.followUp({ content: '❌ 본인만 사용할 수 있습니다!', ephemeral: true });
      }

      let user = await User.findOne({ userId });

      if (!user) {
        user = new User({ userId });
      }

      if (user.balance < bet) {
        return interaction.editReply({ content: '❌ 돈이 부족합니다!', components: [] });
      }

      const win = Math.random() < winChance;

      if (win) {
        user.balance += bet;
      } else {
        user.balance -= bet;
      }

      await user.save();

      return interaction.editReply({
        content: win
          ? `🎉 승리! (+${bet})\n현재 돈: ${user.balance}원`
          : `💀 패배... (-${bet})\n현재 돈: ${user.balance}원`,
        components: []
      });
    }
  }

  // =========================
  // 🔹 2. 슬래시 명령어 처리
  // =========================
  client.on('interactionCreate', async interaction => {

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
      return interaction.reply('⏳ 오늘은 이미 받았어요!');
    }

    user.balance += 100000;
    user.lastClaim = today;
    await user.save();

    return interaction.reply('💰 100000원을 지급했습니다!');
  }

  // 🎰 도박
  if (interaction.commandName === '도박') {
    const bet = interaction.options.getInteger('금액');

    if (bet <= 0) {
      return interaction.reply('❌ 1원 이상 배팅해야 합니다!');
    }

    if (user.balance < bet) {
      return interaction.reply('❌ 돈이 부족합니다!');
    }

    const winChance = Math.random() * 0.5 + 0.3;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`gamble_${userId}_${bet}_${winChance}`)
        .setLabel('🎰 도박 시작')
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      content: `🎲 성공 확률: ${(winChance * 100).toFixed(1)}%\n💰 배팅: ${bet}원`,
      components: [row]
    });
  }

  // 🎲 주사위
  if (interaction.commandName === '주사위') {
    const bet = interaction.options.getInteger('금액');

    if (bet <= 0) {
      return interaction.reply('❌ 1원 이상 배팅해야 합니다!');
    }

    if (user.balance < bet) {
      return interaction.reply('❌ 돈이 부족합니다!');
    }

    const dice = Math.floor(Math.random() * 6) + 1;

    if (dice >= 4) {
      user.balance += bet;
      await user.save();

      return interaction.reply(`🎲 ${dice} → 🎉 승리! +${bet}원 (현재 ${user.balance}원)`);
    } else {
      user.balance -= bet;
      await user.save();

      return interaction.reply(`🎲 ${dice} → 💀 패배... -${bet}원 (현재 ${user.balance}원)`);
    }
  }

  // 🎟 복권 (버튼)
  if (interaction.commandName === '복권') {
    const bet = interaction.options.getInteger('금액');

    if (bet <= 0) {
      return interaction.reply('❌ 1원 이상 입력하세요!');
    }

    if (user.balance < bet) {
      return interaction.reply('❌ 돈이 부족합니다!');
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`lottery_${userId}_${bet}`)
        .setLabel('🎰 복권 뽑기')
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      content: `🎟 복권 구매 완료!\n💰 배팅: ${bet}원\n👉 버튼을 눌러 결과 확인!`,
      components: [row]
    });
  }

}); // ✅ 이벤트 끝

// ✅ 이건 무조건 파일 맨 아래
client.login(process.env.TOKEN);