// 統合されたデータベース操作ファイル
import Database from 'better-sqlite3';

const db = new Database('../bott.db');

// データベース初期化
export async function dbRun(sql, ...params) {
  return db.prepare(sql).run(...params);
}

export async function dbGet(sql, ...params) {
  return db.prepare(sql).get(...params);
}

export async function dbAll(sql, ...params) {
  return db.prepare(sql).all(...params);
}

// テーブル初期化
export async function initializeDatabase() {
  // ユーザーテーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      points INTEGER DEFAULT 0,
      rolls INTEGER DEFAULT 0,
      leaves INTEGER DEFAULT 0
    )
  `);

  // アイテムテーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      itemName TEXT,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (userId) REFERENCES users (id)
    )
  `);

  // エフェクトテーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS effects (
      userId TEXT PRIMARY KEY,
      lucky INTEGER DEFAULT 0,
      booster INTEGER DEFAULT 0,
      booster_until INTEGER DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users (id)
    )
  `);

  // 管理者テーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS admins (
      userId TEXT PRIMARY KEY,
      permissions TEXT DEFAULT 'all',
      addedAt INTEGER DEFAULT (strftime('%s', 'now')),
      addedBy TEXT,
      FOREIGN KEY (userId) REFERENCES users (id)
    )
  `);

  // ログテーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adminId TEXT,
      action TEXT,
      target TEXT,
      details TEXT,
      timestamp INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (adminId) REFERENCES users (id)
    )
  `);

  // 初期管理者を追加
  const initialAdmins = ['934136683002232874', '1144238510006620160'];
  for (const adminId of initialAdmins) {
    await dbRun(`
      INSERT OR IGNORE INTO admins (userId, permissions, addedBy, addedAt)
      VALUES (?, 'all', 'system', strftime('%s', 'now'))
    `, adminId);
  }

  // デイリーボーナステーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS daily (
      userId TEXT PRIMARY KEY,
      last INTEGER
    )
  `);

  // ワークボーナステーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS work_bonus (
      userId TEXT PRIMARY KEY,
      last INTEGER
    )
  `);

  // デイリークエストテーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS daily_quest (
      userId TEXT,
      questId INTEGER,
      date TEXT,
      completed INTEGER DEFAULT 0,
      PRIMARY KEY (userId, questId, date)
    )
  `);

  // ユーザー職業テーブル
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

  // ランダムイベント履歴テーブル
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

  // 取引テーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sellerId TEXT,
      itemName TEXT,
      quantity INTEGER,
      price INTEGER,
      status TEXT DEFAULT 'active',
      buyerId TEXT,
      createdAt INTEGER DEFAULT (strftime('%s', 'now')),
      completedAt INTEGER
    )
  `);

  // 取引履歴テーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS trade_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sellerId TEXT,
      buyerId TEXT,
      itemName TEXT,
      quantity INTEGER,
      price INTEGER,
      tradeType TEXT,
      createdAt INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // オークションテーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS auctions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sellerId TEXT,
      itemName TEXT,
      quantity INTEGER,
      startingPrice INTEGER,
      currentBid INTEGER DEFAULT 0,
      currentBidder TEXT,
      endTime INTEGER,
      status TEXT DEFAULT 'active',
      createdAt INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // ゲーム履歴テーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS baccarat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      betAmount INTEGER,
      betType TEXT,
      playerHand TEXT,
      bankerHand TEXT,
      playerValue INTEGER,
      bankerValue INTEGER,
      result TEXT,
      winnings INTEGER,
      createdAt INTEGER
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS blackjack_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      betAmount INTEGER,
      playerHand TEXT,
      dealerHand TEXT,
      playerValue INTEGER,
      dealerValue INTEGER,
      result TEXT,
      winnings INTEGER,
      createdAt INTEGER
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS sicbo_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      betAmount INTEGER,
      betType TEXT,
      dice1 INTEGER,
      dice2 INTEGER,
      dice3 INTEGER,
      total INTEGER,
      result TEXT,
      winnings INTEGER,
      createdAt INTEGER
    )
  `);

  // 銀行テーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      userId TEXT PRIMARY KEY,
      balance INTEGER DEFAULT 0,
      createdAt INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (userId) REFERENCES users (id)
    )
  `);

  // 銀行取引履歴テーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      transactionType TEXT,
      amount INTEGER,
      balanceAfter INTEGER,
      createdAt INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (userId) REFERENCES users (id)
    )
  `);
}

// ユーザー関連関数
export async function getUser(userId) {
  let user = await dbGet(`SELECT * FROM users WHERE id = ?`, userId);
  if (!user) {
    await dbRun(`INSERT INTO users (id, points, rolls, leaves) VALUES (?, 0, 0, 0)`, userId);
    user = { id: userId, points: 0, rolls: 0, leaves: 0 };
  }
  return user;
}

export async function addPoints(userId, amount) {
  await getUser(userId);
  await dbRun(`UPDATE users SET points = points + ? WHERE id = ?`, amount, userId);
}

export async function subtractPoints(userId, amount) {
  await getUser(userId);
  await dbRun(`UPDATE users SET points = points - ? WHERE id = ?`, amount, userId);
}

export async function updateGachaStats(userId, points, rolls) {
  await dbRun(`UPDATE users SET points = points - ?, rolls = rolls + ? WHERE id = ?`, points, rolls, userId);
}

export async function addLeaves(userId, amount) {
  await getUser(userId);
  await dbRun(`UPDATE users SET leaves = leaves + ? WHERE id = ?`, amount, userId);
}

export async function subtractLeaves(userId, amount) {
  const user = await getUser(userId);
  
  if ((user.leaves || 0) < amount) {
    throw new Error(`リーフが足りません。所持リーフ: ${user.leaves || 0}, 必要リーフ: ${amount}`);
  }
  
  await dbRun(`UPDATE users SET leaves = leaves - ? WHERE id = ?`, amount, userId);
}

export async function getTopUsers() {
  const users = await dbAll(`SELECT id, points, rolls, leaves FROM users ORDER BY points DESC, rolls DESC`);
  return users || [];
}

export async function getTopLeavesUsers() {
  const users = await dbAll(`SELECT id, leaves FROM users ORDER BY leaves DESC`);
  return users || [];
}

// アイテム関連関数
export async function addItem(userId, itemName, amount = 1) {
  const existing = await dbGet(`SELECT quantity FROM items WHERE userId = ? AND itemName = ?`, userId, itemName);
  if (existing) {
    await dbRun(`UPDATE items SET quantity = quantity + ? WHERE userId = ? AND itemName = ?`, amount, userId, itemName);
  } else {
    await dbRun(`INSERT INTO items (userId, itemName, quantity) VALUES (?, ?, ?)`, userId, itemName, amount);
  }
}

export async function getItems(userId) {
  const items = await dbAll(`SELECT itemName, quantity FROM items WHERE userId = ?`, userId);
  return items || [];
}

export async function updateItemQuantity(userId, itemName, amount) {
  await dbRun(`UPDATE items SET quantity = quantity - ? WHERE userId = ? AND itemName = ?`, amount, userId, itemName);
}

export async function removeItem(userId, itemName, amount = 1) {
  const existing = await dbGet(`SELECT quantity FROM items WHERE userId = ? AND itemName = ?`, userId, itemName);
  if (!existing || existing.quantity < amount) {
    return false;
  }
  
  if (existing.quantity === amount) {
    await dbRun(`DELETE FROM items WHERE userId = ? AND itemName = ?`, userId, itemName);
  } else {
    await dbRun(`UPDATE items SET quantity = quantity - ? WHERE userId = ? AND itemName = ?`, amount, userId, itemName);
  }
  return true;
}

// エフェクト関連関数
export async function getEffect(userId) {
  return await dbGet(`SELECT * FROM effects WHERE userId = ?`, userId) || null;
}

export async function addLucky(userId, amount) {
  const effect = await getEffect(userId);
  if (effect) {
    await dbRun(`UPDATE effects SET lucky = lucky + ? WHERE userId = ?`, amount, userId);
  } else {
    await dbRun(`INSERT INTO effects (userId, lucky, booster, booster_until) VALUES (?, ?, 0, 0)`, userId, amount);
  }
}

export async function consumeLucky(userId) {
  await dbRun(`UPDATE effects SET lucky = lucky - 1 WHERE userId = ?`, userId);
}

export async function setBooster(userId, lucky = 0, booster = 0, booster_until = 0) {
  const effect = await getEffect(userId);
  if (effect) {
    await dbRun(`UPDATE effects SET lucky = ?, booster = ?, booster_until = ? WHERE userId = ?`, lucky, booster, booster_until, userId);
  } else {
    await dbRun(`INSERT INTO effects (userId, lucky, booster, booster_until) VALUES (?, ?, ?, ?)`, userId, lucky, booster, booster_until);
  }
}

// デイリーボーナス関連関数
export async function getDailyBonus(userId) {
  await dbRun(`CREATE TABLE IF NOT EXISTS daily (userId TEXT PRIMARY KEY, last INTEGER)`);
  const last = await dbGet(`SELECT last FROM daily WHERE userId = ?`, userId);
  return last;
}

export async function setDailyBonus(userId, timestamp) {
  await dbRun(`INSERT OR REPLACE INTO daily (userId, last) VALUES (?, ?)`, userId, timestamp);
}

export async function getWorkBonus(userId) {
  await dbRun(`CREATE TABLE IF NOT EXISTS work_bonus (userId TEXT PRIMARY KEY, last INTEGER)`);
  const last = await dbGet(`SELECT last FROM work_bonus WHERE userId = ?`, userId);
  return last;
}

export async function setWorkBonus(userId, timestamp) {
  await dbRun(`INSERT OR REPLACE INTO work_bonus (userId, last) VALUES (?, ?)`, userId, timestamp);
}

// デイリークエスト関連関数
export async function getQuestProgress(userId, questId, date) {
  return await dbGet(`SELECT * FROM daily_quest WHERE userId = ? AND questId = ? AND date = ?`, userId, questId, date);
}

export async function markQuestCompleted(userId, questId, date) {
  await dbRun(`UPDATE daily_quest SET completed = 1 WHERE userId = ? AND questId = ? AND date = ?`, userId, questId, date);
}

// 職業関連関数
export async function getUserJob(userId) {
  await dbRun(`CREATE TABLE IF NOT EXISTS user_jobs (userId TEXT PRIMARY KEY, currentJob TEXT, jobLevel INTEGER DEFAULT 1, experience INTEGER DEFAULT 0, lastWork INTEGER, lastJobChange INTEGER, totalEarnings INTEGER DEFAULT 0, totalWorkCount INTEGER DEFAULT 0, currentStreak INTEGER DEFAULT 0, maxStreak INTEGER DEFAULT 0)`);
  return await dbGet(`SELECT * FROM user_jobs WHERE userId = ?`, userId);
}

export async function setUserJob(userId, jobName) {
  const now = Date.now();
  await dbRun(`
    INSERT OR REPLACE INTO user_jobs 
    (userId, currentJob, jobLevel, experience, lastWork, lastJobChange, totalEarnings, totalWorkCount, currentStreak, maxStreak) 
    VALUES (?, ?, 1, 0, 0, ?, 0, 0, 0, 0)
  `, userId, jobName, now);
}

export async function canChangeJob(userId) {
  const userJob = await getUserJob(userId);
  if (!userJob || !userJob.lastJobChange) return true;
  
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  return (now - userJob.lastJobChange) >= oneDay;
}

export async function getJobRanking(limit = 10) {
  return await dbAll(`
    SELECT userId, currentJob, totalEarnings, totalWorkCount, maxStreak, jobLevel
    FROM user_jobs 
    WHERE currentJob IS NOT NULL 
    ORDER BY totalEarnings DESC 
    LIMIT ?
  `, limit);
}

export async function getJobStats() {
  const stats = await dbAll(`
    SELECT 
      currentJob,
      COUNT(*) as playerCount,
      AVG(totalEarnings) as avgEarnings,
      AVG(jobLevel) as avgLevel,
      SUM(totalWorkCount) as totalWorkCount
    FROM user_jobs 
    WHERE currentJob IS NOT NULL 
    GROUP BY currentJob
  `);
  
  return stats;
}

// 取引関連関数
export async function createTrade(sellerId, itemName, quantity, price) {
  const sellerItems = await getItems(sellerId);
  const sellerItem = sellerItems.find(item => item.itemName === itemName);
  
  if (!sellerItem || sellerItem.quantity < quantity) {
    throw new Error('アイテムが不足しています');
  }

  const result = await dbRun(`
    INSERT INTO trades (sellerId, itemName, quantity, price) 
    VALUES (?, ?, ?, ?)
  `, sellerId, itemName, quantity, price);

  return result.lastID;
}

export async function buyTrade(tradeId, buyerId) {
  const trade = await dbGet(`SELECT * FROM trades WHERE id = ? AND status = 'active'`, tradeId);
  
  if (!trade) {
    throw new Error('取引が見つかりません');
  }

  if (trade.sellerId === buyerId) {
    throw new Error('自分の取引は購入できません');
  }

  const buyer = await getUser(buyerId);
  if (buyer.points < trade.price) {
    throw new Error('ポイントが不足しています');
  }

  const sellerItems = await getItems(trade.sellerId);
  const sellerItem = sellerItems.find(item => item.itemName === trade.itemName);
  
  if (!sellerItem || sellerItem.quantity < trade.quantity) {
    throw new Error('売り手のアイテムが不足しています');
  }

  await dbRun(`BEGIN TRANSACTION`);
  
  try {
    await updateItemQuantity(trade.sellerId, trade.itemName, trade.quantity);
    await addItem(buyerId, trade.itemName, trade.quantity);
    await addPoints(trade.sellerId, trade.price);
    await dbRun(`UPDATE users SET points = points - ? WHERE id = ?`, trade.price, buyerId);
    
    await dbRun(`
      UPDATE trades 
      SET status = 'completed', buyerId = ?, completedAt = strftime('%s', 'now')
      WHERE id = ?
    `, buyerId, tradeId);
    
    await dbRun(`
      INSERT INTO trade_history (sellerId, buyerId, itemName, quantity, price, tradeType)
      VALUES (?, ?, ?, ?, ?, 'trade')
    `, trade.sellerId, buyerId, trade.itemName, trade.quantity, trade.price);
    
    await dbRun(`COMMIT`);
    
    return trade;
  } catch (error) {
    await dbRun(`ROLLBACK`);
    throw error;
  }
}

export async function cancelTrade(tradeId, userId) {
  const trade = await dbGet(`SELECT * FROM trades WHERE id = ? AND status = 'active'`, tradeId);
  
  if (!trade) {
    throw new Error('取引が見つかりません');
  }

  if (trade.sellerId !== userId) {
    throw new Error('自分の取引のみキャンセルできます');
  }

  await dbRun(`UPDATE trades SET status = 'cancelled' WHERE id = ?`, tradeId);
}

export async function getActiveTrades(limit = 20, offset = 0) {
  const trades = await dbAll(`
    SELECT t.*, u.points as sellerPoints
    FROM trades t
    LEFT JOIN users u ON t.sellerId = u.id
    WHERE t.status = 'active'
    ORDER BY t.createdAt DESC
    LIMIT ? OFFSET ?
  `, limit, offset);
  
  return trades || [];
}

export async function getUserTradeHistory(userId, limit = 20, offset = 0) {
  const trades = await dbAll(`
    SELECT * FROM trade_history
    WHERE sellerId = ? OR buyerId = ?
    ORDER BY createdAt DESC
    LIMIT ? OFFSET ?
  `, userId, userId, limit, offset);
  
  return trades || [];
}

export async function getTrade(tradeId) {
  return await dbGet(`SELECT * FROM trades WHERE id = ?`, tradeId);
}

// オークション関連関数
export async function createAuction(sellerId, itemName, quantity, startingPrice, durationHours = 24) {
  const sellerItems = await getItems(sellerId);
  const sellerItem = sellerItems.find(item => item.itemName === itemName);
  
  if (!sellerItem || sellerItem.quantity < quantity) {
    throw new Error('アイテムが不足しています');
  }

  if (startingPrice < 1) {
    throw new Error('開始価格は1ポイント以上である必要があります');
  }

  const endTime = Math.floor(Date.now() / 1000) + (durationHours * 3600);

  const result = await dbRun(`
    INSERT INTO auctions (sellerId, itemName, quantity, startingPrice, endTime) 
    VALUES (?, ?, ?, ?, ?)
  `, sellerId, itemName, quantity, startingPrice, endTime);

  return result.lastID;
}

export async function placeBid(auctionId, bidderId, bidAmount) {
  const auction = await dbGet(`SELECT * FROM auctions WHERE id = ? AND status = 'active'`, auctionId);
  
  if (!auction) {
    throw new Error('オークションが見つかりません');
  }

  if (auction.sellerId === bidderId) {
    throw new Error('自分のオークションには入札できません');
  }

  const now = Math.floor(Date.now() / 1000);
  if (now >= auction.endTime) {
    throw new Error('オークションは終了しています');
  }

  if (bidAmount <= auction.currentBid) {
    throw new Error('現在の入札額より高い金額で入札してください');
  }

  const bidder = await getUser(bidderId);
  if (bidder.points < bidAmount) {
    throw new Error('ポイントが不足しています');
  }

  if (auction.currentBidder) {
    await addPoints(auction.currentBidder, auction.currentBid);
  }

  await dbRun(`
    UPDATE auctions 
    SET currentBid = ?, currentBidder = ?
    WHERE id = ?
  `, bidAmount, bidderId, auctionId);

  await dbRun(`UPDATE users SET points = points - ? WHERE id = ?`, bidAmount, bidderId);

  return auction;
}

export async function endAuction(auctionId) {
  const auction = await dbGet(`SELECT * FROM auctions WHERE id = ? AND status = 'active'`, auctionId);
  
  if (!auction) {
    throw new Error('オークションが見つかりません');
  }

  await dbRun(`BEGIN TRANSACTION`);
  
  try {
    if (auction.currentBidder) {
      const sellerItems = await getItems(auction.sellerId);
      const sellerItem = sellerItems.find(item => item.itemName === auction.itemName);
      
      if (sellerItem && sellerItem.quantity >= auction.quantity) {
        await updateItemQuantity(auction.sellerId, auction.itemName, auction.quantity);
        await addItem(auction.currentBidder, auction.itemName, auction.quantity);
        await addPoints(auction.sellerId, auction.currentBid);
        
        await dbRun(`
          INSERT INTO trade_history (sellerId, buyerId, itemName, quantity, price, tradeType)
          VALUES (?, ?, ?, ?, ?, 'auction')
        `, auction.sellerId, auction.currentBidder, auction.itemName, auction.quantity, auction.currentBid);
        
        await dbRun(`UPDATE auctions SET status = 'completed' WHERE id = ?`, auctionId);
      } else {
        await addPoints(auction.currentBidder, auction.currentBid);
        await dbRun(`UPDATE auctions SET status = 'cancelled' WHERE id = ?`, auctionId);
      }
    } else {
      await dbRun(`UPDATE auctions SET status = 'cancelled' WHERE id = ?`, auctionId);
    }
    
    await dbRun(`COMMIT`);
    
    return auction;
  } catch (error) {
    await dbRun(`ROLLBACK`);
    throw error;
  }
}

export async function processExpiredAuctions() {
  const now = Math.floor(Date.now() / 1000);
  const expiredAuctions = await dbAll(`
    SELECT * FROM auctions 
    WHERE status = 'active' AND endTime <= ?
  `, now);
  
  for (const auction of expiredAuctions) {
    try {
      await endAuction(auction.id);
    } catch (error) {
      console.error(`オークション ${auction.id} の終了処理でエラー:`, error);
    }
  }
  
  return expiredAuctions.length;
}

export async function getActiveAuctions(limit = 20, offset = 0) {
  const auctions = await dbAll(`
    SELECT a.*, u.points as sellerPoints
    FROM auctions a
    LEFT JOIN users u ON a.sellerId = u.id
    WHERE a.status = 'active'
    ORDER BY a.endTime ASC
    LIMIT ? OFFSET ?
  `, limit, offset);
  
  return auctions || [];
}

export async function getUserAuctionHistory(userId, limit = 20, offset = 0) {
  const auctions = await dbAll(`
    SELECT * FROM auctions
    WHERE sellerId = ? OR currentBidder = ?
    ORDER BY createdAt DESC
    LIMIT ? OFFSET ?
  `, userId, userId, limit, offset);
  
  return auctions || [];
}

export async function getAuction(auctionId) {
  return await dbGet(`SELECT * FROM auctions WHERE id = ?`, auctionId);
}

// 銀行関連関数
export async function getBankAccount(userId) {
  let account = await dbGet(`SELECT * FROM bank_accounts WHERE userId = ?`, userId);
  if (!account) {
    await dbRun(`INSERT INTO bank_accounts (userId, balance) VALUES (?, 0)`, userId);
    account = { userId, balance: 0, createdAt: Date.now() };
  }
  return account;
}

export async function depositToBank(userId, amount) {
  const user = await getUser(userId);
  if (user.points < amount) {
    throw new Error(`ポイントが足りません。所持ポイント: ${user.points}, 預金額: ${amount}`);
  }

  await dbRun(`BEGIN TRANSACTION`);
  
  try {
    await subtractPoints(userId, amount);
    await dbRun(`UPDATE bank_accounts SET balance = balance + ? WHERE userId = ?`, amount, userId);
    
    const account = await getBankAccount(userId);
    await dbRun(`
      INSERT INTO bank_transactions (userId, transactionType, amount, balanceAfter)
      VALUES (?, 'deposit', ?, ?)
    `, userId, amount, account.balance);
    
    await dbRun(`COMMIT`);
    return account;
  } catch (error) {
    await dbRun(`ROLLBACK`);
    throw error;
  }
}

export async function withdrawFromBank(userId, amount) {
  const account = await getBankAccount(userId);
  if (account.balance < amount) {
    throw new Error(`銀行残高が足りません。残高: ${account.balance}, 引き出し額: ${amount}`);
  }

  await dbRun(`BEGIN TRANSACTION`);
  
  try {
    await addPoints(userId, amount);
    await dbRun(`UPDATE bank_accounts SET balance = balance - ? WHERE userId = ?`, amount, userId);
    
    const updatedAccount = await getBankAccount(userId);
    await dbRun(`
      INSERT INTO bank_transactions (userId, transactionType, amount, balanceAfter)
      VALUES (?, 'withdraw', ?, ?)
    `, userId, amount, updatedAccount.balance);
    
    await dbRun(`COMMIT`);
    return updatedAccount;
  } catch (error) {
    await dbRun(`ROLLBACK`);
    throw error;
  }
}

export async function getBankTransactionHistory(userId, limit = 10) {
  const transactions = await dbAll(`
    SELECT * FROM bank_transactions
    WHERE userId = ?
    ORDER BY createdAt DESC
    LIMIT ?
  `, userId, limit);
  
  return transactions || [];
}

// ======== Admin権限管理関数 ========

// 管理者権限チェック
export async function isAdmin(userId) {
  const admin = await dbGet(`SELECT * FROM admins WHERE userId = ?`, userId);
  return admin !== undefined;
}

// 管理者追加
export async function addAdmin(userId, addedBy, permissions = 'all') {
  await dbRun(`
    INSERT OR REPLACE INTO admins (userId, permissions, addedBy, addedAt)
    VALUES (?, ?, ?, strftime('%s', 'now'))
  `, userId, permissions, addedBy);
}

// 管理者削除
export async function removeAdmin(userId) {
  await dbRun(`DELETE FROM admins WHERE userId = ?`, userId);
}

// 管理者一覧取得
export async function getAdmins() {
  return await dbAll(`SELECT * FROM admins ORDER BY addedAt DESC`);
}

// ログ記録
export async function logAdminAction(adminId, action, target, details) {
  await dbRun(`
    INSERT INTO admin_logs (adminId, action, target, details, timestamp)
    VALUES (?, ?, ?, ?, strftime('%s', 'now'))
  `, adminId, action, target, details);
}

// ログ取得
export async function getAdminLogs(limit = 50) {
  return await dbAll(`
    SELECT * FROM admin_logs 
    ORDER BY timestamp DESC 
    LIMIT ?
  `, limit);
}

// ユーザー統計取得
export async function getUserStats() {
  const totalUsers = await dbGet(`SELECT COUNT(*) as count FROM users`);
  const totalPoints = await dbGet(`SELECT SUM(points) as total FROM users`);
  const totalItems = await dbGet(`SELECT COUNT(*) as count FROM items`);
  const totalTrades = await dbGet(`SELECT COUNT(*) as count FROM trades`);
  const totalAuctions = await dbGet(`SELECT COUNT(*) as count FROM auctions`);
  
  return {
    totalUsers: totalUsers.count,
    totalPoints: totalPoints.total || 0,
    totalItems: totalItems.count,
    totalTrades: totalTrades.count,
    totalAuctions: totalAuctions.count
  };
}

// 全ユーザーのポイント操作
export async function multiplyAllPoints(factor) {
  await dbRun(`UPDATE users SET points = points * ?`, factor);
}

// 全ユーザーに課税
export async function taxAllUsers(percentage) {
  const taxRate = percentage / 100;
  await dbRun(`UPDATE users SET points = points * (1 - ?)`, taxRate);
}

// 全ユーザーのポイントリセット
export async function resetAllPoints() {
  await dbRun(`UPDATE users SET points = 0`);
}

// ユーザーの全データリセット
export async function resetUserData(userId) {
  await dbRun(`BEGIN TRANSACTION`);
  try {
    await dbRun(`DELETE FROM items WHERE userId = ?`, userId);
    await dbRun(`DELETE FROM effects WHERE userId = ?`, userId);
    await dbRun(`DELETE FROM daily WHERE userId = ?`, userId);
    await dbRun(`DELETE FROM work_bonus WHERE userId = ?`, userId);
    await dbRun(`DELETE FROM user_jobs WHERE userId = ?`, userId);
    await dbRun(`DELETE FROM trades WHERE sellerId = ? OR buyerId = ?`, userId, userId);
    await dbRun(`DELETE FROM auctions WHERE sellerId = ? OR currentBidder = ?`, userId, userId);
    await dbRun(`DELETE FROM bank_accounts WHERE userId = ?`, userId);
    await dbRun(`DELETE FROM bank_transactions WHERE userId = ?`, userId);
    await dbRun(`UPDATE users SET points = 0, rolls = 0, leaves = 0 WHERE id = ?`, userId);
    await dbRun(`COMMIT`);
  } catch (error) {
    await dbRun(`ROLLBACK`);
    throw error;
  }
}

// 全ユーザーにアイテム配布
export async function giveItemToAll(itemName, quantity) {
  const users = await dbAll(`SELECT id FROM users`);
  for (const user of users) {
    await addItem(user.id, itemName, quantity);
  }
  return users.length;
}

// アクティブゲーム強制終了
export async function forceEndAllGames() {
  // ブラックジャックゲーム
  await dbRun(`DELETE FROM blackjack_games`);
  // バカラゲーム  
  await dbRun(`DELETE FROM baccarat_games`);
  // シックボーゲーム
  await dbRun(`DELETE FROM sicbo_games`);
  // スロットゲーム
  await dbRun(`DELETE FROM slot_games`);
}

// ユーザーのゲーム強制終了
export async function forceEndUserGames(userId) {
  await dbRun(`DELETE FROM blackjack_games WHERE userId = ?`, userId);
  await dbRun(`DELETE FROM baccarat_games WHERE userId = ?`, userId);
  await dbRun(`DELETE FROM sicbo_games WHERE userId = ?`, userId);
  await dbRun(`DELETE FROM slot_games WHERE userId = ?`, userId);
}
