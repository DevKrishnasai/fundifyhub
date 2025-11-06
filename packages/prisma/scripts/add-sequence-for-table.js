#!/usr/bin/env node
/**
 * add-sequence-for-table.js
 * Convenience utility to create a sequence and set a table's id default to prefix||nextval(seq)
 * Non-destructive by default. Pass --force to allow truncation (dangerous).
 *
 * Usage:
 *   node add-sequence-for-table.js --table requests --seq requests_seq --prefix REQ [--force]
 *
 * If --seq is omitted it will default to <table>_seq. If --prefix omitted it uses first 3 letters uppercased.
 */

const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env or environment. Aborting.');
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--table') out.table = args[++i];
    else if (a === '--seq') out.seq = args[++i];
    else if (a === '--prefix') out.prefix = args[++i];
    else if (a === '--force') out.force = true;
    else if (a === '--help') out.help = true;
  }
  return out;
}

function help() {
  console.log('Usage: node add-sequence-for-table.js --table <table_name> [--seq <seq_name>] [--prefix <PREFIX>] [--force]');
  console.log('Example: node add-sequence-for-table.js --table requests --seq requests_seq --prefix REQ');
}

async function run() {
  const opts = parseArgs();
  if (opts.help || !opts.table) return help();

  const table = opts.table;
  const seq = opts.seq || `${table}_seq`;
  const prefix = opts.prefix || table.substring(0, 3).toUpperCase();
  const force = !!opts.force;

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log(`Creating sequence '${seq}' (if not exists)`);
    await client.query(`CREATE SEQUENCE IF NOT EXISTS ${seq} START 10001;`);

    // check id column exists
    const col = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'id'`,
      [table]
    );
    if (col.rowCount === 0) {
      console.warn(`Table '${table}' does not have an 'id' column. Aborting.`);
      return;
    }

    console.log(`Altering ${table}.id => TEXT and setting default to ${prefix}||nextval(${seq})`);
    await client.query(`ALTER TABLE ${table} ALTER COLUMN id TYPE TEXT;`);
    await client.query(`ALTER TABLE ${table} ALTER COLUMN id SET DEFAULT ('${prefix}' || nextval('${seq}')::text);`);

    if (force) {
      console.log('Force flag present: truncating table (CASCADE)');
      await client.query(`TRUNCATE TABLE ${table} CASCADE;`);
    } else {
      console.log('Not truncating table. Use --force to allow truncation.');
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
