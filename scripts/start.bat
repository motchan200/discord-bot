@echo off
echo Discord Bot を起動しています...
echo.

REM PM2でbotを起動
pm2 start ecosystem.config.cjs

echo.
echo Botが起動しました！
echo 状態確認: pm2 status
echo ログ確認: pm2 logs discord-bot
echo 停止: pm2 stop discord-bot
echo 再起動: pm2 restart discord-bot
echo.

pause
