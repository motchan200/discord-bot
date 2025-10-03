@echo off
echo Discord Bot を停止しています...
echo.

REM PM2でbotを停止
pm2 stop discord-bot

echo.
echo Botが停止しました！
echo.

pause
