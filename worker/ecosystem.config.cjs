// PM2 process definition.
//
// CommonJS on purpose: package.json sets "type": "module", so PM2 can only
// read this file if it is named .cjs. Start it with:
//   pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: 'news-worker',
      script: 'index.js',
      cwd: __dirname,
      interpreter: 'node',

      // One process. The cron schedule inside the worker assumes a single
      // instance; a cluster of them would fetch the same feeds N times.
      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      // Back off instead of hammering a restart loop when something is broken.
      exp_backoff_restart_delay: 5000,
      max_restarts: 20,
      min_uptime: '60s',
      max_memory_restart: '250M',

      // .env is read by the worker itself (worker/env.js), so credentials stay
      // out of this file and out of `pm2 describe` output.
      env: {
        NODE_ENV: 'production',
      },

      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      time: false, // the worker already prefixes every line with an ISO timestamp
    },
  ],
}
