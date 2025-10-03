@echo off
echo Discord Bot の状態を確認しています...
echo.

REM PM2の状態を表示
pm2 status

echo.
echo 詳細ログを表示するには: pm2 logs discord-bot
echo.

pause
