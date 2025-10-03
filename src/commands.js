// 統合されたコマンド定義とハンドラー
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
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
  getAuction
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
  new SlashCommandBuilder().setName('roll').setDescription('ガチャを回す').addIntegerOption(opt => opt.setName('count').setDescription('連荘回数（1-10）').setRequired(false).setMinValue(1).setMaxValue(10)),
  new SlashCommandBuilder().setName('items').setDescription('所持アイテムを表示'),
  new SlashCommandBuilder().setName('status').setDescription('ポイントとガチャ回数を表示'),
  new SlashCommandBuilder().setName('ranking').setDescription('ポイント・ガチャ回数ランキング'),
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
  
  // ゲームコマンド
  new SlashCommandBuilder().setName('guess').setDescription('数字当てゲーム（リーフ賭け）')
    .addIntegerOption(opt => opt.setName('bet').setDescription('賭けるリーフ数（1リーフ以上）').setRequired(true).setMinValue(1))
    .addIntegerOption(opt => opt.setName('number').setDescription('予想する数字（1-3）').setRequired(true).setMinValue(1).setMaxValue(3))
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
