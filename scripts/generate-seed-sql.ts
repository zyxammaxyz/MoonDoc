// One-time helper: turns the existing mock hospitals/shifts into a seed.sql
// file so the demo data is available to every real resident account via
// Supabase, instead of being hardcoded into the frontend bundle.
//
// Run with: bun run scripts/generate-seed-sql.ts > supabase/seed.sql

import { MOCK_HOSPITALS, MOCK_SHIFTS } from '../src/data/mockData';

function sqlLiteral(value: unknown): string {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
}

const lines: string[] = [];

lines.push('-- Auto-generated from src/data/mockData.ts. Safe to re-run (upserts).');
lines.push('-- Run this AFTER schema.sql, once, in the Supabase SQL Editor.');
lines.push('');

lines.push('insert into public.hospitals (id, data) values');
lines.push(
  MOCK_HOSPITALS.map(
    (h) => `  ('${h.id}', ${sqlLiteral(h)}::jsonb)`
  ).join(',\n') + ''
);
lines.push('on conflict (id) do update set data = excluded.data;');
lines.push('');

lines.push('insert into public.shifts (id, data) values');
lines.push(
  MOCK_SHIFTS.map(
    (s) => `  ('${s.id}', ${sqlLiteral(s)}::jsonb)`
  ).join(',\n') + ''
);
lines.push('on conflict (id) do update set data = excluded.data;');
lines.push('');

console.log(lines.join('\n'));
