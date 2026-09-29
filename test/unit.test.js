import { test } from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import { renderMarkdown, escapeHtml } from '../public/js/lib/markdown.js';
import { compile } from '../public/js/lib/expr.js';
import { weekInfo, isValidScope } from '../server/access.js';
import { cleanTitle, pickImage } from '../server/media.js';
import { hashPassword, verifyPassword, parseCookies } from '../server/auth.js';
import { loadSubjects } from '../server/content.js';

test('markdown экранирует HTML и опасные ссылки', () => {
  const evil = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '[x](javascript:alert(1))',
    '[x](//evil.example/path)',
    '[x](https://ok.example/"onmouseover="alert(1))',
    '**<b>bold</b>**',
    '| <i>a</i> | b |\n|---|---|\n| <svg onload=alert(1)> | c |',
    ':::code\n</code><script>alert(1)</script>\n:::',
    '$\\href{javascript:alert(1)}{x}$',
    '$\\htmlClass{x}{y}$ 1',
  ];
  for (const src of evil) {
    const { html } = renderMarkdown(src, { katex });
    assert.ok(!/<(script|img|svg|iframe|i|b)[\s>]/i.test(html), `тег прошёл: ${src} → ${html}`);
    assert.ok(!/(href|src)\s*=\s*"(javascript:|\/\/)/i.test(html), `опасная ссылка: ${src} → ${html}`);
    for (const tag of html.match(/<[a-z][^>]*>/gi) ?? []) {
      assert.ok(!/\son[a-z]+\s*=/i.test(tag), `обработчик события в теге ${tag}`);
    }
    assert.ok(!/"onmouseover=/.test(html), `атрибут не должен закрываться: ${html}`);
  }
  assert.equal(escapeHtml(`<a href="x">'`), '&lt;a href=&quot;x&quot;&gt;&#39;');
  // Токены формул и обратный слэш не должны попадать в href (аудит: латентный XSS и «внутренняя» внешняя ссылка)
  for (const src of ['[click me](/x$a$y)', '[pay](/\\evil.example/pay)', '[c](/x`code`y)']) {
    const { html } = renderMarkdown(src, { katex });
    assert.ok(!/<a\s/.test(html), `ссылка не должна создаваться: ${src} → ${html}`);
  }
  assert.match(renderMarkdown('[ok](/subject/math)').html, /<a href="\/subject\/math" data-link>ok<\/a>/);
});

test('markdown: формулы, таблицы, списки, директивы', () => {
  const { html, viz } = renderMarkdown('# Заголовок\n\n$x^2$ и **жирный**\n\n1. раз\n2. два\n\n:::graph\n{"functions":[{"f":"x^2"}]}\n:::\n\n:::map\n{"center":[55,37]\n', { katex });
  assert.match(html, /<h3>Заголовок<\/h3>/);
  assert.match(html, /class="katex"/);
  assert.match(html, /<ol><li>раз<\/li><li>два<\/li><\/ol>/);
  assert.equal(viz.length, 2);
  assert.equal(viz[0].type, 'graph');
  assert.equal(viz[1].pending, true, 'незакрытый блок во время печати — pending');
  const bad = renderMarkdown(':::chart\n{not json}\n:::');
  assert.ok(bad.viz[0].error);
});

test('парсер выражений: корректность и отказ от опасного ввода', () => {
  assert.equal(compile('x^3 - 3*x^2 + 2')(3), 2);
  assert.equal(compile('sqrt(2*x+7)')(1), 3);
  assert.ok(Math.abs(compile('sin(pi/2) + ln(e)')(0) - 2) < 1e-12);
  assert.equal(compile('-x^2')(3), -9);
  assert.ok(Math.abs(compile('x^(1/3)')(-8) + 2) < 1e-9);
  for (const bad of ['alert(1)', 'constructor', 'x;1', '__proto__', 'x=>x', '1'.repeat(400), '('.repeat(100) + 'x' + ')'.repeat(100), 'x +']) {
    assert.throws(() => compile(bad), `${bad.slice(0, 20)} должен отклоняться`);
  }
});

test('неделя пробной попытки считается по Москве с понедельника', () => {
  // Вс 27.09.2026 23:30 МСК = 20:30 UTC → ещё неделя с 21.09
  assert.equal(weekInfo(Date.UTC(2026, 8, 27, 20, 30)).weekKey, '2026-09-21');
  // Пн 28.09.2026 00:30 МСК = Вс 21:30 UTC → новая неделя
  const w = weekInfo(Date.UTC(2026, 8, 27, 21, 30));
  assert.equal(w.weekKey, '2026-09-28');
  assert.equal(w.nextResetAt, Date.UTC(2026, 9, 4, 21, 0));
});

test('scope наставника', () => {
  assert.ok(isValidScope('task:math:e8'));
  assert.ok(isValidScope('chat:abcdefgh12'));
  assert.ok(!isValidScope('task:../../x'));
  assert.ok(!isValidScope('chat:short'));
  assert.ok(!isValidScope({}));
});

test('медиа: фильтрация названий и URL картинок', () => {
  assert.equal(cleanTitle('  Утро  стрелецкой казни '), 'Утро стрелецкой казни');
  assert.equal(cleanTitle('a<script>'), null);
  assert.equal(cleanTitle('x'.repeat(300)), null);
  assert.equal(cleanTitle(['a']), null);
  assert.equal(pickImage({ originalimage: { source: 'https://evil.example/x.jpg', width: 100 } }), null);
  assert.equal(pickImage({ thumbnail: { source: 'javascript:alert(1)' } }), null);
  const img = pickImage({ originalimage: { source: 'https://upload.wikimedia.org/a/b.jpg', width: 3000, height: 2000 }, thumbnail: { source: 'https://upload.wikimedia.org/thumb/a/b.jpg/320px-b.jpg', width: 320, height: 213 } });
  assert.equal(img.src, 'https://upload.wikimedia.org/thumb/a/b.jpg/960px-b.jpg');
});

test('пароли и cookies', async () => {
  const hash = await hashPassword('correct horse');
  assert.match(hash, /^scrypt\$/);
  assert.ok(await verifyPassword('correct horse', hash));
  assert.ok(!(await verifyPassword('wrong horse', hash)));
  assert.ok(!(await verifyPassword('x', 'garbage')));
  assert.deepEqual(parseCookies('a=1; parta_sid=abc%20; b'), { a: '1', parta_sid: 'abc ' });
});

test('учебный контент валиден и содержит ЕГЭ + олимпиады по каждому предмету', async () => {
  const { subjects, errors } = await loadSubjects();
  assert.deepEqual(errors, []);
  assert.ok(subjects.length >= 1);
  for (const s of subjects) {
    assert.ok(s.tasks.some((t) => t.kind === 'ege'), s.id);
    assert.ok(s.tasks.some((t) => t.kind === 'olymp'), s.id);
    assert.ok(s.olymp.rsosh.length >= 1, s.id);
  }
});

test('GigaChat: корневой сертификат добавляется к доверенным (PEM и DER)', async () => {
  const { trustExtraCa } = await import('../server/llm/gigachat.js');
  const { writeFileSync, mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const tls = await import('node:tls');
  const dir = mkdtempSync(path.join(tmpdir(), 'parta-ca-'));
  const pem = tls.rootCertificates[0];
  const der = Buffer.from(pem.replace(/-----[^-]+-----|\s/g, ''), 'base64');
  writeFileSync(path.join(dir, 'a.pem'), pem);
  writeFileSync(path.join(dir, 'b.cer'), der);
  const warn = [];
  const ok = trustExtraCa(`${path.join(dir, 'a.pem')}, ${path.join(dir, 'b.cer')}`, { warn: (m) => warn.push(m) });
  if (typeof tls.setDefaultCACertificates === 'function') assert.equal(ok, true);
  else assert.equal(warn.length, 1);
  assert.equal(trustExtraCa(''), false);
});
