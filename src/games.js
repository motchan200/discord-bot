// 統合されたゲームロジックファイル
import Database from 'better-sqlite3';
import { ITEMS, SPECIAL_ITEMS, SLOT_SYMBOLS, BONUS_SYMBOLS } from './config.js';
import { getUser, updateGachaStats, addItem, removeItem } from './database.js';

const db = new Database('../bott.db');

// ==================== ガチャシステム ====================

// ガチャ処理
export async function rollGacha(userId) {
  const user = await getUser(userId);
  if (user.points < 100) {
    return { error: "ポイントが足りません！ (必要: 100)" };
  }
  
  await updateGachaStats(userId, 100, 1);

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
    if (i > 0 && i % 100 === 0) {
      guaranteedCount++;
      const urItems = ITEMS.filter(item => ["UR", "LR"].includes(item.rarity));
      const selected = urItems[Math.floor(Math.random() * urItems.length)];
      await addItem(userId, selected.name);
      results.push(`🎉 **${selected.rarity}【${selected.name}】** 🎉 (100回確定)`);
      continue;
    }
    
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
  
  const removed = await removeItem(userId, "詫び石", 1);
  if (!removed) {
    return { error: "詫び石が足りません！" };
  }
  
  let results = [];
  
  for (let i = 0; i < 10; i++) {
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

// ==================== ブラックジャック ====================

// カードの定義
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// カードの絵文字マッピング
const CARD_EMOJIS = {
  '♠': '♠️',
  '♥': '♥️', 
  '♦': '♦️',
  '♣': '♣️',
  'A': '🅰️',
  '2': '2️⃣',
  '3': '3️⃣', 
  '4': '4️⃣',
  '5': '5️⃣',
  '6': '6️⃣',
  '7': '7️⃣',
  '8': '8️⃣',
  '9': '9️⃣',
  '10': '🔟',
  'J': '🃏',
  'Q': '👸',
  'K': '🤴'
};

// カードクラス
class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
    this.value = this.getValue();
  }

  getValue() {
    if (this.rank === 'A') return 11;
    if (['J', 'Q', 'K'].includes(this.rank)) return 10;
    return parseInt(this.rank);
  }

  toString() {
    return `${this.rank}${this.suit}`;
  }

  toEmojiString() {
    const suitEmoji = CARD_EMOJIS[this.suit] || this.suit;
    const rankEmoji = CARD_EMOJIS[this.rank] || this.rank;
    return `${rankEmoji}${suitEmoji}`;
  }
}

// デッキクラス
class Deck {
  constructor() {
    this.cards = [];
    this.reset();
  }

  reset() {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push(new Card(suit, rank));
      }
    }
    this.shuffle();
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  dealCard() {
    if (this.cards.length === 0) {
      this.reset();
    }
    return this.cards.pop();
  }
}

// ハンドクラス
class Hand {
  constructor() {
    this.cards = [];
  }

  addCard(card) {
    this.cards.push(card);
  }

  getValue() {
    let value = 0;
    let aces = 0;

    for (const card of this.cards) {
      if (card.rank === 'A') {
        aces++;
        value += 11;
      } else {
        value += card.value;
      }
    }

    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  }

  isBlackjack() {
    return this.cards.length === 2 && this.getValue() === 21;
  }

  isBust() {
    return this.getValue() > 21;
  }

  toString() {
    return this.cards.map(card => card.toString()).join(' ');
  }

  toEmojiString() {
    return this.cards.map(card => card.toEmojiString()).join(' ');
  }

  toStringHidden() {
    if (this.cards.length === 0) return '';
    if (this.cards.length === 1) return `${this.cards[0].toString()} ?`;
    return `${this.cards[0].toString()} ${this.cards.slice(1).map(() => '?').join(' ')}`;
  }

  toEmojiStringHidden() {
    if (this.cards.length === 0) return '';
    if (this.cards.length === 1) return `${this.cards[0].toEmojiString()} ❓`;
    return `${this.cards[0].toEmojiString()} ${this.cards.slice(1).map(() => '❓').join(' ')}`;
  }
}

// ブラックジャックゲームクラス
export class BlackjackGame {
  constructor(userId, betAmount) {
    this.userId = userId;
    this.betAmount = betAmount;
    this.deck = new Deck();
    this.playerHand = new Hand();
    this.dealerHand = new Hand();
    this.gameState = 'playing';
    this.result = null;
    this.winnings = 0;
    
    this.dealInitialCards();
  }

  dealInitialCards() {
    this.playerHand.addCard(this.deck.dealCard());
    this.dealerHand.addCard(this.deck.dealCard());
    this.playerHand.addCard(this.deck.dealCard());
    this.dealerHand.addCard(this.deck.dealCard());

    if (this.playerHand.isBlackjack()) {
      this.gameState = 'finished';
      if (this.dealerHand.isBlackjack()) {
        this.result = 'push';
        this.winnings = this.betAmount;
      } else {
        this.result = 'blackjack';
        this.winnings = Math.floor(this.betAmount * 2.5);
      }
      
      setTimeout(() => {
        this.saveToHistory();
        activeGames.delete(this.userId);
      }, 1000);
    } else {
      this.gameState = 'playerTurn';
    }
  }

  hit() {
    if (this.gameState !== 'playerTurn') {
      return { error: '現在はヒットできません' };
    }

    this.playerHand.addCard(this.deck.dealCard());

    if (this.playerHand.isBust()) {
      this.gameState = 'finished';
      this.result = 'lose';
      this.winnings = 0;
      
      setTimeout(() => {
        this.saveToHistory();
        activeGames.delete(this.userId);
      }, 1000);
      
      return { success: true, bust: true };
    }

    return { success: true };
  }

  stand() {
    if (this.gameState !== 'playerTurn') {
      return { error: '現在はスタンドできません' };
    }

    this.gameState = 'dealerTurn';
    this.playDealerHand();
    this.determineWinner();
    
    return { success: true };
  }

  playDealerHand() {
    while (this.dealerHand.getValue() < 17) {
      this.dealerHand.addCard(this.deck.dealCard());
    }
  }

  determineWinner() {
    this.gameState = 'finished';

    const playerValue = this.playerHand.getValue();
    const dealerValue = this.dealerHand.getValue();

    if (this.dealerHand.isBust()) {
      this.result = 'win';
      this.winnings = this.betAmount * 2;
    } else if (playerValue > dealerValue) {
      this.result = 'win';
      this.winnings = this.betAmount * 2;
    } else if (playerValue < dealerValue) {
      this.result = 'lose';
      this.winnings = 0;
    } else {
      this.result = 'push';
      this.winnings = this.betAmount;
    }

    setTimeout(() => {
      this.saveToHistory();
      activeGames.delete(this.userId);
    }, 1000);
  }

  getGameState() {
    return {
      playerHand: this.playerHand.toEmojiString(),
      dealerHand: this.gameState === 'finished' ? this.dealerHand.toEmojiString() : this.dealerHand.toEmojiStringHidden(),
      playerValue: this.playerHand.getValue(),
      dealerValue: this.gameState === 'finished' ? this.dealerHand.getValue() : null,
      gameState: this.gameState,
      result: this.result,
      winnings: this.winnings,
      betAmount: this.betAmount
    };
  }

  isFinished() {
    return this.gameState === 'finished';
  }

  saveToHistory() {
    if (this.gameState === 'finished') {
      db.prepare(`
        INSERT INTO blackjack_history 
        (userId, betAmount, playerHand, dealerHand, playerValue, dealerValue, result, winnings, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        this.userId,
        this.betAmount,
        this.playerHand.toString(),
        this.dealerHand.toString(),
        this.playerHand.getValue(),
        this.dealerHand.getValue(),
        this.result,
        this.winnings,
        Date.now()
      );
    }
  }
}

// ゲーム状態を保存するためのMap
const activeGames = new Map();

// ブラックジャックゲーム管理関数
export function startBlackjackGame(userId, betAmount) {
  if (activeGames.has(userId)) {
    return { error: '既にゲームが進行中です。現在のゲームを終了してから新しいゲームを開始してください。' };
  }

  if (betAmount <= 0) {
    return { error: 'ベット額は1ポイント以上である必要があります。' };
  }

  // ベット額上限削除

  const game = new BlackjackGame(userId, betAmount);
  activeGames.set(userId, game);
  
  return { success: true, game: game.getGameState() };
}

export function hitCard(userId) {
  const game = activeGames.get(userId);
  if (!game) {
    return { error: 'アクティブなゲームが見つかりません。' };
  }

  const result = game.hit();
  if (result.success) {
    return { success: true, game: game.getGameState() };
  } else {
    return result;
  }
}

export function standCard(userId) {
  const game = activeGames.get(userId);
  if (!game) {
    return { error: 'アクティブなゲームが見つかりません。' };
  }

  const result = game.stand();
  if (result.success) {
    return { success: true, game: game.getGameState() };
  } else {
    return result;
  }
}

export function getGameState(userId) {
  const game = activeGames.get(userId);
  if (!game) {
    return { error: 'アクティブなゲームが見つかりません。' };
  }

  return { success: true, game: game.getGameState() };
}

export function endGame(userId) {
  const game = activeGames.get(userId);
  if (!game) {
    return { error: 'アクティブなゲームが見つかりません。' };
  }

  activeGames.delete(userId);
  return { success: true };
}

export function getActiveGame(userId) {
  return activeGames.get(userId);
}

export function getBlackjackHistory(userId, limit = 10) {
  return db.prepare(`
    SELECT * FROM blackjack_history 
    WHERE userId = ?
    ORDER BY createdAt DESC 
    LIMIT ?
  `).all(userId, limit);
}

// ==================== バカラ ====================

// カードの値を計算（バカラルール）
function calculateCardValue(card) {
  const rank = card.slice(1);
  if (['J', 'Q', 'K'].includes(rank)) return 0;
  if (rank === 'A') return 1;
  return parseInt(rank);
}

// 手札の合計値を計算（バカラルール：10の位は無視）
function calculateHandValue(hand) {
  const cards = hand.split(' ');
  let total = 0;
  for (const card of cards) {
    total += calculateCardValue(card);
  }
  return total % 10;
}

// デッキクラス
class BaccaratDeck {
  constructor() {
    this.cards = [];
    this.reset();
  }

  reset() {
    this.cards = [];
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    for (const suit of suits) {
      for (const rank of ranks) {
        this.cards.push(suit + rank);
      }
    }
    
    const seed = Date.now() + Math.random() * 1000;
    this.shuffleWithSeed(seed);
  }

  shuffleWithSeed(seed) {
    let currentSeed = seed;
    for (let i = this.cards.length - 1; i > 0; i--) {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      const j = Math.floor((currentSeed / 233280) * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  shuffle() {
    for (let shuffle = 0; shuffle < 3; shuffle++) {
      for (let i = this.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
      }
    }
  }

  drawCard() {
    if (this.cards.length === 0) {
      this.reset();
    }
    return this.cards.pop();
  }
}

// グローバルデッキインスタンス
let gameDeck = new BaccaratDeck();

// カードを1枚引く
function drawCard() {
  return gameDeck.drawCard();
}

// バカラのドロールール
function shouldDrawThirdCard(playerValue, bankerValue, playerThirdCard = null) {
  if (playerThirdCard === null) {
    return playerValue <= 5;
  }
  
  if (bankerValue <= 2) return true;
  if (bankerValue === 3) return playerThirdCard !== 8;
  if (bankerValue === 4) return [2, 3, 4, 5, 6, 7].includes(playerThirdCard);
  if (bankerValue === 5) return [4, 5, 6, 7].includes(playerThirdCard);
  if (bankerValue === 6) return [6, 7].includes(playerThirdCard);
  return false;
}

// バカラゲームを開始
export function startBaccaratGame(userId, betAmount, betType) {
  if (!['player', 'banker', 'tie'].includes(betType)) {
    return { error: '無効なベットタイプです。player、banker、tieのいずれかを選択してください。' };
  }

  gameDeck.reset();

  const playerCard1 = drawCard();
  const playerCard2 = drawCard();
  const bankerCard1 = drawCard();
  const bankerCard2 = drawCard();

  const playerHand = `${playerCard1} ${playerCard2}`;
  const bankerHand = `${bankerCard1} ${bankerCard2}`;

  const playerValue = calculateHandValue(playerHand);
  const bankerValue = calculateHandValue(bankerHand);

  let finalPlayerHand = playerHand;
  let finalBankerHand = bankerHand;
  let finalPlayerValue = playerValue;
  let finalBankerValue = bankerValue;

  let playerThirdCard = null;
  let bankerThirdCard = null;

  if (shouldDrawThirdCard(playerValue, bankerValue)) {
    playerThirdCard = drawCard();
    finalPlayerHand += ` ${playerThirdCard}`;
    finalPlayerValue = calculateHandValue(finalPlayerHand);
  }

  if (shouldDrawThirdCard(finalPlayerValue, finalBankerValue, playerThirdCard ? calculateCardValue(playerThirdCard) : null)) {
    bankerThirdCard = drawCard();
    finalBankerHand += ` ${bankerThirdCard}`;
    finalBankerValue = calculateHandValue(finalBankerHand);
  }

  let result = '';
  let winnings = 0;

  if (finalPlayerValue > finalBankerValue) {
    result = 'player';
    if (betType === 'player') {
      winnings = betAmount * 2;
    }
  } else if (finalBankerValue > finalPlayerValue) {
    result = 'banker';
    if (betType === 'banker') {
      winnings = Math.floor(betAmount * 1.95);
    }
  } else {
    result = 'tie';
    if (betType === 'tie') {
      winnings = betAmount * 8;
    } else {
      winnings = betAmount;
    }
  }

  db.prepare(`
    INSERT INTO baccarat_history 
    (userId, betAmount, betType, playerHand, bankerHand, playerValue, bankerValue, result, winnings, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, betAmount, betType, finalPlayerHand, finalBankerHand, finalPlayerValue, finalBankerValue, result, winnings, Date.now());

  return {
    game: {
      betAmount,
      betType,
      playerHand: finalPlayerHand,
      bankerHand: finalBankerHand,
      playerValue: finalPlayerValue,
      bankerValue: finalBankerValue,
      result,
      winnings
    }
  };
}

export function getBaccaratHistory(userId, limit = 10) {
  return db.prepare(`
    SELECT * FROM baccarat_history 
    WHERE userId = ?
    ORDER BY createdAt DESC 
    LIMIT ?
  `).all(userId, limit);
}

// ==================== シックボー ====================

// サイコロを振る関数
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

// 3つのサイコロを振る
function rollThreeDice() {
  return [rollDice(), rollDice(), rollDice()];
}

// サイコロの合計を計算
function calculateTotal(dice) {
  return dice.reduce((sum, die) => sum + die, 0);
}

// ベットタイプの検証と配当計算
function calculateWinnings(betType, dice, betAmount) {
  const [dice1, dice2, dice3] = dice;
  const total = calculateTotal(dice);
  const sortedDice = [...dice].sort((a, b) => a - b);
  
  switch (betType) {
    case 'small':
      if (total >= 4 && total <= 10) {
        return betAmount * 2;
      }
      return 0;
    
    case 'big':
      if (total >= 11 && total <= 17) {
        return betAmount * 2;
      }
      return 0;
    
    case 'total4':
    case 'total5':
    case 'total6':
    case 'total7':
    case 'total8':
    case 'total9':
    case 'total10':
    case 'total11':
    case 'total12':
    case 'total13':
    case 'total14':
    case 'total15':
    case 'total16':
    case 'total17':
      const targetTotal = parseInt(betType.replace('total', ''));
      if (total === targetTotal) {
        const payouts = {
          4: 60, 17: 60,
          5: 30, 16: 30,
          6: 18, 15: 18,
          7: 12, 14: 12,
          8: 8, 13: 8,
          9: 6, 12: 6,
          10: 6, 11: 6
        };
        return betAmount * payouts[targetTotal];
      }
      return 0;
    
    case 'single1':
    case 'single2':
    case 'single3':
    case 'single4':
    case 'single5':
    case 'single6':
      const targetNumber = parseInt(betType.replace('single', ''));
      const count = dice.filter(d => d === targetNumber).length;
      if (count >= 1) {
        const payouts = { 1: 1, 2: 2, 3: 3 };
        return betAmount * payouts[count];
      }
      return 0;
    
    case 'pair1':
    case 'pair2':
    case 'pair3':
    case 'pair4':
    case 'pair5':
    case 'pair6':
      const pairNumber = parseInt(betType.replace('pair', ''));
      const pairCount = dice.filter(d => d === pairNumber).length;
      if (pairCount >= 2) {
        return betAmount * 6;
      }
      return 0;
    
    case 'triple1':
    case 'triple2':
    case 'triple3':
    case 'triple4':
    case 'triple5':
    case 'triple6':
      const tripleNumber = parseInt(betType.replace('triple', ''));
      const tripleCount = dice.filter(d => d === tripleNumber).length;
      if (tripleCount === 3) {
        return betAmount * 180;
      }
      return 0;
    
    case 'any_triple':
      if (dice1 === dice2 && dice2 === dice3) {
        return betAmount * 30;
      }
      return 0;
    
    case 'consecutive':
      if ((sortedDice[0] === 1 && sortedDice[1] === 2 && sortedDice[2] === 3) ||
          (sortedDice[0] === 4 && sortedDice[1] === 5 && sortedDice[2] === 6)) {
        return betAmount * 30;
      }
      return 0;
    
    default:
      return 0;
  }
}

// ベットタイプの説明を取得
function getBetTypeDescription(betType) {
  const descriptions = {
    'small': '小（4-10）',
    'big': '大（11-17）',
    'total4': '合計4',
    'total5': '合計5',
    'total6': '合計6',
    'total7': '合計7',
    'total8': '合計8',
    'total9': '合計9',
    'total10': '合計10',
    'total11': '合計11',
    'total12': '合計12',
    'total13': '合計13',
    'total14': '合計14',
    'total15': '合計15',
    'total16': '合計16',
    'total17': '合計17',
    'single1': '1の単発',
    'single2': '2の単発',
    'single3': '3の単発',
    'single4': '4の単発',
    'single5': '5の単発',
    'single6': '6の単発',
    'pair1': '1のペア',
    'pair2': '2のペア',
    'pair3': '3のペア',
    'pair4': '4のペア',
    'pair5': '5のペア',
    'pair6': '6のペア',
    'triple1': '1のトリプル',
    'triple2': '2のトリプル',
    'triple3': '3のトリプル',
    'triple4': '4のトリプル',
    'triple5': '5のトリプル',
    'triple6': '6のトリプル',
    'any_triple': '任意のトリプル',
    'consecutive': '連続（1,2,3 または 4,5,6）'
  };
  return descriptions[betType] || betType;
}

// シックボーゲームを開始
export function startSicboGame(userId, betAmount, betType) {
  const validBetTypes = [
    'small', 'big',
    'total4', 'total5', 'total6', 'total7', 'total8', 'total9', 'total10',
    'total11', 'total12', 'total13', 'total14', 'total15', 'total16', 'total17',
    'single1', 'single2', 'single3', 'single4', 'single5', 'single6',
    'pair1', 'pair2', 'pair3', 'pair4', 'pair5', 'pair6',
    'triple1', 'triple2', 'triple3', 'triple4', 'triple5', 'triple6',
    'any_triple', 'consecutive'
  ];
  
  if (!validBetTypes.includes(betType)) {
    return { error: '無効なベットタイプです。' };
  }

  const dice = rollThreeDice();
  const total = calculateTotal(dice);
  
  const winnings = calculateWinnings(betType, dice, betAmount);
  
  const result = winnings > 0 ? 'win' : 'lose';
  
  db.prepare(`
    INSERT INTO sicbo_history 
    (userId, betAmount, betType, dice1, dice2, dice3, total, result, winnings, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, betAmount, betType, dice[0], dice[1], dice[2], total, result, winnings, Date.now());

  return {
    game: {
      betAmount,
      betType,
      betTypeDescription: getBetTypeDescription(betType),
      dice: dice,
      total: total,
      result: result,
      winnings: winnings
    }
  };
}

export function getSicboHistory(userId, limit = 10) {
  return db.prepare(`
    SELECT * FROM sicbo_history 
    WHERE userId = ?
    ORDER BY createdAt DESC 
    LIMIT ?
  `).all(userId, limit);
}

export function getAvailableBetTypes() {
  return [
    { value: 'small', label: '小（4-10）', description: '1:1配当' },
    { value: 'big', label: '大（11-17）', description: '1:1配当' },
    { value: 'total4', label: '合計4', description: '60:1配当' },
    { value: 'total5', label: '合計5', description: '30:1配当' },
    { value: 'total6', label: '合計6', description: '18:1配当' },
    { value: 'total7', label: '合計7', description: '12:1配当' },
    { value: 'total8', label: '合計8', description: '8:1配当' },
    { value: 'total9', label: '合計9', description: '6:1配当' },
    { value: 'total10', label: '合計10', description: '6:1配当' },
    { value: 'total11', label: '合計11', description: '6:1配当' },
    { value: 'total12', label: '合計12', description: '6:1配当' },
    { value: 'total13', label: '合計13', description: '8:1配当' },
    { value: 'total14', label: '合計14', description: '12:1配当' },
    { value: 'total15', label: '合計15', description: '18:1配当' },
    { value: 'total16', label: '合計16', description: '30:1配当' },
    { value: 'total17', label: '合計17', description: '60:1配当' },
    { value: 'single1', label: '1の単発', description: '1-3倍配当' },
    { value: 'single2', label: '2の単発', description: '1-3倍配当' },
    { value: 'single3', label: '3の単発', description: '1-3倍配当' },
    { value: 'single4', label: '4の単発', description: '1-3倍配当' },
    { value: 'single5', label: '5の単発', description: '1-3倍配当' },
    { value: 'single6', label: '6の単発', description: '1-3倍配当' },
    { value: 'pair1', label: '1のペア', description: '6:1配当' },
    { value: 'pair2', label: '2のペア', description: '6:1配当' },
    { value: 'pair3', label: '3のペア', description: '6:1配当' },
    { value: 'pair4', label: '4のペア', description: '6:1配当' },
    { value: 'pair5', label: '5のペア', description: '6:1配当' },
    { value: 'pair6', label: '6のペア', description: '6:1配当' },
    { value: 'triple1', label: '1のトリプル', description: '180:1配当' },
    { value: 'triple2', label: '2のトリプル', description: '180:1配当' },
    { value: 'triple3', label: '3のトリプル', description: '180:1配当' },
    { value: 'triple4', label: '4のトリプル', description: '180:1配当' },
    { value: 'triple5', label: '5のトリプル', description: '180:1配当' },
    { value: 'triple6', label: '6のトリプル', description: '180:1配当' },
    { value: 'any_triple', label: '任意のトリプル', description: '30:1配当' },
    { value: 'consecutive', label: '連続（1,2,3 または 4,5,6）', description: '30:1配当' }
  ];
}

// ==================== スロットマシン ====================

// スロットゲームの状態管理
const slotActiveGames = new Map();

// スロットゲームを開始
export function startSlotGame(userId, initialCredits) {
  const gameId = `slot_${userId}_${Date.now()}`;
  
  const game = {
    id: gameId,
    userId: userId,
    credits: initialCredits,
    betPerSpin: 10,
    reels: [null, null, null],
    spins: 0,
    totalWinnings: 0,
    isActive: true,
    createdAt: Date.now()
  };
  
  slotActiveGames.set(gameId, game);
  return game;
}

// リールを回転
export function spinReel(reelIndex, gameId) {
  const game = slotActiveGames.get(gameId);
  if (!game || !game.isActive) return null;
  
  const reel = [];
  const allSymbols = [...SLOT_SYMBOLS, ...BONUS_SYMBOLS];
  
  const totalProbability = allSymbols.reduce((sum, symbol) => sum + symbol.probability, 0);
  
  for (let i = 0; i < 3; i++) {
    const random = Math.random() * totalProbability;
    let cumulativeProbability = 0;
    
    for (const symbol of allSymbols) {
      cumulativeProbability += symbol.probability;
      if (random <= cumulativeProbability) {
        reel.push(symbol);
        break;
      }
    }
    
    if (reel.length <= i) {
      reel.push(allSymbols[Math.floor(Math.random() * allSymbols.length)]);
    }
  }
  
  game.reels[reelIndex] = reel;
  game.spins++;
  
  return reel;
}

// 全リールを回転
export function spinAllReels(gameId) {
  const game = slotActiveGames.get(gameId);
  if (!game || !game.isActive) return null;
  
  if (game.credits < game.betPerSpin) {
    return null;
  }
  
  game.credits -= game.betPerSpin;
  
  for (let i = 0; i < 3; i++) {
    spinReel(i, gameId);
  }
  
  return game.reels;
}

// 配当を計算
export function calculatePayout(gameId) {
  const game = slotActiveGames.get(gameId);
  if (!game || !game.isActive) return 0;
  
  let totalPayout = 0;
  
  for (let row = 0; row < 3; row++) {
    const symbols = game.reels.map(reel => reel[row]);
    
    if (symbols[0].name === symbols[1].name && 
        symbols[1].name === symbols[2].name) {
      const symbol = symbols[0];
      totalPayout += game.betPerSpin * symbol.multiplier;
    }
    
    const bonusSymbols = symbols.filter(symbol => 
      BONUS_SYMBOLS.some(bonus => bonus.name === symbol.name)
    );
    
    if (bonusSymbols.length > 0) {
      const bonusMultiplier = bonusSymbols.reduce((sum, symbol) => {
        const bonus = BONUS_SYMBOLS.find(b => b.name === symbol.name);
        return sum + bonus.multiplier;
      }, 0);
      totalPayout += game.betPerSpin * bonusMultiplier;
    }
  }
  
  game.credits += totalPayout;
  game.totalWinnings += totalPayout;
  return totalPayout;
}

// ベット額を変更
export function changeBetAmount(gameId, newBetAmount) {
  const game = slotActiveGames.get(gameId);
  if (!game || !game.isActive) return false;
  
  if (newBetAmount < 10 || newBetAmount > 1000000 || newBetAmount % 10 !== 0) return false;
  
  game.betPerSpin = newBetAmount;
  return true;
}

// ゲーム状態を取得
export function getSlotGameState(gameId) {
  return slotActiveGames.get(gameId);
}

// ゲームを終了
export function endSlotGame(gameId) {
  const game = slotActiveGames.get(gameId);
  if (!game) {
    console.log(`ゲーム終了エラー: Game ID ${gameId} が見つかりません`);
    return null;
  }
  
  console.log(`ゲーム終了: User ${game.userId}, Game ID: ${gameId}`);
  game.isActive = false;
  slotActiveGames.delete(gameId);
  
  return {
    totalWinnings: game.totalWinnings,
    spins: game.spins,
    remainingCredits: game.credits,
    betPerSpin: game.betPerSpin
  };
}

// アクティブなゲームを取得
export function getActiveSlotGame(userId) {
  for (const [gameId, game] of slotActiveGames) {
    if (game.userId === userId && game.isActive) {
      return game;
    }
  }
  return null;
}

// デバッグ用: 全ゲーム状態を確認
export function debugActiveGames() {
  console.log('=== アクティブゲーム一覧 ===');
  for (const [gameId, game] of slotActiveGames) {
    console.log(`Game ID: ${gameId}, User: ${game.userId}, Active: ${game.isActive}, Credits: ${game.credits}`);
  }
  console.log('========================');
}

// ユーザーの全ゲームを強制終了
export function forceEndUserGames(userId) {
  let endedCount = 0;
  for (const [gameId, game] of slotActiveGames) {
    if (game.userId === userId) {
      console.log(`強制終了: User ${userId}, Game ID: ${gameId}`);
      game.isActive = false;
      slotActiveGames.delete(gameId);
      endedCount++;
    }
  }
  console.log(`ユーザー ${userId} のゲームを ${endedCount} 個強制終了しました`);
  return endedCount;
}

// リールの表示用文字列を生成
export function formatReels(reels) {
  let display = "```\n";
  display += "┌─────┬─────┬─────┐\n";
  
  for (let row = 0; row < 3; row++) {
    display += "│";
    for (let reel = 0; reel < 3; reel++) {
      if (!reels[reel]) {
        display += ` ❓ │`;
      } else {
        const symbol = reels[reel][row];
        display += ` ${symbol ? symbol.name : '❓'} │`;
      }
    }
    display += "\n";
    if (row < 2) display += "├─────┼─────┼─────┤\n";
  }
  
  display += "└─────┴─────┴─────┘\n";
  display += "```";
  
  return display;
}
