// build.mjs — locks (encrypts) your letter so the plaintext never reaches GitHub.
//
//   1) Edit  content/letter.html   (your letter — any HTML)
//   2) Edit  content/config.json   (the password = your math answer, + the question)
//   3) Run   node build.mjs
//   4) Commit & push  letter.locked.json   (the encrypted blob)
//
// content/letter.html and content/config.json are GITIGNORED — they stay on your machine.
// Only the AES-GCM encrypted letter.locked.json is published. Viewing source on the live
// site reveals nothing but ciphertext; it decrypts only when the correct answer is typed.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ITERATIONS = 200_000;           // PBKDF2 work factor
const enc = new TextEncoder();
const b64 = u => Buffer.from(u).toString('base64');

if (!existsSync('content/config.json') || !existsSync('content/letter.html')) {
  console.error('✗ Missing content/config.json or content/letter.html.');
  console.error('  Copy the .example files first:');
  console.error('    cp content/config.example.json content/config.json');
  console.error('    cp content/letter.example.html content/letter.html');
  process.exit(1);
}

const cfg = JSON.parse(readFileSync('content/config.json', 'utf8'));
const letter = readFileSync('content/letter.html', 'utf8');

if (!cfg.password) { console.error('✗ config.json needs a "password" (your math answer).'); process.exit(1); }

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv   = crypto.getRandomValues(new Uint8Array(12));

const keyMat = await crypto.subtle.importKey('raw', enc.encode(cfg.password), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
  keyMat, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(letter)));

const payload = {
  v: 1,
  kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS },
  salt: b64(salt),
  iv:   b64(iv),
  ct:   b64(ct),
  // public (not secret) — the puzzle itself:
  question: cfg.question || '',
  hint: cfg.hint || ''
};

writeFileSync('letter.locked.json', JSON.stringify(payload, null, 2));
console.log(`✓ Locked. ${letter.length} chars → letter.locked.json (encrypted).`);
console.log('  Now: git add letter.locked.json && git commit -m "update letter" && git push');
