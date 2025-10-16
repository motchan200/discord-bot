// 統合された設定ファイル

// ガチャ景品設定
export const ITEMS = [
  // Nランク (2個、合計45%)
  { name: "石ころ", rarity: "N", rate: 0.250, price: 3 },
  { name: "小さな木片", rarity: "N", rate: 0.200, price: 5 },
  
  // Rランク (20個、合計約35%)
  { name: "ヒビ割れたコイン", rarity: "R", rate: 0.060, price: 12 },
  { name: "サビた釘", rarity: "R", rate: 0.050, price: 15 },
  { name: "ちいさなボタン", rarity: "R", rate: 0.040, price: 20 },
  { name: "お菓子の空袋", rarity: "R", rate: 0.040, price: 20 },
  { name: "破れた切符", rarity: "R", rate: 0.025, price: 33 },
  { name: "折れたつまようじ", rarity: "R", rate: 0.020, price: 40 },
  { name: "かけたビー玉", rarity: "R", rate: 0.020, price: 50 },
  { name: "乾いた葉っぱ", rarity: "R", rate: 0.020, price: 50 },
  { name: "謎のメモの切れ端", rarity: "R", rate: 0.020, price: 50 },
  { name: "古いボタン", rarity: "R", rate: 0.015, price: 67 },
  { name: "欠けた歯車", rarity: "R", rate: 0.015, price: 67 },
  { name: "小さな石片", rarity: "R", rate: 0.015, price: 67 },
  { name: "錆びた釘セット", rarity: "R", rate: 0.010, price: 100 },
  { name: "折れた鉛筆片", rarity: "R", rate: 0.010, price: 100 },
  { name: "古びたコイン", rarity: "R", rate: 0.010, price: 100 },
  { name: "小さなガラス片", rarity: "R", rate: 0.008, price: 125 },
  { name: "使いかけの糸", rarity: "R", rate: 0.008, price: 125 },
  { name: "欠けたマッチ棒", rarity: "R", rate: 0.007, price: 143 },
  { name: "古いメモ用紙", rarity: "R", rate: 0.007, price: 143 },
  { name: "小さな鈴", rarity: "R", rate: 0.007, price: 143 },
  
  // SRランク (15個、合計約12%)
  { name: "半分だけの鉛筆", rarity: "SR", rate: 0.012, price: 67 },
  { name: "使いかけの消しゴム", rarity: "SR", rate: 0.012, price: 67 },
  { name: "ゴムのかけら", rarity: "SR", rate: 0.012, price: 67 },
  { name: "ふるびた鈴", rarity: "SR", rate: 0.010, price: 100 },
  { name: "ただの木片", rarity: "SR", rate: 0.010, price: 100 },
  { name: "小さな布片", rarity: "SR", rate: 0.010, price: 100 },
  { name: "錆びた鍵", rarity: "SR", rate: 0.008, price: 125 },
  { name: "折れたブラシ", rarity: "SR", rate: 0.008, price: 125 },
  { name: "古い硬貨", rarity: "SR", rate: 0.008, price: 125 },
  { name: "小さな歯車", rarity: "SR", rate: 0.007, price: 143 },
  { name: "使いかけのノート", rarity: "SR", rate: 0.007, price: 143 },
  { name: "欠けた磁石", rarity: "SR", rate: 0.007, price: 143 },
  { name: "曲がった針金", rarity: "SR", rate: 0.006, price: 167 },
  { name: "小さな貝殻", rarity: "SR", rate: 0.006, price: 167 },
  { name: "折れたスプーン", rarity: "SR", rate: 0.006, price: 167 },
  
  // SSRランク (15個、ファンタジー風、合計約6%)
  { name: "ルミナイトの欠片", rarity: "SSR", rate: 0.006, price: 125 },
  { name: "時の歯車の破片", rarity: "SSR", rate: 0.006, price: 125 },
  { name: "闇鋼の針", rarity: "SSR", rate: 0.005, price: 143 },
  { name: "封印の小盾", rarity: "SSR", rate: 0.005, price: 143 },
  { name: "妖精の涙", rarity: "SSR", rate: 0.005, price: 143 },
  { name: "月光の欠片", rarity: "SSR", rate: 0.004, price: 167 },
  { name: "古代王の鍵", rarity: "SSR", rate: 0.004, price: 167 },
  { name: "錬金術師の歯車", rarity: "SSR", rate: 0.004, price: 167 },
  { name: "幻影の杯", rarity: "SSR", rate: 0.003, price: 200 },
  { name: "精霊の杖の破片", rarity: "SSR", rate: 0.003, price: 200 },
  { name: "魔法石の欠片", rarity: "SSR", rate: 0.003, price: 200 },
  { name: "呪縛の釘", rarity: "SSR", rate: 0.002, price: 250 },
  { name: "古の呪文書の断片", rarity: "SSR", rate: 0.002, price: 250 },
  { name: "月影のペンダント", rarity: "SSR", rate: 0.002, price: 250 },
  { name: "星屑の宝珠", rarity: "SSR", rate: 0.001, price: 333 },
  
  // URランク (10個、ファンタジー風、合計約1.5%)
  { name: "守護の護符", rarity: "UR", rate: 0.003, price: 200 },
  { name: "炎の印章", rarity: "UR", rate: 0.002, price: 333 },
  { name: "フェニックスの羽", rarity: "UR", rate: 0.002, price: 333 },
  { name: "妖精の空壺", rarity: "UR", rate: 0.001, price: 500 },
  { name: "古代魔導書の断片", rarity: "UR", rate: 0.001, price: 1010 },
  { name: "聖典のページ", rarity: "UR", rate: 0.001, price: 667 },
  { name: "王国の古貨", rarity: "UR", rate: 0.001, price: 1000 },
  { name: "英雄のメダリオン", rarity: "UR", rate: 0.001, price: 833 },
  { name: "精霊の指輪", rarity: "UR", rate: 0.001, price: 1000 },
  { name: "神秘のルビー片", rarity: "UR", rate: 0.001, price: 1250 },
  
  // LRランク (6個、ファンタジー風、合計約0.05%)
  { name: "純白のダイヤモンド", rarity: "LR", rate: 0.0001, price: 100000 },
  { name: "神秘のクリスタル", rarity: "LR", rate: 0.0001, price: 200000 },
  { name: "天空の幻羽", rarity: "LR", rate: 0.0001, price: 333333 },
  { name: "伝説の古貨", rarity: "LR", rate: 0.0001, price: 500000 },
  { name: "失われた魔導石板", rarity: "LR", rate: 0.0001, price: 1000000 }
];

// ショップ限定アイテム定義
export const SHOP_ITEMS = [
  { name: "ラッキーチケット", rarity: "SR", price: 500, effect: "次回ガチャでSSR以上確定" },
  { name: "ポイントブースター", rarity: "SSR", price: 1200, effect: "24時間ポイント獲得量2倍" },
  { name: "ミステリーボックス", rarity: "UR", price: 3000, effect: "開封でランダムアイテム入手" }
];

// 特別アイテム定義（additemからしか取得不可）
export const SPECIAL_ITEMS = [
  { name: "詫び石", rarity: "SPECIAL", price: 0, effect: "SR以上確定10連ガチャ", usable: true }
];

// 隠しコマンド.roll専用アイテム
export const HIDDEN_ROLL_ITEMS = [
  { name: "株券", rarity: "LR", rate: 0.70, price: 0, effect: "所持金1000億円失うか100億～150億円獲得確率7:3", usable: true },
  { name: "飴玉", rarity: "LR", rate: 0.25, price: 0, effect: "かみ砕けたら所持金2倍砕けなかったら所持金0.25倍確率0.5:9.5", usable: true },
  { name: "エナドリ", rarity: "LLR", rate: 0.05, price: 0, effect: "効果なし", usable: false }
];

// リーフガチャ専用アイテム
export const LEAF_GACHA_ITEMS = [
  { name: "芽吹きの葉", rarity: "N", rate: 0.35, price: 100, effect: "ー", description: "小さな若葉。始まりを象徴する、最初の一歩。" },
  { name: "まんまるキノコ", rarity: "N", rate: 0.30, price: 150, effect: "ー", description: "森の中で静かに光る丸いキノコ。触るとほんのり温かい。" },
  { name: "幸運のクローバー", rarity: "R", rate: 0.20, price: 300, effect: "運気が少しだけ上向く", description: "四つ葉の奇跡。運気が少しだけ上向く。" },
  { name: "風渡る稲穂", rarity: "SR", rate: 0.08, price: 600, effect: "ー", description: "黄金色に実る穂。努力と実りの象徴。" },
  { name: "風精の葉っぱ", rarity: "SR", rate: 0.05, price: 800, effect: "Bot内の待機時間を即時リセット", description: "風の精霊が宿る葉。吹き抜ける風のように軽やか。", usable: true },
  { name: "紅蓮のバラ", rarity: "SSR", rate: 0.015, price: 1200, effect: "ー", description: "情熱の象徴。見る者の心を奮い立たせる深紅の花。" },
  { name: "陽光のヒマワリ", rarity: "UR", rate: 0.004, price: 2000, effect: "ー", description: "太陽に向かって咲く、明るさと希望の象徴。" },
  { name: "翠玉のツタ", rarity: "LR", rate: 0.0008, price: 5000, effect: "ー", description: "神秘的なツタ。互いの心をつなぐ絆の象徴。" },
  { name: "夢咲くサクラ", rarity: "LR", rate: 0.00015, price: 7000, effect: "ー", description: "一瞬の輝きを永遠に残す夢の花。桜色に染まる空想。" },
  { name: "古代樹ユグドラシル", rarity: "LR", rate: 0.00005, price: 10000, effect: "ー", description: "世界を支える伝説の大樹。存在するだけで神聖な気配を放つ。" }
];

// デイリークエスト内容
export const DAILY_QUESTS = [
  { id: 1, description: "メッセージを5回送信する", key: "messages", goal: 5, reward: 10 },
  { id: 2, description: "ガチャを3回回す", key: "rolls", goal: 3, reward: 15 },
  { id: 3, description: "アイテムを1回売却する", key: "sell", goal: 1, reward: 20 }
];

// 職業定義
export const JOBS = {
  'programmer': {
    name: 'プログラマー',
    emoji: '💻',
    description: 'バグ取りで安定収入',
    baseReward: { min: 200, max: 400 },
    cooldown: 60, // 分
    levelUpRequirement: 10, // 昇進に必要な回数
    riskLevel: 'low',
    specialEvents: [
      { type: 'bonus', message: 'バグを完璧に修正！', bonus: 100 },
      { type: 'bonus', message: 'コードレビューで褒められた！', bonus: 150 },
      { type: 'penalty', message: 'デバッグに時間がかかった...', penalty: 50 }
    ]
  },
  'farmer': {
    name: '農家',
    emoji: '🌾',
    description: '収穫量で変動する収入',
    baseReward: { min: 100, max: 500 },
    cooldown: 45,
    levelUpRequirement: 8,
    riskLevel: 'medium',
    specialEvents: [
      { type: 'bonus', message: '大豊作！', bonus: 200 },
      { type: 'bonus', message: '新種の野菜が育った！', bonus: 100 },
      { type: 'penalty', message: '害虫の被害...', penalty: 80 }
    ]
  },
  'delivery': {
    name: '配達員',
    emoji: '🚚',
    description: '天候次第で変動',
    baseReward: { min: 150, max: 350 },
    cooldown: 30,
    levelUpRequirement: 12,
    riskLevel: 'medium',
    specialEvents: [
      { type: 'bonus', message: '好天候で効率アップ！', bonus: 100 },
      { type: 'bonus', message: 'チップをもらった！', bonus: 50 },
      { type: 'penalty', message: '雨で配達が遅れた...', penalty: 30 }
    ]
  },
  'investor': {
    name: '投資家',
    emoji: '📈',
    description: 'リスク大・リターン大',
    baseReward: { min: -500, max: 1000 },
    cooldown: 90,
    levelUpRequirement: 15,
    riskLevel: 'high',
    specialEvents: [
      { type: 'bonus', message: '株価が急上昇！', bonus: 300 },
      { type: 'bonus', message: 'インサイダー情報で大儲け！', bonus: 500 },
      { type: 'penalty', message: '市場が暴落...', penalty: 200 }
    ]
  },
  'streamer': {
    name: 'ストリーマー',
    emoji: '📺',
    description: '視聴者数次第で収入変動',
    baseReward: { min: 50, max: 700 },
    cooldown: 75,
    levelUpRequirement: 20,
    riskLevel: 'medium',
    specialEvents: [
      { type: 'bonus', message: 'バズって視聴者急増！', bonus: 200 },
      { type: 'bonus', message: 'スーパーチャット大量！', bonus: 150 },
      { type: 'penalty', message: '配信トラブルで視聴者減少...', penalty: 100 }
    ]
  },
  'adventurer': {
    name: '冒険者',
    emoji: '⚔️',
    description: '戦利品によって収入変動',
    baseReward: { min: 100, max: 800 },
    cooldown: 120,
    levelUpRequirement: 25,
    riskLevel: 'high',
    specialEvents: [
      { type: 'bonus', message: 'レアアイテムを発見！', bonus: 300 },
      { type: 'bonus', message: 'ボスを倒して大勝利！', bonus: 400 },
      { type: 'penalty', message: 'モンスターに負けて怪我...', penalty: 150 }
    ]
  },
  'gambler': {
    name: 'ギャンブラー',
    emoji: '🎰',
    description: '完全運ゲー',
    baseReward: { min: -2000, max: 2000 },
    cooldown: 60,
    levelUpRequirement: 30,
    riskLevel: 'extreme',
    specialEvents: [
      { type: 'bonus', message: 'ジャックポット当選！', bonus: 1000 },
      { type: 'bonus', message: '連続勝利で大儲け！', bonus: 800 },
      { type: 'penalty', message: '大負けして借金...', penalty: 500 }
    ]
  },
  'teacher': {
    name: '教師',
    emoji: '👨‍🏫',
    description: '授業の出来で収入変動',
    baseReward: { min: 200, max: 400 },
    cooldown: 90,
    levelUpRequirement: 15,
    riskLevel: 'low',
    specialEvents: [
      { type: 'bonus', message: '生徒に感謝された！', bonus: 100 },
      { type: 'bonus', message: '優秀な授業で評価アップ！', bonus: 120 },
      { type: 'penalty', message: '生徒が騒いで授業中断...', penalty: 60 }
    ]
  },
  'doctor': {
    name: '医者',
    emoji: '👨‍⚕️',
    description: '患者数次第で収入変動',
    baseReward: { min: 300, max: 600 },
    cooldown: 105,
    levelUpRequirement: 18,
    riskLevel: 'low',
    specialEvents: [
      { type: 'bonus', message: '難手術を成功！', bonus: 200 },
      { type: 'bonus', message: '患者から感謝状！', bonus: 100 },
      { type: 'penalty', message: '医療ミスで責任問題...', penalty: 150 }
    ]
  },
  'thief': {
    name: '盗賊',
    emoji: '🗡️',
    description: '失敗でペナルティ、成功で高収入',
    baseReward: { min: -200, max: 700 },
    cooldown: 45,
    levelUpRequirement: 12,
    riskLevel: 'high',
    specialEvents: [
      { type: 'bonus', message: '完璧な犯行で大成功！', bonus: 200 },
      { type: 'bonus', message: '貴重品を盗み出した！', bonus: 300 },
      { type: 'penalty', message: '捕まって罰金...', penalty: 100 }
    ]
  }
};

// 職業レベル定義
export const JOB_LEVELS = {
  1: { name: '見習い', multiplier: 1.0 },
  2: { name: '一般', multiplier: 1.2 },
  3: { name: '熟練', multiplier: 1.5 },
  4: { name: 'エキスパート', multiplier: 2.0 },
  5: { name: 'マスター', multiplier: 2.5 }
};

// スロットの絵柄定義
export const SLOT_SYMBOLS = [
  { name: "🍒", multiplier: 2, probability: 0.3 },    // チェリー - 30%
  { name: "🍋", multiplier: 3, probability: 0.2 },    // レモン - 20%
  { name: "🍊", multiplier: 4, probability: 0.15 },   // オレンジ - 15%
  { name: "🍇", multiplier: 5, probability: 0.1 },    // グレープ - 10%
  { name: "🍓", multiplier: 6, probability: 0.08 },   // ストロベリー - 8%
  { name: "🍎", multiplier: 8, probability: 0.05 },   // アップル - 5%
  { name: "💎", multiplier: 10, probability: 0.02 },  // ダイヤモンド - 2%
  { name: "⭐", multiplier: 15, probability: 0.01 },  // スター - 1%
  { name: "🎰", multiplier: 20, probability: 0.005 }, // スロット - 0.5%
  { name: "💰", multiplier: 50, probability: 0.001 } // マネー - 0.1%
];

// ボーナス絵柄
export const BONUS_SYMBOLS = [
  { name: "🎯", multiplier: 100, probability: 0.0001 }, // ターゲット - 0.01%
  { name: "🏆", multiplier: 200, probability: 0.00005 }, // トロフィー - 0.005%
  { name: "👑", multiplier: 500, probability: 0.00001 }  // クラウン - 0.001%
];
