# neumorphism-ui — Giai đoạn 4b: trang docs, deploy và bản 1.0.0 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây trang docs Astro Starlight ở `apps/docs` theo spec §12, deploy lên GitHub Pages tại `https://hunghdvn.github.io/neumorphism-ui/`, rồi phát hành `1.0.0`. Trang docs gồm:
- trang cho từng component;
- khung thử theme;
- 5 trang hướng dẫn.

Điều kiện để phát hành 1.0.0 (spec §14): CI xanh toàn bộ, đúng ngân sách dung lượng.

**Architecture:** Docs là trang tĩnh.
- Một middleware Astro chạy `transformHtml` trên mọi trang HTML, cả khi dev lẫn lúc prerender. Nhờ đó mọi demo được render sẵn bằng declarative shadow DOM, đúng ý "docs tự kiểm chứng SSR" của §12.
- Bảng API đọc `@neumorphism-ui/elements/custom-elements.json`. Từ kế hoạch 4a, file này đã có description cho từng attribute và member.
- Bảng phím đọc `componentDocs` từ `@neumorphism-ui/elements/docs.js` (kế hoạch 4a, Task 3–4).
- Phía client chỉ nạp `@neumorphism-ui/elements/all.js` và `@neumorphism-ui/tokens/neu.css`.

**Tech Stack:**
- Astro và `@astrojs/starlight`, ghim đúng bản stable mới nhất lúc làm (repo ghim version chính xác, không dùng `^`).
- `prettier-plugin-astro`.
- Playwright 1.63.0 cho e2e docs.
- GitHub Actions Pages: `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`, dùng major mới nhất của từng action.

**Spec:** `docs/superpowers/specs/2026-10-01-neumorphism-ui-v1-design.md`, gồm §5 (tokens), §7, §8, §9, §10, §12, §13, §14.
**Kế hoạch trước:** `docs/superpowers/plans/2026-11-06-phase-4a-api-freeze.md`. Kế hoạch 4a phải merge xong trước khi bắt đầu.

## Global Constraints

- Docs viết bằng tiếng Anh.
- Đường dẫn gốc `base: '/neumorphism-ui'`, `site: 'https://hunghdvn.github.io'`. Mọi link nội bộ phải chạy đúng dưới base đó.
- Demo trong docs chỉ dùng HTML thuần (custom element). Ví dụ React chỉ là code block, không chạy trực tiếp.
- Mã nguồn hiển thị của demo và phần render của demo đến từ **cùng một chuỗi**, để hai bên không bao giờ lệch nhau.
- Docs không thêm runtime dependency nào cho các package `@neumorphism-ui/*`. App `apps/docs` là private.
- Không thêm required check mới cho nhánh `main`. Build và e2e của docs chạy trong job `ssr-gate`, vốn đã là required check.
- Bật GitHub Pages (Settings → Pages → Source: GitHub Actions) là **việc người dùng tự làm**; agent không đổi cài đặt repo.
- Vẫn giữ mọi Global Constraints của kế hoạch 4a.

## Review Focus

- **Base path:** link hoặc asset chạy được ở `/` khi dev nhưng hỏng dưới `/neumorphism-ui/` trên Pages. Có e2e duyệt mọi link nội bộ (Task 1, mở rộng ở Task 3).
- **Không có JavaScript:** demo phải hiện đúng nhờ declarative shadow DOM. Có e2e chạy với JS tắt (Task 1).
- **Chế độ tối:** người dùng bấm nút sáng/tối của Starlight thì demo phải đổi theo (`data-neu-theme`). Có e2e (Task 2).
- **Middleware không được chạm vào code block:** chuỗi `<neu-button>` trong code block đã được escape, nên không được sinh `shadowrootmode`. Có e2e (Task 2).
- **Snippet CDN trong docs phải khớp file đã publish.** Mã SRI tính lúc build có thể lệch với file trên npm. Có bước kiểm tra trong Task 6.

## Quyết định của kế hoạch

1. **SSR bằng middleware, không dùng hook `astro:build:done`.** Middleware chạy cả khi dev lẫn lúc prerender, nên dev và production cho ra cùng HTML. Middleware chỉ xử lý response có `content-type` là `text/html`.
2. **Phần khung của trang vẫn là của Starlight; demo nằm trong khối `.neu-surface` riêng.** `neu.css` nằm trong `@layer neu`, nên style không layer của Starlight vẫn thắng. Demo đồng bộ `data-neu-theme` với `data-theme` của Starlight bằng một `MutationObserver` nhỏ.
3. **Bảng API lấy từ `custom-elements.json`, không gọi helper của `tools/gen`.** Manifest là định dạng chuẩn, đã có type, default, `reflects` và description. Docs không phụ thuộc vào package private.
4. **Snippet CDN trong docs được tính lúc build:** version lấy từ `packages/elements/package.json`, SRI tính trên `cdn/neu.min.js` và `tokens/neu.css` vừa build. Task 6 kiểm tra snippet này khớp file trên npm sau khi publish.
5. **Thoát chế độ pre của Changesets bằng `changeset pre exit`.** Version PR do bot mở sẽ đưa cả 4 package lên đúng `1.0.0`; Task 6 kiểm tra trước trên một nhánh nháp.

---

### Task 1: Khung `apps/docs`, SSR và e2e

**Files:**
- Create: `apps/docs/package.json`, `apps/docs/astro.config.mjs`, `apps/docs/tsconfig.json`, `apps/docs/src/content.config.ts`, `apps/docs/src/middleware.ts`, `apps/docs/src/components/Head.astro`, `apps/docs/src/styles/docs.css`, `apps/docs/src/content/docs/index.mdx` (tạm), `playwright.docs.config.ts`, `e2e/docs.spec.ts`
- Modify: `pnpm-workspace.yaml` (thêm `apps/docs`), `package.json` gốc (scripts `docs:dev`, `docs:build`, `test:docs`, devDependency `prettier-plugin-astro`), `.prettierrc` (plugin), `.prettierignore` và `eslint.config.js` (bỏ qua `apps/docs/.astro/`), `.github/workflows/ci.yml` (job `ssr-gate`)

**Interfaces:**
- Produces: package `docs` (private), script `build` → `apps/docs/dist/`.
- Produces: `onRequest` trong `src/middleware.ts`, gọi `transformHtml` trên body HTML.
- Produces: `playwright.docs.config.ts` chạy `pnpm --filter docs preview --port ${DOCS_PORT ?? 4322}` làm `webServer`, với `baseURL` là `http://localhost:<port>/neumorphism-ui/`.

- [ ] **Step 1: Viết `e2e/docs.spec.ts` (fail vì chưa có app).**
  - `the home page renders a server-side shadow root without JavaScript`: tạo context có `javaScriptEnabled: false`, mở `./`. Phần tử `neu-button` đầu tiên trong `.demo` có `shadowRoot !== null` (đọc qua `evaluate`; declarative shadow DOM vẫn được parse khi tắt JS).
  - `pages load without errors`: mở `./`, không có sự kiện `pageerror` nào và không có `console.error` nào.
  - `every internal link resolves`: thu mọi `a[href^="/neumorphism-ui/"]` trên trang chủ, rồi `request.get` từng link → status 200. Task 3 mở rộng sang mọi trang.
- [ ] **Step 2: Dựng app.**
  - `astro.config.mjs`: `site`, `base`, và integration `starlight({ title: 'neumorphism-ui', customCss: ['@neumorphism-ui/tokens/neu.css', './src/styles/docs.css'], components: { Head: './src/components/Head.astro' }, social: GitHub repo })`.
  - `Head.astro`: render Head mặc định, thêm `<script>import '@neumorphism-ui/elements/all.js';</script>`.
  - `middleware.ts`: `const response = await next();` Nếu là HTML thì trả `new Response(transformHtml(await response.text()), response)`, giữ nguyên status và headers.
  - `index.mdx` tạm có một khối `<div class="demo neu-surface"><neu-button variant="primary">Save</neu-button></div>`.
- [ ] **Step 3: Cấu hình định dạng.** Thêm `prettier-plugin-astro` vào `.prettierrc` (`"plugins": ["prettier-plugin-astro"]`). ESLint và prettier bỏ qua `apps/docs/.astro/` và `apps/docs/dist/`.
- [ ] **Step 4: Nối vào CI.** Job `ssr-gate`: sau `pnpm examples:build`, thêm `pnpm docs:build`, rồi `pnpm test:docs` với `env: HOME: /root`.
- [ ] **Step 5: Chạy `pnpm install && pnpm build && pnpm docs:build && pnpm test:docs && pnpm lint`.** Expected: 3 test PASS, lint sạch.
- [ ] **Step 6: Commit** `feat(docs): Starlight app with transformHtml middleware`.

### Task 2: Thành phần docs và trang đầu tiên (Button)

**Files:**
- Create: `apps/docs/src/components/Demo.astro`, `ApiTables.astro`, `KeyboardTable.astro`, `apps/docs/src/scripts/theme-sync.ts`, `apps/docs/src/content/docs/components/button.mdx`
- Modify: `e2e/docs.spec.ts`

**Interfaces:**
- Produces: `<Demo code={string} />`. Render `<div class="demo neu-surface">` với `set:html={code}`, rồi code block (`<Code lang="html" code={code} />` của Starlight) ngay bên dưới.
- Produces: `<ApiTables tag="neu-button" />`. Đọc declaration có `tagName === tag` trong manifest và render các bảng theo thứ tự:
  - Attributes: attribute, property, type, default, reflects, description;
  - Properties: member không có `attribute`;
  - Events, Slots, CSS parts, CSS custom properties.

  Bảng nào rỗng thì bỏ.
- Produces: `<KeyboardTable tag="neu-button" />`. Đọc `componentDocs.get(tag).keyboard`; mảng rỗng thì không render gì.
- Produces: `theme-sync.ts`. Đặt `data-neu-theme` của mọi `.demo` bằng `document.documentElement.dataset.theme` (`light`/`dark`), rồi theo dõi thay đổi bằng `MutationObserver`. Được nạp trong `Head.astro`.

- [ ] **Step 1: Viết e2e fail.**
  - `the button page lists every attribute of the manifest`: lấy tập attribute của `neu-button` trong manifest (import JSON trong test); các ô cột đầu của bảng Attributes khớp đúng tập đó.
  - `code blocks are not server-rendered`: trên trang button, text của khối `pre` đầu tiên có chứa `<neu-button`, và `innerHTML` của nó không có `shadowrootmode`.
  - `demos follow the site theme`: bấm nút chọn theme của Starlight sang dark thì mọi `.demo` có `data-neu-theme="dark"`, và màu nền computed của `.demo` bằng `--neu-bg` của theme tối (`#2b2f36`).
  - `the keyboard table follows the docs`: số hàng của bảng phím bằng `componentDocs.get('neu-button').keyboard.length`.
- [ ] **Step 2: Cài đặt** các thành phần trên và `button.mdx`. Trang gồm:
  - mô tả (lấy từ `summary`);
  - demo cho variant, size, disabled, loading, prefix/suffix;
  - ví dụ React (`import { NeuButton } from '@neumorphism-ui/react'`);
  - `<KeyboardTable>` và `<ApiTables>`.
- [ ] **Step 3: Chạy `pnpm docs:build && pnpm test:docs`.** Expected: PASS.
- [ ] **Step 4: Commit** `feat(docs): demo, API and keyboard tables; button page`.

### Task 3: Trang cho 16 component còn lại

**Files:**
- Create: `apps/docs/src/content/docs/components/{icon-button,button-group,surface,divider,icon,badge,avatar,spinner,text-field,textarea,number-field,checkbox,radio-group,switch,slider,select}.mdx`
- Modify: `e2e/docs.spec.ts`, `astro.config.mjs` (sidebar)

Mỗi trang theo đúng khuôn của `button.mdx`. Nội dung riêng của từng trang:
- **`radio-group`:** gồm cả `neu-radio`. Có hai `<ApiTables>`. Ghi chú rằng radio có `value=""` thì không chọn được.
- **`select`:** gồm cả `neu-option`. Có hai `<ApiTables>`. Có demo label dùng slot. Ghi chú rằng option là dữ liệu, không phải UI.
- **`icon`:** `registerIconLibrary`, các icon có sẵn, và ghi chú `contain: paint` cắt `drop-shadow` trên `::part(svg)`.
- **`avatar`:** thứ tự dự phòng ảnh → initials → icon; không có `label` thì avatar là ảnh trang trí.
- **Mọi form control:** có một demo đặt trong `<form>`, để thấy `FormData` và `reset`.
- **Sidebar:** nhóm "Components", xếp theo bảng component trong README.

- [ ] **Step 1: Mở rộng e2e.**
  - `every component page loads without errors and lists its API`: với mỗi slug trong danh sách 17 trang, mở trang thì không có `pageerror`, và có ít nhất một bảng Attributes.
  - `every internal link resolves` chạy trên mọi trang, không chỉ trang chủ.
- [ ] **Step 2: Viết 16 trang.**
- [ ] **Step 3: Chạy `pnpm docs:build && pnpm test:docs`.** Expected: PASS.
- [ ] **Step 4: Commit** `docs: component pages`.

### Task 4: Trang hướng dẫn và khung thử theme

**Files:**
- Create: `apps/docs/src/content/docs/getting-started/installation.mdx`, `apps/docs/src/content/docs/guides/{theming,ssr,react,forms}.mdx`, `apps/docs/src/components/CdnSnippet.astro`, `apps/docs/src/components/ThemePlayground.astro`
- Modify: `apps/docs/src/content/docs/index.mdx` (splash), `e2e/docs.spec.ts`

**Interfaces:**
- Produces: `<CdnSnippet />`. Lúc build, đọc version của `packages/elements/package.json` và tính `sha384` (base64) của `packages/elements/cdn/neu.min.js` và `packages/tokens/neu.css`. Render snippet dạng giống README.
- Produces: `<ThemePlayground />`. Có các control:
  - `--neu-bg` và `--neu-accent`: `<input type="color">`;
  - `--neu-distance`: `neu-slider` 0–20 (px), mặc định 6;
  - `--neu-intensity`: `neu-slider` 0–2, step 0.1, mặc định 1;
  - `--neu-radius`: `neu-slider` 0–32 (px), mặc định 12;
  - `neu-switch` sáng/tối.

  Control áp dụng vào một khối preview chứa button, text-field, switch, checkbox, slider và surface. Bên dưới là ô CSS để chép, liệt kê đúng những biến đã đổi khác mặc định. Giá trị mặc định lấy theo §5: nền `#e0e5ec`/`#2b2f36`, accent `#6d5dfc`/`#8b7dff`. Màu chỉ ghi đè khi người dùng đã chỉnh; chưa chỉnh thì theme tối dùng màu mặc định của theme tối.

Nội dung các trang hướng dẫn:
- **installation:** npm (gói nào cho trường hợp nào), `<CdnSnippet />`, import từng component để tree-shaking, `neu.css`.
- **theming:** 5 biến; `--neu-shadow-dark/light`; `data-neu-theme`; `@layer neu`; các class tiện ích `.neu-raised` và tương tự.
- **ssr:** Next App Router, module Nuxt, các framework khác dùng `transformHtml`/`renderDSD`. Có mục Limitations chép từ README ssr: streaming của Nuxt, `RangeError`, comment chứa `</neu-select>`.
- **react:** wrapper, `onChange` khớp `input`, `defaultValue`/`defaultChecked`, controlled.
- **forms:** form-associated, `FormData`, reset, `required` và `:state(user-invalid)`, submit ngầm bằng Enter, `event.submitter === null` (dùng `<button>` native nếu cần biết nút nào submit), radio `value=""`.

- [ ] **Step 1: Viết e2e fail.**
  - `the playground updates the preview and the CSS`: đặt slider distance = 10 thì `getComputedStyle(preview).getPropertyValue('--neu-distance').trim() === '10px'`, và ô CSS có dòng `--neu-distance: 10px;`.
  - `the playground dark switch`: bật switch thì preview có `data-neu-theme="dark"`.
  - `the CDN snippet pins the package version`: trang installation có `elements@<version>/cdn/neu.min.js`, với `<version>` đọc từ `packages/elements/package.json` trong test, và `integrity` bắt đầu bằng `sha384-`.
- [ ] **Step 2: Cài đặt** các component và 5 trang.
- [ ] **Step 3: Chạy `pnpm docs:build && pnpm test:docs && pnpm lint`.** Expected: PASS.
- [ ] **Step 4: Commit** `docs: guides and theme playground`.

### Task 5: Deploy lên GitHub Pages

**Files:**
- Create: `.github/workflows/docs.yml`
- Modify: `README.md` (link tới docs, dưới các badge)

- [ ] **Step 1: Viết workflow.**
  - Chạy khi `push` lên `main` và `workflow_dispatch`.
  - `permissions: contents: read, pages: write, id-token: write`; `concurrency: { group: pages, cancel-in-progress: false }`.
  - Job `build` chạy trong `mcr.microsoft.com/playwright:v1.63.0-noble`, giống CI: checkout → pnpm → setup-node 24 → `pnpm install --frozen-lockfile` → `pnpm build` → `pnpm docs:build` → `actions/configure-pages` → `actions/upload-pages-artifact` với `path: apps/docs/dist`.
  - Job `deploy` (`needs: build`, `environment: github-pages`) dùng `actions/deploy-pages`.
- [ ] **Step 2: README:** thêm dòng `Docs: https://hunghdvn.github.io/neumorphism-ui/`.
- [ ] **Step 3: Commit** `ci: deploy the docs to GitHub Pages`.
- [ ] **Step 4 (người dùng):** sau khi PR này merge, người dùng vào Settings → Pages chọn Source = GitHub Actions, rồi chạy lại workflow `Docs`. Agent kiểm tra `curl -sI https://hunghdvn.github.io/neumorphism-ui/` trả 200, và mở `components/select/` thấy đúng trang.

### Task 6: Phát hành 1.0.0

Task này có hai cổng, đều do người dùng quyết định:

**Cổng trước khi bắt đầu:**
1. Người dùng đã chạy xong checklist screen reader (`docs/superpowers/reports/2026-11-06-screen-reader-checklist.md`), và mọi lỗi phát hiện đã được sửa hoặc ghi lại.
2. CI trên `main` xanh, `pnpm size` mọi dòng `ok`.
3. Trang docs trên Pages chạy được.

**Files:**
- Modify: `.changeset/pre.json` (do `changeset pre exit` sửa), `README.md`, `packages/*/README.md`, spec §13 (bỏ câu "Trong lúc xây…" hoặc chuyển sang thì quá khứ)
- Create: `.changeset/v1-stable.md`, `scripts/check-cdn-sri.mjs`

**Interfaces:**
- Produces: `node scripts/check-cdn-sri.mjs <version>`. Tải tarball npm của `@neumorphism-ui/tokens@<version>` và `@neumorphism-ui/elements@<version>`, tính `sha384` của `neu.css` và `cdn/neu.min.js`, so với hai giá trị `integrity` trong `README.md`. Lệch thì exit 1. Logic như script đã dùng ngày 2026-11-06 để cập nhật README cho `next.2`.

- [ ] **Step 1: Chạy thử trên nhánh nháp.**
  - `git switch -c tmp/v1-dry-run`.
  - Tạo `.changeset/v1-stable.md` như Step 2.
  - Chạy `pnpm changeset pre exit && pnpm changeset version`.
  - Kiểm tra cả 4 `package.json` có `"version": "1.0.0"`, và CHANGELOG có mục `1.0.0`. Nếu không đúng thì dừng và báo cáo.
  - Sau đó bỏ nhánh nháp: `git switch - && git branch -D tmp/v1-dry-run`.
- [ ] **Step 2: Sửa văn bản trên nhánh thật.**
  - Chạy `pnpm changeset pre exit`.
  - `.changeset/v1-stable.md` (cả 4 package, patch): "First stable release." cùng danh sách các việc để sang 1.x, lấy từ Quyết định 5 của kế hoạch 4a.
  - README gốc và README của các package:
    - bỏ dòng "Pre-release";
    - lệnh cài bỏ `@next`;
    - snippet CDN **giữ nguyên** `next.2` cho tới Step 5.
- [ ] **Step 3: Viết `scripts/check-cdn-sri.mjs`** và chạy với `1.0.0-next.2` trên README hiện tại → exit 0.
- [ ] **Step 4: PR → merge → Version PR.** Người dùng duyệt việc merge. Bot mở Version PR đưa 4 package lên `1.0.0`. CI của PR do bot mở cần người dùng duyệt cho chạy. Merge Version PR (theo lệnh của người dùng) thì workflow Release publish với dist-tag `latest`.
- [ ] **Step 5: Sau khi publish.**
  - Chờ registry trả `latest = 1.0.0` cho cả 4 package.
  - Cập nhật snippet CDN trong README sang `1.0.0` với SRI lấy từ tarball, rồi chạy `node scripts/check-cdn-sri.mjs 1.0.0` → exit 0.
  - So `<CdnSnippet />` trên trang docs đã deploy với README: hai mã SRI phải giống nhau. Nếu lệch thì sửa `CdnSnippet` để đọc SRI từ README, và ghi lý do vào commit.
  - Mở PR cho các thay đổi này.
- [ ] **Step 6 (người dùng, tuỳ chọn):** chuyển dist-tag `next` sang `1.0.0` (`npm dist-tag add @neumorphism-ui/<pkg>@1.0.0 next` cho từng package). Lệnh này cần đăng nhập npm và 2FA của người dùng.
