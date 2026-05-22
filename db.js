require('dotenv').config();
const mysql = require('mysql2/promise');

let pool = null;

function hasDbConfig() {
  return Boolean(
    process.env.MYSQL_URL ||
    process.env.MYSQL_PUBLIC_URL ||
    process.env.DATABASE_URL ||
    process.env.DB_HOST ||
    process.env.MYSQL_HOST
  );
}

function sslConfig() {
  if (process.env.VERCEL) {
    return {
      rejectUnauthorized: false,
    };
  }

  if (process.env.DB_SSL === 'false') {
    return undefined;
  }

  if (process.env.DB_SSL === 'true') {
    return {
      rejectUnauthorized: false,
    };
  }

  return undefined;
}

function buildPool() {
  if (process.env.VERCEL && !hasDbConfig()) {
    throw new Error(
      'Missing DB config on Vercel'
    );
  }

  const mysqlUrl =
    process.env.MYSQL_URL ||
    process.env.MYSQL_PUBLIC_URL ||
    process.env.DATABASE_URL;

  const isVercel = Boolean(process.env.VERCEL);

  const common = {
    waitForConnections: true,
    connectionLimit: 1,
    connectTimeout: 8000,
    enableKeepAlive: false,
    ssl: sslConfig(),
  };

  if (mysqlUrl) {
    return mysql.createPool({
      uri: mysqlUrl,
      ...common,
    });
  }

  const dbHost =
    process.env.DB_HOST || process.env.MYSQL_HOST;

  const dbUser =
    process.env.DB_USER || process.env.MYSQL_USER;

  const dbPassword =
    process.env.DB_PASSWORD ??
    process.env.MYSQL_PASSWORD;

  const dbName =
    process.env.DB_NAME ||
    process.env.MYSQL_DATABASE ||
    'hotel_reservation';

  const dbPort = Number(
    process.env.DB_PORT ||
    process.env.MYSQL_PORT ||
    3306
  );

  return mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    ...common,
  });
}

function getPool() {

  if (!pool) {
    pool = buildPool();
  }

  return pool;
}

module.exports = {
  getPool,
  hasDbConfig,
};