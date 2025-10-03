# Discord Bot セットアップガイド

## 環境変数の設定

ボットを正常に動作させるために、`.env` ファイルを作成して以下の環境変数を設定してください。

### 1. `.env` ファイルの作成

`random-reply-bot` フォルダ内に `.env` ファイルを作成し、以下の内容を記入してください：

```env
# Discord Bot設定
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here

# オプション: 特定のサーバーでのみコマンドを登録したい場合
# GUILD_ID=your_guild_id_here
```

### 2. Discord Developer Portal での設定

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. あなたのアプリケーションを選択
3. **Bot** セクションで：
   - `Token` をコピーして `DISCORD_TOKEN` に設定
4. **General Information** セクションで：
   - `Application ID` をコピーして `CLIENT_ID` に設定

### 3. ボットの権限設定

ボットをサーバーに招待する際は、以下の権限を付与してください：

- `applications.commands` (スラッシュコマンド用)
- `Send Messages`
- `Use Slash Commands`
- `Embed Links`
- `Attach Files`
- `Read Message History`

### 4. 招待URLの生成

Discord Developer Portal の **OAuth2 > URL Generator** で以下のスコープを選択：
- `bot`
- `applications.commands`

### 5. ボットの起動

環境変数を設定後、以下のコマンドでボットを起動：

```bash
npm start
```

## トラブルシューティング

### スラッシュコマンドが表示されない場合

1. **環境変数の確認**
   - `.env` ファイルが正しく作成されているか
   - `DISCORD_TOKEN` と `CLIENT_ID` が正しく設定されているか

2. **ボットの権限確認**
   - ボットに `applications.commands` スコープが付与されているか
   - ボットがサーバーに正しく招待されているか

3. **コマンド登録の確認**
   - ボット起動時のログで「✅ スラッシュコマンド登録完了」が表示されているか
   - エラーメッセージが表示されていないか

### よくあるエラー

- **50001**: `applications.commands` スコープが不足
- **50013**: ボットの権限が不足
- **401**: トークンが無効または期限切れ

## 利用可能なコマンド

- `/roll` - ガチャを回す
- `/stock` - 株式システム
- `/bank` - 銀行システム
- `/trade` - 取引システム
- `/auction` - オークションシステム
- その他多数のコマンドが利用可能
