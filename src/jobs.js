// 職業システム専用ファイル
import { 
  getUserJob, 
  setUserJob, 
  canChangeJob, 
  getJobRanking, 
  getJobStats,
  dbRun
} from './database.js';
import { getUser, addPoints, subtractPoints } from './database.js';
import { JOBS, JOB_LEVELS } from './config.js';

// 職業システムの初期化
export async function initializeJobs() {
  // ユーザーの職業情報テーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS user_jobs (
      userId TEXT PRIMARY KEY,
      currentJob TEXT,
      jobLevel INTEGER DEFAULT 1,
      experience INTEGER DEFAULT 0,
      lastWork INTEGER,
      lastJobChange INTEGER,
      totalEarnings INTEGER DEFAULT 0,
      totalWorkCount INTEGER DEFAULT 0,
      currentStreak INTEGER DEFAULT 0,
      maxStreak INTEGER DEFAULT 0
    )
  `);

  // 職業履歴テーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS job_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      jobName TEXT,
      startDate INTEGER,
      endDate INTEGER,
      totalEarnings INTEGER,
      workCount INTEGER
    )
  `);

  // ランダムイベント履歴（デバッグ用）
  await dbRun(`
    CREATE TABLE IF NOT EXISTS job_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      jobName TEXT,
      eventType TEXT,
      eventMessage TEXT,
      bonusAmount INTEGER,
      timestamp INTEGER
    )
  `);
}

// 仕事実行
export async function executeWork(userId) {
  const userJob = await getUserJob(userId);
  if (!userJob || !userJob.currentJob) {
    throw new Error('職業が設定されていません');
  }

  const job = JOBS[userJob.currentJob];
  const now = Date.now();
  
  // クールダウンチェック
  const cooldownMs = job.cooldown * 60 * 1000;
  if (userJob.lastWork && (now - userJob.lastWork) < cooldownMs) {
    const remainingTime = Math.ceil((cooldownMs - (now - userJob.lastWork)) / 1000 / 60);
    throw new Error(`まだ仕事ができません。次回まで: ${remainingTime}分`);
  }

  // 報酬計算
  const baseReward = Math.floor(Math.random() * (job.baseReward.max - job.baseReward.min + 1)) + job.baseReward.min;
  const levelMultiplier = JOB_LEVELS[userJob.jobLevel]?.multiplier || 1.0;
  let finalReward = Math.floor(baseReward * levelMultiplier);

  // ランダムイベント
  let eventMessage = '';
  if (Math.random() < 0.3) { // 30%の確率でイベント発生
    const event = job.specialEvents[Math.floor(Math.random() * job.specialEvents.length)];
    eventMessage = event.message;
    
    if (event.type === 'bonus') {
      finalReward += event.bonus;
    } else if (event.type === 'penalty') {
      finalReward -= event.penalty;
    }

    // イベント履歴を記録
    await dbRun(`
      INSERT INTO job_events (userId, jobName, eventType, eventMessage, bonusAmount, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `, userId, userJob.currentJob, event.type, event.message, event.bonus || -event.penalty, now);
  }

  // 連続作業ボーナス
  let streakBonus = 0;
  if (userJob.currentStreak >= 5) {
    streakBonus = Math.floor(finalReward * 0.1); // 10%ボーナス
    finalReward += streakBonus;
  }

  // データベース更新
  const newStreak = userJob.currentStreak + 1;
  const newExperience = userJob.experience + 1;
  const newTotalEarnings = userJob.totalEarnings + Math.max(0, finalReward);
  const newWorkCount = userJob.totalWorkCount + 1;
  const newMaxStreak = Math.max(userJob.maxStreak, newStreak);

  await dbRun(`
    UPDATE user_jobs 
    SET lastWork = ?, experience = ?, totalEarnings = ?, totalWorkCount = ?, currentStreak = ?, maxStreak = ?
    WHERE userId = ?
  `, now, newExperience, newTotalEarnings, newWorkCount, newStreak, newMaxStreak, userId);

  // レベルアップチェック
  let levelUpMessage = '';
  if (newExperience >= job.levelUpRequirement * userJob.jobLevel && userJob.jobLevel < 5) {
    const newLevel = userJob.jobLevel + 1;
    await dbRun(`UPDATE user_jobs SET jobLevel = ? WHERE userId = ?`, newLevel, userId);
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
