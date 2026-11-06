import { renderDSD } from '@neumorphism-ui/elements/ssr.js';
import { describe, expect, test } from 'vitest';
import { LEGACY_NAMES, NAMED_REFERENCES } from './named-references.js';
import { decodeEntities, readStartTag, transformHtml } from './transform-html.js';

const button = renderDSD('neu-button', {});

describe('transformHtml', () => {
  test('injects a declarative shadow root right after known start tags', () => {
    expect(transformHtml('<p><neu-button>Save</neu-button></p>')).toBe(
      `<p><neu-button>${button}Save</neu-button></p>`,
    );
  });

  test('leaves unknown and non-neu tags alone', () => {
    const html = '<div><neu-unknown></neu-unknown><button>x</button></div>';
    expect(transformHtml(html)).toBe(html);
  });

  test('passes parsed, entity-decoded attributes to the template', () => {
    const out = transformHtml(
      `<neu-text-field label='Tom &amp; Jerry' value="a>b" required></neu-text-field>`,
    );
    expect(out).toContain('Tom &amp; Jerry');
    expect(out).not.toContain('&amp;amp;');
    expect(out).toContain('value="a&gt;b"');
    expect(out).toContain(' required');
  });

  test('matches tag names case-insensitively', () => {
    expect(transformHtml('<NEU-BUTTON>x</NEU-BUTTON>')).toBe(`<NEU-BUTTON>${button}x</NEU-BUTTON>`);
  });

  test('does not touch script, style, textarea, title or comments', () => {
    const html =
      '<script>const s = "<neu-button>";</script><style>/* <neu-button> */</style>' +
      '<textarea><neu-button></textarea><title><neu-button></title><!-- <neu-button> -->';
    expect(transformHtml(html)).toBe(html);
  });

  test('is idempotent', () => {
    const html =
      '<form><neu-switch checked name="n">N</neu-switch><neu-text-field label="E"></neu-text-field></form>';
    const once = transformHtml(html);
    expect(transformHtml(once)).toBe(once);
  });

  test('handles nested components', () => {
    const out = transformHtml('<neu-button><neu-switch></neu-switch></neu-button>');
    expect(out.match(/shadowrootmode/g)).toHaveLength(2);
  });

  test('leaves malformed input unchanged instead of throwing', () => {
    for (const html of [
      '<neu-button',
      '<neu-button label="x',
      'a < b',
      '<',
      '</neu-button>',
      '<!-- open',
    ]) {
      expect(transformHtml(html)).toBe(html);
    }
  });

  test.each([
    ['20 000 unterminated quoted attributes', "<a b='".repeat(20_000)],
    ['200 000 unterminated <neu-button tags', '<neu-button'.repeat(200_000)],
  ])('stays linear on %s', (_label, html) => {
    const started = performance.now();
    const out = transformHtml(html);
    const elapsed = performance.now() - started;
    expect(out).toBe(html);
    expect(elapsed).toBeLessThan(500);
  });

  test('stays linear on many unclosed <neu-select> tags', () => {
    const html = '<neu-select>'.repeat(20_000);
    const started = performance.now();
    const out = transformHtml(html);
    const elapsed = performance.now() - started;
    const dsd = renderDSD('neu-select', {}, { options: [] });
    expect(out.split(dsd).join('')).toBe(html);
    expect(elapsed).toBeLessThan(500);
  });

  test('stays linear on many unclosed <neu-select> tags sharing one close tag', () => {
    const html = `${'<neu-select>'.repeat(20_000)}</neu-select>`;
    const started = performance.now();
    const out = transformHtml(html);
    const elapsed = performance.now() - started;
    const dsd = renderDSD('neu-select', {}, { options: [] });
    expect(out.split(dsd).join('')).toBe(html);
    expect(elapsed).toBeLessThan(500);
  });

  test('scans every unclosed <neu-option> of a closed select', () => {
    const html = `<neu-select value="last">${'<neu-option value="n">X'.repeat(20_000)}<neu-option value="last">Final</neu-option></neu-select>`;
    const started = performance.now();
    const out = transformHtml(html);
    const elapsed = performance.now() - started;
    expect(out).toContain('data-ref="display">Final</span>');
    expect(elapsed).toBeLessThan(500);
  });

  test.each([
    [
      'option text of 80 000 "<" with no ">"',
      `<neu-select><neu-option>${'<'.repeat(80_000)}</neu-option></neu-select>`,
    ],
    [
      '80 000 bytes of "<a" then ">" inside a select',
      `<neu-select>${'<a'.repeat(40_000)}></neu-select>`,
    ],
    [
      'an attribute holding "<a" x 40 000 on a div in a select',
      `<neu-select><div title="${'<a'.repeat(40_000)}"></div></neu-select>`,
    ],
  ])('stays linear on %s', (_label, html) => {
    const started = performance.now();
    transformHtml(html);
    expect(performance.now() - started).toBeLessThan(500);
  });

  test('labels with nested tags are stripped as before', () => {
    const out = transformHtml(
      '<neu-select value="a b"><neu-option><b>a</b> <i>b</i></neu-option></neu-select>',
    );
    expect(out).toContain('data-ref="display">a b</span>');
  });

  test('option labels decode every named reference, as the browser does', () => {
    const out = transformHtml(
      '<neu-select value="c" placeholder="Pick"><neu-option value="a">A &amp; B</neu-option><neu-option value="c">Caf&eacute; &mdash; daily</neu-option></neu-select>',
    );
    expect(out).toContain('data-ref="display">Café — daily</span>');
    const numeric = transformHtml(
      '<neu-select value="a"><neu-option value="a">A &amp B&#8212;&#x2014;&#128;</neu-option></neu-select>',
    );
    expect(numeric).toContain('data-ref="display">A &amp; B——€</span>');
  });

  test('a reference split by a tag is not decoded, as the browser tokenizes each text run', () => {
    const out = transformHtml(
      '<neu-select value="x"><neu-option value="x">&am<b></b>p; &e<i>acute;</i></neu-option></neu-select>',
    );
    expect(out).toContain('data-ref="display">&amp;amp; &amp;eacute;</span>');
  });

  test('an unclosed select still gets its selected label', () => {
    const out = transformHtml(
      '<neu-select value="b"><neu-option value="a">A</neu-option><neu-option value="b">B</neu-option>',
    );
    expect(out).toContain('data-ref="display">B</span>');
  });

  test.each([
    ['closed select', '</neu-select>'],
    ['unclosed select', ''],
  ])('stays linear on one %s with many unclosed <neu-option> tags', (_label, tail) => {
    const html = `<neu-select value="x">${'<neu-option value="x">'.repeat(20_000)}${tail}`;
    const started = performance.now();
    const out = transformHtml(html);
    const elapsed = performance.now() - started;
    expect(out.startsWith('<neu-select value="x">')).toBe(true);
    expect(out.length).toBeGreaterThanOrEqual(html.length);
    expect(out.split('<neu-option value="x">').length).toBe(20_001);
    expect(elapsed).toBeLessThan(500);
  });

  test('uses shadowrootdelegatesfocus for text fields', () => {
    expect(transformHtml('<neu-text-field></neu-text-field>')).toContain(
      'shadowrootdelegatesfocus',
    );
  });
});

describe('transformHtml with neu-select', () => {
  const options = (list: { value: string; label: string; disabled?: boolean }[]) => ({
    options: list,
  });
  const select = (attrs: string, body: string) => `<neu-select ${attrs}>${body}</neu-select>`;

  test("neu-select gets the selected option's label", () => {
    const out = transformHtml(
      select(
        'value="pro"',
        '<neu-option value="free">Free</neu-option><neu-option value="pro">Pro plan</neu-option>',
      ),
    );
    expect(out).toContain(
      renderDSD(
        'neu-select',
        { value: 'pro' },
        options([
          { value: 'free', label: 'Free' },
          { value: 'pro', label: 'Pro plan' },
        ]),
      ),
    );
    expect(out).toContain('Pro plan');
  });

  test('entities in option text are decoded', () => {
    const out = transformHtml(
      select('value="a"', '<neu-option value="a">Tom &amp; <b>Jerry</b>\n  &lt;3 </neu-option>'),
    );
    expect(out).toContain(
      renderDSD('neu-select', { value: 'a' }, options([{ value: 'a', label: 'Tom & Jerry <3' }])),
    );
  });

  test('an option without value uses its label', () => {
    const out = transformHtml(select('value="Pro"', '<neu-option>Pro</neu-option>'));
    expect(out).toContain(
      renderDSD('neu-select', { value: 'Pro' }, options([{ value: 'Pro', label: 'Pro' }])),
    );
  });

  test('a no-break space is kept in the label and value, as on the client', () => {
    for (const text of ['A  B', 'A&nbsp;&nbsp;B']) {
      const out = transformHtml(select('value="A  B"', `<neu-option>${text}</neu-option>`));
      expect(out).toContain('data-ref="display">A  B</span>');
    }
  });

  test('no match renders the placeholder', () => {
    const out = transformHtml(
      select('placeholder="Pick"', '<neu-option value="a" disabled>A</neu-option>'),
    );
    expect(out).toContain(
      renderDSD(
        'neu-select',
        { placeholder: 'Pick' },
        options([{ value: 'a', label: 'A', disabled: true }]),
      ),
    );
    expect(out).toContain('Pick');
  });

  test('transforming twice is a no-op', () => {
    const once = transformHtml(select('value="a"', '<neu-option value="a">A</neu-option>'));
    expect(transformHtml(once)).toBe(once);
  });
});

describe('readStartTag', () => {
  test('parses quoted, unquoted and boolean attributes; the first duplicate wins', () => {
    const html = `<neu-switch a="1" b='2' c=3 d d="x">`;
    expect(readStartTag(html, 0)).toEqual({
      name: 'neu-switch',
      attrs: { a: '1', b: '2', c: '3', d: '' },
      end: html.length,
    });
  });

  test('returns null for anything that is not a complete start tag', () => {
    expect(readStartTag('</p>', 0)).toBeNull();
    expect(readStartTag('<!doctype html>', 0)).toBeNull();
    expect(readStartTag('<p class="x', 0)).toBeNull();
  });
});

describe('decodeEntities', () => {
  test('decodes named and numeric entities and leaves unknown ones alone', () => {
    expect(decodeEntities('&amp;&lt;&gt;&quot;&#39;&#x41;&nbsp;&bogus;&constructor;')).toBe(
      '&<>"\'A &bogus;&constructor;',
    );
  });

  test("knows every name in the HTML standard's table", () => {
    const names = Object.keys(NAMED_REFERENCES);
    const legacy = LEGACY_NAMES.split(' ');
    // 2,231 identifiers: 2,125 names with a semicolon, and 106 legacy ones also without.
    expect([names.length, legacy.length]).toEqual([2125, 106]);
    expect(legacy.every((name) => Object.hasOwn(NAMED_REFERENCES, name))).toBe(true);
    expect(decodeEntities('&eacute;&mdash;&CounterClockwiseContourIntegral;&fjlig;&Afr;')).toBe(
      'é—∳fj𝔄',
    );
    expect(decodeEntities('&nvlt;')).toBe(`<${String.fromCodePoint(0x20d2)}`);
  });

  test('legacy names need no semicolon, and the longest name wins', () => {
    expect(decodeEntities('&amp &eacute &copy2024 &notin &notit; &ampx; &mdash')).toBe(
      '& é ©2024 ¬in ¬it; &x; &mdash',
    );
    expect(decodeEntities('&notin;&ampamp;&AMP;&AMp;&1x;&')).toBe('∉&amp;&&AMp;&1x;&');
  });

  test('in an attribute, a legacy name stays as written before a letter, digit or =', () => {
    expect(decodeEntities('&copy=x &copy2 &copyx &copy; &copy &amp;', true)).toBe(
      '&copy=x &copy2 &copyx © © &',
    );
    expect(readStartTag('<a title="&copy=1&amp;&eacute;">', 0)!.attrs.title).toBe('&copy=1&é');
  });

  test('numeric references follow the browser: C1 remapped, invalid ones replaced', () => {
    expect(decodeEntities('&#65&#x42;&#X43x&#128;&#x9f;')).toBe('ABCx€Ÿ');
    expect(decodeEntities('&#x81;')).toBe(String.fromCodePoint(0x81));
    expect(decodeEntities('&#0;&#xD800;&#x110000;&#99999999999999999999;')).toBe(
      String.fromCodePoint(0xfffd).repeat(4),
    );
    expect(decodeEntities('&#;&#x;&#xg;')).toBe('&#;&#x;&#xg;');
  });

  test('a very long run after & is not slow', () => {
    const run = `&${'a'.repeat(1_000_000)};`;
    const started = performance.now();
    expect(decodeEntities(run.repeat(4))).toBe(run.repeat(4));
    expect(performance.now() - started).toBeLessThan(500);
  });
});
