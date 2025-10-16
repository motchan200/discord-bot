// 統合されたコマンド定義とハンドラー
import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { 
  getUser, 
  addPoints, 
  subtractPoints, 
  getTopUsers, 
  getTopLeavesUsers,
  getItems,
  addItem,
  removeItem,
  getEffect,
  consumeLucky,
  setBooster,
  getDailyBonus,
  setDailyBonus,
  getWorkBonus,
  setWorkBonus,
  getUserJob,
  setUserJob,
  canChangeJob,
  getJobRanking,
  getJobStats,
  createTrade,
  buyTrade,
  cancelTrade,
  getActiveTrades,
  getUserTradeHistory,
  getTrade,
  createAuction,
  placeBid,
  endAuction,
  processExpiredAuctions,
  getActiveAuctions,
  getUserAuctionHistory,
  getAuction,
  getBankAccount,
  depositToBank,
  withdrawFromBank,
  getBankTransactionHistory,
  // Admin関連
  isAdmin,
  addAdmin,
  removeAdmin,
  getAdmins,
  logAdminAction,
  getAdminLogs,
  getUserStats,
  multiplyAllPoints,
  taxAllUsers,
  resetAllPoints,
  resetUserData,
  giveItemToAll,
  forceEndAllGames,
  forceEndUserGames
} from './database.js';
import { 
  rollGacha, 
  rollMultipleGacha, 
  rollApologyGacha,
  startBlackjackGame,
  hitCard,
  standCard,
  getGameState,
  endGame,
  getActiveGame,
  getBlackjackHistory,
  startBaccaratGame,
  getBaccaratHistory,
  startSicboGame,
  getSicboHistory,
  getAvailableBetTypes,
  startSlotGame,
  spinAllReels,
  calculatePayout,
  changeBetAmount,
  getSlotGameState,
  endSlotGame,
  getActiveSlotGame,
  formatReels
} from './games.js';
import { ITEMS, SHOP_ITEMS, SPECIAL_ITEMS, DAILY_QUESTS, JOBS, JOB_LEVELS } from './config.js';

// スラッシュコマンド登録
export const commands = [
  new SlashCommandBuilder().setName('roll').setDescription('ガチャを回す')
    .addStringOption(opt => opt.setName('type').setDescription('ガチャタイプ').setRequired(true)
      .addChoices(
        { name: 'ノーマルガチャ (100円)', value: 'normal' },
        { name: 'リーフガチャ (450リーフ)', value: 'lerf' }
      ))
    .addIntegerOption(opt => opt.setName('count').setDescription('ガチャ回数（1=単発、5=5連、10=10連）').setRequired(false).setMinValue(1).setMaxValue(10)),
  new SlashCommandBuilder().setName('items').setDescription('所持アイテムを表示'),
  new SlashCommandBuilder().setName('status').setDescription('ポイントとガチャ回数を表示'),
  new SlashCommandBuilder().setName('ranking').setDescription('ポイントランキング')
    .addStringOption(opt => opt.setName('type').setDescription('ランキングの種類').setRequired(false)
      .addChoices(
        { name: 'world', value: 'word' },
        { name: 'local', value: 'local' }
      )),
  new SlashCommandBuilder().setName('daily').setDescription('1日1回ポイントボーナス'),
  new SlashCommandBuilder().setName('iteminfo').setDescription('アイテムの詳細を表示').addStringOption(opt => opt.setName('name').setDescription('アイテム名').setRequired(true)),
  new SlashCommandBuilder().setName('help').setDescription('使えるコマンド一覧'),
  new SlashCommandBuilder().setName('buy').setDescription('アイテムを購入する'),
  new SlashCommandBuilder().setName('sell').setDescription('アイテムを売却する'),
  new SlashCommandBuilder().setName('itemlist').setDescription('アイテム一覧と価格・確率を表示'),
  new SlashCommandBuilder().setName('shop').setDescription('ショップ限定アイテム一覧と購入'),
  new SlashCommandBuilder().setName('openbox').setDescription('ショップで購入したミステリーボックスを開封する'),
  new SlashCommandBuilder().setName('blackjack').setDescription('ブラックジャックゲームを開始').addIntegerOption(opt => opt.setName('bet').setDescription('ベット額（1円以上）').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('baccarat').setDescription('バカラゲームを開始')
    .addIntegerOption(opt => opt.setName('bet').setDescription('ベット額（1円以上）').setRequired(true).setMinValue(1))
    .addStringOption(opt => opt.setName('type').setDescription('ベットタイプ').setRequired(true)
      .addChoices(
        { name: 'プレイヤー (1:1配当)', value: 'player' },
        { name: 'バンカー (1.95:1配当)', value: 'banker' },
        { name: '引き分け (8:1配当)', value: 'tie' }
      )),
  new SlashCommandBuilder().setName('sicbo').setDescription('シックボーゲームを開始')
    .addIntegerOption(opt => opt.setName('bet').setDescription('ベット額（1円以上）').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('work').setDescription('1時間に1回100ポイントを獲得'),
  new SlashCommandBuilder().setName('job').setDescription('職業システム')
    .addStringOption(opt => opt.setName('action').setDescription('操作を選択').setRequired(true)
      .addChoices(
        { name: '職業設定', value: 'set' },
        { name: '仕事実行', value: 'work' },
        { name: 'ステータス確認', value: 'status' },
        { name: '職業一覧', value: 'list' },
        { name: '職業詳細', value: 'info' },
        { name: 'ランキング', value: 'ranking' },
        { name: '統計情報', value: 'stats' }
      ))
    .addStringOption(opt => opt.setName('job').setDescription('職業名（設定・詳細時）').setRequired(false)
      .addChoices(
        { name: '💻 プログラマー', value: 'programmer' },
        { name: '🌾 農家', value: 'farmer' },
        { name: '🚚 配達員', value: 'delivery' },
        { name: '📈 投資家', value: 'investor' },
        { name: '📺 ストリーマー', value: 'streamer' },
        { name: '⚔️ 冒険者', value: 'adventurer' },
        { name: '🎰 ギャンブラー', value: 'gambler' },
        { name: '👨‍🏫 教師', value: 'teacher' },
        { name: '👨‍⚕️ 医者', value: 'doctor' },
        { name: '🗡️ 盗賊', value: 'thief' }
      )),
  new SlashCommandBuilder().setName('allowance').setDescription('他のユーザーにお金をあげる')
    .addUserOption(opt => opt.setName('user').setDescription('お金をあげるユーザー').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('あげる金額（1円以上）').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('slot').setDescription('スのロットマシンゲームを開始').addIntegerOption(opt => opt.setName('bet').setDescription('ベット額（1円以上）').setRequired(true).setMinValue(1)),
  
  // 取引システム関連コマンド
  new SlashCommandBuilder().setName('trade').setDescription('アイテム取引システム')
    .addStringOption(opt => opt.setName('action').setDescription('操作を選択').setRequired(true)
      .addChoices(
        { name: '取引作成', value: 'create' },
        { name: '取引購入', value: 'buy' },
        { name: '取引キャンセル', value: 'cancel' },
        { name: '取引一覧', value: 'list' },
        { name: '取引履歴', value: 'history' }
      ))
    .addStringOption(opt => opt.setName('item').setDescription('アイテム名（作成時必須）').setRequired(false))
    .addIntegerOption(opt => opt.setName('quantity').setDescription('数量（作成時必須）').setRequired(false).setMinValue(1))
    .addIntegerOption(opt => opt.setName('price').setDescription('価格（作成時必須）').setRequired(false).setMinValue(1))
    .addIntegerOption(opt => opt.setName('tradeid').setDescription('取引ID（購入・キャンセル時必須）').setRequired(false).setMinValue(1)),
  
  // オークションシステム関連コマンド
  new SlashCommandBuilder().setName('auction').setDescription('オークションシステム')
    .addStringOption(opt => opt.setName('action').setDescription('操作を選択').setRequired(true)
      .addChoices(
        { name: 'オークション作成', value: 'create' },
        { name: '入札', value: 'bid' },
        { name: 'オークション一覧', value: 'list' },
        { name: 'オークション履歴', value: 'history' },
        { name: '期限切れ処理', value: 'process' }
      ))
    .addStringOption(opt => opt.setName('item').setDescription('アイテム名（作成時必須）').setRequired(false))
    .addIntegerOption(opt => opt.setName('quantity').setDescription('数量（作成時必須）').setRequired(false).setMinValue(1))
    .addIntegerOption(opt => opt.setName('startingprice').setDescription('開始価格（作成時必須）').setRequired(false).setMinValue(1))
    .addIntegerOption(opt => opt.setName('duration').setDescription('期間（時間、作成時必須）').setRequired(false).setMinValue(1).setMaxValue(168))
    .addIntegerOption(opt => opt.setName('auctionid').setDescription('オークションID（入札時必須）').setRequired(false).setMinValue(1))
    .addIntegerOption(opt => opt.setName('bidamount').setDescription('入札額（入札時必須）').setRequired(false).setMinValue(1)),
  
  // 統計情報コマンド
  new SlashCommandBuilder().setName('stats').setDescription('ボットとサーバーの統計情報を表示')
    .addStringOption(opt => opt.setName('type').setDescription('統計の種類').setRequired(false)
      .addChoices(
        { name: 'サーバー統計', value: 'server' },
        { name: 'ボット統計', value: 'bot' },
        { name: 'ユーザー統計', value: 'user' },
        { name: '全体統計', value: 'all' }
      )),
  
  // ゲームコマンド
  new SlashCommandBuilder().setName('guess').setDescription('数字当てゲーム（リーフ賭け）')
    .addIntegerOption(opt => opt.setName('bet').setDescription('賭けるリーフ数（1リーフ以上）').setRequired(true).setMinValue(1))
    .addIntegerOption(opt => opt.setName('number').setDescription('予想する数字（1-3）').setRequired(true).setMinValue(1).setMaxValue(3)),
  
  // サイコロコマンド
  new SlashCommandBuilder().setName('dice').setDescription('サイコロを振る')
    .addIntegerOption(opt => opt.setName('count').setDescription('サイコロの個数（1-10個）').setRequired(true).setMinValue(1).setMaxValue(10)),
  
  // 銀行コマンド
  new SlashCommandBuilder().setName('bank').setDescription('銀行システム')
    .addStringOption(opt => opt.setName('action').setDescription('操作を選択').setRequired(false)
      .addChoices(
        { name: '残高確認', value: 'balance' },
        { name: '預金', value: 'deposit' },
        { name: '引き出し', value: 'withdraw' },
        { name: '取引履歴', value: 'history' }
      ))
    .addIntegerOption(opt => opt.setName('amount').setDescription('金額（預金・引き出し時必須）').setRequired(false).setMinValue(1)),
  
  // コイン投げコマンド
  new SlashCommandBuilder().setName('coin').setDescription('コイン投げ（表・裏）')
    .addIntegerOption(opt => opt.setName('bet').setDescription('ベット額（1円以上）').setRequired(true).setMinValue(1))
    .addStringOption(opt => opt.setName('side').setDescription('予想する面').setRequired(true)
      .addChoices(
        { name: '表', value: 'heads' },
        { name: '裏', value: 'tails' }
      )),

  // ======== Adminコマンド ========
  
  // ユーザー管理系
  new SlashCommandBuilder().setName('admin').setDescription('管理者コマンド')
    .addStringOption(opt => opt.setName('action').setDescription('操作を選択').setRequired(true)
      .addChoices(
        // ユーザー管理
        { name: 'ユーザー情報表示', value: 'userinfo' },
        { name: 'ポイント設定', value: 'setpoints' },
        { name: 'ポイント追加', value: 'addpoints' },
        { name: 'ポイント削除', value: 'removepoints' },
        { name: 'ユーザーリセット', value: 'resetuser' },
        // アイテム管理
        { name: 'アイテム付与', value: 'additem' },
        { name: 'アイテム削除', value: 'removeitem' },
        { name: 'アイテム一覧', value: 'itemlist' },
        { name: '全員にアイテム配布', value: 'giveall' },
        // システム管理
        { name: '統計情報', value: 'stats' },
        { name: 'ログ表示', value: 'logs' },
        { name: 'メンテナンス', value: 'maintenance' },
        { name: 'ブロードキャスト', value: 'broadcast' },
        // ゲーム管理
        { name: 'ゲーム強制終了', value: 'endgames' },
        { name: '職業設定', value: 'setjob' },
        { name: '職業リセット', value: 'resetjob' },
        { name: 'クールダウン設定', value: 'setcooldown' },
        // 経済管理
        { name: '経済操作', value: 'economy' },
        { name: 'ショップ管理', value: 'shop' },
        // 権限管理
        { name: '管理者追加', value: 'admin' },
        { name: '管理者削除', value: 'removeadmin' },
        { name: '管理者一覧', value: 'adminlist' },
        { name: 'ブラックリスト', value: 'blacklist' }
      ))
    .addUserOption(opt => opt.setName('user').setDescription('対象ユーザー').setRequired(false))
    .addStringOption(opt => opt.setName('item').setDescription('アイテム名').setRequired(false))
    .addIntegerOption(opt => opt.setName('amount').setDescription('数量・金額').setRequired(false).setMinValue(1))
    .addStringOption(opt => opt.setName('job').setDescription('職業名').setRequired(false)
      .addChoices(
        { name: '💻 プログラマー', value: 'programmer' },
        { name: '🌾 農家', value: 'farmer' },
        { name: '🚚 配達員', value: 'delivery' },
        { name: '📈 投資家', value: 'investor' },
        { name: '📺 ストリーマー', value: 'streamer' },
        { name: '⚔️ 冒険者', value: 'adventurer' },
        { name: '🎰 ギャンブラー', value: 'gambler' },
        { name: '👨‍🏫 教師', value: 'teacher' },
        { name: '👨‍⚕️ 医者', value: 'doctor' },
        { name: '🗡️ 盗賊', value: 'thief' }
      ))
    .addStringOption(opt => opt.setName('type').setDescription('タイプ（economy/shop/logs用）').setRequired(false)
      .addChoices(
        { name: 'リセット', value: 'reset' },
        { name: '倍率変更', value: 'multiply' },
        { name: '課税', value: 'tax' },
        { name: 'アイテム追加', value: 'add' },
        { name: 'アイテム削除', value: 'remove' },
        { name: '価格変更', value: 'price' },
        { name: 'エラー', value: 'error' },
        { name: '取引', value: 'trade' },
        { name: 'ゲーム', value: 'game' },
        { name: '追加', value: 'add' },
        { name: '削除', value: 'remove' }
      ))
    .addStringOption(opt => opt.setName('message').setDescription('メッセージ（broadcast用）').setRequired(false))
    .addStringOption(opt => opt.setName('cooldown').setDescription('クールダウン時間（分）').setRequired(false))
];

// 職業コマンドハンドラー
export async function handleJobCommand(interaction) {
  const action = interaction.options.getString('action');
  const jobName = interaction.options.getString('job');
  const userId = interaction.user.id;

  try {
    switch (action) {
      case 'set':
        await handleSetJob(interaction, userId, jobName);
        break;
      case 'work':
        await handleWork(interaction, userId);
        break;
      case 'status':
        await handleJobStatus(interaction, userId);
        break;
      case 'list':
        await handleJobList(interaction);
        break;
      case 'info':
        await handleJobInfo(interaction, jobName);
        break;
      case 'ranking':
        await handleJobRanking(interaction);
        break;
      case 'stats':
        await handleJobStats(interaction);
        break;
      default:
        await interaction.reply({ content: '無効な操作です。', ephemeral: true });
    }
  } catch (error) {
    console.error('職業コマンドエラー:', error);
    await interaction.reply({ 
      content: `エラーが発生しました: ${error.message}`, 
      ephemeral: true 
    });
  }
}

// 職業設定
async function handleSetJob(interaction, userId, jobName) {
  if (!jobName) {
    const embed = new EmbedBuilder()
      .setTitle('職業設定')
      .setDescription('利用可能な職業:')
      .setColor(0x3498db);
    
    const jobList = Object.entries(JOBS).map(([key, job]) => 
      `**${job.emoji} ${job.name}** - ${job.description}`
    ).join('\n');
    
    embed.addFields({ name: '職業一覧', value: jobList });
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (!JOBS[jobName]) {
    await interaction.reply({ 
      content: '無効な職業名です。`/job list`で利用可能な職業を確認してください。', 
      ephemeral: true 
    });
    return;
  }

  const canChange = await canChangeJob(userId);
  if (!canChange) {
    await interaction.reply({ 
      content: '職業は1日1回しか変更できません。明日またお試しください。', 
      ephemeral: true 
    });
    return;
  }

  await setUserJob(userId, jobName);
  const job = JOBS[jobName];
  
  const embed = new EmbedBuilder()
    .setTitle('職業設定完了')
    .setDescription(`**${job.emoji} ${job.name}** に就職しました！`)
    .addFields(
      { name: '説明', value: job.description, inline: false },
      { name: '報酬範囲', value: `¥${job.baseReward.min} ～ ¥${job.baseReward.max}`, inline: true },
      { name: 'クールダウン', value: `${job.cooldown}分`, inline: true },
      { name: 'リスクレベル', value: getRiskLevelText(job.riskLevel), inline: true }
    )
    .setColor(0x2ecc71);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// 仕事実行
async function handleWork(interaction, userId) {
  const userJob = await getUserJob(userId);
  if (!userJob || !userJob.currentJob) {
    await interaction.reply({ 
      content: 'まず職業を設定してください。`/job set`を使用してください。', 
      ephemeral: true 
    });
    return;
  }

  const result = await executeWork(userId);
  const job = JOBS[userJob.currentJob];
  const user = await getUser(userId);
  
  if (result.reward > 0) {
    await addPoints(userId, result.reward);
  } else if (result.reward < 0) {
    await subtractPoints(userId, Math.abs(result.reward));
  }

  const embed = new EmbedBuilder()
    .setTitle(`${job.emoji} ${job.name} - 仕事完了`)
    .setColor(result.reward >= 0 ? 0x2ecc71 : 0xe74c3c);

  let description = `**報酬: ¥${result.reward}**\n`;
  description += `基本報酬: ¥${result.baseReward} × ${result.levelMultiplier}倍\n`;
  
  if (result.streakBonus > 0) {
    description += `連続作業ボーナス: +¥${result.streakBonus}\n`;
  }
  
  if (result.eventMessage) {
    description += `\n**イベント:** ${result.eventMessage}\n`;
  }
  
  if (result.levelUpMessage) {
    description += result.levelUpMessage;
  }

  description += `\n現在の連続作業: ${result.newStreak}回\n`;
  description += `所持ポイント: ¥${user.points + result.reward}`;

  embed.setDescription(description);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// 職業ステータス表示
async function handleJobStatus(interaction, userId) {
  const userJob = await getUserJob(userId);
  if (!userJob || !userJob.currentJob) {
    await interaction.reply({ 
      content: '職業が設定されていません。`/job set`で職業を選択してください。', 
      ephemeral: true 
    });
    return;
  }

  const job = JOBS[userJob.currentJob];
  const level = JOB_LEVELS[userJob.jobLevel];
  const nextLevelRequirement = job.levelUpRequirement * userJob.jobLevel;
  const progress = userJob.experience;
  const progressPercent = Math.min(100, Math.floor((progress / nextLevelRequirement) * 100));

  const embed = new EmbedBuilder()
    .setTitle(`${job.emoji} ${job.name} - ステータス`)
    .setColor(0x3498db)
    .addFields(
      { name: '現在のレベル', value: `${level.name} (Lv.${userJob.jobLevel})`, inline: true },
      { name: '経験値', value: `${progress}/${nextLevelRequirement} (${progressPercent}%)`, inline: true },
      { name: '報酬倍率', value: `${level.multiplier}倍`, inline: true },
      { name: '総収入', value: `¥${userJob.totalEarnings}`, inline: true },
      { name: '総作業回数', value: `${userJob.totalWorkCount}回`, inline: true },
      { name: '最高連続', value: `${userJob.maxStreak}回`, inline: true },
      { name: '現在の連続', value: `${userJob.currentStreak}回`, inline: true },
      { name: 'リスクレベル', value: getRiskLevelText(job.riskLevel), inline: true }
    );

  if (userJob.lastWork) {
    const now = Date.now();
    const cooldownMs = job.cooldown * 60 * 1000;
    const remainingTime = Math.ceil((cooldownMs - (now - userJob.lastWork)) / 1000 / 60);
    
    if (remainingTime > 0) {
      embed.addFields({ name: '次回作業まで', value: `${remainingTime}分`, inline: true });
    } else {
      embed.addFields({ name: '作業可能', value: '✅ 今すぐ作業できます', inline: true });
    }
  } else {
    embed.addFields({ name: '作業可能', value: '✅ 今すぐ作業できます', inline: true });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// 職業一覧表示
async function handleJobList(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('職業一覧')
    .setDescription('利用可能な職業とその特徴')
    .setColor(0x9b59b6);

  const jobList = Object.entries(JOBS).map(([key, job]) => {
    const riskEmoji = getRiskEmoji(job.riskLevel);
    return `**${job.emoji} ${job.name}** ${riskEmoji}\n` +
           `報酬: ¥${job.baseReward.min} ～ ¥${job.baseReward.max} | ` +
           `クールダウン: ${job.cooldown}分\n` +
           `${job.description}`;
  }).join('\n\n');

  embed.addFields({ name: '職業詳細', value: jobList, inline: false });
  
  embed.setFooter({ text: 'リスクレベル: 🟢低 🟡中 🔴高 ⚫極高' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// 職業詳細情報
async function handleJobInfo(interaction, jobName) {
  if (!jobName || !JOBS[jobName]) {
    await interaction.reply({ 
      content: '無効な職業名です。`/job list`で利用可能な職業を確認してください。', 
      ephemeral: true 
    });
    return;
  }

  const job = JOBS[jobName];
  const embed = new EmbedBuilder()
    .setTitle(`${job.emoji} ${job.name} - 詳細情報`)
    .setDescription(job.description)
    .setColor(0x3498db)
    .addFields(
      { name: '報酬範囲', value: `¥${job.baseReward.min} ～ ¥${job.baseReward.max}`, inline: true },
      { name: 'クールダウン', value: `${job.cooldown}分`, inline: true },
      { name: 'リスクレベル', value: getRiskLevelText(job.riskLevel), inline: true },
      { name: '昇進必要回数', value: `${job.levelUpRequirement}回/レベル`, inline: true }
    );

  if (job.specialEvents && job.specialEvents.length > 0) {
    const events = job.specialEvents.map(event => {
      const emoji = event.type === 'bonus' ? '🎉' : '⚠️';
      const amount = event.bonus || event.penalty;
      return `${emoji} ${event.message} (${event.type === 'bonus' ? '+' : '-'}¥${amount})`;
    }).join('\n');
    
    embed.addFields({ name: '特殊イベント', value: events, inline: false });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// 職業ランキング
async function handleJobRanking(interaction) {
  const ranking = await getJobRanking(10);
  
  if (ranking.length === 0) {
    await interaction.reply({ 
      content: 'まだ職業データがありません。', 
      ephemeral: true 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('職業ランキング (総収入順)')
    .setColor(0xffd700);

  const rankingText = ranking.map((user, index) => {
    const job = JOBS[user.currentJob];
    const level = JOB_LEVELS[user.jobLevel];
    const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
    
    return `${medal} **${job.emoji} ${job.name}** (${level.name})\n` +
           `総収入: ¥${user.totalEarnings} | 作業回数: ${user.totalWorkCount}回`;
  }).join('\n\n');

  embed.setDescription(rankingText);
  await interaction.reply({ embeds: [embed] });
}

// 職業統計
async function handleJobStats(interaction) {
  const stats = await getJobStats();
  
  if (stats.length === 0) {
    await interaction.reply({ 
      content: 'まだ職業データがありません。', 
      ephemeral: true 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('職業統計')
    .setColor(0x9b59b6);

  const statsText = stats.map(stat => {
    const job = JOBS[stat.currentJob];
    return `**${job.emoji} ${job.name}**\n` +
           `プレイヤー数: ${stat.playerCount}人 | ` +
           `平均収入: ¥${Math.floor(stat.avgEarnings)} | ` +
           `平均レベル: ${stat.avgLevel.toFixed(1)} | ` +
           `総作業回数: ${stat.totalWorkCount}回`;
  }).join('\n\n');

  embed.setDescription(statsText);
  await interaction.reply({ embeds: [embed] });
}

// ヘルパー関数
function getRiskLevelText(riskLevel) {
  const riskTexts = {
    'low': '🟢 低',
    'medium': '🟡 中',
    'high': '🔴 高',
    'extreme': '⚫ 極高'
  };
  return riskTexts[riskLevel] || '不明';
}

function getRiskEmoji(riskLevel) {
  const riskEmojis = {
    'low': '🟢',
    'medium': '🟡',
    'high': '🔴',
    'extreme': '⚫'
  };
  return riskEmojis[riskLevel] || '❓';
}

// 仕事実行関数（職業システム用）
async function executeWork(userId) {
  const userJob = await getUserJob(userId);
  if (!userJob || !userJob.currentJob) {
    throw new Error('職業が設定されていません');
  }

  const job = JOBS[userJob.currentJob];
  const now = Date.now();
  
  const cooldownMs = job.cooldown * 60 * 1000;
  if (userJob.lastWork && (now - userJob.lastWork) < cooldownMs) {
    const remainingTime = Math.ceil((cooldownMs - (now - userJob.lastWork)) / 1000 / 60);
    throw new Error(`まだ仕事ができません。次回まで: ${remainingTime}分`);
  }

  const baseReward = Math.floor(Math.random() * (job.baseReward.max - job.baseReward.min + 1)) + job.baseReward.min;
  const levelMultiplier = JOB_LEVELS[userJob.jobLevel]?.multiplier || 1.0;
  let finalReward = Math.floor(baseReward * levelMultiplier);

  let eventMessage = '';
  if (Math.random() < 0.3) {
    const event = job.specialEvents[Math.floor(Math.random() * job.specialEvents.length)];
    eventMessage = event.message;
    
    if (event.type === 'bonus') {
      finalReward += event.bonus;
    } else if (event.type === 'penalty') {
      finalReward -= event.penalty;
    }
  }

  let streakBonus = 0;
  if (userJob.currentStreak >= 5) {
    streakBonus = Math.floor(finalReward * 0.1);
    finalReward += streakBonus;
  }

  const newStreak = userJob.currentStreak + 1;
  const newExperience = userJob.experience + 1;
  const newTotalEarnings = userJob.totalEarnings + Math.max(0, finalReward);
  const newWorkCount = userJob.totalWorkCount + 1;
  const newMaxStreak = Math.max(userJob.maxStreak, newStreak);

  // データベース更新は別途実装が必要
  // await dbRun(`UPDATE user_jobs SET ...`);

  let levelUpMessage = '';
  if (newExperience >= job.levelUpRequirement * userJob.jobLevel && userJob.jobLevel < 5) {
    const newLevel = userJob.jobLevel + 1;
    levelUpMessage = `\n🎉 レベルアップ！ ${JOB_LEVELS[newLevel].name}になりました！`;
  }

  return {
    reward: finalReward,
    baseReward,
    levelMultiplier,
    streakBonus,
    eventMessage,
    levelUpMessage,
    newStreak,
    newLevel: userJob.jobLevel
  };
}

// サイコロコマンドハンドラー
export async function handleDiceCommand(interaction) {
  const count = interaction.options.getInteger('count');
  
  try {
    // サイコロを振る
    const results = [];
    let total = 0;
    
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * 6) + 1; // 1-6のランダム
      results.push(roll);
      total += roll;
    }
    
    // 結果を表示用に整形
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const diceDisplay = results.map(roll => diceEmojis[roll - 1]).join(' ');
    
    // 結果メッセージを作成
    let description = `**結果:** ${diceDisplay}\n`;
    description += `**数値:** ${results.join(', ')}`;
    
    const embed = new EmbedBuilder()
      .setTitle('🎲 サイコロ結果')
      .setDescription(description)
      .setColor(0x3498db)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('サイコロコマンドエラー:', error);
    await interaction.reply({ 
      content: `エラーが発生しました: ${error.message}`, 
      ephemeral: true 
    });
  }
}

// 銀行コマンドハンドラー
export async function handleBankCommand(interaction) {
  const action = interaction.options.getString('action') || 'balance';
  const amount = interaction.options.getInteger('amount');
  const userId = interaction.user.id;

  try {
    switch (action) {
      case 'balance':
        await handleBankBalance(interaction, userId);
        break;
      case 'deposit':
        await handleBankDeposit(interaction, userId, amount);
        break;
      case 'withdraw':
        await handleBankWithdraw(interaction, userId, amount);
        break;
      case 'history':
        await handleBankHistory(interaction, userId);
        break;
      default:
        await interaction.reply({ content: '無効な操作です。', ephemeral: true });
    }
  } catch (error) {
    console.error('銀行コマンドエラー:', error);
    await interaction.reply({ 
      content: `エラーが発生しました: ${error.message}`, 
      ephemeral: true 
    });
  }
}

// 銀行残高表示
async function handleBankBalance(interaction, userId) {
  const account = await getBankAccount(userId);
  const user = await getUser(userId);
  
  const embed = new EmbedBuilder()
    .setTitle('🏦 銀行メニュー')
    .setDescription('お金の管理を行うことができます。')
    .setColor(0x2ecc71)
    .addFields(
      { 
        name: '💰 所持金', 
        value: `🏦 ¥${user.points.toLocaleString()}`, 
        inline: false 
      },
      { 
        name: '🏦 預金額', 
        value: `🏦 ¥${account.balance.toLocaleString()}`, 
        inline: false 
      }
    )
    .setTimestamp();

  // ボタンを作成
  const depositButton = new ButtonBuilder()
    .setCustomId(`bank_deposit_${userId}`)
    .setLabel('預け入れ')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('📥');

  const withdrawButton = new ButtonBuilder()
    .setCustomId(`bank_withdraw_${userId}`)
    .setLabel('引き出し')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('📤');

  const transferButton = new ButtonBuilder()
    .setCustomId(`bank_transfer_${userId}`)
    .setLabel('送金')
    .setStyle(ButtonStyle.Success)
    .setEmoji('💸');

  const row = new ActionRowBuilder()
    .addComponents(depositButton, withdrawButton, transferButton);

  await interaction.reply({ 
    embeds: [embed], 
    components: [row] 
  });
}

// 銀行預金
async function handleBankDeposit(interaction, userId, amount) {
  if (!amount) {
    await interaction.reply({ 
      content: '預金額を指定してください。例: `/bank deposit amount:1000`', 
      ephemeral: true 
    });
    return;
  }

  const account = await depositToBank(userId, amount);
  const user = await getUser(userId);
  
  const embed = new EmbedBuilder()
    .setTitle('💰 預金完了')
    .setDescription(`¥${amount} を銀行に預金しました`)
    .setColor(0x2ecc71)
    .addFields(
      { name: '預金額', value: `¥${amount}`, inline: true },
      { name: '銀行残高', value: `¥${account.balance}`, inline: true },
      { name: '所持ポイント', value: `¥${user.points}`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// 銀行引き出し
async function handleBankWithdraw(interaction, userId, amount) {
  if (!amount) {
    await interaction.reply({ 
      content: '引き出し額を指定してください。例: `/bank withdraw amount:1000`', 
      ephemeral: true 
    });
    return;
  }

  const account = await withdrawFromBank(userId, amount);
  const user = await getUser(userId);
  
  const embed = new EmbedBuilder()
    .setTitle('💸 引き出し完了')
    .setDescription(`¥${amount} を銀行から引き出しました`)
    .setColor(0xe74c3c)
    .addFields(
      { name: '引き出し額', value: `¥${amount}`, inline: true },
      { name: '銀行残高', value: `¥${account.balance}`, inline: true },
      { name: '所持ポイント', value: `¥${user.points}`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// 銀行取引履歴
async function handleBankHistory(interaction, userId) {
  const transactions = await getBankTransactionHistory(userId, 10);
  
  if (transactions.length === 0) {
    await interaction.reply({ 
      content: '取引履歴がありません。', 
      ephemeral: true 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('📋 銀行取引履歴')
    .setColor(0x3498db);

  const historyText = transactions.map(transaction => {
    const date = new Date(transaction.createdAt * 1000).toLocaleString('ja-JP');
    const typeEmoji = transaction.transactionType === 'deposit' ? '💰' : '💸';
    const typeText = transaction.transactionType === 'deposit' ? '預金' : '引き出し';
    
    return `${typeEmoji} **${typeText}** ¥${transaction.amount}\n` +
           `残高: ¥${transaction.balanceAfter} | ${date}`;
  }).join('\n\n');

  embed.setDescription(historyText);
  embed.setFooter({ text: '最新10件の取引履歴' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// 銀行ボタンインタラクションハンドラー
export async function handleBankButtonInteraction(interaction) {
  const customId = interaction.customId;
  
  if (!customId.startsWith('bank_')) return false;
  
  const userId = customId.split('_')[2];
  
  // 本人以外は操作できないようにする
  if (interaction.user.id !== userId) {
    await interaction.reply({ 
      content: 'あなたの銀行アカウントではありません。', 
      ephemeral: true 
    });
    return true;
  }
  
  try {
    if (customId.startsWith('bank_deposit_')) {
      await handleBankDepositModal(interaction);
    } else if (customId.startsWith('bank_withdraw_')) {
      await handleBankWithdrawModal(interaction);
    } else if (customId.startsWith('bank_transfer_')) {
      await handleBankTransferModal(interaction);
    }
  } catch (error) {
    console.error('銀行ボタンエラー:', error);
    
    // インタラクションが既に応答済みかチェック
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({ 
          content: `エラーが発生しました: ${error.message}`, 
          ephemeral: true 
        });
      } catch (replyError) {
        console.error('エラーレスポンス送信失敗:', replyError);
      }
    }
  }
  
  return true;
}

// 預金モーダル表示
async function handleBankDepositModal(interaction) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');
  
  const modal = new ModalBuilder()
    .setCustomId('bank_deposit_modal')
    .setTitle('預け入れ');

  const amountInput = new TextInputBuilder()
    .setCustomId('deposit_amount')
    .setLabel('預金額を入力してください')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例: 1000')
    .setRequired(true)
    .setMaxLength(10);

  const firstActionRow = new ActionRowBuilder().addComponents(amountInput);
  modal.addComponents(firstActionRow);

  try {
    await interaction.showModal(modal);
  } catch (error) {
    console.error('預金モーダル表示エラー:', error);
    throw error; // 上位のエラーハンドラーに委ねる
  }
}

// 引き出しモーダル表示
async function handleBankWithdrawModal(interaction) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');
  
  const modal = new ModalBuilder()
    .setCustomId('bank_withdraw_modal')
    .setTitle('引き出し');

  const amountInput = new TextInputBuilder()
    .setCustomId('withdraw_amount')
    .setLabel('引き出し額を入力してください')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例: 500')
    .setRequired(true)
    .setMaxLength(10);

  const firstActionRow = new ActionRowBuilder().addComponents(amountInput);
  modal.addComponents(firstActionRow);

  try {
    await interaction.showModal(modal);
  } catch (error) {
    console.error('引き出しモーダル表示エラー:', error);
    throw error; // 上位のエラーハンドラーに委ねる
  }
}

// 送金モーダル表示
async function handleBankTransferModal(interaction) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');
  
  const modal = new ModalBuilder()
    .setCustomId('bank_transfer_modal')
    .setTitle('送金');

  const userInput = new TextInputBuilder()
    .setCustomId('transfer_user')
    .setLabel('送金先のユーザーID')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例: 123456789012345678')
    .setRequired(true)
    .setMaxLength(20);

  const amountInput = new TextInputBuilder()
    .setCustomId('transfer_amount')
    .setLabel('送金額を入力してください')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例: 1000')
    .setRequired(true)
    .setMaxLength(10);

  const firstActionRow = new ActionRowBuilder().addComponents(userInput);
  const secondActionRow = new ActionRowBuilder().addComponents(amountInput);
  modal.addComponents(firstActionRow, secondActionRow);

  try {
    await interaction.showModal(modal);
  } catch (error) {
    console.error('送金モーダル表示エラー:', error);
    throw error; // 上位のエラーハンドラーに委ねる
  }
}

// コイン投げコマンドハンドラー
export async function handleCoinCommand(interaction) {
  const betAmount = interaction.options.getInteger('bet');
  const selectedSide = interaction.options.getString('side');
  const userId = interaction.user.id;

  try {
    const user = await getUser(userId);
    
    // ポイント不足チェック
    if (user.points < betAmount) {
      await interaction.reply({ 
        content: `ポイントが不足しています。所持ポイント: ¥${user.points}`, 
        ephemeral: true 
      });
      return;
    }

    // コイン投げの結果をランダムに生成（50%ずつ）
    const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
    const isWin = coinResult === selectedSide;
    
    // ポイントの増減処理
    if (isWin) {
      // 当たり: ベット額を引いてから2倍を付与（実質+ベット額）
      await subtractPoints(userId, betAmount);
      await addPoints(userId, betAmount * 2);
    } else {
      // 外れ: ベット額を減算
      await subtractPoints(userId, betAmount);
    }

    // 結果表示用の絵文字とテキスト
    const coinEmoji = coinResult === 'heads' ? '🪙' : '💿';
    const sideText = coinResult === 'heads' ? '表' : '裏';
    const selectedText = selectedSide === 'heads' ? '表' : '裏';
    
    // 結果メッセージ
    const resultText = isWin ? '🎉 当たり！' : '💸 外れ...';
    const color = isWin ? 0x2ecc71 : 0xe74c3c;
    const changeText = isWin ? `+¥${betAmount}` : `-¥${betAmount}`;
    
    // 更新後のユーザー情報を取得
    const updatedUser = await getUser(userId);
    
    const embed = new EmbedBuilder()
      .setTitle(`${coinEmoji} コイン投げ結果`)
      .setDescription(`${coinEmoji} **${sideText}** が出ました！`)
      .setColor(color)
      .addFields(
        { name: 'あなたの予想', value: selectedText, inline: true },
        { name: '結果', value: sideText, inline: true },
        { name: 'ベット額', value: `¥${betAmount}`, inline: true },
        { name: '結果', value: resultText, inline: true },
        { name: '変動', value: changeText, inline: true },
        { name: '残高', value: `¥${updatedUser.points}`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('コイン投げコマンドエラー:', error);
    await interaction.reply({ 
      content: `エラーが発生しました: ${error.message}`, 
      ephemeral: true 
    });
  }
}

// ======== Adminコマンドハンドラー ========

// Admin権限チェック
async function checkAdminPermission(interaction) {
  const userId = interaction.user.id;
  const hasPermission = await isAdmin(userId);
  
  if (!hasPermission) {
    await interaction.reply({ 
      content: '❌ このコマンドを実行する権限がありません。', 
      ephemeral: true 
    });
    return false;
  }
  return true;
}

// Adminコマンドメインハンドラー
export async function handleAdminCommand(interaction) {
  // 権限チェック
  if (!(await checkAdminPermission(interaction))) return;
  
  const action = interaction.options.getString('action');
  const targetUser = interaction.options.getUser('user');
  const itemName = interaction.options.getString('item');
  const amount = interaction.options.getInteger('amount');
  const jobName = interaction.options.getString('job');
  const type = interaction.options.getString('type');
  const message = interaction.options.getString('message');
  const cooldown = interaction.options.getString('cooldown');
  
  try {
    switch (action) {
      // ユーザー管理系
      case 'userinfo':
        await handleAdminUserInfo(interaction, targetUser);
        break;
      case 'setpoints':
        await handleAdminSetPoints(interaction, targetUser, amount);
        break;
      case 'addpoints':
        await handleAdminAddPoints(interaction, targetUser, amount);
        break;
      case 'removepoints':
        await handleAdminRemovePoints(interaction, targetUser, amount);
        break;
      case 'resetuser':
        await handleAdminResetUser(interaction, targetUser);
        break;
      
      // アイテム管理系
      case 'additem':
        await handleAdminAddItem(interaction, targetUser, itemName, amount);
        break;
      case 'removeitem':
        await handleAdminRemoveItem(interaction, targetUser, itemName, amount);
        break;
      case 'itemlist':
        await handleAdminItemList(interaction, targetUser);
        break;
      case 'giveall':
        await handleAdminGiveAll(interaction, itemName, amount);
        break;
      
      // システム管理系
      case 'stats':
        await handleAdminStats(interaction);
        break;
      case 'logs':
        await handleAdminLogs(interaction, type);
        break;
      case 'maintenance':
        await handleAdminMaintenance(interaction, type);
        break;
      case 'broadcast':
        await handleAdminBroadcast(interaction, message);
        break;
      
      // ゲーム管理系
      case 'endgames':
        await handleAdminEndGames(interaction, targetUser);
        break;
      case 'setjob':
        await handleAdminSetJob(interaction, targetUser, jobName);
        break;
      case 'resetjob':
        await handleAdminResetJob(interaction, targetUser);
        break;
      case 'setcooldown':
        await handleAdminSetCooldown(interaction, targetUser, cooldown);
        break;
      
      // 経済管理系
      case 'economy':
        await handleAdminEconomy(interaction, type, amount);
        break;
      case 'shop':
        await handleAdminShop(interaction, type, itemName, amount);
        break;
      
      // 権限管理系
      case 'admin':
        await handleAdminAddAdmin(interaction, targetUser);
        break;
      case 'removeadmin':
        await handleAdminRemoveAdmin(interaction, targetUser);
        break;
      case 'adminlist':
        await handleAdminList(interaction);
        break;
      case 'blacklist':
        await handleAdminBlacklist(interaction, targetUser, type);
        break;
      
      default:
        await interaction.reply({ 
          content: '❌ 無効な操作です。', 
          ephemeral: true 
        });
    }
  } catch (error) {
    console.error('Adminコマンドエラー:', error);
    await interaction.reply({ 
      content: `❌ エラーが発生しました: ${error.message}`, 
      ephemeral: true 
    });
  }
}

// ======== ユーザー管理系ハンドラー ========

async function handleAdminUserInfo(interaction, targetUser) {
  if (!targetUser) {
    await interaction.reply({ 
      content: '❌ 対象ユーザーを指定してください。', 
      ephemeral: true 
    });
    return;
  }
  
  const user = await getUser(targetUser.id);
  const items = await getItems(targetUser.id);
  const userJob = await getUserJob(targetUser.id);
  const bankAccount = await getBankAccount(targetUser.id);
  
  const embed = new EmbedBuilder()
    .setTitle(`👤 ${targetUser.username} の情報`)
    .setColor(0x3498db)
    .addFields(
      { name: '💰 所持ポイント', value: `¥${user.points.toLocaleString()}`, inline: true },
      { name: '🎰 ガチャ回数', value: `${user.rolls}回`, inline: true },
      { name: '🍃 リーフ', value: `${user.leaves}個`, inline: true },
      { name: '🏦 銀行残高', value: `¥${bankAccount.balance.toLocaleString()}`, inline: true },
      { name: '💼 職業', value: userJob?.currentJob ? `${JOBS[userJob.currentJob]?.emoji} ${JOBS[userJob.currentJob]?.name}` : 'なし', inline: true },
      { name: '📦 所持アイテム数', value: `${items.length}種類`, inline: true }
    );
  
  if (items.length > 0) {
    const itemList = items.slice(0, 10).map(item => 
      `**${item.itemName}** x${item.quantity}`
    ).join('\n');
    embed.addFields({ 
      name: '📦 所持アイテム（上位10個）', 
      value: itemList, 
      inline: false 
    });
  }
  
  await logAdminAction(interaction.user.id, 'userinfo', targetUser.id, 'ユーザー情報を表示');
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminSetPoints(interaction, targetUser, amount) {
  if (!targetUser || !amount) {
    await interaction.reply({ 
      content: '❌ 対象ユーザーと金額を指定してください。', 
      ephemeral: true 
    });
    return;
  }
  
  const oldUser = await getUser(targetUser.id);
  await dbRun(`UPDATE users SET points = ? WHERE id = ?`, amount, targetUser.id);
  
  const embed = new EmbedBuilder()
    .setTitle('💰 ポイント設定完了')
    .setDescription(`${targetUser.username} のポイントを設定しました`)
    .setColor(0x2ecc71)
    .addFields(
      { name: '変更前', value: `¥${oldUser.points.toLocaleString()}`, inline: true },
      { name: '変更後', value: `¥${amount.toLocaleString()}`, inline: true }
    );
  
  await logAdminAction(interaction.user.id, 'setpoints', targetUser.id, `ポイントを${amount}に設定`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminAddPoints(interaction, targetUser, amount) {
  if (!targetUser || !amount) {
    await interaction.reply({ 
      content: '❌ 対象ユーザーと金額を指定してください。', 
      ephemeral: true 
    });
    return;
  }
  
  const oldUser = await getUser(targetUser.id);
  await addPoints(targetUser.id, amount);
  const newUser = await getUser(targetUser.id);
  
  const embed = new EmbedBuilder()
    .setTitle('💰 ポイント追加完了')
    .setDescription(`${targetUser.username} にポイントを追加しました`)
    .setColor(0x2ecc71)
    .addFields(
      { name: '追加額', value: `¥${amount.toLocaleString()}`, inline: true },
      { name: '変更前', value: `¥${oldUser.points.toLocaleString()}`, inline: true },
      { name: '変更後', value: `¥${newUser.points.toLocaleString()}`, inline: true }
    );
  
  await logAdminAction(interaction.user.id, 'addpoints', targetUser.id, `ポイント${amount}を追加`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminRemovePoints(interaction, targetUser, amount) {
  if (!targetUser || !amount) {
    await interaction.reply({ 
      content: '❌ 対象ユーザーと金額を指定してください。', 
      ephemeral: true 
    });
    return;
  }
  
  const oldUser = await getUser(targetUser.id);
  await subtractPoints(targetUser.id, amount);
  const newUser = await getUser(targetUser.id);
  
  const embed = new EmbedBuilder()
    .setTitle('💰 ポイント削除完了')
    .setDescription(`${targetUser.username} からポイントを削除しました`)
    .setColor(0xe74c3c)
    .addFields(
      { name: '削除額', value: `¥${amount.toLocaleString()}`, inline: true },
      { name: '変更前', value: `¥${oldUser.points.toLocaleString()}`, inline: true },
      { name: '変更後', value: `¥${newUser.points.toLocaleString()}`, inline: true }
    );
  
  await logAdminAction(interaction.user.id, 'removepoints', targetUser.id, `ポイント${amount}を削除`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminResetUser(interaction, targetUser) {
  if (!targetUser) {
    await interaction.reply({ 
      content: '❌ 対象ユーザーを指定してください。', 
      ephemeral: true 
    });
    return;
  }
  
  await resetUserData(targetUser.id);
  
  const embed = new EmbedBuilder()
    .setTitle('🔄 ユーザーデータリセット完了')
    .setDescription(`${targetUser.username} のデータをリセットしました`)
    .setColor(0xe74c3c)
    .addFields(
      { name: 'リセット内容', value: 'ポイント、アイテム、職業、取引履歴、銀行データ等すべて', inline: false }
    );
  
  await logAdminAction(interaction.user.id, 'resetuser', targetUser.id, 'ユーザーデータをリセット');
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ======== アイテム管理系ハンドラー ========

async function handleAdminAddItem(interaction, targetUser, itemName, quantity) {
  if (!targetUser || !itemName || !quantity) {
    await interaction.reply({ 
      content: '❌ 対象ユーザー、アイテム名、数量を指定してください。', 
      ephemeral: true 
    });
    return;
  }
  
  await addItem(targetUser.id, itemName, quantity);
  
  const embed = new EmbedBuilder()
    .setTitle('📦 アイテム付与完了')
    .setDescription(`${targetUser.username} にアイテムを付与しました`)
    .setColor(0x2ecc71)
    .addFields(
      { name: 'アイテム', value: itemName, inline: true },
      { name: '数量', value: `${quantity}個`, inline: true }
    );
  
  await logAdminAction(interaction.user.id, 'additem', targetUser.id, `${itemName} x${quantity}を付与`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminRemoveItem(interaction, targetUser, itemName, quantity) {
  if (!targetUser || !itemName || !quantity) {
    await interaction.reply({ 
      content: '❌ 対象ユーザー、アイテム名、数量を指定してください。', 
      ephemeral: true 
    });
    return;
  }
  
  await removeItem(targetUser.id, itemName, quantity);
  
  const embed = new EmbedBuilder()
    .setTitle('📦 アイテム削除完了')
    .setDescription(`${targetUser.username} からアイテムを削除しました`)
    .setColor(0xe74c3c)
    .addFields(
      { name: 'アイテム', value: itemName, inline: true },
      { name: '数量', value: `${quantity}個`, inline: true }
    );
  
  await logAdminAction(interaction.user.id, 'removeitem', targetUser.id, `${itemName} x${quantity}を削除`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminItemList(interaction, targetUser) {
  if (!targetUser) {
    await interaction.reply({ 
      content: '❌ 対象ユーザーを指定してください。', 
      ephemeral: true 
    });
    return;
  }
  
  const items = await getItems(targetUser.id);
  
  if (items.length === 0) {
    await interaction.reply({ 
      content: `${targetUser.username} はアイテムを所持していません。`, 
      ephemeral: true 
    });
    return;
  }
  
  const embed = new EmbedBuilder()
    .setTitle(`📦 ${targetUser.username} のアイテム一覧`)
    .setColor(0x3498db);
  
  const itemList = items.map(item => 
    `**${item.itemName}** x${item.quantity}`
  ).join('\n');
  
  embed.setDescription(itemList);
  
  await logAdminAction(interaction.user.id, 'itemlist', targetUser.id, 'アイテム一覧を表示');
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminGiveAll(interaction, itemName, quantity) {
  if (!itemName || !quantity) {
    await interaction.reply({ 
      content: '❌ アイテム名と数量を指定してください。', 
      ephemeral: true 
    });
    return;
  }
  
  const userCount = await giveItemToAll(itemName, quantity);
  
  const embed = new EmbedBuilder()
    .setTitle('📦 全員配布完了')
    .setDescription(`全ユーザーにアイテムを配布しました`)
    .setColor(0x2ecc71)
    .addFields(
      { name: 'アイテム', value: itemName, inline: true },
      { name: '数量', value: `${quantity}個`, inline: true },
      { name: '配布対象', value: `${userCount}人`, inline: true }
    );
  
  await logAdminAction(interaction.user.id, 'giveall', 'all', `${itemName} x${quantity}を全員に配布`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ======== システム管理系ハンドラー ========

async function handleAdminStats(interaction) {
  const stats = await getUserStats();
  
  const embed = new EmbedBuilder()
    .setTitle('📊 システム統計')
    .setColor(0x9b59b6)
    .addFields(
      { name: '👥 総ユーザー数', value: `${stats.totalUsers}人`, inline: true },
      { name: '💰 総ポイント', value: `¥${stats.totalPoints.toLocaleString()}`, inline: true },
      { name: '📦 総アイテム数', value: `${stats.totalItems}個`, inline: true },
      { name: '🔄 総取引数', value: `${stats.totalTrades}件`, inline: true },
      { name: '🏛️ 総オークション数', value: `${stats.totalAuctions}件`, inline: true }
    );
  
  await logAdminAction(interaction.user.id, 'stats', 'system', 'システム統計を表示');
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminLogs(interaction, type) {
  const logs = await getAdminLogs(20);
  
  if (logs.length === 0) {
    await interaction.reply({ 
      content: 'ログがありません。', 
      ephemeral: true 
    });
    return;
  }
  
  const embed = new EmbedBuilder()
    .setTitle('📋 管理者ログ')
    .setColor(0x3498db);
  
  const logList = logs.map(log => {
    const date = new Date(log.timestamp * 1000).toLocaleString('ja-JP');
    return `**${log.action}** - ${log.target}\n${log.details} (${date})`;
  }).join('\n\n');
  
  embed.setDescription(logList);
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminMaintenance(interaction, type) {
  // メンテナンスモードの実装は環境変数やグローバル変数で管理
  const embed = new EmbedBuilder()
    .setTitle('🔧 メンテナンスモード')
    .setDescription(`メンテナンスモードを${type === 'on' ? '有効' : '無効'}にしました`)
    .setColor(type === 'on' ? 0xe74c3c : 0x2ecc71);
  
  await logAdminAction(interaction.user.id, 'maintenance', 'system', `メンテナンスモード${type}`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminBroadcast(interaction, message) {
  if (!message) {
    await interaction.reply({ 
      content: '❌ メッセージを指定してください。', 
      ephemeral: true 
    });
    return;
  }
  
  // ブロードキャスト機能の実装（全チャンネルに送信）
  const embed = new EmbedBuilder()
    .setTitle('📢 管理者からのお知らせ')
    .setDescription(message)
    .setColor(0xff6b6b)
    .setTimestamp();
  
  await logAdminAction(interaction.user.id, 'broadcast', 'all', message);
  await interaction.reply({ 
    content: '📢 ブロードキャストメッセージを送信しました。', 
    ephemeral: true 
  });
}

// ======== ゲーム管理系ハンドラー ========

async function handleAdminEndGames(interaction, targetUser) {
  if (targetUser) {
    await forceEndUserGames(targetUser.id);
    const embed = new EmbedBuilder()
      .setTitle('🎮 ゲーム強制終了完了')
      .setDescription(`${targetUser.username} のゲームを強制終了しました`)
      .setColor(0xe74c3c);
    
    await logAdminAction(interaction.user.id, 'endgames', targetUser.id, 'ユーザーのゲームを強制終了');
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else {
    await forceEndAllGames();
    const embed = new EmbedBuilder()
      .setTitle('🎮 全ゲーム強制終了完了')
      .setDescription('すべてのアクティブゲームを強制終了しました')
      .setColor(0xe74c3c);
    
    await logAdminAction(interaction.user.id, 'endgames', 'all', '全ゲームを強制終了');
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleAdminSetJob(interaction, targetUser, jobName) {
  if (!targetUser || !jobName) {
    await interaction.reply({ 
      content: '❌ 対象ユーザーと職業名を指定してください。', 
      ephemeral: true 
    });
    return;
  }
  
  await setUserJob(targetUser.id, jobName);
  const job = JOBS[jobName];
  
  const embed = new EmbedBuilder()
    .setTitle('💼 職業設定完了')
    .setDescription(`${targetUser.username} の職業を設定しました`)
    .setColor(0x2ecc71)
    .addFields(
      { name: '職業', value: `${job.emoji} ${job.name}`, inline: true }
    );
  
  await logAdminAction(interaction.user.id, 'setjob', targetUser.id, `職業を${job.name}に設定`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminResetJob(interaction, targetUser) {
  if (!targetUser) {
    await interaction.reply({ 
      content: '❌ 対象ユーザーを指定してください。', 
      ephemeral: true 
    });
    return;
  }
  
  await dbRun(`DELETE FROM user_jobs WHERE userId = ?`, targetUser.id);
  
  const embed = new EmbedBuilder()
    .setTitle('💼 職業リセット完了')
    .setDescription(`${targetUser.username} の職業データをリセットしました`)
    .setColor(0xe74c3c);
  
  await logAdminAction(interaction.user.id, 'resetjob', targetUser.id, '職業データをリセット');
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminSetCooldown(interaction, targetUser, cooldown) {
  // クールダウン設定の実装（必要に応じて）
  const embed = new EmbedBuilder()
    .setTitle('⏰ クールダウン設定')
    .setDescription('クールダウン設定機能は実装予定です')
    .setColor(0xf39c12);
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ======== 経済管理系ハンドラー ========

async function handleAdminEconomy(interaction, type, amount) {
  if (!type) {
    await interaction.reply({ 
      content: '❌ 操作タイプを指定してください。', 
      ephemeral: true 
    });
    return;
  }
  
  let embed;
  
  switch (type) {
    case 'reset':
      await resetAllPoints();
      embed = new EmbedBuilder()
        .setTitle('💰 経済リセット完了')
        .setDescription('全ユーザーのポイントをリセットしました')
        .setColor(0xe74c3c);
      await logAdminAction(interaction.user.id, 'economy', 'all', '全ポイントをリセット');
      break;
      
    case 'multiply':
      if (!amount) {
        await interaction.reply({ 
          content: '❌ 倍率を指定してください。', 
          ephemeral: true 
        });
        return;
      }
      await multiplyAllPoints(amount);
      embed = new EmbedBuilder()
        .setTitle('💰 ポイント倍率変更完了')
        .setDescription(`全ユーザーのポイントを${amount}倍にしました`)
        .setColor(0x2ecc71);
      await logAdminAction(interaction.user.id, 'economy', 'all', `ポイントを${amount}倍に変更`);
      break;
      
    case 'tax':
      if (!amount) {
        await interaction.reply({ 
          content: '❌ 税率を指定してください。', 
          ephemeral: true 
        });
        return;
      }
      await taxAllUsers(amount);
      embed = new EmbedBuilder()
        .setTitle('💰 課税完了')
        .setDescription(`全ユーザーに${amount}%の課税を実施しました`)
        .setColor(0xe74c3c);
      await logAdminAction(interaction.user.id, 'economy', 'all', `${amount}%の課税を実施`);
      break;
      
    default:
      await interaction.reply({ 
        content: '❌ 無効な操作タイプです。', 
        ephemeral: true 
      });
      return;
  }
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminShop(interaction, type, itemName, amount) {
  // ショップ管理機能の実装（必要に応じて）
  const embed = new EmbedBuilder()
    .setTitle('🏪 ショップ管理')
    .setDescription('ショップ管理機能は実装予定です')
    .setColor(0xf39c12);
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ======== 権限管理系ハンドラー ========

async function handleAdminAddAdmin(interaction, targetUser) {
  if (!targetUser) {
    await interaction.reply({ 
      content: '❌ 対象ユーザーを指定してください。', 
      ephemeral: true 
    });
    return;
  }
  
  await addAdmin(targetUser.id, interaction.user.id);
  
  const embed = new EmbedBuilder()
    .setTitle('👑 管理者追加完了')
    .setDescription(`${targetUser.username} を管理者に追加しました`)
    .setColor(0x2ecc71);
  
  await logAdminAction(interaction.user.id, 'addadmin', targetUser.id, '管理者に追加');
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminRemoveAdmin(interaction, targetUser) {
  if (!targetUser) {
    await interaction.reply({ 
      content: '❌ 対象ユーザーを指定してください。', 
      ephemeral: true 
    });
    return;
  }
  
  await removeAdmin(targetUser.id);
  
  const embed = new EmbedBuilder()
    .setTitle('👑 管理者削除完了')
    .setDescription(`${targetUser.username} を管理者から削除しました`)
    .setColor(0xe74c3c);
  
  await logAdminAction(interaction.user.id, 'removeadmin', targetUser.id, '管理者から削除');
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminList(interaction) {
  const admins = await getAdmins();
  
  if (admins.length === 0) {
    await interaction.reply({ 
      content: '管理者が登録されていません。', 
      ephemeral: true 
    });
    return;
  }
  
  const embed = new EmbedBuilder()
    .setTitle('👑 管理者一覧')
    .setColor(0x9b59b6);
  
  const adminList = admins.map(admin => {
    const date = new Date(admin.addedAt * 1000).toLocaleString('ja-JP');
    return `<@${admin.userId}> - ${admin.permissions} (${date})`;
  }).join('\n');
  
  embed.setDescription(adminList);
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminBlacklist(interaction, targetUser, type) {
  // ブラックリスト機能の実装（必要に応じて）
  const embed = new EmbedBuilder()
    .setTitle('🚫 ブラックリスト管理')
    .setDescription('ブラックリスト機能は実装予定です')
    .setColor(0xf39c12);
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// 統計情報コマンドハンドラー
export async function handleStatsCommand(interaction) {
  const type = interaction.options.getString('type') || 'all';
  
  try {
    switch (type) {
      case 'server':
        await handleServerStats(interaction);
        break;
      case 'bot':
        await handleBotStats(interaction);
        break;
      case 'user':
        await handleUserStats(interaction);
        break;
      case 'all':
      default:
        await handleAllStats(interaction);
        break;
    }
  } catch (error) {
    console.error('統計情報取得エラー:', error);
    await interaction.reply({
      content: '❌ 統計情報の取得中にエラーが発生しました。',
      ephemeral: true
    });
  }
}

// サーバー統計
async function handleServerStats(interaction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({
      content: '❌ このコマンドはサーバー内でのみ使用できます。',
      ephemeral: true
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('📊 サーバー統計情報')
    .setColor(0x3498db)
    .addFields(
      {
        name: '🏰 サーバー情報',
        value: `**名前:** ${guild.name}\n**ID:** ${guild.id}\n**作成日:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
        inline: true
      },
      {
        name: '👥 メンバー情報',
        value: `**総メンバー数:** ${guild.memberCount}\n**ボット数:** ${guild.members.cache.filter(m => m.user.bot).size}\n**人間:** ${guild.members.cache.filter(m => !m.user.bot).size}`,
        inline: true
      },
      {
        name: '📺 チャンネル情報',
        value: `**総チャンネル数:** ${guild.channels.cache.size}\n**テキスト:** ${guild.channels.cache.filter(c => c.type === 0).size}\n**ボイス:** ${guild.channels.cache.filter(c => c.type === 2).size}`,
        inline: true
      },
      {
        name: '🎭 ロール情報',
        value: `**総ロール数:** ${guild.roles.cache.size}\n**管理者:** ${guild.members.cache.filter(m => m.permissions.has('Administrator')).size}`,
        inline: true
      },
      {
        name: '📈 アクティビティ',
        value: `**オンライン:** ${guild.members.cache.filter(m => m.presence?.status === 'online').size}\n**退席中:** ${guild.members.cache.filter(m => m.presence?.status === 'away').size}\n**オフライン:** ${guild.members.cache.filter(m => m.presence?.status === 'offline').size}`,
        inline: true
      }
    )
    .setThumbnail(guild.iconURL())
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// ボット統計
async function handleBotStats(interaction) {
  const client = interaction.client;
  const uptime = client.uptime;
  
  const embed = new EmbedBuilder()
    .setTitle('🤖 ボット統計情報')
    .setColor(0x9b59b6)
    .addFields(
      {
        name: '⚡ 稼働状況',
        value: `**稼働時間:** ${formatUptime(uptime)}\n**準備完了時刻:** <t:${Math.floor(client.readyTimestamp / 1000)}:F>\n**Ping:** ${client.ws.ping}ms`,
        inline: true
      },
      {
        name: '🌐 接続情報',
        value: `**参加サーバー数:** ${client.guilds.cache.size}\n**総チャンネル数:** ${client.channels.cache.size}\n**キャッシュユーザー数:** ${client.users.cache.size}`,
        inline: true
      },
      {
        name: '📊 メモリ使用量',
        value: `**使用メモリ:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n**総メモリ:** ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        inline: true
      }
    )
    .setThumbnail(client.user.displayAvatarURL())
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// ユーザー統計
async function handleUserStats(interaction) {
  const userId = interaction.user.id;
  const guildId = interaction.guild?.id;
  
  // データベースからユーザー統計を取得
  const user = await getUser(userId, guildId);
  const items = await getItems(userId, guildId);
  
  const embed = new EmbedBuilder()
    .setTitle('👤 ユーザー統計情報')
    .setColor(0xe74c3c)
    .addFields(
      {
        name: '💰 経済状況',
        value: `**所持金:** ${(user.points || 0).toLocaleString()}円\n**リーフ:** ${user.leaves || 0}枚\n**銀行預金:** ${(user.bankBalance || 0).toLocaleString()}円`,
        inline: true
      },
      {
        name: '🎰 ガチャ統計',
        value: `**総ガチャ回数:** ${user.totalRolls || 0}回\n**ノーマルガチャ:** ${user.normalRolls || 0}回\n**リーフガチャ:** ${user.leafRolls || 0}回`,
        inline: true
      },
      {
        name: '💼 職業情報',
        value: `**現在の職業:** ${user.currentJob || 'なし'}\n**職業レベル:** ${user.jobLevel || 1}\n**仕事回数:** ${user.workCount || 0}回`,
        inline: true
      },
      {
        name: '📦 アイテム情報',
        value: `**所持アイテム数:** ${items.length}種類\n**総アイテム数:** ${items.reduce((sum, item) => sum + item.quantity, 0)}個`,
        inline: true
      }
    )
    .setThumbnail(interaction.user.displayAvatarURL())
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// 全体統計
async function handleAllStats(interaction) {
  const guild = interaction.guild;
  const client = interaction.client;
  
  if (!guild) {
    await interaction.reply({
      content: '❌ このコマンドはサーバー内でのみ使用できます。',
      ephemeral: true
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('📊 全体統計情報')
    .setColor(0x2ecc71)
    .addFields(
      {
        name: '🏰 サーバー情報',
        value: `**名前:** ${guild.name}\n**メンバー数:** ${guild.memberCount}\n**チャンネル数:** ${guild.channels.cache.size}`,
        inline: true
      },
      {
        name: '🤖 ボット情報',
        value: `**稼働時間:** ${formatUptime(client.uptime)}\n**Ping:** ${client.ws.ping}ms\n**参加サーバー数:** ${client.guilds.cache.size}`,
        inline: true
      },
      {
        name: '👤 あなたの情報',
        value: `**ユーザー名:** ${interaction.user.username}\n**ID:** ${interaction.user.id}\n**参加日:** <t:${Math.floor(interaction.member.joinedTimestamp / 1000)}:F>`,
        inline: true
      }
    )
    .setThumbnail(guild.iconURL())
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// 稼働時間をフォーマット
function formatUptime(uptime) {
  const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
  
  return `${days}日 ${hours}時間 ${minutes}分 ${seconds}秒`;
}
