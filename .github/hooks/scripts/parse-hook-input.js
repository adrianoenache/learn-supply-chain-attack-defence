#!/usr/bin/env node
// parse-hook-input.js — Helper to safely extract fields from a Copilot hook input JSON.
// Usage: echo '<json>' | node parse-hook-input.js <field1> [field2] ...
// Prints each requested field value on its own line. Missing fields print an empty line.

const input = require('fs').readFileSync(0, 'utf8');
const payload = JSON.parse(input || '{}');
const fields = process.argv.slice(2);

for (const field of fields) {
  const value = payload[field];
  if (value === undefined || value === null) {
    console.log('');
  } else if (typeof value === 'string') {
    console.log(value);
  } else {
    console.log(JSON.stringify(value));
  }
}
