require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
  .setName('도박')
  .setDescription('돈을 걸고 도박을 합니다')
  .addIntegerOption(option =>
    option.setName('금액')
      .setDescription('배팅 금액')
      .setRequired(true)
  ),
  new SlashCommandBuilder()
  .setName('주사위')
  .setDescription('주사위 도박을 합니다')
  .addIntegerOption(option =>
    option.setName('금액')
      .setDescription('배팅 금액')
      .setRequired(true)
  ),
  new SlashCommandBuilder().setName('돈줘').setDescription('게임을 하기 위한 돈을 받습니다'),
  new SlashCommandBuilder()
  .setName('복권')
  .setDescription('복권 도박을 합니다')
  .addIntegerOption(option =>
    option.setName('금액')
      .setDescription('배팅 금액')
      .setRequired(true)
  ),
  new SlashCommandBuilder()
  .setName('송금')
  .setDescription('다른 유저에게 돈을 보냅니다')
  .addUserOption(option =>
    option.setName('유저')
      .setDescription('송금할 대상')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option.setName('금액')
      .setDescription('송금할 금액')
      .setRequired(true)
  ),
  new SlashCommandBuilder()
  .setName('랭킹')
  .setDescription('서버 돈 랭킹을 확인합니다'),
  new SlashCommandBuilder().setName('잔액').setDescription('현재 돈을 확인합니다')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('슬래시 명령어 등록 중...');

    await rest.put(
  Routes.applicationCommands(process.env.CLIENT_ID),
  { body: [] } // 글로벌 명령어 삭제
);

    await rest.put(
      Routes.applicationGuildCommands(
  process.env.CLIENT_ID,
  process.env.GUILD_ID),
      { body: commands }
    );

    console.log('등록 완료!');
  } catch (error) {
    console.error(error);
  }
})();