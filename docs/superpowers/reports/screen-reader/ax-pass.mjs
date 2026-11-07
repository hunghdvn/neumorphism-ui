// Accessibility-tree pass of the screen reader checklist, in Chromium (CDP Accessibility domain).
// Serves test-page.html with the CDN files replaced by the local builds (run `pnpm build` first),
// runs each checklist row's keys, and reads what the browser exposes to screen readers.
// Usage (from the repo root): node docs/superpowers/reports/screen-reader/ax-pass.mjs [--headed]
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const repo = process.cwd();
const require = createRequire(resolve(repo, 'package.json'));
const { chromium } = require('@playwright/test');

const html = readFileSync(resolve(import.meta.dirname, 'test-page.html'), 'utf8')
  .replace(/\s+integrity="[^"]*"/g, '')
  .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@neumorphism-ui\/tokens@[^/]+\/neu\.css/, '/neu.css')
  .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@neumorphism-ui\/elements@[^/]+\/cdn\/neu\.min\.js/, '/neu.min.js');
const files = {
  '/': ['text/html', html],
  '/neu.css': ['text/css', readFileSync(resolve(repo, 'packages/tokens/neu.css'))],
  '/neu.min.js': ['text/javascript', readFileSync(resolve(repo, 'packages/elements/cdn/neu.min.js'))],
};
const server = createServer((req, res) => {
  const file = files[req.url.split('?')[0]];
  if (!file) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': file[0] }).end(file[1]);
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url);
await page.waitForFunction(() => customElements.get('neu-select') && customElements.get('neu-radio-group'));
const cdp = await page.context().newCDPSession(page);
await cdp.send('Accessibility.enable');

// ---------- accessibility tree helpers ----------
const prop = (node, name) => node.properties?.find((p) => p.name === name)?.value;
async function tree() {
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const byBackend = new Map(nodes.filter((n) => n.backendDOMNodeId).map((n) => [n.backendDOMNodeId, n]));
  return { nodes, byId, byBackend };
}
const role = (n) => n?.role?.value;
const name = (n) => n?.name?.value ?? '';
function descendants(t, node, wanted) {
  const out = [];
  const walk = (n) => {
    for (const id of n.childIds ?? []) {
      const child = t.byId.get(id);
      if (!child) continue;
      if (!child.ignored && role(child) === wanted) out.push(child);
      else walk(child);
    }
  };
  walk(node);
  return out;
}
function ancestor(t, node, wanted) {
  for (let n = t.byId.get(node.parentId); n; n = t.byId.get(n.parentId)) if (role(n) === wanted) return n;
  return null;
}
function position(t, node, containerRole) {
  const container = ancestor(t, node, containerRole);
  if (!container) return '?';
  const items = descendants(t, container, role(node));
  return `${items.findIndex((i) => i.nodeId === node.nodeId) + 1} of ${items.length}`;
}
function states(n) {
  const out = [];
  for (const key of ['expanded', 'checked', 'selected', 'disabled', 'required', 'invalid']) {
    const v = prop(n, key);
    if (v === undefined) continue;
    const value = v.value;
    if (key === 'expanded') out.push(value ? 'expanded' : 'collapsed');
    else if (key === 'checked') out.push(value === 'true' || value === true ? 'checked' : 'not checked');
    else if (key === 'invalid') {
      if (value && value !== 'false') out.push(`invalid(${value})`);
    } else if (value) out.push(key);
  }
  return out;
}
/** What a reader gets for the focused element: name, role, states, value, active option. */
async function focused() {
  const t = await tree();
  const node = t.nodes.filter((n) => !n.ignored && prop(n, 'focused')?.value && role(n) !== 'RootWebArea').at(-1);
  if (!node) return { text: '(nothing focused)', t };
  const parts = [name(node), role(node), ...states(node)];
  if (node.value?.value) parts.push(`value "${node.value.value}"`);
  if (node.description?.value) parts.push(`description "${node.description.value}"`);
  let active = null;
  const ad = prop(node, 'activedescendant');
  if (ad?.relatedNodes?.length) {
    active = t.byBackend.get(ad.relatedNodes[0].backendDOMNodeId);
    if (active) parts.push(`| active: ${name(active)}, ${role(active)}, ${position(t, active, 'listbox')}, ${states(active).join(' ')}`);
    else parts.push('| active: UNRESOLVED');
  }
  if (role(node) === 'radio') {
    const group = ancestor(t, node, 'radiogroup');
    parts.push(position(t, node, 'radiogroup'), `| group: "${name(group)}" ${group ? states(group).join(' ') : 'NO GROUP'}`);
  }
  return { text: parts.filter(Boolean).join(', ').replace(/, \|/g, ' |'), node, active, t };
}
const domFocus = () =>
  page.evaluate(() => {
    let el = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    return el ? `${el.localName}${el.id ? '#' + el.id : ''}${el.textContent && el.localName === 'button' ? `("${el.textContent}")` : ''}` : 'none';
  });
const logCount = () => page.locator('#log li').count();
const value = (id) => page.evaluate((i) => document.getElementById(i).value, id);
const expanded = async () => (await focused()).text.includes('expanded');
const key = (k) => page.keyboard.press(k);
const focusButton = (text) => page.getByRole('button', { name: text, exact: true }).focus();

// ---------- rows ----------
const results = [];
function record(section, row, ok, observed) {
  results.push({ section, row, ok, observed });
}
async function check(section, row, expectFn) {
  const f = await focused();
  let ok;
  try {
    ok = await expectFn(f);
  } catch (e) {
    ok = false;
    f.text += ` [check threw: ${e.message}]`;
  }
  record(section, row, ok, f.text);
}
const has = (f, ...words) => words.every((w) => f.text.includes(w));
const activeIs = (f, label, pos) => f.active && name(f.active) === label && (!pos || position(f.t, f.active, 'listbox') === pos);
async function reset(selectValue = 'apple') {
  await page.evaluate((v) => {
    const s = document.getElementById('fruit');
    s.value = v;
  }, selectValue);
  await focusButton('Before select');
  await key('Tab');
  if (await expanded()) await key('Escape');
}

// 1.1
await focusButton('Before select');
await key('Tab');
await check('1.1', 'Tab to the select: "Fruit, combobox, collapsed, Apple"', (f) => role(f.node) === 'combobox' && name(f.node) === 'Fruit' && has(f, 'collapsed') && f.text.includes('Apple'));
await key('Shift+Tab');
const back = await domFocus();
await key('Tab');
await check('1.1', `Shift+Tab (to ${back}) then Tab: announced the same way`, (f) => role(f.node) === 'combobox' && name(f.node) === 'Fruit' && has(f, 'collapsed'));

// 1.2
const openWith = async (k, section, row, expectActive, pos) => {
  await reset();
  await key(k);
  await check(section, row, (f) => has(f, 'expanded') && role(f.node) === 'combobox' && (!expectActive || activeIs(f, expectActive, pos)));
};
await openWith('ArrowDown', '1.2', 'Down (closed): expanded, "Apple, 1 of 4"', 'Apple', '1 of 4');
await key('Escape');
await check('1.2', 'Escape: collapsed, value still Apple, focus on the select', async (f) => has(f, 'collapsed') && role(f.node) === 'combobox' && (await value('fruit')) === 'apple');
await openWith('Alt+ArrowDown', '1.2', 'Alt+Down (closed): same as Down', 'Apple', '1 of 4');
await openWith('ArrowUp', '1.2', 'Up (closed): opens');
await openWith('Enter', '1.2', 'Enter (closed): opens');
await openWith(' ', '1.2', 'Space (closed): opens');
await openWith('Home', '1.2', 'Home (closed): opens on "Apple, 1 of 4"', 'Apple', '1 of 4');
await openWith('End', '1.2', 'End (closed): opens on "Date, 4 of 4"', 'Date', '4 of 4');
await reset();
await page.locator('#fruit').click();
await check('1.2', 'Click the select: expanded, options reachable', (f) => has(f, 'expanded') && role(f.node) === 'combobox');
await page.locator('h1').click();
await page.locator('#fruit').focus();
await check('1.2', 'Click outside: closes (collapsed)', (f) => has(f, 'collapsed'));

// 1.3
await reset();
await key('ArrowDown');
const moves = [
  ['ArrowDown', 'Down: "Banana, 2 of 4", focus still on the combobox', 'Banana', '2 of 4'],
  ['ArrowDown', 'Down again: Cherry skipped, "Date, 4 of 4"', 'Date', '4 of 4'],
  ['ArrowDown', 'Down on the last option: stays on Date', 'Date', '4 of 4'],
  ['ArrowUp', 'Up: "Banana, 2 of 4" (Cherry skipped)', 'Banana', '2 of 4'],
  ['Home', 'Home: "Apple, 1 of 4"', 'Apple', '1 of 4'],
  ['End', 'End: "Date, 4 of 4"', 'Date', '4 of 4'],
  ['Home', '(Home, to set up PageDown)', 'Apple', '1 of 4'],
  ['PageDown', 'PageDown: last enabled option', 'Date', '4 of 4'],
  ['PageUp', 'PageUp: first enabled option', 'Apple', '1 of 4'],
];
for (const [k, row, label, pos] of moves) {
  await key(k);
  if (row.startsWith('(')) continue;
  await check('1.3', row, (f) => role(f.node) === 'combobox' && activeIs(f, label, pos));
}
{
  const before = (await focused()).active;
  const scroll = () => page.locator('#fruit').evaluate((el) => el.shadowRoot.querySelector('[role=listbox]')?.scrollTop);
  const top = await scroll();
  await page.locator('#fruit neu-option[value="date"]').hover().catch(() => {});
  const shadowOption = await page.locator('#fruit').evaluate((el) => {
    const opt = [...el.shadowRoot.querySelectorAll('[role=option]')].find((o) => o.textContent.trim() === 'Date');
    const r = opt?.getBoundingClientRect();
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  });
  if (shadowOption) await page.mouse.move(shadowOption.x, shadowOption.y);
  await check('1.3', 'Hover an option: no scroll, focus stays on the combobox', async (f) => role(f.node) === 'combobox' && (await scroll()) === top);
  results.at(-1).observed += ` | active before hover: ${name(before)}; listbox scrollTop ${top} -> ${await scroll()}`;
}

// 1.4
await reset('apple');
let count = await logCount();
const choose = async (keys, row, expectValue, expectFocus = 'combobox', closed = true) => {
  for (const k of keys) await key(k);
  const f = await focused();
  const v = await value('fruit');
  const changes = (await logCount()) - count;
  count = await logCount();
  const focusOk = expectFocus === 'combobox' ? role(f.node) === 'combobox' : (await domFocus()).includes(expectFocus);
  const ok = v === expectValue && focusOk && (!closed || role(f.node) !== 'combobox' || has(f, 'collapsed'));
  record('1.4', row, ok, `${f.text} | value=${v} | change events: ${changes} | DOM focus: ${await domFocus()}`);
  return changes;
};
await choose(['ArrowDown', 'ArrowDown', 'Enter'], 'Open, Down to Banana, Enter: collapsed, "Banana"', 'banana');
await choose(['ArrowDown', 'ArrowDown', ' '], 'Open, Down to Date, Space: chooses Date, closes', 'date');
await choose(['ArrowDown', 'ArrowUp', 'Escape'], 'Open, to Banana, Escape: keeps Date', 'date');
await choose(['ArrowDown', 'ArrowUp', 'Tab'], 'Open, Up to Banana, Tab: Banana chosen, focus moves on', 'banana', 'After select');
await key('Shift+Tab');
count = await logCount();
await choose(['ArrowDown', 'ArrowUp', 'Alt+ArrowUp'], 'Open, Up to Apple, Alt+Up: Apple chosen, closes, focus stays', 'apple');
await page.locator('#fruit').click();
{
  const pt = await page.locator('#fruit').evaluate((el) => {
    const opt = [...el.shadowRoot.querySelectorAll('[role=option]')].find((o) => o.textContent.trim() === 'Date');
    const r = opt.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(pt.x, pt.y);
  await choose([], 'Click an option (Date): chosen, closes', 'date');
}
{
  const rows = results.filter((r) => r.section === '1.4' && /change events: (\d+)/.test(r.observed));
  const counts = rows.map((r) => Number(r.observed.match(/change events: (\d+)/)[1]));
  // Expected: one per actual value change (Banana, Date, none for Escape, Banana, Apple, Date).
  const expected = [1, 1, 0, 1, 1, 1];
  record('1.4', 'change fired once per choice (none for Escape)', JSON.stringify(counts) === JSON.stringify(expected), `counts ${JSON.stringify(counts)}, expected ${JSON.stringify(expected)}`);
}

// 1.5
await reset('apple');
await key('b');
await check('1.5', 'Closed, type "b": opens on Banana', (f) => has(f, 'expanded') && activeIs(f, 'Banana'));
await key('Escape');
await key('ArrowDown');
await page.waitForTimeout(1100);
await key('d');
await check('1.5', 'Open, type "d": "Date, 4 of 4"', (f) => activeIs(f, 'Date', '4 of 4'));
await page.waitForTimeout(1100);
await key('c');
await check('1.5', 'Open, type "c": active option unchanged (Cherry disabled)', (f) => activeIs(f, 'Date'));
await page.waitForTimeout(1100);
await key('b');
await key('a');
await check('1.5', 'Open, type "ba" quickly: Banana', (f) => activeIs(f, 'Banana'));
await page.waitForTimeout(1100);
await key('Home');
await key('b');
await page.waitForTimeout(1100);
await key('d');
await check('1.5', 'Type "b", wait > 1 s, type "d": new search, Date', (f) => activeIs(f, 'Date'));
await key('Escape');
await page.locator('neu-select[name="name"]').focus();
// AltGr on Windows reports Ctrl+Alt with the composed character (CDP modifiers: Alt 1 | Ctrl 2).
for (const type of ['keyDown', 'keyUp']) {
  await cdp.send('Input.dispatchKeyEvent', {
    type,
    key: 'ą',
    code: 'KeyA',
    text: type === 'keyDown' ? 'ą' : undefined,
    windowsVirtualKeyCode: 65,
    modifiers: 3,
  });
}
await check('1.5', 'AltGr (Ctrl+Alt) "ą": opens on Ąbel', (f) => has(f, 'expanded') && activeIs(f, 'Ąbel'));
await key('Escape');

// 1.6
await reset('apple');
await page.locator('#fruit').click();
{
  const t = await tree();
  const cherry = t.nodes.find((n) => !n.ignored && role(n) === 'option' && name(n) === 'Cherry');
  record('1.6', 'Cherry in the listbox is exposed as disabled', !!cherry && states(cherry).includes('disabled'), cherry ? `Cherry, option, ${position(t, cherry, 'listbox')}, ${states(cherry).join(' ')}` : 'Cherry not in the tree');
  const pt = await page.locator('#fruit').evaluate((el) => {
    const opt = [...el.shadowRoot.querySelectorAll('[role=option]')].find((o) => o.textContent.trim() === 'Cherry');
    const r = opt.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(pt.x, pt.y);
  await page.locator('#fruit').focus();
  const f = await focused();
  record('1.6', 'Click Cherry (record what happens)', (await value('fruit')) === 'apple', `${f.text} | value=${await value('fruit')}`);
  if (await expanded()) await key('Escape');
}
await page.getByRole('button', { name: '1.6: toggle disabled on the select' }).click();
await focusButton('Before select');
await key('Tab');
{
  const f = await focused();
  const where = await domFocus();
  await key('ArrowDown');
  const after = await focused();
  record('1.6', 'disabled select: Tab skips it or it is announced unavailable; Down does nothing', where.includes('After select') || (has(f, 'disabled') && !has(after, 'expanded')), `Tab from "Before select" lands on ${where}: ${f.text}`);
}
await page.getByRole('button', { name: '1.6: toggle disabled on the select' }).click();

// 1.7
const required = page.locator('neu-select[name="fruit-required"]');
await page.locator('neu-select[name="name"]').focus();
await key('Tab');
await check('1.7', 'Tab to the required select: "Fruit, combobox, collapsed, required", empty value', (f) => role(f.node) === 'combobox' && has(f, 'collapsed', 'required'));
await page.getByRole('button', { name: 'Submit the select form' }).focus();
await key('Enter');
await check('1.7', 'Submit empty: becomes invalid; record what is exposed on focus', async (f) => role(f.node) === 'combobox' && !(await required.evaluate((el) => el.checkValidity())));
await required.focus();
await key('ArrowDown');
await key('Enter');
await check('1.7', 'Choose an option, re-check: record', async (f) => role(f.node) === 'combobox' && (await required.evaluate((el) => el.checkValidity())));
await required.evaluate((el) => (el.value = ''));
await page.getByRole('button', { name: 'Submit the select form' }).click();
await page.getByRole('button', { name: 'Submit the select form' }).focus();
await key('Shift+Tab');
await check('1.7', 'Submit with no value, then Tab back: record', (f) => role(f.node) === 'combobox');

// 1.8
await page.locator('neu-select[name="fruit-slot"]').focus();
await check('1.8', 'Slotted label: "Favorite fruit, combobox, collapsed"', (f) => role(f.node) === 'combobox' && name(f.node) === 'Favorite fruit');
await page.getByRole('button', { name: 'Change the slotted select label' }).click();
await page.locator('neu-select[name="fruit-slot"]').focus();
await check('1.8', 'Change the slotted text: the new text is the name', (f) => name(f.node) === 'Favorite fruit 1');
await page.locator('neu-select[name="fruit-both"]').focus();
await check('1.8', 'label attribute and slotted label: one stable name, not both', (f) => ['Label attribute', 'Slotted label'].includes(name(f.node)));

// 2.1
await focusButton('Before group');
await key('Tab');
await check('2.1', 'Tab in: "Size, radio group" then "Medium, radio button, checked, 2 of 4"', (f) => role(f.node) === 'radio' && name(f.node) === 'Medium' && has(f, 'checked', '2 of 4', 'group: "Size"'));
await key('Tab');
record('2.1', 'Tab again: focus leaves the group', (await domFocus()).includes('After group'), `DOM focus: ${await domFocus()}`);
await key('Shift+Tab');
await check('2.1', 'Shift+Tab back: lands on Medium', (f) => name(f.node) === 'Medium');
await page.getByRole('button', { name: '2.1: remove the value' }).click();
await focusButton('Before group');
await key('Tab');
await check('2.1', 'No value, Tab in: "Small, radio button, not checked, 1 of 4"', (f) => name(f.node) === 'Small' && has(f, 'not checked', '1 of 4'));

// 2.2
await page.evaluate(() => (document.getElementById('size').value = 'md'));
await page.locator('#size neu-radio[value="md"]').focus();
count = await logCount();
const arrows = [
  ['ArrowRight', 'Right from Medium: Large skipped, "Extra large, checked, 4 of 4"', 'Extra large', '4 of 4'],
  ['ArrowRight', 'Right from the last: wraps to "Small, checked, 1 of 4"', 'Small', '1 of 4'],
  ['ArrowLeft', 'Left from Small: wraps to "Extra large, checked"', 'Extra large', '4 of 4'],
  ['ArrowLeft', 'Left from Extra large: Large skipped, "Medium, checked, 2 of 4"', 'Medium', '2 of 4'],
  ['ArrowDown', 'Down from Medium: same as Right', 'Extra large', '4 of 4'],
  ['ArrowUp', 'Up from Extra large: same as Left', 'Medium', '2 of 4'],
];
const radioValues = { Small: 'sm', Medium: 'md', 'Extra large': 'xl' };
let changeCounts = [];
for (const [k, row, label, pos] of arrows) {
  await key(k);
  const v = await value('size');
  changeCounts.push((await logCount()) - count);
  count = await logCount();
  await check('2.2', row, (f) => name(f.node) === label && has(f, 'checked', pos) && !has(f, 'not checked') && v === radioValues[label]);
  results.at(-1).observed += ` | group value=${v}`;
}
record('2.2', 'change fired once per move, value matches', changeCounts.every((c) => c === 1), `counts ${JSON.stringify(changeCounts)}`);
await page.getByRole('button', { name: '2.3: toggle disabled on the group' }).focus();
await key('Tab');
await check('2.2', 'Group with no value, Tab in: first enabled radio, not checked', (f) => name(f.node) === 'Small' && has(f, 'not checked', 'group: "Size, no value"'));
await key(' ');
await check('2.2', 'Space: becomes checked', (f) => name(f.node) === 'Small' && has(f, 'checked') && !has(f, 'not checked'));

// 2.3
await page.evaluate(() => (document.getElementById('size').value = 'md'));
{
  const pt = await page.locator('#size neu-radio[value="lg"]').boundingBox();
  await page.mouse.click(pt.x + 5, pt.y + pt.height / 2);
  record('2.3', 'Click Large: nothing happens', (await value('size')) === 'md', `group value=${await value('size')}, DOM focus: ${await domFocus()}`);
  const t = await tree();
  const large = t.nodes.find((n) => !n.ignored && role(n) === 'radio' && name(n) === 'Large' && ancestor(t, n, 'radiogroup') && name(ancestor(t, n, 'radiogroup')) === 'Size');
  record('2.3', 'Browse to Large: "Large, radio button, unavailable, not checked, 3 of 4"', !!large && states(large).includes('disabled') && states(large).includes('not checked') && position(t, large, 'radiogroup') === '3 of 4', large ? `Large, radio, ${position(t, large, 'radiogroup')}, ${states(large).join(' ')}` : 'not found');
}
await page.getByRole('button', { name: '2.3: toggle disabled on the group' }).click();
await focusButton('Before group');
await key('Tab');
{
  const where = await domFocus();
  const f = await focused();
  record('2.3', 'disabled group: Tab skips it or radios announced unavailable', where.includes('After group') || has(f, 'disabled'), `Tab from "Before group" lands on ${where}: ${f.text}`);
}
await page.getByRole('button', { name: '2.3: toggle disabled on the group' }).click();

// 2.4
await page.locator('neu-radio-group[name="shirt"] neu-radio[value="s"]').focus();
await check('2.4', 'Slotted label: "Shirt size, radio group"', (f) => has(f, 'group: "Shirt size"'));
await page.getByRole('button', { name: 'Change the slotted group label' }).click();
await page.locator('neu-radio-group[name="shirt"] neu-radio[value="s"]').focus();
await check('2.4', 'Change the slotted text: the new name', (f) => /group: "Shirt size \d+"/.test(f.text));
await check('2.4', 'Radios do not repeat the group name', (f) => name(f.node) === 'S');
await page.locator('neu-radio-group[name="no-name"] neu-radio[value="yes"]').focus();
await check('2.4', 'No label: "radio group" with no name, no stale text (record)', (f) => has(f, 'group: ""'));

// 2.5
await page.locator('neu-radio-group[name="size-required"] neu-radio[value="sm"]').focus();
await check('2.5', 'Required group, Tab in: "Size, radio group, required"', (f) => has(f, 'group: "Size"', 'required'));
await page.getByRole('button', { name: 'Submit the group form' }).focus();
await key('Enter');
await check('2.5', 'Submit with nothing checked: record what is exposed on focus', async () => !(await page.locator('neu-radio-group[name="size-required"]').evaluate((el) => el.checkValidity())));
await page.locator('neu-radio-group[name="size-required"] neu-radio[value="sm"]').focus();
await key(' ');
await check('2.5', 'Check a radio: record', async () => page.locator('neu-radio-group[name="size-required"]').evaluate((el) => el.checkValidity()));

// Native controls, for the rows above that only record (required and invalid).
await page.reload();
await page.waitForFunction(() => customElements.get('neu-select'));
await page.locator('select[name="native-fruit"]').focus();
record('native', 'required <select>, empty, before submit', true, (await focused()).text);
await page.locator('input[name="native-size"][value="sm"]').focus();
record('native', 'required radios, none checked, before submit', true, (await focused()).text);
await page.locator('neu-radio-group[name="size-required"] neu-radio[value="sm"]').focus();
record('native', '(compare) neu-radio-group required, before submit, fresh page', true, (await focused()).text);
await page.locator('neu-select[name="fruit-required"]').focus();
record('native', '(compare) neu-select required, before submit, fresh page', true, (await focused()).text);
await page.getByRole('button', { name: 'Submit the native form' }).click();
record('native', 'after submitting the native form: focused control', true, `${(await focused()).text} | DOM focus: ${await domFocus()}`);
await page.locator('input[name="native-size"][value="sm"]').focus();
record('native', 'required radios after a failed submit', true, (await focused()).text);

// ---------- report ----------
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.section} ${r.row}\n     ${r.observed}`);
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} pass; page errors: ${JSON.stringify(errors)}`);
await browser.close();
server.close();
