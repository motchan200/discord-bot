// 自動ステータス更新機能
import { ActivityType } from 'discord.js';

// ステータス表示の種類
const STATUS_TYPES = [
  'server',
  'bot',
  'user',
  'command',
  'uptime',
  'memory',
  'ping'
];

// 現在のステータスインデックス
let currentStatusIndex = 0;

// ステータス更新間隔（ミリ秒）
const UPDATE_INTERVAL = 30000; // 30秒

// ステータス更新タイマー
let statusUpdateTimer = null;

/**
 * サーバー統計ステータスを生成
 */
function generateServerStatus(client) {
  const guildCount = client.guilds.cache.size;
  const totalMembers = client.guilds.cache.reduce((sum, guild) => sum + guild.memberCount, 0);
  const totalChannels = client.channels.cache.size;
  
  return [
    {
      name: `${guildCount}サーバー`,
      type: ActivityType.Playing
    },
    {
      name: `${totalMembers.toLocaleString()}人のメンバー`,
      type: ActivityType.Watching
    },
    {
      name: `${totalChannels}チャンネル`,
      type: ActivityType.Watching
    }
  ];
}

/**
 * ボット統計ステータスを生成
 */
function generateBotStatus(client) {
  const uptime = formatUptime(client.uptime);
  const ping = client.ws.ping;
  const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  
  return [
    {
      name: `稼働時間: ${uptime}`,
      type: ActivityType.Playing
    },
    {
      name: `Ping: ${ping}ms`,
      type: ActivityType.Playing
    },
    {
      name: `メモリ: ${memory}MB`,
      type: ActivityType.Playing
    }
  ];
}

/**
 * ユーザー統計ステータスを生成
 */
function generateUserStatus(client) {
  const totalUsers = client.users.cache.size;
  const onlineUsers = client.guilds.cache.reduce((sum, guild) => {
    return sum + guild.members.cache.filter(member => member.presence?.status === 'online').size;
  }, 0);
  
  return [
    {
      name: `${totalUsers.toLocaleString()}ユーザー`,
      type: ActivityType.Watching
    },
    {
      name: `${onlineUsers}人がオンライン`,
      type: ActivityType.Watching
    }
  ];
}

/**
 * コマンド統計ステータスを生成
 */
function generateCommandStatus(client) {
  const commands = [
    '/roll - ガチャを回す',
    '/work - 仕事をする',
    '/daily - デイリーボーナス',
    '/blackjack - ブラックジャック',
    '/slot - スロットマシン',
    '/trade - アイテム取引',
    '/auction - オークション',
    '/stats - 統計情報'
  ];
  
  return commands.map(command => ({
    name: command,
    type: ActivityType.Playing
  }));
}

/**
 * 稼働時間ステータスを生成
 */
function generateUptimeStatus(client) {
  const uptime = formatUptime(client.uptime);
  const readyTime = new Date(client.readyTimestamp).toLocaleString('ja-JP');
  
  return [
    {
      name: `稼働中: ${uptime}`,
      type: ActivityType.Playing
    },
    {
      name: `起動時刻: ${readyTime}`,
      type: ActivityType.Playing
    }
  ];
}

/**
 * メモリ使用量ステータスを生成
 */
function generateMemoryStatus(client) {
  const memoryUsage = process.memoryUsage();
  const heapUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotal = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const rss = Math.round(memoryUsage.rss / 1024 / 1024);
  
  return [
    {
      name: `メモリ: ${heapUsed}MB/${heapTotal}MB`,
      type: ActivityType.Playing
    },
    {
      name: `RSS: ${rss}MB`,
      type: ActivityType.Playing
    }
  ];
}

/**
 * Ping統計ステータスを生成
 */
function generatePingStatus(client) {
  const ping = client.ws.ping;
  const shardId = client.shard?.ids?.[0] || 0;
  
  return [
    {
      name: `Ping: ${ping}ms`,
      type: ActivityType.Playing
    },
    {
      name: `Shard: ${shardId}`,
      type: ActivityType.Playing
    }
  ];
}

/**
 * 稼働時間をフォーマット
 */
function formatUptime(uptime) {
  const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}日${hours}時間`;
  } else if (hours > 0) {
    return `${hours}時間${minutes}分`;
  } else {
    return `${minutes}分`;
  }
}

/**
 * ステータスを更新
 */
export async function updateBotStatus(client) {
  try {
    const statusType = STATUS_TYPES[currentStatusIndex];
    let statuses = [];
    
    switch (statusType) {
      case 'server':
        statuses = generateServerStatus(client);
        break;
      case 'bot':
        statuses = generateBotStatus(client);
        break;
      case 'user':
        statuses = generateUserStatus(client);
        break;
      case 'command':
        statuses = generateCommandStatus(client);
        break;
      case 'uptime':
        statuses = generateUptimeStatus(client);
        break;
      case 'memory':
        statuses = generateMemoryStatus(client);
        break;
      case 'ping':
        statuses = generatePingStatus(client);
        break;
      default:
        statuses = generateServerStatus(client);
    }
    
    // ランダムにステータスを選択
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    await client.user.setPresence({
      activities: [{
        name: randomStatus.name,
        type: randomStatus.type
      }],
      status: 'online'
    });
    
    console.log(`📊 ステータス更新: ${randomStatus.name}`);
    
    // 次のステータスタイプに移動
    currentStatusIndex = (currentStatusIndex + 1) % STATUS_TYPES.length;
    
  } catch (error) {
    console.error('❌ ステータス更新エラー:', error);
  }
}

/**
 * 自動ステータス更新を開始
 */
export function startStatusUpdater(client) {
  if (statusUpdateTimer) {
    clearInterval(statusUpdateTimer);
  }
  
  // 初回更新
  updateBotStatus(client);
  
  // 定期的な更新
  statusUpdateTimer = setInterval(() => {
    updateBotStatus(client);
  }, UPDATE_INTERVAL);
  
  console.log('✅ 自動ステータス更新を開始しました');
}

/**
 * 自動ステータス更新を停止
 */
export function stopStatusUpdater() {
  if (statusUpdateTimer) {
    clearInterval(statusUpdateTimer);
    statusUpdateTimer = null;
    console.log('⏹️ 自動ステータス更新を停止しました');
  }
}

/**
 * ステータス更新間隔を変更
 */
export function setStatusUpdateInterval(interval) {
  UPDATE_INTERVAL = interval;
  
  if (statusUpdateTimer) {
    stopStatusUpdater();
    startStatusUpdater(client);
  }
}

/**
 * カスタムステータスを追加
 */
export function addCustomStatus(name, type = ActivityType.Playing) {
  STATUS_TYPES.push('custom');
  // カスタムステータスの実装（必要に応じて）
}

/**
 * 現在のステータス情報を取得
 */
export function getCurrentStatusInfo(client) {
  return {
    currentType: STATUS_TYPES[currentStatusIndex],
    updateInterval: UPDATE_INTERVAL,
    isRunning: statusUpdateTimer !== null,
    uptime: formatUptime(client.uptime),
    ping: client.ws.ping,
    guildCount: client.guilds.cache.size,
    userCount: client.users.cache.size
  };
}
