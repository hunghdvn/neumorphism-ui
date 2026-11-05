# neumorphism-ui — Giai đoạn 3: nhóm Form lõi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm 6 component còn lại của nhóm Form lõi: Textarea, NumberField, Checkbox, Radio + RadioGroup, Slider, Select + Option. Cùng lúc tách phần code đang bị lặp ra module dùng chung, và làm SSR cho nhãn của Select. Mỗi component qua checklist §11, có visual regression, và được phát hành dưới dạng `1.0.0-next.x`.

**Architecture:** Giữ mô hình của giai đoạn 1–2: định nghĩa DOM-free (`*.def.ts`, `*.styles.ts`) và class hành vi kế thừa `NeuElement`. Phần code mà nhiều component dùng chung nằm ở `src/components/shared/`, không đưa vào core (core đang 3,78/4 KB):
- `press.ts`: phím Space/Enter, dùng cho button, switch, checkbox.
- `checkable.ts`: switch, checkbox.
- `text-control.ts` và `field.styles.ts`: text-field, textarea, number-field, select.

Core chỉ đổi kiểu dữ liệu: `ComponentDef` có thêm `TemplateContext`, `optionsFrom` và `properties`, không thêm byte nào vào bundle.

**Tech Stack:** Như giai đoạn 2 (TypeScript 6.0.3, pnpm 9.15.1, Vitest 5 browser mode trên Chromium/Firefox/WebKit, Playwright 1.63, esbuild 0.28, Changesets 2.31).

**Spec:** `docs/superpowers/specs/2026-10-01-neumorphism-ui-v1-design.md`, đặc biệt các mục §6.1, §6.4–6.6, §7.2, §8.2–8.4, §9, §10, §11 và §14.
**Kế hoạch trước:** `docs/superpowers/plans/2026-11-04-phase-2-basics.md`. Mọi ràng buộc trong đó vẫn áp dụng.

## Global Constraints

- Vẫn giữ mọi Global Constraints của giai đoạn 1 và 2:
  - Trình duyệt Chrome/Edge 125+, Safari 17.4+, Firefox 126+, không polyfill.
  - 0 runtime dependency, chỉ ESM, TypeScript 6.0.3.
  - Tên package `@neumorphism-ui/*`, tên tag bắt đầu bằng `neu-`.
  - axe tắt rule `color-contrast`.
  - Attribute không hợp lệ thì thay bằng giá trị mặc định trong im lặng.
  - Event là `bubbles + composed`; control đang disabled không phát event nào.
  - Biến CSS nội bộ có tiền tố `--_neu-`. Template viết bằng `html`, một dòng.
  - Mọi module import được trong Node.
  - Không khai báo instance field trùng tên prop; dùng `declare` cho các field này.
- Ngân sách (min+gzip):
  - core ≤ 4 KB;
  - mỗi component ≤ 3 KB, không tính core và không tính component cha mà nó kế thừa (quyết định 1); riêng Select ≤ 5 KB;
  - CDN ≤ 25 KB; tokens ≤ 4 KB.
- File của một component nằm ở `src/components/<name>/`: `<name>.def.ts`, `<name>.styles.ts`, `<name>.ts`, `<name>.test.ts`. Entry là `src/<name>.ts`, theo mẫu `src/button.ts`. Danh sách part trong `docs` phải khớp đúng spec §7.2.
- Commit message kết thúc bằng trailer Co-Authored-By của người thực hiện, đặt thành một đoạn riêng.
- Trên máy dev này, cổng 4173 đã bị dự án khác chiếm, nên chạy visual test với `VISUAL_PORT=4174`.

## Quy trình đăng ký component (R1–R8)

Mọi task thêm component đều làm đủ 8 bước sau. Mỗi task chỉ ghi giá trị riêng của nó.

- **R1.** Tạo entry `packages/elements/src/<name>.ts`, rồi thêm `export * from './<name>.js'` vào `src/all.ts`.
- **R2.** `src/ssr.ts`: thêm `[def.tag, def]` vào map `definitions`. Trong `src/ssr.test.ts`:
  - thêm một ca parity vào `cases`;
  - cập nhật danh sách tag trong "definitions lists the registered tags", và bảng trong "formDefaultProp …";
  - với component có `disabled`, thêm một dòng vào bảng kỳ vọng của test "server-rendered disabled controls look disabled…". Đổi phần chọn `look` thành map `tag → selector`;
  - với component `delegatesFocus`, thêm tag vào test về delegates focus. Đổi tên test đó thành "only the field controls delegate focus".
- **R3.** `packages/elements/package.json`: thêm `./<name>.js` vào `exports` (dạng `{ types, default }`) và `./dist/<name>.js` vào `sideEffects`.
- **R4.** `packages/tokens/src/neu.css` (§5.6): thêm rule `:not(:defined)` với `display` và kích thước cỡ `md` như task ghi. Kích thước phải bằng chiều cao render thật: đo trong trình duyệt rồi điền. Tag nằm trong danh sách "ẩn" thì thêm vào selector `visibility: hidden`.
- **R5.** `scripts/check-size.mjs`: thêm `[tag, './<name>.js', 'ClassName']` vào `components`, kèm giới hạn nếu khác 3 (quyết định 1).
- **R6.** `pnpm gen`, rồi cập nhật danh sách tag trong `tools/gen/src/lib.test.mjs`.
- **R7.** `<name>.test.ts` (3 engine) phủ checklist §11:
  - giá trị mặc định;
  - attribute ↔ property, và reflect theo quyết định 3;
  - giá trị không hợp lệ thay bằng mặc định;
  - event đúng thứ tự, không có event khi disabled;
  - mọi phím ở §7.2;
  - form: `FormData`, reset, `required`, `:state(user-invalid)` chỉ bật sau khi người dùng tương tác, `<fieldset disabled>`;
  - role, tên truy cập và trạng thái ARIA (đọc qua `internalsOf`);
  - `axeViolations(el)` trả về `[]`.
- **R8.** `pnpm build && pnpm --filter @neumorphism-ui/elements test && pnpm --filter @neumorphism-ui/elements typecheck && pnpm gen --check && pnpm format && pnpm lint && pnpm size` → mọi dòng `ok`, rồi commit.

## Quyết định của kế hoạch

1. **Ngân sách theo đúng §10, "không tính base class".** `check-size.mjs` cho phép mỗi dòng có thêm hai thông tin: component cha để trừ ra, và giới hạn riêng.
   - `neu-icon-button` được đo là `bundle(core + NeuButton + NeuIconButton) − bundle(core + NeuButton)`, nhãn `(without core, NeuButton)`. Hiện nó đang đúng 3,00/3 KB vì bị tính cả NeuButton.
   - `neu-select` có giới hạn 5 KB.
   - Module trong `shared/` không phải component cha, nên vẫn tính vào từng component.
2. **Code dùng chung nằm ở `components/shared/`.** Lý do: tránh bản sao thứ ba của cỗ máy phím Space (mục backlog), và tránh chép `NeuTextField` ra hai lần.
3. **Quy ước reflect cho component mới.**
   - **Có reflect:** các attribute trạng thái/cấu hình: `name`, `disabled`, `required`, `readonly`, `size`, `resize`, `orientation`, và `value` của `neu-radio` / `neu-option`.
   - **Không reflect:** chữ hiển thị (`label`, `placeholder`, `help-text`, `error-text`, `*-label`), giới hạn số (`min`, `max`, `step`, `rows`, `minlength`, `maxlength`), và `indeterminate`. Riêng `indeterminate`: như native, đây là property; attribute chỉ đặt trạng thái ban đầu.
   - `value` / `checked` của control có form không bao giờ reflect (§6.1).
   - Quyết định chung cho toàn thư viện vẫn còn mở (backlog). Kế hoạch này chỉ theo đúng tiền lệ của text-field và switch.
4. **Checkbox có `size` (sm|md|lg).** Spec ghi Switch có "API như Checkbox nhưng không có `indeterminate`", và Switch có `size`.
5. **Textarea:**
   - `resize` mặc định là `vertical`.
   - `auto` tự giãn bằng JS: đặt `block-size` theo `scrollHeight`. Không dùng `field-sizing: content` vì Firefox 126 và Safari 17.4 chưa có.
   - Template luôn đặt một ký tự `\n` ngay sau thẻ mở `<textarea …>`. Trình phân tích HTML bỏ đúng một xuống dòng đầu, nên giá trị bắt đầu bằng xuống dòng vẫn còn nguyên.
6. **NumberField:**
   - `min` và `max` có mặc định `NaN`, nghĩa là không đặt.
   - `step ≤ 0` thì dùng 1.
   - Nút −/+, PageUp/PageDown và Home/End đều phát `input` rồi `change`, vì mỗi lần là một thay đổi đã xong. ArrowUp/Down để trình duyệt tự xử lý.
   - Bấm nút −/+ thì focus vẫn ở ô input: chặn `pointerdown` mặc định trên nút.
7. **RadioGroup:**
   - Group xử lý click và phím theo kiểu delegation. `neu-radio` không form-associated.
   - Group giữ một style `::slotted(neu-radio[value="…"]) { --_neu-radio-on: 1 }` theo giá trị hiện tại. Nhờ vậy radio được chọn hiện dấu chọn ngay từ HTML của SSR, khi chưa có JS.
   - Radio bọc trong phần tử khác (không slot trực tiếp) chỉ hiện dấu chọn sau khi JS chạy.
   - Nhiều radio trùng `value` thì radio khớp đầu tiên được chọn.
8. **Giá trị chưa khớp được giữ lại.**
   - RadioGroup và Select lưu giá trị được yêu cầu kể cả khi chưa có radio/option nào khớp, và áp dụng khi phần tử khớp xuất hiện.
   - Trong lúc chờ, `value` đọc ra `''`, giống select native không có option nào được chọn.
9. **Slider:**
   - `value` là số. Khi không có attribute, mặc định là điểm giữa như `<input type=range>`.
   - `tools/gen` lấy kiểu của `defaultValue` theo kiểu của prop giá trị.
   - Property chỉ đặt bằng JS (`valueFormatter`) được khai báo ở `def.properties`, để wrapper React và manifest biết.
10. **Select:**
    - `formValue` là `null` khi chưa chọn gì.
    - Listbox được dựng khi mở lần đầu (§8.3). ID của option là `option-<chỉ số>`.
    - Nút kích hoạt có dáng nổi như nút bấm, kèm chevron. Rê chuột lên option thì option đó thành option đang trỏ.
11. **Option:** `value` là attribute `value`, hoặc nhãn nếu không có attribute đó (như native). Nhãn là nội dung chữ, khoảng trắng được gộp lại.
12. **Mục backlog làm trong giai đoạn này:**
    - tách cỗ máy phím Space (Task 1);
    - text control kế thừa `autocomplete="off"` từ form (Task 2);
    - `implicitSubmit` tính cả `neu-number-field` (Task 2).

    Các mục backlog khác để sau: bảng entity WHATWG, avatar, button-group, icon, submitter, `get form()`.

## Review Focus

1. **Textarea có giá trị bắt đầu bằng xuống dòng**, qua SSR lẫn render ở client: giá trị giữ nguyên. → Task 3.
2. **Select/RadioGroup nhận `value` trước khi có option/radio**, ví dụ React đặt prop trước, hoặc option tải bất đồng bộ: lựa chọn được áp dụng khi option xuất hiện. Gỡ option đang chọn thì về trạng thái chưa chọn. → Task 6, Task 8.
3. **RadioGroup khi radio bị thêm, bớt hoặc disable sau khi render:** luôn có đúng một điểm dừng Tab, và lựa chọn nhất quán. SSR hiện đúng radio được chọn khi chưa có JS. → Task 6.
4. **NumberField:**
   - gõ chữ không phải số, hoặc số ngoài khoảng: validity giống native (`badInput`, `rangeOverflow`);
   - nút −/+ dừng ở `min`/`max`;
   - ô trống thì `valueAsNumber` là `NaN`.

   → Task 4.
5. **Slider:**
   - kéo ra ngoài track, `max < min`, hoặc `step` không chia hết khoảng: giá trị luôn trong khoảng và đúng bước;
   - RTL đảo cả phím lẫn hướng kéo.

   → Task 7.

---

### Task 1: Cỗ máy phím dùng chung và cách đo ngân sách

**Files:**
- Create: `packages/elements/src/components/shared/press.ts`
- Modify: `components/button/button.ts`, `components/switch/switch.ts`, `scripts/check-size.mjs`
- Test: `components/shared/press.test.ts`. Mọi test hiện có của button và switch phải xanh mà **không sửa** test nào.

**Interfaces:**
- Produces: `type EnterMode = 'repeat' | 'once' | 'none'` và `pressable(host: HTMLElement, states: CustomStateSet, enter: EnterMode, inactive: () => boolean): void`. Hàm gắn 4 listener lên host:
  - **Space keydown:** khi `!inactive()` và chưa bị hủy thì `preventDefault()` và bật `pressed`.
  - **Space keyup:** khi đang `pressed` thì tắt `pressed`, rồi `afterDispatch` → `host.click()` nếu keyup không bị hủy và `!inactive()`.
  - **Enter keydown:** với `repeat` thì mọi lần; với `once` thì chỉ khi `!event.repeat`; với `none` thì không làm gì. Gọi `afterDispatch` → `click()` nếu không bị hủy và `!inactive()`.
  - **blur / focus:** tắt `pressed`, giống code hiện có (blur chỉ tắt khi `!isActiveInRoot(host)`).
- Button dùng `pressable(this, this.internals.states, 'repeat', () => this.inactive)`. Switch dùng `'once'` và `() => this.isDisabled`.

- [ ] **Step 1: Viết test thất bại** (`press.test.ts`, trên một custom element thử nghiệm tối giản):
  - "Space clicks on keyup only after its own keydown";
  - "Enter: repeat clicks on every keydown, once ignores repeats, none never clicks";
  - "inactive blocks arming and clicking";
  - "a cancelled keyup does not click".
- [ ] **Step 2:** `BROWSERS=chromium pnpm --filter @neumorphism-ui/elements test press` → FAIL.
- [ ] **Step 3:** Viết `press.ts`. Thay code trùng lặp trong button và switch bằng lời gọi `pressable`. Thêm hai trường tùy chọn cho mỗi dòng trong `check-size.mjs`: `base: [file, ClassName]` và `limit`. Áp dụng cho icon-button theo quyết định 1.
- [ ] **Step 4:** Chạy cả gói trên 3 engine → PASS. `pnpm build && pnpm size` → icon-button < 3 KB ở dòng mới.
- [ ] **Step 5:** Commit `refactor(elements): share the press handling of button and switch; measure icon-button without NeuButton`

### Task 2: Base cho text control, styles dùng chung, `autocomplete="off"` của form

**Files:**
- Create: `components/shared/text-control.ts`, `components/shared/field.styles.ts`
- Modify: `components/text-field/text-field.ts`, `text-field.styles.ts`, `implicit-submit.ts`
- Test: `components/text-field/text-field.test.ts`. Mọi test cũ giữ nguyên, chỉ thêm test mới.

**Interfaces:**
- Produces: `abstract class TextControlElement extends FormControlElement`. Phần chung chuyển từ `NeuTextField` sang:
  - `value` / `defaultValue`, `dirty`, `pendingValue`;
  - `focus()`, `select()`, `setSelectionRange()`;
  - `rendered()`: nối listener `input` / `change` / `keydown` trên `ref('input')`;
  - `validate()` dùng `copyValidity`; `resetToDefault()`, `restoreState()`;
  - `update()` cho các prop chung (`value`, `placeholder`, `required`, `disabled`, `readOnly`, `minLength`, `maxLength`, `autocomplete`, `enterKeyHint`, `label`, `helpText`). Mỗi prop chỉ được xử lý khi có trong `changed`.
- Subclass cung cấp:
  - `protected abstract readonly commitProps: readonly string[]`;
  - `protected abstract probe(value: string): HTMLInputElement | HTMLTextAreaElement` (control tách rời, đã có đủ ràng buộc);
  - `protected controlKeyDown(event: KeyboardEvent): void {}` (mặc định không làm gì; text-field override để xử lý Enter → `implicitSubmit`).
- `formState()` trả về `null` khi:
  - `autocomplete` của chính control là `off`; hoặc
  - control không đặt `autocomplete` và `internals.form?.getAttribute('autocomplete')` (trim, lowercase) là `off`.

  Text-field vẫn trả `null` cho `type=password`.
- `fieldStyles` (`field.styles.ts`): phần chung về label, `.control`, `.input`, help và error, lấy từ `textFieldStyles`. Text-field giữ các rule prefix/suffix.
- `implicitSubmit`: đếm control chặn submit qua `BLOCKING_TAGS = new Set(['neu-text-field', 'neu-number-field'])`.

- [ ] **Step 1: Viết test thất bại:**
  - "a field in a form with autocomplete=off saves no restore state": spy `internalsOf(el).setFormValue`, gõ chữ → đối số thứ hai là `null`. Thêm `autocomplete="on"` trên chính field → lại có state.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Trước khi sửa styles, chạy `pnpm build && pnpm test:visual --update-snapshots` để lấy baseline cục bộ. Sau đó tách base và styles.
- [ ] **Step 4:** Toàn bộ test text-field xanh. `pnpm build && pnpm test:visual` (không update) pass, nghĩa là text-field không đổi một pixel nào.
- [ ] **Step 5:** R8 (trừ R1–R7), rồi commit `refactor(elements): extract a text-control base and shared field styles; honour form autocomplete=off`

### Task 3: `<neu-textarea>`

**Files:** `components/textarea/*`, `src/textarea.ts`. Áp dụng R1–R8.

**Interfaces:**
- Consumes: `TextControlElement`, `fieldStyles` (Task 2).
- `textareaDef`:
  - tag `neu-textarea`; `delegatesFocus: true`; `form: { valueProp: 'value' }`.
  - Props: `value`, `name` (reflect), `label`, `placeholder`, `helpText`, `errorText`, `required` (reflect), `disabled` (reflect), `readOnly` (attribute `readonly`, reflect), `minLength` / `maxLength` (number, mặc định `-1`), `autocomplete`, `enterKeyHint` (attribute `enterkeyhint`), `rows` (number, mặc định 3; giá trị `< 1` hoặc không nguyên thì dùng 3), `resize` (`none|vertical|auto`, mặc định `vertical`, reflect), `size` (sm|md|lg, reflect).
- Template: như text-field nhưng không có prefix/suffix. Control là `<textarea part="textarea" class="input" id="input" data-ref="input" rows="…" aria-describedby="help"…>` + `\n` + giá trị + `</textarea>` (quyết định 5).
- Hành vi:
  - Enter xuống dòng, không submit (không override `controlKeyDown`).
  - `resize=auto`: sau mỗi `input` và mỗi lần đặt `value`, đặt `block-size` của textarea theo `scrollHeight`, không nhỏ hơn chiều cao của `rows`.
- Styles: `.input` có `padding-block: 0.625rem`, `resize` theo attribute (`auto` → `none`), `line-height: 1.4`.
- R4: không ẩn; `display: block`. `min-block-size` đo ở `rows=3`, có `label` và không có `label`.

- [ ] **Step 1: Viết test thất bại:**
  - "a value starting with a newline survives client render and SSR" *(Review Focus 1)*: `value="\nA"` → `el.value === '\nA'`. Ca parity R2 có `value: '\nA'`.
  - "rows sets the height; invalid rows fall back to 3".
  - "resize=auto grows with the content and never below rows".
  - "Enter inserts a newline and does not submit the form".
  - "validity mirrors the inner textarea (required, minlength, maxlength)".
  - Cộng các test chung của R7.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS.
- [ ] **Step 5:** R8, rồi commit `feat(elements): add neu-textarea`

### Task 4: `<neu-number-field>`

**Files:** `components/number-field/*`, `src/number-field.ts`. Áp dụng R1–R8.

**Interfaces:**
- Consumes: `TextControlElement`, `fieldStyles` (Task 2); `systemIconSvg('minus' | 'plus')` (`components/icon/system-icons.ts`), chèn bằng `unsafeHTML`.
- `numberFieldDef`:
  - tag `neu-number-field`; `delegatesFocus: true`; `form: { valueProp: 'value' }`.
  - Props: `value`, `min` / `max` (number, mặc định `NaN`), `step` (number, mặc định 1), `name` (reflect), `label`, `placeholder`, `helpText`, `errorText`, `required` (reflect), `disabled` (reflect), `readOnly` (attribute `readonly`, reflect), `size` (reflect), `incrementLabel` (mặc định `'Increase'`), `decrementLabel` (mặc định `'Decrease'`).
- Template: trong `.control` là `<button part="decrement" class="step" type="button" tabindex="-1" aria-label="…" data-ref="decrement">−svg</button>`, rồi `<input part="input" class="input" id="input" data-ref="input" type="number" inputmode="decimal" …>`, rồi nút `increment` tương tự với +svg. `min` / `max` chỉ render khi hữu hạn; `step` luôn render.
- Hành vi (quyết định 6):
  - Nút: `stepDown()` / `stepUp()` (bọc trong `try`); sau đó phát `input` (composed) trên ô input bên trong, rồi `change` trên ô đó (base chuyển thành `change` trên host).
  - Nút bị disable khi control disabled hoặc readonly.
  - Phím trên input: PageUp/PageDown là ±10 × step; Home/End về `min` / `max` khi các giá trị này hữu hạn. Phím đã xử lý thì `preventDefault`. Enter → `implicitSubmit`.
  - `valueAsNumber`: getter đọc từ ô input (`NaN` khi trống); setter nhận số, `NaN` thì đặt `''`.
- Styles: ẩn spinner native (`appearance: textfield`, `::-webkit-inner-spin-button { appearance: none }`). Nút `.step` là hình tròn 1.75rem, bóng `--_neu-raised-sm`, khi nhấn thì `--_neu-inset-sm`.
- R4: có trong danh sách ẩn; `display: block; min-block-size` như text-field (2.75rem, có `[label]` thì 4.125rem).

- [ ] **Step 1: Viết test thất bại:**
  - "is a native spinbutton named by label" (vai trò của input bên trong).
  - "buttons step and stop at min and max; they fire input then change and keep focus in the input" *(Review Focus 4)*.
  - "PageUp/PageDown step by ten; Home/End jump to min/max only when set".
  - "invalid and out-of-range input set badInput / rangeOverflow like a native input; valueAsNumber is NaN when empty" *(Review Focus 4)*.
  - "step ≤ 0 falls back to 1; increment-label and decrement-label override the button names".
  - "Enter submits implicitly: a lone number field blocks implicit submission like a native one".
  - Cộng các test chung của R7.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS.
- [ ] **Step 5:** R8, rồi commit `feat(elements): add neu-number-field`

### Task 5: Base cho control có trạng thái chọn, và `<neu-checkbox>`

**Files:**
- Create: `components/shared/checkable.ts`, `components/checkbox/*`, `src/checkbox.ts`
- Modify: `components/switch/switch.ts`. Test cũ của switch giữ nguyên.
- Áp dụng R1–R8 cho checkbox.

**Interfaces:**
- Produces: `abstract class CheckableElement extends FormControlElement`. Phần chung chuyển từ `NeuSwitch` sang:
  - `checked` / `defaultChecked`, `dirty`;
  - click đổi trạng thái: `input` rồi `change` sau khi dispatch; event bị hủy thì quay lại trạng thái cũ;
  - `willUpdate` / `update`, `formValue` / `formState`, `validate` (`requiredCheckboxMessage()`), reset và restore;
  - gọi `pressable` (Task 1) với `static enter: EnterMode`.
- Subclass cung cấp:
  - `protected abstract readonly anchor: string`: data-ref làm điểm neo cho thông báo validity (switch `'track'`, checkbox `'control'`);
  - `protected abstract paint(): void`: đổi class trong shadow;
  - `protected flip(): () => void`: đổi trạng thái và trả về hàm hoàn tác. Base lật `checked`.
- `aria-checked` đọc từ `protected ariaChecked(): 'true' | 'false' | 'mixed'`.
- `checkboxDef`:
  - tag `neu-checkbox`; `form: { valueProp: 'checked' }`.
  - Props: `checked`, `indeterminate` (không reflect), `name` (reflect), `value` (mặc định `'on'`, reflect), `disabled` (reflect), `required` (reflect), `size` (sm|md|lg, reflect).
- Template: `<span part="base" class="base"><span part="control" class="control[ on][ mixed]" data-ref="control"><span part="indicator" class="indicator">checkSvg minusSvg</span></span><span part="label" class="label"><slot></slot></span></span>`. Hai class `on` và `mixed` lấy từ attribute, nên SSR hiện đúng.
- Hành vi:
  - `role = 'checkbox'`; `static enter = 'none'` (chỉ Space đổi trạng thái).
  - `flip()`: đang `indeterminate` thì thành `checked = true` và `indeterminate = false`; nếu không thì lật `checked`. Hàm hoàn tác trả lại cả hai.
  - State: `checked`, `indeterminate`.
- Styles:
  - Ô vuông 1.25rem (sm 1rem, lg 1.5rem), bo `calc(var(--_neu-r) * 0.4)`, bóng `--_neu-inset-sm`.
  - Khi `on` hoặc `mixed`: nền `--_neu-accent-soft`, icon màu `--_neu-accent-c`. `mixed` hiện dấu trừ, `on` hiện dấu check.
  - Focus ring trên `.control`; disabled thì `opacity: 0.55`.
- R4: có trong danh sách ẩn; `display: inline-flex; min-block-size: 1.25rem`.

- [ ] **Step 1: Viết test thất bại:**
  - "clicking an indeterminate checkbox checks it; aria-checked goes mixed → true".
  - "a cancelled click restores both checked and indeterminate".
  - "Space toggles, Enter does not".
  - "form value is value when checked and missing otherwise; required unchecked is valueMissing".
  - Cộng các test chung của R7.
- [ ] **Step 2:** FAIL. **Step 3:** Tách base, chuyển switch sang base, viết checkbox. **Step 4:** Mọi test của switch và checkbox PASS.
- [ ] **Step 5:** R8, rồi commit `feat(elements): add neu-checkbox on a checkable base shared with neu-switch`

### Task 6: `<neu-radio>` và `<neu-radio-group>`

**Files:** `components/radio/*`, `components/radio-group/*`, `src/radio.ts`, `src/radio-group.ts`. Áp dụng R1–R8 cho cả hai.

**Interfaces:**
- `radioDef`: tag `neu-radio`; props `value` (reflect), `disabled` (reflect).
  - Template: `<span part="base" class="base"><span part="control" class="control"><span part="indicator" class="indicator"></span></span><span part="label" class="label"><slot></slot></span></span>`.
  - `role = 'radio'`. Không form-associated.
- `class NeuRadio`:
  - getter `checked`, chỉ đọc.
  - Export symbol `SET_CHECKED` và `SET_GROUP_DISABLED` để group gọi. Gọi `SET_CHECKED` thì đặt `aria-checked` và `:state(checked)`.
  - `isDisabled` = disabled của chính nó, hoặc group đang disabled. Mỗi lần giá trị này đổi thì gọi `syncDisabledState()`.
- Styles của radio:
  - `:host(:state(checked)) { --_neu-radio-on: 1 }`.
  - `.indicator { transform: scale(var(--_neu-radio-on, 0)) }`: chấm tròn màu accent.
  - Vòng ngoài 1.25rem, bóng `--_neu-inset-sm`. Focus ring.
- `radioGroupDef`:
  - tag `neu-radio-group`; `form: { valueProp: 'value' }`.
  - Props: `label`, `name` (reflect), `value`, `required` (reflect), `disabled` (reflect), `orientation` (`vertical|horizontal`, mặc định `vertical`, reflect).
  - Template: `<div part="base" class="base"><span part="label" class="label" data-ref="label">…</span><span class="items"><slot></slot></span><style data-ref="mark">…</style></div>`.
  - Nội dung của style là `::slotted(neu-radio[value="${cssString(value)}"]){--_neu-radio-on:1}`, hoặc rỗng khi `value` rỗng. `cssString` thay `\`, `"` và xuống dòng bằng mã escape hex của CSS (quyết định 7).
- `class NeuRadioGroup extends FormControlElement`:
  - `role = 'radiogroup'`, `ariaLabel = label`.
  - Radio thuộc group là các `neu-radio` có `closest('neu-radio-group')` chính là group này.
  - Giữ chuỗi `current` (quyết định 8). Radio được chọn là radio thuộc group đầu tiên có `value === current`.
  - Một `MutationObserver` theo dõi `childList`, `subtree` và attribute `disabled` / `value`. Khi kích hoạt, nó tính lại:
    - `SET_CHECKED` cho mọi radio;
    - roving tabindex: radio được chọn mà đang bật có `tabindex="0"`, nếu không có thì radio bật đầu tiên. Các radio bật khác có `-1`; group không ghi tabindex lên radio đang disabled;
    - `SET_GROUP_DISABLED`;
    - nội dung của `mark` (theo giá trị hiện tại).
  - Delegation:
    - **click** trên radio đang bật: chọn nó.
    - **ArrowDown/ArrowRight:** radio bật kế tiếp, vòng lại ở cuối. **ArrowUp/ArrowLeft:** radio bật trước đó. Cả hai đều focus và chọn.
    - **Space:** chọn radio đang focus và `preventDefault`.
    - Chọn do người dùng → `markInteracted`, rồi `input` và `change` trên group. Chọn lại radio đang được chọn thì không có event.
  - Form:
    - `formValue`: `current` nếu có radio khớp, không thì `null`.
    - `required` mà chưa chọn → `valueMissing`. Thông báo mượn từ một `<input type=radio required>` dò (hàm cấp component). Điểm neo là radio đang giữ điểm dừng Tab.
- Styles của group: `.items` là flex có `gap: 0.75rem`, xếp dọc khi `vertical` và xếp hàng khi `horizontal`. `.label` giống label của field. `:host(:disabled) .items { opacity: 0.55; cursor: not-allowed }`; selector `:disabled` bắt cả khi disabled do `<fieldset>`.
- Styles của radio: `:host([disabled]) .base { opacity: 0.55 }`.
- R4: `neu-radio` có trong danh sách ẩn, `display: inline-flex; min-block-size: 1.25rem`. `neu-radio-group` không ẩn, `display: block`.

- [ ] **Step 1: Viết test thất bại:**
  - "arrows move and select, wrap, and skip disabled radios; Space selects the focused radio".
  - "exactly one radio is in the tab order as radios are added, removed and disabled" *(Review Focus 3)*.
  - "a value set before its radio exists applies when the radio is added; removing the checked radio clears the selection" *(Review Focus 2)*.
  - "server markup marks the selected radio before any definition runs" *(Review Focus 3)*. Parse SSR markup của group (`value="b"`) cùng 3 radio vào document tách rời; dùng tag giả chưa được định nghĩa như test "disabled look". Kết quả: `transform` của `.indicator` trên radio `b` khác với hai radio còn lại.
  - "a disabled group (attribute or fieldset) disables every radio and emits nothing".
  - "FormData has name=value; reset restores the default; required with no selection is valueMissing".
  - Cộng các test chung của R7 cho cả hai tag.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS.
- [ ] **Step 5:** R8, rồi commit `feat(elements): add neu-radio-group and neu-radio`

### Task 7: Property chỉ đặt bằng JS, và `<neu-slider>`

**Files:**
- Modify: `src/core/define.ts` (chỉ kiểu), `tools/gen/src/lib.mjs`, `tools/gen/src/lib.test.mjs`, `packages/react/src/create-component.ts`, `packages/react/src/create-component.test.ts`
- Create: `components/slider/*`, `src/slider.ts`. Áp dụng R1–R8.

**Interfaces:**
- `ComponentDef.properties?: Readonly<Record<string, string>>`: property chỉ đặt bằng JS, ánh xạ tên → kiểu TypeScript dạng chuỗi.
- gen:
  - Wrapper có thêm `  <name>?: <type>;` cho mỗi property; manifest có thêm member `{ kind: 'field', name, type }`.
  - Kiểu của `defaultValue` (cả wrapper lẫn manifest) bằng `propTsType` của prop giá trị.
- `createComponent`: đưa `Object.keys(def.properties ?? {})` vào `elementKeys`.
- `slider.def.ts`, phần DOM-free dùng chung cho SSR và class:
  - `sliderValue(raw: number, min: number, max: number, step: number): number`:
    - `max < min` thì coi `max = min`; `step ≤ 0` thì dùng 1;
    - `NaN` thì lấy điểm giữa;
    - làm tròn về bước gần nhất tính từ `min`, rồi kẹp vào khoảng. Nếu vượt `max` thì lùi về bước lớn nhất không vượt `max`;
    - làm tròn tới số chữ số thập phân lớn nhất của `step` và `min`.
  - `sliderBigStep(min: number, max: number, step: number): number` = `max(step, round((max − min) / 10 / step) × step)`.
- `sliderDef`:
  - tag `neu-slider`; `form: { valueProp: 'value' }`; `properties: { valueFormatter: '(value: number) => string' }`.
  - Props: `value` (number, mặc định `NaN`), `min` (0), `max` (100), `step` (1), `name` (reflect), `label`, `disabled` (reflect).
  - Template: `<span part="base" class="base" data-ref="base" style="--_neu-pos:${pos}"><span part="track" class="track"><span part="fill" class="fill"></span><span part="thumb" class="thumb"></span></span></span>`, với `pos` = vị trí từ 0 đến 1, làm tròn 4 chữ số.
- `class NeuSlider extends FormControlElement`:
  - `role = 'slider'`, `ariaOrientation = 'horizontal'`, `ariaLabel = label`, và `ariaValueMin` / `ariaValueMax` / `ariaValueNow`. `ariaValueText` là `valueFormatter?.(value)`, không có thì `null`.
  - `value` / `defaultValue` là số. `extraProperties = ['defaultValue', 'valueFormatter']`.
  - Phím (`preventDefault` cho cả các phím này):
    - ArrowRight/ArrowUp là +step; ArrowLeft/ArrowDown là −step; Left/Right đảo chiều khi `:dir(rtl)`;
    - PageUp/PageDown là ±bước lớn; Home/End về min/max;
    - mỗi phím làm đổi giá trị thì phát `input` rồi `change`.
  - Con trỏ:
    - `pointerdown` (nút chính, không disabled): focus host, `setPointerCapture`, ghi nhớ giá trị lúc bắt đầu, nhảy tới vị trí con trỏ, phát `input` nếu đổi;
    - `pointermove` khi đang capture: phát `input` mỗi lần giá trị đổi;
    - `pointerup` / `pointercancel`: phát `change` nếu khác giá trị lúc bắt đầu;
    - vị trí tính từ `getBoundingClientRect()` của track và đảo chiều khi RTL.
  - `update` chỉ ghi lại attribute `style` của `.base` (cùng định dạng chuỗi với template) khi giá trị khác.
  - Form: `formValue` = `String(value)`; validity luôn hợp lệ.
- Styles: `:host { display: block; touch-action: none }`. Track lõm 0.5rem, fill màu `--_neu-accent-soft`, thumb nổi 1.25rem đặt bằng `inset-inline-start: calc(var(--_neu-pos) * 100%)`, focus ring trên thumb.
- R4: có trong danh sách ẩn; `display: block; min-block-size: 1.25rem`.

- [ ] **Step 1: Viết test thất bại:**
  - gen: "JS-only properties reach the wrapper and the manifest; defaultValue follows the value prop type" → `valueFormatter?: (value: number) => string`, `defaultValue?: number` trong wrapper của slider.
  - `create-component.test.ts`: "a JS-only property is set on the element, not as an attribute".
  - "sliderValue clamps, snaps and handles max < min and fractional steps" *(Review Focus 5)*, dạng bảng.
  - "keys step, page, jump and flip in RTL; each change fires input then change" *(Review Focus 5)*.
  - "dragging past either end stays in range; change fires once on release" *(Review Focus 5)*: dùng `PointerEvent` tự tạo.
  - "valueFormatter set before upgrade drives aria-valuetext".
  - Cộng các test chung của R7.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS, gồm cả `pnpm --filter @neumorphism-ui/react test` và `pnpm --filter @neumorphism-ui/gen test`.
- [ ] **Step 5:** R8, rồi commit `feat(elements): add neu-slider; JS-only properties in definitions, wrappers and the manifest`

### Task 8: `<neu-option>` và `<neu-select>` (client), template context

**Files:**
- Modify: `src/core/define.ts` (chỉ kiểu), `src/ssr.ts`
- Create: `components/option/*`, `components/select/*`, `src/option.ts`, `src/select.ts`. Áp dụng R1–R8 cho cả hai.
- R5: `neu-select` có giới hạn 5 KB.

**Interfaces:**
- `define.ts` có thêm:
  - `interface OptionData { readonly value: string; readonly label: string; readonly disabled?: boolean }`;
  - `interface TemplateContext { readonly options?: readonly OptionData[] }`;
  - `template(props, ctx?: TemplateContext): RawHtml`;
  - `readonly optionsFrom?: string` (tag của phần tử con mang `OptionData`).
- `ssr.ts`: `renderShadowContents(def, attrs, ctx?)` và `renderDSD(tag, attrs, ctx?)` chuyển `ctx` xuống template (§8.2). Export các kiểu `OptionData`, `TemplateContext`.
- `optionDef`: tag `neu-option`; props `value` (reflect), `disabled` (reflect). Template `<slot></slot>`. Style `:host { display: none !important }`. Không có role.
- `selectDef`:
  - tag `neu-select`; `delegatesFocus: true`; `form: { valueProp: 'value' }`; `optionsFrom: 'neu-option'`.
  - Props: `value`, `name` (reflect), `label`, `placeholder`, `helpText`, `errorText`, `required` (reflect), `disabled` (reflect), `size` (reflect).
  - Template:
    - `<div part="base" class="base">`
    - `<span part="label" class="label" id="label" data-ref="label">…</span>`
    - `<div part="combobox" class="combobox" id="combobox" role="combobox" tabindex="0" aria-haspopup="listbox" aria-expanded="false" aria-controls="listbox" aria-labelledby="label" aria-describedby="help" data-ref="combobox">`
      - `<span part="display" class="display[ placeholder]" data-ref="display">…</span>`
      - `<span part="chevron" class="chevron">chevron-down svg</span>`
    - `</div>`
    - `<div part="listbox" class="listbox" id="listbox" role="listbox" aria-labelledby="label" popover="auto" data-ref="listbox"></div>`
    - phần help và error như text-field
    - `</div>`

    Trong template không có slot mặc định, nên các `neu-option` không được render. Nội dung của display là nhãn của option đầu tiên trong `ctx.options` có `value === props.value`; nếu không có thì là `placeholder`, kèm class `placeholder`.
  - Ở client, `ensureRoot` render template **không có** `ctx`, và core **không đổi**. `update()` điền display từ option đọc được trong light DOM; `setText` chỉ ghi khi chữ khác. Nhờ vậy root SSR và root mới render khớp nhau sau `update`.
  - R2: mở rộng `Case` trong `ssr.test.ts` với trường `ctx` tùy chọn, rồi truyền vào `renderDSD`. Ca của select dùng `attrs: { label: 'Plan', value: 'b' }`, light DOM gồm hai `neu-option` (`a`/Alpha, `b`/Beta), `ctx` khớp với light DOM, và `ref: '.combobox'`.
- `class NeuSelect extends FormControlElement`:
  - Đọc option trực tiếp từ light DOM qua attribute và chữ, không cần đợi `neu-option` được nâng cấp: `value = getAttribute('value') ?? label`, `label` là `textContent` đã gộp khoảng trắng, `disabled = hasAttribute('disabled')`.
  - Đọc lại khi `connected`, và qua `MutationObserver` (childList, subtree, characterData, attribute `value` / `disabled`). Đang mở thì dựng lại listbox.
  - Giá trị được yêu cầu theo quyết định 8.
  - Mở:
    - lần đầu thì dựng `<div part="option" class="option" role="option" id="option-N" aria-selected aria-disabled>` cho từng option, nhãn đặt bằng `textContent`;
    - option đang trỏ là option được chọn, nếu không có thì option bật đầu tiên;
    - gọi `showPopover()`, đặt vị trí, `aria-expanded="true"`, `aria-activedescendant`, rồi phát `neu-open`.
  - Đặt vị trí:
    - `position: fixed`, rộng bằng nút kích hoạt, nằm ngay dưới nút (cách 4px);
    - nếu phía dưới không đủ chỗ mà phía trên nhiều chỗ hơn thì lật lên trên;
    - tính lại khi `scroll` (capture) và `resize` trong lúc mở.
  - Đóng: `hidePopover()`, `aria-expanded="false"`, gỡ `aria-activedescendant` và listener, phát `neu-close`. Sự kiện `toggle` của popover với `newState === 'closed'` cũng đi qua cùng đường đóng này (idempotent).
  - Phím trên nút kích hoạt: theo đúng §7.2.
    - Bộ đệm typeahead tự xóa sau 500ms. Tìm từ option sau option đang trỏ, vòng lại; khớp theo tiền tố, không phân biệt hoa thường; bộ đệm chỉ gồm một ký tự lặp lại thì tìm theo ký tự đó.
    - Option disabled bị bỏ qua khi di chuyển và không chọn được.
    - Tab khi đang mở: chọn option đang trỏ và đóng, không `preventDefault`.
  - Chuột:
    - click nút kích hoạt thì mở hoặc đóng;
    - click option đang bật thì chọn và đóng;
    - `pointermove` trên option thì đặt option đó làm option đang trỏ;
    - click nhãn thì focus nút kích hoạt.
  - Chọn: giá trị đổi → `markInteracted`, rồi `input` và `change`.
  - Disabled: không mở, `aria-disabled="true"`, gỡ `tabindex` của nút kích hoạt.
  - Form:
    - `formValue`: `value || null`;
    - `required` với `value === ''` → `valueMissing`, thông báo mượn từ một `<select required>` dò, điểm neo là nút kích hoạt;
    - lỗi hiển thị như text-field.
- Styles: dùng `fieldStyles` cho label, help và error.
  - Nút kích hoạt cao 2.75rem (sm 2.25rem, lg 3.25rem), bóng `--_neu-raised-sm`. Placeholder dùng `--_neu-fg-muted`.
  - Listbox: `margin: 0; inset: auto; max-block-size: 16rem; overflow: auto`, nền `--_neu-bg`, bóng `--_neu-raised`, bo `var(--_neu-r)`.
  - Option đang trỏ có bóng `--_neu-inset-sm`; option được chọn có màu `--_neu-accent-c`.
- R4:
  - `neu-select` có trong danh sách ẩn, `display: block`, với `min-block-size` 2.75rem (có `[label]` thì đo lại);
  - `neu-option:not(:defined) { display: none }`.

- [ ] **Step 1: Viết test thất bại** (`select.test.ts`):
  - "renderDSD with options shows the selected label; without a match shows the placeholder".
  - "closed keys open (Down/Up/Enter/Space/Home/End/typing); open keys move, page, select, escape and tab as §7.2".
  - "typeahead buffers within 500ms and cycles on a repeated letter".
  - "disabled options are skipped and cannot be chosen".
  - "a value set before its option exists applies when the option arrives; removing the selected option clears the value" *(Review Focus 2)*.
  - "options edited while open rebuild the listbox".
  - "aria: combobox expanded/activedescendant/labelledby; listbox and options roles; axe passes open and closed".
  - "the listbox flips above when there is no room below".
  - "input then change on a new choice, none for the same; neu-open/neu-close".
  - "FormData/reset/required/user-invalid/fieldset disabled".
  - `option.test.ts`: "is hidden and carries value (or its label) and disabled".
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS, và `pnpm size` → select ≤ 5 KB.
- [ ] **Step 5:** R8, rồi commit `feat(elements): add neu-select and neu-option`

### Task 9: SSR cho Select — `transformHtml`, wrapper React, ví dụ và e2e

**Files:**
- Modify: `packages/ssr/src/transform-html.ts`, `transform-html.test.ts`, `packages/react/src/create-component.ts`, `packages/react/src/ssr.node.test.ts`, `apps/examples/next/app/demo-form.tsx`, `apps/examples/nuxt/app/app.vue`, `e2e/ssr.spec.ts`

**Interfaces:**
- `transformHtml`: với tag có `def.optionsFrom`:
  - quét từ cuối thẻ mở tới `</tag` đầu tiên;
  - mỗi thẻ mở `optionsFrom` cho ra một `OptionData`:
    - `label`: chữ tới `</optionsFrom`, bỏ thẻ, `decodeEntities`, gộp khoảng trắng;
    - `value`: attribute `value`, không có thì lấy `label`;
    - `disabled`: có attribute `disabled` hay không;
  - gọi `renderDSD(tag, attrs, { options })`.

  Select lồng nhau không được hỗ trợ: quét dừng ở thẻ đóng đầu tiên.
- `createComponent` trên server, khi `def.optionsFrom` có giá trị:
  - đi qua `children` (cả fragment và mảng);
  - một phần tử được tính là option khi `type === optionsFrom`, hoặc `type.displayName === optionsFrom`;
  - nhãn ghép từ các con là chuỗi hoặc số, đệ quy vào phần tử con; nếu không đọc được thì để `''` (§8.4);
  - truyền `{ options }` vào `renderShadowContents`.
- Ví dụ:
  - **Next:** chèn sau `NeuSwitch`: `<NeuSelect data-testid="plan" name="plan" label="Plan" defaultValue="pro"><NeuOption value="free">Free</NeuOption><NeuOption value="pro">Pro</NeuOption></NeuSelect>`.
  - **Nuxt:** chèn markup tương đương bằng tag thô (`value="pro"`).
- `e2e/ssr.spec.ts`:
  - thêm `'neu-select'` vào `TAGS`;
  - test 2 kỳ vọng `shadow` có 4 phần tử `true`, và khi tắt JS thì `.display` của select có chữ `Pro`;
  - test 4 kỳ vọng `{"email":"x@y.zz","plan":"pro"}`, rồi `{"email":"x@y.zz","notify":"on","plan":"pro"}`.

- [ ] **Step 1: Viết test thất bại:**
  - `transform-html.test.ts`:
    - "neu-select gets the selected option's label";
    - "entities in option text are decoded";
    - "an option without value uses its label";
    - "no match renders the placeholder";
    - "transforming twice is a no-op".
  - `ssr.node.test.ts`: "NeuSelect renders the label of the NeuOption matching value or defaultValue".
  - Phần e2e đã sửa như mục Interfaces.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Cài đặt.
- [ ] **Step 4:** `pnpm test && pnpm examples:build && pnpm test:ssr:prod && pnpm test:ssr:dev` → PASS, gồm cả tiêu chí CLS = 0 (test 3).
- [ ] **Step 5:** Commit `feat(ssr): server-render the selected label of neu-select (transformHtml and React)`

### Task 10: Visual regression, tài liệu, changeset

**Files:** `e2e/visual/index.html`, `e2e/visual.spec.ts`, `packages/elements/README.md`, `packages/react/README.md`, `README.md`, `.changeset/phase-3-forms.md`.

- [ ] **Step 1:** Thêm vào `<template id="states">` một hàng cho mỗi nhóm:
  - **Textarea:** trống (có label và placeholder), có giá trị, disabled, `resize=auto` với chữ dài.
  - **NumberField:** có giá trị, có min/max, disabled, các cỡ sm và lg.
  - **Checkbox:** chưa chọn, đã chọn, indeterminate, disabled, các cỡ sm và lg.
  - **RadioGroup:** dọc, 3 radio, chọn một, disable một; ngang, 2 radio.
  - **Slider:** 0, 50, 100, disabled.
  - **Select:** placeholder, có giá trị, disabled.
- [ ] **Step 2:** Thêm 8 tag mới vào danh sách mà `visual.spec.ts` chờ đăng ký. Thêm một test mở một select (click), rồi chụp `select-open.png` ở mỗi theme.
- [ ] **Step 3:** `pnpm build && VISUAL_PORT=4174 pnpm test:visual --update-snapshots && VISUAL_PORT=4174 pnpm test:visual` → lần chạy thứ hai phải pass. Xem bằng mắt các ảnh trong `e2e/__screenshots__/win32/`.
- [ ] **Step 4:** Cập nhật các README:
  - `@neumorphism-ui/elements` và `@neumorphism-ui/react`: danh sách component, ví dụ Select và RadioGroup;
  - README gốc: thêm 8 phần tử mới vào bảng component. Thay câu "Six more components are planned for v1" bằng một câu cho biết bộ v1 đã đủ, và giai đoạn 4 là trang docs.
- [ ] **Step 5:** Tạo `.changeset/phase-3-forms.md` với bump `minor` cho cả bốn package. Mô tả: "Phase 3: neu-textarea, neu-number-field, neu-checkbox, neu-radio-group and neu-radio, neu-slider, neu-select and neu-option; the selected label of a select is server-rendered by transformHtml and the React wrapper."
- [ ] **Step 6:** `pnpm format && pnpm lint && pnpm build && pnpm gen --check && pnpm typecheck && pnpm test && pnpm size && pnpm examples:build && pnpm test:ssr:prod && pnpm test:ssr:dev && VISUAL_PORT=4174 pnpm test:visual` → tất cả xanh.
- [ ] **Step 7:** Commit `test: visual states for the form group; docs and changeset for phase 3`
- [ ] **Step 8 (sau khi người dùng đồng ý push):** `gh workflow run visual-baselines.yml --ref feat/phase-3-forms` để sinh baseline Linux. Workflow này commit bằng `GITHUB_TOKEN` nên không kích hoạt CI. Sau đó đóng rồi mở lại PR để CI chạy.
