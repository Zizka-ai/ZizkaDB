/**
 * Production dashboard — run with PM2, not Docker.
 *
 *   cd dashboard
 *   NEXT_PUBLIC_API_URL=https://db.zizka.ai NEXT_PUBLIC_DEV_MODE=false npm run build
 *   pm2 start ecosystem.config.js
 *
 * Nginx should proxy to http://127.0.0.1:3001 (see infra/nginx.conf).
 */
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'zizkadb-dashboard',
      script: 'npm',
      args: 'start',
      cwd: path.join(__dirname),
      env: {
        PORT: '3001',
        HOSTNAME: '0.0.0.0',
        NODE_ENV: 'production',
      },
    },
  ],
};
