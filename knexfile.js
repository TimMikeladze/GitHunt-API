// Since Knex always runs this file first, all of our seeds and migrations are babelified.
require('babel-register');

const parse = require('pg-connection-string').parse;

const DATABASE_URL = process.env.DATABASE_URL;

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './dev.sqlite3',
    },
    useNullAsDefault: true,
  },
  test: {
    client: 'sqlite3',
    connection: {
      filename: './test.sqlite3',
    },
    useNullAsDefault: true,
  },
  production: DATABASE_URL && {
    client: 'pg',
    connection: Object.assign({}, parse(DATABASE_URL), { ssl: true }),
  },
};
