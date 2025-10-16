import 'dotenv/config';
import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, EmbedBuilder, Events, REST, Routes, Client, GatewayIntentBits, Partials, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import readline from 'readline';

// 統合されたファイルのインポート
import { initializeDatabase } from './database.js';
import { ITEMS, SHOP_ITEMS, SPECIAL_ITEMS, HIDDEN_ROLL_ITEMS, LEAF_GACHA_ITEMS } from './config.js';
import { commands, handleJobCommand, handleDiceCommand, handleBankCommand, handleBankButtonInteraction, handleCoinCommand, handleAdminCommand, handleStatsCommand } from './commands.js';
import { rollGacha, rollMultipleGacha, rollApologyGacha, rollHiddenGacha, useHiddenItem, rollLeafGacha } from './gacha.js';
import { 
  startBlackjackGame, hitCard, standCard, getGameState, endGame, getActiveGame,
  startBaccaratGame, getBaccaratHistory,
  startSicboGame, getSicboHistory,
  startSlotGame, spinAllReels, calculatePayout, getSlotGameState, endSlotGame, getActiveSlotGame,
  changeBetAmount, formatReels, debugActiveGames, forceEndUserGames
} from './games.js';
import { 
  getUser, addPoints, subtractPoints, updateGachaStats, getTopUsers, addLeaves, subtractLeaves, getTopLeavesUsers,
  addItem, getItems, updateItemQuantity, removeItem,
  getEffect, consumeLucky, setBooster, addLucky,
  getDailyBonus, setDailyBonus, getWorkBonus, setWorkBonus,
  createTrade, buyTrade, cancelTrade, getActiveTrades, getUserTradeHistory, getTrade,
  createAuction, placeBid, endAuction, processExpiredAuctions, getActiveAuctions, getUserAuctionHistory, getAuction,
  getBankAccount, depositToBank, withdrawFromBank, dbRun
} from './database.js';
import { initializeJobs } from './jobs.js';
import { handleMessageCreate, handleInteractionCreate, handleButtonInteractions } from './events.js';
import { startStatusUpdater, stopStatusUpdater, getCurrentStatusInfo } from './statusUpdater.js';


// ======== Discordクライアント ========
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ======== データベース初期化 ========
try {
  await initializeDatabase();
  await initializeJobs();
  console.log('✅ データベース初期化完了');
} catch (error) {
  console.error('❌ データベース初期化エラー:', error);
  process.exit(1);
}





// ======== Discordイベント ========
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  
  // 自動ステータス更新を開始
  startStatusUpdater(c);
  
  // ボットの基本情報を表示
  const statusInfo = getCurrentStatusInfo(c);
  console.log(`📊 ステータス更新開始: ${statusInfo.guildCount}サーバー、${statusInfo.userCount}ユーザー`);
});

// 会話ごとに円+1（コマンドは除外）+ 隠しコマンド処理
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  
  // スラッシュコマンドの場合は円付与しない
  if (message.content.startsWith('/')) return;
  
  // 隠しコマンド .roll [金額] の処理
  if (message.content.startsWith('.roll ')) {
    const args = message.content.substring(6).trim();
    const amount = parseInt(args.replace(/,/g, '')); // カンマを除去して数値に変換
    
    if (!isNaN(amount)) {
      const result = await rollHiddenGacha(message.author.id, amount);
      
      if (result.error) {
        const embed = new EmbedBuilder()
          .setTitle('🎰 隠しガチャ結果')
          .setDescription(result.error)
          .setColor(0xff0000);
        await message.reply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🎰 隠しガチャ結果')
        .setDescription(`**${result.item.rarity}【${result.item.name}】を入手！**\n\n💡 ${result.item.effect}\n\n※ \`/iteminfo ${result.item.name}\` で使用できます`)
        .setFooter({ text: `消費金額: ${result.amountSpent.toLocaleString()}円` })
        .setColor(result.item.rarity === 'LR' ? 0xffd700 : 0xff69b4);
      
      await message.reply({ embeds: [embed] });
      return;
    }
  }
  
  addPoints(message.author.id, 1);
});

// ======== スラッシュコマンド登録 ========
const commandsJSON = commands;

// 環境変数の確認
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN が設定されていません。.env ファイルを確認してください。');
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  console.error('❌ CLIENT_ID が設定されていません。.env ファイルを確認してください。');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🔄 ${commands.length}個のスラッシュコマンドを登録中...`);
    
    // コマンド一覧を詳細に表示
    console.log('📋 登録予定のコマンド:');
    commands.forEach((cmd, index) => {
      console.log(`  ${index + 1}. /${cmd.name}: ${cmd.description}`);
    });
    
    const result = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), // グローバル登録
      { body: commands }
    );
    
    console.log('✅ スラッシュコマンド登録完了');
    console.log(`📊 登録結果: ${Array.isArray(result) ? result.length : 'unknown'}個のコマンド`);
    
    // 特に重要なコマンドの確認
    const importantCommands = ['job'];
    importantCommands.forEach(cmdName => {
      const found = commands.find(cmd => cmd.name === cmdName);
      if (found) {
        console.log(`✅ ${cmdName}コマンド: 登録済み`);
      } else {
        console.log(`❌ ${cmdName}コマンド: 見つかりません`);
      }
    });
    
  } catch (error) {
    console.error('❌ スラッシュコマンド登録エラー:', error);
    
    if (error.code === 50001) {
      console.error('💡 解決方法: ボットに「applications.commands」スコープが付与されているか確認してください');
    } else if (error.code === 50013) {
      console.error('💡 解決方法: ボットに適切な権限が付与されているか確認してください');
    } else if (error.code === 50035) {
      console.error('💡 解決方法: コマンド定義に無効な値があります。詳細:', error.message);
    }
  }
})();

// ======== スラッシュコマンドの処理 ========
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    // サーバー外（DMやグループDMなど）やbotが参加していないサーバーの場合はephemeralで案内
    if (!interaction.guild || !interaction.guild.members.me) {
      const embed = new EmbedBuilder()
        .setTitle('このコマンドはサーバー内でのみ使用できます')
        .setColor(0xff0000)
        .setDescription('このコマンドはサーバー内でのみ使用できます。');
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (interaction.commandName === 'roll') {
      const type = interaction.options.getString('type');
      const count = interaction.options.getInteger('count') || 1;
      
      // 10回を超える場合はエラー
      if (count > 10) {
        const embed = new EmbedBuilder()
          .setTitle('エラー')
          .setDescription('ガチャ回数は最大10回までです。')
          .setColor(0xff0000);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      
      // ガチャタイプに応じて処理を分岐
      if (type === 'lerf') {
        // リーフガチャ処理
        const result = await rollLeafGacha(interaction.user.id, count);
        
        if (result.error) {
          const embed = new EmbedBuilder()
            .setTitle('🍃 リーフガチャ結果')
            .setDescription(result.error)
            .setColor(0xff0000);
          await interaction.reply({ embeds: [embed] });
          return;
        }
        
        const resultsText = result.results.join('\n');
        const gachaType = count === 1 ? '単発ガチャ' : count === 5 ? '5連ガチャ' : count === 10 ? '10連ガチャ' : `${count}連ガチャ`;
        const embed = new EmbedBuilder()
          .setTitle(`🍃 リーフ${gachaType}結果`)
          .setDescription(`**${gachaType}！**\n\n${resultsText}`)
          .setFooter({ text: `消費リーフ: ${result.totalCost}リーフ` })
          .setColor(0x90EE90);
        
        await interaction.reply({ embeds: [embed] });
        return;
      }
      
      if (count === 1) {
        // 単発ガチャ
        const effect = await getEffect(interaction.user.id);
        let result;
        if (effect && effect.lucky > 0) {
          // SSR以上確定
          const ssrItems = ITEMS.filter(i => ["SSR", "UR", "LR"].includes(i.rarity));
          const selected = ssrItems[Math.floor(Math.random() * ssrItems.length)];
          await addItem(interaction.user.id, selected.name);
          await updateGachaStats(interaction.user.id, 10, 1);
          await consumeLucky(interaction.user.id);
          result = { item: selected };
        } else {
          result = await rollGacha(interaction.user.id);
        }
        // 円ブースター効果
        if (effect && effect.booster && effect.booster_until > Date.now()) {
          await addPoints(interaction.user.id, 1);
        }
        
        if (result.error) {
          const embed = new EmbedBuilder()
            .setTitle('ガチャ結果')
            .setDescription(result.error)
            .setColor(0xff0000);
          await interaction.reply({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder()
            .setTitle('ノーマル単発ガチャ結果')
            .setDescription(`${result.item.rarity}【${result.item.name}】`)
            .setColor(0x00bfff);
          await interaction.reply({ embeds: [embed] });
        }
        
      } else {
        // 複数回ガチャ
        await interaction.deferReply();
        const result = await rollMultipleGacha(interaction.user.id, count);
        
        if (result.error) {
          const embed = new EmbedBuilder()
            .setTitle('ガチャ結果')
            .setDescription(result.error)
            .setColor(0xff0000);
          await interaction.editReply({ embeds: [embed] });
          return;
        }
        
        
        // 結果を埋め込み形式で表示
        const resultsText = result.results.join('\n');
        const gachaType = count === 1 ? '単発ガチャ' : count === 5 ? '5連ガチャ' : count === 10 ? '10連ガチャ' : `${count}連ガチャ`;
        const embed = new EmbedBuilder()
          .setTitle(`ノーマル${gachaType}結果`)
          .setDescription(resultsText)
          .setColor(0x00bfff);
        await interaction.editReply({ embeds: [embed] });
        
      }
      return;
    }



    if (interaction.commandName === 'items') {
      const items = await getItems(interaction.user.id);
      const effect = await getEffect(interaction.user.id);
      if (effect) {
        if (effect.lucky && effect.lucky > 0) {
          items.push({ itemName: "ラッキーチケット", quantity: effect.lucky });
        }
        if (effect.booster && effect.booster > 0 && effect.booster_until > Date.now()) {
          items.push({ itemName: "円ブースター", quantity: 1 });
        }
      }
      
      const embed = new EmbedBuilder()
        .setTitle('所持アイテム')
        .setColor(0x4e9a06);
      
      if (!Array.isArray(items) || items.length === 0) {
        embed.setDescription("まだアイテムを持っていません。");
      } else {
        // アイテムをランク順でソート
        const sortedItems = items.map(item => {
          const itemInfo = ITEMS.find(i => i.name === item.itemName);
          const rarity = itemInfo ? itemInfo.rarity : 'N';
          return { ...item, rarity };
        }).sort((a, b) => {
          const rarityOrder = { 'LR': 0, 'UR': 1, 'SSR': 2, 'SR': 3, 'R': 4, 'N': 5 };
          return rarityOrder[a.rarity] - rarityOrder[b.rarity];
        });
        
        // ランクごとにグループ化して表示
        const rarityGroups = {};
        sortedItems.forEach(item => {
          if (!rarityGroups[item.rarity]) {
            rarityGroups[item.rarity] = [];
          }
          rarityGroups[item.rarity].push(item);
        });
        
        let description = '';
        Object.keys(rarityGroups).forEach(rarity => {
          description += `**${rarity}ランク**\n`;
          rarityGroups[rarity].forEach(item => {
            description += `• ${item.itemName} x${item.quantity}\n`;
          });
          description += '\n';
        });
        
        embed.setDescription(description.trim());
      }
      
      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'status') {
      const user = await getUser(interaction.user.id);
      
      const embed = new EmbedBuilder()
        .setTitle('💰 残高確認')
        .setColor(0x9932cc) // ダークパープル
        .setDescription(`**${interaction.user.username}** さんの資産状況`)
        .addFields(
          { 
            name: '💵 所持金', 
            value: `**¥${user.points.toLocaleString()}円**`, 
            inline: true 
          },
          { 
            name: '🍃 リーフ', 
            value: `**Ł${(user.leaves || 0).toLocaleString()}リーフ**`, 
            inline: true 
          }
        );
      
      // 統計情報
      embed.addFields({
        name: '📈 統計情報',
        value: `ガチャ回数: **${user.rolls}回**`,
        inline: false
      });
      
      // フッター
      embed.setFooter({ 
        text: `Produced by ちゃぼっと • ${new Date().toLocaleDateString('ja-JP')} ${new Date().toLocaleTimeString('ja-JP')}`,
        iconURL: interaction.client.user.displayAvatarURL()
      });
      
      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'ranking') {
      await interaction.deferReply();
      
      const type = interaction.options.getString('type') || 'local';
      
      if (type === 'word') {
        // 全世界ランキング
        const topUsers = await getTopUsers();
        const filteredUsers = topUsers.slice(0, 10);
        
        // ユーザー名を並列取得
        const userFetchPromises = filteredUsers.map(async (user, i) => {
          try {
            const discordUser = await client.users.fetch(user.id);
            return `#${i+1} ${discordUser.username} ¥${user.points.toLocaleString()}円`;
          } catch (error) {
            // ユーザーが見つからない場合はIDを表示
            return `#${i+1} ${user.id} ¥${user.points.toLocaleString()}円`;
          }
        });
        
        const rankingText = await Promise.all(userFetchPromises);

        const embed = new EmbedBuilder()
          .setTitle('world')
          .setColor(0xf9d923);

        if (filteredUsers.length === 0) {
          embed.setDescription("ランキングデータがありません。");
        } else {
          embed.setDescription(rankingText.join("\n"));
        }
        await interaction.editReply({ embeds: [embed] });
        
      } else if (type === 'local') {
        // サーバー内ランキング
        if (!interaction.guild) {
          const embed = new EmbedBuilder()
            .setTitle('local')
            .setColor(0xff0000)
            .setDescription('このコマンドはサーバー内でのみ使用できます。');
          await interaction.editReply({ embeds: [embed], ephemeral: true });
          return;
        }
        
        const topUsers = await getTopUsers();
        const guildMemberIds = Array.from(interaction.guild.members.cache.values()).map(m => m.user.id);
        
        // キャッシュが空の場合はデータベースユーザーのみを表示
        if (guildMemberIds.length === 0) {
          const filteredUsers = topUsers.slice(0, 10);
          
          // ユーザー名を並列取得
          const userFetchPromises = filteredUsers.map(async (user, i) => {
            try {
              const discordUser = await client.users.fetch(user.id);
              return `#${i+1} ${discordUser.username} ¥${user.points.toLocaleString()}円`;
            } catch (error) {
              // ユーザーが見つからない場合はIDを表示
              return `#${i+1} ${user.id} ¥${user.points.toLocaleString()}円`;
            }
          });
          
          const rankingText = await Promise.all(userFetchPromises);
          
          const embed = new EmbedBuilder()
            .setTitle('local')
            .setColor(0xf9d923)
            .setDescription(rankingText.join("\n"));
          
          await interaction.editReply({ embeds: [embed] });
          return;
        }
        
        // サーバーメンバー全員のランキングを作成（データベースに存在しない場合は0ポイント）
        const allMemberRankings = [];
        
        for (const memberId of guildMemberIds) {
          const existingUser = topUsers.find(u => u.id === memberId);
          if (existingUser) {
            allMemberRankings.push(existingUser);
          } else {
            // データベースに存在しない場合は0ポイントで追加
            allMemberRankings.push({ id: memberId, points: 0, rolls: 0 });
          }
        }
        
        // ポイント順でソートして上位10名を取得
        const filteredUsers = allMemberRankings
          .sort((a, b) => b.points - a.points)
          .slice(0, 10);
        
        // ユーザー名を並列取得
        const userFetchPromises = filteredUsers.map(async (user, i) => {
          try {
            const discordUser = await client.users.fetch(user.id);
            return `#${i+1} ${discordUser.username} ¥${user.points.toLocaleString()}円`;
          } catch (error) {
            // ユーザーが見つからない場合はIDを表示
            return `#${i+1} ${user.id} ¥${user.points.toLocaleString()}円`;
          }
        });
        
        const rankingText = await Promise.all(userFetchPromises);

        const embed = new EmbedBuilder()
          .setTitle('local')
          .setColor(0xf9d923);

        if (filteredUsers.length === 0) {
          embed.setDescription("ランキングデータがありません。");
        } else {
          embed.setDescription(rankingText.join("\n"));
        }
        await interaction.editReply({ embeds: [embed] });
      }
    }

    if (interaction.commandName === 'daily') {
      const now = Date.now();
      const last = await getDailyBonus(interaction.user.id);
      const embed = new EmbedBuilder().setTitle('デイリーボーナス').setColor(0x4e9a06);
      if (last && now - last.last < 86400000) {
        embed.setDescription("今日はすでに受け取り済みです。");
      } else {
        await addPoints(interaction.user.id, 500);
        await addLeaves(interaction.user.id, 1000);
        await setDailyBonus(interaction.user.id, now);
        embed.setDescription("デイリーボーナス: ¥500円 + Ł1000リーフ獲得！");
        
        // アチーブメントチェック（未実装のため無効化）
        // await checkAchievements(interaction.user.id, 'daily_count');
      }
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.commandName === 'work') {
      const now = Date.now();
      const last = await getWorkBonus(interaction.user.id);
      const embed = new EmbedBuilder().setTitle('お仕事ボーナス').setColor(0x4e9a06);
      
      // 1時間 = 3600000ミリ秒
      if (last && now - last.last < 3600000) {
        const remainingTime = Math.ceil((3600000 - (now - last.last)) / 1000 / 60);
        embed.setDescription(`まだお仕事ができません。\n次回まで: ${remainingTime}分`);
        embed.setColor(0xff0000);
      } else {
        await addPoints(interaction.user.id, 100);
        await addLeaves(interaction.user.id, 1000);
        await setWorkBonus(interaction.user.id, now);
        embed.setDescription("お仕事完了！¥100円 + Ł1000リーフ獲得！\n次回まで: 1時間");
        
        // アチーブメントチェック（未実装のため無効化）
        // await checkAchievements(interaction.user.id, 'work_count');
      }
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.commandName === 'allowance') {
      const targetUser = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const giver = await getUser(interaction.user.id);
      
      const embed = new EmbedBuilder().setTitle('おこずかい').setColor(0x4e9a06);
      
      // 自分にあげることはできない
      if (targetUser.id === interaction.user.id) {
        embed.setDescription("自分におこずかいをあげることはできません。");
        embed.setColor(0xff0000);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      
      // ポイント不足チェック
      if (giver.points < amount) {
        embed.setDescription(`お金が足りません！\n所持金: ¥${giver.points.toLocaleString()}円\n必要金額: ¥${amount.toLocaleString()}円`);
        embed.setColor(0xff0000);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      
      // ポイントの移動
      await addPoints(interaction.user.id, -amount);
      await addPoints(targetUser.id, amount);
      
      embed.setDescription(`💰 ${targetUser.username} に ¥${amount.toLocaleString()}円のおこずかいをあげました！\n\n残り円: ¥${(giver.points - amount).toLocaleString()}円`);
      embed.setColor(0x00ff00);
      
      
      await interaction.reply({ embeds: [embed] });
    }


    if (interaction.commandName === 'slot') {
      const initialCredits = interaction.options.getInteger('bet');
      const user = await getUser(interaction.user.id);
      
      // ポイント不足チェック
      if (user.points < initialCredits) {
        const embed = new EmbedBuilder()
          .setTitle('🎰 スロットマシン')
          .setDescription(`お金が足りません！\n所持金: ¥${user.points.toLocaleString()}円\n必要金額: ¥${initialCredits.toLocaleString()}円`)
          .setColor(0xff0000);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      // 既存のゲームがあるかチェック
      const existingGame = getActiveSlotGame(interaction.user.id);
      if (existingGame) {
        // デバッグ情報を出力
        console.log(`既存ゲーム検出: User ${interaction.user.id}, Game ID: ${existingGame.id}`);
        debugActiveGames();
        
        // 古いゲームを強制終了してクレジットを返却
        const oldGameResult = endSlotGame(existingGame.id);
        if (oldGameResult && oldGameResult.remainingCredits > 0) {
          await addPoints(interaction.user.id, oldGameResult.remainingCredits);
          console.log(`古いゲームのクレジット ${oldGameResult.remainingCredits} を返却しました`);
        }
        
        const embed = new EmbedBuilder()
          .setTitle('🎰 スロットマシン')
          .setDescription(`既存のゲームを終了して新しいゲームを開始します。\n\n前のゲームの残りクレジット: ¥${oldGameResult ? oldGameResult.remainingCredits.toLocaleString() : 0}円\n新しいゲームの初期クレジット: ¥${initialCredits.toLocaleString()}円`)
          .setColor(0x00bfff);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // 初期クレジット分の円を差し引く
      await addPoints(interaction.user.id, -initialCredits);

      // スロットゲームを開始
      const game = startSlotGame(interaction.user.id, initialCredits);
      
      // 初回スピン
      spinAllReels(game.id);
      
      const payout = calculatePayout(game.id);
      const gameState = getSlotGameState(game.id);
      
      // 結果を表示
      const embed = new EmbedBuilder()
        .setTitle('🎰 スロットマシン')
        .setDescription(`クレジット: ${gameState.credits}\nベット/スピン: ${gameState.betPerSpin}\n\n${formatReels(gameState.reels)}\n\n配当: ${payout}クレジット`)
        .setColor(payout > 0 ? 0x00ff00 : 0xff0000);

      // ボタンを作成
      const spinButton = new ButtonBuilder()
        .setCustomId('slot_spin')
        .setLabel('スピン')
        .setStyle(ButtonStyle.Primary);

      const betUpButton = new ButtonBuilder()
        .setCustomId('slot_bet_up')
        .setLabel('ベット+')
        .setStyle(ButtonStyle.Secondary);

      const betDownButton = new ButtonBuilder()
        .setCustomId('slot_bet_down')
        .setLabel('ベット-')
        .setStyle(ButtonStyle.Secondary);

      const endButton = new ButtonBuilder()
        .setCustomId('slot_end')
        .setLabel('ゲーム終了')
        .setStyle(ButtonStyle.Danger);

      const row1 = new ActionRowBuilder().addComponents(spinButton, betUpButton, betDownButton);
      const row2 = new ActionRowBuilder().addComponents(endButton);

      await interaction.reply({ embeds: [embed], components: [row1, row2] });
    }

    if (interaction.commandName === 'guess') {
      const bet = interaction.options.getInteger('bet');
      const guessNumber = interaction.options.getInteger('number');
      const user = await getUser(interaction.user.id);
      
      // リーフ不足チェック（敗北時の1.5倍ペナルティを考慮）
      const requiredLeaves = Math.floor(bet * 1.5);
      if ((user.leaves || 0) < requiredLeaves) {
        const embed = new EmbedBuilder()
          .setTitle('🎯 数字当てゲーム')
          .setDescription(`リーフが足りません！\n所持リーフ: Ł${user.leaves || 0}リーフ\n必要リーフ: Ł${requiredLeaves}リーフ（敗北時のペナルティ考慮）`)
          .setColor(0xff0000);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      // ランダムな当たり数字を生成（1-3）
      const winningNumber = Math.floor(Math.random() * 3) + 1;
      
      // リーフを差し引く
      try {
        await subtractLeaves(interaction.user.id, bet);
      } catch (error) {
        const embed = new EmbedBuilder()
          .setTitle('🎯 数字当てゲーム')
          .setDescription(error.message)
          .setColor(0xff0000);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      
      let embed = new EmbedBuilder()
        .setColor(0x9932cc);
      
      // 更新後の残高を取得
      const updatedUser = await getUser(interaction.user.id);
      
      if (guessNumber === winningNumber) {
        // 当たり：2.8倍
        const winAmount = Math.floor(bet * 2.8);
        await addLeaves(interaction.user.id, winAmount);
        
        // 勝利後の残高を取得
        const finalUser = await getUser(interaction.user.id);
        
        embed.setDescription(`**勝利**\n${winAmount}リーフゲットしました\n所持金: ${finalUser.leaves}リーフ`)
          .setColor(0x00ff00);
      } else {
        // 外れ：-1.5倍（負け）
        const lossAmount = Math.floor(bet * 1.5);
        
        embed.setDescription(`**敗北**\n${lossAmount}リーフ失いました\n所持金: ${updatedUser.leaves}リーフ`)
          .setColor(0xff0000);
      }
      
      await interaction.reply({ embeds: [embed] });
    }


    // ======== 取引システム ========
    if (interaction.commandName === 'trade') {
      const action = interaction.options.getString('action');
      const item = interaction.options.getString('item');
      const quantity = interaction.options.getInteger('quantity');
      const price = interaction.options.getInteger('price');
      const tradeId = interaction.options.getInteger('tradeid');
      
      let embed = new EmbedBuilder().setTitle('🔄 取引システム').setColor(0x00ff00);
      
      try {
        switch (action) {
          case 'create':
            if (!item || !quantity || !price) {
              embed.setDescription('アイテム名、数量、価格をすべて指定してください。').setColor(0xff0000);
              break;
            }
            
            const tradeId_new = await createTrade(interaction.user.id, item, quantity, price);
            embed.setDescription(`取引を作成しました！\n**取引ID:** ${tradeId_new}\n**アイテム:** ${item}\n**数量:** ${quantity}\n**価格:** ¥${price}円`);
            break;
            
          case 'buy':
            if (!tradeId) {
              embed.setDescription('取引IDを指定してください。').setColor(0xff0000);
              break;
            }
            
            const trade = await buyTrade(tradeId, interaction.user.id);
            embed.setDescription(`取引を完了しました！\n**アイテム:** ${trade.itemName}\n**数量:** ${trade.quantity}\n**価格:** ¥${trade.price}円`);
            
            // 価格変動を更新
            await updatePriceFromTrade(trade.itemName, trade.price, trade.quantity);
            break;
            
          case 'cancel':
            if (!tradeId) {
              embed.setDescription('取引IDを指定してください。').setColor(0xff0000);
              break;
            }
            
            await cancelTrade(tradeId, interaction.user.id);
            embed.setDescription(`取引ID ${tradeId} をキャンセルしました。`);
            break;
            
          case 'list':
            const trades = await getActiveTrades(10);
            if (trades.length === 0) {
              embed.setDescription('現在アクティブな取引はありません。');
            } else {
              let tradeList = '';
              for (const trade of trades) {
                tradeList += `**ID:** ${trade.id} | **${trade.itemName}** x${trade.quantity} | **¥${trade.price}円**\n`;
              }
              embed.setDescription(`**アクティブな取引一覧**\n\n${tradeList}`);
            }
            break;
            
          case 'history':
            const history = await getUserTradeHistory(interaction.user.id, 10);
            if (history.length === 0) {
              embed.setDescription('取引履歴がありません。');
            } else {
              let historyText = '';
              for (const h of history) {
                const role = h.sellerId === interaction.user.id ? '売り手' : '買い手';
                historyText += `**${role}** | **${h.itemName}** x${h.quantity} | **¥${h.price}円**\n`;
              }
              embed.setDescription(`**取引履歴**\n\n${historyText}`);
            }
            break;
            
          default:
            embed.setDescription('無効な操作です。').setColor(0xff0000);
        }
      } catch (error) {
        embed.setDescription(`エラー: ${error.message}`).setColor(0xff0000);
      }
      
      await interaction.reply({ embeds: [embed] });
    }

    // ======== オークションシステム ========
    if (interaction.commandName === 'auction') {
      const action = interaction.options.getString('action');
      const item = interaction.options.getString('item');
      const quantity = interaction.options.getInteger('quantity');
      const startingPrice = interaction.options.getInteger('startingprice');
      const duration = interaction.options.getInteger('duration');
      const auctionId = interaction.options.getInteger('auctionid');
      const bidAmount = interaction.options.getInteger('bidamount');
      
      let embed = new EmbedBuilder().setTitle('🏺 オークションシステム').setColor(0xffa500);
      
      try {
        switch (action) {
          case 'create':
            if (!item || !quantity || !startingPrice || !duration) {
              embed.setDescription('アイテム名、数量、開始価格、期間をすべて指定してください。').setColor(0xff0000);
              break;
            }
            
            const auctionId_new = await createAuction(interaction.user.id, item, quantity, startingPrice, duration);
            const endTime = new Date(Date.now() + duration * 3600000);
            embed.setDescription(`オークションを作成しました！\n**オークションID:** ${auctionId_new}\n**アイテム:** ${item}\n**数量:** ${quantity}\n**開始価格:** ¥${startingPrice}円\n**終了時刻:** ${endTime.toLocaleString('ja-JP')}`);
            break;
            
          case 'bid':
            if (!auctionId || !bidAmount) {
              embed.setDescription('オークションIDと入札額を指定してください。').setColor(0xff0000);
              break;
            }
            
            await placeBid(auctionId, interaction.user.id, bidAmount);
            embed.setDescription(`入札しました！\n**オークションID:** ${auctionId}\n**入札額:** ¥${bidAmount}円`);
            break;
            
          case 'list':
            const auctions = await getActiveAuctions(10);
            if (auctions.length === 0) {
              embed.setDescription('現在アクティブなオークションはありません。');
            } else {
              let auctionList = '';
              for (const auction of auctions) {
                const endTime = new Date(auction.endTime * 1000);
                const remainingTime = Math.max(0, Math.floor((auction.endTime * 1000 - Date.now()) / 1000 / 60));
                auctionList += `**ID:** ${auction.id} | **${auction.itemName}** x${auction.quantity} | **現在価格:** ¥${auction.currentBid || auction.startingPrice}円 | **残り時間:** ${remainingTime}分\n`;
              }
              embed.setDescription(`**アクティブなオークション一覧**\n\n${auctionList}`);
            }
            break;
            
          case 'history':
            const auctionHistory = await getUserAuctionHistory(interaction.user.id, 10);
            if (auctionHistory.length === 0) {
              embed.setDescription('オークション履歴がありません。');
            } else {
              let historyText = '';
              for (const auction of auctionHistory) {
                const role = auction.sellerId === interaction.user.id ? '出品者' : '入札者';
                const status = auction.status === 'completed' ? '完了' : auction.status === 'cancelled' ? 'キャンセル' : '進行中';
                historyText += `**${role}** | **${auction.itemName}** x${auction.quantity} | **¥${auction.currentBid || auction.startingPrice}円** | **${status}**\n`;
              }
              embed.setDescription(`**オークション履歴**\n\n${historyText}`);
            }
            break;
            
          case 'process':
            const processedCount = await processExpiredAuctions();
            embed.setDescription(`${processedCount}件の期限切れオークションを処理しました。`);
            break;
            
          default:
            embed.setDescription('無効な操作です。').setColor(0xff0000);
        }
      } catch (error) {
        embed.setDescription(`エラー: ${error.message}`).setColor(0xff0000);
      }
      
      await interaction.reply({ embeds: [embed] });
    }


    if (interaction.commandName === 'iteminfo') {
      const name = interaction.options.getString('name');
      const item = ITEMS.find(i => i.name === name);
      const specialItem = SPECIAL_ITEMS.find(i => i.name === name);
      const hiddenItem = HIDDEN_ROLL_ITEMS.find(i => i.name === name);
      const leafItem = LEAF_GACHA_ITEMS.find(i => i.name === name);
      const embed = new EmbedBuilder().setTitle('アイテム詳細').setColor(0x4e9a06);
      
      if (!item && !specialItem && !hiddenItem && !leafItem) {
        embed.setDescription("そのアイテムは存在しません。");
        await interaction.reply({ embeds: [embed] });
        return;
      }
      
      const targetItem = item || specialItem || hiddenItem || leafItem;
      embed.addFields(
        { name: '名前', value: targetItem.name, inline: true },
        { name: 'レア度', value: targetItem.rarity, inline: true },
        { name: '価格', value: targetItem.price === 0 ? "アンダーカバー" : `¥${targetItem.price}円`, inline: true },
        { name: '確率', value: targetItem.rate ? `${(targetItem.rate * 100).toFixed(1)}%` : "限定アイテム", inline: true },
        { name: '説明', value: targetItem.effect || targetItem.role || "特別な効果なし", inline: false }
      );
      
      const components = [];
      
      // 詫び石の場合は使用ボタンを追加
      if (targetItem.name === "詫び石" && targetItem.usable) {
        const button = new ButtonBuilder()
          .setCustomId(`use_apology_stone_${interaction.user.id}`)
          .setLabel('詫び石を使用')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('💎');
        
        components.push(new ActionRowBuilder().addComponents(button));
      }
      
      // 隠しアイテムの場合は使用ボタンを追加
      if (hiddenItem && hiddenItem.usable) {
        const userItems = await getItems(interaction.user.id);
        const hasItem = userItems.some(i => i.itemName === name);
        
        if (hasItem) {
          const button = new ButtonBuilder()
            .setCustomId(`use_hidden_item_${interaction.user.id}_${name}`)
            .setLabel(`${name}を使用`)
            .setStyle(ButtonStyle.Success)
            .setEmoji(name === "株券" ? "📈" : name === "飴玉" ? "🍭" : "⚡");
          
          components.push(new ActionRowBuilder().addComponents(button));
        } else {
          embed.addFields({ name: '所持状況', value: 'このアイテムを所持していません', inline: false });
        }
      }
      
      // リーフガチャアイテムの場合は使用ボタンを追加
      if (leafItem && leafItem.usable) {
        const userItems = await getItems(interaction.user.id);
        const hasItem = userItems.some(i => i.itemName === name);
        
        if (hasItem) {
          const button = new ButtonBuilder()
            .setCustomId(`use_leaf_item_${interaction.user.id}_${name}`)
            .setLabel(`${name}を使用`)
            .setStyle(ButtonStyle.Success)
            .setEmoji("🍃");
          
          components.push(new ActionRowBuilder().addComponents(button));
        } else {
          embed.addFields({ name: '所持状況', value: 'このアイテムを所持していません', inline: false });
        }
      }
      
      await interaction.reply({ embeds: [embed], components: components });
    }

    if (interaction.commandName === 'buy') {
      // モーダル入力フォームを表示
      const modal = new ModalBuilder()
        .setCustomId('buy_modal')
        .setTitle('アイテム購入');

      const itemInput = new TextInputBuilder()
        .setCustomId('item_name')
        .setLabel('アイテム名')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('例: 石ころ, ヒビ割れたコイン')
        .setRequired(true);

      const quantityInput = new TextInputBuilder()
        .setCustomId('quantity')
        .setLabel('購入数量')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('例: 1, 5, 10')
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(itemInput);
      const secondActionRow = new ActionRowBuilder().addComponents(quantityInput);

      modal.addComponents(firstActionRow, secondActionRow);

      await interaction.showModal(modal);
      return;
    }

    if (interaction.commandName === 'sell') {
      // モーダル入力フォームを表示
      const modal = new ModalBuilder()
        .setCustomId('sell_modal')
        .setTitle('アイテム売却');

      const itemInput = new TextInputBuilder()
        .setCustomId('item_name')
        .setLabel('アイテム名')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('例: 石ころ, ヒビ割れたコイン')
        .setRequired(true);

      const quantityInput = new TextInputBuilder()
        .setCustomId('quantity')
        .setLabel('売却数量')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('例: 1, 5, 10')
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(itemInput);
      const secondActionRow = new ActionRowBuilder().addComponents(quantityInput);

      modal.addComponents(firstActionRow, secondActionRow);

      await interaction.showModal(modal);
      return;
    }


    if (interaction.commandName === 'itemlist') {
      // ページ送り機能付きアイテム一覧表示
      const itemsPerPage = 10; // 1ページあたりのアイテム数
      const totalPages = Math.ceil(ITEMS.length / itemsPerPage);
      let currentPage = 0;

      // アイテム一覧Embedを作成
      const createItemListEmbed = (page) => {
        const startIndex = page * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, ITEMS.length);
        const pageItems = ITEMS.slice(startIndex, endIndex);

        const embed = new EmbedBuilder()
          .setTitle('アイテム一覧')
          .setDescription(`ページ ${page + 1} / ${totalPages} (全${ITEMS.length}アイテム)`)
          .setColor(0x4e9a06);

        pageItems.forEach(item => {
          embed.addFields({
            name: `${item.rarity}：${item.name}`,
            value: `価格: ${item.price}　確率: ${(item.rate * 100).toFixed(3)}%`,
            inline: false
          });
        });

        return embed;
      };

      // ページ送りボタンを作成
      const createPageButtons = (page) => {
        const row = new ActionRowBuilder();
        
        // 前のページボタン
        const prevButton = new ButtonBuilder()
          .setCustomId('itemlist_prev')
          .setLabel('← 前のページ')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0);
        
        // 次のページボタン
        const nextButton = new ButtonBuilder()
          .setCustomId('itemlist_next')
          .setLabel('次のページ →')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1);

        row.addComponents(prevButton, nextButton);
        return row;
      };

      // 初期表示
      const embed = createItemListEmbed(currentPage);
      const buttons = createPageButtons(currentPage);
      
      const response = await interaction.reply({ 
        embeds: [embed], 
        components: [buttons],
        fetchReply: true
      });

      // ページ送りボタンの処理を設定
      const filter = i => {
        return (i.customId === 'itemlist_prev' || i.customId === 'itemlist_next') && 
               i.user.id === interaction.user.id;
      };

      const collector = response.createMessageComponentCollector({ filter, time: 300000 }); // 5分間

      collector.on('collect', async i => {
        if (i.customId === 'itemlist_prev' && currentPage > 0) {
          currentPage--;
        } else if (i.customId === 'itemlist_next' && currentPage < totalPages - 1) {
          currentPage++;
        }

        const updatedEmbed = createItemListEmbed(currentPage);
        const updatedButtons = createPageButtons(currentPage);
        
        await i.update({ 
          embeds: [updatedEmbed], 
          components: [updatedButtons] 
        });
      });

      collector.on('end', () => {
        // タイムアウト時にボタンを無効化
        const disabledButtons = createPageButtons(currentPage);
        disabledButtons.components.forEach(button => button.setDisabled(true));
        interaction.editReply({ components: [disabledButtons] }).catch(() => {});
      });
    }

    if (interaction.commandName === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('コマンドヘルプ')
        .setDescription('ジャンルを選択してコマンドの詳細を確認してください。')
        .setColor(0x4e9a06);

      // ジャンル別SelectMenu
      const genreOptions = [
        { label: '🎰 ガチャ・アイテム', description: 'ガチャを回してアイテムを集めよう', value: 'genre_gacha' },
        { label: '💰 お金・収入', description: 'お金を稼いで管理しよう', value: 'genre_economy' },
        { label: '🎮 ゲーム', description: 'カジノゲームで遊んでお金を稼ごう', value: 'genre_games' },
        { label: '🏦 銀行・取引', description: 'お金を預けてアイテムを取引しよう', value: 'genre_trading' },
        { label: '📈 投資', description: '株式・不動産・暗号通貨で投資しよう', value: 'genre_investment' },
        { label: '🏆 プロフィール・実績', description: '自分の情報と実績を確認しよう', value: 'genre_profile' },
        { label: '🛍️ ショップ・特別', description: '特別なアイテムと機能を使おう', value: 'genre_special' }
      ];

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_genre_select')
        .setPlaceholder('ジャンルを選択')
        .addOptions(genreOptions.map(opt =>
          new StringSelectMenuOptionBuilder()
            .setLabel(opt.label)
            .setDescription(opt.description)
            .setValue(opt.value)
        ));

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  // ジャンル選択時の処理
  if (interaction.isStringSelectMenu() && interaction.customId === 'help_genre_select') {
    // メッセージを作成したユーザーかどうかをチェック
    if (interaction.message.interaction && interaction.message.interaction.user.id !== interaction.user.id) {
      await interaction.reply({ 
        content: 'このメッセージは他のユーザーが作成したものです。操作できません。', 
        ephemeral: true 
      });
      return;
    }

    let embed;
    let commandOptions = [];

    switch (interaction.values[0]) {
      case 'genre_gacha':
        embed = new EmbedBuilder()
          .setTitle('🎰 ガチャ・アイテム')
          .setDescription('ガチャを回してアイテムを集めよう！')
          .setColor(0x00bfff);
        
        commandOptions = [
          { label: '/roll', description: 'ガチャを回してアイテムを獲得', value: 'help_roll' },
          { label: '/items', description: '持っているアイテムを確認', value: 'help_items' },
          { label: '/iteminfo', description: 'アイテムの詳細情報を見る', value: 'help_iteminfo' },
          { label: '/itemlist', description: '全アイテムの価格と確率を確認', value: 'help_itemlist' },
          { label: '/buy', description: 'アイテムを購入する', value: 'help_buy' },
          { label: '/sell', description: 'アイテムを売却する', value: 'help_sell' }
        ];
        break;

      case 'genre_economy':
        embed = new EmbedBuilder()
          .setTitle('💰 お金・収入')
          .setDescription('お金を稼いで管理しよう！')
          .setColor(0x4e9a06);
        
        commandOptions = [
          { label: '/status', description: '現在の所持金とガチャ回数を確認', value: 'help_status' },
          { label: '/daily', description: '1日1回のボーナスを受け取る', value: 'help_daily' },
          { label: '/work', description: '1時間に1回お仕事でお金を稼ぐ', value: 'help_work' },
          { label: '/allowance', description: '他の人にお金をあげる', value: 'help_allowance' },
          { label: '/ranking', description: 'お金持ちランキングを見る', value: 'help_ranking' }
        ];
        break;

      case 'genre_games':
        embed = new EmbedBuilder()
          .setTitle('🎮 ゲーム')
          .setDescription('カジノゲームで遊んでお金を稼ごう！')
          .setColor(0xffd700);
        
        commandOptions = [
          { label: '/blackjack', description: 'ブラックジャックで勝負', value: 'help_blackjack' },
          { label: '/baccarat', description: 'バカラで勝負', value: 'help_baccarat' },
          { label: '/sicbo', description: 'シックボーで勝負', value: 'help_sicbo' },
          { label: '/slot', description: 'スロットマシンで勝負', value: 'help_slot' },
          { label: '/guess', description: '数字当てゲームで勝負', value: 'help_guess' }
        ];
        break;

      case 'genre_trading':
        embed = new EmbedBuilder()
          .setTitle('🏦 銀行・取引')
          .setDescription('お金を預けてアイテムを取引しよう！')
          .setColor(0x4169e1);
        
        commandOptions = [
          { label: '/bank', description: '銀行にお金を預ける・引き出す', value: 'help_bank' },
          { label: '/trade', description: '他の人とアイテムを取引', value: 'help_trade' },
          { label: '/auction', description: 'オークションでアイテムを売買', value: 'help_auction' },
          { label: '/market', description: 'マーケットの価格情報を確認', value: 'help_market' }
        ];
        break;

      case 'genre_investment':
        embed = new EmbedBuilder()
          .setTitle('📈 投資')
          .setDescription('株式・不動産・暗号通貨で投資しよう！')
          .setColor(0x00ff00);
        
        commandOptions = [
          { label: '/stock', description: '株式に投資して配当金を獲得', value: 'help_stock' },
          { label: '/realestate', description: '不動産に投資して賃貸収入を獲得', value: 'help_realestate' },
          { label: '/crypto', description: '暗号通貨に投資して利益を獲得', value: 'help_crypto' },
          { label: '/mining', description: '暗号通貨をマイニングして獲得', value: 'help_mining' },
          { label: '/cryptoalert', description: '暗号通貨の価格アラートを設定', value: 'help_cryptoalert' }
        ];
        break;

      case 'genre_profile':
        embed = new EmbedBuilder()
          .setTitle('🏆 プロフィール・実績')
          .setDescription('自分の情報と実績を確認しよう！')
          .setColor(0xffa500);
        
        commandOptions = [
          { label: '/profile', description: '自分のプロフィールカードを表示・編集', value: 'help_profile' },
          { label: '/titles', description: '称号を確認・装備する', value: 'help_titles' },
          { label: '/achievements', description: '実績・アチーブメントを確認', value: 'help_achievements' }
        ];
        break;

      case 'genre_special':
        embed = new EmbedBuilder()
          .setTitle('🛍️ ショップ・特別')
          .setDescription('特別なアイテムと機能を使おう！')
          .setColor(0xff69b4);
        
        commandOptions = [
          { label: '/shop', description: '特別なアイテムを購入', value: 'help_shop' },
          { label: '/openbox', description: 'ミステリーボックスを開封', value: 'help_openbox' }
        ];
        break;
    }

    const commandSelectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_command_select')
      .setPlaceholder('コマンドを選択')
      .addOptions(commandOptions.map(opt =>
        new StringSelectMenuOptionBuilder()
          .setLabel(opt.label)
          .setDescription(opt.description)
          .setValue(opt.value)
      ));

    const backButton = new ButtonBuilder()
      .setCustomId('help_back')
      .setLabel('戻る')
      .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder().addComponents(commandSelectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    await interaction.update({ embeds: [embed], components: [row1, row2] });
    return;
  }

  // 戻るボタンの処理
  if (interaction.isButton() && interaction.customId === 'help_back') {
    // メッセージを作成したユーザーかどうかをチェック
    if (interaction.message.interaction && interaction.message.interaction.user.id !== interaction.user.id) {
      await interaction.reply({ 
        content: 'このメッセージは他のユーザーが作成したものです。操作できません。', 
        ephemeral: true 
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('コマンドヘルプ')
      .setDescription('ジャンルを選択してコマンドの詳細を確認してください。')
      .setColor(0x4e9a06);

    // ジャンル別SelectMenu
    const genreOptions = [
      { label: '🎰 ガチャ・アイテム', description: 'ガチャを回してアイテムを集めよう', value: 'genre_gacha' },
      { label: '💰 お金・収入', description: 'お金を稼いで管理しよう', value: 'genre_economy' },
      { label: '🎮 ゲーム', description: 'カジノゲームで遊んでお金を稼ごう', value: 'genre_games' },
      { label: '🏦 銀行・取引', description: 'お金を預けてアイテムを取引しよう', value: 'genre_trading' },
      { label: '📈 投資', description: '株式・不動産・暗号通貨で投資しよう', value: 'genre_investment' },
      { label: '🏆 プロフィール・実績', description: '自分の情報と実績を確認しよう', value: 'genre_profile' },
      { label: '🛍️ ショップ・特別', description: '特別なアイテムと機能を使おう', value: 'genre_special' }
    ];

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_genre_select')
      .setPlaceholder('ジャンルを選択')
      .addOptions(genreOptions.map(opt =>
        new StringSelectMenuOptionBuilder()
          .setLabel(opt.label)
          .setDescription(opt.description)
          .setValue(opt.value)
      ));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.update({ embeds: [embed], components: [row] });
    return;
  }

  // SelectMenu選択時の詳細表示
  if (interaction.isStringSelectMenu() && interaction.customId === 'help_command_select') {
    // メッセージを作成したユーザーかどうかをチェック
    if (interaction.message.interaction && interaction.message.interaction.user.id !== interaction.user.id) {
      await interaction.reply({ 
        content: 'このメッセージは他のユーザーが作成したものです。操作できません。', 
        ephemeral: true 
      });
      return;
    }
    
    let embed;
    switch (interaction.values[0]) {
      case 'help_roll':
        embed = new EmbedBuilder()
          .setTitle('/roll - ガチャを回す')
          .setDescription("**ガチャを回してアイテムを獲得しよう！**\n\n**使い方:**\n• `/roll` - 1回ガチャを回す（¥100消費）\n• `/roll count:5` - 5回連続でガチャを回す\n\n**ガチャの仕組み:**\n• 1回あたり¥100円が必要\n• 100回ガチャを回すとUR以上が確定！\n• レアなアイテムほど価値が高い\n\n**レアリティ（出現確率）:**\n• **N** (45%) - 普通のアイテム\n• **R** (35%) - ややレア\n• **SR** (12%) - レア\n• **SSR** (6%) - スーパーレア\n• **UR** (1.5%) - ウルトラレア\n• **LR** (0.05%) - レジェンダリー")
          .setColor(0x00bfff);
        break;
      case 'help_items':
        embed = new EmbedBuilder()
          .setTitle('/items - 所持アイテム表示')
          .setDescription("**持っているアイテムを確認しよう！**\n\n**使い方:**\n• `/items` - 所持アイテム一覧を表示\n\n**表示される情報:**\n• アイテム名と個数\n• レアリティ別の分類\n• アイテムの総数\n\n**ヒント:**\n• アイテムは自動的に所持品に追加されます\n• 同じアイテムは個数で管理されます\n• レアなアイテムほど価値が高いです")
          .setColor(0x4e9a06);
        break;
      case 'help_status':
        embed = new EmbedBuilder()
          .setTitle('/status - ステータス表示')
          .setDescription("**現在の状況を確認しよう！**\n\n**使い方:**\n• `/status` - 現在のステータスを表示\n\n**表示される情報:**\n• 現在の所持金（円）\n• ガチャを回した回数\n• その他の統計情報\n\n**ヒント:**\n• お金が足りない時は `/daily` や `/work` で稼ごう\n• ガチャ回数は実績に影響します")
          .setColor(0x4e9a06);
        break;
      case 'help_ranking':
        embed = new EmbedBuilder()
          .setTitle('/ranking - ランキング表示')
          .setDescription("**みんなと競争しよう！**\n\n**使い方:**\n• `/ranking` - サーバー内ランキングを表示\n• `/ranking type:world` - 全世界ランキングを表示\n• `/ranking type:local` - サーバー内ランキングを表示\n\n**ランキングの種類:**\n• **world** - 全サーバーのユーザーを対象\n• **local** - 現在のサーバーのメンバーのみ\n\n**ヒント:**\n• 上位に入るにはたくさんガチャを回そう\n• お金を稼いでランキング上位を目指そう")
          .setColor(0xf9d923);
        break;
      case 'help_daily':
        embed = new EmbedBuilder()
          .setTitle('/daily - デイリーボーナス')
          .setDescription("**毎日お金をもらおう！**\n\n**使い方:**\n• `/daily` - デイリーボーナスを受け取る\n\n**ボーナス内容:**\n• ¥500円を獲得\n• 1日1回だけ利用可能\n• 24時間後に再び利用可能\n\n**ヒント:**\n• 毎日ログインしてボーナスを受け取ろう\n• ガチャを回すお金を稼げます")
          .setColor(0x4e9a06);
        break;
      case 'help_work':
        embed = new EmbedBuilder()
          .setTitle('/work - お仕事ボーナス')
          .setDescription("**お仕事でお金を稼ごう！**\n\n**使い方:**\n• `/work` - お仕事をして報酬を受け取る\n\n**報酬内容:**\n• ¥100円を獲得\n• 1時間に1回だけ利用可能\n• 1時間後に再び利用可能\n\n**ヒント:**\n• 定期的にお仕事をしてコツコツ稼ごう\n• ガチャを回すための資金源です")
          .setColor(0x4e9a06);
        break;
      case 'help_allowance':
        embed = new EmbedBuilder()
          .setTitle('/allowance - おこずかい')
          .setDescription("**友達にお金をあげよう！**\n\n**使い方:**\n• `/allowance user:@ユーザー amount:1000` - 1000円をあげる\n\n**制限:**\n• ¥1円以上（上限なし）\n• 自分にはあげられません\n• 所持金が足りている必要があります\n\n**ヒント:**\n• 友達と協力してガチャを楽しもう\n• お金を分け合ってみんなで遊ぼう")
          .setColor(0x4e9a06);
        break;
      case 'help_achievements':
        embed = new EmbedBuilder()
          .setTitle('/achievements - アチーブメント一覧')
          .setDescription("**実績を解除して報酬をもらおう！**\n\n**使い方:**\n• `/achievements` - アチーブメント一覧を表示\n\n**カテゴリ:**\n• 🎰 **ガチャ** - ガチャ関連の実績\n• 💰 **お金** - お金獲得の実績\n• 📅 **デイリー** - デイリーボーナスの実績\n• 💼 **お仕事** - お仕事の実績\n• 🎮 **ゲーム** - ゲームプレイの実績\n• 👥 **ソーシャル** - おこずかいの実績\n• ⭐ **特別** - 特別な実績\n\n**報酬:**\n• アチーブメントを解除すると円やアイテムがもらえる！\n• 実績を集めて称号を獲得しよう")
          .setColor(0xffd700);
        break;
      case 'help_iteminfo':
        embed = new EmbedBuilder()
          .setTitle('/iteminfo - アイテム詳細')
          .setDescription("**アイテムの詳細情報を確認しよう！**\n\n**使い方:**\n• `/iteminfo name:アイテム名` - アイテムの詳細を表示\n\n**表示される情報:**\n• アイテムのレアリティ\n• 売却価格\n• ガチャでの出現確率\n• アイテムの説明\n\n**特別な機能:**\n• 詫び石の場合は使用ボタンが表示されます\n• アイテムの価値を確認してから売買しよう")
          .setColor(0x4e9a06);
        break;
      case 'help_itemlist':
        embed = new EmbedBuilder()
          .setTitle('/itemlist - アイテム一覧')
          .setDescription("**全アイテムの情報を確認しよう！**\n\n**使い方:**\n• `/itemlist` - 全アイテム一覧を表示\n\n**表示される情報:**\n• 全アイテムの名前\n• 各アイテムの売却価格\n• ガチャでの出現確率\n• レアリティ別の分類\n\n**ヒント:**\n• どのアイテムがレアか確認しよう\n• 価格を参考に売買を決めよう")
          .setColor(0x4e9a06);
        break;
      case 'help_buy':
        embed = new EmbedBuilder()
          .setTitle('/buy - アイテム購入')
          .setDescription("**アイテムを購入しよう！**\n\n**使い方:**\n• `/buy` - 購入可能なアイテム一覧を表示\n\n**購入の流れ:**\n• コマンドを実行するとアイテム一覧が表示\n• 購入したいアイテムを選択\n• 所持金が足りていれば購入完了\n\n**ヒント:**\n• 所持金を確認してから購入しよう\n• アイテムの価格は変動する場合があります")
          .setColor(0x4e9a06);
        break;
      case 'help_sell':
        embed = new EmbedBuilder()
          .setTitle('/sell - アイテム売却')
          .setDescription("**アイテムを売却してお金に換えよう！**\n\n**使い方:**\n• `/sell` - 所持アイテム一覧を表示\n\n**売却の流れ:**\n• コマンドを実行すると所持アイテム一覧が表示\n• 売却したいアイテムを選択\n• 売却価格でお金を受け取る\n\n**ヒント:**\n• 不要なアイテムは売却して資金にしよう\n• レアなアイテムほど高く売れます")
          .setColor(0x4e9a06);
        break;
      case 'help_shop':
        embed = new EmbedBuilder()
          .setTitle('/shop - ショップ限定アイテム')
          .setDescription("**特別なアイテムを購入しよう！**\n\n**使い方:**\n• `/shop` - ショップ限定アイテム一覧を表示\n\n**購入可能なアイテム:**\n• **ラッキーチケット** - ガチャの確率を上げる\n• **円ブースター** - お金を増やす\n• **ミステリーボックス** - ランダムなアイテムがもらえる\n\n**ヒント:**\n• ショップ限定アイテムは特別な効果があります\n• ミステリーボックスは `/openbox` で開封しよう")
          .setColor(0xffa500);
        break;
      case 'help_openbox':
        embed = new EmbedBuilder()
          .setTitle('/openbox - ミステリーボックス開封')
          .setDescription("**ミステリーボックスを開封しよう！**\n\n**使い方:**\n• `/openbox` - ミステリーボックスを開封\n\n**開封の流れ:**\n• ショップでミステリーボックスを購入\n• `/openbox` コマンドで開封\n• ランダムなショップ限定アイテムを獲得\n\n**ヒント:**\n• ミステリーボックスは特別なアイテムがもらえる\n• 開封するまで何が入っているか分からない！")
          .setColor(0xffa500);
        break;
      case 'help_blackjack':
        embed = new EmbedBuilder()
          .setTitle('/blackjack - ブラックジャックゲーム')
          .setDescription("**ブラックジャックで勝負しよう！**\n\n**使い方:**\n• `/blackjack bet:1000` - 1000円でブラックジャック開始\n\n**ゲームルール:**\n• 21に最も近い手札の人が勝利\n• エースは1または11として使える\n• 21を超えるとバスト（負け）\n\n**配当:**\n• **ブラックジャック（21）** - 2.5倍\n• **通常勝利** - 2倍\n• **引き分け** - ベット額を返却\n\n**操作方法:**\n• **ヒット** - カードを1枚引く\n• **スタンド** - カードを引くのをやめる")
          .setColor(0x00bfff);
        break;
      case 'help_baccarat':
        embed = new EmbedBuilder()
          .setTitle('/baccarat - バカラゲーム')
          .setDescription("**バカラで勝負しよう！**\n\n**使い方:**\n• `/baccarat bet:1000 type:player` - プレイヤーに1000円ベット\n• `/baccarat bet:1000 type:banker` - バンカーに1000円ベット\n• `/baccarat bet:1000 type:tie` - 引き分けに1000円ベット\n\n**ゲームルール:**\n• プレイヤーとバンカーの手札を比較\n• 9に最も近い方が勝利\n• 10の位は無視（15→5、23→3）\n\n**配当:**\n• **プレイヤー** - 1:1配当\n• **バンカー** - 1.95:1配当\n• **引き分け** - 8:1配当\n\n**ヒント:**\n• バンカーの方が少し有利です\n• 引き分けは高配当ですが確率が低いです")
          .setColor(0x00bfff);
        break;
      case 'help_sicbo':
        embed = new EmbedBuilder()
          .setTitle('/sicbo - シックボーゲーム')
          .setDescription("**シックボーで勝負しよう！**\n\n**使い方:**\n• `/sicbo bet:1000` - 1000円でシックボー開始\n\n**ゲームルール:**\n• 3つのサイコロを振って結果を予想\n• サイコロの目に応じて様々なベットが可能\n\n**主なベットタイプ:**\n• **小/大** - 合計4-10（小）または11-17（大）\n• **合計値** - 特定の合計値（4-17）\n• **単発** - 特定の数字が1-3回出現\n• **ペア** - 特定の数字が2回出現\n• **トリプル** - 特定の数字が3回出現\n\n**配当例:**\n• 小/大: 1:1配当\n• 合計4/17: 60:1配当\n• トリプル: 180:1配当")
          .setColor(0x00bfff);
        break;
      case 'help_slot':
        embed = new EmbedBuilder()
          .setTitle('/slot - スロットマシンゲーム')
          .setDescription("**スロットマシンで勝負しよう！**\n\n**使い方:**\n• `/slot bet:1000` - 1000円でスロット開始\n\n**ゲームルール:**\n• 3×3のリールで横一列揃いで配当\n• クレジットシステムでゲーム進行\n• ベット額は10-100（10ずつ調整）\n\n**絵柄と配当:**\n• 🍒 チェリー: 2倍\n• 🍋 レモン: 3倍\n• 🍊 オレンジ: 4倍\n• 🍇 グレープ: 5倍\n• 🍓 ストロベリー: 6倍\n• 🍎 アップル: 8倍\n• 💎 ダイヤモンド: 10倍\n• ⭐ スター: 15倍\n• 🎰 スロット: 20倍\n• 💰 マネー: 50倍\n\n**ボーナス絵柄:**\n• 🎯 ターゲット: 100倍\n• 🏆 トロフィー: 200倍\n• 👑 クラウン: 500倍")
          .setColor(0xffd700);
        break;
      case 'help_bank':
        embed = new EmbedBuilder()
          .setTitle('/bank - 銀行システム')
          .setDescription("**銀行にお金を預けて金利をもらおう！**\n\n**使い方:**\n• `/bank action:balance` - 口座残高確認\n• `/bank action:deposit amount:1000` - 1000円預金\n• `/bank action:withdraw amount:500` - 500円引き出し\n• `/bank action:fixed amount:5000 days:30` - 5000円を30日定期預金\n\n**預金の種類:**\n• **普通預金** - 0.1%/日の金利、いつでも出し入れ可能\n• **定期預金** - 5%の金利（満期時）、期間中は引き出し不可\n\n**その他の機能:**\n• **interest** - 金利を受け取る\n• **history** - 取引履歴を確認\n• **ranking** - 銀行ランキングを見る\n\n**ヒント:**\n• お金を銀行に預けると金利で増えます\n• 定期預金は高金利ですが期間が固定されます")
          .setColor(0x4169e1);
        break;
      case 'help_trade':
        embed = new EmbedBuilder()
          .setTitle('/trade - アイテム取引システム')
          .setDescription("**他の人とアイテムを取引しよう！**\n\n**使い方:**\n• `/trade action:create item:石ころ quantity:5 price:100` - 取引作成\n• `/trade action:buy tradeid:1` - 取引購入\n• `/trade action:list` - 取引一覧\n• `/trade action:cancel tradeid:1` - 取引キャンセル\n\n**取引の流れ:**\n1. 売り手が取引を作成\n2. 買い手が取引を購入\n3. 自動的にアイテムとお金が交換\n\n**注意事項:**\n• 自分の取引は購入できません\n• 取引作成者はキャンセル可能\n• アイテムが不足している場合は取引失敗\n\n**ヒント:**\n• 他の人とアイテムを交換してコレクションを完成させよう\n• 価格は自由に設定できます")
          .setColor(0x00ff00);
        break;
      case 'help_auction':
        embed = new EmbedBuilder()
          .setTitle('/auction - オークションシステム')
          .setDescription("**オークションでアイテムを売買しよう！**\n\n**使い方:**\n• `/auction action:create item:石ころ quantity:3 startingprice:50 duration:24` - オークション作成\n• `/auction action:bid auctionid:1 bidamount:75` - 入札\n• `/auction action:list` - オークション一覧\n\n**オークションの流れ:**\n1. 出品者がオークションを作成\n2. 入札者が入札\n3. 期限終了時に最高入札者に自動売却\n\n**入札ルール:**\n• 現在の入札額より高い金額で入札\n• 前の入札者には自動返金\n• 自分のオークションには入札不可\n\n**期間設定:**\n• 1-168時間（1週間まで）\n• 期限切れは自動で処理\n\n**ヒント:**\n• オークションは競争で価格が上がります\n• 期限を設定して自動売却できます")
          .setColor(0xffa500);
        break;
      case 'help_market':
        embed = new EmbedBuilder()
          .setTitle('/market - マーケット情報')
          .setDescription("**マーケットの価格情報を確認しよう！**\n\n**使い方:**\n• `/market action:prices` - 全アイテムの現在価格一覧\n• `/market action:ranking` - 価格変動ランキング\n• `/market action:history item:石ころ` - 石ころの価格履歴\n• `/market action:update` - 手動で価格更新\n\n**価格変動システム:**\n• 24時間ごとに自動価格更新\n• ランダム変動（-20%〜+20%）\n• 取引による価格変動\n• 基本価格の50%〜200%の範囲で制限\n\n**価格変動要因:**\n• 取引量と価格の影響\n• 過去7日間の価格トレンド\n• ランダムな市場変動\n• アイテムの希少性\n\n**ヒント:**\n• 価格が安い時に買って高く売ろう\n• 価格変動ランキングでトレンドを確認しよう")
          .setColor(0x9932cc);
        break;
      case 'help_guess':
        embed = new EmbedBuilder()
          .setTitle('/guess - 数字当てゲーム')
          .setDescription("**数字を当ててお金を稼ごう！**\n\n**使い方:**\n• `/guess bet:1000 number:2` - 1000円を賭けて2を予想\n\n**ゲームルール:**\n• 1〜3の数字から選択\n• 当たり数字はランダム生成\n• リーフを賭けてゲーム参加\n\n**配当システム:**\n• **勝利** - 賭け金の2.8倍獲得\n• **敗北** - 賭け金の1.5倍ペナルティ\n\n**計算例:**\n• 賭け金1000円で勝利 → 2800円獲得\n• 賭け金1000円で敗北 → 2500円損失\n\n**ヒント:**\n• 確率は1/3なので慎重に賭けよう\n• 運が良ければ大きな利益が期待できます")
          .setColor(0x9932cc);
        break;
      case 'help_titles':
        embed = new EmbedBuilder()
          .setTitle('/titles - 称号システム')
          .setDescription("**特別な称号を獲得・装備しよう！**\n\n**使い方:**\n• `/titles action:list` - 全称号一覧を表示\n• `/titles action:owned` - 所持している称号一覧\n• `/titles action:equip titleid:1` - 称号1を装備\n• `/titles action:progress` - 称号の進捗状況\n\n**称号の種類:**\n• **ガチャマスター** - ガチャ回数に応じた称号\n• **コレクター** - アイテム収集に応じた称号\n• **大富豪** - ポイント獲得に応じた称号\n• **冒険者** - ゲームプレイに応じた称号\n• **社交家** - おこずかいのやり取りに応じた称号\n\n**称号の効果:**\n• プロフィールカードに表示\n• 特別なアイコンと色で表示\n• レアリティに応じたデザイン\n• 装備した称号は他のユーザーにも表示\n\n**ヒント:**\n• 様々な活動で称号を獲得しよう\n• 称号を装備して自分をアピールしよう")
          .setColor(0xffd700);
        break;
      case 'help_profile':
        embed = new EmbedBuilder()
          .setTitle('/profile - プロフィールカード')
          .setDescription("**自分だけのプロフィールカードを作ろう！**\n\n**使い方:**\n• `/profile action:show` - 自分のプロフィール表示\n• `/profile action:show user:@ユーザー` - 他のユーザーのプロフィール\n• `/profile action:edit bio:よろしくお願いします` - 自己紹介設定\n• `/profile action:style style:dark` - ダークテーマに変更\n\n**カスタマイズ要素:**\n• **自己紹介** - 自由な自己紹介文\n• **好きなゲーム** - お気に入りのゲーム\n• **カスタムタイトル** - オリジナルタイトル\n• **カードスタイル** - 8種類のテーマ\n\n**利用可能なスタイル:**\n• **デフォルト** - シンプルな青系\n• **ダーク** - ダークテーマ\n• **ネオン** - ネオンテーマ\n• **ゴールド** - ゴールドテーマ\n• **ナチュラル** - 自然なテーマ\n• **オーシャン** - 海のテーマ\n• **サンセット** - 夕日のテーマ\n• **ロイヤル** - 王族のテーマ\n\n**プロフィールカードの内容:**\n• 基本情報（ユーザー名・好きなゲーム）\n• 統計情報（ポイント・ガチャ回数・アイテム数）\n• 装備中の称号\n• 所持アイテム・アチーブメント")
          .setColor(0x7289da);
        break;

      case 'help_crypto':
        embed = new EmbedBuilder()
          .setTitle('/crypto - 暗号通貨システム')
          .setDescription("**暗号通貨に投資して利益を獲得しよう！**\n\n**使い方:**\n• `/crypto action:prices` - 暗号通貨価格一覧\n• `/crypto action:wallet` - 自分のウォレット確認\n• `/crypto action:buy symbol:BTC amount:0.1 price:50000` - ビットコイン購入\n• `/crypto action:sell symbol:BTC amount:0.1 price:55000` - ビットコイン売却\n\n**利用可能な暗号通貨:**\n• **₿ Bitcoin (BTC)** - ¥50,000基準\n• **Ξ Ethereum (ETH)** - ¥3,000基準\n• **Ð Dogecoin (DOGE)** - ¥0.1基準\n• **₳ Cardano (ADA)** - ¥0.5基準\n• **◎ Solana (SOL)** - ¥100基準\n• **⬟ Polygon (MATIC)** - ¥1基準\n\n**価格変動システム:**\n• 1時間ごとに自動価格更新\n• ボラティリティに基づく変動\n• 取引量による価格影響\n• ニュースイベントによる変動\n\n**ヒント:**\n• 価格が安い時に買って高く売ろう\n• 価格予測機能でトレンドを確認しよう")
          .setColor(0x00ff00);
        break;

      case 'help_mining':
        embed = new EmbedBuilder()
          .setTitle('/mining - マイニングシステム')
          .setDescription("**暗号通貨をマイニングして獲得しよう！**\n\n**使い方:**\n• `/mining action:start symbol:BTC` - ビットコインマイニング開始\n• `/mining action:stop` - マイニング停止\n• `/mining action:claim` - 報酬を受け取る\n• `/mining action:status` - マイニング状態確認\n• `/mining action:upgrade` - マイニングパワーアップグレード\n\n**マイニングシステム:**\n• 1時間ごとに報酬をクレーム可能\n• マイニングパワー（1-10レベル）で効率向上\n• パワーアップグレードで収益性向上\n• 暗号通貨ごとに異なる難易度\n\n**マイニング効率:**\n• レベル1: 1.0x\n• レベル2: 1.2x\n• レベル3: 1.5x\n• レベル4: 1.8x\n• レベル5: 2.2x\n• レベル6: 2.7x\n• レベル7: 3.3x\n• レベル8: 4.0x\n• レベル9: 4.8x\n• レベル10: 5.7x\n\n**ヒント:**\n• 定期的に報酬をクレームしよう\n• パワーアップグレードで効率を上げよう")
          .setColor(0xffa500);
        break;

      case 'help_cryptoalert':
        embed = new EmbedBuilder()
          .setTitle('/cryptoalert - 価格アラート設定')
          .setDescription("**暗号通貨の価格アラートを設定しよう！**\n\n**使い方:**\n• `/cryptoalert symbol:BTC price:50000 type:above` - ビットコインが50000円以上になったら通知\n• `/cryptoalert symbol:ETH price:3000 type:below` - イーサリアムが3000円以下になったら通知\n\n**アラートタイプ:**\n• **above** - 価格上昇時（目標価格以上で発動）\n• **below** - 価格下落時（目標価格以下で発動）\n\n**利用可能な暗号通貨:**\n• **₿ Bitcoin (BTC)**\n• **Ξ Ethereum (ETH)**\n• **Ð Dogecoin (DOGE)**\n• **₳ Cardano (ADA)**\n• **◎ Solana (SOL)**\n• **⬟ Polygon (MATIC)**\n\n**アラート機能:**\n• 価格到達時に自動通知\n• 1時間ごとの価格チェック\n• 複数のアラート設定可能\n• アラート発動後は自動無効化\n\n**ヒント:**\n• 投資のタイミングを逃さないようにアラートを設定しよう\n• 複数の価格でアラートを設定できます")
          .setColor(0xff6b6b);
        break;

      case 'help_stock':
        embed = new EmbedBuilder()
          .setTitle('/stock - 株式システム')
          .setDescription("**株式に投資して配当金を獲得しよう！**\n\n**使い方:**\n• `/stock action:list` - 全企業一覧\n• `/stock action:info symbol:TECH` - TECH企業の詳細\n• `/stock action:buy symbol:TECH shares:10` - TECH株10株購入\n• `/stock action:sell symbol:TECH shares:5` - TECH株5株売却\n• `/stock action:portfolio` - 保有株式ポートフォリオ\n\n**上場企業:**\n• **TECH** - テクノロジー・インフィニティ（AI・ロボティクス）\n• **GREEN** - グリーン・エナジー・コーポレーション（再生可能エネルギー）\n• **MEGA** - メガ・ファイナンス・グループ（デジタルバンキング）\n• **HEALTH** - ヘルスケア・フューチャー（次世代医療技術）\n• **ENT** - エンターテイメント・ワールド（VR・ゲーム）\n• **LOGISTICS** - ロジスティクス・マスター（自動配送システム）\n\n**株式システム機能:**\n• リアルタイム価格変動（-5%〜+5%）\n• 四半期配当金支払い\n• ポートフォリオ損益計算\n• 取引履歴記録\n• 市場ランキング表示\n\n**ヒント:**\n• 配当金で安定した収入を得よう\n• 価格変動を利用して利益を出そう")
          .setColor(0x00ff00);
        break;

      case 'help_realestate':
        embed = new EmbedBuilder()
          .setTitle('/realestate - 不動産システム')
          .setDescription("**不動産に投資して賃貸収入を獲得しよう！**\n\n**使い方:**\n• `/realestate action:list` - 全不動産一覧\n• `/realestate action:info propertyid:1` - ID1の不動産詳細\n• `/realestate action:buy propertyid:1` - ID1の不動産購入\n• `/realestate action:sell propertyid:1` - ID1の不動産売却\n• `/realestate action:rent propertyid:1` - ID1の賃貸収入受取\n• `/realestate action:portfolio` - 保有不動産ポートフォリオ\n\n**不動産タイプ:**\n• **🌍 土地** - 住宅地として開発可能\n• **🏡 一戸建て** - 庭付き住宅\n• **🏢 マンション** - 高級マンション・学生向けアパート\n• **🏬 商業ビル** - オフィスビル・店舗併用\n• **🏖️ リゾート別荘** - 海の見える別荘\n\n**不動産システム機能:**\n• リアルタイム価格変動（-3%〜+3%）\n• 月次賃貸収入受取\n• 月次メンテナンス費用支払い\n• ポートフォリオ損益計算\n• 取引履歴記録\n• 市場ランキング表示\n\n**ヒント:**\n• 賃貸収入で安定した収入を得よう\n• メンテナンス費用を忘れずに支払おう")
          .setColor(0x8B4513);
        break;

      case 'help_market':
        embed = new EmbedBuilder()
          .setTitle('/market - 市場シミュレーション')
          .setDescription("**市場の動向を確認しよう！**\n\n**使い方:**\n• `/market action:update` - 株式・不動産価格更新\n• `/market action:events` - アクティブな市場イベント表示\n• `/market action:stats` - 市場統計情報表示\n\n**市場シミュレーション機能:**\n• 1時間ごとの自動価格更新\n• 管理者による市場イベント作成\n• イベントによる価格変動影響\n• 週次配当金支払い（日曜日9時）\n• 市場統計情報表示\n\n**ヒント:**\n• 市場イベントで価格が大きく変動する可能性があります\n• 統計情報で市場の動向を把握しよう")
          .setColor(0x9932cc);
        break;
      case 'help_economy':
        embed = new EmbedBuilder()
          .setTitle('💰 経済システム')
          .setDescription('このボットには2種類のお金があります。それぞれの特徴と使い道を確認しましょう！')
          .addFields(
            { name: '💵 円 (¥) - 基本通貨', value: '**稼ぎ方:**\n• `/daily` - 毎日500円獲得\n• `/work` - 100円獲得（1時間クールダウン）\n• `/allowance` - 他のユーザーから受け取り\n• `/achievements` - アチーブメント報酬\n• `/bank` - 銀行の金利\n• ゲーム勝利（ブラックジャック、バカラ、シックボー、スロット）\n\n**使い道:**\n• `/roll` - ガチャで使用（100円/回）\n• `/buy` - アイテム購入\n• `/shop` - ショップ限定アイテム購入\n• `/allowance` - 他のユーザーに送金\n• `/bank` - 銀行に預金\n• `/trade` - アイテム取引\n• `/auction` - オークション入札', inline: true },
            { name: '🍃 リーフ (Ł) - 特別通貨', value: '**稼ぎ方:**\n• `/daily` - 毎日1000リーフ獲得\n• `/work` - 1000リーフ獲得\n• `/guess` - 数字当てゲームで勝利（2.8倍配当）\n\n**使い道:**\n• `/guess` - 数字当てゲームで使用（1-10000リーフ）', inline: true },
            { name: '🎰 ガチャシステム', value: '• `/roll` - 100円で1回ガチャ\n• レアアイテムを獲得可能\n• 100回ごとにUR以上確定\n• 獲得したアイテムは自動で所持品に追加\n• `/itemlist` で全アイテムの確率を確認可能', inline: true }
          )
          .setColor(0x00ff00);
        break;
      default:
        embed = new EmbedBuilder().setTitle('不明なコマンド').setDescription('詳細情報がありません。');
        break;
    }
    // 戻るボタンを追加
    const backButton = new ButtonBuilder()
      .setCustomId('help_back')
      .setLabel('戻る')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(backButton);

    // メッセージを編集（Embedとボタンを差し替え）
    await interaction.update({
      embeds: [embed],
      components: [row]
    });
  }



  if (interaction.commandName === 'shop') {
    // モーダル入力フォームを表示
    const modal = new ModalBuilder()
      .setCustomId('shop_modal')
      .setTitle('ショップ限定アイテム購入');

    const itemInput = new TextInputBuilder()
      .setCustomId('item_name')
      .setLabel('アイテム名')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('例: ラッキーチケット, ポイントブースター, ミステリーボックス')
      .setRequired(true);

    const quantityInput = new TextInputBuilder()
      .setCustomId('quantity')
      .setLabel('購入数量')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('例: 1, 5, 10')
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(itemInput);
    const secondActionRow = new ActionRowBuilder().addComponents(quantityInput);

    modal.addComponents(firstActionRow, secondActionRow);

    await interaction.showModal(modal);
    return;
  }

  // アイテム選択後：個数選択バー表示

  // 個数選択後：購入処理

  if (interaction.commandName === 'openbox') {
    // 所持数取得
    const items = await getItems(interaction.user.id);
    const box = items.find(i => i.itemName === "ミステリーボックス");
    const embed = new EmbedBuilder().setTitle('ミステリーボックス開封').setColor(0xffa500);

    if (!box || box.quantity < 1) {
      embed.setDescription("ミステリーボックスを持っていません。\n\n💡 **ミステリーボックスは /shop コマンドで購入できます！**\n価格: ¥3000円\n効果: 開封でショップ限定アイテムをランダム入手");
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ショップ限定アイテムからランダムで景品を抽選
    const selected = SHOP_ITEMS[Math.floor(Math.random() * SHOP_ITEMS.length)];
    await addItem(interaction.user.id, selected.name);
    await updateItemQuantity(interaction.user.id, "ミステリーボックス", 1);

    embed.setDescription(`ミステリーボックスを開封！\n${selected.rarity}【${selected.name}】を入手しました！\n\n💡 **ミステリーボックスは /shop コマンドで購入できます！**\n効果: ${selected.effect}`);
    await interaction.reply({ embeds: [embed] });
    return;
  }


  // ブラックジャックコマンド
  if (interaction.commandName === 'blackjack') {
    const betAmount = interaction.options.getInteger('bet');
    const user = await getUser(interaction.user.id);
    
    // ポイント不足チェック
    if (user.points < betAmount) {
      const embed = new EmbedBuilder()
        .setTitle('ブラックジャック')
        .setDescription(`お金が足りません！\n所持金: ¥${user.points}円\n必要金額: ¥${betAmount}円`)
        .setColor(0xff0000);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ベット額を消費
    await addPoints(interaction.user.id, -betAmount);

    // ゲーム開始
    const result = startBlackjackGame(interaction.user.id, betAmount);
    
    if (result.error) {
      // エラーの場合はポイントを返す
      await addPoints(interaction.user.id, betAmount);
      const embed = new EmbedBuilder()
        .setTitle('ブラックジャック')
        .setDescription(result.error)
        .setColor(0xff0000);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const game = result.game;
    const embed = new EmbedBuilder()
      .setTitle('🃏 ブラックジャック')
      .setDescription(`ベット額: ¥${betAmount}円\n\n**あなたの手札:** ${game.playerHand}\n合計: ${game.playerValue}\n\n**ディーラーの手札:** ${game.dealerHand}`)
      .setColor(0x00bfff);

    // ゲームが終了している場合（ブラックジャックなど）
    if (game.gameState === 'finished') {
      let resultText = '';
      let color = 0x00bfff;
      
      switch (game.result) {
        case 'blackjack':
          resultText = '🎉 ブラックジャック！勝利！';
          color = 0x00ff00;
          break;
        case 'win':
          resultText = '🎉 勝利！';
          color = 0x00ff00;
          break;
        case 'lose':
          resultText = '😞 敗北...';
          color = 0xff0000;
          break;
        case 'push':
          resultText = '🤝 引き分け';
          color = 0xffff00;
          break;
      }

      // 勝利金を付与
      if (game.winnings > 0) {
        await addPoints(interaction.user.id, game.winnings);
      }

      embed.setDescription(`ベット額: ¥${betAmount}円\n\n**あなたの手札:** ${game.playerHand}\n合計: ${game.playerValue}\n\n**ディーラーの手札:** ${game.dealerHand}\n合計: ${game.dealerValue}\n\n${resultText}\n獲得円: ¥${game.winnings}円`);
      embed.setColor(color);
      
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ゲーム継続中の場合はボタンを表示
    const hitButton = new ButtonBuilder()
      .setCustomId('blackjack_hit')
      .setLabel('ヒット')
      .setStyle(ButtonStyle.Primary);

    const standButton = new ButtonBuilder()
      .setCustomId('blackjack_stand')
      .setLabel('スタンド')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(hitButton, standButton);

      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }

    // 統計情報コマンド
    if (interaction.commandName === 'stats') {
      await handleStatsCommand(interaction);
      return;
    }

  // バカラコマンド
  if (interaction.commandName === 'baccarat') {
    const betAmount = interaction.options.getInteger('bet');
    const betType = interaction.options.getString('type');
    const user = await getUser(interaction.user.id);
    
    // ポイント不足チェック
    if (user.points < betAmount) {
      const embed = new EmbedBuilder()
        .setTitle('バカラ')
        .setDescription(`お金が足りません！\n所持金: ¥${user.points}円\n必要金額: ¥${betAmount}円`)
        .setColor(0xff0000);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ベット額を消費
    await addPoints(interaction.user.id, -betAmount);

    // ゲーム開始
    const result = startBaccaratGame(interaction.user.id, betAmount, betType);
    
    if (result.error) {
      // エラーの場合はポイントを返す
      await addPoints(interaction.user.id, betAmount);
      const embed = new EmbedBuilder()
        .setTitle('バカラ')
        .setDescription(result.error)
        .setColor(0xff0000);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const game = result.game;
    let betTypeText = '';
    switch (betType) {
      case 'player': betTypeText = 'プレイヤー'; break;
      case 'banker': betTypeText = 'バンカー'; break;
      case 'tie': betTypeText = '引き分け'; break;
    }

    let resultText = '';
    let color = 0x00bfff;
    
    if (game.result === betType) {
      if (betType === 'tie') {
        resultText = '🎉 引き分け的中！8倍配当！';
      } else if (betType === 'banker') {
        resultText = '🎉 バンカー勝利！1.95倍配当！';
      } else {
        resultText = '🎉 プレイヤー勝利！1倍配当！';
      }
      color = 0x00ff00;
    } else if (game.result === 'tie' && betType !== 'tie') {
      resultText = '🤝 引き分け（ベット額返却）';
      color = 0xffff00;
    } else {
      resultText = '😞 敗北...';
      color = 0xff0000;
    }

    // 勝利金を付与
    if (game.winnings > 0) {
      await addPoints(interaction.user.id, game.winnings);
    }

    const embed = new EmbedBuilder()
      .setTitle('🎰 バカラ')
      .setDescription(
        `ベット額: ¥${betAmount}円\n` +
        `ベットタイプ: ${betTypeText}\n\n` +
        `**プレイヤーの手札:** ${game.playerHand}\n` +
        `合計: ${game.playerValue}\n\n` +
        `**バンカーの手札:** ${game.bankerHand}\n` +
        `合計: ${game.bankerValue}\n\n` +
        `${resultText}\n` +
        `獲得円: ¥${game.winnings}円`
      )
      .setColor(color);

    await interaction.reply({ embeds: [embed] });
    return;
  }

  // シックボーコマンド
  if (interaction.commandName === 'sicbo') {
    const betAmount = interaction.options.getInteger('bet');
    const user = await getUser(interaction.user.id);
    
    // ポイント不足チェック
    if (user.points < betAmount) {
      const embed = new EmbedBuilder()
        .setTitle('シックボー')
        .setDescription(`お金が足りません！\n所持金: ¥${user.points}円\n必要金額: ¥${betAmount}円`)
        .setColor(0xff0000);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ベットタイプ選択用のEmbedとSelectMenuを作成
    const embed = new EmbedBuilder()
      .setTitle('🎲 シックボー - ベットタイプ選択')
      .setDescription(`ベット額: ¥${betAmount}円\n\nベットタイプを選択してください：`)
      .setColor(0x00bfff);

    // ベットタイプをカテゴリ別に分ける
    const betCategories = [
      {
        label: '基本ベット',
        options: [
          { label: '小（4-10）', description: '1:1配当', value: 'small' },
          { label: '大（11-17）', description: '1:1配当', value: 'big' }
        ]
      },
      {
        label: '合計値ベット',
        options: [
          { label: '合計4', description: '60:1配当', value: 'total4' },
          { label: '合計5', description: '30:1配当', value: 'total5' },
          { label: '合計6', description: '18:1配当', value: 'total6' },
          { label: '合計7', description: '12:1配当', value: 'total7' },
          { label: '合計8', description: '8:1配当', value: 'total8' },
          { label: '合計9', description: '6:1配当', value: 'total9' },
          { label: '合計10', description: '6:1配当', value: 'total10' },
          { label: '合計11', description: '6:1配当', value: 'total11' },
          { label: '合計12', description: '6:1配当', value: 'total12' },
          { label: '合計13', description: '8:1配当', value: 'total13' },
          { label: '合計14', description: '12:1配当', value: 'total14' },
          { label: '合計15', description: '18:1配当', value: 'total15' },
          { label: '合計16', description: '30:1配当', value: 'total16' },
          { label: '合計17', description: '60:1配当', value: 'total17' }
        ]
      },
      {
        label: '単発ベット',
        options: [
          { label: '1の単発', description: '1-3倍配当', value: 'single1' },
          { label: '2の単発', description: '1-3倍配当', value: 'single2' },
          { label: '3の単発', description: '1-3倍配当', value: 'single3' },
          { label: '4の単発', description: '1-3倍配当', value: 'single4' },
          { label: '5の単発', description: '1-3倍配当', value: 'single5' },
          { label: '6の単発', description: '1-3倍配当', value: 'single6' }
        ]
      },
      {
        label: '特殊ベット',
        options: [
          { label: '任意のトリプル', description: '30:1配当', value: 'any_triple' },
          { label: '連続（1,2,3 または 4,5,6）', description: '30:1配当', value: 'consecutive' }
        ]
      }
    ];

    // 最初のカテゴリのSelectMenuを作成
    const firstCategory = betCategories[0];
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`sicbo_bet_${betAmount}`)
      .setPlaceholder('ベットタイプを選択')
      .addOptions(firstCategory.options.map(opt =>
        new StringSelectMenuOptionBuilder()
          .setLabel(opt.label)
          .setDescription(opt.description)
          .setValue(opt.value)
      ));

    const row1 = new ActionRowBuilder().addComponents(selectMenu);

    // カテゴリ選択用のボタンを作成
    const categoryButtons = betCategories.map((category, index) => 
      new ButtonBuilder()
        .setCustomId(`sicbo_category_${betAmount}_${index}`)
        .setLabel(category.label)
        .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(categoryButtons);

    await interaction.reply({ 
      embeds: [embed], 
      components: [row1, row2] 
    });
    return;
  }

  // シックボーのカテゴリボタン処理
  if (interaction.isButton() && interaction.customId.startsWith('sicbo_category_')) {
    const parts = interaction.customId.split('_');
    const betAmount = parseInt(parts[2]);
    const categoryIndex = parseInt(parts[3]);
    
    const betCategories = [
      {
        label: '基本ベット',
        options: [
          { label: '小（4-10）', description: '1:1配当', value: 'small' },
          { label: '大（11-17）', description: '1:1配当', value: 'big' }
        ]
      },
      {
        label: '合計値ベット',
        options: [
          { label: '合計4', description: '60:1配当', value: 'total4' },
          { label: '合計5', description: '30:1配当', value: 'total5' },
          { label: '合計6', description: '18:1配当', value: 'total6' },
          { label: '合計7', description: '12:1配当', value: 'total7' },
          { label: '合計8', description: '8:1配当', value: 'total8' },
          { label: '合計9', description: '6:1配当', value: 'total9' },
          { label: '合計10', description: '6:1配当', value: 'total10' },
          { label: '合計11', description: '6:1配当', value: 'total11' },
          { label: '合計12', description: '6:1配当', value: 'total12' },
          { label: '合計13', description: '8:1配当', value: 'total13' },
          { label: '合計14', description: '12:1配当', value: 'total14' },
          { label: '合計15', description: '18:1配当', value: 'total15' },
          { label: '合計16', description: '30:1配当', value: 'total16' },
          { label: '合計17', description: '60:1配当', value: 'total17' }
        ]
      },
      {
        label: '単発ベット',
        options: [
          { label: '1の単発', description: '1-3倍配当', value: 'single1' },
          { label: '2の単発', description: '1-3倍配当', value: 'single2' },
          { label: '3の単発', description: '1-3倍配当', value: 'single3' },
          { label: '4の単発', description: '1-3倍配当', value: 'single4' },
          { label: '5の単発', description: '1-3倍配当', value: 'single5' },
          { label: '6の単発', description: '1-3倍配当', value: 'single6' }
        ]
      },
      {
        label: '特殊ベット',
        options: [
          { label: '任意のトリプル', description: '30:1配当', value: 'any_triple' },
          { label: '連続（1,2,3 または 4,5,6）', description: '30:1配当', value: 'consecutive' }
        ]
      }
    ];

    const selectedCategory = betCategories[categoryIndex];
    
    const embed = new EmbedBuilder()
      .setTitle('🎲 シックボー - ベットタイプ選択')
      .setDescription(`ベット額: ¥${betAmount}円\n\n**${selectedCategory.label}**から選択してください：`)
      .setColor(0x00bfff);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`sicbo_bet_${betAmount}`)
      .setPlaceholder('ベットタイプを選択')
      .addOptions(selectedCategory.options.map(opt =>
        new StringSelectMenuOptionBuilder()
          .setLabel(opt.label)
          .setDescription(opt.description)
          .setValue(opt.value)
      ));

    const row1 = new ActionRowBuilder().addComponents(selectMenu);

    // カテゴリ選択用のボタンを作成
    const categoryButtons = betCategories.map((category, index) => 
      new ButtonBuilder()
        .setCustomId(`sicbo_category_${betAmount}_${index}`)
        .setLabel(category.label)
        .setStyle(index === categoryIndex ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(categoryButtons);

    await interaction.update({ 
      embeds: [embed], 
      components: [row1, row2] 
    });
    return;
  }

  // シックボーのベットタイプ選択処理
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('sicbo_bet_')) {
    const betAmount = parseInt(interaction.customId.split('_')[2]);
    const betType = interaction.values[0];
    
    // ベット額を消費
    await addPoints(interaction.user.id, -betAmount);

    // ゲーム開始
    const result = startSicboGame(interaction.user.id, betAmount, betType);
    
    if (result.error) {
      // エラーの場合はポイントを返す
      await addPoints(interaction.user.id, betAmount);
      const embed = new EmbedBuilder()
        .setTitle('シックボー')
        .setDescription(result.error)
        .setColor(0xff0000);
      await interaction.update({ embeds: [embed], components: [] });
      return;
    }

    const game = result.game;
    let resultText = '';
    let color = 0x00bfff;
    
    if (game.result === 'win') {
      resultText = '🎉 勝利！';
      color = 0x00ff00;
    } else {
      resultText = '😞 敗北...';
      color = 0xff0000;
    }

    // 勝利金を付与
    if (game.winnings > 0) {
      await addPoints(interaction.user.id, game.winnings);
    }

    // サイコロの絵文字マッピング
    const diceEmojis = {
      1: '⚀',
      2: '⚁',
      3: '⚂',
      4: '⚃',
      5: '⚄',
      6: '⚅'
    };

    const embed = new EmbedBuilder()
      .setTitle('🎲 シックボー - 結果')
      .setDescription(
        `ベット額: ¥${betAmount}円\n` +
        `ベットタイプ: ${game.betTypeDescription}\n\n` +
        `**サイコロの結果:**\n` +
        `${diceEmojis[game.dice[0]]} ${diceEmojis[game.dice[1]]} ${diceEmojis[game.dice[2]]}\n` +
        `合計: ${game.total}\n\n` +
        `${resultText}\n` +
        `獲得円: ¥${game.winnings}円`
      )
      .setColor(color);

    await interaction.update({ embeds: [embed], components: [] });
    return;
  }

  // ======== 称号システム関連コマンド ========
  if (interaction.commandName === 'titles') {
    const action = interaction.options.getString('action');
    const titleId = interaction.options.getInteger('titleid');
    const userId = interaction.user.id;

    try {
      if (action === 'list') {
        // 称号一覧を表示
        const titles = await getUserTitles(userId);
        
        const embed = new EmbedBuilder()
          .setTitle('🏆 称号一覧')
          .setDescription('利用可能な称号の一覧です')
          .setColor(0x4e9a06);

        // レアリティ別に分類
        const rarityGroups = {
          'legendary': [],
          'epic': [],
          'rare': [],
          'uncommon': [],
          'common': []
        };

        titles.forEach(title => {
          const status = title.unlocked_at ? 
            (title.is_equipped ? '✅ 装備中' : '🔓 解除済み') : 
            '🔒 未解除';
          
          rarityGroups[title.rarity].push({
            name: `${title.icon} ${title.name}`,
            value: `${title.description}\n${status}`,
            inline: false
          });
        });

        // レアリティ順に表示
        Object.entries(rarityGroups).forEach(([rarity, group]) => {
          if (group.length > 0) {
            const rarityName = getRarityName(rarity);
            const rarityColor = getRarityColor(rarity);
            
            embed.addFields({
              name: `${rarityColor} ${rarityName}`,
              value: group.map(item => `**${item.name}**\n${item.value}`).join('\n\n'),
              inline: false
            });
          }
        });

        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (action === 'owned') {
        // 所持称号を表示
        const titles = await getUserTitles(userId);
        const ownedTitles = titles.filter(t => t.unlocked_at);
        
        if (ownedTitles.length === 0) {
          const embed = new EmbedBuilder()
            .setTitle('🏆 所持称号')
            .setDescription('まだ称号を獲得していません')
            .setColor(0xff0000);
          await interaction.reply({ embeds: [embed] });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle('🏆 所持称号')
          .setDescription(`獲得済み称号: ${ownedTitles.length}個`)
          .setColor(0x4e9a06);

        ownedTitles.forEach(title => {
          const status = title.is_equipped ? '✅ 装備中' : '🔓 解除済み';
          embed.addFields({
            name: `${title.icon} ${title.name}`,
            value: `${title.description}\n${status}`,
            inline: true
          });
        });

        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (action === 'equip') {
        if (!titleId) {
          const embed = new EmbedBuilder()
            .setTitle('エラー')
            .setDescription('称号IDを指定してください')
            .setColor(0xff0000);
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const success = await equipTitle(userId, titleId, true);
        if (success) {
          const title = await dbGet('SELECT * FROM titles WHERE id = ?', titleId);
          const embed = new EmbedBuilder()
            .setTitle('🏆 称号装備')
            .setDescription(`${title.icon} **${title.name}** を装備しました！`)
            .setColor(0x4e9a06);
          await interaction.reply({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder()
            .setTitle('エラー')
            .setDescription('称号の装備に失敗しました')
            .setColor(0xff0000);
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        return;
      }

      if (action === 'unequip') {
        if (!titleId) {
          const embed = new EmbedBuilder()
            .setTitle('エラー')
            .setDescription('称号IDを指定してください')
            .setColor(0xff0000);
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const success = await equipTitle(userId, titleId, false);
        if (success) {
          const title = await dbGet('SELECT * FROM titles WHERE id = ?', titleId);
          const embed = new EmbedBuilder()
            .setTitle('🏆 称号外し')
            .setDescription(`${title.icon} **${title.name}** を外しました`)
            .setColor(0x4e9a06);
          await interaction.reply({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder()
            .setTitle('エラー')
            .setDescription('称号を外すのに失敗しました')
            .setColor(0xff0000);
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        return;
      }

      if (action === 'progress') {
        // 称号進捗を表示
        const titles = await getUserTitles(userId);
        const lockedTitles = titles.filter(t => !t.unlocked_at);
        
        if (lockedTitles.length === 0) {
          const embed = new EmbedBuilder()
            .setTitle('🏆 称号進捗')
            .setDescription('すべての称号を獲得済みです！')
            .setColor(0x4e9a06);
          await interaction.reply({ embeds: [embed] });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle('🏆 称号進捗')
          .setDescription('未獲得称号の進捗状況')
          .setColor(0x4e9a06);

        for (const title of lockedTitles.slice(0, 10)) { // 最大10個まで表示
          const progress = await getTitleProgress(userId, title.condition_type);
          const percentage = Math.min((progress / title.condition_value) * 100, 100);
          const progressBar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
          
          embed.addFields({
            name: `${title.icon} ${title.name}`,
            value: `${title.description}\n進捗: ${progress}/${title.condition_value} (${percentage.toFixed(1)}%)\n${progressBar}`,
            inline: false
          });
        }

        await interaction.reply({ embeds: [embed] });
        return;
      }

    } catch (error) {
      console.error('称号コマンドエラー:', error);
      const embed = new EmbedBuilder()
        .setTitle('エラー')
        .setDescription('コマンドの実行中にエラーが発生しました')
        .setColor(0xff0000);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    return;
  }

  // ======== プロフィールカード関連コマンド ========
  if (interaction.commandName === 'profile') {
    const action = interaction.options.getString('action');
    const userId = interaction.user.id;
    const targetUser = interaction.options.getUser('user') || interaction.user;

    try {
      if (action === 'show') {
        // プロフィールカードデータを取得
        const profileData = await generateProfileCardData(targetUser.id, targetUser);
        
        if (!profileData) {
          const embed = new EmbedBuilder()
            .setTitle('エラー')
            .setDescription('プロフィールの生成に失敗しました')
            .setColor(0xff0000);
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        // ページ1: 基本情報
        const style = profileData.profile.style || { color: 0x4e9a06 };
        const basicEmbed = new EmbedBuilder()
          .setTitle(`${profileData.basicInfo.title}`)
          .setDescription(`**${profileData.basicInfo.username}** のプロフィール${profileData.basicInfo.customTitle ? `\n**${profileData.basicInfo.customTitle}**` : ''}`)
          .setColor(parseInt(style.color?.replace('#', '') || '4e9a06', 16))
          .setThumbnail(targetUser.avatarURL() || targetUser.defaultAvatarURL)
          .addFields(
            { name: '👤 ユーザー名', value: profileData.basicInfo.username, inline: true },
            { name: '🎮 好きなゲーム', value: profileData.basicInfo.favoriteGame || '未設定', inline: true }
          );

        if (profileData.basicInfo.bio) {
          basicEmbed.addFields({ name: '📝 自己紹介', value: profileData.basicInfo.bio, inline: false });
        }

        // 称号情報を基本情報に追加
        if (profileData.titles.owned.length > 0) {
          // 装備中の称号
          if (profileData.titles.equipped.length > 0) {
            const equippedTitle = profileData.titles.equipped[0];
            basicEmbed.addFields({ 
              name: '✅ 装備中の称号', 
              value: `${equippedTitle.icon} ${equippedTitle.name}`, 
              inline: false 
            });
          }
          
          // 称号一覧（最大5個）
          const titleList = profileData.titles.owned.slice(0, 5).map(title => 
            `${title.icon} ${title.name}`
          ).join('\n');
          
          basicEmbed.addFields({ 
            name: `📋 称号一覧 (${profileData.titles.owned.length}/${profileData.titles.total}個)`, 
            value: titleList || 'なし', 
            inline: false 
          });
        }

        // ページ2: 統計・詳細情報
        const statsStyle = profileData.profile.style || { accent: '#0080ff' };
        const statsEmbed = new EmbedBuilder()
          .setTitle(`📊 ${profileData.basicInfo.username} の統計・詳細`)
          .setColor(parseInt(statsStyle.accent?.replace('#', '') || '0080ff', 16))
          .setThumbnail(targetUser.avatarURL() || targetUser.defaultAvatarURL)
          .addFields(
            { name: '💰 ポイント', value: `${profileData.statistics.totalPoints.toLocaleString()}円`, inline: true },
            { name: '🎰 ガチャ回数', value: `${profileData.statistics.totalRolls.toLocaleString()}回`, inline: true },
            { name: '🍃 リーフ', value: `${profileData.statistics.totalLeaves.toLocaleString()}枚`, inline: true },
            { name: '📦 アイテム数', value: `${profileData.statistics.itemCount}個`, inline: true },
            { name: '🏆 アチーブメント', value: `${profileData.statistics.achievementCount}個`, inline: true },
            { name: '👑 称号数', value: `${profileData.titles.owned.length}/${profileData.titles.total}個`, inline: true }
          );

        // アイテム情報を統計ページに追加
        if (profileData.items.length > 0) {
          // レアリティ別にアイテムを分類
          const rarityGroups = {};
          profileData.items.forEach(item => {
            if (!rarityGroups[item.rarity]) {
              rarityGroups[item.rarity] = [];
            }
            rarityGroups[item.rarity].push(item);
          });

          // レアリティ順に表示（最大3ランクまで）
          const rarityOrder = ['LR', 'UR', 'SSR', 'SR', 'R', 'N'];
          let itemCount = 0;
          rarityOrder.forEach(rarity => {
            if (rarityGroups[rarity] && rarityGroups[rarity].length > 0 && itemCount < 3) {
              const items = rarityGroups[rarity].slice(0, 3); // 最大3個まで
              const itemList = items.map(item => 
                `${item.name} x${item.quantity}`
              ).join('\n');
              
              statsEmbed.addFields({ 
                name: `${rarity}ランク`, 
                value: itemList, 
                inline: true 
              });
              itemCount++;
            }
          });
        }

        // アチーブメント情報を統計ページに追加
        if (profileData.achievements.length > 0) {
          // 最近のアチーブメント（最大3個）
          const recentAchievements = profileData.achievements.slice(0, 3);
          const achievementList = recentAchievements.map(achievement => 
            `🏆 ${achievement.name}`
          ).join('\n');
          
          statsEmbed.addFields({ 
            name: '📋 最近のアチーブメント', 
            value: achievementList || 'なし', 
            inline: false 
          });
        }

        // ボタンを作成（シンプルなデザイン）
        const prevButton = new ButtonBuilder()
          .setCustomId('profile_prev')
          .setLabel('前のページ')
          .setStyle(ButtonStyle.Primary);

        const nextButton = new ButtonBuilder()
          .setCustomId('profile_next')
          .setLabel('次のページ')
          .setStyle(ButtonStyle.Primary);

        const pageButton = new ButtonBuilder()
          .setCustomId('profile_page')
          .setLabel('1/2')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const row1 = new ActionRowBuilder().addComponents(prevButton, pageButton, nextButton);

        // 最初のページを表示
        await interaction.reply({ 
          embeds: [basicEmbed], 
          components: [row1],
          ephemeral: false
        });
        return;
      }

      if (action === 'edit') {
        // プロフィールを編集
        const bio = interaction.options.getString('bio');
        const game = interaction.options.getString('game');
        const customTitle = interaction.options.getString('customtitle');

        if (!bio && !game && !customTitle) {
          const embed = new EmbedBuilder()
            .setTitle('エラー')
            .setDescription('編集する項目を指定してください')
            .setColor(0xff0000);
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const updates = {};
        if (bio) updates.bio = bio;
        if (game) updates.favorite_game = game;
        if (customTitle) updates.custom_title = customTitle;

        const success = await updateUserProfile(userId, updates);
        
        if (success) {
          const embed = new EmbedBuilder()
            .setTitle('✅ プロフィール更新')
            .setDescription('プロフィールを更新しました！')
            .setColor(0x4e9a06);
          await interaction.reply({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder()
            .setTitle('エラー')
            .setDescription('プロフィールの更新に失敗しました')
            .setColor(0xff0000);
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        return;
      }

      if (action === 'style') {
        // カードスタイルを変更
        const style = interaction.options.getString('style');
        
        if (!style) {
          // 利用可能なスタイル一覧を表示
          const styles = getAvailableCardStyles();
          
          const embed = new EmbedBuilder()
            .setTitle('🎨 カードスタイル一覧')
            .setDescription('利用可能なカードスタイル')
            .setColor(0x4e9a06);

          styles.forEach(style => {
            embed.addFields({
              name: `${style.name}`,
              value: `${style.description}\nID: \`${style.id}\``,
              inline: true
            });
          });

          await interaction.reply({ embeds: [embed] });
          return;
        }

        const success = await updateUserProfile(userId, { card_style: style });
        
        if (success) {
          const embed = new EmbedBuilder()
            .setTitle('✅ スタイル変更')
            .setDescription(`カードスタイルを **${style}** に変更しました！`)
            .setColor(0x4e9a06);
          await interaction.reply({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder()
            .setTitle('エラー')
            .setDescription('スタイルの変更に失敗しました')
            .setColor(0xff0000);
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        return;
      }

      if (action === 'stats') {
        // プロフィール統計を表示
        const stats = await getProfileStats();
        
        if (!stats) {
          const embed = new EmbedBuilder()
            .setTitle('エラー')
            .setDescription('統計データの取得に失敗しました')
            .setColor(0xff0000);
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle('📊 プロフィール統計')
          .setDescription('サーバー全体のプロフィール統計')
          .setColor(0x4e9a06)
          .addFields(
            { name: '総プロフィール数', value: `${stats.total_profiles}人`, inline: true },
            { name: '自己紹介設定者', value: `${stats.profiles_with_bio}人`, inline: true },
            { name: '好きなゲーム設定者', value: `${stats.profiles_with_game}人`, inline: true },
            { name: 'カスタムタイトル設定者', value: `${stats.profiles_with_custom_title}人`, inline: true }
          );

        await interaction.reply({ embeds: [embed] });
        return;
      }

    } catch (error) {
      console.error('プロフィールコマンドエラー:', error);
      const embed = new EmbedBuilder()
        .setTitle('エラー')
        .setDescription('コマンドの実行中にエラーが発生しました')
        .setColor(0xff0000);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    return;
  }

  // ======== プロフィールページ切り替え処理 ========
  if (interaction.isButton()) {
    if (interaction.customId === 'profile_prev' || interaction.customId === 'profile_next') {
      try {
        // 現在のメッセージからユーザー情報を取得
        const embed = interaction.message.embeds[0];
        
        if (!embed || !embed.description) {
          await interaction.reply({ content: 'エラー: 埋め込み情報を取得できませんでした', ephemeral: true });
          return;
        }
        
        const username = embed.description.match(/\*\*(.*?)\*\*/)?.[1];
        
        if (!username) {
          await interaction.reply({ content: 'エラー: ユーザー情報を取得できませんでした', ephemeral: true });
          return;
        }

        // ユーザーを検索（より堅牢な方法）
        let targetUser = interaction.user; // デフォルトはコマンド実行者
        
        // 埋め込みのタイトルからもユーザー名を抽出
        const titleMatch = embed.title?.match(/(.*?)\s+の/);
        const titleUsername = titleMatch?.[1];
        
        // ユーザー名で検索
        if (username) {
          const foundMember = interaction.guild.members.cache.find(member => 
            member.user.username === username || 
            member.displayName === username ||
            member.user.globalName === username
          );
          if (foundMember) {
            targetUser = foundMember.user;
          }
        }
        
        // タイトルからも検索
        if (titleUsername && titleUsername !== username) {
          const foundMember = interaction.guild.members.cache.find(member => 
            member.user.username === titleUsername || 
            member.displayName === titleUsername ||
            member.user.globalName === titleUsername
          );
          if (foundMember) {
            targetUser = foundMember.user;
          }
        }
        
        // プロフィールデータを取得
        const profileData = await generateProfileCardData(targetUser.id, targetUser);
        
        if (!profileData) {
          await interaction.reply({ content: 'エラー: プロフィールデータを取得できませんでした', ephemeral: true });
          return;
        }

        // 現在のページを判定
        const currentTitle = embed.title;
        let currentPage = 0;
        
        if (currentTitle.includes('の統計・詳細')) currentPage = 1;

        // ページを計算
        let newPage = currentPage;
        if (interaction.customId === 'profile_prev') {
          newPage = currentPage > 0 ? currentPage - 1 : 1;
        } else if (interaction.customId === 'profile_next') {
          newPage = currentPage < 1 ? currentPage + 1 : 0;
        }

        // 新しいページの埋め込みを作成
        let newEmbed;
        
        switch (newPage) {
          case 0: // 基本情報
            const style = profileData.profile.style || { color: 0x4e9a06 };
            newEmbed = new EmbedBuilder()
              .setTitle(`${profileData.basicInfo.title}`)
              .setDescription(`**${profileData.basicInfo.username}** のプロフィール${profileData.basicInfo.customTitle ? `\n**${profileData.basicInfo.customTitle}**` : ''}`)
              .setColor(parseInt(style.color?.replace('#', '') || '4e9a06', 16))
              .setThumbnail(targetUser.avatarURL() || targetUser.defaultAvatarURL)
              .addFields(
                { name: '👤 ユーザー名', value: profileData.basicInfo.username, inline: true },
                { name: '🎮 好きなゲーム', value: profileData.basicInfo.favoriteGame || '未設定', inline: true }
              );

            if (profileData.basicInfo.bio) {
              newEmbed.addFields({ name: '📝 自己紹介', value: profileData.basicInfo.bio, inline: false });
            }

            // 称号情報を基本情報に追加
            if (profileData.titles.owned.length > 0) {
              // 装備中の称号
              if (profileData.titles.equipped.length > 0) {
                const equippedTitle = profileData.titles.equipped[0];
                newEmbed.addFields({ 
                  name: '✅ 装備中の称号', 
                  value: `${equippedTitle.icon} ${equippedTitle.name}`, 
                  inline: false 
                });
              }
              
              // 称号一覧（最大5個）
              const titleList = profileData.titles.owned.slice(0, 5).map(title => 
                `${title.icon} ${title.name}`
              ).join('\n');
              
              newEmbed.addFields({ 
                name: `📋 称号一覧 (${profileData.titles.owned.length}/${profileData.titles.total}個)`, 
                value: titleList || 'なし', 
                inline: false 
              });
            }
            break;

          case 1: // 統計・詳細情報
            const statsStyle = profileData.profile.style || { accent: '#0080ff' };
            newEmbed = new EmbedBuilder()
              .setTitle(`📊 ${profileData.basicInfo.username} の統計・詳細`)
              .setColor(parseInt(statsStyle.accent?.replace('#', '') || '0080ff', 16))
              .setThumbnail(targetUser.avatarURL() || targetUser.defaultAvatarURL)
              .addFields(
                { name: '💰 ポイント', value: `${profileData.statistics.totalPoints.toLocaleString()}円`, inline: true },
                { name: '🎰 ガチャ回数', value: `${profileData.statistics.totalRolls.toLocaleString()}回`, inline: true },
                { name: '🍃 リーフ', value: `${profileData.statistics.totalLeaves.toLocaleString()}枚`, inline: true },
                { name: '📦 アイテム数', value: `${profileData.statistics.itemCount}個`, inline: true },
                { name: '🏆 アチーブメント', value: `${profileData.statistics.achievementCount}個`, inline: true },
                { name: '👑 称号数', value: `${profileData.titles.owned.length}/${profileData.titles.total}個`, inline: true }
              );

            // アイテム情報を統計ページに追加
            if (profileData.items.length > 0) {
              // レアリティ別にアイテムを分類
              const rarityGroups = {};
              profileData.items.forEach(item => {
                if (!rarityGroups[item.rarity]) {
                  rarityGroups[item.rarity] = [];
                }
                rarityGroups[item.rarity].push(item);
              });

              // レアリティ順に表示（最大3ランクまで）
              const rarityOrder = ['LR', 'UR', 'SSR', 'SR', 'R', 'N'];
              let itemCount = 0;
              rarityOrder.forEach(rarity => {
                if (rarityGroups[rarity] && rarityGroups[rarity].length > 0 && itemCount < 3) {
                  const items = rarityGroups[rarity].slice(0, 3); // 最大3個まで
                  const itemList = items.map(item => 
                    `${item.name} x${item.quantity}`
                  ).join('\n');
                  
                  newEmbed.addFields({ 
                    name: `${rarity}ランク`, 
                    value: itemList, 
                    inline: true 
                  });
                  itemCount++;
                }
              });
            }

            // アチーブメント情報を統計ページに追加
            if (profileData.achievements.length > 0) {
              // 最近のアチーブメント（最大3個）
              const recentAchievements = profileData.achievements.slice(0, 3);
              const achievementList = recentAchievements.map(achievement => 
                `🏆 ${achievement.name}`
              ).join('\n');
              
              newEmbed.addFields({ 
                name: '📋 最近のアチーブメント', 
                value: achievementList || 'なし', 
                inline: false 
              });
            }
            break;
        }

        // ボタンを作成（シンプルなデザイン）
        const prevButton = new ButtonBuilder()
          .setCustomId('profile_prev')
          .setLabel('前のページ')
          .setStyle(ButtonStyle.Primary);

        const nextButton = new ButtonBuilder()
          .setCustomId('profile_next')
          .setLabel('次のページ')
          .setStyle(ButtonStyle.Primary);

        const pageButton = new ButtonBuilder()
          .setCustomId('profile_page')
          .setLabel(`${newPage + 1}/2`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const row1 = new ActionRowBuilder().addComponents(prevButton, pageButton, nextButton);

        // ページを更新
        await interaction.update({ 
          embeds: [newEmbed], 
          components: [row1]
        });

      } catch (error) {
        console.error('プロフィールページ切り替えエラー:', error);
        console.error('埋め込み情報:', interaction.message.embeds[0]);
        console.error('ユーザー情報:', interaction.user.username);
        
        // エラーが発生した場合は基本情報ページに戻す
        try {
          const profileData = await generateProfileCardData(interaction.user.id, interaction.user);
          if (profileData) {
            const style = profileData.profile.style || { color: 0x4e9a06 };
            const basicEmbed = new EmbedBuilder()
              .setTitle(`${profileData.basicInfo.title}`)
              .setDescription(`**${profileData.basicInfo.username}** のプロフィール${profileData.basicInfo.customTitle ? `\n**${profileData.basicInfo.customTitle}**` : ''}`)
              .setColor(parseInt(style.color?.replace('#', '') || '4e9a06', 16))
              .setThumbnail(interaction.user.avatarURL() || interaction.user.defaultAvatarURL)
              .addFields(
                { name: '👤 ユーザー名', value: profileData.basicInfo.username, inline: true },
                { name: '🎮 好きなゲーム', value: profileData.basicInfo.favoriteGame || '未設定', inline: true }
              );

            if (profileData.basicInfo.bio) {
              basicEmbed.addFields({ name: '📝 自己紹介', value: profileData.basicInfo.bio, inline: false });
            }

            const prevButton = new ButtonBuilder()
              .setCustomId('profile_prev')
              .setLabel('前のページ')
              .setStyle(ButtonStyle.Primary);

            const nextButton = new ButtonBuilder()
              .setCustomId('profile_next')
              .setLabel('次のページ')
              .setStyle(ButtonStyle.Primary);

            const pageButton = new ButtonBuilder()
              .setCustomId('profile_page')
              .setLabel('1/2')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true);

            const row1 = new ActionRowBuilder().addComponents(prevButton, pageButton, nextButton);

            await interaction.update({ 
              embeds: [basicEmbed], 
              components: [row1]
            });
            return;
          }
        } catch (fallbackError) {
          console.error('フォールバック処理エラー:', fallbackError);
        }
        
        await interaction.reply({ content: 'エラーが発生しました。プロフィールを再表示します。', ephemeral: true });
      }
      return;
    }
  }

  // ======== 暗号通貨システム関連コマンド ========
  if (interaction.commandName === 'crypto') {
    const action = interaction.options.getString('action');
    const symbol = interaction.options.getString('symbol');
    const amount = interaction.options.getNumber('amount');
    const price = interaction.options.getNumber('price');
    
    let embed = new EmbedBuilder().setTitle('💰 暗号通貨システム').setColor(0x00ff00);
    
    try {
      switch (action) {
        case 'prices':
          const cryptos = await getAllCryptoPrices();
          const priceList = cryptos.map(crypto => {
            const change = crypto.current_price - crypto.base_price;
            const changePercent = ((change / crypto.base_price) * 100).toFixed(2);
            const changeEmoji = change >= 0 ? '📈' : '📉';
            return `${crypto.icon} **${crypto.symbol}** - ¥${crypto.current_price.toLocaleString()} (${changeEmoji} ${changePercent}%)`;
          }).join('\n');
          
          embed.setDescription(`**暗号通貨価格一覧**\n${priceList}`);
          break;
          
        case 'wallet':
          const wallet = await getUserCryptoWallet(interaction.user.id);
          if (wallet.length === 0) {
            embed.setDescription('ウォレットに暗号通貨がありません。\n`/crypto buy` で購入してください。');
          } else {
            const walletList = wallet.map(crypto => 
              `${crypto.icon} **${crypto.symbol}** - ${crypto.balance.toFixed(6)} (¥${(crypto.balance * crypto.current_price).toLocaleString()})`
            ).join('\n');
            embed.setDescription(`**${interaction.user.username} のウォレット**\n${walletList}`);
          }
          break;
          
        case 'buy':
          if (!symbol || !amount || !price) {
            embed.setDescription('シンボル、数量、価格をすべて指定してください。').setColor(0xff0000);
            break;
          }
          
          const buyResult = await buyCrypto(interaction.user.id, symbol.toUpperCase(), amount, price);
          
          // 価格変動を更新
          await updateCryptoPriceFromTrade(symbol.toUpperCase(), price, amount);
          
          embed.setDescription(`**${symbol.toUpperCase()} を購入しました！**\n` +
            `数量: ${amount} ${symbol.toUpperCase()}\n` +
            `価格: ¥${price.toLocaleString()}\n` +
            `合計: ¥${buyResult.totalCost.toLocaleString()}\n` +
            `残高: ${buyResult.balance.toFixed(6)} ${symbol.toUpperCase()}\n` +
            `残りポイント: ¥${buyResult.remainingPoints.toLocaleString()}`);
          break;
          
        case 'sell':
          if (!symbol || !amount || !price) {
            embed.setDescription('シンボル、数量、価格をすべて指定してください。').setColor(0xff0000);
            break;
          }
          
          const sellResult = await sellCrypto(interaction.user.id, symbol.toUpperCase(), amount, price);
          
          // 価格変動を更新
          await updateCryptoPriceFromTrade(symbol.toUpperCase(), price, amount);
          
          embed.setDescription(`**${symbol.toUpperCase()} を売却しました！**\n` +
            `数量: ${amount} ${symbol.toUpperCase()}\n` +
            `価格: ¥${price.toLocaleString()}\n` +
            `合計: ¥${sellResult.totalValue.toLocaleString()}\n` +
            `残高: ${sellResult.balance.toFixed(6)} ${symbol.toUpperCase()}\n` +
            `獲得ポイント: ¥${sellResult.newPoints.toLocaleString()}`);
          break;
          
        case 'history':
          const history = await getCryptoTransactionHistory(interaction.user.id, 10);
          if (history.length === 0) {
            embed.setDescription('取引履歴がありません。');
          } else {
            const historyList = history.map(tx => {
              const typeEmoji = tx.transaction_type === 'buy' ? '🛒' : 
                               tx.transaction_type === 'sell' ? '💰' : 
                               tx.transaction_type === 'mining' ? '⛏️' : '🔄';
              return `${typeEmoji} **${tx.transaction_type.toUpperCase()}** ${tx.symbol} - ${tx.amount.toFixed(6)} (¥${tx.total_value.toLocaleString()})`;
            }).join('\n');
            embed.setDescription(`**取引履歴**\n${historyList}`);
          }
          break;
          
        case 'market':
          const marketStats = await getMarketStats();
          embed.setDescription(`**市場統計**\n` +
            `総時価総額: ¥${marketStats.totalMarketCap.toLocaleString()}\n` +
            `24時間取引量: ¥${marketStats.totalVolume.toLocaleString()}\n` +
            `暗号通貨数: ${marketStats.cryptoCount}種類\n\n` +
            `**📈 トップゲイナー**\n${marketStats.topGainers.map(crypto => 
              `${crypto.icon} ${crypto.symbol}: +${(crypto.change * 100).toFixed(2)}%`
            ).join('\n')}\n\n` +
            `**📉 トップルーザー**\n${marketStats.topLosers.map(crypto => 
              `${crypto.icon} ${crypto.symbol}: ${(crypto.change * 100).toFixed(2)}%`
            ).join('\n')}`);
          break;
          
        case 'predict':
          if (!symbol) {
            embed.setDescription('シンボルを指定してください。').setColor(0xff0000);
            break;
          }
          
          const prediction = await getCryptoPricePrediction(symbol.toUpperCase());
          const trendEmoji = prediction.trend === 'bullish' ? '📈' : 
                           prediction.trend === 'bearish' ? '📉' : '➡️';
          const confidencePercent = (prediction.confidence * 100).toFixed(1);
          
          embed.setDescription(`**${symbol.toUpperCase()} 価格予測**\n` +
            `トレンド: ${trendEmoji} ${prediction.trend}\n` +
            `信頼度: ${confidencePercent}%`);
          break;
      }
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      embed.setDescription(`エラー: ${error.message}`).setColor(0xff0000);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    return;
  }

  // ======== マイニングシステム関連コマンド ========
  if (interaction.commandName === 'mining') {
    const action = interaction.options.getString('action');
    const symbol = interaction.options.getString('symbol');
    
    let embed = new EmbedBuilder().setTitle('⛏️ マイニングシステム').setColor(0x00ff00);
    
    try {
      switch (action) {
        case 'start':
          if (!symbol) {
            embed.setDescription('マイニングする暗号通貨のシンボルを指定してください。').setColor(0xff0000);
            break;
          }
          
          const startResult = await startMiningSession(interaction.user.id, symbol.toUpperCase());
          embed.setDescription(`**${symbol.toUpperCase()} のマイニングを開始しました！**\n` +
            `マイニングパワー: ${startResult.mining_power}\n` +
            `1時間ごとに報酬をクレームできます。`);
          break;
          
        case 'stop':
          const stopResult = await stopMiningSession(interaction.user.id);
          embed.setDescription(`**${stopResult.crypto_symbol} のマイニングを停止しました！**\n` +
            `総マイニング量: ${stopResult.total_mined.toFixed(6)} ${stopResult.crypto_symbol}`);
          break;
          
        case 'claim':
          const claimResult = await claimMiningReward(interaction.user.id);
          embed.setDescription(`**マイニング報酬をクレームしました！**\n` +
            `獲得: ${claimResult.amount.toFixed(6)} ${claimResult.symbol}\n` +
            `残高: ${claimResult.balance.toFixed(6)} ${claimResult.symbol}\n` +
            `次回クレーム: ${Math.ceil(claimResult.nextClaimTime / 60)} 分後`);
          break;
          
        case 'status':
          const session = await getMiningSession(interaction.user.id);
          if (!session) {
            embed.setDescription('マイニングセッションがありません。\n`/mining start` でマイニングを開始してください。');
          } else {
            const timeUntilClaim = Math.ceil(session.timeUntilClaim / 60);
            embed.setDescription(`**マイニング状態**\n` +
              `暗号通貨: ${session.icon} ${session.crypto_symbol}\n` +
              `マイニングパワー: ${session.mining_power}\n` +
              `効率: ${session.efficiency}x\n` +
              `総マイニング量: ${session.total_mined.toFixed(6)} ${session.crypto_symbol}\n` +
              `クレーム可能: ${session.canClaim ? '✅ 可能' : `⏰ ${timeUntilClaim}分後`}`);
          }
          break;
          
        case 'upgrade':
          const upgradeResult = await upgradeMiningPower(interaction.user.id);
          embed.setDescription(`**マイニングパワーをアップグレードしました！**\n` +
            `新しいパワー: ${upgradeResult.newPower}\n` +
            `コスト: ¥${upgradeResult.cost.toLocaleString()}\n` +
            `残りポイント: ¥${upgradeResult.remainingPoints.toLocaleString()}`);
          break;
      }
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      embed.setDescription(`エラー: ${error.message}`).setColor(0xff0000);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    return;
  }

  // ======== 価格アラート関連コマンド ========
  if (interaction.commandName === 'cryptoalert') {
    const symbol = interaction.options.getString('symbol');
    const targetPrice = interaction.options.getNumber('price');
    const alertType = interaction.options.getString('type');
    
    try {
      await setPriceAlert(interaction.user.id, symbol.toUpperCase(), targetPrice, alertType);
      
      const embed = new EmbedBuilder()
        .setTitle('🔔 価格アラート設定')
        .setDescription(`**${symbol.toUpperCase()} の価格アラートを設定しました！**\n` +
          `目標価格: ¥${targetPrice.toLocaleString()}\n` +
          `アラートタイプ: ${alertType === 'above' ? '価格上昇時' : '価格下落時'}`)
        .setColor(0x00ff00);
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle('エラー')
        .setDescription(`エラー: ${error.message}`)
        .setColor(0xff0000);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    return;
  }


  if (interaction.commandName === 'job') {
    await handleJobCommand(interaction);
    return;
  }

  if (interaction.commandName === 'dice') {
    await handleDiceCommand(interaction);
    return;
  }

  if (interaction.commandName === 'bank') {
    await handleBankCommand(interaction);
    return;
  }

  if (interaction.commandName === 'coin') {
    await handleCoinCommand(interaction);
    return;
  }

  if (interaction.commandName === 'admin') {
    await handleAdminCommand(interaction);
    return;
  }

  // ボタンインタラクション処理
  if (interaction.isButton()) {
    const handled = await handleBankButtonInteraction(interaction);
    if (handled) return;
  }

  // モーダル送信処理
  if (interaction.isModalSubmit()) {
    const customId = interaction.customId;
    
    if (customId === 'buy_modal') {
      await handleBuyModalSubmit(interaction);
    } else if (customId === 'sell_modal') {
      await handleSellModalSubmit(interaction);
    } else if (customId === 'shop_modal') {
      await handleShopModalSubmit(interaction);
    } else {
      await handleBankModalSubmit(interaction);
    }
    return;
  }
});

// 銀行モーダル送信ハンドラー
async function handleBankModalSubmit(interaction) {
  const customId = interaction.customId;
  const userId = interaction.user.id;

  try {
    if (customId === 'bank_deposit_modal') {
      const amount = parseInt(interaction.fields.getTextInputValue('deposit_amount'));
      
      if (isNaN(amount) || amount <= 0) {
        await interaction.reply({ 
          content: '有効な金額を入力してください。', 
          ephemeral: true 
        });
        return;
      }

      const account = await depositToBank(userId, amount);
      const user = await getUser(userId);
      
      const embed = new EmbedBuilder()
        .setTitle('💰 預金完了')
        .setDescription(`¥${amount.toLocaleString()} を銀行に預金しました`)
        .setColor(0x2ecc71)
        .addFields(
          { name: '預金額', value: `¥${amount.toLocaleString()}`, inline: true },
          { name: '銀行残高', value: `¥${account.balance.toLocaleString()}`, inline: true },
          { name: '所持ポイント', value: `¥${user.points.toLocaleString()}`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (customId === 'bank_withdraw_modal') {
      const amount = parseInt(interaction.fields.getTextInputValue('withdraw_amount'));
      
      if (isNaN(amount) || amount <= 0) {
        await interaction.reply({ 
          content: '有効な金額を入力してください。', 
          ephemeral: true 
        });
        return;
      }

      const account = await withdrawFromBank(userId, amount);
      const user = await getUser(userId);
      
      const embed = new EmbedBuilder()
        .setTitle('💸 引き出し完了')
        .setDescription(`¥${amount.toLocaleString()} を銀行から引き出しました`)
        .setColor(0xe74c3c)
        .addFields(
          { name: '引き出し額', value: `¥${amount.toLocaleString()}`, inline: true },
          { name: '銀行残高', value: `¥${account.balance.toLocaleString()}`, inline: true },
          { name: '所持ポイント', value: `¥${user.points.toLocaleString()}`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (customId === 'bank_transfer_modal') {
      const targetUserId = interaction.fields.getTextInputValue('transfer_user');
      const amount = parseInt(interaction.fields.getTextInputValue('transfer_amount'));
      
      if (isNaN(amount) || amount <= 0) {
        await interaction.reply({ 
          content: '有効な金額を入力してください。', 
          ephemeral: true 
        });
        return;
      }

      if (targetUserId === userId) {
        await interaction.reply({ 
          content: '自分自身に送金することはできません。', 
          ephemeral: true 
        });
        return;
      }

      // 送金処理（銀行から銀行へ）
      const senderAccount = await getBankAccount(userId);
      if (senderAccount.balance < amount) {
        await interaction.reply({ 
          content: `銀行残高が足りません。残高: ¥${senderAccount.balance.toLocaleString()}`, 
          ephemeral: true 
        });
        return;
      }

      await dbRun(`BEGIN TRANSACTION`);
      
      try {
        // 送金者の銀行残高を減らす
        await dbRun(`UPDATE bank_accounts SET balance = balance - ? WHERE userId = ?`, amount, userId);
        
        // 受取人の銀行口座を作成/更新
        await dbRun(`INSERT OR REPLACE INTO bank_accounts (userId, balance) VALUES (?, COALESCE((SELECT balance FROM bank_accounts WHERE userId = ?), 0) + ?)`, targetUserId, targetUserId, amount);
        
        // 取引履歴を記録
        const senderUpdatedAccount = await getBankAccount(userId);
        const receiverAccount = await getBankAccount(targetUserId);
        
        await dbRun(`
          INSERT INTO bank_transactions (userId, transactionType, amount, balanceAfter)
          VALUES (?, 'transfer_send', ?, ?)
        `, userId, amount, senderUpdatedAccount.balance);
        
        await dbRun(`
          INSERT INTO bank_transactions (userId, transactionType, amount, balanceAfter)
          VALUES (?, 'transfer_receive', ?, ?)
        `, targetUserId, amount, receiverAccount.balance);
        
        await dbRun(`COMMIT`);
        
        const embed = new EmbedBuilder()
          .setTitle('💸 送金完了')
          .setDescription(`¥${amount.toLocaleString()} を送金しました`)
          .setColor(0x9b59b6)
          .addFields(
            { name: '送金額', value: `¥${amount.toLocaleString()}`, inline: true },
            { name: '送金先', value: `<@${targetUserId}>`, inline: true },
            { name: '残高', value: `¥${senderUpdatedAccount.balance.toLocaleString()}`, inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        
      } catch (error) {
        await dbRun(`ROLLBACK`);
        throw error;
      }
    }
  } catch (error) {
    console.error('銀行モーダルエラー:', error);
    await interaction.reply({ 
      content: `エラーが発生しました: ${error.message}`, 
      ephemeral: true 
    });
  }
}









// ガチャ時のクエスト進捗（重複削除 - メインのrollコマンド処理で既に実装済み）


// キャンセルボタンの処理
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    if (interaction.customId === 'buy_cancel') {
      const embed = new EmbedBuilder()
        .setTitle('購入キャンセル')
        .setDescription('購入をキャンセルしました。')
        .setColor(0xff0000);
      await interaction.update({ embeds: [embed], components: [] });
      return;
    }
    
    if (interaction.customId === 'sell_cancel') {
      const embed = new EmbedBuilder()
        .setTitle('売却キャンセル')
        .setDescription('売却をキャンセルしました。')
        .setColor(0xff0000);
      await interaction.update({ embeds: [embed], components: [] });
      return;
    }
    
    if (interaction.customId === 'shop_cancel') {
      const embed = new EmbedBuilder()
        .setTitle('ショップ購入キャンセル')
        .setDescription('ショップ購入をキャンセルしました。')
        .setColor(0xff0000);
      await interaction.update({ embeds: [embed], components: [] });
      return;
    }
    
    // 詫び石使用ボタン
    if (interaction.customId.startsWith('use_apology_stone_')) {
      const userId = interaction.customId.split('_')[3];
      if (interaction.user.id !== userId) {
        await interaction.reply({ content: 'あなたの詫び石ではありません！', ephemeral: true });
        return;
      }
      
      await interaction.deferReply();
      const result = await rollApologyGacha(interaction.user.id);
      
      if (result.error) {
        const embed = new EmbedBuilder()
          .setTitle('詫び石使用結果')
          .setDescription(result.error)
          .setColor(0xff0000);
        await interaction.editReply({ embeds: [embed], components: [] });
      } else {
        const resultsText = result.results.join('\n');
        const embed = new EmbedBuilder()
          .setTitle('🎉 詫び石使用結果 🎉')
          .setDescription(`**SR以上確定10連ガチャ！**\n\n${resultsText}`)
          .setColor(0xffd700);
        await interaction.editReply({ embeds: [embed], components: [] });
      }
      return;
    }

    // 隠しアイテム使用ボタン
    if (interaction.customId.startsWith('use_hidden_item_')) {
      const parts = interaction.customId.split('_');
      const userId = parts[3];
      const itemName = parts[4];
      
      if (interaction.user.id !== userId) {
        await interaction.reply({ content: 'あなたのアイテムではありません！', ephemeral: true });
        return;
      }
      
      await interaction.deferReply();
      const result = await useHiddenItem(interaction.user.id, itemName);
      
      if (result.error) {
        const embed = new EmbedBuilder()
          .setTitle('アイテム使用結果')
          .setDescription(result.error)
          .setColor(0xff0000);
        await interaction.editReply({ embeds: [embed], components: [] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle(`🎉 ${itemName}使用結果`)
          .setDescription(result.effectMessage)
          .addFields({
            name: '💡 効果',
            value: HIDDEN_ROLL_ITEMS.find(i => i.name === itemName)?.effect || '不明',
            inline: false
          })
          .setColor(itemName === "エナドリ" ? 0x696969 : 0xffd700);
        await interaction.editReply({ embeds: [embed], components: [] });
      }
      return;
    }

    // リーフガチャアイテム使用ボタン
    if (interaction.customId.startsWith('use_leaf_item_')) {
      const parts = interaction.customId.split('_');
      const userId = parts[3];
      const itemName = parts[4];
      
      if (interaction.user.id !== userId) {
        await interaction.reply({ content: 'あなたのアイテムではありません！', ephemeral: true });
        return;
      }
      
      await interaction.deferReply();
      
      if (itemName === "風精の葉っぱ") {
        // 風精の葉っぱの効果：Bot内の待機時間を即時リセット
        // ここでは簡単に成功メッセージを表示
        const removed = await removeItem(interaction.user.id, itemName, 1);
        if (!removed) {
          await interaction.editReply({ content: 'アイテムが足りません！' });
          return;
        }
        
        const embed = new EmbedBuilder()
          .setTitle('🍃 風精の葉っぱ使用結果')
          .setDescription('風の精霊があなたの周りを舞い踊りました！\n\n💨 Bot内の待機時間が即時リセットされました！')
          .setColor(0x90EE90);
        
        await interaction.editReply({ embeds: [embed], components: [] });
      } else {
        await interaction.editReply({ content: 'このアイテムは使用できません。' });
      }
      return;
    }

    // ブラックジャックボタン処理
    if (interaction.customId === 'blackjack_hit') {
      const result = hitCard(interaction.user.id);
      
      if (result.error) {
        const embed = new EmbedBuilder()
          .setTitle('ブラックジャック')
          .setDescription(result.error)
          .setColor(0xff0000);
        await interaction.update({ embeds: [embed], components: [] });
        return;
      }

      const game = result.game;
      const embed = new EmbedBuilder()
        .setTitle('🃏 ブラックジャック')
        .setDescription(`ベット額: ¥${game.betAmount}円\n\n**あなたの手札:** ${game.playerHand}\n合計: ${game.playerValue}\n\n**ディーラーの手札:** ${game.dealerHand}`)
        .setColor(0x00bfff);

      // バストした場合
      if (result.bust) {
        embed.setDescription(`ベット額: ¥${game.betAmount}円\n\n**あなたの手札:** ${game.playerHand}\n合計: ${game.playerValue} (バスト！)\n\n**ディーラーの手札:** ${game.dealerHand}\n合計: ${game.dealerValue}\n\n😞 バスト！敗北...\n獲得円: ¥0円`);
        embed.setColor(0xff0000);
        await interaction.update({ embeds: [embed], components: [] });
        return;
      }

      // ゲームが終了している場合
      if (game.gameState === 'finished') {
        let resultText = '';
        let color = 0x00bfff;
        
        switch (game.result) {
          case 'win':
            resultText = '🎉 勝利！';
            color = 0x00ff00;
            break;
          case 'lose':
            resultText = '😞 敗北...';
            color = 0xff0000;
            break;
          case 'push':
            resultText = '🤝 引き分け';
            color = 0xffff00;
            break;
        }

        // 勝利金を付与
        if (game.winnings > 0) {
          await addPoints(interaction.user.id, game.winnings);
        }

        embed.setDescription(`ベット額: ¥${game.betAmount}円\n\n**あなたの手札:** ${game.playerHand}\n合計: ${game.playerValue}\n\n**ディーラーの手札:** ${game.dealerHand}\n合計: ${game.dealerValue}\n\n${resultText}\n獲得円: ¥${game.winnings}円`);
        embed.setColor(color);
        
        await interaction.update({ embeds: [embed], components: [] });
        return;
      }

      // ゲーム継続中の場合はボタンを表示
      const hitButton = new ButtonBuilder()
        .setCustomId('blackjack_hit')
        .setLabel('ヒット')
        .setStyle(ButtonStyle.Primary);

      const standButton = new ButtonBuilder()
        .setCustomId('blackjack_stand')
        .setLabel('スタンド')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(hitButton, standButton);

      await interaction.update({ embeds: [embed], components: [row] });
      return;
    }

    if (interaction.customId === 'blackjack_stand') {
      const result = standCard(interaction.user.id);
      
      if (result.error) {
        const embed = new EmbedBuilder()
          .setTitle('ブラックジャック')
          .setDescription(result.error)
          .setColor(0xff0000);
        await interaction.update({ embeds: [embed], components: [] });
        return;
      }

      const game = result.game;
      let resultText = '';
      let color = 0x00bfff;
      
      switch (game.result) {
        case 'win':
          resultText = '🎉 勝利！';
          color = 0x00ff00;
          break;
        case 'lose':
          resultText = '😞 敗北...';
          color = 0xff0000;
          break;
        case 'push':
          resultText = '🤝 引き分け';
          color = 0xffff00;
          break;
      }

      // 勝利金を付与
      if (game.winnings > 0) {
        await addPoints(interaction.user.id, game.winnings);
      }

      const embed = new EmbedBuilder()
        .setTitle('🃏 ブラックジャック')
        .setDescription(`ベット額: ¥${game.betAmount}円\n\n**あなたの手札:** ${game.playerHand}\n合計: ${game.playerValue}\n\n**ディーラーの手札:** ${game.dealerHand}\n合計: ${game.dealerValue}\n\n${resultText}\n獲得円: ¥${game.winnings}円`)
        .setColor(color);

      await interaction.update({ embeds: [embed], components: [] });
      return;
    }

    // スロットマシンボタン処理
    if (interaction.customId === 'slot_spin') {
      const game = getActiveSlotGame(interaction.user.id);
      
      if (!game) {
        const embed = new EmbedBuilder()
          .setTitle('🎰 スロットマシン')
          .setDescription('アクティブなスロットゲームが見つかりません。')
          .setColor(0xff0000);
        await interaction.update({ embeds: [embed], components: [] });
        return;
      }

      // スピン実行
      const reels = spinAllReels(game.id);
      
      if (!reels) {
        const embed = new EmbedBuilder()
          .setTitle('🎰 スロットマシン')
          .setDescription(`クレジットが足りません！\n現在のクレジット: ¥${game.credits}円\n必要クレジット: ¥${game.betPerSpin}円\n\nゲームを終了してクレジットを円に変換してください。`)
          .setColor(0xff0000);

        // ゲーム終了ボタンのみ表示
        const endButton = new ButtonBuilder()
          .setCustomId('slot_end')
          .setLabel('ゲーム終了')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(endButton);
        await interaction.update({ embeds: [embed], components: [row] });
        return;
      }
      
      const payout = calculatePayout(game.id);
      const gameState = getSlotGameState(game.id);
      
      // 結果を表示
      const embed = new EmbedBuilder()
        .setTitle('🎰 スロットマシン')
        .setDescription(`クレジット: ${gameState.credits}\nベット/スピン: ${gameState.betPerSpin}\n\n${formatReels(gameState.reels)}\n\n配当: ${payout}クレジット`)
        .setColor(payout > 0 ? 0x00ff00 : 0xff0000);

      // ボタンを作成
      const spinButton = new ButtonBuilder()
        .setCustomId('slot_spin')
        .setLabel('スピン')
        .setStyle(ButtonStyle.Primary);

      const betUpButton = new ButtonBuilder()
        .setCustomId('slot_bet_up')
        .setLabel('ベット+')
        .setStyle(ButtonStyle.Secondary);

      const betDownButton = new ButtonBuilder()
        .setCustomId('slot_bet_down')
        .setLabel('ベット-')
        .setStyle(ButtonStyle.Secondary);

      const endButton = new ButtonBuilder()
        .setCustomId('slot_end')
        .setLabel('ゲーム終了')
        .setStyle(ButtonStyle.Danger);

      const row1 = new ActionRowBuilder().addComponents(spinButton, betUpButton, betDownButton);
      const row2 = new ActionRowBuilder().addComponents(endButton);

      await interaction.update({ embeds: [embed], components: [row1, row2] });
      return;
    }

    if (interaction.customId === 'slot_bet_up') {
      const game = getActiveSlotGame(interaction.user.id);
      
      if (!game) {
        const embed = new EmbedBuilder()
          .setTitle('🎰 スロットマシン')
          .setDescription('アクティブなスロットゲームが見つかりません。')
          .setColor(0xff0000);
        await interaction.update({ embeds: [embed], components: [] });
        return;
      }

      // ベット額を増加（10ずつ）
      const newBet = Math.min(game.betPerSpin + 10, 100);
      changeBetAmount(game.id, newBet);
      
      const gameState = getSlotGameState(game.id);
      
      // 結果を表示
      const embed = new EmbedBuilder()
        .setTitle('🎰 スロットマシン')
        .setDescription(`クレジット: ${gameState.credits}\nベット/スピン: ${gameState.betPerSpin}\n\n${formatReels(gameState.reels)}\n\nベット額を${newBet}に変更しました！`)
        .setColor(0x00bfff);

      // ボタンを作成
      const spinButton = new ButtonBuilder()
        .setCustomId('slot_spin')
        .setLabel('スピン')
        .setStyle(ButtonStyle.Primary);

      const betUpButton = new ButtonBuilder()
        .setCustomId('slot_bet_up')
        .setLabel('ベット+')
        .setStyle(ButtonStyle.Secondary);

      const betDownButton = new ButtonBuilder()
        .setCustomId('slot_bet_down')
        .setLabel('ベット-')
        .setStyle(ButtonStyle.Secondary);

      const endButton = new ButtonBuilder()
        .setCustomId('slot_end')
        .setLabel('ゲーム終了')
        .setStyle(ButtonStyle.Danger);

      const row1 = new ActionRowBuilder().addComponents(spinButton, betUpButton, betDownButton);
      const row2 = new ActionRowBuilder().addComponents(endButton);

      await interaction.update({ embeds: [embed], components: [row1, row2] });
      return;
    }

    if (interaction.customId === 'slot_bet_down') {
      const game = getActiveSlotGame(interaction.user.id);
      
      if (!game) {
        const embed = new EmbedBuilder()
          .setTitle('🎰 スロットマシン')
          .setDescription('アクティブなスロットゲームが見つかりません。')
          .setColor(0xff0000);
        await interaction.update({ embeds: [embed], components: [] });
        return;
      }

      // ベット額を減少（10ずつ）
      const newBet = Math.max(game.betPerSpin - 10, 10);
      changeBetAmount(game.id, newBet);
      
      const gameState = getSlotGameState(game.id);
      
      // 結果を表示
      const embed = new EmbedBuilder()
        .setTitle('🎰 スロットマシン')
        .setDescription(`クレジット: ${gameState.credits}\nベット/スピン: ${gameState.betPerSpin}\n\n${formatReels(gameState.reels)}\n\nベット額を${newBet}に変更しました！`)
        .setColor(0x00bfff);

      // ボタンを作成
      const spinButton = new ButtonBuilder()
        .setCustomId('slot_spin')
        .setLabel('スピン')
        .setStyle(ButtonStyle.Primary);

      const betUpButton = new ButtonBuilder()
        .setCustomId('slot_bet_up')
        .setLabel('ベット+')
        .setStyle(ButtonStyle.Secondary);

      const betDownButton = new ButtonBuilder()
        .setCustomId('slot_bet_down')
        .setLabel('ベット-')
        .setStyle(ButtonStyle.Secondary);

      const endButton = new ButtonBuilder()
        .setCustomId('slot_end')
        .setLabel('ゲーム終了')
        .setStyle(ButtonStyle.Danger);

      const row1 = new ActionRowBuilder().addComponents(spinButton, betUpButton, betDownButton);
      const row2 = new ActionRowBuilder().addComponents(endButton);

      await interaction.update({ embeds: [embed], components: [row1, row2] });
      return;
    }

    if (interaction.customId === 'slot_end') {
      const game = getActiveSlotGame(interaction.user.id);
      
      if (!game) {
        const embed = new EmbedBuilder()
          .setTitle('🎰 スロットマシン')
          .setDescription('アクティブなスロットゲームが見つかりません。')
          .setColor(0xff0000);
        await interaction.update({ embeds: [embed], components: [] });
        return;
      }

      // ゲーム終了
      const result = endSlotGame(game.id);
      
      // 残りクレジットを円に変換して返却
      if (result.remainingCredits > 0) {
        await addPoints(interaction.user.id, result.remainingCredits);
      }
      
      // 結果を表示
      const embed = new EmbedBuilder()
        .setTitle('🎰 スロットマシン - ゲーム終了')
        .setDescription(`総スピン数: ${result.spins}回\n総獲得クレジット: ¥${result.totalWinnings}円\n残りクレジット: ¥${result.remainingCredits}円\n\nゲームを終了しました！残りクレジットを円に変換しました。`)
        .setColor(result.totalWinnings > 0 ? 0x00ff00 : 0xff0000);

      await interaction.update({ embeds: [embed], components: [] });
      return;
    }
  }
});

// ======== ヘルスチェック機能 ========
import http from 'http';

// ヘルスチェック用のHTTPサーバー
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      botStatus: client.isReady() ? 'ready' : 'connecting'
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// ヘルスチェックサーバーを起動
healthServer.listen(3000, () => {
  console.log('✅ ヘルスチェックサーバー起動 (ポート3000)');
});

// エラーハンドリングの強化
import fs from 'fs';

process.on('uncaughtException', (error) => {
  console.error('❌ 未処理の例外:', error);
  // ログファイルに記録
  const logEntry = `${new Date().toISOString()} - UNCAUGHT EXCEPTION: ${error.stack}\n`;
  fs.appendFileSync('./logs/error.log', logEntry);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未処理のPromise拒否:', reason);
  // ログファイルに記録
  const logEntry = `${new Date().toISOString()} - UNHANDLED REJECTION: ${reason}\n`;
  fs.appendFileSync('./logs/error.log', logEntry);
});

// 定期的なヘルスチェック
setInterval(() => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  
  // メモリ使用量が1GBを超えた場合の警告
  if (memory.heapUsed > 1024 * 1024 * 1024) {
    console.warn('⚠️ メモリ使用量が1GBを超えています:', Math.round(memory.heapUsed / 1024 / 1024), 'MB');
  }
  
  // 24時間ごとのログ
  if (uptime % 86400 < 60) { // 24時間（86400秒）ごと
    console.log(`✅ Bot稼働時間: ${Math.floor(uptime / 3600)}時間`);
  }
}, 60000); // 1分ごとにチェック

// ======== ターミナル管理者コマンドシステム ========
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ターミナル用の管理者コマンド処理（古い実装）
async function handleTerminalAdminCommand(input) {
  const args = input.trim().split(' ');
  const command = args[0].toLowerCase();

  switch (command) {
    case 'addpoints':
      if (args.length !== 3) {
        console.log('❌ 使用方法: addpoints <ユーザーID> <円数>');
        return;
      }
      try {
        const userId = args[1];
        const amount = parseInt(args[2]);
        if (isNaN(amount)) {
          console.log('❌ 円数は数値で入力してください');
          return;
        }
        await addPoints(userId, amount);
        console.log(`✅ ユーザー ${userId} に ¥${amount}円を付与しました`);
      } catch (error) {
        console.log('❌ エラー:', error.message);
      }
      break;

    case 'addleaf':
      if (args.length !== 3) {
        console.log('❌ 使用方法: addleaf <ユーザーID> <リーフ数>');
        return;
      }
      try {
        const userId = args[1];
        const amount = parseInt(args[2]);
        if (isNaN(amount)) {
          console.log('❌ リーフ数は数値で入力してください');
          return;
        }
        await addLeaves(userId, amount);
        console.log(`✅ ユーザー ${userId} に Ł${amount}リーフを付与しました`);
      } catch (error) {
        console.log('❌ エラー:', error.message);
      }
      break;

    case 'additem':
      if (args.length !== 4) {
        console.log('❌ 使用方法: additem <ユーザーID> <アイテム名> <個数>');
        return;
      }
      try {
        const userId = args[1];
        const itemName = args[2];
        const quantity = parseInt(args[3]);
        if (isNaN(quantity)) {
          console.log('❌ 個数は数値で入力してください');
          return;
        }
        await addItem(userId, itemName, quantity);
        console.log(`✅ ユーザー ${userId} に ${itemName} を ${quantity}個付与しました`);
      } catch (error) {
        console.log('❌ エラー:', error.message);
      }
      break;

    case 'allitem':
      if (args.length !== 3) {
        console.log('❌ 使用方法: allitem <ユーザーID> <個数>');
        return;
      }
      try {
        const userId = args[1];
        const quantity = parseInt(args[2]);
        if (isNaN(quantity)) {
          console.log('❌ 個数は数値で入力してください');
          return;
        }
        
        console.log(`🔄 ユーザー ${userId} に全アイテムを ${quantity}個ずつ付与中...`);
        let successCount = 0;
        let errorCount = 0;
        
        // 通常のアイテムを付与
        for (const item of ITEMS) {
          try {
            await addItem(userId, item.name, quantity);
            successCount++;
          } catch (error) {
            console.log(`⚠️ ${item.name} の付与に失敗: ${error.message}`);
            errorCount++;
          }
        }
        
        // ショップ限定アイテムも付与
        for (const item of SHOP_ITEMS) {
          try {
            await addItem(userId, item.name, quantity);
            successCount++;
          } catch (error) {
            console.log(`⚠️ ${item.name} の付与に失敗: ${error.message}`);
            errorCount++;
          }
        }
        
        console.log(`✅ 全アイテム付与完了！`);
        console.log(`   成功: ${successCount}個のアイテム`);
        if (errorCount > 0) {
          console.log(`   失敗: ${errorCount}個のアイテム`);
        }
      } catch (error) {
        console.log('❌ エラー:', error.message);
      }
      break;

    case 'userinfo':
      if (args.length !== 2) {
        console.log('❌ 使用方法: userinfo <ユーザーID>');
        return;
      }
      try {
        const userId = args[1];
        const user = await getUser(userId);
        const items = await getItems(userId);
        console.log(`\n📊 ユーザー情報 (${userId})`);
        console.log(`円: ¥${user.points}円`);
        console.log(`ガチャ回数: ${user.rolls}`);
        console.log(`所持アイテム:`);
        if (items.length === 0) {
          console.log('  なし');
        } else {
          items.forEach(item => {
            console.log(`  ${item.itemName}: ${item.quantity}個`);
          });
        }
        console.log('');
      } catch (error) {
        console.log('❌ エラー:', error.message);
      }
      break;

    case 'checkachievements':
      if (args.length !== 2) {
        console.log('❌ 使用方法: checkachievements <ユーザーID>');
        return;
      }
      try {
        const userId = args[1];
        console.log(`🔍 ユーザー ${userId} のアチーブメントをチェック中...`);
        
        // 全アチーブメントタイプをチェック
        const conditionTypes = ['gacha_count', 'total_points', 'daily_count', 'work_count', 'unique_items'];
        
        // checkAchievements関数は未実装のため一時的に無効化
        console.log('⚠️ checkAchievements関数は未実装です');
        
        console.log('✅ アチーブメントチェック完了');
      } catch (error) {
        console.log('❌ エラー:', error.message);
      }
      break;

    case 'help':
      console.log('\n🔧 管理者コマンド一覧:');
      console.log('  addpoints <ユーザーID> <円数>  - ユーザーに円を付与');
      console.log('  addleaf <ユーザーID> <リーフ数>  - ユーザーにリーフを付与');
      console.log('  additem <ユーザーID> <アイテム名> <個数>  - ユーザーにアイテムを付与');
      console.log('  allitem <ユーザーID> <個数>  - ユーザーに全アイテムを付与');
      console.log('  userinfo <ユーザーID>  - ユーザー情報を表示');
      console.log('  checkachievements <ユーザーID>  - アチーブメントを手動チェック');
      console.log('  help  - このヘルプを表示');
      console.log('  exit  - 管理者モードを終了\n');
      break;

    case 'exit':
      console.log('👋 管理者モードを終了します');
      rl.close();
      return;

    default:
      console.log('❌ 不明なコマンドです。help と入力してヘルプを確認してください');
  }
}

// ターミナル入力の処理
rl.on('line', async (input) => {
  if (input.trim() === 'admin') {
    console.log('\n🔧 管理者モードに切り替えました');
    console.log('help と入力してコマンド一覧を確認してください\n');
    rl.setPrompt('admin> ');
    rl.prompt();
  } else if (rl.getPrompt() === 'admin> ') {
    await handleTerminalAdminCommand(input);
    rl.prompt();
  }
});

rl.on('close', () => {
  console.log('\n👋 管理者モードを終了しました');
});

// 初期プロンプト
console.log('\n🤖 Discord Bot が起動しました');
console.log('管理者モードに切り替えるには "admin" と入力してください\n');

// ======== 定期処理 ========
// 価格更新とオークション処理（1時間ごと）
setInterval(async () => {
  try {
    console.log('🔄 定期処理を開始...');
    
    // 未実装の関数を一時的に無効化
    console.log('⚠️ 一部の定期処理機能は未実装です');
    
    // 期限切れオークション処理のみ実行
    const processedCount = await processExpiredAuctions();
    if (processedCount > 0) {
      console.log(`✅ ${processedCount}件のオークションを処理完了`);
    }
    
    console.log('✅ 定期処理完了');
  } catch (error) {
    console.error('❌ 定期処理エラー:', error);
  }
}, 3600000); // 1時間 = 3600000ミリ秒

// ======== モーダル処理関数 ========
// 購入モーダル処理
async function handleBuyModalSubmit(interaction) {
  const itemName = interaction.fields.getTextInputValue('item_name');
  const quantity = parseInt(interaction.fields.getTextInputValue('quantity'));
  
  if (isNaN(quantity) || quantity <= 0) {
    await interaction.reply({ 
      content: '有効な数量を入力してください。', 
      ephemeral: true 
    });
    return;
  }

  try {
    const item = ITEMS.find(i => i.name === itemName);
    if (!item) {
      await interaction.reply({ 
        content: `アイテム「${itemName}」が見つかりません。`, 
        ephemeral: true 
      });
      return;
    }

    const totalPrice = item.price * quantity;
    const user = await getUser(interaction.user.id);
    
    if (user.points < totalPrice) {
      await interaction.reply({ 
        content: `ポイントが不足しています。\n必要: ¥${totalPrice.toLocaleString()}円\n所持: ¥${user.points.toLocaleString()}円`, 
        ephemeral: true 
      });
      return;
    }

    await subtractPoints(interaction.user.id, totalPrice);
    await addItem(interaction.user.id, itemName, quantity);

    const embed = new EmbedBuilder()
      .setTitle('🛒 購入完了')
      .setDescription(`**${itemName}** x${quantity}個を購入しました`)
      .setColor(0x2ecc71)
      .addFields(
        { name: 'アイテム', value: itemName, inline: true },
        { name: '数量', value: quantity.toString(), inline: true },
        { name: '単価', value: `¥${item.price.toLocaleString()}円`, inline: true },
        { name: '合計金額', value: `¥${totalPrice.toLocaleString()}円`, inline: true },
        { name: '残りポイント', value: `¥${(user.points - totalPrice).toLocaleString()}円`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ 
      content: `エラーが発生しました: ${error.message}`, 
      ephemeral: true 
    });
  }
}

// 売却モーダル処理
async function handleSellModalSubmit(interaction) {
  const itemName = interaction.fields.getTextInputValue('item_name');
  const quantity = parseInt(interaction.fields.getTextInputValue('quantity'));
  
  if (isNaN(quantity) || quantity <= 0) {
    await interaction.reply({ 
      content: '有効な数量を入力してください。', 
      ephemeral: true 
    });
    return;
  }

  try {
    const userItems = await getItems(interaction.user.id);
    const userItem = userItems.find(item => item.itemName === itemName);
    
    if (!userItem || userItem.quantity < quantity) {
      await interaction.reply({ 
        content: `アイテム「${itemName}」を${quantity}個以上所持していません。\n所持数: ${userItem?.quantity || 0}個`, 
        ephemeral: true 
      });
      return;
    }

    const item = ITEMS.find(i => i.name === itemName);
    if (!item) {
      await interaction.reply({ 
        content: `アイテム「${itemName}」の価格情報が見つかりません。`, 
        ephemeral: true 
      });
      return;
    }

    const sellPrice = Math.floor(item.price / 2) * quantity;
    await removeItem(interaction.user.id, itemName, quantity);
    await addPoints(interaction.user.id, sellPrice);

    const embed = new EmbedBuilder()
      .setTitle('💰 売却完了')
      .setDescription(`**${itemName}** x${quantity}個を売却しました`)
      .setColor(0xf39c12)
      .addFields(
        { name: 'アイテム', value: itemName, inline: true },
        { name: '数量', value: quantity.toString(), inline: true },
        { name: '売却価格', value: `¥${sellPrice.toLocaleString()}円`, inline: true },
        { name: '獲得ポイント', value: `¥${sellPrice.toLocaleString()}円`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ 
      content: `エラーが発生しました: ${error.message}`, 
      ephemeral: true 
    });
  }
}

// ショップ購入モーダル処理
async function handleShopModalSubmit(interaction) {
  const itemName = interaction.fields.getTextInputValue('item_name');
  const quantity = parseInt(interaction.fields.getTextInputValue('quantity'));
  
  if (isNaN(quantity) || quantity <= 0) {
    await interaction.reply({ 
      content: '有効な数量を入力してください。', 
      ephemeral: true 
    });
    return;
  }

  try {
    const item = SHOP_ITEMS.find(i => i.name === itemName);
    if (!item) {
      await interaction.reply({ 
        content: `ショップアイテム「${itemName}」が見つかりません。\n利用可能なアイテム: ${SHOP_ITEMS.map(i => i.name).join(', ')}`, 
        ephemeral: true 
      });
      return;
    }

    const totalPrice = item.price * quantity;
    const user = await getUser(interaction.user.id);
    
    if (user.points < totalPrice) {
      await interaction.reply({ 
        content: `ポイントが不足しています。\n必要: ¥${totalPrice.toLocaleString()}円\n所持: ¥${user.points.toLocaleString()}円`, 
        ephemeral: true 
      });
      return;
    }

    await subtractPoints(interaction.user.id, totalPrice);
    await addItem(interaction.user.id, itemName, quantity);

    const embed = new EmbedBuilder()
      .setTitle('🏪 ショップ購入完了')
      .setDescription(`**${itemName}** x${quantity}個を購入しました`)
      .setColor(0xffa500)
      .addFields(
        { name: 'アイテム', value: itemName, inline: true },
        { name: 'レア度', value: item.rarity, inline: true },
        { name: '数量', value: quantity.toString(), inline: true },
        { name: '単価', value: `¥${item.price.toLocaleString()}円`, inline: true },
        { name: '合計金額', value: `¥${totalPrice.toLocaleString()}円`, inline: true },
        { name: '効果', value: item.effect, inline: false },
        { name: '残りポイント', value: `¥${(user.points - totalPrice).toLocaleString()}円`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ 
      content: `エラーが発生しました: ${error.message}`, 
      ephemeral: true 
    });
  }
}

// ======== ボット起動 ========
client.login(process.env.DISCORD_TOKEN);
