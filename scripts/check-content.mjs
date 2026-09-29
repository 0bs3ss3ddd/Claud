// Проверка учебного контента: схема, JSON визуальных блоков, формулы KaTeX.
// Запуск: npm run check:content [-- <id предмета>]
import katex from 'katex';
import { loadSubjects } from '../server/content.js';

const only = process.argv[2];
const { subjects, errors } = await loadSubjects();

const texErrors = [];
function checkTex(md, where) {
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  const text = md.replace(/^\s*:::[\s\S]*?^\s*:::\s*$/gm, '');
  let m;
  while ((m = re.exec(text))) {
    const tex = (m[1] ?? m[2]).trim();
    try {
      katex.renderToString(tex, { throwOnError: true, strict: 'ignore', displayMode: Boolean(m[1]) });
    } catch (e) {
      texErrors.push(`${where}: ${e.message.split('\n')[0]}  ← $${tex}$`);
    }
  }
}

for (const s of subjects) {
  if (only && s.id !== only) continue;
  for (const t of s.theory ?? []) checkTex(t.body, `[${s.id}] theory «${t.title}»`);
  for (const t of s.tasks ?? []) {
    for (const key of ['statement', 'short', 'full']) if (t[key]) checkTex(t[key], `[${s.id}] ${t.id}.${key}`);
    (t.hints ?? []).forEach((h, i) => checkTex(h, `[${s.id}] ${t.id}.hint${i + 1}`));
  }
  checkTex(s.olymp?.intro ?? '', `[${s.id}] olymp.intro`);
  checkTex(s.olymp?.vsosh ?? '', `[${s.id}] olymp.vsosh`);
}

const all = [...errors.filter((e) => !only || e.startsWith(`[${only}]`)), ...texErrors];
for (const s of subjects) {
  if (only && s.id !== only) continue;
  const ege = s.tasks?.filter((t) => t.kind === 'ege').length ?? 0;
  const ol = s.tasks?.filter((t) => t.kind === 'olymp').length ?? 0;
  console.log(`${s.id.padEnd(6)} ${String(s.name).padEnd(24)} ЕГЭ: ${ege}  олимп.: ${ol}  теория: ${s.theory?.length ?? 0}`);
}
if (all.length) {
  console.error(`\nНайдено проблем: ${all.length}`);
  for (const e of all) console.error(' - ' + e);
  process.exit(1);
}
console.log('\nКонтент в порядке ✔');
