import { definitions, renderDSD } from '@neumorphism-ui/elements/ssr.js';

const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title']);
const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export interface StartTag {
  name: string;
  attrs: Record<string, string>;
  /** Index just past the closing '>'. */
  end: number;
}

const isSpace = (ch: string | undefined) =>
  ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === '\f';
const isAsciiAlpha = (ch: string | undefined) => ch !== undefined && /[A-Za-z]/.test(ch);

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body.startsWith('#')) {
      const hex = body[1] === 'x' || body[1] === 'X';
      const code = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return Object.hasOwn(NAMED_ENTITIES, body) ? NAMED_ENTITIES[body]! : match;
  });
}

/** Parses the start tag at html[pos] === '<'; null when it is not a complete start tag. */
export function readStartTag(html: string, pos: number): StartTag | null {
  if (html[pos] !== '<' || !isAsciiAlpha(html[pos + 1])) return null;
  let i = pos + 1;
  while (i < html.length && !isSpace(html[i]) && html[i] !== '/' && html[i] !== '>') i++;
  const name = html.slice(pos + 1, i).toLowerCase();
  const attrs: Record<string, string> = {};
  while (i < html.length) {
    while (isSpace(html[i]) || html[i] === '/') i++;
    if (i >= html.length) return null;
    if (html[i] === '>') return { name, attrs, end: i + 1 };
    const nameStart = i;
    while (
      i < html.length &&
      !isSpace(html[i]) &&
      html[i] !== '/' &&
      html[i] !== '>' &&
      html[i] !== '='
    ) {
      i++;
    }
    const attrName = html.slice(nameStart, i).toLowerCase();
    while (isSpace(html[i])) i++;
    let value = '';
    if (html[i] === '=') {
      i++;
      while (isSpace(html[i])) i++;
      const quote = html[i];
      if (quote === '"' || quote === "'") {
        const close = html.indexOf(quote, i + 1);
        if (close === -1) return null;
        value = html.slice(i + 1, close);
        i = close + 1;
      } else {
        const valueStart = i;
        while (i < html.length && !isSpace(html[i]) && html[i] !== '>') i++;
        value = html.slice(valueStart, i);
      }
    }
    if (attrName !== '' && !Object.hasOwn(attrs, attrName)) attrs[attrName] = decodeEntities(value);
  }
  return null;
}

function closeTagIndex(html: string, name: string, from: number): number {
  const pattern = new RegExp(`</${name}[\\s/>]`, 'ig');
  pattern.lastIndex = from;
  return pattern.exec(html)?.index ?? -1;
}

function startsWithDeclarativeRoot(html: string, from: number): boolean {
  let i = from;
  while (isSpace(html[i])) i++;
  const next = readStartTag(html, i);
  return next !== null && next.name === 'template' && Object.hasOwn(next.attrs, 'shadowrootmode');
}

/** Inserts a declarative shadow root into every <neu-*> element this library defines (spec §8.2). */
export function transformHtml(html: string): string {
  let out = '';
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, lt);
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      const stop = end === -1 ? html.length : end + 3;
      out += html.slice(lt, stop);
      i = stop;
      continue;
    }
    const tag = readStartTag(html, lt);
    if (!tag && isAsciiAlpha(html[lt + 1])) {
      // A start tag that never closes runs to the end of input, as in the browser. Stopping here
      // keeps the scan linear: retrying at every later '<' would rescan the rest each time.
      out += html.slice(lt);
      break;
    }
    if (!tag) {
      out += '<';
      i = lt + 1;
      continue;
    }
    out += html.slice(lt, tag.end);
    i = tag.end;
    if (RAW_TEXT.has(tag.name)) {
      const close = closeTagIndex(html, tag.name, i);
      const stop = close === -1 ? html.length : close;
      out += html.slice(i, stop);
      i = stop;
      continue;
    }
    if (definitions.has(tag.name) && !startsWithDeclarativeRoot(html, i)) {
      out += renderDSD(tag.name, tag.attrs);
    }
  }
  return out;
}
