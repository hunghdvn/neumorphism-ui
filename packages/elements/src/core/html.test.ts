import { describe, expect, test } from 'vitest';
import { escapeHtml, html, isRawHtml, unsafeHTML } from './html.js';

describe('escapeHtml', () => {
  test('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });
});

describe('html', () => {
  test('escapes interpolated strings', () => {
    expect(html`<b>${'<img src=x onerror=alert(1)>'}</b>`.value).toBe(
      '<b>&lt;img src=x onerror=alert(1)&gt;</b>',
    );
  });

  test('escapes quotes inside attribute values', () => {
    expect(html`<i title="${'a" onmouseover="x'}"></i>`.value).toBe(
      '<i title="a&quot; onmouseover=&quot;x"></i>',
    );
  });

  test('does not double-escape nested templates', () => {
    const inner = html`<em>${'&'}</em>`;
    expect(html`<p>${inner}</p>`.value).toBe('<p><em>&amp;</em></p>');
  });

  test('renders null, undefined and false as nothing; keeps 0 and true', () => {
    expect(html`[${null}${undefined}${false}${0}${true}]`.value).toBe('[0true]');
  });

  test('joins arrays', () => {
    const arr = ['a', html`<li>b</li>`];
    expect(
      html`<ul>
        ${arr}
      </ul>`.value,
    ).toBe('<ul>\n        a<li>b</li>\n      </ul>');
  });

  test('unsafeHTML passes markup through unchanged', () => {
    expect(html`${unsafeHTML('<svg></svg>')}`.value).toBe('<svg></svg>');
  });
});

describe('isRawHtml', () => {
  test('only recognises values created by html or unsafeHTML', () => {
    expect(isRawHtml(html`x`)).toBe(true);
    expect(isRawHtml({ value: '<b>' })).toBe(false);
    expect(isRawHtml('x')).toBe(false);
  });
});
