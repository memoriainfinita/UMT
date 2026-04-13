// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8080/example.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
});

// Clicks a button scoped to a section and checks the output element.
// sectionId: the HTML id of the <section> containing the button (e.g. 'tuning').
async function clickAndCheck(page, sectionId, buttonText, outId) {
  const section = page.locator(`#${sectionId}`);
  await section.getByRole('button', { name: buttonText, exact: true }).click();
  await page.waitForTimeout(300);
  const text = await page.locator(`#${outId}`).textContent();
  expect(text, `${outId} should not be empty`).not.toBe('');
  expect(text, `${outId} should not start with Error:`).not.toMatch(/^Error:/i);
  return text;
}

// ── 1. Tuning Systems ─────────────────────────────────────────────────────────
test('1. Tuning Systems — Run (12-TET default)', async ({ page }) => {
  const text = await clickAndCheck(page, 'tuning', 'Run', 'out-tuning');
  expect(text).toContain('12-TET');
  expect(text).toContain('Hz');
});

test('1. Tuning Systems — Run (Custom EDO 19)', async ({ page }) => {
  await page.selectOption('#t1-tuning', 'custom');
  await page.fill('#t1-edo', '19');
  const text = await clickAndCheck(page, 'tuning', 'Run', 'out-tuning');
  expect(text).toContain('Hz');
});

test('1. Tuning Systems — Run (BohlenPierce)', async ({ page }) => {
  await page.selectOption('#t1-tuning', 'BohlenPierce');
  const text = await clickAndCheck(page, 'tuning', 'Run', 'out-tuning');
  expect(text).toContain('Bohlen');
});

// ── 2. Scales & Modes ─────────────────────────────────────────────────────────
test('2. Scales & Modes — Run (D dorian)', async ({ page }) => {
  await page.fill('#t2-scale', 'D dorian');
  await page.fill('#t2-mode', '1');
  const text = await clickAndCheck(page, 'scales', 'Run', 'out-scales');
  expect(text).toContain('D');
});

test('2. Scales & Modes — Run (Bb harmonic minor, mode 3)', async ({ page }) => {
  await page.fill('#t2-scale', 'Bb harmonic minor');
  await page.fill('#t2-mode', '3');
  const text = await clickAndCheck(page, 'scales', 'Run', 'out-scales');
  expect(text).not.toMatch(/^Error:/i);
});

test('2. Scales & Modes — abc staff renders', async ({ page }) => {
  await page.fill('#t2-scale', 'C major');
  await page.locator('#scales').getByRole('button', { name: 'Run', exact: true }).click();
  await page.waitForTimeout(500);
  const svg = page.locator('#staff-scales svg');
  await expect(svg).toBeVisible();
});

// ── 3. Chords & Voicings ──────────────────────────────────────────────────────
test('3. Chords — Run (Cmaj9/E, close)', async ({ page }) => {
  await page.fill('#t3-chord', 'Cmaj9/E');
  await page.selectOption('#t3-voicing', 'close');
  const text = await clickAndCheck(page, 'chords', 'Run', 'out-chords');
  expect(text).toContain('C');
});

test('3. Chords — Run (F#m7b5, drop2)', async ({ page }) => {
  await page.fill('#t3-chord', 'F#m7b5');
  await page.selectOption('#t3-voicing', 'drop2');
  const text = await clickAndCheck(page, 'chords', 'Run', 'out-chords');
  expect(text).not.toMatch(/^Error:/i);
});

test('3. Chords — Run (Db7alt, quartal)', async ({ page }) => {
  await page.fill('#t3-chord', 'Db7alt');
  await page.selectOption('#t3-voicing', 'quartal');
  const text = await clickAndCheck(page, 'chords', 'Run', 'out-chords');
  expect(text).not.toMatch(/^Error:/i);
});

test('3. Chords — inversion 1', async ({ page }) => {
  await page.fill('#t3-chord', 'Cmaj7');
  await page.fill('#t3-inv', '1');
  const text = await clickAndCheck(page, 'chords', 'Run', 'out-chords');
  expect(text).not.toMatch(/^Error:/i);
});

test('3. Chords — transpose 5 semitones', async ({ page }) => {
  await page.fill('#t3-chord', 'Am7');
  await page.fill('#t3-trans', '5');
  const text = await clickAndCheck(page, 'chords', 'Run', 'out-chords');
  expect(text).not.toMatch(/^Error:/i);
});

// ── 4. Progressions & Voice Leading ──────────────────────────────────────────
test('4. Progressions — Run (ii7 - V7alt - Imaj7, C major)', async ({ page }) => {
  await page.fill('#t4-prog', 'ii7 - V7alt - Imaj7');
  await page.fill('#t4-key', 'C major');
  const text = await clickAndCheck(page, 'progressions', 'Run', 'out-progressions');
  expect(text).toContain('Voice leading');
});

test('4. Progressions — Run (I - IV - V, Bb major)', async ({ page }) => {
  await page.fill('#t4-prog', 'I - IV - V');
  await page.fill('#t4-key', 'Bb major');
  const text = await clickAndCheck(page, 'progressions', 'Run', 'out-progressions');
  expect(text).not.toMatch(/^Error:/i);
});

// ── 5. Harmony & Key Analysis ─────────────────────────────────────────────────
test('5. Harmony — Detect (C4 E4 G4 Bb4)', async ({ page }) => {
  await page.fill('#t5-notes', 'C4 E4 G4 Bb4');
  const text = await clickAndCheck(page, 'harmony', 'Detect', 'out-harmony');
  expect(text).not.toMatch(/^Error:/i);
});

test('5. Harmony — Analyze cadence (G7 → Cmaj7)', async ({ page }) => {
  await page.fill('#t5-c1', 'G7');
  await page.fill('#t5-c2', 'Cmaj7');
  await page.fill('#t5-key', 'C major');
  const text = await clickAndCheck(page, 'harmony', 'Analyze cadence', 'out-harmony');
  expect(text).toContain('Cadence');
});

test('5. Harmony — Negative harmony', async ({ page }) => {
  await page.fill('#t5-c1', 'G7');
  await page.fill('#t5-key', 'C major');
  const text = await clickAndCheck(page, 'harmony', 'Negative harmony', 'out-harmony');
  expect(text).not.toMatch(/^Error:/i);
});

test('5. Harmony — Circle of fifths renders', async ({ page }) => {
  await page.fill('#t5-circle-key', 'G');
  await page.locator('#harmony').getByRole('button', { name: 'Render', exact: true }).click();
  await page.waitForTimeout(500);
  const svg = page.locator('#circle-svg svg');
  await expect(svg).toBeVisible();
});

// ── 6. Set Theory & Neo-Riemannian ────────────────────────────────────────────
test('6. Set Theory — Analyze (C4 Eb4 Gb4 A4)', async ({ page }) => {
  await page.fill('#t6-notes', 'C4 Eb4 Gb4 A4');
  const text = await clickAndCheck(page, 'settheory', 'Analyze', 'out-settheory');
  expect(text).toContain('Normal form');
});

test('6. PLR — P transform on C major', async ({ page }) => {
  await page.fill('#t6-plr-chord', 'C');
  await page.locator('#settheory').getByRole('button', { name: 'P', exact: true }).click();
  await page.waitForTimeout(300);
  const text = await page.locator('#out-settheory').textContent();
  expect(text).not.toMatch(/^Error:/i);
  expect(text).not.toBe('');
});

test('6. PLR — L transform on C major', async ({ page }) => {
  await page.fill('#t6-plr-chord', 'C');
  await page.locator('#settheory').getByRole('button', { name: 'L', exact: true }).click();
  await page.waitForTimeout(300);
  const text = await page.locator('#out-settheory').textContent();
  expect(text).not.toMatch(/^Error:/i);
});

test('6. PLR — R transform on C major', async ({ page }) => {
  await page.fill('#t6-plr-chord', 'C');
  await page.locator('#settheory').getByRole('button', { name: 'R', exact: true }).click();
  await page.waitForTimeout(300);
  const text = await page.locator('#out-settheory').textContent();
  expect(text).not.toMatch(/^Error:/i);
});

// ── 7. Microtonal & Scala ─────────────────────────────────────────────────────
test('7. Scala — Parse default (Pelog)', async ({ page }) => {
  const text = await clickAndCheck(page, 'microtonal', 'Parse', 'out-microtonal');
  expect(text).toContain('Pelog');
});

test('7. Scala — Preset Bohlen-Pierce', async ({ page }) => {
  await page.locator('#microtonal').getByRole('button', { name: /Bohlen-Pierce/ }).click();
  await page.waitForTimeout(200);
  const text = await clickAndCheck(page, 'microtonal', 'Parse', 'out-microtonal');
  expect(text).not.toMatch(/^Error:/i);
});

test('7. Scala — Preset Werckmeister III', async ({ page }) => {
  await page.locator('#microtonal').getByRole('button', { name: /Werckmeister/ }).click();
  await page.waitForTimeout(200);
  const text = await clickAndCheck(page, 'microtonal', 'Parse', 'out-microtonal');
  expect(text).not.toMatch(/^Error:/i);
});

// ── 8. Rhythm & Meter ─────────────────────────────────────────────────────────
test('8. Rhythm — Euclidean (3, 8)', async ({ page }) => {
  await page.fill('#t8-pulses', '3');
  await page.fill('#t8-steps', '8');
  const text = await clickAndCheck(page, 'rhythm', 'Generate', 'out-rhythm');
  expect(text).toContain('E(3, 8)');
});

test('8. Rhythm — Build stream (7/8)', async ({ page }) => {
  await page.fill('#t8-num', '7');
  await page.fill('#t8-den', '8');
  const text = await clickAndCheck(page, 'rhythm', 'Build stream', 'out-rhythm');
  expect(text).not.toMatch(/^Error:/i);
});

// ── 9. ABC Notation Export ────────────────────────────────────────────────────
test('9. ABC — Export scale (C major)', async ({ page }) => {
  await page.fill('#t9-input', 'C major');
  await page.selectOption('#t9-type', 'scale');
  await page.fill('#t9-key', 'C');
  await page.fill('#t9-meter', '4/4');
  await page.locator('#abc').getByRole('button', { name: 'Export & Render', exact: true }).click();
  await page.waitForTimeout(500);
  const text = await page.locator('#out-abc').textContent();
  expect(text).not.toMatch(/^Error:/i);
  const svg = page.locator('#staff-abc svg');
  await expect(svg).toBeVisible();
});

test('9. ABC — Export chord (Cmaj7)', async ({ page }) => {
  await page.fill('#t9-input', 'Cmaj7');
  await page.selectOption('#t9-type', 'chord');
  await page.locator('#abc').getByRole('button', { name: 'Export & Render', exact: true }).click();
  await page.waitForTimeout(500);
  const text = await page.locator('#out-abc').textContent();
  expect(text).not.toMatch(/^Error:/i);
});

test('9. ABC — Export progression (ii7 - V7 - Imaj7)', async ({ page }) => {
  await page.fill('#t9-input', 'ii7 - V7 - Imaj7');
  await page.selectOption('#t9-type', 'progression');
  await page.locator('#abc').getByRole('button', { name: 'Export & Render', exact: true }).click();
  await page.waitForTimeout(500);
  const text = await page.locator('#out-abc').textContent();
  expect(text).not.toMatch(/^Error:/i);
});

// ── 10. Utilities ─────────────────────────────────────────────────────────────
test('10. Utils — Run all (enharmonics + intervals)', async ({ page }) => {
  await page.fill('#t10-note', 'C#');
  await page.fill('#t10-intA', '0');
  await page.fill('#t10-intB', '7');
  const text = await clickAndCheck(page, 'utils', 'Run all', 'out-utils');
  expect(text).toContain('Enharmonics');
  expect(text).toContain('P5');
});

test('10. Utils — MIDI to Hz', async ({ page }) => {
  await page.fill('#t10-midi', '60');
  await page.locator('#utils').getByRole('button', { name: 'MIDI → Hz', exact: true }).click();
  await page.waitForTimeout(300);
  const text = await page.locator('#out-utils').textContent();
  expect(text).not.toMatch(/^Error:/i);
  expect(text).toContain('261');
});

test('10. Utils — Hz to MIDI', async ({ page }) => {
  await page.fill('#t10-freq', '440');
  await page.locator('#utils').getByRole('button', { name: 'Hz → MIDI', exact: true }).click();
  await page.waitForTimeout(300);
  const text = await page.locator('#out-utils').textContent();
  expect(text).toContain('69');
});
