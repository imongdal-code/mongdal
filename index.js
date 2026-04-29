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
const fmt = (n) => `${n.toLocaleString('ko-KR')}원`;
const handled = new Set();
// 🎮 명령어 처리
client.on('interactionCreate', async (interaction) => {

  // =========================
  // 🔹 1. 버튼 처리
  // =========================
  if (interaction.isButton()) {
  try {
    // 🔥 중복 응답 방지 + 실패 방지
    await interaction.deferUpdate();

    const data = interaction.customId.split('_');
    const commandType = data[0];

      // =========================
      // 🎰 도박
      // =========================
      if (commandType === 'gamble') {
        const userId = data[1];
        const bet = parseInt(data[2]);
        const winChance = parseFloat(data[3]);

        if (interaction.user.id !== userId) {
          return interaction.followUp({ content: '❌ 본인만 가능!', ephemeral: true });
        }

        let user = await User.findOne({ userId });
        if (!user) user = await new User({ userId }).save();

        if (isNaN(bet) || bet <= 0)
          return interaction.editReply({ content: '❌ 금액 오류', components: [] });

        if (user.balance < bet)
          return interaction.editReply({ content: '❌ 돈 부족', components: [] });

        const win = Math.random() < winChance;
        user.balance += win ? bet : -bet;
        await user.save();

        return interaction.editReply({
           content: win
             ? `🎉 승리! +${fmt(bet)}\n💰 현재 잔액: ${fmt(user.balance)}`
             : `💀 패배 -${fmt(bet)}\n💰 현재 잔액: ${fmt(user.balance)}`,
              components: []
             });
      }

      // =========================
      // ✌️ 가위바위보
      // =========================
      if (commandType === 'rps') {
          const choice = data[1];
           const userId = data[2];
           const bet = parseInt(data[3]);

          if (interaction.user.id !== userId) {
          return interaction.followUp({ content: '❌ 본인만 가능!', ephemeral: true });
          }

          let user = await User.findOne({ userId });
          if (!user) user = await new User({ userId }).save();

          if (user.balance < bet) {
          return interaction.editReply({ content: '❌ 돈 부족', components: [] });
           }

           const choices = ['가위', '바위', '보'];
             const bot = choices[Math.floor(Math.random() * 3)];

             let reward = 0;
             let result = ''; // 🔥 반드시 선언

             if (choice === bot) {
               result = '🤝 무승부';
             } else if (
               (choice === '가위' && bot === '보') ||
               (choice === '바위' && bot === '가위') ||
               (choice === '보' && bot === '바위')
             ) {
               result = '🎉 승리';
               reward = bet;
             } else {
               result = '💀 패배';
               reward = -bet;
             }

  user.balance += reward;
  await user.save();

  return interaction.editReply({
    content:
`👤 ${choice} vs 🤖 ${bot}
${result}
💰 ${reward > 0 ? '+' : ''}${fmt(Math.abs(reward))}
잔액: ${fmt(user.balance)}`,
    components: []
  });
}

      // =========================
      // 🎟 복권
      // =========================
      if (commandType === 'lottery') {
        const userId = data[1];
        const bet = parseInt(data[2]);

        if (interaction.user.id !== userId) {
          return interaction.followUp({ content: '❌ 본인만 가능!', ephemeral: true });
        }

        let user = await User.findOne({ userId });
        if (!user) user = await new User({ userId }).save();

        if (user.balance < bet)
          return interaction.editReply({ content: '❌ 돈 부족', components: [] });

        user.balance -= bet;

        const symbols = ['🍒','🍋','🍇','💎','7️⃣','⭐'];
        const pick = () => symbols[Math.floor(Math.random()*symbols.length)];

        const s1 = pick(), s2 = pick(), s3 = pick();

        let multi = 0;
        if (s1 === s2 && s2 === s3) {
          if (s1 === '⭐') multi = 10;
          else if (s1 === '7️⃣') multi = 5;
          else if (s1 === '💎') multi = 3;
          else multi = 2;
        }

        const reward = bet * multi;
        user.balance += reward;
        await user.save();

        return interaction.editReply({
         content: multi > 0
           ? `🎰 [${s1}|${s2}|${s3}]\n🎉 ${multi}배 당첨! +${fmt(reward)}\n💰 ${fmt(user.balance)}`
           : `🎰 [${s1}|${s2}|${s3}]\n💀 꽝 (-${fmt(bet)})\n💰 ${fmt(user.balance)}`,
           components: []
            });
      }

    } catch (err) {
      console.error(err);
      return;
    }

    return; // 🔥 버튼 끝나면 여기서 종료
  }
   // =========================
  // 🔹 2. 슬래시 명령어
  // =========================
  if (!interaction.isChatInputCommand()) return;

  // 1. 명령어 이름을 미리 확인해서 '돈지급' 명령어면 비공개로 설정
  const isPrivate = (interaction.commandName === '돈지급');

  // 2. 결정된 설정으로 deferReply 실행
 
  // 🔥 deferReply 안전 처리 (핵심)
try {
  await interaction.deferReply({ ephemeral: isPrivate });
} catch (e) {
  if (e.code === 10062) {
    console.log('⚠️ 만료된 인터랙션 무시');
    return;
  }
  throw e;
}

try {
  const { commandName, options, user: author } = interaction;

  let user = await User.findOne({ userId: author.id });
  if (!user) {
    user = new User({ userId: author.id });
    await user.save();
  }

  function getKSTDate() {
    const now = new Date();
    const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));

    const y = kst.getFullYear();
    const m = String(kst.getMonth() + 1).padStart(2, '0');
    const d = String(kst.getDate()).padStart(2, '0');

    return {
      date: `${y}-${m}-${d}`,
      dayOfWeek: kst.getDay()
    };
  }
  // 💰 잔액
  if (commandName === '잔액') {
    return interaction.editReply(`💰 **${author.username}**님의 현재 잔액: \`${fmt(user.balance)}\``);
  }

  // 💸 돈줘

if (commandName === '돈줘') {
  const { date, dayOfWeek } = getKSTDate();

  if (user.lastClaim && !/^\d{4}-\d{2}-\d{2}$/.test(user.lastClaim)) {
    user.lastClaim = null;
  }

  if (user.lastClaim === date) {
    return interaction.editReply('⏳ 오늘 지원금은 이미 받으셨습니다! (KST 기준)');
  }

  let amount = 100000;

  // 🔥 화요일(2), 금요일(5) 2배
  if (dayOfWeek === 2 || dayOfWeek === 5) {
    amount *= 2;
  }

  user.balance += amount;
  user.lastClaim = date;
  await user.save();

  let msg = `💰 지원금 **${fmt(amount)}** 지급 완료되었습니다!`;

  if (dayOfWeek === 2 || dayOfWeek === 5) {
    msg += '\n🎉 화/금 보너스 2배 지급!';
  }
  return interaction.editReply(msg);
}

   // 💸 돈 지급 (나만 가능)
if (interaction.commandName === '돈지급') {
  

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
  `✅ ${target.username}에게 ${fmt(amount)} 지급 완료!\n💰 현재 잔액: ${fmt(targetUser.balance)}`
   );
}

  // 🎰 도박 (수정됨)
  if (commandName === '도박') {
    const bet = options.getInteger('금액');
    if (bet <= 0) return interaction.editReply({ content: '❌ 1원 이상 배팅하세요.', ephemeral: true });
    if (user.balance < bet) return interaction.editReply({ content: '❌ 돈이 부족합니다.', ephemeral: true });

    const winChance = Math.random() * 0.5 + 0.3; // 확률 조정 30~80% 
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`gamble_${author.id}_${bet}_${winChance}`)
        .setLabel('🎰 도박하기')
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      content: `🎲 **도박 정보**
       예상 승률: \`${(winChance * 100).toFixed(1)}%\`
      배팅 금액: \`${fmt(bet)}\`

       준비되셨으면 아래 버튼을 눌러주세요!`,
      components: [row]
    });
  }

  // 🎲 주사위 (deferReply 적용)
  if (commandName === '주사위') {
    const bet = options.getInteger('금액');
    if (bet <= 0) return interaction.editReply('❌ 1원 이상 입력하세요.');
    if (user.balance < bet) return interaction.editReply('❌ 돈이 부족합니다.');

    let dice;

  // 🔥 너만 확률 보정
  if (author.id === process.env.OWNER_ID) {
    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;
    dice = Math.max(roll1, roll2);
  } else {
    dice = Math.floor(Math.random() * 6) + 1;
  }

  const isWin = dice >= 4;
  user.balance += isWin ? bet : -bet;
  await user.save();

    return interaction.editReply(
  `🎲 주사위 결과: **${dice}**
    ${isWin ? `🎉 승리! (+${fmt(bet)})` : `💀 패배 (-${fmt(bet)})`}
    💰 현재 잔액: ${fmt(user.balance)}`
     );
  }

  // 🎟 복권
  if (commandName === '복권') {
  const bet = options.getInteger('금액');
  if (bet <= 0) return interaction.editReply('❌ 1원 이상 입력하세요.');
  if (user.balance < bet) return interaction.editReply('❌ 돈이 부족합니다.');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lottery_${author.id}_${bet}`)
      .setLabel('🎟 복권 긁기')
      .setStyle(ButtonStyle.Success)
  );

  return interaction.editReply({
    content:
`🎟 복권을 구매하시겠습니까?
배팅 금액: \`${fmt(bet)}\`

📊 당첨 확률:
❌ 꽝: 60%
🍒🍋🍇: 2배
💎: 3배
7️⃣: 5배
⭐: 10배`,
    components: [row]
  });
}
if (interaction.commandName === '가위바위보') {

  const bet = interaction.options.getInteger('금액');
  const userId = interaction.user.id;

  let dbUser = await User.findOne({ userId });
  if (!user) user = new User({ userId });

  if (bet <= 0) {
    return interaction.editReply('❌ 1원 이상 입력하세요!');
  }

  if (user.balance < bet) {
    return interaction.editReply('❌ 돈 부족!');
  }

 const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId(`rps_가위_${interaction.user.id}_${bet}`)
    .setLabel('✌️ 가위')
    .setStyle(ButtonStyle.Primary),

  new ButtonBuilder()
    .setCustomId(`rps_바위_${interaction.user.id}_${bet}`)
    .setLabel('✊ 바위')
    .setStyle(ButtonStyle.Primary),

  new ButtonBuilder()
    .setCustomId(`rps_보_${interaction.user.id}_${bet}`)
    .setLabel('✋ 보')
    .setStyle(ButtonStyle.Primary)
);

  return interaction.editReply({
     content: `💰 배팅: ${fmt(bet)}\n✊ 선택하세요!`,
    components: [row]
  });
}

  // 💣 전체 돈 리셋 (관리자 전용)
if (interaction.commandName === '돈리셋') {

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

  return interaction.editReply(`✅ 모든 유저 돈을 ${fmt(amount)}으로 초기화 완료!`);
}
  // 💸 송금
  if (commandName === '송금') {
    const target = options.getUser('유저');
    const amount = options.getInteger('금액');

    if (target.id === author.id) return interaction.editReply('❌ 자신에게는 송금할 수 없습니다.');
    if (amount <= 0) return interaction.editReply('❌ 1원 이상 입력하세요.');
    if (user.balance < amount) return interaction.editReply('❌ 잔액이 부족합니다.');

    let targetUser = await User.findOne({ userId: target.id });
    if (!targetUser) targetUser = new User({ userId: target.id });

    user.balance -= amount;
    targetUser.balance += amount;

    await user.save();
    await targetUser.save();

    return interaction.editReply(
  `💸 **${target.username}**님께 ${fmt(amount)} 송금 완료!\n💰 남은 잔액: ${fmt(user.balance)}`
   );
  }

  // 🏆 랭킹 (deferReply + editReply 적용)
  if (commandName === '랭킹') {
    const topUsers = await User.find().sort({ balance: -1 }).limit(10);
    let msg = '🏆 **전체 자산 랭킹 TOP 10**\n\n';

    for (let i = 0; i < topUsers.length; i++) {
    const u = topUsers[i];
    let name = '알 수 없음';

    try {
      // 🔥 핵심: guildMember 가져오기
      const member = await interaction.guild.members.fetch(u.userId);

      // 🔥 닉네임 우선, 없으면 username
      name = member.nickname || member.user.username;

    } catch (e) {
      // 서버에 없는 유저 fallback
      try {
        const userObj = await client.users.fetch(u.userId);
        name = userObj.username;
      } catch {}
    }

    const medal = ['🥇', '🥈', '🥉'][i] || `[${i + 1}위]`;
    msg += `${medal} **${name}** : \`${fmt(u.balance)}\`\n`;
  }

    return interaction.editReply(msg);
  }
  } catch (err) {
  console.error('슬래시 명령어 에러:', err);
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({ content: '❌ 오류 발생', ephemeral: true });
  } else {
    await interaction.editReply('❌ 오류 발생');
  }
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