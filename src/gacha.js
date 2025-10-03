// ガチャシステム専用ファイル
import { ITEMS, SPECIAL_ITEMS } from './config.js';
import { getUser, updateGachaStats, addItem, removeItem } from './database.js';

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
