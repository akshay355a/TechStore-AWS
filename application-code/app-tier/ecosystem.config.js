'use strict';

module.exports = {
    apps: [
        {
            name: 'techstore-app-tier',
            script: './index.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            kill_timeout: 10000,
            listen_timeout: 15000,
            env_production: {
                NODE_ENV: 'production',
                PORT: 4000
            }
        }
    ]
};
