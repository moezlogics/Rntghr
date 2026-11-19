// PM2 — Rent Ghar on the live server (/home/rentghar/htdocs/rentghar.pk).
//
//   pm2 start ecosystem.config.js && pm2 save
//
// The website listens on 3117 (the port the domain points to); the API on
// 3118, reached only through the website's /api rewrite. Names are prefixed
// so they never clash with another site's PM2 processes on the same server.
module.exports = {
  apps: [
    {
      name: 'rentghar-api',
      cwd: './apps/api', // the API reads apps/api/.env and serves ../../uploads
      script: 'dist/apps/api/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3118,
      },
    },
    {
      name: 'rentghar-web',
      cwd: './apps/web',
      // next is installed at the workspace root, not inside apps/web.
      script: '../../node_modules/next/dist/bin/next',
      args: 'start -p 3117',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3117,
      },
    },
  ],
};
