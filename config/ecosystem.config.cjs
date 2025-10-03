module.exports = {
  apps: [{
    name: 'discord-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // クラッシュ時の自動再起動設定
    max_restarts: 10,
    min_uptime: '10s',
    // メモリ使用量監視
    node_args: '--max-old-space-size=1024',
    // ヘルスチェック用のポート
    port: 3000
  }]
};
