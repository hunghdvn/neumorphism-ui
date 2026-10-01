# neumorphism-ui — Giai đoạn 1: Nền móng + cổng SSR — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng monorepo, tokens, base class `NeuElement`, 3 component thí điểm (Button, Switch, TextField), `@neu-ui/ssr`, `@neu-ui/react`, example Next/Nuxt, rồi chạy cổng SSR (spec §8.6) và dừng lại báo cáo.

**Architecture:** Custom Elements thuần, 0 runtime dependency. Mỗi component tách "định nghĩa" (DOM-free: props, `template()`, styles, docs) khỏi "hành vi" (class kế thừa `NeuElement`). SSR, bộ sinh React wrapper và `custom-elements.json` chỉ đọc định nghĩa. SSR chèn `<template shadowrootmode>`; client nhận lại shadow root có sẵn, không render lại.

**Tech Stack:** TypeScript 6.0.3, pnpm 9.15.1 workspaces, Vitest 5.0.3 browser mode + Playwright 1.63.0 (Chromium/Firefox/WebKit), esbuild 0.28.2, axe-core 4.13.0, React 19.3 (+ 18.3 qua alias), Next 16.3.8, Nuxt 4.5.2, Changesets 2.31.1, ESLint 10 + typescript-eslint 8.71, Prettier 3.9.

**Spec:** `docs/superpowers/specs/2026-10-01-neumorphism-ui-v1-design.md`

## Global Constraints

- Trình duyệt: Chrome/Edge 125+, Safari 17.4+, Firefox 126+. Không polyfill.
- `@neu-ui/tokens` và `@neu-ui/elements`: **0 runtime dependency**.
- Chỉ ESM. Node ≥ 22.12 cho công cụ (CI dùng Node 24).
- TypeScript **6.0.3**, không dùng 7.x (TS 7 không còn JS API; typescript-eslint `<6.1` và Next cần API đó).
- Tên: npm scope `@neu-ui`, prefix tag `neu-`. Tên React export: `NeuButton`, `NeuSwitch`, `NeuTextField`.
- Thẩm mỹ A (neumorphism thuần): axe-core luôn chạy với **rule `color-contrast` tắt**; mọi rule khác phải pass.
- Attribute không hợp lệ → thay bằng giá trị mặc định, **im lặng** (không throw, không log).
- Form control: attribute `value` / `checked` là **giá trị mặc định**, property là giá trị hiện tại, **không phản chiếu ngược**. Style trạng thái hiện tại bằng `:state(...)`.
- Event phát từ host: `bubbles: true, composed: true`. Control `disabled` không phát event nào (kể cả `click`).
- Biến CSS riêng có tiền tố `--_neu-` và không phải API công khai.
- Template viết bằng `html\`\``, tự escape mọi giá trị; `unsafeHTML()` chỉ cho markup nội bộ.
- Mọi module của `@neu-ui/elements` phải import được trong Node mà không lỗi.
- **Không bao giờ khai báo instance field trùng tên một prop** (với `useDefineForClassFields`, field sẽ che accessor). Prop chỉ được khai báo bằng `declare`.
- Ngân sách (min+gzip): CDN bundle ≤ 25KB; tokens ≤ 4KB; core ≤ 4KB; mỗi component không tính core ≤ 3KB.
- Lệnh shell trong kế hoạch là POSIX sh (trên Windows chạy trong Git Bash). `BROWSERS=chromium` giới hạn engine khi chạy nhanh ở máy; trước mỗi commit phải chạy đủ 3 engine.

## Sai khác so với spec (đã cân nhắc, cần người dùng biết)

1. **Cập nhật đồng bộ, không gom microtask** (spec §6.2.4). Lý do: native parity. `el.checked = true; new FormData(form)` phải thấy giá trị ngay. Mỗi lần cập nhật chỉ sửa vài node nên không tốn kém.
2. **Ngân sách dung lượng kiểm bằng script riêng** (`scripts/check-size.mjs`: esbuild + zlib), không dùng package `size-limit` (spec §10, §11). `size-limit` không đo được "component không tính core".
3. **Node ≥ 22.12** thay vì ≥ 20. Node 20 đã hết hỗ trợ (EOL) từ 30/04/2026; Vite 8 / Vitest 5 cần Node mới hơn.
4. **TypeScript 6.0.3**, không dùng 7.x (lý do ở Global Constraints).
5. **`--neu-font` không được khai báo trong tokens.** Khi chưa đặt, `font-family` tự kế thừa, đúng với mặc định "inherit" của spec.
6. **Khi trang còn đang tải (`readyState === 'loading'`), base class chờ `DOMContentLoaded` rồi mới tự tạo shadow root.** Lý do: với SSR streaming, element có thể được đăng ký trước khi parser đọc tới template DSD của nó. Đã kiểm chứng trên 3 engine: constructor lúc đó chưa thấy shadow root.
7. **`@nuxt/kit` là optional peer dependency của `@neu-ui/ssr`**, chỉ cho subpath `/nuxt`.
8. **Nhấn Enter trong TextField sẽ submit form** khi form có nút submit hoặc chỉ có một control (implicit submission như native).
9. **Style của component có `:host(:not(:defined)) { visibility: inherit !important }`** để nội dung đã SSR vẫn hiện, dù tokens ẩn các tag chưa đăng ký (§5.6). Quy tắc cascade: `!important` trong shadow thắng style bình thường ở ngoài.

## Đã kiểm chứng trước khi viết kế hoạch (scratchpad, 01/10/2026)

- Vitest 5 browser mode + `@vitest/browser-playwright` chạy trên 3 engine; `setHTMLUnsafe` parse DSD; `ElementInternals` role/states/form value; axe chạy được.
- React 19: `renderToString` xuất `<template shadowrootmode="open">`. Khi cây client **không có** template thì `hydrateRoot` không báo lỗi (3 engine). Kiểm ngược: client **có** template thì React báo "Hydration failed".
- `color-mix(in oklab, …, black min(100%, calc(…)))` tính lại đúng trong vùng con, `min()` chặn đúng ở 100% (3 engine).
- `<label for>` bên ngoài kích hoạt và focus được form-associated custom element (3 engine).
- Element được đăng ký trước khi parse: constructor chưa thấy shadow root, DSD gắn vào sau đó (3 engine).
- React 18.3.1 qua alias trong Vitest browser chạy được; có `React.act`.
- React 18 SSR: alias trong Vitest **môi trường node** không chạy được (`react-dom18` vẫn `require` React 19). Bundle bằng esbuild với `alias` thì chạy, và React 18.3.1 xuất đúng `<template shadowrootmode>`. Task 12 dùng cách này.
- TypeScript 7.0.2 không có JS API (chỉ có `tsc` native); typescript-eslint 8.71 yêu cầu TypeScript `<6.1`. TypeScript 6.0.3 type-check được base class mẫu.
- Changesets 3.0.3 yêu cầu pnpm ≥ 10, và lệnh `init` chỉ chạy tương tác, nên kế hoạch dùng Changesets 2.31.1.

## Ngoài phạm vi giai đoạn 1

- 14 component còn lại của v1 (giai đoạn 2–3), trang docs Starlight (giai đoạn 4).
- Tính hash SRI cho docs và release notes (spec §10): làm ở giai đoạn 4, cùng với docs.
- `renderDSD(…, ctx.options)` cho Select (giai đoạn 3).
- Publish lên npm và push lên GitHub: chờ người dùng quyết định ở Task 16.
- Nuxt 4.5: SSR streaming mặc định **tắt**; hook `render:html` đưa ra `body: string[]`; `@nuxt/kit` có `addServerPlugin`, `addPluginTemplate`; alias `#app/nuxt` có sẵn.

## Review Focus

Năm loại tình huống spec ngụ ý nhưng dễ bị bỏ sót, xếp theo khả năng gây lỗi cho người dùng. Mỗi dòng đã được thêm test vào task sở hữu code:

1. **Element được đăng ký trước khi parser đọc tới DSD của nó** (chunk streaming của Next): phải chờ, không tự tạo shadow root rồi biến template thành con thường. → Test ở Task 4 (giả lập `readyState = 'loading'`) và e2e ở Task 13.
2. **Property được đặt trước khi element được nâng cấp** (React hoặc CDN tải muộn): giá trị phải được áp dụng sau khi nâng cấp. → Task 4.
3. **Giá trị attribute độc hại** (`<img onerror>`, dấu nháy) trong template và SSR: phải được escape, không chèn được markup. → Task 8 và Task 9.
4. **Gỡ ra rồi gắn lại vào DOM** (React sắp xếp lại, Suspense di chuyển node): không render lại, không nhân đôi listener. → Task 4 và Task 7.
5. **Chữ người dùng gõ vào input đã SSR trước khi JS chạy**: phải được giữ khi hydrate, và việc đổi attribute sau đó không ghi đè. → Task 9.

## Cấu trúc file

```
.gitattributes  .gitignore  .prettierrc.json  .prettierignore  eslint.config.js
package.json  pnpm-workspace.yaml  tsconfig.base.json  vitest.shared.ts  LICENSE  README.md
playwright.config.ts  playwright.visual.config.ts
scripts/check-size.mjs  scripts/serve-static.mjs  scripts/measure-ssr-html.mjs
.changeset/config.json  .changeset/README.md
.github/workflows/ci.yml  .github/workflows/visual-baselines.yml  .github/workflows/release.yml

packages/tokens/            src/neu.css, scripts/build.mjs, test/tokens.test.ts, test/env.d.ts
packages/elements/
  src/core/                 html.ts, props.ts, define.ts, dom.ts, styles.ts, validation.ts,
                            neu-element.ts, form-control.ts (+ *.test.ts)
  src/components/button/    button.def.ts, button.styles.ts, button.ts, button.test.ts
  src/components/switch/    switch.def.ts, switch.styles.ts, switch.ts, switch.test.ts
  src/components/text-field/ text-field.def.ts, text-field.styles.ts, text-field.ts, text-field.test.ts
  src/test-utils/helpers.ts
  src/button.ts  src/switch.ts  src/text-field.ts  src/all.ts  src/ssr.ts  src/cdn.ts  src/ssr.test.ts
  scripts/build-cdn.mjs  custom-elements.json (sinh tự động)
packages/ssr/               src/transform-html.ts, src/index.ts, src/nuxt/module.ts,
                            src/nuxt/runtime/server-plugin.ts, src/*.test.ts
packages/react/             src/create-component.ts, src/index.ts, src/generated/* (sinh tự động),
                            src/create-component.test.ts, src/ssr.node.test.ts, test/types.check.ts
tools/gen/                  src/lib.mjs, src/gen.mjs, src/lib.test.mjs
apps/examples/next/         app/layout.tsx, app/page.tsx, app/demo-form.tsx, app/slow-switch.tsx
apps/examples/nuxt/         nuxt.config.ts, app/app.vue
e2e/                        ssr.spec.ts, visual.spec.ts, visual/index.html
docs/superpowers/reports/   báo cáo cổng SSR (Task 16)
```

Ranh giới quan trọng:
- `src/core/*.ts` không import gì từ `src/components/`.
- `*.def.ts` và `*.styles.ts` không đụng DOM. Chỉ `*.ts` hành vi mới được dùng `HTMLElement`, `document`.
- `ssr.ts` chỉ import file `.def.ts`.

---
### Task 1: Monorepo + tooling + `html` tagged template

**Files:**
- Create: `.gitattributes`, `.prettierrc.json`, `.prettierignore`, `eslint.config.js`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.shared.ts`, `LICENSE`, `README.md`
- Modify: `.gitignore`
- Create: `packages/elements/package.json`, `packages/elements/tsconfig.json`, `packages/elements/vitest.config.ts`
- Create: `packages/elements/src/core/html.ts`
- Test: `packages/elements/src/core/html.test.ts`

**Interfaces:**
- Consumes: không có.
- Produces:
  - `interface RawHtml { readonly value: string }` (có thêm một symbol brand riêng)
  - `escapeHtml(value: string): string`
  - `unsafeHTML(value: string): RawHtml`
  - `isRawHtml(value: unknown): value is RawHtml`
  - `html(strings: TemplateStringsArray, ...values: unknown[]): RawHtml`
  - `browserTest(options?: { include?: string[]; exclude?: string[] })` trong `vitest.shared.ts`, trả về object cho khóa `test` của config Vitest.

- [ ] **Step 1: Tạo file cấu hình gốc**

`.gitattributes`:
```
* text=auto eol=lf
*.png binary
```

Thêm vào cuối `.gitignore`:
```
# generated build output
packages/tokens/neu.css
packages/elements/cdn/
next-env.d.ts
.vitest/

# visual baselines are only committed for linux (CI)
e2e/__screenshots__/win32/
e2e/__screenshots__/darwin/
```

`.prettierrc.json`:
```json
{
  "singleQuote": true,
  "printWidth": 100
}
```

`.prettierignore`:
```
pnpm-lock.yaml
**/dist/
**/cdn/
**/.next/
**/.nuxt/
**/.output/
.superpowers/
docs/superpowers/
packages/tokens/neu.css
packages/elements/custom-elements.json
packages/react/src/generated/
e2e/__screenshots__/
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - packages/*
  - apps/examples/*
  - tools/*
```

`package.json`:
```json
{
  "name": "neumorphism-ui",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.15.1",
  "engines": {
    "node": ">=22.12"
  },
  "scripts": {
    "build": "pnpm -r --filter \"./packages/*\" run build",
    "test": "pnpm -r --workspace-concurrency=1 --filter \"./packages/*\" --filter \"./tools/*\" run test",
    "typecheck": "pnpm -r --filter \"./packages/*\" run typecheck",
    "lint": "eslint . && prettier --check .",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@types/node": "24.19.0",
    "@vitest/browser": "5.0.3",
    "@vitest/browser-playwright": "5.0.3",
    "eslint": "10.11.0",
    "globals": "17.13.0",
    "playwright": "1.63.0",
    "prettier": "3.9.9",
    "typescript": "6.0.3",
    "typescript-eslint": "8.71.0",
    "vitest": "5.0.3"
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["es2023", "dom", "dom.iterable"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "useDefineForClassFields": true
  }
}
```

`eslint.config.js`:
```js
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/cdn/**',
    '**/.next/**',
    '**/.nuxt/**',
    '**/.output/**',
    '**/next-env.d.ts',
    '.superpowers/**',
    'docs/**',
    'packages/tokens/neu.css',
    'packages/react/src/generated/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
]);
```

`vitest.shared.ts`:
```ts
import { playwright } from '@vitest/browser-playwright';

type BrowserName = 'chromium' | 'firefox' | 'webkit';
const ALL_BROWSERS: BrowserName[] = ['chromium', 'firefox', 'webkit'];

/** `BROWSERS=chromium,firefox` limits engines for quick local runs; CI always runs all three. */
function selectedBrowsers(): BrowserName[] {
  const raw = process.env.BROWSERS;
  if (!raw) return ALL_BROWSERS;
  const picked = raw
    .split(',')
    .map((name) => name.trim())
    .filter((name): name is BrowserName => (ALL_BROWSERS as string[]).includes(name));
  return picked.length > 0 ? picked : ALL_BROWSERS;
}

/** The `test` block of a Vitest config that runs files in real browsers. */
export function browserTest(options: { include?: string[]; exclude?: string[] } = {}) {
  return {
    include: options.include ?? ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', ...(options.exclude ?? [])],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: selectedBrowsers().map((browser) => ({ browser })),
    },
  };
}
```

`LICENSE`:
```
MIT License

Copyright (c) 2026 HungHD

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

`README.md`:
```markdown
# neumorphism-ui

Framework-agnostic neumorphism web components with SSR and React wrappers.

Status: pre-release. Design: `docs/superpowers/specs/2026-10-01-neumorphism-ui-v1-design.md`.

## Develop

    pnpm install
    pnpm exec playwright install chromium firefox webkit
    pnpm build && pnpm test
```

- [ ] **Step 2: Tạo package `@neu-ui/elements` (khung)**

`packages/elements/package.json`:
```json
{
  "name": "@neu-ui/elements",
  "version": "0.0.0",
  "description": "Neumorphism UI web components",
  "license": "MIT",
  "type": "module",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/hunghdvn/neumorphism-ui.git",
    "directory": "packages/elements"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "axe-core": "4.13.0",
    "esbuild": "0.28.2"
  }
}
```

`packages/elements/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "types": []
  },
  "include": ["src"]
}
```

`packages/elements/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import { browserTest } from '../../vitest.shared.ts';

export default defineConfig({ test: browserTest() });
```

- [ ] **Step 3: Cài đặt**

Run: `pnpm install && pnpm exec playwright install chromium firefox webkit`
Expected: tạo `pnpm-lock.yaml`, không có lỗi peer dependency.

- [ ] **Step 4: Viết test thất bại cho `html`**

`packages/elements/src/core/html.test.ts`:
```ts
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
    expect(html`<ul>${['a', html`<li>b</li>`]}</ul>`.value).toBe('<ul>a<li>b</li></ul>');
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
```

- [ ] **Step 5: Chạy để xác nhận thất bại**

Run: `BROWSERS=chromium pnpm --filter @neu-ui/elements test`
Expected: FAIL — `Failed to resolve import "./html.js"` (hoặc tương tự: module chưa tồn tại).

- [ ] **Step 6: Cài đặt `html.ts`**

`packages/elements/src/core/html.ts`:
```ts
const RAW = Symbol('neu.raw');

/** A string that is already safe HTML. Only `html` and `unsafeHTML` create one. */
export interface RawHtml {
  readonly [RAW]: true;
  readonly value: string;
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

/** Marks markup as trusted. Only for library-owned markup such as built-in SVG icons. */
export function unsafeHTML(value: string): RawHtml {
  return { [RAW]: true, value };
}

export function isRawHtml(value: unknown): value is RawHtml {
  return typeof value === 'object' && value !== null && RAW in value;
}

function render(value: unknown): string {
  if (value === null || value === undefined || value === false) return '';
  if (Array.isArray(value)) return value.map(render).join('');
  if (isRawHtml(value)) return value.value;
  return escapeHtml(String(value));
}

/** Tagged template that escapes every interpolated value unless it is RawHtml. */
export function html(strings: TemplateStringsArray, ...values: unknown[]): RawHtml {
  let out = strings[0] ?? '';
  values.forEach((value, index) => {
    out += render(value) + (strings[index + 1] ?? '');
  });
  return unsafeHTML(out);
}
```

- [ ] **Step 7: Chạy test trên cả 3 engine**

Run: `pnpm --filter @neu-ui/elements test`
Expected: PASS — `Tests 24 passed` (8 test × 3 engine).

- [ ] **Step 8: Typecheck, lint, commit**

Run: `pnpm --filter @neu-ui/elements typecheck && pnpm format && pnpm lint`
Expected: không có lỗi.

```bash
git add .gitattributes .gitignore .prettierrc.json .prettierignore eslint.config.js package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json vitest.shared.ts LICENSE README.md packages/elements
git commit -m "chore: scaffold monorepo and add html tagged template"
```

---

### Task 2: Khai báo props và `defineComponent`

**Files:**
- Create: `packages/elements/src/core/props.ts`, `packages/elements/src/core/define.ts`
- Test: `packages/elements/src/core/props.test.ts`, `packages/elements/src/core/define.test.ts`

**Interfaces:**
- Consumes: `RawHtml`, `html` (Task 1).
- Produces:
  ```ts
  type PropDecl =
    | { readonly type: 'boolean'; readonly reflect?: boolean; readonly attribute?: string }
    | { readonly type: 'number'; readonly default: number; readonly reflect?: boolean; readonly attribute?: string }
    | { readonly type: 'string'; readonly default?: string; readonly values?: readonly string[]; readonly reflect?: boolean; readonly attribute?: string };
  type PropsSchema = Readonly<Record<string, PropDecl>>;
  type PropValue = string | number | boolean;
  type InferProps<S extends PropsSchema>; // boolean→boolean, number→number, values→union, string→string
  attributeName(prop: string, decl: PropDecl): string
  parseAttribute(decl: PropDecl, raw: string | null): PropValue
  coerceProperty(decl: PropDecl, value: unknown): PropValue
  serializeAttribute(decl: PropDecl, value: PropValue): string | null
  parseProps<S extends PropsSchema>(schema: S, read: (attribute: string) => string | null): InferProps<S>

  interface DocEntry { readonly name: string; readonly description: string }
  interface ComponentDocs { summary: string; events, slots, parts, cssProperties: readonly DocEntry[] }
  interface FormDef { readonly valueProp: 'value' | 'checked' }
  interface ComponentDef<S extends PropsSchema = PropsSchema> {
    readonly tag: string; readonly props: S; readonly styles: string;
    template(props: InferProps<S>): RawHtml;   // method syntax: bivariant, so ComponentDef<S> fits ComponentDef
    readonly delegatesFocus?: boolean; readonly form?: FormDef; readonly docs: ComponentDocs;
  }
  defineComponent<const S extends PropsSchema>(def: ComponentDef<S>): ComponentDef<S>
  ```

- [ ] **Step 1: Viết test thất bại cho props**

`packages/elements/src/core/props.test.ts`:
```ts
import { describe, expect, expectTypeOf, test } from 'vitest';
import {
  attributeName,
  coerceProperty,
  parseAttribute,
  parseProps,
  serializeAttribute,
  type PropDecl,
} from './props.js';

const size = { type: 'string', default: 'md', values: ['sm', 'md', 'lg'] } as const satisfies PropDecl;
const label = { type: 'string' } as const satisfies PropDecl;
const max = { type: 'number', default: 100 } as const satisfies PropDecl;
const disabled = { type: 'boolean' } as const satisfies PropDecl;

describe('attributeName', () => {
  test('converts camelCase to kebab-case', () => {
    expect(attributeName('helpText', label)).toBe('help-text');
  });

  test('honours an explicit attribute name', () => {
    expect(attributeName('maxLength', { type: 'number', default: -1, attribute: 'maxlength' })).toBe(
      'maxlength',
    );
  });
});

describe('parseAttribute', () => {
  test('boolean: presence means true, even for "false"', () => {
    expect(parseAttribute(disabled, null)).toBe(false);
    expect(parseAttribute(disabled, '')).toBe(true);
    expect(parseAttribute(disabled, 'false')).toBe(true);
  });

  test('number: invalid, empty or non-finite input falls back to the default', () => {
    expect(parseAttribute(max, '42')).toBe(42);
    expect(parseAttribute(max, ' ')).toBe(100);
    expect(parseAttribute(max, 'abc')).toBe(100);
    expect(parseAttribute(max, 'Infinity')).toBe(100);
    expect(parseAttribute(max, null)).toBe(100);
  });

  test('string with values: anything outside the list falls back to the default', () => {
    expect(parseAttribute(size, 'lg')).toBe('lg');
    expect(parseAttribute(size, 'huge')).toBe('md');
    expect(parseAttribute(size, 'LG')).toBe('md');
    expect(parseAttribute(size, null)).toBe('md');
  });

  test('string without a default falls back to the empty string', () => {
    expect(parseAttribute(label, null)).toBe('');
    expect(parseAttribute(label, 'Name')).toBe('Name');
  });
});

describe('coerceProperty', () => {
  test('boolean uses truthiness', () => {
    expect(coerceProperty(disabled, 1)).toBe(true);
    expect(coerceProperty(disabled, '')).toBe(false);
    expect(coerceProperty(disabled, undefined)).toBe(false);
  });

  test('number accepts numbers and numeric strings', () => {
    expect(coerceProperty(max, 7)).toBe(7);
    expect(coerceProperty(max, '8')).toBe(8);
    expect(coerceProperty(max, Number.NaN)).toBe(100);
    expect(coerceProperty(max, null)).toBe(100);
  });

  test('string validates against values and maps nullish to the default', () => {
    expect(coerceProperty(size, 'sm')).toBe('sm');
    expect(coerceProperty(size, 'xl')).toBe('md');
    expect(coerceProperty(size, undefined)).toBe('md');
    expect(coerceProperty(label, 5)).toBe('5');
  });
});

describe('serializeAttribute', () => {
  test('boolean false and the empty string mean "remove the attribute"', () => {
    expect(serializeAttribute(disabled, true)).toBe('');
    expect(serializeAttribute(disabled, false)).toBeNull();
    expect(serializeAttribute(label, '')).toBeNull();
  });

  test('numbers and strings are stringified', () => {
    expect(serializeAttribute(max, 3)).toBe('3');
    expect(serializeAttribute(size, 'lg')).toBe('lg');
  });
});

describe('parseProps', () => {
  test('reads every declared prop through its attribute name', () => {
    const schema = { size, helpText: label, max, disabled } as const;
    const attrs: Record<string, string> = { size: 'sm', 'help-text': 'Hi', disabled: '' };
    const props = parseProps(schema, (name) => attrs[name] ?? null);
    expect(props).toEqual({ size: 'sm', helpText: 'Hi', max: 100, disabled: true });
    expectTypeOf(props).toEqualTypeOf<{
      size: 'sm' | 'md' | 'lg';
      helpText: string;
      max: number;
      disabled: boolean;
    }>();
  });
});
```

`packages/elements/src/core/define.test.ts`:
```ts
import { expect, expectTypeOf, test } from 'vitest';
import { defineComponent } from './define.js';
import { html } from './html.js';
import type { InferProps } from './props.js';

test('defineComponent returns the definition unchanged and infers literal prop types', () => {
  const def = defineComponent({
    tag: 'neu-demo',
    props: {
      size: { type: 'string', default: 'md', values: ['sm', 'md'] },
      on: { type: 'boolean' },
    },
    styles: '',
    template: (p) => html`<b>${p.size}</b>`,
    docs: { summary: 'Demo', events: [], slots: [], parts: [], cssProperties: [] },
  });
  expect(def.tag).toBe('neu-demo');
  expect(def.template({ size: 'sm', on: false }).value).toBe('<b>sm</b>');
  expectTypeOf<InferProps<typeof def.props>>().toEqualTypeOf<{ size: 'sm' | 'md'; on: boolean }>();
});
```

- [ ] **Step 2: Chạy để xác nhận thất bại**

Run: `BROWSERS=chromium pnpm --filter @neu-ui/elements test`
Expected: FAIL — không resolve được `./props.js` và `./define.js`.

- [ ] **Step 3: Cài đặt `props.ts` và `define.ts`**

`packages/elements/src/core/props.ts`:
```ts
export type PropDecl =
  | { readonly type: 'boolean'; readonly reflect?: boolean; readonly attribute?: string }
  | {
      readonly type: 'number';
      readonly default: number;
      readonly reflect?: boolean;
      readonly attribute?: string;
    }
  | {
      readonly type: 'string';
      readonly default?: string;
      readonly values?: readonly string[];
      readonly reflect?: boolean;
      readonly attribute?: string;
    };

export type PropsSchema = Readonly<Record<string, PropDecl>>;
export type PropValue = string | number | boolean;

type InferProp<D> = D extends { type: 'boolean' }
  ? boolean
  : D extends { type: 'number' }
    ? number
    : D extends { values: readonly (infer V extends string)[] }
      ? V
      : string;

export type InferProps<S extends PropsSchema> = { -readonly [K in keyof S]: InferProp<S[K]> };

/** `helpText` → `help-text`, unless the declaration names the attribute explicitly. */
export function attributeName(prop: string, decl: PropDecl): string {
  return decl.attribute ?? prop.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

/** Attribute text (null when absent) → prop value. Invalid input silently becomes the default. */
export function parseAttribute(decl: PropDecl, raw: string | null): PropValue {
  switch (decl.type) {
    case 'boolean':
      return raw !== null;
    case 'number': {
      if (raw === null || raw.trim() === '') return decl.default;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : decl.default;
    }
    case 'string': {
      const fallback = decl.default ?? '';
      if (raw === null) return fallback;
      if (decl.values && !decl.values.includes(raw)) return fallback;
      return raw;
    }
  }
}

/** Value assigned through a JS property → prop value, with the same fallback rules. */
export function coerceProperty(decl: PropDecl, value: unknown): PropValue {
  if (decl.type === 'boolean') return Boolean(value);
  if (decl.type === 'number' && typeof value === 'number') {
    return Number.isFinite(value) ? value : decl.default;
  }
  return parseAttribute(decl, value === null || value === undefined ? null : String(value));
}

/** Prop value → attribute text for reflection and SSR; null means "remove the attribute". */
export function serializeAttribute(decl: PropDecl, value: PropValue): string | null {
  switch (decl.type) {
    case 'boolean':
      return value ? '' : null;
    case 'number':
      return String(value);
    case 'string':
      return value === '' ? null : String(value);
  }
}

export function parseProps<S extends PropsSchema>(
  schema: S,
  read: (attribute: string) => string | null,
): InferProps<S> {
  const props: Record<string, PropValue> = {};
  for (const [key, decl] of Object.entries(schema)) {
    props[key] = parseAttribute(decl, read(attributeName(key, decl)));
  }
  return props as InferProps<S>;
}
```

`packages/elements/src/core/define.ts`:
```ts
import type { RawHtml } from './html.js';
import type { InferProps, PropsSchema } from './props.js';

export interface DocEntry {
  readonly name: string;
  readonly description: string;
}

export interface ComponentDocs {
  readonly summary: string;
  readonly events: readonly DocEntry[];
  readonly slots: readonly DocEntry[];
  readonly parts: readonly DocEntry[];
  readonly cssProperties: readonly DocEntry[];
}

export interface FormDef {
  /** The prop whose attribute holds the default value (spec §6.1). */
  readonly valueProp: 'value' | 'checked';
}

/** The DOM-free half of a component, shared by the element, SSR, React wrappers and docs. */
export interface ComponentDef<S extends PropsSchema = PropsSchema> {
  readonly tag: string;
  readonly props: S;
  readonly styles: string;
  template(props: InferProps<S>): RawHtml;
  readonly delegatesFocus?: boolean;
  readonly form?: FormDef;
  readonly docs: ComponentDocs;
}

export function defineComponent<const S extends PropsSchema>(def: ComponentDef<S>): ComponentDef<S> {
  return def;
}
```

- [ ] **Step 4: Chạy test và typecheck**

Run: `pnpm --filter @neu-ui/elements test && pnpm --filter @neu-ui/elements typecheck`
Expected: PASS trên cả 3 engine. Typecheck không báo lỗi; `expectTypeOf` chỉ được kiểm ở bước typecheck.

- [ ] **Step 5: Commit**

```bash
pnpm format && pnpm lint
git add packages/elements/src/core
git commit -m "feat(elements): add prop declarations and defineComponent"
```

---
### Task 3: `@neu-ui/tokens`

**Files:**
- Create: `packages/tokens/package.json`, `packages/tokens/tsconfig.json`, `packages/tokens/vitest.config.ts`, `packages/tokens/scripts/build.mjs`, `packages/tokens/src/neu.css`
- Test: `packages/tokens/test/tokens.test.ts`, `packages/tokens/test/env.d.ts`

**Interfaces:**
- Consumes: `browserTest` (Task 1).
- Produces (CSS, xem spec §5):
  - Biến đầu vào công khai: `--neu-bg`, `--neu-accent`, `--neu-distance`, `--neu-intensity`, `--neu-radius`, `--neu-success`, `--neu-warning`, `--neu-danger`, `--neu-duration`.
  - Biến ghi đè tùy chọn, tokens **không** đặt: `--neu-fg`, `--neu-fg-muted`, `--neu-shadow-dark`, `--neu-shadow-light`.
  - Hằng số theo theme: `--_neu-shade`, `--_neu-light`, `--_neu-ink`.
  - Dẫn xuất (khai báo lại ở `:root`, `[data-neu-theme]`, `.neu-surface`): `--_neu-sd`, `--_neu-sl`, `--_neu-fg`, `--_neu-fg-muted`, `--_neu-accent-soft`, `--_neu-focus`, `--neu-shadow-raised-sm|md|lg`, `--neu-shadow-inset-sm|md|lg`.
  - Class: `.neu-surface`, `.neu-raised`, `.neu-inset`, `.neu-flat`, `.neu-convex`, `.neu-concave`.
  - File build: `packages/tokens/neu.css` (minified); export `@neu-ui/tokens/neu.css`.

- [ ] **Step 1: Tạo package**

`packages/tokens/package.json`:
```json
{
  "name": "@neu-ui/tokens",
  "version": "0.0.0",
  "description": "Theme tokens for neumorphism-ui",
  "license": "MIT",
  "type": "module",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/hunghdvn/neumorphism-ui.git",
    "directory": "packages/tokens"
  },
  "files": ["neu.css", "src/neu.css"],
  "style": "neu.css",
  "exports": {
    "./neu.css": "./neu.css",
    "./src/neu.css": "./src/neu.css",
    "./package.json": "./package.json"
  },
  "sideEffects": ["*.css"],
  "scripts": {
    "build": "node scripts/build.mjs",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "esbuild": "0.28.2"
  }
}
```

`packages/tokens/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "types": []
  },
  "include": ["test"]
}
```

`packages/tokens/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import { browserTest } from '../../vitest.shared.ts';

export default defineConfig({ test: browserTest({ include: ['test/**/*.test.ts'] }) });
```

`packages/tokens/scripts/build.mjs`:
```js
import { build } from 'esbuild';

await build({
  entryPoints: ['src/neu.css'],
  outfile: 'neu.css',
  minify: true,
  logLevel: 'info',
});
```

`packages/tokens/test/env.d.ts`:
```ts
declare module '*.css?inline' {
  const css: string;
  export default css;
}
```

Run: `pnpm install`

- [ ] **Step 2: Viết test thất bại**

`packages/tokens/test/tokens.test.ts`:
```ts
import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import css from '../src/neu.css?inline';

beforeAll(() => {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-neu-theme');
  document.querySelectorAll('style[data-test-user]').forEach((style) => style.remove());
});

function prop(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

function mount(markup: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  return host;
}

describe('themes (§5.5)', () => {
  test('light values apply when the theme is forced to light', () => {
    document.documentElement.setAttribute('data-neu-theme', 'light');
    expect(prop(document.documentElement, '--neu-bg')).toBe('#e0e5ec');
    expect(getComputedStyle(document.documentElement).colorScheme).toBe('light');
  });

  test('data-neu-theme="dark" switches the defaults on any subtree', () => {
    document.documentElement.setAttribute('data-neu-theme', 'light');
    const section = mount('<section data-neu-theme="dark">x</section>').querySelector('section')!;
    expect(prop(section, '--neu-bg')).toBe('#2b2f36');
    expect(getComputedStyle(section).colorScheme).toBe('dark');
    expect(getComputedStyle(section).backgroundColor).toBe('rgb(43, 47, 54)');
  });
});

describe('derived values (§5.2, §5.3)', () => {
  test('shadows are recomputed inside .neu-surface with a different background', () => {
    document.documentElement.setAttribute('data-neu-theme', 'light');
    const host = mount(
      '<div class="neu-raised" id="a">a</div>' +
        '<div class="neu-surface" style="--neu-bg: #f5d0d8"><div class="neu-raised" id="b">b</div></div>',
    );
    const a = getComputedStyle(host.querySelector('#a')!).boxShadow;
    const b = getComputedStyle(host.querySelector('#b')!).boxShadow;
    expect(a).not.toBe('none');
    expect(b).not.toBe('none');
    expect(b).not.toBe(a);
  });

  test('--neu-intensity scales the dark shadow and is clamped at 100%', () => {
    const host = mount(
      '<div class="neu-surface" style="--neu-intensity: 50"><i style="display:block;background-color: var(--_neu-sd)"></i></div>',
    );
    expect(getComputedStyle(host.querySelector('i')!).backgroundColor).toBe('oklab(0 0 0)');
  });

  test('optional overrides win over derived values', () => {
    const host = mount(
      '<div class="neu-surface" style="--neu-shadow-dark: rgb(255, 0, 0)"><i style="display:block;background-color: var(--_neu-sd)"></i></div>',
    );
    expect(getComputedStyle(host.querySelector('i')!).backgroundColor).toBe('rgb(255, 0, 0)');
  });
});

describe('cascade layer (§5.5)', () => {
  test('unlayered author CSS beats tokens regardless of selector specificity', () => {
    document.documentElement.setAttribute('data-neu-theme', 'dark');
    const user = document.createElement('style');
    user.dataset.testUser = '';
    user.textContent = ':root { --neu-accent: rgb(1, 2, 3); }';
    document.head.append(user);
    expect(prop(document.documentElement, '--neu-accent')).toBe('rgb(1, 2, 3)');
  });
});

describe('undefined elements (§5.6)', () => {
  test('known tags are hidden but keep their box until defined', () => {
    const el = mount('<neu-text-field label="Email"></neu-text-field>').querySelector('neu-text-field')!;
    const style = getComputedStyle(el);
    expect(style.visibility).toBe('hidden');
    expect(style.display).toBe('block');
    expect(el.getBoundingClientRect().height).toBeGreaterThan(40);
  });

  test('an element that already has a shadow root can undo the hiding with :host', () => {
    const el = mount('<neu-switch></neu-switch>').querySelector('neu-switch')!;
    el.attachShadow({ mode: 'open' }).innerHTML =
      '<style>:host(:not(:defined)) { visibility: inherit !important; }</style><span>x</span>';
    expect(getComputedStyle(el).visibility).toBe('visible');
  });
});
```

Run: `BROWSERS=chromium pnpm --filter @neu-ui/tokens test`
Expected: FAIL — không resolve được `../src/neu.css?inline`.

- [ ] **Step 3: Viết `neu.css`**

`packages/tokens/src/neu.css`:
```css
/*
 * @neu-ui/tokens: theme variables for neumorphism-ui (spec §5).
 * Everything sits in @layer neu, so unlayered author CSS always wins.
 * Optional overrides that are never set here: --neu-fg, --neu-fg-muted,
 * --neu-shadow-dark, --neu-shadow-light. Names starting with --_neu- are private.
 */
@layer neu {
  :root,
  [data-neu-theme='light'] {
    color-scheme: light;
    --neu-bg: #e0e5ec;
    --neu-accent: #6d5dfc;
    --_neu-shade: 22%;
    --_neu-light: 70%;
    --_neu-ink: black;
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-neu-theme='light']) {
      color-scheme: dark;
      --neu-bg: #2b2f36;
      --neu-accent: #8b7dff;
      --_neu-shade: 45%;
      --_neu-light: 6%;
      --_neu-ink: white;
    }
  }

  [data-neu-theme='dark'] {
    color-scheme: dark;
    --neu-bg: #2b2f36;
    --neu-accent: #8b7dff;
    --_neu-shade: 45%;
    --_neu-light: 6%;
    --_neu-ink: white;
  }

  :root {
    --neu-distance: 6px;
    --neu-intensity: 1;
    --neu-radius: 12px;
    --neu-success: #3bb273;
    --neu-warning: #e6a23c;
    --neu-danger: #e5484d;
    --neu-duration: 150ms;
  }

  @media (prefers-reduced-motion: reduce) {
    :root {
      --neu-duration: 0ms;
    }
  }

  /* §5.3: custom properties inherit computed values, so derive again wherever --neu-bg may change. */
  :root,
  [data-neu-theme],
  .neu-surface {
    --_neu-sd: var(
      --neu-shadow-dark,
      color-mix(
        in oklab,
        var(--neu-bg),
        black min(100%, calc(var(--_neu-shade) * var(--neu-intensity)))
      )
    );
    --_neu-sl: var(
      --neu-shadow-light,
      color-mix(
        in oklab,
        var(--neu-bg),
        white min(100%, calc(var(--_neu-light) * var(--neu-intensity)))
      )
    );
    --_neu-fg: var(--neu-fg, color-mix(in oklab, var(--neu-bg), var(--_neu-ink) 50%));
    --_neu-fg-muted: var(--neu-fg-muted, color-mix(in oklab, var(--neu-bg), var(--_neu-ink) 30%));
    --_neu-accent-soft: color-mix(in oklab, var(--neu-accent) 25%, var(--neu-bg));
    --_neu-focus: 0 0 0 3px color-mix(in oklab, var(--neu-accent) 45%, transparent);

    --neu-shadow-raised-sm:
      calc(var(--neu-distance) * 0.5) calc(var(--neu-distance) * 0.5) var(--neu-distance) var(--_neu-sd),
      calc(var(--neu-distance) * -0.5) calc(var(--neu-distance) * -0.5) var(--neu-distance) var(--_neu-sl);
    --neu-shadow-raised-md:
      var(--neu-distance) var(--neu-distance) calc(var(--neu-distance) * 2) var(--_neu-sd),
      calc(var(--neu-distance) * -1) calc(var(--neu-distance) * -1) calc(var(--neu-distance) * 2) var(--_neu-sl);
    --neu-shadow-raised-lg:
      calc(var(--neu-distance) * 2) calc(var(--neu-distance) * 2) calc(var(--neu-distance) * 4) var(--_neu-sd),
      calc(var(--neu-distance) * -2) calc(var(--neu-distance) * -2) calc(var(--neu-distance) * 4) var(--_neu-sl);
    --neu-shadow-inset-sm:
      inset calc(var(--neu-distance) * 0.5) calc(var(--neu-distance) * 0.5) var(--neu-distance) var(--_neu-sd),
      inset calc(var(--neu-distance) * -0.5) calc(var(--neu-distance) * -0.5) var(--neu-distance) var(--_neu-sl);
    --neu-shadow-inset-md:
      inset var(--neu-distance) var(--neu-distance) calc(var(--neu-distance) * 2) var(--_neu-sd),
      inset calc(var(--neu-distance) * -1) calc(var(--neu-distance) * -1) calc(var(--neu-distance) * 2) var(--_neu-sl);
    --neu-shadow-inset-lg:
      inset calc(var(--neu-distance) * 2) calc(var(--neu-distance) * 2) calc(var(--neu-distance) * 4) var(--_neu-sd),
      inset calc(var(--neu-distance) * -2) calc(var(--neu-distance) * -2) calc(var(--neu-distance) * 4) var(--_neu-sl);

    background-color: var(--neu-bg);
    color: var(--_neu-fg);
  }

  .neu-raised,
  .neu-inset,
  .neu-flat,
  .neu-convex,
  .neu-concave {
    background-color: var(--neu-bg);
    border-radius: var(--neu-radius);
  }
  .neu-raised {
    box-shadow: var(--neu-shadow-raised-md);
  }
  .neu-inset {
    box-shadow: var(--neu-shadow-inset-md);
  }
  .neu-flat {
    box-shadow: none;
  }
  .neu-convex {
    box-shadow: var(--neu-shadow-raised-md);
    background-image: linear-gradient(
      145deg,
      color-mix(in oklab, var(--neu-bg), white 8%),
      color-mix(in oklab, var(--neu-bg), black 6%)
    );
  }
  .neu-concave {
    box-shadow: var(--neu-shadow-raised-md);
    background-image: linear-gradient(
      145deg,
      color-mix(in oklab, var(--neu-bg), black 6%),
      color-mix(in oklab, var(--neu-bg), white 8%)
    );
  }

  /* §5.6: hide until registered, but keep the final box. Components undo this from :host. */
  neu-button:not(:defined),
  neu-switch:not(:defined),
  neu-text-field:not(:defined) {
    visibility: hidden;
  }
  neu-button:not(:defined) {
    display: inline-block;
    min-block-size: 2.5rem;
  }
  neu-switch:not(:defined) {
    display: inline-flex;
    min-block-size: 1.625rem;
  }
  neu-text-field:not(:defined) {
    display: block;
    min-block-size: 2.75rem;
  }
  neu-text-field[label]:not(:defined) {
    min-block-size: 4.125rem;
  }
}
```

- [ ] **Step 4: Chạy test, build và typecheck**

Run: `pnpm --filter @neu-ui/tokens test && pnpm --filter @neu-ui/tokens build && pnpm --filter @neu-ui/tokens typecheck`
Expected: PASS trên cả 3 engine (24 test = 8 × 3); build ghi ra `packages/tokens/neu.css`.

Nếu test `oklab(0 0 0)` fail chỉ vì cách engine in màu ra chuỗi (ví dụ `rgb(0, 0, 0)`): **dừng lại và báo**, không tự nới lỏng assert. Bản thử ngày 01/10/2026 cho thấy cả 3 engine đều in `oklab(0 0 0)`.

- [ ] **Step 5: Commit**

```bash
pnpm format && pnpm lint
git add packages/tokens pnpm-lock.yaml
git commit -m "feat(tokens): add theme tokens with light/dark and derived shadows"
```

---
### Task 4: Base class `NeuElement`, style dùng chung, helper DOM

**Files:**
- Create: `packages/elements/src/core/styles.ts`, `packages/elements/src/core/dom.ts`, `packages/elements/src/core/neu-element.ts`, `packages/elements/src/core/env.d.ts`
- Test: `packages/elements/src/core/styles.test.ts`, `packages/elements/src/core/neu-element.test.ts`

**Interfaces:**
- Consumes: `ComponentDef`, `defineComponent`, `DocEntry` (Task 2); `attributeName`, `coerceProperty`, `parseAttribute`, `parseProps`, `serializeAttribute`, `PropValue` (Task 2); `html` (Task 1); file `packages/tokens/src/neu.css` (Task 3).
- Produces:
  - `hostTheme: string`: CSS khai báo lại biến dẫn xuất trong `:host` (§5.3), kèm giá trị dự phòng để component vẫn chạy khi chưa nạp tokens. Biến dùng trong component: `--_neu-bg`, `--_neu-accent-c`, `--_neu-d`, `--_neu-r`, `--_neu-sd`, `--_neu-sl`, `--_neu-fg`, `--_neu-fg-muted`, `--_neu-accent-soft`, `--_neu-focus`, `--_neu-danger`, `--_neu-raised`, `--_neu-raised-sm`, `--_neu-inset`, `--_neu-inset-sm`, `--_neu-dur`.
  - `themeCssProperties: readonly DocEntry[]`
  - `setText(el, text)`, `setOptionalAttribute(el, name, value)`, `dispatch(target, type)`
  - `abstract class NeuElement extends HTMLElement`:
    - static: `def: ComponentDef` (subclass đặt bằng `static override def = …`), `extraProperties: readonly string[]`, `observedAttributes`, `define(): void`.
    - protected: `internals: ElementInternals`, `props: Record<string, PropValue>`, `isDisabled: boolean`, `ref<T>(name): T | null`, `setProp(key, value, fromAttribute?)`, `toggleState(name, on)`, `syncFocusable(focusable)`.
    - Hook (protected, mặc định không làm gì): `willUpdate(changed)` luôn chạy khi prop đổi; `update(changed)` chỉ chạy sau lần connect đầu tiên; `rendered()` chạy một lần sau khi có shadow root; `connected()`; `disconnected()`.
    - Lifecycle callback công khai: `connectedCallback`, `disconnectedCallback`, `attributeChangedCallback`, `formDisabledCallback(disabled)`.
  - Thứ tự ở lần connect đầu tiên: nâng cấp property → `update(tất cả)` → tạo hoặc nhận lại shadow root → `rendered()` → `update(tất cả)`.

**Lưu ý cho người cài đặt:** constructor của base **không được** gọi hook của subclass. Lúc constructor của base chạy, field của subclass chưa được khởi tạo. Mọi hook đều chạy từ `connectedCallback` trở đi.

- [ ] **Step 1: Viết test thất bại**

`packages/elements/src/core/env.d.ts`:
```ts
declare module '*.css?inline' {
  const css: string;
  export default css;
}
```

`packages/elements/src/core/styles.test.ts`:
```ts
import { expect, test } from 'vitest';
import tokens from '../../../tokens/src/neu.css?inline';
import { hostTheme } from './styles.js';

/** Standalone fallbacks in components must equal the light defaults shipped in tokens. */
test.each([
  '--neu-bg',
  '--neu-accent',
  '--neu-distance',
  '--neu-intensity',
  '--neu-radius',
  '--neu-danger',
  '--neu-duration',
  '--_neu-shade',
  '--_neu-light',
  '--_neu-ink',
])('hostTheme fallback for %s matches the tokens default', (name) => {
  const tokenValue = new RegExp(`${name}:\\s*([^;]+);`).exec(tokens)?.[1]?.trim();
  const fallback = new RegExp(`var\\(${name},\\s*([^)]+)\\)`).exec(hostTheme)?.[1]?.trim();
  expect(tokenValue).toBeDefined();
  expect(fallback).toBe(tokenValue);
});
```

`packages/elements/src/core/neu-element.test.ts`:
```ts
import { afterEach, describe, expect, test } from 'vitest';
import { defineComponent } from './define.js';
import { setText } from './dom.js';
import { html } from './html.js';
import { NeuElement } from './neu-element.js';

const docs = { summary: '', events: [], slots: [], parts: [], cssProperties: [] };

const probeDef = defineComponent({
  tag: 'neu-probe',
  props: {
    label: { type: 'string', default: 'hi' },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'], reflect: true },
    disabled: { type: 'boolean', reflect: true },
    count: { type: 'number', default: 1 },
  },
  styles: ':host { display: block; }',
  template: (p) => html`<span data-ref="label" part="label">${p.label}</span>`,
  docs,
});

class NeuProbe extends NeuElement {
  static override def = probeDef;
  declare label: string;
  declare size: 'sm' | 'md' | 'lg';
  declare disabled: boolean;
  declare count: number;
  renders = 0;
  connects = 0;
  readonly updates: string[][] = [];

  protected override rendered(): void {
    this.renders++;
  }
  protected override connected(): void {
    this.connects++;
  }
  protected override update(changed: ReadonlySet<string>): void {
    this.updates.push([...changed].sort());
    setText(this.ref('label'), String(this.props.label));
  }
}
NeuProbe.define();

function mount<T extends Element>(markup: string): T {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  return host.firstElementChild as T;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('rendering', () => {
  test('renders the template into an open shadow root with one shared sheet', () => {
    const el = mount<NeuProbe>('<neu-probe label="Hello"></neu-probe>');
    const other = mount<NeuProbe>('<neu-probe></neu-probe>');
    expect(el.shadowRoot?.querySelector('[part=label]')?.textContent).toBe('Hello');
    expect(el.shadowRoot?.adoptedStyleSheets).toHaveLength(1);
    expect(other.shadowRoot?.adoptedStyleSheets[0]).toBe(el.shadowRoot?.adoptedStyleSheets[0]);
  });

  test('works when attributes arrive after construction', () => {
    const el = document.createElement('neu-probe') as NeuProbe;
    el.setAttribute('label', 'Late');
    document.body.append(el);
    expect(el.shadowRoot?.querySelector('[part=label]')?.textContent).toBe('Late');
  });
});

describe('attributes and properties', () => {
  test('attributes parse into typed properties', () => {
    const el = mount<NeuProbe>('<neu-probe size="lg" disabled count="5"></neu-probe>');
    expect([el.size, el.disabled, el.count]).toEqual(['lg', true, 5]);
  });

  test('only reflect: true props write back to attributes', () => {
    const el = mount<NeuProbe>('<neu-probe></neu-probe>');
    el.size = 'sm';
    el.disabled = true;
    el.label = 'x';
    expect(el.getAttribute('size')).toBe('sm');
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(el.hasAttribute('label')).toBe(false);
    el.disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
  });

  test('invalid values fall back to defaults silently', () => {
    const el = mount<NeuProbe>('<neu-probe size="huge" count="abc"></neu-probe>');
    expect([el.size, el.count]).toEqual(['md', 1]);
    el.size = 'xl' as never;
    expect(el.size).toBe('md');
  });

  test('removing an attribute restores the default', () => {
    const el = mount<NeuProbe>('<neu-probe size="lg" label="A"></neu-probe>');
    el.removeAttribute('size');
    el.removeAttribute('label');
    expect(el.size).toBe('md');
    expect(el.shadowRoot?.querySelector('[part=label]')?.textContent).toBe('hi');
  });

  test('setting an unchanged value does not run update', () => {
    const el = mount<NeuProbe>('<neu-probe label="A"></neu-probe>');
    const before = el.updates.length;
    el.label = 'A';
    el.setAttribute('label', 'A');
    expect(el.updates.length).toBe(before);
    el.label = 'B';
    expect(el.updates.at(-1)).toEqual(['label']);
  });
});

describe('lifecycle', () => {
  test('re-connecting does not re-render', () => {
    const el = mount<NeuProbe>('<neu-probe></neu-probe>');
    const span = el.shadowRoot!.querySelector('span');
    const parent = el.parentElement!;
    el.remove();
    parent.append(el);
    expect(el.renders).toBe(1);
    expect(el.connects).toBe(2);
    expect(el.shadowRoot!.querySelector('span')).toBe(span);
  });

  test('properties set before the element is defined are applied after upgrade', async () => {
    const tag = 'neu-probe-late';
    const el = document.createElement(tag) as HTMLElement & { label?: string };
    el.label = 'Early';
    document.body.append(el);
    class NeuProbeLate extends NeuProbe {
      static override def = { ...probeDef, tag };
    }
    NeuProbeLate.define();
    await customElements.whenDefined(tag);
    expect(el.shadowRoot?.querySelector('[part=label]')?.textContent).toBe('Early');
    expect(Object.prototype.hasOwnProperty.call(el, 'label')).toBe(false);
  });
});

describe('declarative shadow DOM', () => {
  test('adopts an existing shadow root without re-rendering', () => {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.setHTMLUnsafe(
      '<neu-probe label="SSR"><template shadowrootmode="open"><style data-neu-ssr>:host{}</style>' +
        '<span data-ref="label" part="label">SSR</span></template></neu-probe>',
    );
    const el = doc.body.firstElementChild as NeuProbe;
    const span = el.shadowRoot!.querySelector('span');
    document.body.append(document.adoptNode(el));
    expect(el).toBeInstanceOf(NeuProbe);
    expect(el.shadowRoot!.querySelector('span')).toBe(span);
    expect(el.shadowRoot!.querySelector('style[data-neu-ssr]')).toBeNull();
    expect(el.shadowRoot!.adoptedStyleSheets).toHaveLength(1);
    expect(el.renders).toBe(1);
  });

  test('while the document is loading it waits for a declarative root instead of creating one', () => {
    // An own property shadows Document.prototype.readyState; deleting it restores the real getter.
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
    try {
      const el = document.createElement('neu-probe') as NeuProbe;
      document.body.append(el);
      expect(el.shadowRoot).toBeNull();
      // The parser now attaches the declarative root (simulated), then the document finishes.
      const root = el.attachShadow({ mode: 'open' });
      root.innerHTML = '<span data-ref="label" part="label">from parser</span>';
      const span = root.querySelector('span');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      expect(el.renders).toBe(1);
      expect(el.shadowRoot!.querySelector('span')).toBe(span);
      expect(span!.textContent).toBe('hi');
    } finally {
      delete (document as { readyState?: unknown }).readyState;
    }
    expect(document.readyState).toBe('complete');
  });
});
```

Run: `BROWSERS=chromium pnpm --filter @neu-ui/elements test`
Expected: FAIL — không resolve được `./styles.js`, `./dom.js`, `./neu-element.js`.

- [ ] **Step 2: Cài đặt `dom.ts` và `styles.ts`**

`packages/elements/src/core/dom.ts`:
```ts
/** Writes text only when it changed, so hydrated nodes are not replaced needlessly. */
export function setText(el: Element | null, text: string): void {
  if (el && el.textContent !== text) el.textContent = text;
}

/** Sets the attribute when value is non-empty and removes it otherwise. */
export function setOptionalAttribute(el: Element | null, name: string, value: string): void {
  if (!el) return;
  if (value === '') el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

/** Dispatches a bubbling, composed event from a host (spec §6.4). */
export function dispatch(target: EventTarget, type: string): void {
  target.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
}
```

`packages/elements/src/core/styles.ts`:
```ts
import type { DocEntry } from './define.js';

/**
 * Re-declares the derived theme values on every host (spec §5.3). Fallbacks are the light
 * defaults from @neu-ui/tokens so components still look right without the tokens stylesheet;
 * styles.test.ts keeps the two in sync.
 */
export const hostTheme = `
:host {
  --_neu-bg: var(--neu-bg, #e0e5ec);
  --_neu-accent-c: var(--neu-accent, #6d5dfc);
  --_neu-d: var(--neu-distance, 6px);
  --_neu-k: var(--neu-intensity, 1);
  --_neu-r: var(--neu-radius, 12px);
  --_neu-danger: var(--neu-danger, #e5484d);
  --_neu-dur: var(--neu-duration, 150ms);
  --_neu-sd: var(--neu-shadow-dark, color-mix(in oklab, var(--_neu-bg), black min(100%, calc(var(--_neu-shade, 22%) * var(--_neu-k)))));
  --_neu-sl: var(--neu-shadow-light, color-mix(in oklab, var(--_neu-bg), white min(100%, calc(var(--_neu-light, 70%) * var(--_neu-k)))));
  --_neu-fg: var(--neu-fg, color-mix(in oklab, var(--_neu-bg), var(--_neu-ink, black) 50%));
  --_neu-fg-muted: var(--neu-fg-muted, color-mix(in oklab, var(--_neu-bg), var(--_neu-ink, black) 30%));
  --_neu-accent-soft: color-mix(in oklab, var(--_neu-accent-c) 25%, var(--_neu-bg));
  --_neu-focus: 0 0 0 3px color-mix(in oklab, var(--_neu-accent-c) 45%, transparent);
  --_neu-raised: var(--_neu-d) var(--_neu-d) calc(var(--_neu-d) * 2) var(--_neu-sd), calc(var(--_neu-d) * -1) calc(var(--_neu-d) * -1) calc(var(--_neu-d) * 2) var(--_neu-sl);
  --_neu-raised-sm: calc(var(--_neu-d) * 0.5) calc(var(--_neu-d) * 0.5) var(--_neu-d) var(--_neu-sd), calc(var(--_neu-d) * -0.5) calc(var(--_neu-d) * -0.5) var(--_neu-d) var(--_neu-sl);
  --_neu-inset: inset var(--_neu-d) var(--_neu-d) calc(var(--_neu-d) * 2) var(--_neu-sd), inset calc(var(--_neu-d) * -1) calc(var(--_neu-d) * -1) calc(var(--_neu-d) * 2) var(--_neu-sl);
  --_neu-inset-sm: inset calc(var(--_neu-d) * 0.5) calc(var(--_neu-d) * 0.5) var(--_neu-d) var(--_neu-sd), inset calc(var(--_neu-d) * -0.5) calc(var(--_neu-d) * -0.5) var(--_neu-d) var(--_neu-sl);
  font-family: var(--neu-font);
  color: var(--_neu-fg);
  -webkit-tap-highlight-color: transparent;
}
:host(:not(:defined)) { visibility: inherit !important; }
:host([hidden]) { display: none !important; }
:host(:focus) { outline: none; }
*, *::before, *::after { box-sizing: border-box; }
`;

export const themeCssProperties: readonly DocEntry[] = [
  { name: '--neu-bg', description: 'Surface colour; shadows and text are derived from it.' },
  { name: '--neu-accent', description: 'Accent colour.' },
  { name: '--neu-distance', description: 'Shadow distance for the md size.' },
  { name: '--neu-intensity', description: 'Shadow strength multiplier.' },
  { name: '--neu-radius', description: 'Corner radius for the md size.' },
];
```

Lưu ý về `--neu-duration`: test đồng bộ đọc giá trị đầu tiên của `--neu-duration:` trong tokens, tức `150ms`. Khối `prefers-reduced-motion` nằm sau đó.

- [ ] **Step 3: Cài đặt `neu-element.ts`**

`packages/elements/src/core/neu-element.ts`:
```ts
import type { ComponentDef } from './define.js';
import {
  attributeName,
  coerceProperty,
  parseAttribute,
  parseProps,
  serializeAttribute,
  type PropDecl,
  type PropValue,
} from './props.js';

/**
 * HTMLElement does not exist in Node (SSR, React server rendering). Falling back to an empty
 * class lets every module be imported there; nothing is ever constructed on the server.
 */
const ServerSafeHTMLElement: typeof HTMLElement =
  (globalThis.HTMLElement as typeof HTMLElement | undefined) ??
  (class {} as unknown as typeof HTMLElement);

const sheets = new WeakMap<ComponentDef, CSSStyleSheet>();

function sheetFor(def: ComponentDef): CSSStyleSheet {
  let sheet = sheets.get(def);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(def.styles);
    sheets.set(def, sheet);
  }
  return sheet;
}

export abstract class NeuElement extends ServerSafeHTMLElement {
  declare static def: ComponentDef;
  /** Own properties to re-apply after upgrade besides def.props (spec §6.2 step 3). */
  static extraProperties: readonly string[] = [];

  static get observedAttributes(): string[] {
    return Object.entries(this.def.props).map(([key, decl]) => attributeName(key, decl));
  }

  /** Installs accessors for def.props and registers the tag. Safe to call in Node. */
  static define(): void {
    const def = this.def;
    for (const [key, decl] of Object.entries(def.props)) {
      if (Object.prototype.hasOwnProperty.call(this.prototype, key)) continue;
      Object.defineProperty(this.prototype, key, {
        configurable: true,
        enumerable: true,
        get(this: NeuElement) {
          return this.props[key];
        },
        set(this: NeuElement, value: unknown) {
          this.setProp(key, coerceProperty(decl, value));
        },
      });
    }
    const registry = globalThis.customElements as CustomElementRegistry | undefined;
    if (registry && !registry.get(def.tag)) {
      registry.define(def.tag, this as unknown as CustomElementConstructor);
    }
  }

  protected readonly internals: ElementInternals;
  protected readonly props: Record<string, PropValue>;
  private root: ShadowRoot | null = null;
  private readonly refs = new Map<string, Element>();
  private reflecting = false;
  private hasConnected = false;
  private formDisabled = false;

  constructor() {
    super();
    this.internals = this.attachInternals();
    this.props = parseProps(this.def.props, (name) => this.getAttribute(name));
    // Disabled controls emit no events at all, including the native click (spec §6.4).
    this.addEventListener(
      'click',
      (event) => {
        if (!this.isDisabled) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      { capture: true },
    );
  }

  connectedCallback(): void {
    if (!this.hasConnected) {
      this.hasConnected = true;
      this.upgradeProperties();
      this.update(this.allKeys());
      this.ensureRoot();
    }
    this.connected();
  }

  disconnectedCallback(): void {
    this.disconnected();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (this.reflecting) return;
    for (const [key, decl] of Object.entries(this.def.props)) {
      if (attributeName(key, decl) === name) {
        this.setProp(key, parseAttribute(decl, value), true);
        return;
      }
    }
  }

  /** Called by the browser for form-associated subclasses inside a disabled fieldset. */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    if (this.hasConnected) this.update(new Set(['disabled']));
  }

  protected get def(): ComponentDef {
    return (this.constructor as typeof NeuElement).def;
  }

  protected get isDisabled(): boolean {
    return this.props.disabled === true || this.formDisabled;
  }

  /** Element marked data-ref="name" in the shadow root, or null before the root exists. */
  protected ref<T extends Element = HTMLElement>(name: string): T | null {
    if (!this.root) return null;
    let el = this.refs.get(name);
    if (!el) {
      const found = this.root.querySelector(`[data-ref="${name}"]`);
      if (!found) return null;
      this.refs.set(name, found);
      el = found;
    }
    return el as T;
  }

  protected setProp(key: string, value: PropValue, fromAttribute = false): void {
    const decl = this.def.props[key];
    if (!decl || Object.is(this.props[key], value)) return;
    this.props[key] = value;
    if (!fromAttribute && decl.reflect) this.reflect(key, decl, value);
    const changed = new Set([key]);
    this.willUpdate(changed);
    if (this.hasConnected) this.update(changed);
  }

  protected toggleState(name: string, on: boolean): void {
    if (on) this.internals.states.add(name);
    else this.internals.states.delete(name);
  }

  protected syncFocusable(focusable: boolean): void {
    if (!focusable) this.removeAttribute('tabindex');
    else if (this.getAttribute('tabindex') !== '0') this.setAttribute('tabindex', '0');
  }

  /** Runs on every prop change, connected or not. Keep it free of DOM work. */
  protected willUpdate(_changed: ReadonlySet<string>): void {}
  /** Patches host state and shadow DOM for the changed props. Must be idempotent. */
  protected update(_changed: ReadonlySet<string>): void {}
  /** Runs once, after the shadow root exists (rendered or adopted from SSR). */
  protected rendered(): void {}
  protected connected(): void {}
  protected disconnected(): void {}

  private allKeys(): Set<string> {
    return new Set(Object.keys(this.def.props));
  }

  private reflect(key: string, decl: PropDecl, value: PropValue): void {
    const attribute = serializeAttribute(decl, value);
    const name = attributeName(key, decl);
    this.reflecting = true;
    try {
      if (attribute === null) this.removeAttribute(name);
      else this.setAttribute(name, attribute);
    } finally {
      this.reflecting = false;
    }
  }

  private upgradeProperties(): void {
    const ctor = this.constructor as typeof NeuElement;
    const self = this as unknown as Record<string, unknown>;
    for (const key of [...Object.keys(ctor.def.props), ...ctor.extraProperties]) {
      if (!Object.prototype.hasOwnProperty.call(this, key)) continue;
      const value = self[key];
      delete self[key];
      self[key] = value;
    }
  }

  private ensureRoot(): void {
    if (this.root) return;
    const existing = this.internals.shadowRoot;
    if (existing) {
      this.adoptRoot(existing);
      return;
    }
    if (document.readyState === 'loading') {
      // The parser may not have reached this element's declarative shadow root yet (spec §8.1).
      document.addEventListener('DOMContentLoaded', () => this.ensureRoot(), { once: true });
      return;
    }
    const root = this.attachShadow({ mode: 'open', delegatesFocus: this.def.delegatesFocus ?? false });
    root.innerHTML = this.def.template(this.props).value;
    this.adoptRoot(root);
  }

  private adoptRoot(root: ShadowRoot): void {
    this.root = root;
    root.adoptedStyleSheets = [sheetFor(this.def)];
    root.querySelector('style[data-neu-ssr]')?.remove();
    this.rendered();
    this.update(this.allKeys());
  }
}
```

- [ ] **Step 4: Chạy test**

Run: `pnpm --filter @neu-ui/elements test && pnpm --filter @neu-ui/elements typecheck`
Expected: PASS trên cả 3 engine.

Nếu test "while the document is loading" fail trên một engine vì không ghi đè được `document.readyState`: **dừng lại và báo**. Không xóa test. Đây là đường đi của Review Focus #1.

- [ ] **Step 5: Commit**

```bash
pnpm format && pnpm lint
git add packages/elements/src/core
git commit -m "feat(elements): add NeuElement base class with SSR adoption"
```

---
### Task 5: `FormControlElement` (mixin form, spec §6.6)

**Files:**
- Create: `packages/elements/src/core/form-control.ts`
- Test: `packages/elements/src/core/form-control.test.ts`

**Interfaces:**
- Consumes: `NeuElement` và các hook của nó (Task 4); `defineComponent` (Task 2); `html` (Task 1).
- Produces:
  ```ts
  abstract class FormControlElement extends NeuElement {
    static formAssociated: true;
    get form(): HTMLFormElement | null;
    get validity(): ValidityState;
    get validationMessage(): string;
    get willValidate(): boolean;
    checkValidity(): boolean;              // does NOT reveal user-invalid
    reportValidity(): boolean;             // does (the browser fires `invalid`)
    formResetCallback(): void;
    formStateRestoreCallback(state: string | File | FormData | null): void;
    protected abstract formValue(): string | null;   // null = no entry in FormData
    protected formState(): string;                   // default: formValue() ?? ''
    protected abstract validate(): void;             // must call internals.setValidity
    protected abstract resetToDefault(): void;
    protected abstract restoreState(state: string): void;
    protected commit(): void;                        // setFormValue + validate + sync user-invalid
    protected markInteracted(): void;                // the user committed an edit
  }
  function implicitSubmit(form: HTMLFormElement | null): void
  ```
  - Custom state `user-invalid` = đã tương tác **và** không hợp lệ. "Đã tương tác" được bật khi gọi `markInteracted()`, hoặc khi trình duyệt bắn event `invalid` (lúc thử submit, hoặc lúc gọi `reportValidity()`). Reset form thì tắt cờ này.

- [ ] **Step 1: Viết test thất bại**

`packages/elements/src/core/form-control.test.ts`:
```ts
import { afterEach, expect, test } from 'vitest';
import { defineComponent } from './define.js';
import { FormControlElement, implicitSubmit } from './form-control.js';
import { html } from './html.js';

const fieldDef = defineComponent({
  tag: 'neu-probe-field',
  props: {
    value: { type: 'string' },
    name: { type: 'string', reflect: true },
    required: { type: 'boolean', reflect: true },
    disabled: { type: 'boolean', reflect: true },
  },
  form: { valueProp: 'value' },
  styles: '',
  template: () => html`<span data-ref="anchor">field</span>`,
  docs: { summary: '', events: [], slots: [], parts: [], cssProperties: [] },
});

class NeuProbeField extends FormControlElement {
  static override def = fieldDef;
  private current: string;
  disabledSeen = false;

  constructor() {
    super();
    this.current = String(this.props.value);
  }

  get value(): string {
    return this.current;
  }
  set value(next: string) {
    this.current = String(next);
    this.commit();
  }

  /** Simulates the user editing the field. */
  edit(next: string): void {
    this.current = next;
    this.commit();
    this.markInteracted();
  }

  protected override willUpdate(changed: ReadonlySet<string>): void {
    if (changed.has('value')) this.current = String(this.props.value);
  }
  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('disabled')) this.disabledSeen = this.isDisabled;
    this.commit();
  }
  protected formValue(): string | null {
    return this.current === '' ? null : this.current;
  }
  protected validate(): void {
    if (this.props.required === true && this.current === '') {
      this.internals.setValidity({ valueMissing: true }, 'Required', this.ref('anchor') ?? undefined);
    } else {
      this.internals.setValidity({});
    }
  }
  protected resetToDefault(): void {
    this.current = String(this.props.value);
  }
  protected restoreState(state: string): void {
    this.current = state;
  }
}
NeuProbeField.define();

function mountForm(inner: string): HTMLFormElement {
  const form = document.createElement('form');
  form.innerHTML = inner;
  document.body.append(form);
  return form;
}

afterEach(() => {
  document.body.innerHTML = '';
});

test('contributes name/value to FormData; a null value is omitted', () => {
  const form = mountForm(
    '<neu-probe-field name="a" value="1"></neu-probe-field><neu-probe-field name="b"></neu-probe-field>',
  );
  const data = new FormData(form);
  expect(data.get('a')).toBe('1');
  expect(data.has('b')).toBe(false);
});

test('form.reset() restores the default value and clears user-invalid', () => {
  const form = mountForm('<neu-probe-field name="a" value="1" required></neu-probe-field>');
  const field = form.querySelector('neu-probe-field') as NeuProbeField;
  field.edit('');
  expect(field.matches(':state(user-invalid)')).toBe(true);
  form.reset();
  expect(field.value).toBe('1');
  expect(new FormData(form).get('a')).toBe('1');
  expect(field.matches(':state(user-invalid)')).toBe(false);
});

test('user-invalid appears only after interaction or a submit attempt', () => {
  const form = mountForm('<neu-probe-field name="a" required></neu-probe-field>');
  const field = form.querySelector('neu-probe-field') as NeuProbeField;
  expect(field.validity.valueMissing).toBe(true);
  expect(field.validationMessage).toBe('Required');
  expect(field.checkValidity()).toBe(false);
  expect(field.matches(':state(user-invalid)')).toBe(false);
  let submitted = false;
  form.addEventListener('submit', (event) => {
    submitted = true;
    event.preventDefault();
  });
  form.requestSubmit();
  expect(submitted).toBe(false);
  expect(field.matches(':state(user-invalid)')).toBe(true);
});

test('a disabled fieldset disables the control and removes it from FormData', () => {
  const form = mountForm(
    '<fieldset disabled><neu-probe-field name="a" value="1"></neu-probe-field></fieldset>',
  );
  const field = form.querySelector('neu-probe-field') as NeuProbeField;
  expect(field.disabledSeen).toBe(true);
  expect(new FormData(form).has('a')).toBe(false);
  form.querySelector('fieldset')!.disabled = false;
  expect(field.disabledSeen).toBe(false);
});

test('formStateRestoreCallback restores a saved state', () => {
  const form = mountForm('<neu-probe-field name="a" value="1"></neu-probe-field>');
  const field = form.querySelector('neu-probe-field') as NeuProbeField;
  field.formStateRestoreCallback('restored');
  expect(field.value).toBe('restored');
  expect(new FormData(form).get('a')).toBe('restored');
});

test('implicitSubmit submits only when the form has a submit button or a single control', () => {
  const single = mountForm('<neu-probe-field name="a" value="1"></neu-probe-field>');
  const multi = mountForm(
    '<neu-probe-field name="a" value="1"></neu-probe-field><neu-probe-field name="b" value="2"></neu-probe-field>',
  );
  const withButton = mountForm(
    '<neu-probe-field name="a" value="1"></neu-probe-field><neu-probe-field name="b" value="2"></neu-probe-field><button>Go</button>',
  );
  const submitted: HTMLFormElement[] = [];
  for (const form of [single, multi, withButton]) {
    form.addEventListener('submit', (event) => {
      submitted.push(form);
      event.preventDefault();
    });
  }
  implicitSubmit(single);
  implicitSubmit(multi);
  implicitSubmit(withButton);
  implicitSubmit(null);
  expect(submitted).toEqual([single, withButton]);
});
```

Run: `BROWSERS=chromium pnpm --filter @neu-ui/elements test`
Expected: FAIL — không resolve được `./form-control.js`.

- [ ] **Step 2: Cài đặt**

`packages/elements/src/core/form-control.ts`:
```ts
import { NeuElement } from './neu-element.js';

/** Base for every control that has a value (spec §6.6). */
export abstract class FormControlElement extends NeuElement {
  static formAssociated = true;
  private interacted = false;
  private checkingSilently = false;

  constructor() {
    super();
    // The browser fires `invalid` on a failed submit attempt and on reportValidity().
    this.addEventListener('invalid', () => {
      if (!this.checkingSilently) this.markInteracted();
    });
  }

  get form(): HTMLFormElement | null {
    return this.internals.form;
  }
  get validity(): ValidityState {
    return this.internals.validity;
  }
  get validationMessage(): string {
    return this.internals.validationMessage;
  }
  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  checkValidity(): boolean {
    this.checkingSilently = true;
    try {
      return this.internals.checkValidity();
    } finally {
      this.checkingSilently = false;
    }
  }

  reportValidity(): boolean {
    return this.internals.reportValidity();
  }

  formResetCallback(): void {
    this.interacted = false;
    this.resetToDefault();
    this.commit();
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string') return;
    this.restoreState(state);
    this.commit();
  }

  protected abstract formValue(): string | null;
  protected formState(): string {
    return this.formValue() ?? '';
  }
  protected abstract validate(): void;
  protected abstract resetToDefault(): void;
  protected abstract restoreState(state: string): void;

  /** Pushes the current value and validity to the form. Call after every value change. */
  protected commit(): void {
    this.internals.setFormValue(this.formValue(), this.formState());
    this.validate();
    this.syncUserInvalid();
  }

  /** The user committed an edit, so validation errors may now be shown. */
  protected markInteracted(): void {
    this.interacted = true;
    this.syncUserInvalid();
  }

  private syncUserInvalid(): void {
    this.toggleState('user-invalid', this.interacted && !this.internals.validity.valid);
  }
}

const SUBMITTERS =
  'button:not([type]), button[type="submit"], input[type="submit"], input[type="image"], neu-button[type="submit"]';

/** Enter in a text control submits like a native input: needs a submit button or a lone control. */
export function implicitSubmit(form: HTMLFormElement | null): void {
  if (!form) return;
  if (form.querySelector(SUBMITTERS) !== null || form.elements.length === 1) form.requestSubmit();
}
```

- [ ] **Step 3: Chạy test**

Run: `pnpm --filter @neu-ui/elements test && pnpm --filter @neu-ui/elements typecheck`
Expected: PASS trên cả 3 engine.

- [ ] **Step 4: Commit**

```bash
pnpm format && pnpm lint
git add packages/elements/src/core
git commit -m "feat(elements): add form-associated control base"
```

---
### Task 6: `<neu-button>`

**Files:**
- Create: `packages/elements/src/components/button/button.def.ts`, `button.styles.ts`, `button.ts`
- Create: `packages/elements/src/button.ts` (entry: đăng ký + export)
- Create: `packages/elements/src/test-utils/helpers.ts`
- Test: `packages/elements/src/components/button/button.test.ts`

**Interfaces:**
- Consumes: `NeuElement`, `hostTheme`, `themeCssProperties` (Task 4); `defineComponent` (Task 2); `html` (Task 1).
- Produces:
  - `buttonDef: ComponentDef<…>` với tag `neu-button`; props `variant` (`default|primary|flat`, reflect), `size` (`sm|md|lg`, reflect), `disabled` (reflect), `loading` (reflect), `type` (`button|submit|reset`, mặc định `button`, reflect).
  - `class NeuButton extends NeuElement` (form-associated chỉ để lấy `internals.form`); getter `form`.
  - Entry `@neu-ui/elements/button.js` export `NeuButton` và `buttonDef`.
  - Test helper (chỉ dùng trong test): `mount<T>(markup): T`, `mountForm(inner): HTMLFormElement`, `internalsOf(el): ElementInternals`, `axeViolations(context): Promise<string[]>`, `keydown(el, key): KeyboardEvent`, `keyup(el, key): KeyboardEvent`, `tick(): Promise<void>`.

- [ ] **Step 1: Viết test helper**

`packages/elements/src/test-utils/helpers.ts`:
```ts
import axe from 'axe-core';

export function mount<T extends Element = HTMLElement>(markup: string): T {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  return host.firstElementChild as T;
}

export function mountForm(inner: string): HTMLFormElement {
  const form = document.createElement('form');
  form.innerHTML = inner;
  document.body.append(form);
  return form;
}

/** Reads the protected ElementInternals of a component for ARIA assertions. */
export function internalsOf(el: Element): ElementInternals {
  return (el as unknown as { internals: ElementInternals }).internals;
}

/** axe-core with color-contrast disabled (spec decision A: pure neumorphism). */
export async function axeViolations(context: Element): Promise<string[]> {
  const result = await axe.run(context, { rules: { 'color-contrast': { enabled: false } } });
  return result.violations.map((violation) => `${violation.id}: ${violation.help}`);
}

function key(type: 'keydown' | 'keyup', el: Element, value: string): KeyboardEvent {
  const event = new KeyboardEvent(type, { key: value, bubbles: true, composed: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

export const keydown = (el: Element, value: string) => key('keydown', el, value);
export const keyup = (el: Element, value: string) => key('keyup', el, value);

/** Waits one macrotask, which flushes microtask-deferred events. */
export const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
```

- [ ] **Step 2: Viết test thất bại**

`packages/elements/src/components/button/button.test.ts`:
```ts
import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NeuButton } from '../../button.js';
import {
  axeViolations,
  internalsOf,
  keydown,
  keyup,
  mount,
  mountForm,
} from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

function countClicks(el: Element): () => number {
  let clicks = 0;
  el.addEventListener('click', () => clicks++);
  return () => clicks;
}

describe('neu-button', () => {
  test('defaults: role button, focusable, type=button, variant=default, size=md', () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    expect(el).toBeInstanceOf(NeuButton);
    expect(internalsOf(el).role).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');
    expect([el.type, el.variant, el.size]).toEqual(['button', 'default', 'md']);
  });

  test('exposes the documented parts', () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    const parts = [...el.shadowRoot!.querySelectorAll('[part]')].map((p) => p.getAttribute('part'));
    expect(parts).toEqual(['base', 'prefix', 'label', 'suffix', 'spinner']);
  });

  test('an invalid variant falls back to default', () => {
    expect(mount<NeuButton>('<neu-button variant="huge">Save</neu-button>').variant).toBe('default');
  });

  test('click fires normally', async () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    const clicks = countClicks(el);
    await userEvent.click(el);
    expect(clicks()).toBe(1);
  });

  test('disabled: no click event, not focusable, aria-disabled', () => {
    const el = mount<NeuButton>('<neu-button disabled>Save</neu-button>');
    const clicks = countClicks(el);
    el.click();
    expect(clicks()).toBe(0);
    expect(el.hasAttribute('tabindex')).toBe(false);
    expect(internalsOf(el).ariaDisabled).toBe('true');
    el.disabled = false;
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(internalsOf(el).ariaDisabled).toBeNull();
  });

  test('loading: no click event, still focusable, aria-busy', () => {
    const el = mount<NeuButton>('<neu-button loading>Save</neu-button>');
    const clicks = countClicks(el);
    el.click();
    expect(clicks()).toBe(0);
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(internalsOf(el).ariaBusy).toBe('true');
  });

  test('Enter activates on keydown; Space activates on keyup', async () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    const clicks = countClicks(el);
    el.focus();
    await userEvent.keyboard('{Enter}');
    expect(clicks()).toBe(1);
    expect(keydown(el, ' ').defaultPrevented).toBe(true);
    expect(clicks()).toBe(1);
    expect(el.matches(':state(pressed)')).toBe(true);
    keyup(el, ' ');
    expect(clicks()).toBe(2);
    expect(el.matches(':state(pressed)')).toBe(false);
  });

  test('Space released after blur does not activate', () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    const clicks = countClicks(el);
    el.focus();
    keydown(el, ' ');
    el.blur();
    keyup(el, ' ');
    expect(clicks()).toBe(0);
  });

  test('type=submit submits, type=reset resets, type=button does neither', async () => {
    const form = mountForm(
      '<input name="q" value="a"><neu-button type="submit">Go</neu-button>' +
        '<neu-button type="reset">Reset</neu-button><neu-button>Noop</neu-button>',
    );
    const events: string[] = [];
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      events.push('submit');
    });
    form.addEventListener('reset', () => events.push('reset'));
    const [submit, reset, noop] = form.querySelectorAll('neu-button');
    await userEvent.click(submit!);
    await userEvent.click(reset!);
    await userEvent.click(noop!);
    expect(events).toEqual(['submit', 'reset']);
  });

  test('a disabled fieldset disables the button', () => {
    const form = mountForm('<fieldset disabled><neu-button type="submit">Go</neu-button></fieldset>');
    let submitted = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted++;
    });
    const button = form.querySelector('neu-button') as NeuButton;
    button.click();
    expect(submitted).toBe(0);
    expect(button.hasAttribute('tabindex')).toBe(false);
  });

  test('has no axe violations', async () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    expect(await axeViolations(el.parentElement!)).toEqual([]);
  });
});
```

Run: `BROWSERS=chromium pnpm --filter @neu-ui/elements test`
Expected: FAIL — không resolve được `../../button.js`.

- [ ] **Step 3: Cài đặt định nghĩa và style**

`packages/elements/src/components/button/button.styles.ts`:
```ts
import { hostTheme } from '../../core/styles.js';

export const buttonStyles = `${hostTheme}
:host { display: inline-block; vertical-align: middle; cursor: pointer; user-select: none; }
:host([disabled]), :host([loading]) { cursor: not-allowed; }
.base {
  display: inline-flex; align-items: center; justify-content: center;
  min-block-size: 2.5rem; padding-inline: 1.125rem;
  border-radius: var(--_neu-r);
  background: var(--_neu-bg);
  color: var(--_neu-fg);
  font: inherit; font-weight: 600; font-size: 0.9375rem; line-height: 1;
  box-shadow: var(--_neu-raised);
  transition: box-shadow var(--_neu-dur) ease, color var(--_neu-dur) ease;
}
:host([size='sm']) .base { min-block-size: 2rem; padding-inline: 0.875rem; font-size: 0.8125rem; box-shadow: var(--_neu-raised-sm); }
:host([size='lg']) .base { min-block-size: 3rem; padding-inline: 1.5rem; font-size: 1.0625rem; }
:host([variant='primary']) .base { color: var(--_neu-accent-c); }
:host([variant='flat']) .base { box-shadow: none; }
:host([variant='flat']:hover:not([disabled])) .base { box-shadow: var(--_neu-raised-sm); }
:host(:active:not([disabled]):not([loading])) .base, :host(:state(pressed)) .base { box-shadow: var(--_neu-inset-sm); }
:host(:focus-visible) .base { box-shadow: var(--_neu-raised), var(--_neu-focus); }
:host([disabled]) .base { box-shadow: none; color: var(--_neu-fg-muted); }
.prefix, .suffix { display: inline-flex; }
::slotted([slot='prefix']) { margin-inline-end: 0.5em; }
::slotted([slot='suffix']) { margin-inline-start: 0.5em; }
.spinner {
  display: none; inline-size: 1em; block-size: 1em; margin-inline-start: 0.5em; border-radius: 50%;
  border: 2px solid var(--_neu-accent-soft); border-block-start-color: var(--_neu-accent-c);
  animation: neu-spin 0.8s linear infinite;
}
:host([loading]) .spinner { display: inline-block; }
@keyframes neu-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2.4s; } }
`;
```

`packages/elements/src/components/button/button.def.ts`:
```ts
import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
import { buttonStyles } from './button.styles.js';

export const buttonDef = defineComponent({
  tag: 'neu-button',
  props: {
    variant: { type: 'string', default: 'default', values: ['default', 'primary', 'flat'], reflect: true },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'], reflect: true },
    disabled: { type: 'boolean', reflect: true },
    loading: { type: 'boolean', reflect: true },
    type: { type: 'string', default: 'button', values: ['button', 'submit', 'reset'], reflect: true },
  },
  styles: buttonStyles,
  template: () =>
    html`<span part="base" class="base"><span part="prefix" class="prefix"><slot name="prefix"></slot></span><span part="label" class="label"><slot></slot></span><span part="suffix" class="suffix"><slot name="suffix"></slot></span><span part="spinner" class="spinner" aria-hidden="true"></span></span>`,
  docs: {
    summary: 'A raised button. Use variant="primary" for the main action of a view.',
    events: [{ name: 'click', description: 'Fired on activation; never while disabled or loading.' }],
    slots: [
      { name: '', description: 'Button label.' },
      { name: 'prefix', description: 'Content before the label, such as an icon.' },
      { name: 'suffix', description: 'Content after the label.' },
    ],
    parts: [
      { name: 'base', description: 'The raised surface.' },
      { name: 'label', description: 'Wrapper around the default slot.' },
      { name: 'prefix', description: 'Wrapper around the prefix slot.' },
      { name: 'suffix', description: 'Wrapper around the suffix slot.' },
      { name: 'spinner', description: 'Spinner shown while loading.' },
    ],
    cssProperties: themeCssProperties,
  },
});
```

- [ ] **Step 4: Cài đặt hành vi và entry**

`packages/elements/src/components/button/button.ts`:
```ts
import { NeuElement } from '../../core/neu-element.js';
import { buttonDef } from './button.def.js';

export class NeuButton extends NeuElement {
  static override def = buttonDef;
  /** Form-associated only to reach internals.form; a button contributes no value. */
  static formAssociated = true;
  declare variant: 'default' | 'primary' | 'flat';
  declare size: 'sm' | 'md' | 'lg';
  declare disabled: boolean;
  declare loading: boolean;
  declare type: 'button' | 'submit' | 'reset';

  constructor() {
    super();
    this.internals.role = 'button';
    this.addEventListener('click', (event) => this.onClickCapture(event), { capture: true });
    this.addEventListener('click', () => this.onClick());
    this.addEventListener('keydown', (event) => this.onKeyDown(event));
    this.addEventListener('keyup', (event) => this.onKeyUp(event));
    this.addEventListener('blur', () => this.toggleState('pressed', false));
  }

  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  private get inactive(): boolean {
    return this.isDisabled || this.props.loading === true;
  }

  /** The base class already swallows clicks while disabled; loading needs the same. */
  private onClickCapture(event: Event): void {
    if (this.props.loading !== true) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  private onClick(): void {
    const form = this.internals.form;
    if (!form) return;
    if (this.props.type === 'submit') form.requestSubmit();
    else if (this.props.type === 'reset') form.reset();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.inactive) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.click();
    } else if (event.key === ' ') {
      event.preventDefault();
      this.toggleState('pressed', true);
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (event.key !== ' ' || !this.internals.states.has('pressed')) return;
    this.toggleState('pressed', false);
    if (!this.inactive) this.click();
  }

  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('disabled') || changed.has('loading')) {
      this.internals.ariaDisabled = this.isDisabled ? 'true' : null;
      this.internals.ariaBusy = this.props.loading === true ? 'true' : null;
      this.syncFocusable(!this.isDisabled);
    }
  }
}
```

`packages/elements/src/button.ts`:
```ts
import { NeuButton } from './components/button/button.js';

NeuButton.define();

export { NeuButton };
export { buttonDef } from './components/button/button.def.js';
```

- [ ] **Step 5: Chạy test**

Run: `pnpm --filter @neu-ui/elements test && pnpm --filter @neu-ui/elements typecheck`
Expected: PASS trên cả 3 engine.

- [ ] **Step 6: Commit**

```bash
pnpm format && pnpm lint
git add packages/elements/src
git commit -m "feat(elements): add neu-button"
```

---
### Task 7: `<neu-switch>`

**Files:**
- Create: `packages/elements/src/core/validation.ts`
- Create: `packages/elements/src/components/switch/switch.def.ts`, `switch.styles.ts`, `switch.ts`
- Create: `packages/elements/src/switch.ts` (entry)
- Test: `packages/elements/src/components/switch/switch.test.ts`

**Interfaces:**
- Consumes: `FormControlElement` (Task 5); `dispatch`, `hostTheme`, `themeCssProperties` (Task 4); test helper (Task 6).
- Produces:
  - `requiredCheckboxMessage(): string`: thông báo "hãy tick ô này" theo ngôn ngữ của trình duyệt, mượn từ một checkbox native.
  - `switchDef` với tag `neu-switch`; props `checked` (giá trị mặc định, không reflect), `name` (reflect), `value` (mặc định `'on'`, reflect), `disabled` (reflect), `required` (reflect), `size` (reflect); `form: { valueProp: 'checked' }`.
  - `class NeuSwitch extends FormControlElement`: `checked` (giá trị hiện tại), `defaultChecked` (đọc/ghi attribute `checked`). Custom state `checked`.
  - Thứ tự event giống checkbox native: trạng thái đổi **trước** khi listener `click` chạy; `input` rồi `change` phát **sau** (trong microtask). Nếu listener gọi `preventDefault()` trên click thì hủy thay đổi, không phát event nào.
  - Entry `@neu-ui/elements/switch.js` export `NeuSwitch`, `switchDef`.

- [ ] **Step 1: Viết test thất bại**

`packages/elements/src/components/switch/switch.test.ts`:
```ts
import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NeuSwitch } from '../../switch.js';
import {
  axeViolations,
  internalsOf,
  keydown,
  mount,
  mountForm,
  tick,
} from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('neu-switch', () => {
  test('role switch; aria-checked, state and track follow the value', async () => {
    const el = mount<NeuSwitch>('<neu-switch>Notifications</neu-switch>');
    expect(internalsOf(el).role).toBe('switch');
    expect(internalsOf(el).ariaChecked).toBe('false');
    await userEvent.click(el);
    expect(el.checked).toBe(true);
    expect(internalsOf(el).ariaChecked).toBe('true');
    expect(el.matches(':state(checked)')).toBe(true);
    expect(el.shadowRoot!.querySelector('.track')!.classList.contains('on')).toBe(true);
  });

  test('the checked attribute is the default; the property is the current state', () => {
    const el = mount<NeuSwitch>('<neu-switch checked>N</neu-switch>');
    expect(el.checked).toBe(true);
    el.checked = false;
    expect(el.hasAttribute('checked')).toBe(true);
    expect(el.defaultChecked).toBe(true);
  });

  test('a changed default moves an untouched switch, but not a toggled one', () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    el.setAttribute('checked', '');
    expect(el.checked).toBe(true);
    el.click();
    expect(el.checked).toBe(false);
    el.removeAttribute('checked');
    el.setAttribute('checked', '');
    expect(el.checked).toBe(false);
  });

  test('state flips before click listeners; input then change fire afterwards', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    const events: string[] = [];
    el.addEventListener('click', () => events.push(`click:${el.checked}`));
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    await userEvent.click(el);
    expect(events).toEqual(['click:true', 'input', 'change']);
  });

  test('preventDefault on click cancels the toggle and fires nothing', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    const events: string[] = [];
    el.addEventListener('click', (event) => event.preventDefault());
    el.addEventListener('change', () => events.push('change'));
    el.click();
    await tick();
    expect(el.checked).toBe(false);
    expect(events).toEqual([]);
  });

  test('disabled: no events, no toggle, not focusable', async () => {
    const el = mount<NeuSwitch>('<neu-switch disabled>N</neu-switch>');
    const events: string[] = [];
    for (const type of ['click', 'input', 'change']) el.addEventListener(type, () => events.push(type));
    el.click();
    await tick();
    expect(events).toEqual([]);
    expect(el.checked).toBe(false);
    expect(el.hasAttribute('tabindex')).toBe(false);
  });

  test('Space toggles on keyup, Enter on keydown, and Space does not scroll', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    el.focus();
    await userEvent.keyboard(' ');
    expect(el.checked).toBe(true);
    await userEvent.keyboard('{Enter}');
    expect(el.checked).toBe(false);
    expect(keydown(el, ' ').defaultPrevented).toBe(true);
  });

  test('re-connecting does not double-handle clicks', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    const parent = el.parentElement!;
    el.remove();
    parent.append(el);
    await userEvent.click(el);
    expect(el.checked).toBe(true);
  });

  test('submits its value when checked and nothing when unchecked', () => {
    const form = mountForm('<neu-switch name="notify" value="yes" checked>N</neu-switch>');
    expect(new FormData(form).get('notify')).toBe('yes');
    (form.querySelector('neu-switch') as NeuSwitch).checked = false;
    expect(new FormData(form).has('notify')).toBe(false);
  });

  test('required + unchecked: valueMissing with a browser message; user-invalid only after interaction', async () => {
    const form = mountForm('<neu-switch name="tos" required>Accept</neu-switch>');
    const el = form.querySelector('neu-switch') as NeuSwitch;
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).not.toBe('');
    expect(el.matches(':state(user-invalid)')).toBe(false);
    await userEvent.click(el);
    await userEvent.click(el);
    expect(el.matches(':state(user-invalid)')).toBe(true);
  });

  test('form.reset() returns to the default and clears dirtiness', async () => {
    const form = mountForm('<neu-switch name="n" checked>N</neu-switch>');
    const el = form.querySelector('neu-switch') as NeuSwitch;
    await userEvent.click(el);
    expect(el.checked).toBe(false);
    form.reset();
    expect(el.checked).toBe(true);
    el.removeAttribute('checked');
    expect(el.checked).toBe(false);
  });

  test('an external <label for> toggles it', async () => {
    document.body.innerHTML = '<label for="s">Notify</label><neu-switch id="s"></neu-switch>';
    const el = document.getElementById('s') as NeuSwitch;
    await userEvent.click(document.querySelector('label')!);
    expect(el.checked).toBe(true);
  });

  test('has no axe violations', async () => {
    const el = mount<NeuSwitch>('<neu-switch>Notifications</neu-switch>');
    expect(await axeViolations(el.parentElement!)).toEqual([]);
  });
});
```

Run: `BROWSERS=chromium pnpm --filter @neu-ui/elements test`
Expected: FAIL — không resolve được `../../switch.js`.

- [ ] **Step 2: Cài đặt `validation.ts`**

`packages/elements/src/core/validation.ts`:
```ts
let checkboxMessage: string | undefined;

/** The browser's own, localised "please check this box" message, borrowed from a native checkbox. */
export function requiredCheckboxMessage(): string {
  if (checkboxMessage === undefined) {
    const probe = document.createElement('input');
    probe.type = 'checkbox';
    probe.required = true;
    checkboxMessage = probe.validationMessage || 'Please check this box if you want to proceed.';
  }
  return checkboxMessage;
}
```

- [ ] **Step 3: Cài đặt định nghĩa và style**

`packages/elements/src/components/switch/switch.styles.ts`:
```ts
import { hostTheme } from '../../core/styles.js';

export const switchStyles = `${hostTheme}
:host {
  display: inline-flex; vertical-align: middle; cursor: pointer; user-select: none;
  --_track-w: 2.875rem; --_track-h: 1.625rem; --_thumb: 1.25rem;
}
:host([size='sm']) { --_track-w: 2.25rem; --_track-h: 1.25rem; --_thumb: 0.9375rem; }
:host([size='lg']) { --_track-w: 3.5rem; --_track-h: 2rem; --_thumb: 1.5rem; }
:host([disabled]) { cursor: not-allowed; }
.base { display: inline-flex; align-items: center; gap: 0.625rem; }
.track {
  position: relative; flex: none; inline-size: var(--_track-w); block-size: var(--_track-h);
  border-radius: 999px; background: var(--_neu-bg); box-shadow: var(--_neu-inset-sm);
  transition: background-color var(--_neu-dur) ease, box-shadow var(--_neu-dur) ease;
}
.track.on { background: var(--_neu-accent-soft); }
.thumb {
  position: absolute; inset-block-start: 50%;
  inset-inline-start: calc((var(--_track-h) - var(--_thumb)) / 2);
  inline-size: var(--_thumb); block-size: var(--_thumb); border-radius: 50%;
  background: var(--_neu-bg); box-shadow: var(--_neu-raised-sm); transform: translateY(-50%);
  transition: inset-inline-start var(--_neu-dur) ease;
}
.track.on .thumb { inset-inline-start: calc(var(--_track-w) - var(--_thumb) - (var(--_track-h) - var(--_thumb)) / 2); }
:host(:focus-visible) .track { box-shadow: var(--_neu-inset-sm), var(--_neu-focus); }
:host([disabled]) .base { opacity: 0.55; }
:host(:state(user-invalid)) .track { box-shadow: var(--_neu-inset-sm), 0 0 0 2px color-mix(in oklab, var(--_neu-danger) 55%, transparent); }
.label { color: var(--_neu-fg); }
`;
```

`packages/elements/src/components/switch/switch.def.ts`:
```ts
import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
import { switchStyles } from './switch.styles.js';

export const switchDef = defineComponent({
  tag: 'neu-switch',
  props: {
    checked: { type: 'boolean' },
    name: { type: 'string', reflect: true },
    value: { type: 'string', default: 'on', reflect: true },
    disabled: { type: 'boolean', reflect: true },
    required: { type: 'boolean', reflect: true },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'], reflect: true },
  },
  form: { valueProp: 'checked' },
  styles: switchStyles,
  template: (p) =>
    html`<span part="base" class="base"><span part="track" class="track${p.checked ? ' on' : ''}" data-ref="track"><span part="thumb" class="thumb"></span></span><span part="label" class="label"><slot></slot></span></span>`,
  docs: {
    summary: 'An on/off switch. The checked attribute is the default state.',
    events: [
      { name: 'input', description: 'Fired when the user toggles the switch.' },
      { name: 'change', description: 'Fired after input when the user toggles the switch.' },
    ],
    slots: [{ name: '', description: 'Label; also the accessible name.' }],
    parts: [
      { name: 'base', description: 'Wrapper around track and label.' },
      { name: 'track', description: 'The inset track.' },
      { name: 'thumb', description: 'The raised thumb.' },
      { name: 'label', description: 'Wrapper around the default slot.' },
    ],
    cssProperties: themeCssProperties,
  },
});
```

- [ ] **Step 4: Cài đặt hành vi và entry**

`packages/elements/src/components/switch/switch.ts`:
```ts
import { dispatch } from '../../core/dom.js';
import { FormControlElement } from '../../core/form-control.js';
import { requiredCheckboxMessage } from '../../core/validation.js';
import { switchDef } from './switch.def.js';

export class NeuSwitch extends FormControlElement {
  static override def = switchDef;
  static override extraProperties = ['defaultChecked'];
  declare name: string;
  declare value: string;
  declare disabled: boolean;
  declare required: boolean;
  declare size: 'sm' | 'md' | 'lg';
  private current: boolean;
  private dirty = false;

  constructor() {
    super();
    this.current = this.props.checked === true;
    this.internals.role = 'switch';
    this.addEventListener('click', (event) => this.onClick(event));
    this.addEventListener('keydown', (event) => this.onKeyDown(event));
    this.addEventListener('keyup', (event) => {
      if (event.key === ' ') this.click();
    });
  }

  get checked(): boolean {
    return this.current;
  }
  set checked(value: boolean) {
    this.dirty = true;
    this.setCurrent(Boolean(value));
  }

  get defaultChecked(): boolean {
    return this.props.checked === true;
  }
  set defaultChecked(value: boolean) {
    this.toggleAttribute('checked', Boolean(value));
  }

  /** Native checkbox order: flip now, let click listeners see it, then input + change. */
  private onClick(event: Event): void {
    const before = this.current;
    this.dirty = true;
    this.setCurrent(!before);
    queueMicrotask(() => {
      if (event.defaultPrevented) {
        this.setCurrent(before);
        return;
      }
      this.markInteracted();
      dispatch(this, 'input');
      dispatch(this, 'change');
    });
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === ' ') {
      event.preventDefault();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.click();
    }
  }

  private setCurrent(value: boolean): void {
    this.current = value;
    this.toggleState('checked', value);
    this.internals.ariaChecked = value ? 'true' : 'false';
    this.ref('track')?.classList.toggle('on', value);
    this.commit();
  }

  protected override willUpdate(changed: ReadonlySet<string>): void {
    if (changed.has('checked') && !this.dirty) this.current = this.props.checked === true;
  }

  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('disabled')) {
      this.internals.ariaDisabled = this.isDisabled ? 'true' : null;
      this.syncFocusable(!this.isDisabled);
    }
    if (changed.has('checked')) this.setCurrent(this.current);
    else if (changed.has('required') || changed.has('value')) this.commit();
  }

  protected formValue(): string | null {
    return this.current ? String(this.props.value) : null;
  }
  protected override formState(): string {
    return this.current ? 'checked' : 'unchecked';
  }
  protected validate(): void {
    if (this.props.required === true && !this.current) {
      this.internals.setValidity(
        { valueMissing: true },
        requiredCheckboxMessage(),
        this.ref('track') ?? undefined,
      );
    } else {
      this.internals.setValidity({});
    }
  }
  protected resetToDefault(): void {
    this.dirty = false;
    this.setCurrent(this.props.checked === true);
  }
  protected restoreState(state: string): void {
    this.dirty = true;
    this.setCurrent(state === 'checked');
  }
}
```

`packages/elements/src/switch.ts`:
```ts
import { NeuSwitch } from './components/switch/switch.js';

NeuSwitch.define();

export { NeuSwitch };
export { switchDef } from './components/switch/switch.def.js';
```

- [ ] **Step 5: Chạy test**

Run: `pnpm --filter @neu-ui/elements test && pnpm --filter @neu-ui/elements typecheck`
Expected: PASS trên cả 3 engine.

- [ ] **Step 6: Commit**

```bash
pnpm format && pnpm lint
git add packages/elements/src
git commit -m "feat(elements): add neu-switch"
```

---
### Task 8: `<neu-text-field>`

**Files:**
- Modify: `packages/elements/src/core/validation.ts` (thêm `copyValidity`)
- Create: `packages/elements/src/components/text-field/text-field.def.ts`, `text-field.styles.ts`, `text-field.ts`
- Create: `packages/elements/src/text-field.ts` (entry)
- Test: `packages/elements/src/components/text-field/text-field.test.ts`

**Interfaces:**
- Consumes: `FormControlElement`, `implicitSubmit` (Task 5); `dispatch`, `setText`, `setOptionalAttribute`, `hostTheme`, `themeCssProperties` (Task 4); entry `button.js` (Task 6, dùng trong test Enter); test helper (Task 6).
- Produces:
  - `copyValidity(validity: ValidityState): ValidityStateFlags`
  - `textFieldDef` với tag `neu-text-field`, `delegatesFocus: true`, `form: { valueProp: 'value' }`. Props: `type` (`text|email|password|search|tel|url`, reflect), `value` (giá trị mặc định), `name` (reflect), `label`, `placeholder`, `helpText` (`help-text`), `errorText` (`error-text`), `required`, `disabled`, `readOnly` (`readonly`) (cả ba reflect), `minLength` (`minlength`, mặc định -1), `maxLength` (`maxlength`, mặc định -1), `pattern`, `autocomplete`, `inputMode` (`inputmode`), `enterKeyHint` (`enterkeyhint`), `size` (reflect).
  - `class NeuTextField extends FormControlElement`: `value` (hiện tại), `defaultValue` (đọc/ghi attribute `value`), `select()`, `setSelectionRange(start, end, direction?)`. `focus()` và `blur()` là của host (nhờ `delegatesFocus`).
  - Shadow: `label[for=input] > slot[name=label] > .label-text`, `input#input[aria-describedby=help]`, `#help > slot[name=help-text] > .help-text` cùng `.error-text`.
  - Entry `@neu-ui/elements/text-field.js` export `NeuTextField`, `textFieldDef`.

- [ ] **Step 1: Viết test thất bại**

`packages/elements/src/components/text-field/text-field.test.ts`:
```ts
import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../button.js';
import { NeuTextField } from '../../text-field.js';
import { axeViolations, mount, mountForm } from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const inputOf = (el: NeuTextField) => el.shadowRoot!.querySelector('input')!;

describe('neu-text-field', () => {
  test('renders a labelled native input that receives focus through the host', () => {
    const el = mount<NeuTextField>('<neu-text-field label="Email" placeholder="you@x.com"></neu-text-field>');
    expect(el.shadowRoot!.querySelector('label')!.textContent).toBe('Email');
    expect(inputOf(el).placeholder).toBe('you@x.com');
    el.focus();
    expect(el.shadowRoot!.activeElement).toBe(inputOf(el));
  });

  test('label and help text can come from slots', () => {
    const el = mount<NeuTextField>(
      '<neu-text-field><span slot="label">Name</span><span slot="help-text">Full name</span></neu-text-field>',
    );
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name=label]')!;
    expect(slot.assignedElements()[0]!.textContent).toBe('Name');
  });

  test('typing updates value and fires input; change is re-fired on the host after blur', async () => {
    const el = mount<NeuTextField>('<neu-text-field label="Name"></neu-text-field>');
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    el.focus();
    await userEvent.keyboard('ab');
    inputOf(el).blur();
    expect(el.value).toBe('ab');
    expect(events).toEqual(['input', 'input', 'change']);
  });

  test('the value attribute is the default; the property is the current value', () => {
    const el = mount<NeuTextField>('<neu-text-field label="A" value="x"></neu-text-field>');
    expect(el.value).toBe('x');
    el.value = 'y';
    expect(el.getAttribute('value')).toBe('x');
    expect(el.defaultValue).toBe('x');
    el.setAttribute('value', 'z');
    expect(el.value).toBe('y');
  });

  test('a value set before connecting is shown once rendered', () => {
    const el = document.createElement('neu-text-field') as NeuTextField;
    el.setAttribute('label', 'A');
    el.value = 'early';
    document.body.append(el);
    expect(inputOf(el).value).toBe('early');
    expect(el.value).toBe('early');
  });

  test('takes part in forms: FormData, validation, reset', () => {
    const form = mountForm(
      '<neu-text-field name="email" label="Email" type="email" value="a@b.co" required></neu-text-field>',
    );
    const el = form.querySelector('neu-text-field') as NeuTextField;
    expect(new FormData(form).get('email')).toBe('a@b.co');
    el.value = '';
    expect(el.validity.valueMissing).toBe(true);
    el.value = 'not-an-email';
    expect(el.validity.typeMismatch).toBe(true);
    form.reset();
    expect(el.value).toBe('a@b.co');
    expect(el.validity.valid).toBe(true);
  });

  test('error-text shows only after the user commits an invalid edit', async () => {
    const el = mount<NeuTextField>(
      '<neu-text-field label="Email" type="email" required error-text="Enter an email"></neu-text-field>',
    );
    const error = el.shadowRoot!.querySelector('.error-text')!;
    expect(el.matches(':state(user-invalid)')).toBe(false);
    expect(getComputedStyle(error).display).toBe('none');
    el.focus();
    await userEvent.keyboard('x');
    inputOf(el).blur();
    expect(el.matches(':state(user-invalid)')).toBe(true);
    expect(error.textContent).toBe('Enter an email');
    expect(getComputedStyle(error).display).toBe('block');
  });

  test('Enter submits the form when it has a submit button', async () => {
    const form = mountForm(
      '<neu-text-field name="q" label="Search"></neu-text-field><neu-text-field name="r" label="Other"></neu-text-field>' +
        '<neu-button type="submit">Go</neu-button>',
    );
    let submitted = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted++;
    });
    (form.querySelector('neu-text-field') as NeuTextField).focus();
    await userEvent.keyboard('{Enter}');
    expect(submitted).toBe(1);
  });

  test('escapes hostile attribute values', () => {
    const el = mount<NeuTextField>(
      `<neu-text-field label="<img src=x onerror=alert(1)>" placeholder='" autofocus onfocus="x'></neu-text-field>`,
    );
    expect(el.shadowRoot!.querySelector('img')).toBeNull();
    expect(inputOf(el).hasAttribute('onfocus')).toBe(false);
    expect(el.shadowRoot!.querySelector('.label-text')!.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  test('a disabled fieldset disables the inner input', () => {
    const form = mountForm(
      '<fieldset disabled><neu-text-field name="a" label="A" value="1"></neu-text-field></fieldset>',
    );
    const el = form.querySelector('neu-text-field') as NeuTextField;
    expect(inputOf(el).disabled).toBe(true);
    expect(new FormData(form).has('a')).toBe(false);
  });

  test('passes attribute changes through to the inner input', () => {
    const el = mount<NeuTextField>('<neu-text-field label="A"></neu-text-field>');
    el.setAttribute('maxlength', '3');
    el.setAttribute('inputmode', 'numeric');
    el.readOnly = true;
    expect([inputOf(el).maxLength, inputOf(el).inputMode, inputOf(el).readOnly]).toEqual([3, 'numeric', true]);
    el.removeAttribute('maxlength');
    expect(inputOf(el).hasAttribute('maxlength')).toBe(false);
  });

  test('has no axe violations', async () => {
    const el = mount<NeuTextField>('<neu-text-field label="Email" help-text="Work email"></neu-text-field>');
    expect(await axeViolations(el.parentElement!)).toEqual([]);
  });
});
```

Run: `BROWSERS=chromium pnpm --filter @neu-ui/elements test`
Expected: FAIL — không resolve được `../../text-field.js`.

- [ ] **Step 2: Thêm `copyValidity`**

Nối vào cuối `packages/elements/src/core/validation.ts`:
```ts
/** Copies a native input's validity so the host can report the same errors. */
export function copyValidity(validity: ValidityState): ValidityStateFlags {
  return {
    badInput: validity.badInput,
    customError: validity.customError,
    patternMismatch: validity.patternMismatch,
    rangeOverflow: validity.rangeOverflow,
    rangeUnderflow: validity.rangeUnderflow,
    stepMismatch: validity.stepMismatch,
    tooLong: validity.tooLong,
    tooShort: validity.tooShort,
    typeMismatch: validity.typeMismatch,
    valueMissing: validity.valueMissing,
  };
}
```

- [ ] **Step 3: Cài đặt định nghĩa và style**

`packages/elements/src/components/text-field/text-field.styles.ts`:
```ts
import { hostTheme } from '../../core/styles.js';

export const textFieldStyles = `${hostTheme}
:host { display: block; }
:host([disabled]) { cursor: not-allowed; }
.base { display: flex; flex-direction: column; }
.label-text, ::slotted([slot='label']) {
  display: block; margin-block-end: 0.375rem;
  font-size: 0.8125rem; font-weight: 600; color: var(--_neu-fg-muted);
}
.label-text:empty { display: none; }
.control {
  display: flex; align-items: center; min-block-size: 2.75rem; padding-inline: 0.875rem;
  border-radius: var(--_neu-r); background: var(--_neu-bg); box-shadow: var(--_neu-inset);
  transition: box-shadow var(--_neu-dur) ease;
}
:host([size='sm']) .control { min-block-size: 2.25rem; padding-inline: 0.75rem; box-shadow: var(--_neu-inset-sm); }
:host([size='lg']) .control { min-block-size: 3.25rem; padding-inline: 1rem; }
:host(:focus-within) .control { box-shadow: var(--_neu-inset), var(--_neu-focus); }
:host(:state(user-invalid)) .control {
  box-shadow:
    inset var(--_neu-d) var(--_neu-d) calc(var(--_neu-d) * 2) color-mix(in oklab, var(--_neu-danger) 35%, var(--_neu-sd)),
    inset calc(var(--_neu-d) * -1) calc(var(--_neu-d) * -1) calc(var(--_neu-d) * 2) var(--_neu-sl);
}
:host([disabled]) .control { box-shadow: var(--_neu-inset-sm); opacity: 0.6; }
.input {
  flex: 1; min-inline-size: 0; align-self: stretch; padding: 0; border: none; outline: none;
  background: transparent; color: inherit; font: inherit; font-size: 0.9375rem;
}
.input::placeholder { color: var(--_neu-fg-muted); opacity: 1; }
.prefix, .suffix { display: inline-flex; }
::slotted([slot='prefix']) { margin-inline-end: 0.5rem; }
::slotted([slot='suffix']) { margin-inline-start: 0.5rem; }
.help { font-size: 0.75rem; color: var(--_neu-fg-muted); }
.help-text, ::slotted([slot='help-text']) { display: block; margin-block-start: 0.375rem; }
.help-text:empty { display: none; }
.error-text { display: none; margin-block-start: 0.375rem; color: var(--_neu-danger); }
:host(:state(user-invalid)) slot[name='help-text'] { display: none; }
:host(:state(user-invalid)) .error-text:not(:empty) { display: block; }
`;
```

`packages/elements/src/components/text-field/text-field.def.ts`:
```ts
import { defineComponent } from '../../core/define.js';
import { html, type RawHtml } from '../../core/html.js';
import type { InferProps } from '../../core/props.js';
import { themeCssProperties } from '../../core/styles.js';
import { textFieldStyles } from './text-field.styles.js';

const props = {
  type: {
    type: 'string',
    default: 'text',
    values: ['text', 'email', 'password', 'search', 'tel', 'url'],
    reflect: true,
  },
  value: { type: 'string' },
  name: { type: 'string', reflect: true },
  label: { type: 'string' },
  placeholder: { type: 'string' },
  helpText: { type: 'string' },
  errorText: { type: 'string' },
  required: { type: 'boolean', reflect: true },
  disabled: { type: 'boolean', reflect: true },
  readOnly: { type: 'boolean', reflect: true, attribute: 'readonly' },
  minLength: { type: 'number', default: -1, attribute: 'minlength' },
  maxLength: { type: 'number', default: -1, attribute: 'maxlength' },
  pattern: { type: 'string' },
  autocomplete: { type: 'string' },
  inputMode: { type: 'string', attribute: 'inputmode' },
  enterKeyHint: { type: 'string', attribute: 'enterkeyhint' },
  size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'], reflect: true },
} as const;

export type TextFieldProps = InferProps<typeof props>;

/** Attributes of the inner <input> that only appear when set. */
function inputAttributes(p: TextFieldProps): RawHtml {
  return html`${p.placeholder ? html` placeholder="${p.placeholder}"` : ''}${p.required ? html` required` : ''}${p.disabled ? html` disabled` : ''}${p.readOnly ? html` readonly` : ''}${p.minLength >= 0 ? html` minlength="${p.minLength}"` : ''}${p.maxLength >= 0 ? html` maxlength="${p.maxLength}"` : ''}${p.pattern ? html` pattern="${p.pattern}"` : ''}${p.autocomplete ? html` autocomplete="${p.autocomplete}"` : ''}${p.inputMode ? html` inputmode="${p.inputMode}"` : ''}${p.enterKeyHint ? html` enterkeyhint="${p.enterKeyHint}"` : ''}`;
}

export const textFieldDef = defineComponent({
  tag: 'neu-text-field',
  props,
  delegatesFocus: true,
  form: { valueProp: 'value' },
  styles: textFieldStyles,
  template: (p) =>
    html`<div part="base" class="base"><label part="label" class="label" for="input"><slot name="label"><span class="label-text" data-ref="label-text">${p.label}</span></slot></label><div part="control" class="control"><span part="prefix" class="prefix"><slot name="prefix"></slot></span><input part="input" class="input" id="input" data-ref="input" type="${p.type}" value="${p.value}" aria-describedby="help"${inputAttributes(p)}><span part="suffix" class="suffix"><slot name="suffix"></slot></span></div><div part="help-text" class="help" id="help"><slot name="help-text"><span class="help-text" data-ref="help-text">${p.helpText}</span></slot><span class="error-text" data-ref="error-text"></span></div></div>`,
  docs: {
    summary: 'A single-line text input with an inset field. The value attribute is the default value.',
    events: [
      { name: 'input', description: 'Fired on every edit (the native input event, composed).' },
      { name: 'change', description: 'Fired when an edit is committed, usually on blur.' },
    ],
    slots: [
      { name: 'label', description: 'Rich label; replaces the label attribute.' },
      { name: 'prefix', description: 'Content before the input, such as an icon.' },
      { name: 'suffix', description: 'Content after the input.' },
      { name: 'help-text', description: 'Rich help text; replaces the help-text attribute.' },
    ],
    parts: [
      { name: 'base', description: 'Outer wrapper.' },
      { name: 'label', description: 'The <label> element.' },
      { name: 'control', description: 'The inset field around the input.' },
      { name: 'input', description: 'The native <input>.' },
      { name: 'prefix', description: 'Wrapper around the prefix slot.' },
      { name: 'suffix', description: 'Wrapper around the suffix slot.' },
      { name: 'help-text', description: 'Help or error text area.' },
    ],
    cssProperties: themeCssProperties,
  },
});
```

Lưu ý: `defineComponent` vẫn suy ra được type literal cho `props`, vì object được khai báo `as const`.

- [ ] **Step 4: Cài đặt hành vi và entry**

`packages/elements/src/components/text-field/text-field.ts`:
```ts
import { dispatch, setOptionalAttribute, setText } from '../../core/dom.js';
import { FormControlElement, implicitSubmit } from '../../core/form-control.js';
import { copyValidity } from '../../core/validation.js';
import { textFieldDef, type TextFieldProps } from './text-field.def.js';

export class NeuTextField extends FormControlElement {
  static override def = textFieldDef;
  static override extraProperties = ['defaultValue'];
  declare type: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
  declare name: string;
  declare label: string;
  declare placeholder: string;
  declare helpText: string;
  declare errorText: string;
  declare required: boolean;
  declare disabled: boolean;
  declare readOnly: boolean;
  declare minLength: number;
  declare maxLength: number;
  declare pattern: string;
  declare autocomplete: string;
  declare size: 'sm' | 'md' | 'lg';
  // inputMode and enterKeyHint are inherited from HTMLElement with the right type.
  /** True once the value was edited or set as a property; the default then stops applying. */
  private dirty = false;
  /** A value set before the shadow root exists. */
  private pendingValue: string | null = null;

  get value(): string {
    return this.input?.value ?? this.pendingValue ?? this.p.value;
  }
  set value(next: string) {
    const text = next === null || next === undefined ? '' : String(next);
    this.dirty = true;
    const input = this.input;
    if (input) input.value = text;
    else this.pendingValue = text;
    this.commit();
  }

  get defaultValue(): string {
    return this.p.value;
  }
  set defaultValue(next: string) {
    this.setAttribute('value', String(next));
  }

  select(): void {
    this.input?.select();
  }

  setSelectionRange(start: number, end: number, direction?: 'forward' | 'backward' | 'none'): void {
    this.input?.setSelectionRange(start, end, direction);
  }

  private get p(): TextFieldProps {
    return this.props as TextFieldProps;
  }

  private get input(): HTMLInputElement | null {
    return this.ref<HTMLInputElement>('input');
  }

  protected override rendered(): void {
    const input = this.input!;
    // An SSR'd input works before JS loads; keep whatever was typed or autofilled meanwhile.
    if (input.value !== this.p.value) this.dirty = true;
    if (this.pendingValue !== null) {
      input.value = this.pendingValue;
      this.pendingValue = null;
    }
    input.addEventListener('input', () => {
      this.dirty = true;
      this.commit();
    });
    input.addEventListener('change', () => {
      this.markInteracted();
      dispatch(this, 'change');
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.isComposing) implicitSubmit(this.internals.form);
    });
  }

  protected override update(changed: ReadonlySet<string>): void {
    const p = this.p;
    const input = this.input;
    if (input) {
      if (changed.has('type') && input.type !== p.type) input.type = p.type;
      if (changed.has('value')) {
        input.defaultValue = p.value;
        if (!this.dirty) input.value = p.value;
      }
      if (changed.has('placeholder')) setOptionalAttribute(input, 'placeholder', p.placeholder);
      if (changed.has('required')) input.required = p.required;
      if (changed.has('disabled')) input.disabled = this.isDisabled;
      if (changed.has('readOnly')) input.readOnly = p.readOnly;
      if (changed.has('minLength')) {
        setOptionalAttribute(input, 'minlength', p.minLength >= 0 ? String(p.minLength) : '');
      }
      if (changed.has('maxLength')) {
        setOptionalAttribute(input, 'maxlength', p.maxLength >= 0 ? String(p.maxLength) : '');
      }
      if (changed.has('pattern')) setOptionalAttribute(input, 'pattern', p.pattern);
      if (changed.has('autocomplete')) setOptionalAttribute(input, 'autocomplete', p.autocomplete);
      if (changed.has('inputMode')) setOptionalAttribute(input, 'inputmode', p.inputMode);
      if (changed.has('enterKeyHint')) setOptionalAttribute(input, 'enterkeyhint', p.enterKeyHint);
    }
    if (changed.has('label')) setText(this.ref('label-text'), p.label);
    if (changed.has('helpText')) setText(this.ref('help-text'), p.helpText);
    this.commit();
  }

  protected formValue(): string {
    return this.value;
  }

  protected validate(): void {
    const input = this.input;
    if (!input || input.validity.valid) this.internals.setValidity({});
    else this.internals.setValidity(copyValidity(input.validity), input.validationMessage, input);
    setText(this.ref('error-text'), this.p.errorText || input?.validationMessage || '');
  }

  protected resetToDefault(): void {
    this.dirty = false;
    this.pendingValue = null;
    const input = this.input;
    if (input) input.value = this.p.value;
  }

  protected restoreState(state: string): void {
    this.dirty = true;
    const input = this.input;
    if (input) input.value = state;
    else this.pendingValue = state;
  }
}
```

`packages/elements/src/text-field.ts`:
```ts
import { NeuTextField } from './components/text-field/text-field.js';

NeuTextField.define();

export { NeuTextField };
export { textFieldDef } from './components/text-field/text-field.def.js';
```

- [ ] **Step 5: Chạy test**

Run: `pnpm --filter @neu-ui/elements test && pnpm --filter @neu-ui/elements typecheck`
Expected: PASS trên cả 3 engine.

Nếu test "Enter submits" fail vì trình duyệt tự submit thêm lần nữa (`submitted` bằng 2): **dừng lại và báo**. Input nằm trong shadow DOM không có form owner, nên theo lý thuyết trình duyệt không tự submit.

- [ ] **Step 6: Commit**

```bash
pnpm format && pnpm lint
git add packages/elements/src
git commit -m "feat(elements): add neu-text-field"
```

---
### Task 9: Entry SSR, bản build, bundle CDN, ngân sách dung lượng

**Files:**
- Create: `packages/elements/src/all.ts`, `packages/elements/src/ssr.ts`, `packages/elements/src/cdn.ts`
- Create: `packages/elements/tsconfig.build.json`, `packages/elements/scripts/build-cdn.mjs`
- Modify: `packages/elements/package.json` (exports, files, sideEffects, scripts)
- Create: `scripts/check-size.mjs`; Modify: `package.json` gốc (script `size`)
- Test: `packages/elements/src/ssr.test.ts`

**Interfaces:**
- Consumes: `buttonDef`, `switchDef`, `textFieldDef` và 3 entry (Task 6–8); `parseProps`, `attributeName`, `coerceProperty`, `parseAttribute`, `serializeAttribute` (Task 2).
- Produces (`@neu-ui/elements/ssr.js`, không đụng DOM):
  ```ts
  const definitions: ReadonlyMap<string, ComponentDef>;          // key = tag
  function renderShadowContents(def: ComponentDef, attrs: Readonly<Record<string, string>>): string; // <style data-neu-ssr>…</style> + template
  function renderDSD(tag: string, attrs: Readonly<Record<string, string>>): string;  // '' for unknown tags
  export { attributeName, coerceProperty, parseAttribute, parseProps, serializeAttribute };
  export type { ComponentDef, ComponentDocs, DocEntry, FormDef, PropDecl, PropsSchema, PropValue, InferProps };
  ```
  - `attrs` dùng tên attribute viết thường, đúng như trong HTML.
  - `@neu-ui/elements/all.js`: đăng ký cả 3 component và export các class.
  - `packages/elements/cdn/neu.min.js`: bundle ESM đã minify, đăng ký mọi component.
  - `pnpm size`: in bảng ngân sách; exit 1 nếu vượt.

- [ ] **Step 1: Viết test thất bại cho SSR**

`packages/elements/src/ssr.test.ts`:
```ts
import { afterEach, describe, expect, test } from 'vitest';
import './all.js';
import type { NeuTextField } from './text-field.js';
import { definitions, renderDSD } from './ssr.js';

afterEach(() => {
  document.body.innerHTML = '';
});

interface Case {
  tag: string;
  attrs: Record<string, string>;
  light: string;
  /** Selector of a node inside the shadow root that must survive hydration. */
  ref: string;
}

const cases: Case[] = [
  { tag: 'neu-button', attrs: { variant: 'primary' }, light: 'Save', ref: '.base' },
  { tag: 'neu-switch', attrs: { checked: '', name: 'n' }, light: 'Notify', ref: '.track' },
  {
    tag: 'neu-text-field',
    attrs: { label: 'Email', value: 'a@b.co', 'help-text': 'Work email' },
    light: '',
    ref: 'input',
  },
];

function attributeText(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([name, value]) => (value === '' ? ` ${name}` : ` ${name}="${value}"`))
    .join('');
}

/** Parses SSR markup in a document without custom element definitions, so nothing upgrades yet. */
function parseDetached(markup: string): Element {
  const doc = document.implementation.createHTMLDocument('');
  doc.body.setHTMLUnsafe(markup);
  return doc.body.firstElementChild!;
}

function ssrMarkup(c: Case): string {
  return `<${c.tag}${attributeText(c.attrs)}>${renderDSD(c.tag, c.attrs)}${c.light}</${c.tag}>`;
}

describe('SSR parity', () => {
  for (const c of cases) {
    test(`${c.tag}: hydration keeps the server-rendered nodes and matches a fresh render`, () => {
      const el = parseDetached(ssrMarkup(c));
      const node = el.shadowRoot!.querySelector(c.ref);
      expect(node).not.toBeNull();
      document.body.append(document.adoptNode(el));
      expect(el.shadowRoot!.querySelector(c.ref)).toBe(node);
      expect(el.shadowRoot!.querySelector('style[data-neu-ssr]')).toBeNull();

      const fresh = document.createElement(c.tag);
      for (const [name, value] of Object.entries(c.attrs)) fresh.setAttribute(name, value);
      fresh.innerHTML = c.light;
      document.body.append(fresh);
      expect(el.shadowRoot!.innerHTML).toBe(fresh.shadowRoot!.innerHTML);
    });
  }

  test('text typed into an SSR input before JS ran survives hydration and later default changes', () => {
    const c = cases[2]!;
    const el = parseDetached(ssrMarkup(c));
    el.shadowRoot!.querySelector('input')!.value = 'typed early';
    document.body.append(document.adoptNode(el));
    const field = el as NeuTextField;
    expect(field.value).toBe('typed early');
    field.setAttribute('value', 'new default');
    expect(field.value).toBe('typed early');
  });

  test('only the text field delegates focus', () => {
    expect(renderDSD('neu-text-field', {})).toContain('shadowrootdelegatesfocus');
    expect(renderDSD('neu-button', {})).not.toContain('shadowrootdelegatesfocus');
  });

  test('attribute values are escaped in SSR output', () => {
    const out = renderDSD('neu-text-field', {
      label: '<img src=x onerror=alert(1)>',
      placeholder: '" onfocus="x',
    });
    expect(out).not.toContain('<img');
    expect(out).not.toContain('" onfocus="');
  });

  test('unknown tags render nothing, including Object.prototype keys', () => {
    expect(renderDSD('neu-nope', {})).toBe('');
    expect(renderDSD('constructor', {})).toBe('');
  });

  test('definitions lists the phase-1 tags', () => {
    expect([...definitions.keys()].sort()).toEqual(['neu-button', 'neu-switch', 'neu-text-field']);
  });
});
```

Run: `BROWSERS=chromium pnpm --filter @neu-ui/elements test`
Expected: FAIL — không resolve được `./all.js` và `./ssr.js`.

- [ ] **Step 2: Cài đặt các entry**

`packages/elements/src/all.ts`:
```ts
export * from './button.js';
export * from './switch.js';
export * from './text-field.js';
```

`packages/elements/src/ssr.ts`:
```ts
import { buttonDef } from './components/button/button.def.js';
import { switchDef } from './components/switch/switch.def.js';
import { textFieldDef } from './components/text-field/text-field.def.js';
import type { ComponentDef } from './core/define.js';
import { parseProps } from './core/props.js';

export type { ComponentDef, ComponentDocs, DocEntry, FormDef } from './core/define.js';
export type { InferProps, PropDecl, PropsSchema, PropValue } from './core/props.js';
export {
  attributeName,
  coerceProperty,
  parseAttribute,
  parseProps,
  serializeAttribute,
} from './core/props.js';

/** Every component definition by tag. DOM-free: safe to import in Node. */
export const definitions: ReadonlyMap<string, ComponentDef> = /* @__PURE__ */ new Map<
  string,
  ComponentDef
>([
  [buttonDef.tag, buttonDef],
  [switchDef.tag, switchDef],
  [textFieldDef.tag, textFieldDef],
]);

/** Inner HTML of a declarative shadow root: inline styles, then the template. */
export function renderShadowContents(
  def: ComponentDef,
  attrs: Readonly<Record<string, string>>,
): string {
  const props = parseProps(def.props, (name) => (Object.hasOwn(attrs, name) ? attrs[name]! : null));
  return `<style data-neu-ssr>${def.styles}</style>${def.template(props).value}`;
}

/** The `<template shadowrootmode>` for one element, or '' for tags this library does not own. */
export function renderDSD(tag: string, attrs: Readonly<Record<string, string>>): string {
  const def = definitions.get(tag.toLowerCase());
  if (!def) return '';
  const delegates = def.delegatesFocus ? ' shadowrootdelegatesfocus' : '';
  return `<template shadowrootmode="open"${delegates}>${renderShadowContents(def, attrs)}</template>`;
}
```

`packages/elements/src/cdn.ts`:
```ts
export * from './all.js';
```

- [ ] **Step 3: Chạy test SSR**

Run: `pnpm --filter @neu-ui/elements test`
Expected: PASS trên cả 3 engine.

Nếu test "matches a fresh render" fail: in ra cả hai chuỗi `innerHTML` và tìm chỗ khác nhau. Template phải tất định, và `update()` không được thêm hay bớt attribute bên trong shadow lúc hydrate. Sửa template hoặc `update()`, **không** nới lỏng test.

- [ ] **Step 4: Cấu hình build**

`packages/elements/tsconfig.build.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts", "src/test-utils", "src/core/env.d.ts"]
}
```

`packages/elements/scripts/build-cdn.mjs`:
```js
import { build } from 'esbuild';

await build({
  entryPoints: ['src/cdn.ts'],
  outfile: 'cdn/neu.min.js',
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['chrome125', 'firefox126', 'safari17.4'],
  legalComments: 'none',
  logLevel: 'info',
});
```

Thay toàn bộ `packages/elements/package.json`:
```json
{
  "name": "@neu-ui/elements",
  "version": "0.0.0",
  "description": "Neumorphism UI web components",
  "license": "MIT",
  "type": "module",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/hunghdvn/neumorphism-ui.git",
    "directory": "packages/elements"
  },
  "files": ["dist", "cdn", "custom-elements.json"],
  "customElements": "custom-elements.json",
  "exports": {
    "./button.js": { "types": "./dist/button.d.ts", "default": "./dist/button.js" },
    "./switch.js": { "types": "./dist/switch.d.ts", "default": "./dist/switch.js" },
    "./text-field.js": { "types": "./dist/text-field.d.ts", "default": "./dist/text-field.js" },
    "./all.js": { "types": "./dist/all.d.ts", "default": "./dist/all.js" },
    "./ssr.js": { "types": "./dist/ssr.d.ts", "default": "./dist/ssr.js" },
    "./cdn/neu.min.js": "./cdn/neu.min.js",
    "./custom-elements.json": "./custom-elements.json",
    "./package.json": "./package.json"
  },
  "sideEffects": [
    "./dist/button.js",
    "./dist/switch.js",
    "./dist/text-field.js",
    "./dist/all.js",
    "./cdn/neu.min.js"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json && node scripts/build-cdn.mjs",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "axe-core": "4.13.0",
    "esbuild": "0.28.2"
  }
}
```

Lưu ý: `custom-elements.json` sẽ được Task 11 sinh ra. Trước lúc đó, mục này trong `files` chưa trỏ tới file nào; điều đó không gây lỗi.

Run: `pnpm --filter @neu-ui/elements build && ls packages/elements/dist packages/elements/cdn`
Expected: `dist/` có `button.js`, `switch.js`, `text-field.js`, `all.js`, `ssr.js` cùng các file `.d.ts`; `cdn/neu.min.js` tồn tại.

Run: `node -e "import('@neu-ui/elements/all.js').then(m => console.log(Object.keys(m).sort().join(',')))"` (chạy từ `packages/elements`)
Expected: `NeuButton,NeuSwitch,NeuTextField,buttonDef,switchDef,textFieldDef`, không có lỗi `HTMLElement is not defined`.

- [ ] **Step 5: Script ngân sách dung lượng**

`scripts/check-size.mjs`:
```js
// Spec §10 budgets, min+gzip, measured with esbuild + zlib.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const elements = `${root}packages/elements`;
const KB = 1024;
const gz = (text) => gzipSync(text, { level: 9 }).length;

async function bundled(contents) {
  const out = await build({
    stdin: { contents, resolveDir: `${elements}/dist`, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    target: ['chrome125', 'firefox126', 'safari17.4'],
    write: false,
    logLevel: 'silent',
  });
  return out.outputFiles[0].text;
}

const core = [
  "export { NeuElement } from './core/neu-element.js';",
  "export { FormControlElement, implicitSubmit } from './core/form-control.js';",
  "export { html, unsafeHTML } from './core/html.js';",
  "export * from './core/dom.js';",
  "export * from './core/validation.js';",
  "export { hostTheme, themeCssProperties } from './core/styles.js';",
].join('\n');

const components = [
  ['neu-button', './button.js', 'NeuButton'],
  ['neu-switch', './switch.js', 'NeuSwitch'],
  ['neu-text-field', './text-field.js', 'NeuTextField'],
];

const coreSize = gz(await bundled(core));
const rows = [
  ['cdn/neu.min.js (all components)', gz(readFileSync(`${elements}/cdn/neu.min.js`, 'utf8')), 25],
  ['@neu-ui/tokens neu.css', gz(readFileSync(`${root}packages/tokens/neu.css`, 'utf8')), 4],
  ['core (base + form + html)', coreSize, 4],
];
for (const [tag, file, name] of components) {
  const withCore = gz(await bundled(`${core}\nexport { ${name} } from '${file}';`));
  rows.push([`${tag} (without core)`, withCore - coreSize, 3]);
}

let failed = false;
for (const [label, bytes, limit] of rows) {
  const ok = bytes <= limit * KB;
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(34)} ${(bytes / KB).toFixed(2).padStart(6)} KB / ${limit} KB`);
}
process.exit(failed ? 1 : 0);
```

Thêm vào `scripts` của `package.json` gốc:
```json
"size": "node scripts/check-size.mjs"
```

và thêm `"esbuild": "0.28.2"` vào `devDependencies` gốc (script import esbuild từ thư mục gốc). Chạy `pnpm install`.

Run: `pnpm --filter @neu-ui/tokens build && pnpm --filter @neu-ui/elements build && pnpm size`
Expected: mọi dòng đều `ok`. Ghi lại các con số vào thông điệp commit.

Nếu có dòng `FAIL`: **dừng lại và báo** kèm con số. Không tự nới ngân sách; ngân sách là quyết định của spec.

- [ ] **Step 6: Commit**

```bash
pnpm format && pnpm lint
git add packages/elements scripts/check-size.mjs package.json pnpm-lock.yaml
git commit -m "feat(elements): add SSR entry, CDN bundle and size budget check"
```

---
### Task 10: `@neu-ui/ssr` (`transformHtml` + module Nuxt)

**Files:**
- Create: `packages/ssr/package.json`, `packages/ssr/tsconfig.json`, `packages/ssr/tsconfig.build.json`, `packages/ssr/vitest.config.ts`
- Create: `packages/ssr/src/transform-html.ts`, `packages/ssr/src/index.ts`, `packages/ssr/src/nuxt/module.ts`, `packages/ssr/src/nuxt/runtime/server-plugin.ts`
- Test: `packages/ssr/src/transform-html.test.ts`, `packages/ssr/src/server-safety.test.ts`

**Interfaces:**
- Consumes: `definitions`, `renderDSD` từ `@neu-ui/elements/ssr.js` (Task 9).
- Produces:
  ```ts
  // @neu-ui/ssr
  export { renderDSD } from '@neu-ui/elements/ssr.js';
  export function transformHtml(html: string): string;
  export function readStartTag(html: string, pos: number): { name: string; attrs: Record<string, string>; end: number } | null;
  export function decodeEntities(value: string): string;
  // @neu-ui/ssr/nuxt — default export: Nuxt module (configKey 'neuUi')
  ```
  - Quy tắc của `transformHtml` (spec §8.2): chèn DSD ngay sau thẻ mở của mọi tag `neu-*` đã biết; bỏ qua comment, `<script>`, `<style>`, `<textarea>`, `<title>`; bỏ qua element đã có `<template shadowrootmode>` làm con đầu tiên; không phân biệt hoa thường với tên tag; giải mã entity trong attribute; gặp HTML lỗi thì giữ nguyên, không throw.

- [ ] **Step 1: Tạo package**

`packages/ssr/package.json`:
```json
{
  "name": "@neu-ui/ssr",
  "version": "0.0.0",
  "description": "Server-side rendering helpers for neumorphism-ui",
  "license": "MIT",
  "type": "module",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/hunghdvn/neumorphism-ui.git",
    "directory": "packages/ssr"
  },
  "files": ["dist"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./nuxt": { "types": "./dist/nuxt/module.d.ts", "default": "./dist/nuxt/module.js" },
    "./package.json": "./package.json"
  },
  "sideEffects": false,
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "pnpm --filter @neu-ui/elements build && vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@neu-ui/elements": "workspace:*"
  },
  "peerDependencies": {
    "@nuxt/kit": "^4.0.0"
  },
  "peerDependenciesMeta": {
    "@nuxt/kit": { "optional": true }
  },
  "devDependencies": {
    "@nuxt/kit": "4.5.2"
  }
}
```

`packages/ssr/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "lib": ["es2023"],
    "types": ["node"]
  },
  "include": ["src"]
}
```

`packages/ssr/tsconfig.build.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": false, "outDir": "dist", "rootDir": "src" },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts"]
}
```

`packages/ssr/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
```

Run: `pnpm install`

- [ ] **Step 2: Viết test thất bại**

`packages/ssr/src/transform-html.test.ts`:
```ts
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
    for (const html of ['<neu-button', '<neu-button label="x', 'a < b', '<', '</neu-button>', '<!-- open']) {
      expect(transformHtml(html)).toBe(html);
    }
  });

  test('uses shadowrootdelegatesfocus for text fields', () => {
    expect(transformHtml('<neu-text-field></neu-text-field>')).toContain('shadowrootdelegatesfocus');
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
```

`packages/ssr/src/server-safety.test.ts`:
```ts
import { expect, test } from 'vitest';

test('every element module can be imported in Node', async () => {
  const mod = await import('@neu-ui/elements/all.js');
  expect(typeof mod.NeuButton).toBe('function');
  expect(typeof mod.NeuSwitch).toBe('function');
  expect(typeof mod.NeuTextField).toBe('function');
});
```

Run: `pnpm --filter @neu-ui/ssr test`
Expected: FAIL — không resolve được `./transform-html.js`. Test server-safety phải PASS ngay (nó kiểm tra Task 4 và Task 9).

- [ ] **Step 3: Cài đặt `transform-html.ts` và `index.ts`**

`packages/ssr/src/transform-html.ts`:
```ts
import { definitions, renderDSD } from '@neu-ui/elements/ssr.js';

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
```

`packages/ssr/src/index.ts`:
```ts
export { renderDSD } from '@neu-ui/elements/ssr.js';
export { decodeEntities, readStartTag, transformHtml, type StartTag } from './transform-html.js';
```

Run: `pnpm --filter @neu-ui/ssr test`
Expected: PASS.

- [ ] **Step 4: Module Nuxt**

`packages/ssr/src/nuxt/runtime/server-plugin.ts`:
```ts
import { transformHtml } from '../../transform-html.js';

interface RenderHtmlContext {
  body: string[];
}

interface NitroAppLike {
  hooks: { hook(name: 'render:html', fn: (html: RenderHtmlContext) => void): void };
}

/** A Nitro plugin is a plain function; defineNitroPlugin is only an identity helper. */
export default function neuUiNitroPlugin(nitroApp: NitroAppLike): void {
  nitroApp.hooks.hook('render:html', (html) => {
    html.body = html.body.map((chunk) => transformHtml(chunk));
  });
}
```

`packages/ssr/src/nuxt/module.ts`:
```ts
import { fileURLToPath } from 'node:url';
import { addPluginTemplate, addServerPlugin, createResolver, defineNuxtModule } from '@nuxt/kit';

/**
 * Registers neu-* tags as custom elements for Vue, injects declarative shadow roots into
 * server-rendered HTML, and loads the element definitions on the client. Nuxt's experimental
 * SSR streaming bypasses render:html and is not supported in v1.
 */
export default defineNuxtModule({
  meta: { name: '@neu-ui/ssr', configKey: 'neuUi' },
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url);

    const previous = nuxt.options.vue.compilerOptions.isCustomElement;
    nuxt.options.vue.compilerOptions.isCustomElement = (tag: string) =>
      tag.startsWith('neu-') || (previous?.(tag) ?? false);

    addServerPlugin(resolve('./runtime/server-plugin.js'));

    // Resolved from this package, so it works even when the app does not list @neu-ui/elements.
    const elements = fileURLToPath(import.meta.resolve('@neu-ui/elements/all.js'));
    addPluginTemplate({
      filename: 'neu-ui.client.mjs',
      mode: 'client',
      getContents: () =>
        [
          "import { defineNuxtPlugin } from '#app/nuxt';",
          `import ${JSON.stringify(elements)};`,
          'export default defineNuxtPlugin(() => {});',
          '',
        ].join('\n'),
    });
  },
});
```

Run: `pnpm --filter @neu-ui/ssr typecheck && pnpm --filter @neu-ui/ssr build`
Expected: không có lỗi; tạo ra `dist/index.js`, `dist/transform-html.js`, `dist/nuxt/module.js`, `dist/nuxt/runtime/server-plugin.js`.

Nếu typecheck báo lỗi ở `nuxt.options.vue.compilerOptions` (type của Nuxt 4.5 khác với dự kiến): đọc `node_modules/@nuxt/schema/dist/index.d.mts` để tìm đúng đường dẫn tới `compilerOptions.isCustomElement` rồi sửa cho khớp. Hành vi của module phải giữ nguyên. Module này được kiểm chứng end-to-end ở Task 13.

- [ ] **Step 5: Commit**

```bash
pnpm format && pnpm lint
git add packages/ssr pnpm-lock.yaml
git commit -m "feat(ssr): add transformHtml and Nuxt module"
```

---
### Task 11: `tools/gen` — sinh `custom-elements.json` và React wrapper

**Files:**
- Create: `tools/gen/package.json`, `tools/gen/vitest.config.ts`, `tools/gen/src/lib.mjs`, `tools/gen/src/gen.mjs`
- Test: `tools/gen/src/lib.test.mjs`
- Modify: `package.json` gốc (script `gen`)
- Generated (commit vào repo): `packages/elements/custom-elements.json`, `packages/react/src/generated/{button,switch,text-field,index}.ts`

**Interfaces:**
- Consumes: `definitions`, `attributeName` từ `@neu-ui/elements/ssr.js` (Task 9).
- Produces:
  - `tagToClassName('neu-text-field') === 'NeuTextField'`, `tagToFileBase('neu-text-field') === 'text-field'`, `eventToReactProp('neu-open') === 'onNeuOpen'`, `propTsType(decl)`.
  - `buildManifest(defs)`: object theo Custom Elements Manifest schema 2.1.0.
  - `buildReactWrapper(def)`: nội dung file `packages/react/src/generated/<file>.ts`. File gọi `createComponent<Props, Element>(ElementClass, { events })` lấy từ `../create-component.js` (Task 12), và export `Neu<Name>` cùng `type Neu<Name>Props`.
  - `buildReactIndex(defs)`: file barrel `index.ts`.
  - `pnpm gen` ghi file ra; `pnpm gen --check` exit 1 nếu file sinh ra đã lỗi thời.
  - Quy ước props của wrapper: mọi prop trong định nghĩa; thêm `defaultChecked` / `defaultValue` cho control có `form.valueProp`; event (trừ `click`) thành `on<Pascal>`: `(event: Event) => void`.

- [ ] **Step 1: Tạo package và viết test thất bại**

`tools/gen/package.json`:
```json
{
  "name": "@neu-ui/gen",
  "private": true,
  "type": "module",
  "scripts": {
    "gen": "node src/gen.mjs",
    "test": "pnpm --filter @neu-ui/elements build && vitest run"
  },
  "dependencies": {
    "@neu-ui/elements": "workspace:*"
  }
}
```

`tools/gen/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.mjs'], environment: 'node' },
});
```

`tools/gen/src/lib.test.mjs`:
```js
import { definitions } from '@neu-ui/elements/ssr.js';
import { describe, expect, test } from 'vitest';
import {
  buildManifest,
  buildReactIndex,
  buildReactWrapper,
  eventToReactProp,
  propTsType,
  tagToClassName,
  tagToFileBase,
} from './lib.mjs';

const defs = [...definitions.values()];
const switchDef = definitions.get('neu-switch');
const buttonDef = definitions.get('neu-button');

describe('naming', () => {
  test('tags, files and events map to the expected identifiers', () => {
    expect(tagToClassName('neu-text-field')).toBe('NeuTextField');
    expect(tagToFileBase('neu-text-field')).toBe('text-field');
    expect(eventToReactProp('change')).toBe('onChange');
    expect(eventToReactProp('neu-open')).toBe('onNeuOpen');
  });

  test('prop declarations map to TypeScript types', () => {
    expect(propTsType({ type: 'boolean' })).toBe('boolean');
    expect(propTsType({ type: 'number', default: 1 })).toBe('number');
    expect(propTsType({ type: 'string', values: ['sm', 'md'] })).toBe("'sm' | 'md'");
    expect(propTsType({ type: 'string' })).toBe('string');
  });
});

describe('buildReactWrapper', () => {
  test('a form control gets typed props, a default prop and event props', () => {
    const source = buildReactWrapper(switchDef);
    expect(source.split('\n')[1]).toBe("'use client';");
    expect(source).toContain("import { NeuSwitch as NeuSwitchElement } from '@neu-ui/elements/switch.js';");
    expect(source).toContain('  checked?: boolean;');
    expect(source).toContain('  defaultChecked?: boolean;');
    expect(source).toContain("  size?: 'sm' | 'md' | 'lg';");
    expect(source).toContain('  onChange?: (event: Event) => void;');
    expect(source).toContain("events: { onInput: 'input', onChange: 'change' }");
  });

  test('click stays a native React prop and is not mapped', () => {
    const source = buildReactWrapper(buttonDef);
    expect(source).not.toContain('onClick');
    expect(source).toContain('events: {}');
  });
});

describe('buildManifest', () => {
  test('declares every element with a custom-element-definition export', () => {
    const manifest = buildManifest(defs);
    expect(manifest.schemaVersion).toBe('2.1.0');
    const tags = manifest.modules.map((m) => m.declarations[0].tagName);
    expect(tags).toEqual(['neu-button', 'neu-switch', 'neu-text-field']);
    for (const mod of manifest.modules) {
      expect(mod.exports.some((e) => e.kind === 'custom-element-definition')).toBe(true);
    }
    const sw = manifest.modules[1].declarations[0];
    expect(sw.attributes.find((a) => a.name === 'checked').fieldName).toBe('defaultChecked');
  });
});

test('buildReactIndex re-exports every wrapper', () => {
  expect(buildReactIndex(defs)).toContain(
    "export { NeuTextField, type NeuTextFieldProps } from './text-field.js';",
  );
});
```

Run: `pnpm install && pnpm --filter @neu-ui/gen test`
Expected: FAIL — không resolve được `./lib.mjs`.

- [ ] **Step 2: Cài đặt `lib.mjs`**

`tools/gen/src/lib.mjs`:
```js
import { attributeName } from '@neu-ui/elements/ssr.js';

const pascal = (text) =>
  text
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

export const tagToClassName = (tag) => pascal(tag);
export const tagToFileBase = (tag) => tag.replace(/^neu-/, '');
export const eventToReactProp = (event) => `on${pascal(event)}`;

export function propTsType(decl) {
  if (decl.type === 'boolean') return 'boolean';
  if (decl.type === 'number') return 'number';
  return decl.values ? decl.values.map((value) => `'${value}'`).join(' | ') : 'string';
}

function defaultText(decl) {
  if (decl.type === 'boolean') return 'false';
  if (decl.type === 'number') return String(decl.default);
  return `'${decl.default ?? ''}'`;
}

const defaultPropOf = (valueProp) =>
  valueProp === 'checked' ? 'defaultChecked' : valueProp === 'value' ? 'defaultValue' : undefined;

/** Custom Elements Manifest 2.1.0 for IDEs, docs and Storybook-like tools. */
export function buildManifest(defs) {
  return {
    schemaVersion: '2.1.0',
    readme: '',
    modules: defs.map((def) => {
      const name = tagToClassName(def.tag);
      const path = `dist/${tagToFileBase(def.tag)}.js`;
      const valueProp = def.form?.valueProp;
      const defaultProp = defaultPropOf(valueProp);
      const attributes = Object.entries(def.props).map(([key, decl]) => ({
        name: attributeName(key, decl),
        fieldName: key === valueProp ? defaultProp : key,
        type: { text: propTsType(decl) },
        default: defaultText(decl),
      }));
      const members = Object.entries(def.props).map(([key, decl]) =>
        key === valueProp
          ? {
              kind: 'field',
              name: key,
              type: { text: propTsType(decl) },
              description: `Current ${key}. The ${attributeName(key, decl)} attribute holds the default.`,
            }
          : {
              kind: 'field',
              name: key,
              type: { text: propTsType(decl) },
              default: defaultText(decl),
              attribute: attributeName(key, decl),
              reflects: decl.reflect === true,
            },
      );
      if (defaultProp) {
        members.push({
          kind: 'field',
          name: defaultProp,
          type: { text: valueProp === 'checked' ? 'boolean' : 'string' },
          attribute: valueProp,
          reflects: true,
        });
      }
      return {
        kind: 'javascript-module',
        path,
        declarations: [
          {
            kind: 'class',
            name,
            tagName: def.tag,
            customElement: true,
            description: def.docs.summary,
            attributes,
            members,
            events: def.docs.events.map((e) => ({
              name: e.name,
              type: { text: 'Event' },
              description: e.description,
            })),
            slots: def.docs.slots.map(({ name: slot, description }) => ({ name: slot, description })),
            cssParts: def.docs.parts.map(({ name: part, description }) => ({ name: part, description })),
            cssProperties: def.docs.cssProperties.map(({ name: prop, description }) => ({
              name: prop,
              description,
            })),
          },
        ],
        exports: [
          { kind: 'js', name, declaration: { name, module: path } },
          { kind: 'custom-element-definition', name: def.tag, declaration: { name, module: path } },
        ],
      };
    }),
  };
}

export function buildReactWrapper(def) {
  const name = tagToClassName(def.tag);
  const file = tagToFileBase(def.tag);
  const defaultProp = defaultPropOf(def.form?.valueProp);
  const lines = Object.entries(def.props).map(([key, decl]) => `  ${key}?: ${propTsType(decl)};`);
  if (defaultProp === 'defaultChecked') lines.push('  defaultChecked?: boolean;');
  if (defaultProp === 'defaultValue') lines.push('  defaultValue?: string;');
  const events = def.docs.events.filter((event) => event.name !== 'click');
  for (const event of events) lines.push(`  ${eventToReactProp(event.name)}?: (event: Event) => void;`);
  const eventMap = events.map((event) => `${eventToReactProp(event.name)}: '${event.name}'`).join(', ');
  return [
    `// Generated by tools/gen from the ${def.tag} definition. Do not edit.`,
    "'use client';",
    `import { ${name} as ${name}Element } from '@neu-ui/elements/${file}.js';`,
    "import { createComponent, type WrapperProps } from '../create-component.js';",
    '',
    `interface ${name}OwnProps {`,
    ...lines,
    '}',
    '',
    `export type ${name}Props = WrapperProps<keyof ${name}OwnProps> & ${name}OwnProps;`,
    '',
    `export const ${name} = createComponent<${name}Props, ${name}Element>(${name}Element, {`,
    `  events: ${eventMap ? `{ ${eventMap} }` : '{}'},`,
    '});',
    '',
  ].join('\n');
}

export function buildReactIndex(defs) {
  const lines = defs.map((def) => {
    const name = tagToClassName(def.tag);
    return `export { ${name}, type ${name}Props } from './${tagToFileBase(def.tag)}.js';`;
  });
  return ['// Generated by tools/gen. Do not edit.', ...lines, ''].join('\n');
}
```

Run: `pnpm --filter @neu-ui/gen test`
Expected: PASS.

- [ ] **Step 3: Cài đặt `gen.mjs`**

`tools/gen/src/gen.mjs`:
```js
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { definitions } from '@neu-ui/elements/ssr.js';
import { buildManifest, buildReactIndex, buildReactWrapper, tagToFileBase } from './lib.mjs';

const check = process.argv.includes('--check');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const defs = [...definitions.values()];

const outputs = new Map([
  ['packages/elements/custom-elements.json', `${JSON.stringify(buildManifest(defs), null, 2)}\n`],
  ['packages/react/src/generated/index.ts', buildReactIndex(defs)],
  ...defs.map((def) => [
    `packages/react/src/generated/${tagToFileBase(def.tag)}.ts`,
    buildReactWrapper(def),
  ]),
]);

const stale = [];
for (const [relative, content] of outputs) {
  const file = join(root, relative);
  if (existsSync(file) && readFileSync(file, 'utf8') === content) continue;
  if (check) {
    stale.push(relative);
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    console.log(`wrote ${relative}`);
  }
}

if (stale.length > 0) {
  console.error(`Generated files are out of date:\n  ${stale.join('\n  ')}\nRun: pnpm gen`);
  process.exit(1);
}
```

Thêm vào `scripts` của `package.json` gốc:
```json
"gen": "pnpm --filter @neu-ui/elements build && pnpm --filter @neu-ui/gen run gen"
```

- [ ] **Step 4: Chạy bộ sinh và kiểm tra**

Run: `pnpm gen && pnpm gen --check`
Expected: lần đầu in ra 5 dòng `wrote …`; `--check` kết thúc với exit code 0.

Run: `head -20 packages/react/src/generated/switch.ts`
Expected: dòng 2 là `'use client';`; interface có `checked?: boolean;` và `defaultChecked?: boolean;`.

File trong `packages/react/src/generated/` sẽ được type-check ở Task 12, khi đã có `create-component.ts`.

- [ ] **Step 5: Commit**

```bash
pnpm format && pnpm lint
git add tools/gen package.json pnpm-lock.yaml packages/elements/custom-elements.json packages/react/src/generated
git commit -m "feat(gen): generate custom-elements.json and React wrappers from definitions"
```

---
### Task 12: `@neu-ui/react`

**Files:**
- Create: `packages/react/package.json`, `packages/react/tsconfig.json`, `packages/react/tsconfig.build.json`, `packages/react/vitest.config.ts`
- Create: `packages/react/src/create-component.ts`, `packages/react/src/index.ts`
- Test: `packages/react/src/create-component.test.ts` (trình duyệt, React 19 và 18), `packages/react/src/ssr.node.test.ts` (Node, React 19), `packages/react/scripts/ssr-react18.mjs` (Node, React 18), `packages/react/test/types.check.ts` (type test)

**Vì sao React 18 SSR có script riêng:** đã thử ngày 01/10/2026. Trong project Vitest môi trường node, alias `react → react18` không áp vào các lệnh `require('react')` CommonJS bên trong `react-dom18`, nên báo lỗi `Cannot read properties of undefined (reading 'ReactCurrentDispatcher')`; có `server.deps.inline` cũng vậy. Bundle bằng esbuild với `alias` thì áp được, và React 18.3.1 xuất đúng `<template shadowrootmode="open">`.

**Interfaces:**
- Consumes: `packages/react/src/generated/*` (Task 11); `ComponentDef`, `attributeName`, `coerceProperty`, `renderShadowContents`, `serializeAttribute` từ `@neu-ui/elements/ssr.js` (Task 9); các class element (Task 6–8).
- Produces:
  ```ts
  type WrapperProps<K extends PropertyKey = never> =
    Omit<React.HTMLAttributes<HTMLElement>, K> & { children?: React.ReactNode };
  interface WrapperConfig { readonly events?: Readonly<Record<string, string>> } // React prop → DOM event
  function createComponent<P extends object, E extends HTMLElement>(
    elementClass: { readonly def: ComponentDef; new (): E },
    config?: WrapperConfig,
  ): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<E>>;
  export { NeuButton, NeuSwitch, NeuTextField } (+ type …Props) từ ./generated/index.js
  ```
  - Ở client: prop của định nghĩa (cùng `defaultChecked` / `defaultValue`) được đặt bằng **property**, trong layout effect sau mỗi lần commit. Prop bị bỏ đi thì đặt về `undefined`, tức trả về giá trị mặc định. Mọi prop khác được truyền thẳng cho host.
  - Event: listener gắn vào host; chỉ xử lý event có `target === host`.
  - Controlled: nếu truyền `checked` / `value` thì sau mỗi `input` / `change`, wrapper đặt lại property theo prop trong một microtask.
  - Ở server (`typeof window === 'undefined'`): render attribute từ các prop, kèm `<template shadowrootmode="open">` làm con đầu tiên. Host luôn có `suppressHydrationWarning`.
  - Với React < 19: `className` được đổi thành `class` cho host.

- [ ] **Step 1: Tạo package**

`packages/react/package.json`:
```json
{
  "name": "@neu-ui/react",
  "version": "0.0.0",
  "description": "React wrappers for neumorphism-ui",
  "license": "MIT",
  "type": "module",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/hunghdvn/neumorphism-ui.git",
    "directory": "packages/react"
  },
  "files": ["dist"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./package.json": "./package.json"
  },
  "sideEffects": false,
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "pnpm --filter @neu-ui/elements build && vitest run && node scripts/ssr-react18.mjs",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@neu-ui/elements": "workspace:*"
  },
  "peerDependencies": {
    "react": "^18.3 || ^19",
    "react-dom": "^18.3 || ^19"
  },
  "devDependencies": {
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "esbuild": "0.28.2",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "react18": "npm:react@18.3.1",
    "react-dom18": "npm:react-dom@18.3.1"
  }
}
```

`packages/react/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "types": []
  },
  "include": ["src", "test"]
}
```

`packages/react/tsconfig.build.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": false, "outDir": "dist", "rootDir": "src" },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts"]
}
```

`packages/react/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import { browserTest } from '../../vitest.shared.ts';

/** Runs the same tests against React 18.3 by aliasing react/react-dom to the npm: aliases. */
const react18 = [
  { find: /^react$/, replacement: 'react18' },
  { find: /^react\/(.*)$/, replacement: 'react18/$1' },
  { find: /^react-dom$/, replacement: 'react-dom18' },
  { find: /^react-dom\/(.*)$/, replacement: 'react-dom18/$1' },
];

const browser = browserTest({ exclude: ['src/**/*.node.test.ts'] });

// React 18 server rendering is checked by scripts/ssr-react18.mjs (see the note at the top of this task).
export default defineConfig({
  test: {
    projects: [
      { test: { ...browser, name: 'browser-react19' } },
      { resolve: { alias: react18 }, test: { ...browser, name: 'browser-react18' } },
      { test: { name: 'node-react19', include: ['src/**/*.node.test.ts'], environment: 'node' } },
    ],
  },
});
```

`packages/react/scripts/ssr-react18.mjs`:
```js
// React 18 SSR check. Vitest's node runner cannot alias `react` inside react-dom's CommonJS
// requires, so this bundles the wrappers with esbuild aliases and runs the bundle in Node.
import assert from 'node:assert/strict';
import { rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const pkg = fileURLToPath(new URL('..', import.meta.url));
const entry = `
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { NeuSwitch, NeuTextField } from './src/index.ts';
const h = React.createElement;
export const version = React.version;
export const switchHtml = renderToString(h(NeuSwitch, { name: 'notify', defaultChecked: true, className: 'x' }, 'Notify'));
export const fieldHtml = renderToString(h(NeuTextField, { label: 'Email', defaultValue: 'a@b.co' }));
`;

const out = await build({
  stdin: { contents: entry, resolveDir: pkg, loader: 'ts' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'silent',
  alias: { react: 'react18', 'react-dom': 'react-dom18' },
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});

const file = `${pkg}ssr-react18.tmp.mjs`;
writeFileSync(file, out.outputFiles[0].text);
try {
  const result = await import(pathToFileURL(file).href);
  assert.match(result.version, /^18\.3\./);
  assert.match(result.switchHtml, /^<neu-switch /);
  assert.match(result.switchHtml, / class="x"/);
  assert.match(result.switchHtml, /<template shadowrootmode="open"><style data-neu-ssr>/);
  assert.match(result.switchHtml, /class="track on"/);
  assert.match(result.fieldHtml, /shadowrootdelegatesfocus/);
  assert.match(result.fieldHtml, /value="a@b\.co"/);
  console.log(`React ${result.version} SSR ok`);
} finally {
  rmSync(file, { force: true });
}
```

Thêm `ssr-react18.tmp.mjs` vào `.gitignore` gốc (phòng khi script bị ngắt giữa chừng).

Run: `pnpm install`

- [ ] **Step 2: Viết test thất bại**

`packages/react/src/create-component.test.ts`:
```ts
import { NeuSwitch as NeuSwitchElement } from '@neu-ui/elements/switch.js';
import type { NeuTextField as NeuTextFieldElement } from '@neu-ui/elements/text-field.js';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NeuButton, NeuSwitch, NeuTextField } from './index.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as unknown as { act: (fn: () => void | Promise<void>) => Promise<void> }).act;
const h = React.createElement;
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
});

const render = (node: React.ReactNode) => act(() => root.render(node));

test('renders the element with children, host props and a forwarded ref', async () => {
  const ref = React.createRef<NeuSwitchElement>();
  await render(h(NeuSwitch, { ref, name: 'n', className: 'x', id: 'sw' }, 'Notify'));
  const el = container.querySelector('neu-switch')!;
  expect(ref.current).toBe(el);
  expect(el).toBeInstanceOf(NeuSwitchElement);
  expect(el.textContent).toBe('Notify');
  expect(el.className).toBe('x');
  expect(el.id).toBe('sw');
  expect(el.getAttribute('name')).toBe('n');
});

test('sets definition props as properties, and resets removed ones', async () => {
  await render(h(NeuSwitch, { disabled: true, checked: true }));
  const el = container.querySelector('neu-switch') as NeuSwitchElement;
  expect(el.disabled).toBe(true);
  expect(el.checked).toBe(true);
  await render(h(NeuSwitch, { checked: true }));
  expect(el.disabled).toBe(false);
});

test('uncontrolled: defaultChecked sets the default; onChange receives the DOM event', async () => {
  const seen: boolean[] = [];
  await render(
    h(NeuSwitch, {
      defaultChecked: true,
      onChange: (event: Event) => seen.push((event.target as NeuSwitchElement).checked),
    }),
  );
  const el = container.querySelector('neu-switch') as NeuSwitchElement;
  expect(el.checked).toBe(true);
  expect(el.hasAttribute('checked')).toBe(true);
  await act(async () => {
    el.click();
    await tick();
  });
  expect(seen).toEqual([false]);
  expect(el.checked).toBe(false);
});

test('controlled: follows state, and reverts when the state does not change', async () => {
  function Controlled({ locked }: { locked: boolean }) {
    const [on, setOn] = React.useState(false);
    return h(NeuSwitch, {
      checked: on,
      onChange: () => {
        if (!locked) setOn((value) => !value);
      },
    });
  }
  await render(h(Controlled, { locked: false }));
  const el = container.querySelector('neu-switch') as NeuSwitchElement;
  await act(async () => {
    el.click();
    await tick();
  });
  expect(el.checked).toBe(true);
  await render(h(Controlled, { locked: true }));
  await act(async () => {
    el.click();
    await tick();
  });
  expect(el.checked).toBe(true);
});

test('controlled text field transforms what the user types', async () => {
  function Upper() {
    const [value, setValue] = React.useState('a');
    return h(NeuTextField, {
      label: 'L',
      value: value.toUpperCase(),
      onInput: (event: Event) => setValue((event.target as NeuTextFieldElement).value),
    });
  }
  await render(h(Upper));
  const el = container.querySelector('neu-text-field') as NeuTextFieldElement;
  expect(el.value).toBe('A');
  await act(async () => {
    el.focus();
    await userEvent.keyboard('b');
    await tick();
  });
  expect(el.value).toBe('AB');
});

test('button: React onClick works and type=submit submits the form', async () => {
  let clicks = 0;
  let submits = 0;
  await render(
    h(
      'form',
      {
        onSubmit: (event: React.FormEvent) => {
          event.preventDefault();
          submits++;
        },
      },
      h(NeuButton, { type: 'submit', onClick: () => clicks++ }, 'Go'),
    ),
  );
  await act(async () => {
    (container.querySelector('neu-button') as HTMLElement).click();
  });
  expect([clicks, submits]).toEqual([1, 1]);
});
```

`packages/react/src/ssr.node.test.ts`:
```ts
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { expect, test } from 'vitest';
import { NeuButton, NeuSwitch, NeuTextField } from './index.js';

const h = React.createElement;

test('a switch renders attributes and a declarative shadow root', () => {
  const html = renderToString(h(NeuSwitch, { name: 'notify', defaultChecked: true }, 'Notify'));
  expect(html.startsWith('<neu-switch')).toBe(true);
  expect(html).toMatch(/ checked(="[^"]*")?[ >]/);
  expect(html).toContain('name="notify"');
  expect(html).toContain('<template shadowrootmode="open"><style data-neu-ssr>');
  expect(html).toContain('class="track on"');
  expect(html.endsWith('</template>Notify</neu-switch>')).toBe(true);
});

test('a text field delegates focus and pre-fills its input', () => {
  const html = renderToString(h(NeuTextField, { label: 'Email', defaultValue: 'a@b.co' }));
  expect(html).toContain('shadowrootdelegatesfocus');
  expect(html).toContain('value="a@b.co"');
  expect(html).toContain('>Email</span>');
});

test('a button forwards its variant and escapes hostile values', () => {
  const html = renderToString(h(NeuButton, { variant: 'primary', title: '"><script>' }, 'Save'));
  expect(html).toContain('variant="primary"');
  expect(html).not.toContain('"><script>');
});
```

`packages/react/test/types.check.ts`:
```ts
// Type-only checks, run by `pnpm typecheck`. Never executed.
import * as React from 'react';
import { NeuButton, NeuSwitch, NeuTextField } from '../src/index.js';

const h = React.createElement;

h(NeuSwitch, { checked: true, size: 'sm', onChange: (event: Event) => void event });
h(NeuButton, { variant: 'primary', type: 'submit', onClick: () => undefined });
h(NeuTextField, { label: 'Email', type: 'email', defaultValue: 'a', maxLength: 10 });

// @ts-expect-error size only accepts sm | md | lg
h(NeuSwitch, { size: 'xl' });
// @ts-expect-error variant is a closed set
h(NeuButton, { variant: 'danger' });
// @ts-expect-error checked must be a boolean
h(NeuSwitch, { checked: 'yes' });
```

Run: `BROWSERS=chromium pnpm --filter @neu-ui/react test`
Expected: FAIL — không resolve được `./index.js` (hoặc `../create-component.js` trong file sinh ra).

- [ ] **Step 3: Cài đặt `create-component.ts` và `index.ts`**

`packages/react/src/create-component.ts`:
```ts
'use client';
import {
  attributeName,
  coerceProperty,
  renderShadowContents,
  serializeAttribute,
  type ComponentDef,
} from '@neu-ui/elements/ssr.js';
import * as React from 'react';

export type WrapperProps<K extends PropertyKey = never> = Omit<React.HTMLAttributes<HTMLElement>, K> & {
  children?: React.ReactNode;
};

export interface WrapperConfig {
  /** React prop name → DOM event name, e.g. { onChange: 'change' }. */
  readonly events?: Readonly<Record<string, string>>;
}

interface ElementClass<E extends HTMLElement> {
  readonly def: ComponentDef;
  new (): E;
}

const isServer = typeof window === 'undefined';
const useIsomorphicLayoutEffect = isServer ? React.useEffect : React.useLayoutEffect;
const needsClassAttribute = Number.parseInt(React.version, 10) < 19;

export function createComponent<P extends object, E extends HTMLElement>(
  elementClass: ElementClass<E>,
  config: WrapperConfig = {},
): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<E>> {
  const def = elementClass.def;
  const events = config.events ?? {};
  const valueProp = def.form?.valueProp;
  const defaultProp =
    valueProp === 'checked' ? 'defaultChecked' : valueProp === 'value' ? 'defaultValue' : undefined;
  const elementKeys = new Set(Object.keys(def.props));
  if (defaultProp) elementKeys.add(defaultProp);

  const Wrapper = React.forwardRef<E, P>(function NeuWrapper(props, forwardedRef) {
    const elementRef = React.useRef<E | null>(null);
    const { children, ...rest } = props as unknown as Record<string, unknown> & {
      children?: React.ReactNode;
    };

    const host: Record<string, unknown> = {};
    const element: Record<string, unknown> = {};
    const handlers: Record<string, (event: Event) => void> = {};
    for (const [key, value] of Object.entries(rest)) {
      const eventName = Object.hasOwn(events, key) ? events[key] : undefined;
      if (eventName !== undefined) {
        if (typeof value === 'function') handlers[eventName] = value as (event: Event) => void;
      } else if (elementKeys.has(key)) {
        element[key] = value;
      } else {
        host[key] = value;
      }
    }
    if (needsClassAttribute && 'className' in host) {
      host.class = host.className;
      delete host.className;
    }

    const latest = React.useRef(element);
    latest.current = element;
    const handlersRef = React.useRef(handlers);
    handlersRef.current = handlers;
    const applied = React.useRef(new Set<string>());

    // Properties after every commit. Defaults go first so a controlled value set in the same pass wins.
    useIsomorphicLayoutEffect(() => {
      const node = elementRef.current as unknown as Record<string, unknown> | null;
      if (!node) return;
      for (const key of applied.current) {
        if (element[key] === undefined) node[key] = undefined;
      }
      const next = new Set<string>();
      const keys = Object.keys(element).sort(
        (a, b) => Number(b === defaultProp) - Number(a === defaultProp),
      );
      for (const key of keys) {
        const value = element[key];
        if (value === undefined) continue;
        next.add(key);
        if (node[key] !== value) node[key] = value;
      }
      applied.current = next;
    });

    const eventNames = Object.keys(handlers).sort().join(' ');
    useIsomorphicLayoutEffect(() => {
      const node = elementRef.current;
      if (!node) return;
      const names = new Set(eventNames === '' ? [] : eventNames.split(' '));
      if (valueProp) {
        names.add('input');
        names.add('change');
      }
      const listener = (event: Event) => {
        if (event.target !== node) return;
        handlersRef.current[event.type]?.(event);
        if (!valueProp) return;
        // Controlled: once React has had a chance to re-render, snap back to the prop.
        queueMicrotask(() => {
          const wanted = latest.current[valueProp];
          const current = elementRef.current as unknown as Record<string, unknown> | null;
          if (current && wanted !== undefined && current[valueProp] !== wanted) {
            current[valueProp] = wanted;
          }
        });
      };
      for (const name of names) node.addEventListener(name, listener);
      return () => {
        for (const name of names) node.removeEventListener(name, listener);
      };
    }, [eventNames]);

    const setRef = React.useCallback(
      (node: E | null) => {
        elementRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    const serverAttributes: Record<string, string> = {};
    let template: React.ReactElement | null = null;
    if (isServer) {
      for (const [key, decl] of Object.entries(def.props)) {
        const raw =
          key === valueProp && element[key] === undefined && defaultProp
            ? element[defaultProp]
            : element[key];
        if (raw === undefined) continue;
        const attribute = serializeAttribute(decl, coerceProperty(decl, raw));
        if (attribute !== null) serverAttributes[attributeName(key, decl)] = attribute;
      }
      const templateProps: Record<string, unknown> = {
        shadowrootmode: 'open',
        dangerouslySetInnerHTML: { __html: renderShadowContents(def, serverAttributes) },
      };
      if (def.delegatesFocus) templateProps.shadowrootdelegatesfocus = '';
      template = React.createElement('template', templateProps);
    }

    const hostProps: Record<string, unknown> = {
      ...host,
      ...serverAttributes,
      ref: setRef,
      suppressHydrationWarning: true,
    };
    return React.createElement(def.tag, hostProps, template, children);
  });

  Wrapper.displayName = def.tag;
  return Wrapper as unknown as React.ForwardRefExoticComponent<
    React.PropsWithoutRef<P> & React.RefAttributes<E>
  >;
}
```

`packages/react/src/index.ts`:
```ts
export * from './generated/index.js';
export { createComponent, type WrapperConfig, type WrapperProps } from './create-component.js';
```

- [ ] **Step 4: Chạy test và typecheck**

Run: `pnpm --filter @neu-ui/react test && pnpm --filter @neu-ui/react typecheck`
Expected: PASS ở cả 3 project Vitest (browser-react19 và browser-react18 trên 3 engine, node-react19), rồi script in `React 18.3.1 SSR ok`. Typecheck pass, kể cả 3 dòng `@ts-expect-error` (tức là sai type thật sự bị bắt).

Nếu test ở `browser-react18` fail chỉ vì `className` / `class`: kiểm tra `needsClassAttribute`.

- [ ] **Step 5: Build và commit**

Run: `pnpm --filter @neu-ui/react build && head -3 packages/react/dist/generated/switch.js`
Expected: dòng 2 của file JS là directive `use client` (dấu nháy đơn hay kép đều được).

```bash
pnpm format && pnpm lint
git add packages/react pnpm-lock.yaml .gitignore
git commit -m "feat(react): add React wrappers with SSR and controlled props"
```

---
### Task 13: Example Next/Nuxt và e2e cho cổng SSR

**Files:**
- Create: `apps/examples/next/{package.json,next.config.ts,tsconfig.json}`, `apps/examples/next/app/{layout.tsx,page.tsx,demo-form.tsx,slow-switch.tsx}`
- Create: `apps/examples/nuxt/{package.json,nuxt.config.ts,tsconfig.json}`, `apps/examples/nuxt/app/app.vue`
- Create: `e2e/ssr-config.ts`, `e2e/ssr.spec.ts`, `playwright.ssr-prod.config.ts`, `playwright.ssr-dev.config.ts`
- Create: `scripts/measure-ssr-html.mjs`
- Modify: `package.json` gốc (scripts + devDependency `@playwright/test`)

**Interfaces:**
- Consumes: `@neu-ui/react` (Task 12), `@neu-ui/ssr/nuxt` (Task 10), `@neu-ui/tokens/neu.css` (Task 3), `@neu-ui/elements` (Task 9).
- Produces:
  - Next: prod ở cổng 3100, dev ở cổng 3101. Nuxt: prod ở cổng 3200, dev ở cổng 3201.
  - Hai trang có cùng cấu trúc test id: `form`, `email` (`neu-text-field` với `name="email"`, `label="Email"`, `type="email"`, giá trị mặc định `a@b.co`), `notify` (`neu-switch` với `name="notify"`, mặc định bật, nhãn "Notifications"), `save` (`neu-button type="submit"`, nhãn "Save"), `result` (`<pre>` hiển thị `JSON.stringify(Object.fromEntries(new FormData(form)))` sau khi submit). Riêng Next có thêm `late`: một `neu-switch` được stream sau 400ms qua `<Suspense>`.
  - Lệnh: `pnpm examples:build`, `pnpm test:ssr:prod`, `pnpm test:ssr:dev`, `pnpm measure:ssr <url...>`.

- [ ] **Step 1: Example Next.js**

`apps/examples/next/package.json`:
```json
{
  "name": "next-example",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --port 3101",
    "build": "next build",
    "start": "next start --port 3100"
  },
  "dependencies": {
    "@neu-ui/elements": "workspace:*",
    "@neu-ui/react": "workspace:*",
    "@neu-ui/tokens": "workspace:*",
    "next": "16.3.8",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "typescript": "6.0.3"
  }
}
```

`apps/examples/next/next.config.ts`:
```ts
import type { NextConfig } from 'next';

const config: NextConfig = { reactStrictMode: true };

export default config;
```

`apps/examples/next/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2023"],
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`apps/examples/next/app/layout.tsx`:
```tsx
import '@neu-ui/tokens/neu.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'neu-ui SSR gate (Next.js)',
  icons: { icon: 'data:,' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-neu-theme="light">
      <body style={{ margin: 0, padding: 32, fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  );
}
```

`apps/examples/next/app/page.tsx`:
```tsx
import { Suspense } from 'react';
import { DemoForm } from './demo-form';
import { SlowSwitch } from './slow-switch';

/** Rendered per request so the Suspense boundary really streams. */
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <main>
      <h1>SSR gate</h1>
      <DemoForm />
      <Suspense fallback={<p data-testid="fallback">Loading…</p>}>
        <SlowSwitch />
      </Suspense>
    </main>
  );
}
```

`apps/examples/next/app/demo-form.tsx`:
```tsx
'use client';
import { NeuButton, NeuSwitch, NeuTextField } from '@neu-ui/react';
import { useState, type FormEvent } from 'react';

export function DemoForm() {
  const [result, setResult] = useState('');
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))));
  }
  return (
    <form data-testid="form" onSubmit={onSubmit} style={{ display: 'grid', gap: 16, maxWidth: 360 }}>
      <NeuTextField data-testid="email" name="email" label="Email" type="email" defaultValue="a@b.co" />
      <NeuSwitch data-testid="notify" name="notify" defaultChecked>
        Notifications
      </NeuSwitch>
      <NeuButton data-testid="save" type="submit" variant="primary">
        Save
      </NeuButton>
      <pre data-testid="result">{result}</pre>
    </form>
  );
}
```

`apps/examples/next/app/slow-switch.tsx`:
```tsx
import { NeuSwitch } from '@neu-ui/react';

/** Streams in after the shell, usually after the element definitions have loaded. */
export async function SlowSwitch() {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return (
    <NeuSwitch data-testid="late" name="late">
      Streamed switch
    </NeuSwitch>
  );
}
```

- [ ] **Step 2: Example Nuxt**

`apps/examples/nuxt/package.json`:
```json
{
  "name": "nuxt-example",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nuxt dev --port 3201",
    "build": "nuxt build"
  },
  "dependencies": {
    "@neu-ui/elements": "workspace:*",
    "@neu-ui/ssr": "workspace:*",
    "@neu-ui/tokens": "workspace:*",
    "nuxt": "4.5.2",
    "vue": "3.5.43"
  }
}
```

`apps/examples/nuxt/nuxt.config.ts`:
```ts
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  modules: ['@neu-ui/ssr/nuxt'],
  css: ['@neu-ui/tokens/neu.css'],
  app: {
    head: {
      title: 'neu-ui SSR gate (Nuxt)',
      htmlAttrs: { lang: 'en', 'data-neu-theme': 'light' },
      link: [{ rel: 'icon', href: 'data:,' }],
    },
  },
});
```

`apps/examples/nuxt/tsconfig.json`:
```json
{
  "extends": "./.nuxt/tsconfig.json"
}
```

Không thêm `postinstall: nuxt prepare`. Lệnh đó nạp module `@neu-ui/ssr/nuxt`, mà module này chỉ có sau khi build; trên một bản clone mới, `pnpm install` sẽ fail. Thư mục `.nuxt/` được tạo khi chạy `nuxt build` hoặc `nuxt dev`.

`next build` có thể tự sửa `apps/examples/next/tsconfig.json` (ví dụ đổi `jsx`, thêm mục vào `include`). Nếu vậy, commit luôn phần thay đổi đó.

`apps/examples/nuxt/app/app.vue`:
```vue
<script setup lang="ts">
import { ref } from 'vue';

const result = ref('');

function onSubmit(event: Event) {
  const form = event.currentTarget as HTMLFormElement;
  result.value = JSON.stringify(Object.fromEntries(new FormData(form)));
}
</script>

<template>
  <main style="padding: 32px; font-family: system-ui, sans-serif">
    <h1>SSR gate</h1>
    <form
      data-testid="form"
      style="display: grid; gap: 16px; max-width: 360px"
      @submit.prevent="onSubmit"
    >
      <neu-text-field data-testid="email" name="email" label="Email" type="email" value="a@b.co" />
      <neu-switch data-testid="notify" name="notify" checked>Notifications</neu-switch>
      <neu-button data-testid="save" type="submit" variant="primary">Save</neu-button>
      <pre data-testid="result">{{ result }}</pre>
    </form>
  </main>
</template>
```

Lưu ý: `<main>` của Nuxt có `padding: 32px`, `body` của Next có `padding: 32`. Hai trang không cần trùng pixel với nhau; mỗi trang chỉ so với chính nó (có JS và không có JS).

Thêm vào `.gitignore` gốc nếu chưa có: `.nuxt/`, `.output/` (đã có từ trước) và `.next/` (đã có).

Run: `pnpm install && pnpm build && pnpm --filter next-example build && pnpm --filter nuxt-example build`
Expected: cả hai app build thành công; có `apps/examples/nuxt/.output/server/index.mjs`.

- [ ] **Step 3: Cấu hình Playwright cho cổng SSR**

Thêm `"@playwright/test": "1.63.0"` vào `devDependencies` gốc, và thêm vào `scripts` gốc:
```json
"examples:build": "pnpm --filter next-example build && pnpm --filter nuxt-example build",
"test:ssr:prod": "playwright test -c playwright.ssr-prod.config.ts",
"test:ssr:dev": "playwright test -c playwright.ssr-dev.config.ts",
"measure:ssr": "node scripts/measure-ssr-html.mjs"
```

`e2e/ssr-config.ts`:
```ts
import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

export type Mode = 'prod' | 'dev';
export type Target = 'next' | 'nuxt';

const browsers = [
  ['chromium', devices['Desktop Chrome']],
  ['firefox', devices['Desktop Firefox']],
  ['webkit', devices['Desktop Safari']],
] as const;

/** One project per browser × framework; the framework is in project.metadata.target. */
export function ssrConfig(mode: Mode): PlaywrightTestConfig {
  const ports: Record<Target, number> =
    mode === 'prod' ? { next: 3100, nuxt: 3200 } : { next: 3101, nuxt: 3201 };
  const servers =
    mode === 'prod'
      ? [
          { command: 'pnpm --filter next-example start', port: ports.next },
          {
            command: 'node .output/server/index.mjs',
            cwd: 'apps/examples/nuxt',
            env: { PORT: String(ports.nuxt) },
            port: ports.nuxt,
          },
        ]
      : [
          { command: 'pnpm --filter next-example dev', port: ports.next },
          { command: 'pnpm --filter nuxt-example dev', port: ports.nuxt },
        ];
  return defineConfig({
    testDir: 'e2e',
    testMatch: 'ssr.spec.ts',
    timeout: 60_000,
    retries: process.env.CI ? 1 : 0,
    reporter: [['list']],
    use: { trace: 'retain-on-failure' },
    projects: browsers.flatMap(([browser, device]) =>
      (['next', 'nuxt'] as const).map((target) => ({
        name: `${target}-${mode}-${browser}`,
        metadata: { target, mode },
        use: { ...device, baseURL: `http://localhost:${ports[target]}` },
      })),
    ),
    webServer: servers.map((server) => ({
      ...server,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    })),
  });
}
```

`playwright.ssr-prod.config.ts`:
```ts
import { ssrConfig } from './e2e/ssr-config.ts';

export default ssrConfig('prod');
```

`playwright.ssr-dev.config.ts`:
```ts
import { ssrConfig } from './e2e/ssr-config.ts';

export default ssrConfig('dev');
```

- [ ] **Step 4: Viết spec cho cổng SSR (spec §8.6)**

`e2e/ssr.spec.ts`:
```ts
import { expect, test, type Page } from '@playwright/test';

const TAGS = ['neu-text-field', 'neu-switch', 'neu-button'] as const;

const target = () => test.info().project.metadata.target as 'next' | 'nuxt';

/** Rounded boxes of the three form components, used to compare layouts. */
function boxes(page: Page) {
  return page.evaluate((tags) => {
    return tags.map((tag) => {
      const r = document.querySelector(`form ${tag}`)!.getBoundingClientRect();
      return [tag, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    });
  }, [...TAGS]);
}

async function waitForHydration(page: Page) {
  await page.waitForFunction((tags) => tags.every((tag) => customElements.get(tag)), [...TAGS]);
  await page.waitForLoadState('networkidle');
}

test('1. no hydration errors or warnings', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    const hydration = /hydrat|mismatch/i.test(text);
    if (message.type() === 'error' || (message.type() === 'warning' && hydration)) {
      problems.push(`${message.type()}: ${text}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  await page.goto('/');
  await waitForHydration(page);
  if (target() === 'next') await expect(page.getByTestId('late')).toBeAttached();
  expect(problems).toEqual([]);
});

test('2. server HTML renders the components without JavaScript, with the same layout', async ({
  browser,
}) => {
  const baseURL = test.info().project.use.baseURL;
  const noJs = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await noJs.newPage();
  await page.goto('/');
  const state = await page.evaluate((tags) => {
    const sw = document.querySelector('form neu-switch')!;
    return {
      defined: tags.some((tag) => customElements.get(tag) !== undefined),
      shadow: tags.map((tag) => document.querySelector(`form ${tag}`)?.shadowRoot !== null),
      trackOn: sw.shadowRoot?.querySelector('.track')?.classList.contains('on') ?? false,
      trackShadow: getComputedStyle(sw.shadowRoot!.querySelector('.track')!).boxShadow,
      buttonVisibility: getComputedStyle(document.querySelector('form neu-button')!).visibility,
    };
  }, [...TAGS]);
  expect(state.defined).toBe(false);
  expect(state.shadow).toEqual([true, true, true]);
  expect(state.trackOn).toBe(true);
  expect(state.trackShadow).not.toBe('none');
  expect(state.buttonVisibility).toBe('visible');
  const withoutJs = await boxes(page);
  await noJs.close();

  const withJs = await browser.newContext({ baseURL });
  const hydrated = await withJs.newPage();
  await hydrated.goto('/');
  await waitForHydration(hydrated);
  expect(await boxes(hydrated)).toEqual(withoutJs);
  await withJs.close();
});

test('3. hydration causes no layout shift (Chromium Layout Instability API)', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'layout-shift entries exist only in Chromium; test 2 covers the others');
  await page.goto('/');
  await waitForHydration(page);
  const cls = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as unknown as { value: number; hadRecentInput: boolean };
            if (!shift.hadRecentInput) total += shift.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(total), 500);
      }),
  );
  expect(cls).toBe(0);
});

test('4. interaction and form submission work after hydration', async ({ page }) => {
  await page.goto('/');
  await waitForHydration(page);
  await page.getByTestId('email').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('x@y.zz');
  await page.getByTestId('notify').click();
  await page.getByTestId('save').click();
  await expect(page.getByTestId('result')).toHaveText('{"email":"x@y.zz"}');
  await page.getByTestId('notify').click();
  await page.getByTestId('save').click();
  await expect(page.getByTestId('result')).toHaveText('{"email":"x@y.zz","notify":"on"}');
});

test('roles from ElementInternals reach the accessibility tree (Chromium)', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'reads the real AX tree through CDP');
  await page.goto('/');
  await waitForHydration(page);
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const find = (role: string, name: string) =>
    nodes.find((node) => node.role?.value === role && node.name?.value === name);
  const sw = find('switch', 'Notifications');
  expect(sw).toBeDefined();
  expect(String(sw!.properties?.find((p) => p.name === 'checked')?.value.value)).toBe('true');
  expect(find('button', 'Save')).toBeDefined();
  expect(find('textbox', 'Email')).toBeDefined();
});

test('streamed Suspense content keeps its declarative shadow root (Next)', async ({ page }) => {
  test.skip(target() !== 'next', 'only the Next example streams');
  await page.goto('/');
  await waitForHydration(page);
  const late = page.getByTestId('late');
  await expect(late).toBeAttached();
  const info = await late.evaluate((el) => ({
    tracks: el.shadowRoot!.querySelectorAll('.track').length,
    templateChild: el.querySelector(':scope > template') !== null,
  }));
  expect(info).toEqual({ tracks: 1, templateChild: false });
  await late.click();
  expect(await late.evaluate((el) => (el as unknown as { checked: boolean }).checked)).toBe(true);
});
```

- [ ] **Step 5: Script đo dung lượng HTML (spec §8.1)**

`scripts/measure-ssr-html.mjs`:
```js
// Spec §8.1: how much the inline declarative shadow roots add to the server HTML.
import { gzipSync } from 'node:zlib';

const DSD = /<template shadowrootmode="open"[^>]*>[\s\S]*?<\/template>/g;
const gz = (text) => gzipSync(text).length;

for (const url of process.argv.slice(2)) {
  const html = await (await fetch(url)).text();
  const stripped = html.replace(DSD, '');
  const instances = html.match(DSD)?.length ?? 0;
  console.log(url);
  console.log(`  instances: ${instances}`);
  console.log(`  raw : ${html.length} B (without DSD ${stripped.length} B, +${html.length - stripped.length} B)`);
  console.log(`  gzip: ${gz(html)} B (without DSD ${gz(stripped)} B, +${gz(html) - gz(stripped)} B)`);
}
```

- [ ] **Step 6: Chạy cổng ở chế độ production**

Run: `pnpm install && pnpm exec playwright install chromium firefox webkit && pnpm build && pnpm examples:build && pnpm test:ssr:prod`
Expected: mọi test PASS trên 6 project (`next-prod-*`, `nuxt-prod-*`). Test có `test.skip` thì hiện là skipped.

- [ ] **Step 7: Chạy cổng ở chế độ dev**

Run: `pnpm test:ssr:dev`
Expected: mọi test PASS trên 6 project (`next-dev-*`, `nuxt-dev-*`).

**Nếu một test của cổng fail: không sửa test cho qua, và không đổi sang SSR-lite.** Ghi lại framework, chế độ (prod/dev), engine, tên test và thông báo lỗi đầy đủ (với test 1 là toàn bộ console message), rồi chuyển sang Task 16 để báo cáo. Theo spec §8.6, việc chuyển một framework sang SSR-lite phải được người dùng quyết định.

Ngoại lệ được phép sửa: lỗi nằm ở chính example hoặc ở cấu hình e2e, chứ không phải ở thư viện. Ví dụ: sai cổng, `data-testid` không tới được host, sai API của Next/Nuxt. Khi sửa loại này, ghi rõ trong commit message.

- [ ] **Step 8: Commit**

```bash
pnpm format && pnpm lint
git add apps/examples e2e playwright.ssr-prod.config.ts playwright.ssr-dev.config.ts scripts/measure-ssr-html.mjs package.json pnpm-lock.yaml
git commit -m "test: add Next and Nuxt examples with SSR gate e2e"
```

---
### Task 14: Visual regression và tinh chỉnh tokens theo mockup A

**Ai làm task này:** phần tinh chỉnh (Step 3) cần đánh giá bằng mắt, nên **chỉ Claude làm, không giao cho model ngoài**. Step 1, 2 và 4 là phần cơ học.

**Files:**
- Create: `scripts/serve-static.mjs`, `e2e/visual/index.html`, `e2e/visual.spec.ts`, `playwright.visual.config.ts`
- Modify (Step 3): `packages/tokens/src/neu.css` và `packages/elements/src/core/styles.ts` (giá trị dự phòng phải luôn khớp, `styles.test.ts` kiểm tra điều này)
- Modify: `package.json` gốc (script `test:visual`)

**Interfaces:**
- Consumes: `packages/tokens/neu.css`, `packages/elements/cdn/neu.min.js` (bản build); mockup chuẩn `docs/superpowers/specs/assets/2026-10-01-mockup-accessibility.html` (card "A. Neumorphism thuần").
- Produces:
  - `node scripts/serve-static.mjs` phục vụ ở cổng 4173: `/` → `e2e/visual/`, `/tokens/` → `packages/tokens/`, `/elements/` → `packages/elements/`, `/mockup/` → `docs/superpowers/specs/assets/`.
  - Trang `e2e/visual/index.html` có 3 vùng `#light`, `#dark`, `#custom`; mỗi vùng chứa mọi trạng thái của 3 component.
  - Baseline ảnh chỉ commit cho Linux: `e2e/__screenshots__/linux/<project>/<name>.png`, sinh từ CI (Task 15).

- [ ] **Step 1: Static server và trang trạng thái**

`scripts/serve-static.mjs`:
```js
// Tiny static server for the visual-regression page. Local development only.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const mounts = [
  ['/tokens/', 'packages/tokens'],
  ['/elements/', 'packages/elements'],
  ['/mockup/', 'docs/superpowers/specs/assets'],
  ['/', 'e2e/visual'],
];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const port = Number(process.env.PORT ?? 4173);

createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const [prefix, dir] = mounts.find(([mount]) => path.startsWith(mount));
  const base = join(root, dir);
  const file = normalize(join(base, path.slice(prefix.length)));
  if (file !== base && !file.startsWith(base + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (!statSync(file).isFile()) throw new Error('not a file');
  } catch {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    'content-type': types[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`static server on http://localhost:${port}`));
```

`e2e/visual/index.html`:
```html
<!doctype html>
<html lang="en" data-neu-theme="light">
  <head>
    <meta charset="utf-8" />
    <title>Visual states</title>
    <link rel="icon" href="data:," />
    <link rel="stylesheet" href="/tokens/neu.css" />
    <script type="module" src="/elements/cdn/neu.min.js"></script>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; }
      section { padding: 24px; display: grid; gap: 20px; }
      .row { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
      .fields { display: grid; grid-template-columns: repeat(3, 240px); gap: 20px; }
      * { caret-color: transparent; }
    </style>
  </head>
  <body>
    <section id="light" class="neu-surface" data-neu-theme="light"></section>
    <section id="dark" data-neu-theme="dark"></section>
    <section id="custom" class="neu-surface" style="--neu-bg: #f5d0d8; --neu-accent: #c2185b"></section>

    <template id="states">
      <div class="row">
        <neu-button>Default</neu-button>
        <neu-button variant="primary">Primary</neu-button>
        <neu-button variant="flat">Flat</neu-button>
        <neu-button disabled>Disabled</neu-button>
        <neu-button loading>Loading</neu-button>
        <neu-button size="sm">Small</neu-button>
        <neu-button size="lg">Large</neu-button>
      </div>
      <div class="row">
        <neu-switch>Off</neu-switch>
        <neu-switch checked>On</neu-switch>
        <neu-switch disabled>Disabled off</neu-switch>
        <neu-switch disabled checked>Disabled on</neu-switch>
        <neu-switch size="sm" checked>Small</neu-switch>
        <neu-switch size="lg" checked>Large</neu-switch>
      </div>
      <div class="fields">
        <neu-text-field label="Empty" placeholder="you@example.com"></neu-text-field>
        <neu-text-field label="Filled" value="hung@example.com"></neu-text-field>
        <neu-text-field label="With help" help-text="We never share it"></neu-text-field>
        <neu-text-field label="Disabled" value="locked" disabled></neu-text-field>
        <neu-text-field data-state="invalid" label="Invalid" type="email" required error-text="Enter an email"></neu-text-field>
        <neu-text-field label="Small" size="sm" placeholder="sm"></neu-text-field>
      </div>
    </template>
    <script type="module">
      const states = document.getElementById('states');
      for (const section of document.querySelectorAll('section')) {
        section.append(states.content.cloneNode(true));
      }
    </script>
  </body>
</html>
```

`playwright.visual.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: 'visual.spec.ts',
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}',
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.001 } },
  use: { baseURL: 'http://localhost:4173', viewport: { width: 1000, height: 900 }, deviceScaleFactor: 1 },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1000, height: 900 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1000, height: 900 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1000, height: 900 } } },
  ],
  webServer: {
    command: 'node scripts/serve-static.mjs',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
  },
});
```

`e2e/visual.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() =>
    ['neu-button', 'neu-switch', 'neu-text-field'].every((tag) => customElements.get(tag)),
  );
  await page.evaluate(() => document.fonts.ready);
  // Put every "invalid" field into the user-invalid state the way a user would.
  for (const field of await page.locator('neu-text-field[data-state="invalid"]').all()) {
    await field.click();
    await page.keyboard.type('x');
    await page.keyboard.press('Tab');
  }
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(0, 0);
});

for (const theme of ['light', 'dark', 'custom']) {
  test(`${theme} theme`, async ({ page }) => {
    await expect(page.locator(`#${theme}`)).toHaveScreenshot(`${theme}.png`);
  });
}

test('keyboard focus ring', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(page.locator('#light .row').first()).toHaveScreenshot('focus.png');
});
```

Thêm vào `scripts` gốc:
```json
"test:visual": "playwright test -c playwright.visual.config.ts"
```

Run: `pnpm build && pnpm test:visual --update-snapshots`
Expected: tạo baseline cục bộ trong `e2e/__screenshots__/win32/` (hoặc `darwin/`). Thư mục này bị gitignore; chỉ dùng để so sánh trên máy.

Run lại: `pnpm test:visual`
Expected: PASS 12 test (4 × 3 engine). Nếu lần chạy thứ hai fail, nghĩa là có thứ không ổn định (animation, caret, focus). Tìm ra và sửa trang hoặc spec, rồi chạy lại.

- [ ] **Step 2: Chụp mockup và trang trạng thái để so sánh**

Chạy `node scripts/serve-static.mjs` (để chạy nền), rồi chụp hai ảnh bằng Playwright:
```bash
pnpm exec playwright screenshot --viewport-size=1280,900 "http://localhost:4173/mockup/2026-10-01-mockup-accessibility.html" mockup.png
pnpm exec playwright screenshot --viewport-size=1000,900 "http://localhost:4173/" states.png
```
Lưu hai ảnh vào scratchpad, không lưu vào repo. Lưu ý: mockup là một fragment, nên trang trông thiếu khung; chỉ so card "A. Neumorphism thuần".

- [ ] **Step 3: Tinh chỉnh (Claude đánh giá bằng mắt)**

So vùng `#light` với card A trong mockup, xét 4 điểm:
1. Độ đậm của bóng tối và bóng sáng.
2. Màu chữ và màu chữ phụ (mockup: `#7b8aa3`, `#a3b1c6`).
3. Hình dạng track và thumb của switch.
4. Mức lõm của input.

Mọi chỉnh sửa chỉ được thay đổi **giá trị**, không được thêm biến công khai mới:
- `--_neu-shade`, `--_neu-light` trong `packages/tokens/src/neu.css` (khối sáng), và giá trị dự phòng tương ứng trong `hostTheme`.
- Tỉ lệ trộn chữ (`50%` / `30%`) trong `--_neu-fg` / `--_neu-fg-muted`, ở cả hai file.
- Với theme tối: `--_neu-shade` / `--_neu-light` trong khối tối. So bằng mắt với `#dark`; mục tiêu là bóng sáng rất nhẹ (spec §5.5).

Sau mỗi lần chỉnh: `pnpm --filter @neu-ui/elements test -- src/core/styles.test.ts` (phải pass) và chụp lại `states.png`. Ghi giá trị cuối cùng cùng lý do vào commit message.

- [ ] **Step 4: Cập nhật baseline cục bộ, chạy lại toàn bộ test, commit**

Run: `pnpm build && pnpm test:visual --update-snapshots && pnpm test:visual && pnpm test && pnpm size`
Expected: tất cả PASS.

```bash
pnpm format && pnpm lint
git add scripts/serve-static.mjs e2e/visual e2e/visual.spec.ts playwright.visual.config.ts package.json packages/tokens/src/neu.css packages/elements/src/core/styles.ts
git commit -m "test: add visual regression page and tune tokens to mockup A"
```

Baseline Linux được sinh và commit bằng workflow `visual-baselines.yml` ở Task 15.

---
### Task 15: CI, Changesets, workflow phát hành

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/visual-baselines.yml`, `.github/workflows/release.yml`
- Create: `.changeset/config.json`, `.changeset/README.md`, `.changeset/phase-1-foundation.md`
- Modify: `package.json` gốc (devDependency `@changesets/cli`, script `changeset`, `release`); `package.json` của 4 package publish (`publishConfig`)

**Interfaces:**
- Consumes: mọi script gốc: `lint`, `build`, `gen`, `typecheck`, `test`, `size`, `examples:build`, `test:ssr:prod`, `test:ssr:dev`, `test:visual`.
- Produces:
  - CI chạy trên mỗi PR và mỗi lần push lên `main`, gồm 3 job: `checks`, `visual` (container Linux), `ssr-gate`.
  - `visual-baselines.yml` chạy tay (`workflow_dispatch`): sinh baseline Linux rồi commit lên nhánh đang chạy.
  - `release.yml`: Changesets action tạo PR "Version Packages". Chỉ publish khi PR đó được merge **và** repo có secret `NPM_TOKEN`.
  - Chế độ prerelease `next`: version kế tiếp là `1.0.0-next.0`.

**Task này không publish gì cả.** Việc publish là bước ra bên ngoài; nó chờ người dùng quyết định ở Task 16.

- [ ] **Step 1: Changesets**

Thêm vào `devDependencies` gốc: `"@changesets/cli": "2.31.1"`. Thêm vào `scripts` gốc:
```json
"changeset": "changeset",
"release": "pnpm build && changeset publish"
```
Run: `pnpm install`

`.changeset/config.json`:
```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [["@neu-ui/elements", "@neu-ui/tokens", "@neu-ui/ssr", "@neu-ui/react"]],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

`.changeset/README.md`:
```markdown
# Changesets

Run `pnpm changeset` to describe a change. The four `@neu-ui/*` packages always share one version.
While in `next` pre mode, releases are published as `1.0.0-next.N` under the `next` dist-tag.
```

`.changeset/phase-1-foundation.md`:
```markdown
---
'@neu-ui/elements': major
'@neu-ui/tokens': major
'@neu-ui/ssr': major
'@neu-ui/react': major
---

Phase 1: theme tokens, the NeuElement base class, neu-button, neu-switch, neu-text-field,
SSR helpers (renderDSD, transformHtml, Nuxt module) and React wrappers.
```

Run: `pnpm changeset pre enter next`
Expected: tạo `.changeset/pre.json` với `"tag": "next"`.

Run: `pnpm changeset status`
Expected: liệt kê 4 package với bump `major`; không có lỗi.

- [ ] **Step 2: `publishConfig`**

Thêm vào `package.json` của `packages/elements`, `packages/tokens`, `packages/ssr`, `packages/react`:
```json
"publishConfig": {
  "access": "public",
  "provenance": true
}
```

- [ ] **Step 3: Workflow CI**

`.github/workflows/ci.yml`:
```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm build
      - run: pnpm gen --check
      - run: pnpm typecheck
      - run: pnpm exec playwright install --with-deps chromium firefox webkit
      - run: pnpm test
      - run: pnpm size

  visual:
    runs-on: ubuntu-latest
    container: mcr.microsoft.com/playwright:v1.63.0-noble
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test:visual
        env:
          HOME: /root
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diff
          path: test-results/

  ssr-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium firefox webkit
      - run: pnpm build
      - run: pnpm examples:build
      - run: pnpm test:ssr:prod
      - run: pnpm test:ssr:dev
```

`.github/workflows/visual-baselines.yml`:
```yaml
name: Update visual baselines
on:
  workflow_dispatch:
permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    container: mcr.microsoft.com/playwright:v1.63.0-noble
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test:visual --update-snapshots
        env:
          HOME: /root
      - name: Commit baselines
        run: |
          git config --global --add safe.directory "$GITHUB_WORKSPACE"
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add e2e/__screenshots__/linux
          git diff --cached --quiet || git commit -m "test: update linux visual baselines"
          git push
```

`.github/workflows/release.yml`:
```yaml
name: Release
on:
  push:
    branches: [main]
permissions:
  contents: write
  pull-requests: write
  id-token: write
concurrency: release-${{ github.ref }}

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: pnpm
          registry-url: https://registry.npmjs.org
      - run: pnpm install --frozen-lockfile
      - uses: changesets/action@v1
        with:
          publish: pnpm release
          title: 'chore: version packages'
          commit: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 4: Kiểm tra cục bộ**

Run: `pnpm format && pnpm lint && pnpm build && pnpm gen --check && pnpm typecheck && pnpm test && pnpm size`
Expected: tất cả PASS. Đây chính là chuỗi lệnh của job `checks`.

YAML của workflow chỉ kiểm chứng được khi chạy trên GitHub. Workflow chạy lần đầu khi người dùng push (Task 16).

- [ ] **Step 5: Commit**

```bash
git add .github .changeset package.json pnpm-lock.yaml packages/*/package.json
git commit -m "ci: add CI, visual baseline and release workflows with changesets"
```

---
### Task 16: Báo cáo cổng SSR rồi DỪNG

**Ai làm task này:** Claude. Việc đánh giá và báo cáo không giao cho model ngoài.

**Files:**
- Create: `docs/superpowers/reports/<ngày chạy>-phase-1-ssr-gate.md`

**Interfaces:**
- Consumes: kết quả của Task 13 (`test:ssr:prod`, `test:ssr:dev`), Task 9 (`pnpm size`), `scripts/measure-ssr-html.mjs`.
- Produces: báo cáo, cùng một câu hỏi cho người dùng. **Không bắt đầu giai đoạn 2, không publish, không push** cho tới khi người dùng trả lời.

- [ ] **Step 1: Chạy lại toàn bộ từ trạng thái sạch**

Run: `git status --short` (phải sạch), rồi:
`pnpm install --frozen-lockfile && pnpm lint && pnpm build && pnpm gen --check && pnpm typecheck && pnpm test && pnpm size && pnpm examples:build && pnpm test:ssr:prod && pnpm test:ssr:dev`

Ghi lại kết quả từng lệnh (pass hoặc fail, số test, thông báo lỗi nếu có).

- [ ] **Step 2: Đo dung lượng HTML tăng thêm do DSD (spec §8.1)**

Chạy production server ở nền: `pnpm --filter next-example start` và `(cd apps/examples/nuxt && PORT=3200 node .output/server/index.mjs)`. Sau đó chạy:
`pnpm measure:ssr http://localhost:3100/ http://localhost:3200/`
Ghi lại kết quả, rồi tắt 2 server.

- [ ] **Step 3: Viết báo cáo**

`docs/superpowers/reports/<YYYY-MM-DD>-phase-1-ssr-gate.md` gồm:
1. Bảng 4 tiêu chí (spec §8.6) × {Next, Nuxt} × {prod, dev} × {Chromium, Firefox, WebKit}: ✅ / ❌; mỗi ô ❌ kèm thông báo lỗi.
2. Kết quả test cây accessibility (Chromium) và test streaming Suspense (Next).
3. Dung lượng HTML tăng thêm: số instance, byte thô, byte gzip, trung bình mỗi instance sau gzip.
4. Bảng ngân sách dung lượng từ `pnpm size`.
5. Giá trị tokens cuối cùng sau khi tinh chỉnh ở Task 14, và lý do.
6. Mọi sai khác so với kế hoạch đã xảy ra khi làm.
7. Đề xuất: đi tiếp giai đoạn 2, hay chuyển framework nào sang SSR-lite (chỉ khi có tiêu chí ❌).

```bash
git add docs/superpowers/reports
git commit -m "docs: add phase 1 SSR gate report"
```

- [ ] **Step 4: Báo người dùng rồi dừng**

Gửi người dùng tóm tắt báo cáo, đường dẫn tới file, và các câu hỏi cần họ quyết định:
1. Kết quả cổng SSR có chấp nhận được không? (Nếu có ❌: chuyển framework đó sang SSR-lite, hay điều tra thêm?)
2. Có push lên `origin` (github.com/hunghdvn/neumorphism-ui) không? Lần push đầu sẽ chạy CI. Job `visual` sẽ fail cho tới khi chạy tay workflow "Update visual baselines" một lần.
3. Có publish `1.0.0-next.0` không? Cần người dùng làm trước: tạo org `neu-ui` trên npmjs.com và thêm secret `NPM_TOKEN` vào repo GitHub. Khi đó merge PR "chore: version packages" do Changesets tạo ra sẽ publish.

**DỪNG ở đây.** Giai đoạn 2 cần một kế hoạch riêng (spec §14), và chỉ được viết sau khi người dùng duyệt kết quả của cổng.
