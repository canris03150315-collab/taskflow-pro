// Knex configuration for TaskFlow Pro database migrations
//
// Used by:
//   - npx knex migrate:latest (run all pending migrations)
//   - npx knex migrate:make <name> (create new migration)
//   - npx knex migrate:status (see what's pending)
//
// In production, migrations are run automatically on container startup
// (see deploy/entrypoint.sh).

const path = require('path');

// Resolve DB path: data/taskflow.db (mounted as Docker volume in production,
// or local backend/data/ in dev mode)
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'taskflow.db');

module.exports = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: DB_PATH,
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      tableName: 'knex_migrations',
    },
  },

  production: {
    client: 'better-sqlite3',
    connection: {
      filename: DB_PATH,
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      tableName: 'knex_migrations',
    },
  },
};
