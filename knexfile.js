// Since Knex always runs this file first, all of our seeds and migrations are babelified.
require('babel-register');

const { parse } = require('pg-connection-string');

const { PG_URL } = process.env;

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './dev.sqlite3',
    },
    useNullAsDefault: true,
  },
  production: PG_URL && {
    client: 'pg',
    connection: Object.assign({}, parse(PG_URL), { ssl: true }),
  },
};
