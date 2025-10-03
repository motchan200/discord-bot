# 🤖 Discord Bot

Discord.jsを使用した多機能コミュニティボットです。ガチャ、カジノゲーム、職業システム、取引システムなどの楽しい機能を搭載しています。

## ✨ 主な機能

このDiscordボットは、サーバーメンバーが楽しめる様々なインタラクティブな機能を提供します。

### 🎰 ガチャシステム
- `/roll` - ガチャを回す
- レアリティ: N/R/SR/SSR/UR/LR
- 詫び石システム
- 確定ガチャと10連ガチャ

###  カジノゲーム
- **ブラックジャック** (`/blackjack`) - 1円以上のベット
- **バカラ** (`/baccarat`) - プレイヤー/バンカー/引き分け
- **シックボー** (`/sicbo`) - サイコロゲーム
- **スロットマシン** (`/slot`) - リール式スロット

### 💰 経済システム
- `/daily` - 日次ボーナス
- `/work` - バイトで稼ぐ
- `/allowance` - おこずかい機能（上限なし）
- `/trade` - アイテム取引
- `/auction` - オークションシステム

### 💼 職業システム
- `/job` - 10種類の職業選択
- レベルアップシステム
- 連続作業ボーナス
- 特殊イベント

## 🚀 セットアップ

### 1. リポジトリのクローン
```bash
git clone https://github.com/motchan200/-.git
cd discord-bot
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
`config.env.example`を参考に環境変数を設定してください：

```bash
# Discord Bot設定
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_server_guild_id_here
```

### 4. コマンドの登録
```bash
npm run register-commands
```

### 5. 起動
```bash
npm start
# または
npm run pm2:start
```

## 📁 プロジェクト構成

```
discord-bot/
├── src/                    # ソースコード
│   ├── index.js           # メインエントリーポイント
│   ├── config.js          # 設定データ
│   ├── database.js        # データベース操作
│   ├── commands.js        # コマンド定義
│   ├── events.js          # イベントハンドラー
│   ├── games.js           # ゲームロギック
│   ├── gacha.js           # ガチャシステム
│   ├── jobs.js            # 職業システム
│   ├── trading.js         # 取引システム
│   └── utils.js           # ユーティリティ
├── scripts/               # 実行スクリプト
│   ├── start.bat
│   ├── status.bat
│   └── stop.bat
├── config/                 # 設定ファイル（バックアップ）
├── README.md
├── SETUP.md
└── package.json
```

## 🎮 コマンド一覧

### 基本コマンド
- `/help` - ヘルプ表示
- `/status` - ステータス確認
- `/ranking` - ランキング表示

### ガチャ・アイテム
- `/roll [count]` - ガチャを回す
- `/items` - 所持アイテム表示
- `/iteminfo <name>` - アイテム詳細
- `/buy` - アイテム購入
- `/sell` - アイテム売却

### ゲーム
- `/blackjack bet:<金額>` - ブラックジャック
- `/baccarat bet:<金額> type:<タイプ>` - バカラ
- `/sicbo bet:<金額>` - シックボー
- `/slot bet:<金額>` - スロットマシン

### 職業・経済
- `/job action:<操作>` - 職業システム
- `/persone` - バイトで稼ぐ
- `/daily` - 日次ボーナス
- `/allowance user:<ユーザー> amount:<金額>` - おこずかい

### 取引システム
- `/trade action:<操作>` - 取引管理
- `/auction action:<操作>` - オークション管理

## 🔧 設定

### データベース
- SQLite3を使用
- 自動的にテーブル作成
- 履歴データの保存

### セキュリティ
- トークンは環境変数で管理
- `.gitignore`で機密ファイルを除外
- ベット額制限なし（上限設定削除済み）

## 📝 ライセンス

MIT License

## 🤝 貢献

1. フォークを作成
2. フィーチャーブランチを作成
3. 変更をコミット
4. ブランチにプッシュ
5. プルリクエストを作成

## ⚠️ 注意事項

- Discordの API利用規約を遵守してください
- 適切なレート制限を設定してください
- プライベートサーバーでの使用を推奨します

---

✨ **楽しいDiscord体験を提供するコミュニティボット！** ✨