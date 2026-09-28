// Безопасный разбор математических выражений для графиков (без eval).
// Грамматика: expr := term (('+'|'-') term)*
//             term := unary (('*'|'/') unary)*
//             unary := ('-'|'+') unary | power
//             power := atom ('^' unary)?
//             atom := number | 'x' | const | func '(' expr ')' | '(' expr ')'

const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp,
  ln: Math.log, log: Math.log10, log2: Math.log2,
  floor: Math.floor, ceil: Math.ceil, sign: Math.sign,
};
const CONSTS = { pi: Math.PI, e: Math.E };
const MAX_LEN = 300;
const MAX_DEPTH = 60;

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const num = Number(src.slice(i, j));
      if (!Number.isFinite(num)) throw new Error(`Некорректное число: ${src.slice(i, j)}`);
      tokens.push({ t: 'num', v: num });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9]/.test(src[j])) j++;
      tokens.push({ t: 'id', v: src.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }
    if ('+-*/^(),'.includes(c)) { tokens.push({ t: c }); i++; continue; }
    throw new Error(`Недопустимый символ «${c}»`);
  }
  return tokens;
}

export function compile(src) {
  if (typeof src !== 'string' || !src.trim()) throw new Error('Пустое выражение');
  if (src.length > MAX_LEN) throw new Error('Слишком длинное выражение');
  const tokens = tokenize(src);
  let pos = 0;
  let depth = 0;
  const peek = () => tokens[pos];
  const eat = (t) => {
    const tok = tokens[pos];
    if (!tok || tok.t !== t) throw new Error(`Ожидалось «${t}»`);
    pos++;
    return tok;
  };
  const enter = () => { if (++depth > MAX_DEPTH) throw new Error('Слишком глубокая вложенность'); };
  const leave = () => { depth--; };

  function expr() {
    enter();
    let node = term();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = tokens[pos++].t;
      const left = node;
      const right = term();
      node = op === '+' ? (x) => left(x) + right(x) : (x) => left(x) - right(x);
    }
    leave();
    return node;
  }
  function term() {
    let node = unary();
    while (peek() && (peek().t === '*' || peek().t === '/')) {
      const op = tokens[pos++].t;
      const left = node;
      const right = unary();
      node = op === '*' ? (x) => left(x) * right(x) : (x) => left(x) / right(x);
    }
    return node;
  }
  function unary() {
    enter();
    let node;
    if (peek() && peek().t === '-') { pos++; const inner = unary(); node = (x) => -inner(x); }
    else if (peek() && peek().t === '+') { pos++; node = unary(); }
    else node = power();
    leave();
    return node;
  }
  function power() {
    const base = atom();
    if (peek() && peek().t === '^') {
      pos++;
      const exp = unary();
      return (x) => {
        const b = base(x);
        const p = exp(x);
        // Нечётный корень из отрицательного числа: x^(1/3)
        if (b < 0 && !Number.isInteger(p)) {
          const inv = 1 / p;
          if (Number.isInteger(Math.round(inv)) && Math.abs(inv - Math.round(inv)) < 1e-9 && Math.round(inv) % 2 !== 0) {
            return -Math.pow(-b, p);
          }
        }
        return Math.pow(b, p);
      };
    }
    return base;
  }
  function atom() {
    const tok = peek();
    if (!tok) throw new Error('Неожиданный конец выражения');
    if (tok.t === 'num') { pos++; const v = tok.v; return () => v; }
    if (tok.t === '(') { pos++; const inner = expr(); eat(')'); return inner; }
    if (tok.t === 'id') {
      pos++;
      if (tok.v === 'x') return (x) => x;
      if (Object.prototype.hasOwnProperty.call(CONSTS, tok.v)) { const v = CONSTS[tok.v]; return () => v; }
      if (Object.prototype.hasOwnProperty.call(FUNCS, tok.v)) {
        const fn = FUNCS[tok.v];
        eat('(');
        const arg = expr();
        eat(')');
        return (x) => fn(arg(x));
      }
      throw new Error(`Неизвестное имя «${tok.v}»`);
    }
    throw new Error(`Неожиданный символ «${tok.t}»`);
  }

  const fn = expr();
  if (pos !== tokens.length) throw new Error('Лишние символы в выражении');
  return fn;
}
