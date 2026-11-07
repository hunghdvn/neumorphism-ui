# neumorphism-ui — Giai đoạn 4a: chốt API cho 1.0 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa API của 19 tag về trạng thái sẽ giữ nguyên suốt 1.x. Có bốn nhóm việc:

1. Áp dụng 4 quyết định người dùng chốt ngày 2026-11-06: quy tắc reflect, avatar, submitter, ngân sách dung lượng.
2. Tách metadata docs khỏi bundle runtime, và bổ sung mô tả cho từng prop cùng bảng phím.
3. Sửa các lỗi đã hoãn mà người dùng dễ gặp hoặc làm đổi API nếu để sau 1.0.
4. Soạn checklist kiểm tra bằng screen reader.

**Architecture:** Giữ nguyên mô hình def DOM-free cộng class hành vi.
- Quy tắc reflect chuyển vào core: mặc định là reflect, không còn phải bật cho từng prop.
- Metadata docs chuyển từ `ComponentDef.docs` sang file `<name>.docs.ts` riêng cho từng component, gom lại ở entry mới `@neumorphism-ui/elements/docs.js`. Element không import file này nên chuỗi docs không vào CDN. Chỉ `tools/gen` và trang docs (kế hoạch 4b) đọc nó.

**Tech Stack:** Như giai đoạn 3: TypeScript 6.0.3, pnpm 9.15.1, Vitest 5.0.3 browser mode (Chromium/Firefox/WebKit), Playwright 1.63.0, esbuild, Changesets 2.31.1.

**Spec:** `docs/superpowers/specs/2026-10-01-neumorphism-ui-v1-design.md`, đặc biệt §6.1, §7.1, §7.2, §8.2–8.4, §10, §11, §14.
**Kế hoạch trước:** `docs/superpowers/plans/2026-11-05-phase-3-forms.md`. Mọi ràng buộc và quy trình R1–R8 trong đó vẫn áp dụng.
**Kế hoạch sau:** `docs/superpowers/plans/2026-11-06-phase-4b-docs-release.md`. Kế hoạch 4b cần entry `docs.js` của kế hoạch này.

## Global Constraints

- Vẫn giữ mọi Global Constraints của giai đoạn 1–3:
  - Chrome/Edge 125+, Safari 17.4+, Firefox 126+, không polyfill.
  - 0 runtime dependency, chỉ ESM.
  - Attribute không hợp lệ thì dùng giá trị mặc định trong im lặng.
  - Event `bubbles + composed`; control đang disabled không phát event.
  - Mọi module import được trong Node.
  - Template viết bằng `html`, một dòng.
  - axe tắt `color-contrast`.
- **Quy tắc reflect (người dùng chốt 2026-11-06):** mọi prop reflect ra attribute, trừ trạng thái người dùng thay đổi. Cụ thể:
  - không reflect: prop `form.valueProp` của mỗi def (`value` hoặc `checked`), và `indeterminate` của checkbox;
  - vẫn reflect: `value` của checkbox, switch, radio và option, vì đó là giá trị gửi đi chứ không phải trạng thái.
- **Ngân sách (người dùng chốt 2026-11-06), đo min+gzip:**
  - core ≤ 4 KB;
  - các module trong `components/shared/` (gộp lại, không tính core) ≤ 3 KB;
  - mỗi component ≤ 3 KB, không tính core, `components/shared/` và component cha (`NeuButton` với icon-button); riêng Select ≤ 5 KB;
  - CDN ≤ 25 KB; tokens ≤ 4 KB.
- `event.submitter` vẫn là `null` khi submit bằng `neu-button` (người dùng chốt 2026-11-06). Không thêm `name`/`value` cho `neu-button` ở 1.0.
- Docs, description và mô tả phím viết bằng tiếng Anh, giống README.
- Commit message kết thúc bằng trailer Co-Authored-By của người thực hiện, đặt thành một đoạn riêng. Trên máy dev này chạy visual test với `VISUAL_PORT=4174`.

## Review Focus

- **Framework set prop ở mỗi lần render.** Giờ mọi prop đều ghi attribute. Gán lại cùng một giá trị (React re-render) thì không được ghi attribute lần nữa. Riêng select: gán `label`/`placeholder` không được làm nó đọc lại danh sách option hay đổi `value`. Test ở Task 1.
- **Prop số không có giá trị** (`min`/`max` mặc định `NaN`, gán `NaN` hay `Infinity`). Reflect phải gỡ attribute đi, không được ghi `min="NaN"`. Test ở Task 1.
- **Hydration của React 19 sau khi reflect nhiều hơn.** Wrapper set property, element tự thêm attribute; React không được báo hydration mismatch. Test ở Task 1, trong `packages/react`.
- **Chuỗi docs không được lọt vào CDN** sau khi tách, và `docs.js` phải import được trong Node. Test ở Task 3.
- **Gõ tiếng Việt, Nhật, Trung bằng IME:** Enter để chốt chữ không được tính là một lần submit, nên field `required` không được chuyển sang `:state(user-invalid)`. Test ở Task 5.

## Quyết định của kế hoạch

1. **Reflect mặc định bật trong core** (theo quyết định của người dùng). Một prop reflect khi `decl.reflect ?? key !== def.form?.valueProp`.
   - Bỏ mọi `reflect: true` khỏi các file `*.def.ts`; chỉ `indeterminate` khai báo `reflect: false`.
   - `serializeAttribute` trả `null` cho số không hữu hạn, để gỡ attribute.
   - Spec §6.1 ghi lại quy tắc này.
2. **Metadata docs tách khỏi def.**
   - `ComponentDef` bỏ field `docs`.
   - Mỗi component có `src/components/<name>/<name>.docs.ts` xuất `<camelName>Docs: ComponentDocs`.
   - `src/docs.ts` xuất `componentDocs: ReadonlyMap<string, ComponentDocs>` theo tag, kèm export `./docs.js` trong `package.json`.
   - `ComponentDocs` có thêm `descriptions` (một dòng cho mỗi prop và mỗi property chỉ dùng từ JS) và `keyboard`. Hai field này là nguồn cho bảng API và bảng phím của docs (spec §12).
   - Lý do: chuỗi docs đang nằm trong `cdn/neu.min.js` (chuỗi `summary` của select có trong file), mà thêm mô tả cho khoảng 120 prop sẽ đẩy CDN sát mức 25 KB.
3. **Ngân sách theo quyết định của người dùng.**
   - `check-size.mjs` đo `shared` là `bundle(core + shared) − bundle(core)`.
   - Mỗi component đo bằng `bundle(core + shared + component) − bundle(core + shared)`.
   - Bỏ giới hạn riêng 3,5 KB của number-field.
   - Số đo ngày 2026-11-06 trên `main`: shared 1,94; number-field 1,99; text-field 1,32; textarea 1,29; select 3,32 KB.
4. **Avatar:** spec §7.1 sửa theo code. Có `label` thì role `img` kèm `aria-label`; không có `label` thì `aria-hidden`, giống `neu-icon`.
5. **Phạm vi các việc đã hoãn.** Làm ở 1.0 những việc đổi API hoặc dễ gặp:
   - slot `label` cho select và radio-group;
   - bỏ `part="svg"` trên các icon bên trong component;
   - typeahead bằng phím AltGr;
   - không cuộn listbox khi rê chuột;
   - IME;
   - chiều cao `radio-group[label]` trước khi upgrade;
   - avatar: `error` đến trễ, và initials chỉ có khoảng trắng;
   - comment trong cửa sổ select khi SSR.

   Để sang 1.x (ghi vào changelog của 4b, không làm ở đây):
   - heuristic nhận root khi stream;
   - `::slotted` làm rò biến trong button-group;
   - icon-button khác size trong group;
   - sanitizer với `<svg:svg>`;
   - default button là `<input type=image>`;
   - `get form()` bị lặp;
   - O(N²) khi chèn nhiều radio một lúc.

   RangeError khi `transformHtml` nhận đầu vào cực lớn được ghi vào mục Limitations của README ssr (Task 6), không sửa code: mỗi element sinh ra một shadow root đầy đủ, nên chuỗi kết quả lớn là bản chất.
6. **Icon bên trong component không còn `part="svg"`.** Đổi thành `svgWrap(body: string, part?: string)`. Chỉ `neu-icon` truyền `'svg'`. Các part này chưa từng được ghi trong docs.

---

### Task 1: Quy tắc reflect trong core

**Files:**
- Modify: `packages/elements/src/core/props.ts`, `packages/elements/src/core/neu-element.ts`, mọi `packages/elements/src/components/*/*.def.ts`
- Modify: `tools/gen/src/lib.mjs` (field `reflects`), `tools/gen/src/lib.test.mjs`
- Modify: spec §6.1
- Test: `packages/elements/src/core/neu-element.test.ts`, `packages/elements/src/core/props.test.ts`, `packages/elements/src/components/select/select.test.ts`, `packages/react/src/create-component.test.ts` (file có test hydration)

**Interfaces:**
- Produces: `reflects(key: string, decl: PropDecl, def: ComponentDef): boolean`, exported từ `core/props.ts`. Hàm trả `decl.reflect ?? key !== def.form?.valueProp`. Dùng ở `NeuElement.setProp` và trong `tools/gen`.
- Produces: `serializeAttribute(decl, value)` trả `null` cho số không hữu hạn.

- [ ] **Step 1: Viết test fail.**
  - `props.test.ts`, test `serializeAttribute removes the attribute for non-finite numbers`:
    `serializeAttribute({ type: 'number', default: NaN }, NaN) === null`. Tương tự với `Infinity`. Còn `0.1` thì ra `'0.1'`.
  - `neu-element.test.ts` (dùng probe element sẵn có trong file, thêm prop nếu cần):
    - `every prop reflects unless it opts out`: gán `el.label = 'A'` thì `getAttribute('label') === 'A'`.
    - `a reflect:false prop does not reflect`.
    - `the form value prop never reflects`: với probe có `form: { valueProp: 'value' }`, gán `el.value = 'x'` thì attribute `value` không đổi.
    - `assigning the same value does not rewrite the attribute`: dùng `MutationObserver`; gán `el.label = 'A'` hai lần thì chỉ ghi nhận 1 mutation.
  - `select.test.ts`, test `setting label or placeholder keeps the options and the value`: select có option `b` được chọn; gán `label` rồi `placeholder` thì `value === 'b'`, số phần tử `[part~=option]` không đổi, và không phát `input`/`change`.
  - `packages/react/src/create-component.test.ts`, thêm `hydrating a select with label and placeholder logs no mismatch`. Spy `console.error` và kỳ vọng không có lời gọi nào.
- [ ] **Step 2: Chạy, thấy test fail.**
  Run: `pnpm --filter @neumorphism-ui/elements exec vitest run src/core` → các test mới FAIL (label chưa reflect, ghi ra `"NaN"`).
- [ ] **Step 3: Cài đặt.**
  - Thêm `reflects()` và sửa `serializeAttribute` (`Number.isFinite(value) ? String(value) : null`).
  - `NeuElement.setProp` dùng `reflects(key, decl, this.def)`.
  - Xoá mọi `reflect: true` trong `*.def.ts`; `checkbox.def.ts` đặt `indeterminate: { type: 'boolean', reflect: false }`.
  - `lib.mjs`: member không phải valueProp thì `reflects: reflects(key, decl, def)`. Export `reflects` qua `@neumorphism-ui/elements/ssr.js` giống `attributeName`.
  - Spec §6.1: thay ví dụ `reflect: true` bằng câu "Mọi prop reflect ra attribute; ngoại lệ là prop giá trị của form control (`value`/`checked`) và `indeterminate`, khai báo `reflect: false`."
- [ ] **Step 4: Chạy lại, thấy test pass.**
  - Chạy toàn bộ: `pnpm build && pnpm test && pnpm gen && pnpm gen --check && pnpm typecheck && pnpm lint && pnpm size` → PASS, mọi dòng size `ok`.
  - Test cũ nào đang khẳng định một prop *không* reflect, mà prop đó giờ phải reflect, thì sửa kỳ vọng theo quy tắc mới. Ghi danh sách các test đã sửa vào báo cáo của task.
- [ ] **Step 5: Commit** `feat(elements): reflect every prop except a form control's live value`.

### Task 2: Ngân sách dung lượng không tính base dùng chung

**Files:**
- Modify: `scripts/check-size.mjs`, spec §10, `README.md` (dòng "Small.")

**Interfaces:**
- Produces: các dòng output `shared (without core)` và `<tag> (without core, shared)`. `neu-icon-button` giữ nhãn `(without core, shared, NeuButton)`.

- [ ] **Step 1: Sửa `check-size.mjs`.**
  - Thêm hằng `shared` gồm `export * from './components/shared/<m>.js';` cho mọi file không phải test trong `src/components/shared/`. Đọc danh sách thư mục, không viết tay.
  - Thêm dòng `shared (without core)` với giới hạn 3.
  - Đo mọi component theo Quyết định 3.
  - Bỏ `{ limit: 3.5 }` của number-field.
- [ ] **Step 2: Chạy `pnpm build && pnpm size`.** Expected: mọi dòng `ok`; `shared` khoảng 1,94/3; number-field khoảng 1,99/3; select khoảng 3,32/5.
- [ ] **Step 3: Sửa văn bản.**
  - Spec §10: bảng thêm dòng "Module dùng chung `components/shared/` ≤ 3KB"; dòng component đổi thành "Mỗi component riêng, không tính core, module dùng chung và component cha".
  - README: "each component ≤ 3 KB (`neu-select` 5 KB) without the core and the shared modules (≤ 3 KB)".
- [ ] **Step 4: Commit** `build: measure components without the shared modules (spec §10)`.

### Task 3: Tách metadata docs khỏi def

**Files:**
- Modify: `packages/elements/src/core/define.ts`, mọi `*.def.ts`
- Create: mọi `src/components/<name>/<name>.docs.ts`, `packages/elements/src/docs.ts`, `packages/elements/src/docs.test.ts`
- Modify: `packages/elements/package.json` (exports), `tools/gen/src/gen.mjs`, `tools/gen/src/lib.mjs`, `tools/gen/src/lib.test.mjs`

**Interfaces:**
- Produces:
  ```ts
  // core/define.ts
  export interface ComponentDocs {
    readonly summary: string;
    /** One line per prop of the def, per key of def.properties, and per defaultValue/defaultChecked. */
    readonly descriptions: Readonly<Record<string, string>>;
    readonly events: readonly DocEntry[];
    readonly slots: readonly DocEntry[];
    readonly parts: readonly DocEntry[];
    readonly cssProperties: readonly DocEntry[];
    /** name: the keys as spec §7 writes them; description: what they do. */
    readonly keyboard: readonly DocEntry[];
  }
  // docs.ts
  export const componentDocs: ReadonlyMap<string, ComponentDocs>;
  ```
- Produces: `buildManifest(defs, docs: ReadonlyMap<string, ComponentDocs>)`, `buildReactWrapper(def, docs: ComponentDocs)` trong `lib.mjs`.

- [ ] **Step 1: Viết `docs.test.ts` (fail vì chưa có `docs.js`).**
  - `every definition has docs`: tập tag của `definitions` bằng tập tag của `componentDocs`.
  - `descriptions cover exactly the props and JS-only properties`: với mỗi def, `Object.keys(descriptions)` bằng (prop của def) ∪ (key của `def.properties`) ∪ `formDefaultProp(def)` (nếu có). Mọi description khác rỗng.
  - `keyboard is documented where spec §7 lists keys`: `keyboard.length > 0` đúng cho các tag `['neu-button', 'neu-icon-button', 'neu-number-field', 'neu-checkbox', 'neu-radio-group', 'neu-switch', 'neu-slider', 'neu-select']` và bằng 0 cho các tag còn lại.
- [ ] **Step 2: Chuyển dữ liệu.**
  - Cắt `docs` ra khỏi từng def, đưa sang `<name>.docs.ts`; bỏ `docs` khỏi `ComponentDef`.
  - Thêm `descriptions` và `keyboard`. Ở task này cho phép đặt tạm description là `'TODO'`, nhưng test thứ hai phải từ chối `'TODO'` ngay từ Task 4. Viết test sao cho có thể bật lên ở Task 4: `test.todo` ở đây, chuyển thành `test` ở Task 4.
  - `src/docs.ts` gom các file docs; `package.json` thêm `"./docs.js": { "types": "./dist/docs.d.ts", "default": "./dist/docs.js" }`, không thêm vào `sideEffects`.
  - `gen.mjs` import `componentDocs` rồi truyền vào `buildManifest` và `buildReactWrapper`. Manifest dùng `descriptions[key]` làm `description` của attribute và member.
- [ ] **Step 3: Kiểm tra CDN không còn chuỗi docs.**
  - Run: `pnpm build && node -e "process.exit(require('fs').readFileSync('packages/elements/cdn/neu.min.js','utf8').includes('A single-value select') ? 1 : 0)"` → exit 0.
  - Ghi số CDN trước và sau (`pnpm size`) vào commit message.
- [ ] **Step 4: Chạy `pnpm test && pnpm gen && pnpm gen --check && pnpm typecheck && pnpm lint && pnpm size`.** Expected: PASS. `custom-elements.json` thay đổi vì đã có description.
- [ ] **Step 5: Commit** `refactor(elements): move docs metadata out of the runtime definitions`.

### Task 4: Mô tả prop và bảng phím cho mọi tag

**Files:**
- Modify: mọi `src/components/<name>/<name>.docs.ts`, `src/docs.test.ts` (bật test description)

Đây là việc soạn nội dung. Nguồn cho từng tag:
- Spec §7.1/§7.2: attribute, hành vi, và các dòng "Phím".
- §6.1 với `value`/`checked`: attribute là giá trị mặc định.

Quy tắc viết:
- Mỗi description là một câu tiếng Anh, có dấu chấm cuối, không lặp lại tên prop.
- Prop có `values` thì không liệt kê lại các giá trị: bảng API sinh từ `values`.
- Mỗi mục `keyboard` có `name` là tổ hợp phím theo cách viết của KeyboardEvent.key (`Enter`, `Space`, `ArrowUp / ArrowDown`, `Home / End`, `PageUp / PageDown`, `Escape`, `Tab`) và `description` là việc phím đó làm.
- Select có hai nhóm phím (khi đóng, khi mở). Ghi vào `description`, ví dụ `'When closed: opens the listbox.'`.

- [ ] **Step 1: Chuyển test `descriptions cover …` từ `test.todo` sang `test`, và thêm điều kiện không chấp nhận `'TODO'`.** Run `pnpm --filter @neumorphism-ui/elements exec vitest run src/docs.test.ts` → FAIL.
- [ ] **Step 2: Viết description và keyboard cho cả 19 tag.**
- [ ] **Step 3: Chạy `pnpm build && pnpm --filter @neumorphism-ui/elements exec vitest run src/docs.test.ts && pnpm gen && pnpm gen --check && pnpm lint`.** Expected: PASS.
- [ ] **Step 4: Commit** `docs(elements): describe every prop and keyboard interaction`.

### Task 5: Hành vi form và select

**Files:**
- Modify: `packages/elements/src/core/form-control.ts`, `packages/elements/src/components/select/{select.ts,select.def.ts,select.styles.ts,select.docs.ts}`, `packages/elements/src/components/radio-group/{radio-group.ts,radio-group.def.ts,radio-group.docs.ts}`, `packages/elements/src/components/icon/system-icons.ts`, `packages/elements/src/components/{checkbox,number-field}/*.def.ts`, `packages/elements/src/components/avatar/avatar.ts`, `packages/tokens/src/neu.css`
- Test: `core/form-control.test.ts`, `select/select.test.ts`, `radio-group/radio-group.test.ts`, `checkbox/checkbox.test.ts`, `number-field/number-field.test.ts`, `avatar/avatar.test.ts`, `packages/tokens/test/tokens.test.ts`

**Interfaces:**
- Produces: `svgWrap(body: string, part?: string): string`. Có `part` thì thêm `part="<part>"`; không có thì không thêm part nào.
- Consumes: `componentDocs` (Task 3) cho các slot mới.

- [ ] **Step 1: Viết test fail.** Mỗi gạch đầu dòng là một test, chạy trên 3 engine.
  - `form-control.test.ts` › `Enter that commits an IME composition is not a submit attempt`: field `required` trong form; dispatch `keydown` có `{ key: 'Enter', isComposing: true }` lên `<input>` bên trong; gọi `form.requestSubmit()` thì field **không** khớp `:state(user-invalid)`.
  - `select.test.ts`:
    - `AltGr characters take part in typeahead`: options `b`, `ä`, đang đóng. Keydown `{ key: 'ä', ctrlKey: true, altKey: true }` trên combobox thì listbox mở, `aria-activedescendant` trỏ tới option `ä`, và `value` chưa đổi (giống typeahead hiện tại khi đóng: mở và di chuyển).
    - `Ctrl+letter without Alt is not typeahead`: keydown `{ key: 'b', ctrlKey: true }` thì listbox vẫn đóng.
    - `hovering an option does not scroll the listbox`: 30 option, listbox mở, `scrollTop` = 0; `pointermove` trên option cuối đang thấy một phần thì `scrollTop` vẫn bằng 0 và option đó thành active.
    - `a slotted label names the combobox`: `<neu-select><span slot="label">Fruit <b>*</b></span>…`. Trong `#label` có `<slot name="label">` mà assigned text (đã gộp khoảng trắng) là `Fruit *`. Combobox vẫn có `aria-labelledby="label"`. `axeViolations` trả về `[]`.
    - `internal icons expose no svg part`: shadow root không có `[part~=svg]`. Thêm test tương tự trong `checkbox.test.ts` và `number-field.test.ts`.
  - `radio-group.test.ts` › `a slotted label names the group`: `<span slot="label">Plan</span>` thì `internalsOf(el).ariaLabel === 'Plan'`. Đổi nội dung slot thì `ariaLabel` cập nhật theo sau `slotchange`. Không có slot thì vẫn dùng attribute `label`.
  - `avatar.test.ts`:
    - `a load after a stale error shows the image`: dispatch `error` rồi `load` lên `[part=image]` thì ảnh hiện, initials và icon bị ẩn.
    - `whitespace-only initials fall back to the icon`: `initials="  "` thì part `icon` hiện.
  - `packages/tokens/test/tokens.test.ts` › `a labelled radio group reserves its label row before upgrade`: `neu-radio-group[label]:not(:defined)` có `min-block-size` bằng chiều cao thật của hàng label cộng một radio ở cỡ `md`. Đo trong trình duyệt rồi điền số, như quy trình R4 của giai đoạn 3.
- [ ] **Step 2: Chạy, thấy fail.** Run: `pnpm --filter @neumorphism-ui/elements exec vitest run src/core/form-control.test.ts src/components/select src/components/radio-group src/components/avatar src/components/checkbox src/components/number-field` → các test mới FAIL.
- [ ] **Step 3: Cài đặt.**
  - **`form-control.ts`:** watcher của phím Enter bỏ qua khi `event.isComposing`.
  - **`select.ts` – typeahead:** dòng đầu `onKey` hiện thoát khi có `ctrlKey`. Sửa lại: chỉ thoát khi có `metaKey`, hoặc khi có `ctrlKey` mà không có `altKey`. Ký tự là printable khi `key.length === 1 && key !== ' '` và (`!altKey`, hoặc `ctrlKey && altKey`, tức AltGr). `Alt+ArrowUp` vẫn giữ nguyên ý nghĩa.
  - **`select.ts` – hover:** `activate(i: number, scroll = true)`; handler `pointermove` gọi `activate(i, false)`.
  - **Slot label cho select:** `select.def.ts` đặt `<slot name="label">…</slot>` bao quanh text trong `#label`, giống text-field. Docs thêm slot `label: 'Rich label; replaces the label attribute.'`.
  - **Slot label cho radio-group:**
    - `radio-group.def.ts` thêm slot `label` tương tự.
    - `radio-group.ts`: khi có `slotchange` thì nếu slot có node được gán, `internals.ariaLabel` = text đã gộp khoảng trắng của các node đó; không có thì dùng prop `label`.
  - **Icon nội bộ:** `svgWrap` thêm tham số `part`, chỉ `neu-icon` truyền `'svg'`.
  - **Avatar:** thêm listener `load` để xoá trạng thái lỗi của ảnh hiện tại; khi kiểm tra có initials hay không thì `trim()` trước.
  - **`neu.css`:** thêm `neu-radio-group[label]:not(:defined){min-block-size:<số đo>}`.
- [ ] **Step 4: Chạy lại toàn bộ.** `pnpm build && pnpm test && pnpm gen --check && pnpm typecheck && pnpm lint && pnpm size`, rồi `VISUAL_PORT=4174 pnpm test:visual`. Expected: PASS.
  - Nếu ảnh chụp của select hay radio-group đổi, xem lại từng ảnh. Chỉ cập nhật baseline Windows ở máy local; baseline Linux chạy qua workflow visual-baselines sau khi push (quy trình của giai đoạn 3).
- [ ] **Step 5: Commit**, một commit cho mỗi nhóm:
  - `fix(elements): ignore IME Enter as a submit attempt`
  - `fix(elements): AltGr typeahead and no hover scroll in neu-select`
  - `feat(elements): label slot on neu-select and neu-radio-group`
  - `fix(elements): drop the svg part from internal icons`
  - `fix(elements): avatar recovers after a stale error; trim initials`
  - `fix(tokens): reserve the label row of a labelled radio group`

### Task 6: SSR bỏ qua comment trong select

**Files:**
- Modify: `packages/ssr/src/transform-html.ts`, `packages/ssr/README.md` (Limitations)
- Test: `packages/ssr/src/transform-html.test.ts`

**Interfaces:**
- Produces: `stripComments(text: string): string` (không export). Hàm bỏ mọi `<!-- … -->`; comment chưa đóng thì chạy tới hết chuỗi, như trình duyệt. Chạy trong thời gian tuyến tính: vòng lặp `indexOf`, không dùng regex có `*?`.

- [ ] **Step 1: Viết test fail.**
  - `an option inside a comment is not an option`: `<neu-select value="b"><!-- <neu-option value="b">Wrong</neu-option> --><neu-option value="b">Right</neu-option></neu-select>` thì display trên server là `Right`.
  - `a comment inside option text is dropped, '>' included`: `<neu-option value="a">A<!-- x > y -->B</neu-option>` thì nhãn là `AB`.
  - `many unterminated comments stay linear`: option có text là `'<!--'.repeat(200_000)` chạy dưới 500 ms, giống test hiệu năng sẵn có.
- [ ] **Step 2: Chạy, thấy fail.** Run: `pnpm --filter @neumorphism-ui/ssr test` → FAIL.
- [ ] **Step 3: Cài đặt.**
  - Trong `scanOptions`, khi gặp `<!--` ở vị trí `lt` thì nhảy tới sau `-->` kế tiếp (hoặc tới `stop`).
  - Text của option qua `stripComments` trước khi `split`.
  - README ssr, mục Limitations, thêm hai ý:
    - Mỗi element nhận một shadow root đầy đủ, nên trang có hàng chục nghìn component có thể vượt độ dài chuỗi tối đa của engine; khi đó `transformHtml` ném `RangeError`.
    - Một comment chứa `</neu-select>` vẫn kết thúc cửa sổ đọc option.
- [ ] **Step 4: Chạy `pnpm --filter @neumorphism-ui/ssr test && pnpm test:ssr:prod`.** Expected: PASS. Trước đó chạy `pnpm build && pnpm examples:build`; e2e dùng `.output` đã build.
- [ ] **Step 5: Commit** `fix(ssr): skip comments when reading select options`.

### Task 7: Spec, checklist screen reader, changeset

**Files:**
- Modify: spec §7.1 (`neu-avatar`, `neu-button`)
- Create: `docs/superpowers/reports/2026-11-06-screen-reader-checklist.md`, `.changeset/phase-4a-api-freeze.md`

- [ ] **Step 1: Sửa spec.**
  - `neu-avatar` — role `img` khi có `label`; không có `label` thì là ảnh trang trí (`aria-hidden`), giống `neu-icon`.
  - Dưới `neu-button`, thêm: "Submit bằng `neu-button` cho `event.submitter === null`; `neu-button` không có `name`/`value`. Cần biết nút nào submit thì dùng `<button>` native."
- [ ] **Step 2: Viết checklist screen reader** cho Select và RadioGroup. Đây là bước kiểm tra tay mà bảng rủi ro §16 đặt ra.
  - Chạy với NVDA + Firefox, NVDA + Chrome trên Windows, và VoiceOver + Safari trên macOS.
  - Mỗi dòng là: thao tác, điều kỳ vọng nghe được, và ô `[ ]`. Ví dụ: Tab tới select → nghe "Fruit, combobox, collapsed, Apple"; Alt+ArrowDown → "expanded"; ArrowDown → "Banana, 2 of 3".
  - Phủ: mở/đóng, di chuyển, chọn, typeahead, disabled option, required/invalid, label từ slot; radio-group: vào nhóm, mũi tên, radio disabled, tên nhóm.
- [ ] **Step 3: Viết changeset** cho `@neumorphism-ui/elements`, `@neumorphism-ui/ssr`, `@neumorphism-ui/react`, `@neumorphism-ui/tokens` (minor, vì bốn package version cùng nhau). Liệt kê:
  - quy tắc reflect;
  - entry `docs.js`, và việc `ComponentDef` không còn `docs`;
  - slot `label` mới;
  - không còn part `svg` bên trong;
  - các bản sửa của Task 5–6;
  - cách tính budget.
- [ ] **Step 4: Kiểm tra toàn bộ.** `pnpm build && pnpm test && pnpm typecheck && pnpm gen --check && pnpm lint && pnpm size && pnpm examples:build && pnpm test:ssr:prod && pnpm test:ssr:dev` → PASS. Nếu `test:ssr:dev` crash một lần với `0xC0000409` trên Windows thì chạy lại một lần.
- [ ] **Step 5: Commit** `docs: phase 4a spec updates, screen reader checklist and changeset`.
