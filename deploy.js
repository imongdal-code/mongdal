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
  new SlashCommandBuilder().setName('잔액').setDescription('현재 돈을 확인합니다')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('슬래시 명령어 등록 중...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID,process.env.GUILD_ID), // ⭐ 이걸로 바꿔
      { body: commands }
    );

    console.log('등록 완료!');
  } catch (error) {
    console.error(error);
  }
})();