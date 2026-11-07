// Normalización y resolución de expresiones matemáticas legibles.
// No evalúa código arbitrario: tokeniza y resuelve con un parser propio.

export interface MathResult {
  ok: boolean;
  normalized: string;
  steps: string[];
  answer?: string;
  error?: string;
}

const SUPERSCRIPTS: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
};
const FRACTIONS: Record<string, string> = {
  '½': '(1/2)', '¼': '(1/4)', '¾': '(3/4)', '⅓': '(1/3)', '⅔': '(2/3)',
};
const OPS: Record<string, string> = {
  '×': '*', '·': '*', '÷': '/', '−': '-', '–': '-', '—': '-', '√': 'sqrt', 'π': 'pi',
};

export function normalizeExpression(raw: string): string {
  let s = raw.trim();
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => `^${m.split('').map((c) => SUPERSCRIPTS[c]).join('')}`);
  s = s.replace(/[½¼¾⅓⅔]/g, (m) => FRACTIONS[m]);
  s = s.replace(/[×·÷−–—√π]/g, (m) => OPS[m]);
  s = s.replace(/\s+/g, '');
  // Corrige expresiones dañadas tipo $(1_+-1) o (1_+-1)
  s = s.replace(/\$\(/g, '(').replace(/\)\$/g, ')');
  s = s.replace(/_\+/g, '+').replace(/_\-/g, '-').replace(/_/g, '');
  s = s.replace(/\+\-/g, '-').replace(/-\+/g, '-').replace(/\+\+/g, '+').replace(/--/g, '+');
  s = s.replace(/\)\(/g, ')*(');
  s = s.replace(/(\d)\(/g, '$1*(');
  s = s.replace(/\)(\d)/g, ')*$1');
  return s;
}

type Token = { t: 'num' | 'op' | 'lp' | 'rp' | 'fn'; v: string };

function tokenize(s: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\d|\./.test(c)) {
      let num = '';
      while (i < s.length && /[\d.]/.test(s[i])) num += s[i++];
      tokens.push({ t: 'num', v: num });
      continue;
    }
    if (s.startsWith('sqrt', i)) {
      tokens.push({ t: 'fn', v: 'sqrt' });
      i += 4;
      continue;
    }
    if (s.startsWith('pi', i)) {
      tokens.push({ t: 'num', v: String(Math.PI) });
      i += 2;
      continue;
    }
    if ('+-*/^%'.includes(c)) {
      tokens.push({ t: 'op', v: c });
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ t: 'lp', v: c });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ t: 'rp', v: c });
      i++;
      continue;
    }
    throw new Error(`Carácter no válido: ${c}`);
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  parse(): number {
    const v = this.expr();
    if (this.pos < this.tokens.length) throw new Error('Expresión incompleta');
    return v;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private expr(): number {
    let left = this.term();
    while (this.peek()?.t === 'op' && ['+', '-'].includes(this.peek()!.v)) {
      const op = this.tokens[this.pos++].v;
      const right = this.term();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  private term(): number {
    let left = this.power();
    while (this.peek()?.t === 'op' && ['*', '/', '%'].includes(this.peek()!.v)) {
      const op = this.tokens[this.pos++].v;
      const right = this.power();
      if (op === '*') left *= right;
      else if (op === '/') {
        if (right === 0) throw new Error('División entre cero');
        left /= right;
      } else left %= right;
    }
    return left;
  }

  private power(): number {
    const base = this.unary();
    if (this.peek()?.t === 'op' && this.peek()!.v === '^') {
      this.pos++;
      const exp = this.power();
      return Math.pow(base, exp);
    }
    return base;
  }

  private unary(): number {
    const tok = this.peek();
    if (tok?.t === 'op' && (tok.v === '-' || tok.v === '+')) {
      this.pos++;
      const v = this.unary();
      return tok.v === '-' ? -v : v;
    }
    return this.atom();
  }

  private atom(): number {
    const tok = this.peek();
    if (!tok) throw new Error('Falta un número');
    if (tok.t === 'num') {
      this.pos++;
      return parseFloat(tok.v);
    }
    if (tok.t === 'fn') {
      this.pos++;
      const v = this.atom();
      if (v < 0) throw new Error('Raíz de un número negativo');
      return Math.sqrt(v);
    }
    if (tok.t === 'lp') {
      this.pos++;
      const v = this.expr();
      if (this.peek()?.t !== 'rp') throw new Error('Falta cerrar paréntesis');
      this.pos++;
      return v;
    }
    throw new Error('Expresión no válida');
  }
}

export function looksLikeMath(text: string): boolean {
  const t = text.trim();
  if (!/[0-9]/.test(t)) return false;
  if (!/[+\-*/^×÷=√%]/.test(t)) return false;
  const letters = (t.match(/[a-zA-Záéíóúñ]/g) ?? []).length;
  return letters <= 12;
}

export function solveMath(raw: string): MathResult {
  const normalized = normalizeExpression(raw.replace(/^[^0-9(√-]*/, '').replace(/[?¿]+$/, ''));
  const steps: string[] = [];
  try {
    const tokens = tokenize(normalized);
    if (!tokens.length) return { ok: false, normalized, steps, error: 'No encontré una operación.' };
    steps.push(`Expresión ordenada: ${normalized}`);
    const value = new Parser(tokens).parse();
    if (!Number.isFinite(value)) return { ok: false, normalized, steps, error: 'El resultado no es un número real.' };
    const rounded = Math.round(value * 1e10) / 1e10;
    steps.push('Resuelvo primero paréntesis y potencias, luego multiplicaciones y divisiones, y al final sumas y restas.');
    steps.push(`Resultado: ${rounded}`);
    return { ok: true, normalized, steps, answer: String(rounded) };
  } catch (e) {
    return {
      ok: false,
      normalized,
      steps,
      error: e instanceof Error ? e.message : 'No pude resolverlo.',
    };
  }
}

export function formatMathAnswer(res: MathResult): string {
  if (!res.ok) {
    return `Lo ordené así: ${res.normalized || '—'}. Pero no pude resolverlo (${res.error}). ¿Me lo escribes de otra forma?`;
  }
  return `Lo ordené como ${res.normalized} y da ${res.answer}.`;
}
