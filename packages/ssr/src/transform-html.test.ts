import { renderDSD } from '@neu-ui/elements/ssr.js';
import { describe, expect, test } from 'vitest';
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

  test('uses shadowrootdelegatesfocus for text fields', () => {
    expect(transformHtml('<neu-text-field></neu-text-field>')).toContain(
      'shadowrootdelegatesfocus',
    );
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
});
