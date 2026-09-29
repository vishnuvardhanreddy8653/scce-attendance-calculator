const test = require('node:test');
const assert = require('node:assert');
const { cleanPortalHtml, parseDailyTable } = require('../services/scceService');

test('cleanPortalHtml removes misplaced unclosed div tags', () => {
  const rawHtml = `<td align=center >1</td> </div></td> <td align="center">1</td>`;
  const cleaned = cleanPortalHtml(rawHtml);
  assert.strictEqual(cleaned.includes('</div></td>'), false);
  assert.strictEqual(cleaned.includes('</td>'), true);
});

test('parseDailyTable extracts attendance correctly', () => {
  const sampleTableHtml = `
    <table class="table">
      <tr><th>Sno</th><th>Hour</th><th>Sub</th><th>Atnd</th><th>Cnctd</th></tr>
      <tr><td>1</td><td>1</td><td>AM</td><td>1</td><td>1</td></tr>
      <tr><td>2</td><td>2</td><td>ES</td><td>0</td><td>1</td></tr>
      <tr><td>3</td><td>3</td><td>DDV</td><td>1</td><td>1</td></tr>
      <tr><td>4</td><td>4</td><td>LAB</td><td>1</td><td>0</td></tr>
    </table>
  `;

  const { present, total } = parseDailyTable(sampleTableHtml);
  // Row 1: atnd 1, cnctd 1 -> present 1, total 1
  // Row 2: atnd 0, cnctd 1 -> present 0, total 1
  // Row 3: atnd 1, cnctd 1 -> present 1, total 1
  // Row 4: atnd 1, cnctd 0 -> valid=0, ignored
  assert.strictEqual(present, 2);
  assert.strictEqual(total, 3);
});

test('percentage calculation formula test', () => {
  const present = 18;
  const total = 19;
  const pct = Math.round((present / total) * 10000) / 100;
  assert.strictEqual(pct, 94.74);
});
