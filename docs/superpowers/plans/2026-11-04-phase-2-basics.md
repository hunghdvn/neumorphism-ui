# neumorphism-ui — Giai đoạn 2: nhóm Cơ bản — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gia cố base class bằng các việc dời lại từ giai đoạn 1, rồi thêm 8 component còn lại của nhóm Cơ bản: IconButton, ButtonGroup, Surface, Divider, Icon (+ `registerIconLibrary`), Badge, Avatar, Spinner. Mỗi component qua checklist §11, có visual regression, và phát hành `1.0.0-next.x`.

**Architecture:** Giữ nguyên mô hình của giai đoạn 1: mỗi component gồm định nghĩa DOM-free (`*.def.ts`, `*.styles.ts`) và class hành vi kế thừa `NeuElement`. SSR, React wrapper và `custom-elements.json` tự có khi định nghĩa được đăng ký trong `src/ssr.ts`. Không thêm gì vào core, ngoài phần gia cố ở Task 1–2. Code dùng chung cho icon nằm ở cấp component.

**Tech Stack:** Như giai đoạn 1 (TypeScript 6.0.3, pnpm 9.15.1, Vitest 5 browser mode trên Chromium/Firefox/WebKit, Playwright 1.63, esbuild 0.28, Changesets 2.31).

**Spec:** `docs/superpowers/specs/2026-10-01-neumorphism-ui-v1-design.md` (đặc biệt §6.5, §7.1, §10, §11, §14).
**Kế hoạch trước:** `docs/superpowers/plans/2026-10-01-phase-1-foundation.md`. Đọc mục "Global Constraints" của nó; mọi ràng buộc ở đó vẫn áp dụng.

## Global Constraints

- Mọi ràng buộc trong Global Constraints của kế hoạch giai đoạn 1 (trình duyệt, 0 runtime dependency, ESM, TypeScript 6.0.3, tên `@neu-ui` / `neu-`, axe tắt `color-contrast`, attribute không hợp lệ thì thay bằng mặc định trong im lặng, event `bubbles + composed` và không có event khi disabled, biến riêng có tiền tố `--_neu-`, template viết bằng `html`, mọi module import được trong Node, không khai báo instance field trùng tên prop).
- Ngân sách (min+gzip): core ≤ 4 KB (hiện 3,70); **mỗi component không tính core ≤ 3 KB**; CDN ≤ 25 KB; tokens ≤ 4 KB.
- Quy ước file của một component: `src/components/<name>/<name>.def.ts`, `<name>.styles.ts`, `<name>.ts`, `<name>.test.ts`; entry `src/<name>.ts` theo đúng mẫu của `src/button.ts` (gọi `define()`, export class và def). Tên class do `tools/gen` suy từ tag: `neu-icon-button` → `NeuIconButton`. Mỗi def có `docs` (summary, slots, parts, events) và danh sách part phải khớp đúng spec §7.1, cộng các part mà kế hoạch này thêm. `custom-elements.json` được sinh từ phần `docs` này.
- `.prettierrc.json` có `embeddedLanguageFormatting: "off"`; template viết một dòng như các component hiện có.
- Commit message kết thúc bằng trailer Co-Authored-By theo model của người thực hiện, đặt ở một đoạn riêng (dùng hai cờ `-m`).

## Quy trình đăng ký component (R1–R8)

Mọi task thêm component (Task 3–10) đều làm đủ 8 bước sau. Mỗi task chỉ ghi giá trị riêng của nó.

- **R1.** Entry `packages/elements/src/<name>.ts`, rồi thêm `export * from './<name>.js'` vào `src/all.ts`.
- **R2.** Thêm `[def.tag, def]` vào map `definitions` trong `src/ssr.ts`. Cập nhật test "definitions lists …" trong `src/ssr.test.ts` (danh sách tag đã sắp xếp), và thêm một ca vào bảng `cases` của test SSR parity (attrs, light DOM, selector `ref` của một node phải sống sót qua hydrate).
- **R3.** `packages/elements/package.json`: thêm `./<name>.js` vào `exports` (`{ types, default }` như các entry khác) và `./dist/<name>.js` vào `sideEffects`.
- **R4.** `packages/tokens/src/neu.css` (§5.6): thêm rule `:not(:defined)` cho tag với `display` và kích thước cỡ `md` như từng task ghi. Tag nằm trong danh sách "ẩn" thì thêm vào selector `visibility: hidden`. Cập nhật `packages/tokens/test/tokens.test.ts` nếu task yêu cầu.
- **R5.** `scripts/check-size.mjs`: thêm `['<tag>', './<name>.js', '<ClassName>']` vào `components`.
- **R6.** Chạy `pnpm gen` (sinh wrapper React và `custom-elements.json`). Cập nhật danh sách tag mong đợi trong `tools/gen/src/lib.test.mjs`.
- **R7.** Test của component (`<name>.test.ts`, trên 3 engine) phủ checklist §11: giá trị mặc định; attribute ↔ property và reflect; giá trị không hợp lệ thay bằng mặc định; role và tên truy cập (đọc qua `internalsOf(el)`); `axeViolations` trả về `[]`; và mọi hành vi riêng mà task liệt kê.
- **R8.** Xác minh rồi commit: `pnpm --filter @neu-ui/elements test && pnpm --filter @neu-ui/elements typecheck && pnpm gen --check && pnpm format && pnpm lint && pnpm size`. Mọi dòng của `pnpm size` phải `ok`.

## Quyết định của kế hoạch (sai khác hoặc chi tiết hóa so với spec)

1. **ButtonGroup gộp nút bằng CSS, không bằng JS.** Group dùng `::slotted(...)` để đặt biến riêng (`--_neu-grp-*`) lên các nút con. Nút con dùng các biến đó cho bóng và bo góc, có giá trị dự phòng là giá trị cũ. Spec mô tả nút con tự nhận biết vị trí bằng `closest()`; cách CSS cho cùng kết quả mà vẫn đúng khi SSR và khi tắt JS, vì không cần JS tính vị trí.
2. **IconButton là subclass của `NeuButton`, và icon render inline trong template.** Không lồng `<neu-icon>` vào bên trong, vì `renderDSD` không render DSD cho phần tử lồng nhau, nên icon sẽ không hiện khi chưa có JS. Icon thư viện `system` có sẵn trong HTML của SSR; icon thư viện khác được điền ở client.
3. **`resolve()` của icon library:** nếu trả về chuỗi bắt đầu bằng `<` (sau khi trim) thì đó là markup SVG; mọi chuỗi khác và `URL` đều được coi là URL để tải. Spec chỉ ghi "chuỗi SVG hoặc URL"; người dùng thường trả về chuỗi đường dẫn như `/icons/x.svg`.
4. **Làm sạch SVG** (ngoài các yêu cầu của spec): ngoài `<script>`, `<foreignObject>` và attribute `on*`, còn loại `href` / `xlink:href` có giá trị bắt đầu bằng `javascript:`.
5. **Placeholder §5.6 không ẩn container.** `neu-surface` và `neu-button-group` chỉ có `display`, không bị `visibility: hidden`. Ẩn chúng sẽ làm biến mất toàn bộ nội dung bên trong cho tới khi JS chạy.
6. **Divider có thêm part `base`** (spec không liệt kê part nào; §6.7 yêu cầu mọi phần nhìn thấy được đều có part).
7. **Tokens tính lại biến dẫn xuất cho cả tag `neu-surface`,** không chỉ class `.neu-surface`. Nhờ vậy class `.neu-raised` / `.neu-inset` của người dùng đặt bên trong `<neu-surface style="--neu-bg:…">` cũng khớp màu.
8. **Ngân sách core giữ 4 KB.** Các helper icon nằm ở cấp component.
9. **Không làm ở giai đoạn này** (vẫn trong backlog): bảng giải mã đủ entity (người dùng đã chọn để sau), nút submit kiểu `<input type="image">`, kế thừa `autocomplete="off"` từ form, `get form()` bị lặp giữa `NeuButton` và `FormControlElement` (đưa lên core thì tốn byte của core).
10. **Space chỉ arm sau khi keydown đã đi hết đường bubble.** Nhờ vậy, nếu một phần tử tổ tiên hủy keydown thì nút không arm, đúng như nút native. Đổi lại có một trường hợp hiếm: nếu tổ tiên gọi `stopPropagation()` mà không gọi `preventDefault()`, sự kiện không tới được `window`. Khi đó `afterDispatch` chạy ở task sau, nên `preventDefault()` đến quá muộn và trang có thể cuộn một lần. Nút vẫn arm và kích hoạt bình thường.
11. **IconButton thiếu `label` thì lấy tên icon làm tên truy cập.** Spec ghi `label` là bắt buộc; ràng buộc chung là không throw và không log. Lấy tên icon thì nút không bao giờ thiếu tên. IconButton không hỗ trợ `loading` (spec không liệt kê): accessor kế thừa từ `NeuButton` vẫn còn nhưng không có tác dụng, vì `iconButtonDef` không khai báo prop đó.

## Review Focus

1. **Đăng ký (hoặc đăng ký lại) icon library sau khi icon đã render:** các icon dùng library đó phải tự cập nhật. → Test ở Task 3.
2. **Đổi `name` liên tục trên icon thuộc library tải bằng URL:** chỉ kết quả của lần đổi cuối cùng được hiển thị, phản hồi đến muộn bị bỏ. → Test ở Task 3.
3. **SVG độc hại từ library** (`<script>`, `onload`, `href="javascript:…"`, `<foreignObject>`): bị loại bỏ trước khi chèn. → Test ở Task 3.
4. **Ảnh avatar đã lỗi từ trước khi hydrate** (SSR, sự kiện `error` đã qua): sau khi nâng cấp vẫn chuyển sang phương án dự phòng. → Test ở Task 9.
5. **Nút trong ButtonGroup vẫn có focus ring khi focus bằng bàn phím:** biến bóng của group không được làm hỏng danh sách `box-shadow`. → Test ở Task 5.

---

### Task 1: Gia cố kích hoạt và vòng đời

**Files:**
- Modify: `packages/elements/src/core/dom.ts`, `core/neu-element.ts`, `components/button/button.ts`, `components/switch/switch.ts`, `components/text-field/text-field.ts`
- Test: `core/dom.test.ts`, `core/neu-element.test.ts`, `components/button/button.test.ts`, `components/switch/switch.test.ts`, `components/text-field/text-field.test.ts`

**Interfaces:**
- Produces: `isActiveInRoot(el: Element): boolean` (đổi tên từ `hasFocusWithinTree`, hành vi giữ nguyên; cập nhật mọi chỗ gọi).

- [ ] **Step 1: Viết test thất bại**
  - `button.test.ts` / `switch.test.ts`: "a Space keydown cancelled by an ancestor in the bubble phase does not arm" (`form.addEventListener('keydown', e => e.preventDefault())`, dispatch Space keydown rồi keyup trên host → không có click, switch không đổi trạng thái); "pressed is cleared when the element regains focus" (arm bằng keydown, `blur` giả trong khi phần tử vẫn active, rồi `focus` → `:state(pressed)` tắt).
  - `neu-element.test.ts`: "formDisabledCallback runs willUpdate before update" (subclass ghi lại thứ tự gọi hook → `['willUpdate:disabled', 'update:disabled']`).
  - `neu-element.test.ts`: "while loading, an incomplete declarative root is not adopted". Giả lập `readyState = 'loading'`; gắn shadow root vào phần tử nhưng thiếu một node `data-ref` mà template có; thêm một node anh em phía sau → `renders === 0`. Thêm nốt node `data-ref` còn thiếu vào shadow root → `renders === 1`, và đúng node đó được giữ.
  - `button.test.ts`: "Space still arms when an ancestor stops propagation without cancelling". Ancestor gọi `stopPropagation()`; sau `await tick()` thì `:state(pressed)` bật, và keyup sau đó vẫn sinh click (quyết định 10).
  - `text-field.test.ts`: "rendered() tolerates a root without the input". Adopt một shadow root thiếu `<input data-ref="input">` (cùng cách giả lập `loading` như ca trên, rồi phát `DOMContentLoaded`) → không throw; set `value` sau đó cũng không throw.
- [ ] **Step 2:** `BROWSERS=chromium pnpm --filter @neu-ui/elements test` → các test trên FAIL.
- [ ] **Step 3: Cài đặt**
  - Space keydown (button và switch): không gọi `preventDefault()` ngay trong listener. Dùng `afterDispatch(event, …)`: nếu `event.defaultPrevented` thì bỏ qua; nếu chưa, gọi `event.preventDefault()` (chặn cuộn trang; vẫn hiệu lực vì nhánh qua window chạy trước default action) rồi mới arm `pressed`. Nhánh dự phòng của `afterDispatch` (sự kiện không tới `window`) vẫn arm khi `!event.defaultPrevented` (quyết định 10).
  - Trên `focus` của chính host, xóa trạng thái `pressed`.
  - `NeuTextField.rendered()` và các chỗ đọc `ref('input')` bỏ qua khi node là `null`, không throw.
  - Đổi tên `hasFocusWithinTree` thành `isActiveInRoot`.
  - `formDisabledCallback`: gọi `willUpdate(changed)` trước `update(changed)`, cùng tập `changed`.
  - `adoptRoot` khi `document.readyState === 'loading'`: số node `[data-ref]` trong root phải bằng số lần `data-ref="` xuất hiện trong `def.template(props).value`. Nếu thiếu, dùng `MutationObserver` (childList, subtree) trên chính shadow root và chờ tới khi đủ hoặc tới `DOMContentLoaded`, rồi mới chạy `rendered()` và `update(all)`. Khi không còn `loading`, giữ nguyên hành vi cũ. Mở rộng điều kiện `resume` của `waitForParser` có sẵn, không tạo observer thứ hai, để giữ ngân sách core.
- [ ] **Step 4:** Chạy lại cả gói trên 3 engine → PASS, mọi test cũ vẫn xanh. `pnpm build && pnpm size` → core ≤ 4 KB. Nếu vượt, **dừng lại và báo**; không tự nâng ngân sách (quyết định 8).
- [ ] **Step 5: Commit** `fix(elements): harden activation and declarative-root adoption`

### Task 2: Kiểu, test và công cụ còn tồn đọng

**Files:**
- Modify: `packages/elements/src/core/props.ts`, `core/props.test.ts`, `src/ssr.test.ts`, `packages/tokens/test/tokens.test.ts`, `packages/react/src/ssr.node.test.ts`, `tools/gen/src/gen.mjs`, `tools/gen/src/lib.test.mjs` (hoặc test mới cho gen), `components/button/button.ts`, `components/button/button.test.ts`, `e2e/ssr.spec.ts`

**Interfaces:**
- Produces: `PropDecl` của kiểu string tách thành hai biến thể. Có `values` thì **bắt buộc** có `default`: `{ type: 'string'; default: string; values: readonly string[]; … }`. Không có `values` thì `default` là tùy chọn: `{ type: 'string'; default?: string; values?: never; … }`.

- [ ] **Step 1: Viết test thất bại**
  - `props.test.ts`: `// @ts-expect-error values requires a default` đặt trên `{ type: 'string', values: ['a', 'b'] } satisfies PropDecl`. Test này được kiểm khi chạy `typecheck`.
  - `tokens.test.ts`: "the dark media block sets the dark defaults". Duyệt `CSSMediaRule` của stylesheet đã nạp, tìm rule có `conditionText` chứa `prefers-color-scheme: dark`; rule con với selector `:root:not([data-neu-theme='light'])` phải có `--neu-bg: #2b2f36`, `--_neu-shade: 45%`, `--_neu-light: 6%`, `--_neu-fg-mix: 42%`, `--_neu-fg-muted-mix: 24%`.
  - `ssr.test.ts`: test escaping có thêm assert khẳng định: chuỗi ra chứa `&lt;img` và `&quot;`.
  - `ssr.node.test.ts`: `NeuTextField` với `label: '"><script>x</script>'` → template chứa `&lt;script&gt;` và không chứa `<script>x`.
  - gen: một file thừa trong `packages/react/src/generated/` (ví dụ `orphan.ts`) khiến `--check` exit 1 và in tên file đó. Viết test bằng cách gọi `gen.mjs` qua `child_process` với một thư mục gốc tạm, hoặc tách phần quét ra thành hàm thuần rồi test hàm đó.
  - `button.test.ts`: "submit triggered by a neu-button exposes it as SubmitEvent.submitter". Bấm `<neu-button type="submit">` → `event.submitter === button` trong listener `submit` của form. Bấm Enter trong text field làm `.click()` vào default button đó → cũng thấy `submitter` là nó.
- [ ] **Step 2:** Chạy các test liên quan → FAIL. `typecheck` cũng FAIL vì dòng `@ts-expect-error` chưa có lỗi để bắt.
- [ ] **Step 3: Cài đặt**
  - Tách hai biến thể như mục Interfaces.
  - gen `--check` liệt kê cả file nằm trong `generated/` mà không thuộc outputs.
  - neu-button, ngay trước `form.requestSubmit()`, gắn một listener một lần, capture phase, cho sự kiện `submit` trên form. Listener đó gọi `Object.defineProperty(event, 'submitter', { value: this, configurable: true })`. Đây là cùng cách `@material/web` xử lý.
  - `e2e/ssr.spec.ts`, test "an element mounted by a client effect renders while the stream is still open": bỏ `expect(atMount.readyState).toBe('loading')` trên Chromium/Firefox. Nếu lúc mount `readyState` không còn là `loading` (stream đã đóng trước khi React mount), test tự `skip` kèm annotation ghi lý do, trên mọi engine. `loading` là điều kiện tiền đề của test chứ không phải hành vi được kiểm, nên trượt điều kiện này không được làm CI đỏ. Hành vi được kiểm vẫn giữ nguyên: `loading` ⇒ `input` đã có.
- [ ] **Step 4:** `pnpm test && pnpm typecheck && pnpm gen --check` → PASS.
- [ ] **Step 5: Commit** `fix: require defaults for enum props, expose neu-button as submitter, tighten tests`

### Task 3: Icon — bộ icon hệ thống, registry, `<neu-icon>`

**Files:**
- Create: `components/icon/system-icons.ts` (DOM-free), `components/icon/icon-registry.ts`, `components/icon/icon-loader.ts`, `icon.def.ts`, `icon.styles.ts`, `icon.ts`, `icon.test.ts`, `src/icon.ts`, `src/icons.ts`
- Áp dụng R1–R8. R3 thêm cả `./icons.js` (chỉ có `exports`, **không** vào `sideEffects`). R1 thêm cả `export * from './icons.js'` vào `src/all.ts`, nhờ vậy bản CDN (`cdn.ts` re-export `all.ts`) cũng có `registerIconLibrary`.

**Interfaces:**
- Produces (DOM-free): `systemIconSvg(name: string): string | undefined`. Trả về chuỗi `<svg part="svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">…</svg>`, với phần thân của từng icon:
  - `check`: `<path d="M5 12.5l4.5 4.5L19 7.5"/>`
  - `chevron-down`: `<path d="M6 9l6 6 6-6"/>`
  - `chevron-up`: `<path d="M6 15l6-6 6 6"/>`
  - `plus`: `<path d="M12 5v14M5 12h14"/>`
  - `minus`: `<path d="M5 12h14"/>`
  - `x`: `<path d="M6 6l12 12M18 6L6 18"/>`
  - `alert-circle`: `<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>`
  - `user`: `<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/>`
- Produces (trình duyệt, `@neu-ui/elements/icons.js`):
  - `interface IconLibrary { resolve(name: string): string | URL }`
  - `registerIconLibrary(name: string, library: IconLibrary): void`. Đăng ký lại cùng tên sẽ thay thế library cũ và báo cho mọi icon đang dùng nó tải lại.
- Produces (nội bộ): `renderIconInto(container: Element, library: string, name: string): void`. Đặt nội dung của container bằng SVG hệ thống ngay lập tức, hoặc tải bất đồng bộ cho library khác. Mỗi container có một token, để phản hồi cũ bị bỏ. Nếu `resolve` throw, library không tồn tại hay fetch lỗi, container để trống và không throw.
- `iconDef`: tag `neu-icon`; props `name` (string), `library` (string, mặc định `'system'`), `label` (string). Template là `<span class="box" data-ref="box">` chứa sẵn SVG hệ thống khi `library === 'system'`, rỗng với library khác.
- Style: `:host { display: inline-block; inline-size: 1em; block-size: 1em; vertical-align: -0.125em; color: inherit }`; `.box`, `svg { display: block; inline-size: 100%; block-size: 100% }`.
- A11y: có `label` → `internals.role = 'img'`, `ariaLabel = label`, `ariaHidden = null`. Không có → `role = null`, `ariaHidden = 'true'`.
- Bộ nhớ đệm: tải bằng `fetch`, cache markup **đã làm sạch** theo URL, parse bằng `DOMParser` (`image/svg+xml`). Làm sạch theo quyết định 4. SVG gốc nhận `part="svg"`.
- R4: `neu-icon` có trong danh sách ẩn; kích thước `display: inline-block; inline-size: 1em; block-size: 1em`.

- [ ] **Step 1: Viết test thất bại** (`icon.test.ts`)
  - "renders the system icon in the template". Thẻ `<neu-icon name="check">` có shadow chứa `svg[part=svg]`. Icon lạ hoặc `name` rỗng thì shadow trống.
  - "label gives role img and a name; no label hides it" (đọc qua `internalsOf`).
  - "URL libraries are fetched once, sanitized and cached". Stub `globalThis.fetch` để trả về một SVG có chứa `<script>`, `onload`, `<foreignObject>` và `<a href="javascript:x">`. Kết quả phải không còn cả bốn thứ đó. Hai icon cùng URL chỉ tạo một lần fetch.
  - "string markup from resolve is sanitized the same way".
  - "re-registering a library updates icons already rendered" *(Review Focus 1)*.
  - "only the latest name wins when responses arrive out of order" *(Review Focus 2)*. Fetch stub với độ trễ: tên đầu chậm, tên sau nhanh.
  - "a library that throws or fails to load leaves the icon empty without throwing".
  - Cộng các test chung của R7 (mặc định, attribute ↔ property, giá trị không hợp lệ, axe).
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Cài đặt theo mục Interfaces.
- [ ] **Step 4:** Chạy test → PASS. Kiểm tra trong Node: `node -e "import('@neu-ui/elements/ssr.js').then(m => console.log(m.renderDSD('neu-icon', { name: 'x' }).includes('<path')))"` (chạy trong `packages/elements` sau khi build) → in `true`.
- [ ] **Step 5:** R8, rồi commit `feat(elements): add neu-icon and registerIconLibrary`

### Task 4: `<neu-icon-button>`

**Files:** `components/icon-button/{icon-button.def.ts,icon-button.styles.ts,icon-button.ts,icon-button.test.ts}`, `src/icon-button.ts`. Áp dụng R1–R8.

**Interfaces:**
- Consumes: `NeuButton` (`components/button/button.ts`); `systemIconSvg` và `renderIconInto` (Task 3).
- `iconButtonDef`: tag `neu-icon-button`; props `icon` (string), `library` (string, mặc định `'system'`), `label` (string), `shape` (`circle|square`, mặc định `circle`, reflect), `variant` (`default|primary|flat`, mặc định `default`, reflect), `size` (`sm|md|lg`, mặc định `md`, reflect), `disabled` (reflect), `type` (`button|submit|reset`, mặc định `button`, reflect). Template là `<span part="base" class="base"><span part="icon" class="icon" data-ref="icon">…SVG hệ thống…</span></span>`.
- `class NeuIconButton extends NeuButton`, với `static override def = iconButtonDef`. Mọi hành vi kích hoạt (click, Enter, Space, submit, reset) được kế thừa. `update()` gọi `super.update()`, đặt `internals.ariaLabel = label || icon`, và gọi `renderIconInto(ref('icon'), library, icon)` khi `icon` hoặc `library` đổi.
- Style: đọc `button.styles.ts` và dùng chung phần base (tách ra một hằng số dùng chung nếu cần). Hình vuông cạnh 2.5rem (sm 2rem, lg 3rem); `shape=circle` thì `border-radius: 50%`; icon cỡ 1.125rem (sm 1rem, lg 1.375rem).
- R4: có trong danh sách ẩn; `display: inline-block; inline-size: 2.5rem; block-size: 2.5rem`.

- [ ] **Step 1: Viết test thất bại**
  - "is a button named by label". Kiểm `role === 'button'` và `ariaLabel === 'Close'` qua `internalsOf`; axe trả về `[]`.
  - "without a label the icon name is the accessible name" (quyết định 11): `<neu-icon-button icon="x">` cho `ariaLabel === 'x'`; set `label` thì nhãn mới thay thế.
  - "inherits activation". Enter và Space kích hoạt; `type=submit` submit form; khi disabled thì không có click.
  - "renders the system icon in SSR output". `renderDSD('neu-icon-button', { icon: 'x', label: 'Close' })` chứa `<path`.
  - "custom library icons fill in on the client" (dùng lại fetch stub của Task 3).
  - "shape and size change the box". Chiều rộng của `.base` lần lượt là 40, 32, 48 px ở md, sm, lg; `border-radius` khác nhau giữa `circle` và `square`.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Cài đặt.
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5:** R8, rồi commit `feat(elements): add neu-icon-button`

### Task 5: `<neu-button-group>`

**Files:** `components/button-group/*`, `src/button-group.ts`; sửa `button.styles.ts` và style dùng chung của icon-button. Áp dụng R1–R8.

**Interfaces:**
- `buttonGroupDef`: tag `neu-button-group`; props `label` (string), `orientation` (`horizontal|vertical`, mặc định `horizontal`, reflect). Template là `<span part="base" class="base"><slot></slot></span>`. `internals.role = 'group'`, `ariaLabel = label`.
- Biến group (quyết định 1). Style của group đặt chúng lên `::slotted(*)`:
  - `--_neu-grp-shadow: 0 0 transparent` (**không phải `none`**, để còn nối được với focus ring trong cùng danh sách `box-shadow`).
  - `--_neu-grp-ss`, `--_neu-grp-se`, `--_neu-grp-es`, `--_neu-grp-ee` (bán kính các góc start-start, start-end, end-start, end-end): mặc định `0`.
  - Chiều ngang: `::slotted(:first-child)` nhận `ss = es = var(--_neu-r)`; `::slotted(:last-child)` nhận `se = ee = var(--_neu-r)`.
  - Chiều dọc: phần tử đầu nhận `ss = se`; phần tử cuối nhận `es = ee`.
  - `.base` của group: `display: inline-flex` (dọc thì `flex-direction: column`), `box-shadow: var(--_neu-raised)`, `border-radius: var(--_neu-r)`.
- Phía nút (button và icon-button): `.base` dùng `box-shadow: var(--_neu-grp-shadow, var(--_neu-raised))` (cỡ sm dùng `…, var(--_neu-raised-sm)`) và bốn thuộc tính bo góc logic `border-*-*-radius: var(--_neu-grp-xx, <bán kính hiện tại>)`. Focus: `box-shadow: var(--_neu-grp-shadow, var(--_neu-raised)), var(--_neu-focus)`. Đứng ngoài group thì kết quả render **giữ nguyên như cũ**.
- R4: `neu-button-group` **không** ẩn (quyết định 5); chỉ `display: inline-flex`.

- [ ] **Step 1: Viết test thất bại**
  - "is a labelled group" (`role === 'group'`, `ariaLabel`; axe trả về `[]`).
  - "children lose their own shadow and get outer corners only". Ba nút theo chiều ngang: `box-shadow` của `.base` ở nút giữa là bóng trong suốt; nút đầu chỉ có góc start bo; nút cuối chỉ có góc end bo. Chiều dọc thì đảo tương ứng.
  - "a keyboard-focused button inside a group shows the focus ring" *(Review Focus 5)*: `box-shadow` của `.base` chứa màu accent.
  - "buttons outside a group keep their own shadow and corners": nút đứng ngoài có `box-shadow` của `.base` khác bóng trong suốt, và cả bốn góc có cùng bán kính.
  - "SSR output is already merged": `renderDSD` của group chứa các rule `::slotted`; không cần JS.
- [ ] **Step 2:** Trước khi sửa style của nút, chạy `pnpm build && pnpm test:visual --update-snapshots` để chụp baseline cục bộ của trang visual hiện tại. Sau đó chạy các test ở Step 1 → FAIL.
- [ ] **Step 3:** Cài đặt.
- [ ] **Step 4:** Chạy → PASS. Rồi `pnpm build && pnpm test:visual` (không update) → pass với baseline của Step 2. Kết quả này chứng minh nút đứng ngoài group không đổi một pixel nào.
- [ ] **Step 5:** R8, rồi commit `feat(elements): add neu-button-group`

### Task 6: `<neu-surface>`

**Files:** `components/surface/*`, `src/surface.ts`; sửa `packages/tokens/src/neu.css`. Áp dụng R1–R8.

**Interfaces:**
- `surfaceDef`: tag `neu-surface`; props `shape` (`raised|inset|flat|convex|concave`, mặc định `raised`), `elevation` (`sm|md|lg`, mặc định `md`), `radius` (`sm|md|lg|full`, mặc định `md`), `padding` (`none|sm|md|lg`, mặc định `md`); cả bốn đều reflect. Template là `<div part="base" class="base"><slot></slot></div>`. Không có role.
- Style: `:host { display: block }`; `.base` dùng `background: var(--_neu-bg)` và `color: var(--_neu-fg)`.
  - Bóng: `sm` dùng `--_neu-raised-sm` / `--_neu-inset-sm`; `md` dùng `--_neu-raised` / `--_neu-inset`; `lg` khai báo tại chỗ `--_neu-raised-lg` / `--_neu-inset-lg` với khoảng cách `2 × d` và độ mờ `4 × d`.
  - `convex` / `concave`: bóng nổi kèm `linear-gradient(145deg, color-mix(in oklab, var(--_neu-bg), white 8%), color-mix(in oklab, var(--_neu-bg), black 6%))`; `concave` đảo thứ tự hai màu.
  - Bo góc: sm, md, lg, full lần lượt là `0.5×`, `1×`, `2×` của `--_neu-r`, và `999px`.
  - Padding: none, sm, md, lg lần lượt là `0`, `0.75rem`, `1.25rem`, `2rem`.
- Tokens (quyết định 7): selector của khối tính lại thành `:root, [data-neu-theme], .neu-surface, neu-surface`.
- R4: **không** ẩn; chỉ `display: block`.

- [ ] **Step 1: Viết test thất bại**
  - "a background set on the surface reaches nested components": `<neu-surface style="--neu-bg:#f5d0d8"><neu-button>` cho `box-shadow` của nút khác với một nút đứng ngoài.
  - "token utility classes inside a neu-surface re-derive". Nạp tokens CSS, đặt `.neu-raised` bên trong một `neu-surface` có `--neu-bg` khác → `box-shadow` khác với bên ngoài.
  - "shape, elevation, radius and padding map to the documented values" (so `padding`, `border-radius` và việc có hay không có `background-image` của `.base`).
  - Cộng các test chung của R7.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS (gồm cả `pnpm --filter @neu-ui/tokens test`).
- [ ] **Step 5:** R8, rồi commit `feat(elements): add neu-surface`

### Task 7: `<neu-divider>`

**Files:** `components/divider/*`, `src/divider.ts`. Áp dụng R1–R8.

**Interfaces:**
- `dividerDef`: tag `neu-divider`; prop `orientation` (`horizontal|vertical`, mặc định `horizontal`, reflect). Template là `<span part="base" class="base"></span>`. `internals.role = 'separator'`, `ariaOrientation` bằng giá trị orientation.
- Style: nằm ngang thì `display: block`, `margin-block: 0.75rem`, và `.base` có `border-block-start: 1px solid var(--_neu-sd)`, `border-block-end: 1px solid var(--_neu-sl)`. Nằm dọc thì `display: inline-block`, `align-self: stretch`, `min-block-size: 1em`, `margin-inline: 0.75rem`, `.base` cao 100% và dùng hai border inline tương ứng.
- R4: có trong danh sách ẩn; `display: block; min-block-size: 2px`.

- [ ] Steps 1–5 như mẫu. Test: role `separator` cùng `ariaOrientation` cho cả hai chiều; nằm ngang thì `.base` cao 2px; nằm dọc thì cao bằng phần tử anh em trong một hàng flex. Commit `feat(elements): add neu-divider`.

### Task 8: `<neu-badge>`

**Files:** `components/badge/*`, `src/badge.ts`. Áp dụng R1–R8.

**Interfaces:**
- `badgeDef`: tag `neu-badge`; props `variant` (`neutral|accent|success|warning|danger`, mặc định `neutral`, reflect), `pill` (boolean, reflect). Template là `<span part="base" class="base"><slot></slot></span>`.
- Style:
  - `:host` khai báo `--_neu-success: var(--neu-success, #3bb273)` và `--_neu-warning: var(--neu-warning, #e6a23c)`.
  - `.base`: `display: inline-flex`, `align-items: center`, `min-block-size: 1.25rem`, `padding-inline: 0.5rem`, `font-size: 0.75rem`, `font-weight: 600`, `border-radius: calc(var(--_neu-r) * 0.5)`; `pill` thì `999px`.
  - Bóng `var(--_neu-raised-sm)`.
  - Màu chữ: neutral dùng `--_neu-fg-muted`; accent dùng `--_neu-accent-c`; ba biến thể còn lại dùng `--_neu-success`, `--_neu-warning`, `--_neu-danger`.
- R4: có trong danh sách ẩn; `display: inline-block; min-block-size: 1.25rem`.

- [ ] Steps 1–5. Test: màu chữ của từng variant khác nhau và khớp token; `pill` cho `border-radius` 999px; giá trị fallback của `--_neu-success` / `--_neu-warning` bằng đúng giá trị mặc định trong tokens (dùng cách đọc regex như `styles.test.ts`). Commit `feat(elements): add neu-badge`.

### Task 9: `<neu-avatar>`

**Files:** `components/avatar/*`, `src/avatar.ts`. Áp dụng R1–R8.

**Interfaces:**
- Consumes: `systemIconSvg('user')` (Task 3).
- `avatarDef`: tag `neu-avatar`; props `src` (string, reflect), `label` (string), `initials` (string), `size` (`sm|md|lg`, mặc định `md`, reflect), `shape` (`circle|rounded`, mặc định `circle`, reflect).
- Template: `<span part="base" class="base" data-ref="base" data-show="…">` chứa cả ba nhánh:
  - `<img part="image" class="image" data-ref="image" alt="">`, với attribute `src` chỉ được render khi khác rỗng.
  - `<span part="initials" class="initials" data-ref="initials">${initials}</span>`.
  - `<span part="icon" class="icon">` chứa SVG hệ thống `user`.
- `data-show` nhận một trong `image`, `initials`, `icon`. Template tính nó từ props (có `src` → `image`; không có nhưng có `initials` → `initials`; còn lại → `icon`). CSS chỉ hiện nhánh tương ứng.
- Hành vi:
  - `internals.role = 'img'`, `ariaLabel = label`.
  - Ảnh lỗi (sự kiện `error`, **hoặc** lúc `rendered()` thấy `img.complete && img.naturalWidth === 0` trong khi có `src`) → bật state `image-error` và tính lại `data-show`, bỏ qua nhánh ảnh.
  - Đổi `src` → xóa `image-error`.
  - `update()` chỉ ghi `data-show` khi giá trị thay đổi.
- Kích thước: sm, md, lg lần lượt là 2rem, 2.5rem, 3.5rem; `font-size` bằng `0.4 ×` kích thước; `circle` thì bo 50%, `rounded` thì bo `var(--_neu-r)`; bóng `var(--_neu-raised-sm)`; icon chiếm 60% kích thước.
- R4: có trong danh sách ẩn; `display: inline-block; inline-size: 2.5rem; block-size: 2.5rem`.

- [ ] **Step 1: Viết test thất bại**
  - "falls back image → initials → icon". Ảnh hợp lệ dùng data URL PNG 1×1; ảnh lỗi dùng `src="data:image/png;base64,AAAA"`.
  - "an image that failed before upgrade still falls back" *(Review Focus 4)*. Parse markup SSR vào document tách rời, chờ ảnh lỗi, rồi mới adopt và đăng ký → `data-show` là `initials` hoặc `icon`.
  - "changing src clears the error".
  - "role img named by label"; axe trả về `[]`.
  - "hydration writes nothing when nothing failed" (ca parity của R2 với ảnh hợp lệ).
- [ ] Steps 2–4 như mẫu. **Step 5:** R8, rồi commit `feat(elements): add neu-avatar`

### Task 10: `<neu-spinner>`

**Files:** `components/spinner/*`, `src/spinner.ts`. Áp dụng R1–R8.

**Interfaces:**
- `spinnerDef`: tag `neu-spinner`; props `label` (string, mặc định `'Loading'`), `size` (`sm|md|lg`, mặc định `md`, reflect). Template là `<span part="base" class="base"><span part="track" class="track"></span><span part="indicator" class="indicator"></span></span>`. `internals.role = 'status'`, `ariaLabel = label`.
- Style:
  - Kích thước sm, md, lg lần lượt là 1rem, 1.5rem, 2.25rem.
  - `.track`: vòng tròn với `box-shadow: var(--_neu-inset-sm)`.
  - `.indicator`: `border: 3px solid transparent; border-block-start-color: var(--_neu-accent-c); border-radius: 50%`, chạy `animation: neu-spinner-rotate 0.9s linear infinite`.
  - Khi `prefers-reduced-motion: reduce` thì `animation-duration: 2.7s` (chậm lại, không tắt hẳn).
- R4: có trong danh sách ẩn; `display: inline-block; inline-size: 1.5rem; block-size: 1.5rem`.

- [ ] Steps 1–5. Test: `role === 'status'` và nhãn mặc định `Loading`, ghi đè được qua `label`; ba cỡ cho ba kích thước khác nhau; `.indicator` có `animation-name` khác `none`. Commit `feat(elements): add neu-spinner`.

### Task 11: Visual regression, tài liệu, changeset

**Files:** `e2e/visual/index.html`, `e2e/visual.spec.ts`, `packages/elements/README.md`, `packages/react/README.md` (nếu README liệt kê component), `.changeset/phase-2-basics.md`.

- [ ] **Step 1:** Thêm vào `<template id="states">` của `e2e/visual/index.html` một hàng cho mỗi nhóm:
  - Icon: cả 8 icon hệ thống, và một icon có `label`.
  - IconButton: các variant default, primary, flat; các trạng thái disabled, square; các cỡ sm, lg.
  - ButtonGroup: một nhóm ngang gồm 3 nút (cả 3 đều là `neu-button`), và một nhóm dọc gồm 2 icon-button.
  - Surface: đủ 5 shape, 3 elevation, và radius `full`, mỗi cái chứa chữ ngắn.
  - Divider: một ngang, một dọc nằm giữa hai đoạn chữ.
  - Badge: 5 variant, cộng `pill`.
  - Avatar: một ảnh dạng data URL hợp lệ, một initials, một icon, một `rounded`, các cỡ sm và lg.
  - Spinner: ba cỡ.
- [ ] **Step 2:** Mở rộng danh sách tag mà `visual.spec.ts` chờ đăng ký (`waitForFunction`) để có cả 8 tag mới.
- [ ] **Step 3:** `pnpm build && pnpm test:visual --update-snapshots && pnpm test:visual` (baseline Windows cục bộ, đã gitignore). Lần chạy thứ hai phải pass 12/12. Xem các ảnh trong `e2e/__screenshots__/win32/` bằng mắt: mọi component mới hiện đúng ở cả ba theme.
- [ ] **Step 4:** Cập nhật README của `@neu-ui/elements`: danh sách component và ví dụ dùng `registerIconLibrary`.
- [ ] **Step 5:** Tạo `.changeset/phase-2-basics.md` với bump `minor` cho cả bốn package `@neu-ui/elements`, `@neu-ui/tokens`, `@neu-ui/ssr`, `@neu-ui/react`. Mô tả: "Phase 2: neu-icon, registerIconLibrary, neu-icon-button, neu-button-group, neu-surface, neu-divider, neu-badge, neu-avatar, neu-spinner; base-class hardening."
- [ ] **Step 6:** Chạy toàn bộ chuỗi: `pnpm format && pnpm lint && pnpm build && pnpm gen --check && pnpm typecheck && pnpm test && pnpm size && pnpm examples:build && pnpm test:ssr:prod && pnpm test:ssr:dev && pnpm test:visual` → tất cả xanh.
- [ ] **Step 7: Commit** `test: visual states for the basic group; docs and changeset for phase 2`
- [ ] **Step 8 (sau khi push nhánh):** Baseline Linux được sinh bằng `gh workflow run visual-baselines.yml --ref feat/phase-2-basics`. Workflow này đã có trên `main` nên chạy tay được. Bước này cần người dùng đồng ý push trước.
