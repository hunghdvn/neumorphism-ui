import {
  definitions,
  optionLabel,
  renderDSD,
  type OptionData,
} from '@neumorphism-ui/elements/ssr.js';

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

/** Per-call memo of tag searches: search key → last search start and its result. */
type SearchCache = Map<string, { from: number; index: number }>;

/**
 * First match of `prefix` followed by whitespace, '/' or '>' at or after `from`, or -1. Searches
 * for one key only move forward, so a miss stays a miss and a hit stays valid until it is
 * passed; the memo keeps a repeated tag from rescanning the rest of the input each time.
 */
function findTag(html: string, prefix: string, from: number, cache?: SearchCache): number {
  const known = cache?.get(prefix);
  if (known && from >= known.from && (known.index === -1 || from <= known.index)) {
    return known.index;
  }
  const pattern = new RegExp(`${prefix}[\\s/>]`, 'ig');
  pattern.lastIndex = from;
  const index = pattern.exec(html)?.index ?? -1;
  cache?.set(prefix, { from, index });
  return index;
}

const closeTagIndex = (html: string, name: string, from: number) =>
  findTag(html, `</${name}`, from);

/** Smallest of the given tag positions, or `limit` when none is found. */
const firstOf = (limit: number, ...indexes: number[]) =>
  Math.min(limit, ...indexes.filter((index) => index !== -1));

/**
 * Reads the option elements of a host the way the client does: label is the whitespace-collapsed
 * text, value falls back to the label. Nested hosts are not supported: the window ends at the
 * host's closing tag or at the next host start tag, whichever comes first, so windows never
 * overlap and every character is scanned once. An option's text ends at its closing tag, the
 * next option start or the window end.
 */
function scanOptions(
  html: string,
  host: string,
  optionTag: string,
  from: number,
  cache: SearchCache,
): OptionData[] {
  const stop = firstOf(
    html.length,
    findTag(html, `</${host}`, from, cache),
    findTag(html, `<${host}`, from, cache),
  );
  const options: OptionData[] = [];
  let i = from;
  while (i < stop) {
    const lt = html.indexOf('<', i);
    if (lt === -1 || lt >= stop) break;
    const tag = readStartTag(html, lt);
    if (!tag) {
      // An unterminated start tag runs to the end of input; retrying at each later '<' is quadratic.
      if (isAsciiAlpha(html[lt + 1])) break;
      i = lt + 1;
      continue;
    }
    if (tag.name !== optionTag) {
      i = tag.end;
      continue;
    }
    const end = firstOf(
      stop,
      findTag(html, `</${optionTag}`, tag.end, cache),
      findTag(html, `<${optionTag}`, tag.end, cache),
    );
    const label = optionLabel(decodeEntities(html.slice(tag.end, end).replace(/<[^<>]*>/g, '')));
    options.push({
      value: Object.hasOwn(tag.attrs, 'value') ? tag.attrs.value! : label,
      label,
      disabled: Object.hasOwn(tag.attrs, 'disabled'),
    });
    i = end;
  }
  return options;
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
  const closeCache: SearchCache = new Map();
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
    const def = definitions.get(tag.name);
    if (def && !startsWithDeclarativeRoot(html, i)) {
      out += def.optionsFrom
        ? renderDSD(tag.name, tag.attrs, {
            options: scanOptions(html, tag.name, def.optionsFrom, i, closeCache),
          })
        : renderDSD(tag.name, tag.attrs);
    }
  }
  return out;
}
