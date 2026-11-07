import {
  definitions,
  optionLabel,
  renderDSD,
  type OptionData,
} from '@neumorphism-ui/elements/ssr.js';

import { LEGACY_NAMES, NAMED_REFERENCES } from './named-references.js';

const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title']);
const LEGACY = new Set(LEGACY_NAMES.split(' '));
const LONGEST_LEGACY = Math.max(...[...LEGACY].map((name) => name.length));
const REPLACEMENT = String.fromCodePoint(0xfffd);
/** Numeric references to C1 controls that the browser reads as windows-1252 (HTML §13.2.5.80). */
const C1_REMAP: Readonly<Record<number, number>> = {
  0x80: 0x20ac,
  0x82: 0x201a,
  0x83: 0x0192,
  0x84: 0x201e,
  0x85: 0x2026,
  0x86: 0x2020,
  0x87: 0x2021,
  0x88: 0x02c6,
  0x89: 0x2030,
  0x8a: 0x0160,
  0x8b: 0x2039,
  0x8c: 0x0152,
  0x8e: 0x017d,
  0x91: 0x2018,
  0x92: 0x2019,
  0x93: 0x201c,
  0x94: 0x201d,
  0x95: 0x2022,
  0x96: 0x2013,
  0x97: 0x2014,
  0x98: 0x02dc,
  0x99: 0x2122,
  0x9a: 0x0161,
  0x9b: 0x203a,
  0x9c: 0x0153,
  0x9e: 0x017e,
  0x9f: 0x0178,
};
/** A numeric reference (hex or decimal digits), or a run of letters and digits after '&'. */
const REFERENCE = /&(?:#(?:[xX]([0-9a-fA-F]+)|([0-9]+));?|([a-zA-Z0-9]+)(;?))/g;
const ALPHANUMERIC = /[a-zA-Z0-9]/;

export interface StartTag {
  name: string;
  attrs: Record<string, string>;
  /** Index just past the closing '>'. */
  end: number;
}

const isSpace = (ch: string | undefined) =>
  ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === '\f';
const isAsciiAlpha = (ch: string | undefined) => ch !== undefined && /[A-Za-z]/.test(ch);

/** The text of a numeric reference, as the browser maps it (HTML §13.2.5.80). */
function numericReference(code: number): string {
  if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return REPLACEMENT;
  return String.fromCodePoint(C1_REMAP[code] ?? code);
}

/**
 * Decodes character references the way the browser's tokenizer does: numeric ones with or
 * without a semicolon, and named ones by the longest name in the HTML standard's table, where
 * the legacy names (`&amp`, `&eacute`, ...) need no semicolon. In an attribute value such a
 * legacy name stays as written when a letter, digit or '=' follows it (HTML §13.2.5.73).
 * Anything else, `&bogus;` included, is left as it is.
 */
export function decodeEntities(value: string, inAttribute = false): string {
  return value.replace(
    REFERENCE,
    (
      match: string,
      hex: string | undefined,
      decimal: string | undefined,
      name: string | undefined,
      semicolon: string | undefined,
      offset: number,
    ) => {
      if (name === undefined) return numericReference(parseInt(hex ?? decimal!, hex ? 16 : 10));
      if (semicolon && Object.hasOwn(NAMED_REFERENCES, name)) return NAMED_REFERENCES[name]!;
      for (let size = Math.min(name.length, LONGEST_LEGACY); size > 0; size--) {
        const legacy = name.slice(0, size);
        if (!LEGACY.has(legacy)) continue;
        const rest = name.slice(size) + (semicolon ?? '');
        if (inAttribute) {
          const next = rest === '' ? value[offset + match.length] : rest[0];
          if (next !== undefined && (next === '=' || ALPHANUMERIC.test(next))) return match;
        }
        return NAMED_REFERENCES[legacy]! + rest;
      }
      return match;
    },
  );
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
    if (attrName !== '' && !Object.hasOwn(attrs, attrName)) {
      attrs[attrName] = decodeEntities(value, true);
    }
  }
  return null;
}

/** Per-call memo of tag searches: search key → last search start and its result. */
type SearchCache = Map<string, { from: number; index: number }>;

/**
 * `search(from)`: the first match at or after `from`, or -1, remembered under `key`. A later
 * search from at or after the remembered start and not past its match has the same answer: a
 * miss stays a miss and a hit stays valid until it is passed. The memo keeps a repeated search
 * from rescanning the rest of the input each time.
 */
function memoized(
  cache: SearchCache | undefined,
  key: string,
  from: number,
  search: (from: number) => number,
): number {
  const known = cache?.get(key);
  if (known && from >= known.from && (known.index === -1 || from <= known.index)) {
    return known.index;
  }
  const index = search(from);
  cache?.set(key, { from, index });
  return index;
}

/** First match of `prefix` followed by whitespace, '/' or '>' at or after `from`, or -1. */
function findTag(html: string, prefix: string, from: number, cache?: SearchCache): number {
  return memoized(cache, prefix, from, (start) => {
    const pattern = new RegExp(`${prefix}[\\s/>]`, 'ig');
    pattern.lastIndex = start;
    return pattern.exec(html)?.index ?? -1;
  });
}

/**
 * Index just past the comment whose `<!--` is at `lt`; an unterminated comment runs to the end,
 * as in the browser. Searching from lt + 2 lets `<!-->` and `<!--->` close at once, like the
 * tokenizer. Every scanner here skips comments through this one function.
 */
function skipComment(html: string, lt: number, cache?: SearchCache): number {
  const close = memoized(cache, '-->', lt + 2, (start) => html.indexOf('-->', start));
  return close === -1 ? html.length : close + 3;
}

const closeTagIndex = (html: string, name: string, from: number) =>
  findTag(html, `</${name}`, from);

/** Smallest of the given tag positions, or `limit` when none is found. */
const firstOf = (limit: number, ...indexes: number[]) =>
  Math.min(limit, ...indexes.filter((index) => index !== -1));

/**
 * The text of html[from, to) as the browser reads it: start tags (quoted attributes included),
 * end tags, comments and bogus comments are skipped, and each run of text between them is
 * decoded on its own, as the tokenizer does. A tag or comment that does not end before `to`
 * ends the text.
 */
function textBetween(html: string, from: number, to: number, cache: SearchCache): string {
  let text = '';
  let run = '';
  let i = from;
  while (i < to) {
    const lt = html.indexOf('<', i);
    if (lt === -1 || lt >= to) {
      run += html.slice(i, to);
      break;
    }
    run += html.slice(i, lt);
    const next = html[lt + 1];
    let end: number;
    if (html.startsWith('<!--', lt)) end = skipComment(html, lt, cache);
    else if (isAsciiAlpha(next)) end = readStartTag(html, lt)?.end ?? to;
    else if (next === '/' || next === '!' || next === '?') {
      const gt = html.indexOf('>', lt + 2);
      end = gt === -1 ? to : gt + 1;
    } else {
      // A '<' that starts no markup is text.
      run += '<';
      i = lt + 1;
      continue;
    }
    text += decodeEntities(run);
    run = '';
    i = end;
  }
  return text + decodeEntities(run);
}

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
    if (html.startsWith('<!--', lt)) {
      i = skipComment(html, lt, cache);
      continue;
    }
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
    const label = optionLabel(textBetween(html, tag.end, end, cache));
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
      const stop = skipComment(html, lt, closeCache);
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
