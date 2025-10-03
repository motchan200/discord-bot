// 統合されたイベントハンドラー
import { Events, EmbedBuilder } from 'discord.js';
import { addPoints } from './database.js';
import { rollApologyGacha, rollGacha } from './games.js';
import { getEffect, consumeLucky, addItem, updateGachaStats } from './database.js';
import { ITEMS } from './config.js';

// メッセージ作成イベント
export function handleMessageCreate(client) {
  client.on(Events.MessageCreate, (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith('/')) return;
    addPoints(message.author.id, 1);
  });
}

// インタラクション作成イベント
export function handleInteractionCreate(client) {
  client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'roll') {
        const effect = await getEffect(interaction.user.id);
        let result;
        if (effect && effect.lucky > 0) {
          const ssrItems = ITEMS.filter(i => ["SSR", "UR", "LR"].includes(i.rarity));
          const selected = ssrItems[Math.floor(Math.random() * ssrItems.length)];
          await addItem(interaction.user.id, selected.name);
          await updateGachaStats(interaction.user.id, 10, 1);
          await consumeLucky(interaction.user.id);
          result = { item: selected };
        } else {
          result = await rollGacha(interaction.user.id);
        }
        if (result.error) {
          const embed = new EmbedBuilder()
            .setTitle('ガチャ結果')
            .setDescription(result.error)
            .setColor(0xff0000);
          await interaction.reply({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder()
            .setTitle('ガチャ結果')
            .setDescription(`${result.item.rarity}【${result.item.name}】を入手！`)
            .setColor(0x00bfff);
          await interaction.reply({ embeds: [embed] });
        }
      }
    }
  });
}

// ボタンインタラクションイベント
export function handleButtonInteractions(client) {
  client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isButton()) {
      if (interaction.customId === 'buy_cancel') {
        const embed = new EmbedBuilder()
          .setTitle('購入キャンセル')
          .setDescription('購入をキャンセルしました。')
          .setColor(0xff0000);
        await interaction.update({ embeds: [embed], components: [] });
      }
      if (interaction.customId === 'sell_cancel') {
        const embed = new EmbedBuilder()
          .setTitle('売却キャンセル')
          .setDescription('売却をキャンセルしました。')
          .setColor(0xff0000);
        await interaction.update({ embeds: [embed], components: [] });
      }
      if (interaction.customId === 'shop_cancel') {
        const embed = new EmbedBuilder()
          .setTitle('ショップ購入キャンセル')
          .setDescription('ショップ購入をキャンセルしました。')
          .setColor(0xff0000);
        await interaction.update({ embeds: [embed], components: [] });
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
      }
    }
  });
}
