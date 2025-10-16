// ガチャシステム専用ファイル
import { ITEMS, SPECIAL_ITEMS, HIDDEN_ROLL_ITEMS, LEAF_GACHA_ITEMS } from './config.js';
import { getUser, updateGachaStats, addItem, removeItem, addPoints, subtractPoints, dbRun, subtractLeaves } from './database.js';

// ガチャ処理
export async function rollGacha(userId) {
  const user = await getUser(userId);
  if (user.points < 100) {
    return { error: "ポイントが足りません！ (必要: 100)" };
  }
  
  // ポイント消費とガチャ回数更新
  await updateGachaStats(userId, 100, 1);

  // 確率抽選
  const rand = Math.random();
  let sum = 0;
  let selected = ITEMS[ITEMS.length - 1];
  for (const item of ITEMS) {
    sum += item.rate;
    if (rand < sum) {
      selected = item;
      break;
    }
  }
  await addItem(userId, selected.name);
  return { item: selected };
}

// 複数回ガチャ処理
export async function rollMultipleGacha(userId, count) {
  const user = await getUser(userId);
  const totalCost = count * 100;
  
  if (user.points < totalCost) {
    return { error: `ポイントが足りません！（必要: ${totalCost}）` };
  }
  
  await updateGachaStats(userId, totalCost, count);
  
  let results = [];
  let guaranteedCount = 0;
  
  for (let i = 0; i < count; i++) {
    // 100回ごとにUR以上確定
    if (i > 0 && i % 100 === 0) {
      guaranteedCount++;
      // 100回ごとに1回分UR以上確定
      const urItems = ITEMS.filter(item => ["UR", "LR"].includes(item.rarity));
      const selected = urItems[Math.floor(Math.random() * urItems.length)];
      await addItem(userId, selected.name);
      results.push(`🎉 **${selected.rarity}【${selected.name}】** 🎉 (100回確定)`);
      continue;
    }
    
    // 通常ガチャ処理
    const rand = Math.random();
    let sum = 0;
    let selected = ITEMS[ITEMS.length - 1];
    
    for (const item of ITEMS) {
      sum += item.rate;
      if (rand < sum) {
        selected = item;
        break;
      }
    }
    await addItem(userId, selected.name);
    results.push(`${selected.rarity}【${selected.name}】`);
  }
  
  return { 
    results, 
    count, 
    guaranteedCount,
    totalCost
  };
}

// 詫び石使用時のSR以上確定10連ガチャ
export async function rollApologyGacha(userId) {
  const apologyStone = SPECIAL_ITEMS.find(item => item.name === "詫び石");
  if (!apologyStone) {
    return { error: "詫び石が見つかりません" };
  }
  
  // 詫び石を1つ消費
  const removed = await removeItem(userId, "詫び石", 1);
  if (!removed) {
    return { error: "詫び石が足りません！" };
  }
  
  let results = [];
  
  for (let i = 0; i < 10; i++) {
    // SR以上確定ガチャ
    const srItems = ITEMS.filter(item => ["SR", "SSR", "UR", "LR"].includes(item.rarity));
    const selected = srItems[Math.floor(Math.random() * srItems.length)];
    await addItem(userId, selected.name);
    results.push(`${selected.rarity}【${selected.name}】`);
  }
  
  return { 
    results, 
    count: 10,
    totalCost: 0,
    usedItem: "詫び石"
  };
}

// 隠しコマンド専用ガチャ（1000億円消費）
export async function rollHiddenGacha(userId, amount) {
  const user = await getUser(userId);
  
  if (amount !== 100000000000) {
    return { error: "このコマンドは1000億円でのみ使用可能です！" };
  }
  
  if (user.points < amount) {
    return { error: `ポイントが足りません！ (必要: ${amount.toLocaleString()}円)` };
  }
  
  // ポイント消費
  await updateGachaStats(userId, amount, 1);
  
  // 隠しコマンド専用ガチャ処理
  const rand = Math.random();
  let sum = 0;
  let selected = HIDDEN_ROLL_ITEMS[HIDDEN_ROLL_ITEMS.length - 1];
  
  for (const item of HIDDEN_ROLL_ITEMS) {
    sum += item.rate;
    if (rand < sum) {
      selected = item;
      break;
    }
  }
  
  // アイテムを追加
  await addItem(userId, selected.name);
  
  
  return { 
    item: selected,
    amountSpent: amount
  };
}

// アイテム使用時の効果実行
export async function useHiddenItem(userId, itemName) {
  const user = await getUser(userId);
  let effectMessage = "";
  
  if (itemName === "株券") {
    const stockRand = Math.random();
    if (stockRand < 0.3) { // 3割で成功
      const profit = 10000000000 + Math.floor(Math.random() * 5000000000); // 100億～150億円
      await addPoints(userId, profit);
      effectMessage = `株価大暴騰！+${profit.toLocaleString()}円を獲得しました！`;
    } else { // 7割で失敗
      await subtractPoints(userId, 100000000000); // 1000億円を失う
      effectMessage = `投資失敗！-1000億円を失いました...`;
    }
  } else if (itemName === "飴玉") {
    const candyRand = Math.random();
    if (candyRand < 0.05) { // 5%でかみ砕ける
      const newAmount = Math.floor(user.points * 2);
      await dbRun(`UPDATE users SET points = ? WHERE id = ?`, newAmount, userId);
      effectMessage = `かみ砕けた！所持金が2倍になりました！ (${user.points.toLocaleString()}円 → ${newAmount.toLocaleString()}円)`;
    } else { // 95%で砕けない
      const newAmount = Math.floor(user.points * 0.25);
      await dbRun(`UPDATE users SET points = ? WHERE id = ?`, newAmount, userId);
      effectMessage = `かみ砕けなかった...所持金が1/4になりました。 (${user.points.toLocaleString()}円 → ${newAmount.toLocaleString()}円)`;
    }
  } else if (itemName === "エナドリ") {
    effectMessage = "残念！効果なしのエナドリでした...";
  } else {
    return { error: "未知のアイテムです" };
  }
  
  // アイテムを1つ削除
  const removed = await removeItem(userId, itemName, 1);
  if (!removed) {
    return { error: "アイテムが足りません！" };
  }
  
  return { effectMessage };
}

// リーフガチャ処理（450リーフ消費）
export async function rollLeafGacha(userId, count = 1) {
  const user = await getUser(userId);
  const totalCost = count * 450;
  
  if (user.leaves < totalCost) {
    return { error: `リーフが足りません！ (必要: ${totalCost}リーフ)` };
  }
  
  // リーフ消費
  await subtractLeaves(userId, totalCost);
  
  let results = [];
  
  for (let i = 0; i < count; i++) {
    // リーフガチャ抽選
    const rand = Math.random();
    let sum = 0;
    let selected = LEAF_GACHA_ITEMS[LEAF_GACHA_ITEMS.length - 1];
    
    for (const item of LEAF_GACHA_ITEMS) {
      sum += item.rate;
      if (rand < sum) {
        selected = item;
        break;
      }
    }
    
    await addItem(userId, selected.name);
    results.push(`${selected.rarity}【${selected.name}】`);
  }
  
  return { 
    results, 
    count,
    totalCost
  };
}
