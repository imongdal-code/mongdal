const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const mongoose = require('mongoose');
const express = require('express');

// 🔗 MongoDB 연결 (환경변수 체크)
if (!process.env.MONGO) console.error("❌ MONGO 환경변수가 설정되지 않았습니다.");
mongoose.connect(process.env.MONGO)
  .then(() => console.log('✅ MongoDB 연결 성공'))
  .catch(err => console.error('❌ MongoDB 연결 실패:', err));

// 📊 유저 스키마
const userSchema = new mongoose.Schema({
  userId: String,
  balance: { type: Number, default: 500000 },
  lastClaim: { type: String, default: null }
});
const User = mongoose.model('User', userSchema);

// 🤖 디스코드 봇 (인텐트 추가)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ],
});

client.once('ready', () => {
  console.log(`✅ 로그인됨: ${client.user.tag}`);
});

// 🎮 명령어 처리
client.on('interactionCreate', async interaction => {

  // =========================
  // 🔹 1. 버튼 처리 (도박/복권 결과창)
  // =========================
  if (interaction.isButton()) {
    // 버튼 클릭 시 '생각 중...' 상태로 전환
    await interaction.deferUpdate();

    const data = interaction.customId.split('_');
    const commandType = data[0];
    const ownerId = data[1];
    const bet = parseInt(data[2]);

    // 본인 확인
    if (interaction.user.id !== ownerId) {
      return interaction.followUp({ content: '❌ 본인의 게임 버튼만 누를 수 있습니다!', ephemeral: true });
    }

    let user = await User.findOne({ userId: ownerId });
    if (!user) user = new User({ userId: ownerId });

    if (commandType === 'gamble') {
      const winChance = parseFloat(data[3]);
      if (user.balance < bet) return interaction.editReply({ content: '❌ 돈이 부족합니다!', components: [] });

      const win = Math.random() < winChance;
      user.balance += win ? bet : -bet;
      await user.save();

      return interaction.editReply({
        content: win ? `🎉 승리! (+${bet}원)\n💰 현재 잔액: ${user.balance}원` : `💀 패배... (-${bet}원)\n💰 현재 잔액: ${user.balance}원`,
        components: []
      });
    }
    // 가위바위보
    if (data[0] === 'rps') {
  await interaction.deferUpdate();

  const choice = data[1];
  const userId = data[2];
  const bet = parseInt(data[3]);

  if (interaction.user.id !== userId) {
    return interaction.followUp({
      content: '❌ 본인만 사용 가능!',
      ephemeral: true
    });
  }

  let user = await User.findOne({ userId });
  if (!user) user = new User({ userId });

  if (user.balance < bet) {
    return interaction.editReply({
      content: '❌ 돈 부족!',
      components: []
    });
  }

  const choices = ['가위', '바위', '보'];
  const botChoice = choices[Math.floor(Math.random() * 3)];

  let result = '';
  let reward = 0;

  if (choice === botChoice) {
    result = '🤝 무승부!';
    reward = 0;
  } else if (
    (choice === '가위' && botChoice === '보') ||
    (choice === '바위' && botChoice === '가위') ||
    (choice === '보' && botChoice === '바위')
  ) {
    result = '🎉 승리!';
    reward = bet; // 👉 순이익 = +bet (총 2배 효과)
  } else {
    result = '💀 패배!';
    reward = -bet;
  }

  user.balance += reward;
  await user.save();

  return interaction.editReply({
    content:
      `👤 너: ${choice}\n🤖 봇: ${botChoice}\n\n${result}\n💰 ${reward >= 0 ? '+' : ''}${reward}원\n현재 잔액: ${user.balance}원`,
    components: []
  });
}
    if (commandType === 'lottery') {
      if (user.balance < bet) return interaction.editReply({ content: '❌ 돈이 부족합니다!', components: [] });

      user.balance -= bet;
      const chance = Math.random();

let s1, s2, s3;
let multiplier = 0;

if (chance < 0.4) {

  const winChance = Math.random();

  if (winChance < 0.05) {
    s1 = s2 = s3 = '⭐';
    multiplier = 10;

  } else if (winChance < 0.15) {
    s1 = s2 = s3 = '7️⃣';
    multiplier = 5;

  } else if (winChance < 0.30) {
    s1 = s2 = s3 = '💎';
    multiplier = 3;

  } else {
  const normalSymbols = ['🍒', '🍋', '🍇'];
  const sym = normalSymbols[Math.floor(Math.random() * normalSymbols.length)];

  s1 = s2 = s3 = sym;
  multiplier = 2;
}

} else {
  const symbols = ['🍒', '🍋', '🍇', '💎', '7️⃣', '⭐'];
  const pick = () => symbols[Math.floor(Math.random() * symbols.length)];

  s1 = pick();
  s2 = pick();
  s3 = pick();

  multiplier = 0;
}

      const reward = bet * multiplier;
      user.balance += reward;
      await user.save();

      return interaction.editReply({
        content: multiplier > 0 
          ? `🎰 **[ ${s1} | ${s2} | ${s3} ]**\n🎉 **${multiplier}배 당첨!** (+${reward}원)\n💰 현재 잔액: ${user.balance}원`
          : `🎰 **[ ${s1} | ${s2} | ${s3} ]**\n💀 꽝입니다! (-${bet}원)\n💰 현재 잔액: ${user.balance}원`,
        components: []
      });
    }
  }

  // =========================
  // 🔹 2. 슬래시 명령어
  // =========================
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, user: author } = interaction;
  let user = await User.findOne({ userId: author.id });
  if (!user) {
    user = new User({ userId: author.id });
    await user.save();
  }

  // 💰 잔액
  if (commandName === '잔액') {
    return interaction.reply(`💰 **${author.username}**님의 현재 잔액: \`${user.balance}원\``);
  }

  // 💸 돈줘
  if (commandName === '돈줘') {
    const today = new Date().toLocaleDateString();
    if (user.lastClaim === today) return interaction.reply('⏳ 오늘 지원금은 이미 받으셨습니다! 내일 다시 오세요.');

    user.balance += 100000;
    user.lastClaim = today;
    await user.save();
    return interaction.reply('💰 지원금 **100,000원**이 지급되었습니다! 대박 나세요!');
  }

   // 💸 돈 지급 (나만 가능)
if (interaction.commandName === '돈지급') {
  await interaction.deferReply({ flags: 64 });

  const OWNER_ID = process.env.OWNER_ID;

  if (interaction.user.id !== OWNER_ID) {
    return interaction.editReply('❌ 개발자만 사용 가능합니다.');
  }

  const target = interaction.options.getUser('유저');
  const amount = interaction.options.getInteger('금액');

  if (amount <= 0) {
    return interaction.editReply('❌ 1원 이상 입력하세요!');
  }

  let targetUser = await User.findOne({ userId: target.id });
  if (!targetUser) targetUser = new User({ userId: target.id });

  targetUser.balance += amount;
  await targetUser.save();

  return interaction.editReply(
    `✅ ${target.username}에게 ${amount}원 지급 완료!\n💰 현재 잔액: ${targetUser.balance}원`
  );
}

  // 🎰 도박 (수정됨)
  if (commandName === '도박') {
    const bet = options.getInteger('금액');
    if (bet <= 0) return interaction.reply({ content: '❌ 1원 이상 배팅하세요.', ephemeral: true });
    if (user.balance < bet) return interaction.reply({ content: '❌ 돈이 부족합니다.', ephemeral: true });

    const winChance = Math.random() * 0.4 + 0.2; // 확률 조정 (20~60%)
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`gamble_${author.id}_${bet}_${winChance}`)
        .setLabel('🎰 도박하기')
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({
      content: `🎲 **도박 정보**\n예상 승률: \`${(winChance * 100).toFixed(1)}%\`\n배팅 금액: \`${bet}원\`\n\n준비되셨으면 아래 버튼을 눌러주세요!`,
      components: [row]
    });
  }

  // 🎲 주사위 (deferReply 적용)
  if (commandName === '주사위') {
    const bet = options.getInteger('금액');
    if (bet <= 0) return interaction.reply('❌ 1원 이상 입력하세요.');
    if (user.balance < bet) return interaction.reply('❌ 돈이 부족합니다.');

    const dice = Math.floor(Math.random() * 6) + 1;
    const isWin = dice >= 4;
    user.balance += isWin ? bet : -bet;
    await user.save();

    return interaction.reply(`🎲 주사위를 굴려 **${dice}**이(가) 나왔습니다!\n${isWin ? `🎉 **승리!** (+${bet}원)` : `💀 **패배...** (-${bet}원)`}\n💰 현재 잔액: ${user.balance}원`);
  }

  // 🎟 복권
  if (commandName === '복권') {
    const bet = options.getInteger('금액');
    if (bet <= 0) return interaction.reply('❌ 1원 이상 입력하세요.');
    if (user.balance < bet) return interaction.reply('❌ 돈이 부족합니다.');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`lottery_${author.id}_${bet}`)
        .setLabel('🎟 복권 긁기')
        .setStyle(ButtonStyle.Success)
    );

    return interaction.reply({
      content: `🎟 복권을 구매하시겠습니까?\n배팅 금액: \`${bet}원\``,
      components: [row]
    });
  }
if (interaction.commandName === '가위바위보') {

  const bet = interaction.options.getInteger('금액');
  const userId = interaction.user.id;

  let user = await User.findOne({ userId });
  if (!user) user = new User({ userId });

  if (bet <= 0) {
    return interaction.reply('❌ 1원 이상 입력하세요!');
  }

  if (user.balance < bet) {
    return interaction.reply('❌ 돈 부족!');
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rps_가위_${userId}_${bet}`)
      .setLabel('✌️ 가위')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`rps_바위_${userId}_${bet}`)
      .setLabel('✊ 바위')
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId(`rps_보_${userId}_${bet}`)
      .setLabel('✋ 보')
      .setStyle(ButtonStyle.Success)
  );

  return interaction.reply({
    content: `💰 배팅: ${bet}원\n✊ 선택하세요!`,
    components: [row]
  });
}

  // 💣 전체 돈 리셋 (관리자 전용)
if (interaction.commandName === '돈리셋') {
  await interaction.deferReply({ ephemeral: true });

  // 🔒 관리자 권한 체크
  if (!interaction.member.permissions.has('Administrator')) {
    return interaction.editReply('❌ 관리자만 사용 가능!');
  }

  const amount = interaction.options.getInteger('금액');

  if (amount < 0) {
    return interaction.editReply('❌ 0 이상만 가능!');
  }

  // 🔥 전체 유저 돈 변경
  await User.updateMany({}, { balance: amount });

  return interaction.editReply(`✅ 모든 유저 돈을 ${amount}원으로 초기화 완료!`);
}
  // 💸 송금
  if (commandName === '송금') {
    const target = options.getUser('유저');
    const amount = options.getInteger('금액');

    if (target.id === author.id) return interaction.reply('❌ 자신에게는 송금할 수 없습니다.');
    if (amount <= 0) return interaction.reply('❌ 1원 이상 입력하세요.');
    if (user.balance < amount) return interaction.reply('❌ 잔액이 부족합니다.');

    let targetUser = await User.findOne({ userId: target.id });
    if (!targetUser) targetUser = new User({ userId: target.id });

    user.balance -= amount;
    targetUser.balance += amount;

    await user.save();
    await targetUser.save();

    return interaction.reply(`💸 **${target.username}**님께 \`${amount}원\`을 보냈습니다!\n💰 남은 잔액: \`${user.balance}원\``);
  }

  // 🏆 랭킹 (deferReply + editReply 적용)
  if (commandName === '랭킹') {
    await interaction.deferReply();
    const topUsers = await User.find().sort({ balance: -1 }).limit(10);
    let msg = '🏆 **전체 자산 랭킹 TOP 10**\n\n';

    for (let i = 0; i < topUsers.length; i++) {
      const u = topUsers[i];
      let name = '퇴사한 유저';
      try {
        const userObj = await client.users.fetch(u.userId);
        name = userObj.username;
      } catch (e) {}
      const medal = ['🥇', '🥈', '🥉'][i] || `[${i + 1}위]`;
      msg += `${medal} **${name}** : \`${u.balance.toLocaleString()}원\`\n`;
    }

    return interaction.editReply(msg);
  }
});

// ===== 웹서버 (Render 유지용) =====
const app = express();

app.get('/', (req, res) => res.send('봇이 정상 작동 중입니다.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 웹서버 실행됨 (포트: ${PORT})`));

// 🔍 TOKEN 확인
console.log("TOKEN 길이:", process.env.TOKEN?.length);

// 🔥 에러 확인용
client.on('error', (err) => {
  console.error('❌ 클라이언트 에러:', err);
});

client.on('shardError', (err) => {
  console.error('❌ 샤드 에러:', err);
});


client.login(process.env.TOKEN);