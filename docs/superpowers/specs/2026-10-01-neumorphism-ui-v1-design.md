# neumorphism-ui v1 — Design Spec

- **Ngày:** 2026-10-01
- **Trạng thái:** Chờ duyệt
- **Phạm vi:** Nền móng của thư viện + 17 component v1 (nhóm Cơ bản và Form lõi)

---

## 1. Mục tiêu

Xây một thư viện UI neumorphism mã nguồn mở, publish lên npm, dùng được trong mọi framework
(Web Components), có SSR, React wrapper và bản CDN.

**v1 thành công khi:**

1. 17 component trong mục 7 đều qua checklist test ở mục 11, trên Chromium, Firefox và WebKit.
2. Một trang Next.js (App Router) và một trang Nuxt dùng các component đó SSR đúng 4 tiêu chí ở mục 8.6.
3. Người dùng đổi được màu nền, accent, độ nổi, bo góc và sáng/tối chỉ bằng CSS variables,
   và đổi được ở bất kỳ vùng con nào của trang.
4. Dùng được bằng 2 dòng HTML qua CDN, không cần build tool.
5. Nằm trong ngân sách dung lượng ở mục 10.

## 2. Các quyết định đã chốt

| Chủ đề | Quyết định |
|---|---|
| Mục đích | Open-source, publish npm, repo public trên GitHub, license MIT |
| Công nghệ | Custom Elements thuần, **0 runtime dependency**. Công cụ build/test dùng thoải mái. |
| Thẩm mỹ | **Neumorphism thuần** (phương án A). Có ARIA và bàn phím đầy đủ, **không cam kết contrast WCAG**. |
| Focus | Chỉ hiện khi dùng bàn phím (`:focus-visible`): vầng sáng accent mờ cộng vào bóng |
| Theming | Dark mode, màu nền tùy ý, accent, độ nổi, bo góc |
| Môi trường hạng nhất | React wrapper, SSR (Next.js / Nuxt), CDN |
| Form | Mọi control tham gia `<form>` native qua `ElementInternals` |
| Phát hành | v1 = 17 component; các nhóm khác ra ở v1.x |
| Tên | npm scope `@neumorphism-ui`, prefix tag `neu-` |

## 3. Trình duyệt hỗ trợ

**Chrome/Edge 125+, Safari 17.4+, Firefox 126+** (khoảng giữa 2024). Không polyfill, không hỗ trợ IE/legacy.

Các tính năng nền tảng mà mốc này bảo đảm:

| Tính năng | Dùng cho |
|---|---|
| `color-mix()` | Tính bóng, màu chữ từ màu nền |
| Declarative Shadow DOM (`shadowrootmode`) | SSR |
| `ElementInternals` + form-associated custom elements + ARIA reflection trên internals | Form, role của host |
| `CustomStateSet` / `:state()` | Trạng thái `checked`, `user-invalid`… để style |
| Popover API | Dropdown của Select (và overlay ở v1.x) |
| Constructable stylesheets / `adoptedStyleSheets` | Dùng chung stylesheet giữa các instance |
| Cascade layers (`@layer`) | Để CSS của người dùng luôn thắng tokens mặc định |

Không dùng CSS anchor positioning (chưa đủ phổ biến). Vị trí popover tính bằng JS.

## 4. Kiến trúc và package

### 4.1 Cấu trúc repo

```
packages/
  tokens/      @neumorphism-ui/tokens    CSS thuần. Không JS.
  elements/    @neumorphism-ui/elements  Các custom element. 0 runtime dependency.
  ssr/         @neumorphism-ui/ssr       renderDSD, transformHtml, module Nuxt.
  react/       @neumorphism-ui/react     Wrapper React sinh tự động.
apps/
  docs/                          Astro Starlight.
  examples/next/                 Kiểm thử SSR với Next.js.
  examples/nuxt/                 Kiểm thử SSR với Nuxt.
tools/
  gen/                           Sinh custom-elements.json, React wrapper, bảng API docs.
```

- pnpm workspaces, Node ≥ 20 cho công cụ, TypeScript `strict`.
- **Chỉ xuất ESM**, không có bản CommonJS.
- 4 package version cùng nhau (Changesets nhóm `fixed`).

### 4.2 Quy tắc phụ thuộc

- `tokens` và `elements`: không có dependency lúc chạy.
- `ssr`: chỉ phụ thuộc `@neumorphism-ui/elements` (cùng version). Tự viết bộ quét HTML, không dùng parser ngoài.
- `react`: `react` và `react-dom` là peer dependency (`^18.3 || ^19`), phụ thuộc `@neumorphism-ui/elements`.

### 4.3 Tách "định nghĩa" và "hành vi"

Mỗi component gồm 2 nửa:

| File | Nội dung | Chạy được ở |
|---|---|---|
| `button.def.ts` | **Định nghĩa**, không đụng DOM: tag, khai báo props, `template(props)`, `styles`, role, cấu hình form, metadata cho docs (mô tả, events, slots, parts, CSS vars) | Node và trình duyệt |
| `button.ts` | **Hành vi**: class kế thừa `NeuElement`, xử lý event, cập nhật DOM | Trình duyệt (import được trong Node, xem dưới) |
| `button.styles.ts` | CSS dạng chuỗi | Cả hai |
| `button.test.ts` | Test | Trình duyệt |

SSR, bộ sinh React wrapper và bộ sinh docs **chỉ đọc định nghĩa**, nên không cần DOM.

**Mọi module của `@neumorphism-ui/elements` phải import được trong Node mà không lỗi.** Base class dùng
`globalThis.HTMLElement ?? class {}` và chỉ gọi `customElements.define` khi `customElements` tồn tại.

### 4.4 Entry point của `@neumorphism-ui/elements`

| Import | Tác dụng |
|---|---|
| `@neumorphism-ui/elements/button.js` | Đăng ký `<neu-button>` (bỏ qua nếu đã có) và export class |
| `@neumorphism-ui/elements/all.js` | Đăng ký cả 17 component |
| `@neumorphism-ui/elements/ssr.js` | Tất cả định nghĩa, không đụng DOM, dùng cho `@neumorphism-ui/ssr` |
| `@neumorphism-ui/elements/icons.js` | `registerIconLibrary()` |

`package.json` khai báo `sideEffects` chỉ cho các file đăng ký, để bundler tree-shake được phần còn lại.

## 5. Theming (`@neumorphism-ui/tokens`)

### 5.1 Biến đầu vào công khai

| Biến | Sáng (mặc định) | Tối (mặc định) | Ý nghĩa |
|---|---|---|---|
| `--neu-bg` | `#e0e5ec` | `#2b2f36` | Màu nền: mọi thứ khác tính từ đây |
| `--neu-accent` | `#6d5dfc` | `#8b7dff` | Màu nhấn |
| `--neu-distance` | `6px` | `6px` | Khoảng cách đổ bóng cỡ `md` |
| `--neu-intensity` | `1` | `1` | Hệ số độ đậm bóng (số không đơn vị: `0.5` nhạt hơn, `2` đậm hơn) |
| `--neu-radius` | `12px` | `12px` | Bo góc cỡ `md` |
| `--neu-success` / `--neu-warning` / `--neu-danger` | `#3bb273` / `#e6a23c` / `#e5484d` | giữ nguyên | Màu trạng thái (Badge, lỗi) |
| `--neu-font` | `inherit` | `inherit` | Font chữ |
| `--neu-duration` | `150ms` | `150ms` | Thời gian chuyển động; `0ms` khi `prefers-reduced-motion` |

> Thay đổi nhỏ so với bản trình bày: `--neu-intensity` là **hệ số** chứ không phải phần trăm.
> Nhờ vậy một giá trị dùng được cho cả sáng lẫn tối, dù mỗi theme có mức bóng gốc khác nhau.

Giá trị màu và mức bóng trên là **điểm xuất phát**. Giai đoạn 1 tinh chỉnh chúng cho khớp mockup A
(card "A. Neumorphism thuần" trong `assets/2026-10-01-mockup-accessibility.html`).

### 5.2 Biến dẫn xuất

Biến nội bộ có tiền tố `--_neu-` và **không phải API công khai**.

```css
--_neu-sd: var(--neu-shadow-dark,
  color-mix(in oklab, var(--neu-bg), black min(100%, calc(var(--_neu-shade) * var(--neu-intensity)))));
--_neu-sl: var(--neu-shadow-light,
  color-mix(in oklab, var(--neu-bg), white min(100%, calc(var(--_neu-light) * var(--neu-intensity)))));
--_neu-fg:       var(--neu-fg,       color-mix(in oklab, var(--neu-bg), var(--_neu-ink) var(--_neu-fg-mix)));
--_neu-fg-muted: var(--neu-fg-muted, color-mix(in oklab, var(--neu-bg), var(--_neu-ink) var(--_neu-fg-muted-mix)));
--_neu-accent-soft: color-mix(in oklab, var(--neu-accent) 25%, var(--neu-bg));
```

Hằng số theo theme (đặt ở cấp theme, không dẫn xuất từ nền nên kế thừa bình thường):

| Hằng số | Sáng | Tối |
|---|---|---|
| `--_neu-shade` (phần trăm trộn đen cho bóng tối) | `18%` | `45%` |
| `--_neu-light` (phần trăm trộn trắng cho bóng sáng) | `100%` | `6%` |
| `--_neu-ink` (màu trộn cho chữ) | `black` | `white` |
| `--_neu-fg-mix` (phần trăm trộn `--_neu-ink` cho chữ) | `32%` | `42%` |
| `--_neu-fg-muted-mix` (phần trăm trộn `--_neu-ink` cho chữ phụ) | `18%` | `24%` |

Các giá trị trên đã được tinh chỉnh theo mockup A ở giai đoạn 1.

`--neu-fg`, `--neu-fg-muted`, `--neu-shadow-dark`, `--neu-shadow-light` là **biến ghi đè tùy chọn**:
tokens **không bao giờ đặt** chúng. Nếu đặt sẵn ở `:root`, chúng sẽ bị kế thừa dưới dạng giá trị
cố định, và vùng con đổi `--neu-bg` sẽ không còn khớp màu.

### 5.3 Quy tắc tính lại

CSS kế thừa giá trị **đã tính xong** của custom property. Vì vậy biến dẫn xuất phải được khai báo
lại ở mọi nơi `--neu-bg` có thể đổi:

- Trong `:host` của **mọi** component.
- Trong `:root`, `[data-neu-theme]` và class `.neu-surface` của tokens.

Kết quả: `<div class="neu-surface" style="--neu-bg: #f5d0d8">` hay `<neu-surface style="--neu-bg: …">`
cho bóng, chữ và accent khớp với nền hồng ở mọi thứ bên trong.

### 5.4 Dạng khối và cỡ

Bóng `md`, với `d = var(--neu-distance)`:

```css
raised: calc(d) calc(d) calc(2*d) var(--_neu-sd), calc(-1*d) calc(-1*d) calc(2*d) var(--_neu-sl)
inset:  inset calc(d) calc(d) calc(2*d) var(--_neu-sd), inset calc(-1*d) calc(-1*d) calc(2*d) var(--_neu-sl)
```

| Dạng | Định nghĩa |
|---|---|
| `flat` | Không bóng |
| `raised` | Như trên |
| `inset` | Như trên |
| `convex` | `raised` + `linear-gradient(145deg, sáng hơn nền, tối hơn nền)` |
| `concave` | `raised` + gradient đảo chiều |

| Cỡ | Khoảng cách bóng | Bo góc |
|---|---|---|
| `sm` | `0.5 × d` | `0.5 × --neu-radius` |
| `md` | `d` | `--neu-radius` |
| `lg` | `2 × d` | `2 × --neu-radius` |
| `full` | — | `999px` |

Tokens xuất các dạng này thành biến `--neu-shadow-raised-sm|md|lg`, `--neu-shadow-inset-sm|md|lg`
(khai báo lại theo quy tắc 5.3) và class tiện ích `.neu-raised`, `.neu-inset`…

**Focus ring:** `--_neu-focus: 0 0 0 3px color-mix(in oklab, var(--neu-accent) 45%, transparent)`,
nối thêm vào `box-shadow` hiện có khi `:focus-visible`.

### 5.5 Sáng/tối và cascade layers

Toàn bộ CSS của tokens nằm trong `@layer neu`, nên **CSS không layer của người dùng luôn thắng**,
bất kể độ đặc hiệu của selector.

```css
@layer neu {
  :root, [data-neu-theme="light"] { /* giá trị sáng */ color-scheme: light; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-neu-theme="light"]) { /* giá trị tối */ color-scheme: dark; }
  }
  [data-neu-theme="dark"] { /* giá trị tối */ color-scheme: dark; }
  :root { background-color: var(--neu-bg); color: var(--_neu-fg); font-family: var(--neu-font); }
}
```

Docs phải ghi rõ: muốn màu nền riêng cho từng theme thì ghi đè bằng đúng các selector trên.
Ghi đè `--neu-bg` ở `:root` trần sẽ áp cho cả hai theme.

### 5.6 Trước khi component được đăng ký

Tokens có rule `neu-*:not(:defined)` cho từng tag. Rule này giữ đúng kích thước và `display`,
đồng thời ẩn nội dung, để trang render ở client (không SSR) không bị nháy hay nhảy layout.

## 6. Mô hình component (`NeuElement`)

### 6.1 Khai báo props

```ts
props: {
  size:     { type: String,  default: 'md', values: ['sm', 'md', 'lg'] },
  disabled: { type: Boolean },
  max:      { type: Number,  default: 100 },
}
```

- Attribute dạng kebab-case ↔ property dạng camelCase.
- Mọi prop reflect ra attribute; ngoại lệ là prop giá trị của form control (`value`/`checked`) và `indeterminate`, khai báo `reflect: false`.
- `Boolean`: có attribute là `true`.
- `Number`: không parse được thì dùng `default`.
- `values`: giá trị ngoài danh sách thì dùng `default`.
- Giá trị không hợp lệ được **thay bằng mặc định trong im lặng**, không ném lỗi, không log.

**Ngoại lệ cho form control, theo đúng hành vi native:** attribute `value` và `checked` là
**giá trị mặc định** (dùng khi reset form). Property `value` / `checked` là **giá trị hiện tại**
và **không phản chiếu ngược** ra attribute. Để style theo trạng thái hiện tại, dùng `:state(checked)`,
không dùng `[checked]`.

### 6.2 Vòng đời

1. **constructor:** `attachInternals()`. Nếu `internals.shadowRoot` đã có (trang được SSR) thì
   **hydrate**: gắn tham chiếu tới các phần tử `data-ref` trong shadow root, không render lại.
   Nếu chưa có thì `attachShadow({ mode: 'open', delegatesFocus })` rồi gán
   `innerHTML = template(props)`. Root SSR thiếu một tên `data-ref` mà template hiện tại có thì
   bị render lại: hoặc response bị cắt, hoặc root do phiên bản khác của component render (trang
   cache từ trước khi nâng cấp).
2. Gắn stylesheet dùng chung qua `adoptedStyleSheets`. Xóa `<style data-neu-ssr>` nếu có.
3. **Nâng cấp property:** property được đặt trước khi element được đăng ký thì được đọc lại và
   áp dụng (pattern "upgrade property").
4. **Cập nhật:** thay đổi prop được gom trong microtask, rồi gọi `update(changed)`. Hàm này
   sửa trực tiếp đúng các node cần sửa. Không có virtual DOM, và **không bao giờ render lại toàn bộ**
   sau lần đầu.

### 6.3 Template và bảo mật

- `template(props)` là hàm thuần, tất định: cùng props cho ra cùng chuỗi, ở server và client.
- Viết bằng tagged template `html\`…\`` **tự escape mọi giá trị chèn vào**. Muốn chèn HTML thô
  phải bọc tường minh bằng `unsafeHTML()`; chỉ dùng cho SVG icon nội bộ.
- ID bên trong shadow root là ID tĩnh (`id="input"`). Shadow root tự cô lập phạm vi ID, nên
  không cần sinh ID ngẫu nhiên. Điều này giữ cho SSR và client cho ra cùng kết quả.

### 6.4 Events

- Trùng ý nghĩa với native thì dùng tên native: `input`, `change`, `click`.
- Event riêng có tiền tố `neu-`, ví dụ `neu-open`, `neu-close`.
- Mọi event phát từ host đều `bubbles: true, composed: true`.
- Control bọc input native: event `input` native vốn đã `composed` nên để nó tự lan ra.
  Event `change` native không `composed`, nên host phát lại `change`.
- Control ở trạng thái `disabled` không phát event nào.

### 6.5 Accessibility

| Kiểu | Component | Cách làm |
|---|---|---|
| **Host là control** | Button, IconButton, Checkbox, Radio, RadioGroup, Switch, Slider | `internals.role` + ARIA trên internals. Host có `tabindex="0"` (bỏ khi `disabled`). Bàn phím theo WAI-ARIA APG. Nhận được `<label for>` vì là form-associated. |
| **Control nằm trong shadow** | TextField, Textarea, NumberField (`<input>`/`<textarea>` native), Select (combobox tự dựng, xem 7.2) | Phần tử nhận focus nằm trong shadow, `delegatesFocus: true`. Label render bên trong shadow từ attribute `label` hoặc slot `label`. `help-text` nối bằng `aria-describedby` bên trong shadow. `<label for>` bên ngoài **không** gán được tên cho control bên trong; docs ghi rõ dùng attribute `label`. |
| **Hiển thị** | Surface, Divider, Icon, Badge, Avatar, Spinner, ButtonGroup | Role phù hợp (xem mục 7) hoặc không có role |

- `disabled` đặt `internals.ariaDisabled = 'true'`.
- Mọi chuỗi chữ dựng sẵn đều ghi đè được bằng attribute (ví dụ `increment-label`).
- CSS dùng logical properties (`padding-inline`, `inset-inline-start`…). Slider đảo chiều phím
  trái/phải khi `dir="rtl"`.
- Mọi transition dùng `var(--neu-duration)`.

### 6.6 Form (mixin `FormControl`)

Áp cho mọi control có giá trị (Checkbox, RadioGroup, Switch, Slider, Select, TextField, Textarea,
NumberField). Button cũng là form-associated, nhưng chỉ để lấy `internals.form`.

- Property và attribute: `name`, `value`, `disabled`, `required`. `form` là getter trả về `internals.form`.
- Gọi `internals.setFormValue()` mỗi khi giá trị đổi (`null` khi không có giá trị, ví dụ checkbox chưa tick).
- `formResetCallback`: trả về giá trị mặc định từ attribute.
- `formDisabledCallback`: `disabled` kế thừa từ `<fieldset disabled>`.
- `formStateRestoreCallback`: khôi phục giá trị khi bấm back/forward.
- `validity`, `validationMessage`, `willValidate`, `checkValidity()`, `reportValidity()`,
  thông qua `internals.setValidity()`. Control bọc input native chép lại validity của input bên trong
  và dùng input đó làm điểm neo cho thông báo lỗi.
- Custom state `user-invalid`: bật khi không hợp lệ **và** người dùng đã tương tác (blur sau khi sửa,
  hoặc form bị submit). Style lỗi chỉ dựa vào `:state(user-invalid)`.

### 6.7 Tùy biến cấu trúc

- Mọi phần nhìn thấy được có `part`. Danh sách `part` của từng component là API công khai,
  ghi trong mục 7.
- `size="sm|md|lg"` thống nhất ở các component có kích thước.

## 7. Danh mục component v1

Quy ước: "size" trong danh sách attribute là `size="sm|md|lg"` (mặc định `md`) theo 6.7.
"Form" nghĩa là component có đủ mục 6.6.

### 7.1 Cơ bản

**`neu-button`** — host là control, role `button`
- Attribute: `variant="default|primary|flat"` (primary là chữ màu accent; flat thì không bóng cho
  tới khi hover), size, `disabled`, `loading`, `type="button|submit|reset"` (mặc định **`button`**).
- `loading`: hiện Spinner, đặt `aria-busy`, chặn click.
- Phím: Enter kích hoạt khi keydown, Space kích hoạt khi keyup (như native).
- `type="submit"` → `form.requestSubmit()`; `type="reset"` → `form.reset()`.
- Slot: mặc định (nhãn), `prefix`, `suffix`. Part: `base`, `label`, `prefix`, `suffix`, `spinner`.
- Đang nhấn → bóng `inset`.
- Giới hạn có ghi trong docs: không đưa `name`/`value` của nút vào `FormData` khi submit.
- Submit bằng `neu-button` cho `event.submitter === null`; `neu-button` không có `name`/`value`. Cần biết
  nút nào submit thì dùng `<button>` native.

**`neu-icon-button`** — như Button, chỉ có icon
- Attribute: `icon`, `library`, `label` (**bắt buộc**, thành `aria-label`), `shape="circle|square"`
  (mặc định `circle`), `variant`, size, `disabled`, `type`.
- Part: `base`, `icon`, `svg` (svg của icon, như `neu-icon`).

**`neu-button-group`** — role `group`
- Attribute: `label` (thành `aria-label`), `orientation="horizontal|vertical"`.
- Gộp các Button con thành một khối nổi liền. Button con tự nhận biết mình nằm trong group
  (`closest()`) và vị trí đầu/giữa/cuối để bỏ bóng riêng và bo góc phù hợp.
- Part: `base`.

**`neu-surface`** — container, không có role
- Attribute: `shape="raised|inset|flat|convex|concave"` (mặc định `raised`),
  `elevation="sm|md|lg"` (mặc định `md`), `radius="sm|md|lg|full"` (mặc định `md`),
  `padding="none|sm|md|lg"` (mặc định `md`).
- Tự tính lại biến dẫn xuất (5.3), nên `style="--neu-bg: …"` có tác dụng với mọi thứ bên trong.
- Slot: mặc định. Part: `base`.

**`neu-divider`** — role `separator`
- Attribute: `orientation="horizontal|vertical"`.
- Kiểu khắc chìm: một đường bóng tối cạnh một đường bóng sáng.

**`neu-icon`**
- Attribute: `name`, `library` (mặc định `system`), `label`. Có `label` thì role `img` + `aria-label`;
  không có thì `aria-hidden="true"`.
- Kích thước `1em`, màu `currentColor`.
- Thư viện `system` có sẵn, tự vẽ (không vướng license): `check`, `chevron-down`, `chevron-up`,
  `plus`, `minus`, `x`, `alert-circle`, `user`.
- `registerIconLibrary(name, { resolve: (iconName) => string | URL })`: trả về chuỗi SVG hoặc URL.
  SVG lấy từ URL được tải bằng `fetch`, cache theo URL, parse bằng `DOMParser` (`image/svg+xml`).
  Trước khi chèn phải loại bỏ `<script>`, `<foreignObject>` và mọi attribute `on*`.
- SSR: icon thư viện `system` render sẵn trên server. Icon thư viện khác render rỗng trên server
  rồi điền ở client; kích thước cố định nên không nhảy layout.
- Part: `svg`.

**`neu-badge`**
- Attribute: `variant="neutral|accent|success|warning|danger"` (mặc định `neutral`), `pill`.
- Slot: mặc định. Part: `base`.

**`neu-avatar`** — role `img` khi có `label`
- Attribute: `src`, `label` (thành `aria-label`), `initials`, size, `shape="circle|rounded"`.
- Không có `label` thì là ảnh trang trí (`aria-hidden="true"`), giống `neu-icon`.
- Thứ tự dự phòng: ảnh → chữ viết tắt → icon `user`. Ảnh lỗi thì tự chuyển xuống mức tiếp theo.
- Part: `base`, `image`, `initials`, `icon`, `svg` (svg của icon dự phòng).

**`neu-spinner`** — role `status`
- Attribute: `label` (mặc định `"Loading"`, thành `aria-label`), size.
- Vòng lõm, cung màu accent quay. Khi `prefers-reduced-motion` thì quay chậm lại (vẫn cần dấu hiệu
  đang chạy), không tắt hẳn.
- Part: `base`, `track`, `indicator`.

### 7.2 Form lõi

**`neu-text-field`** — bọc `<input>`, form
- Attribute: `type="text|email|password|search|tel|url"`, `value`, `name`, `label`, `placeholder`,
  `help-text`, `error-text`, `required`, `disabled`, `readonly`, `minlength`, `maxlength`, `pattern`,
  `autocomplete`, `inputmode`, `enterkeyhint`, size.
- Khi `:state(user-invalid)`: vùng help hiện `error-text` nếu có, không thì `validationMessage` của trình duyệt.
- Method: `focus()`, `blur()`, `select()`, `setSelectionRange()`.
- Slot: `label`, `prefix`, `suffix`, `help-text`.
- Part: `base`, `label`, `control`, `input`, `prefix`, `suffix`, `help-text`.

**`neu-textarea`** — bọc `<textarea>`, form
- Như TextField nhưng bỏ `type`, `pattern`, `inputmode`, slot `prefix`/`suffix`.
- Thêm `rows` (mặc định 3), `resize="none|vertical|auto"` (`auto` = tự giãn theo nội dung).
- Part: `base`, `label`, `control`, `textarea`, `help-text`.

**`neu-number-field`** — bọc `<input type="number">`, form, role `spinbutton` (native)
- Attribute: `value`, `min`, `max`, `step`, `name`, `label`, `placeholder`, `help-text`, `error-text`,
  `required`, `disabled`, `readonly`, size, `increment-label` (mặc định `"Increase"`),
  `decrement-label` (mặc định `"Decrease"`).
- Ẩn nút tăng/giảm native, thay bằng 2 nút `−` / `+` dạng neumorphism có `tabindex="-1"`
  (phím mũi tên trên input làm cùng việc).
- Phím: ArrowUp/Down ±`step` (native); PageUp/PageDown ±10×`step`; Home/End về `min`/`max` nếu có.
- Property `valueAsNumber` (`NaN` khi trống).
- Part: `base`, `label`, `control`, `input`, `decrement`, `increment`, `help-text`.

**`neu-checkbox`** — host là control, role `checkbox`, form
- Attribute: `checked`, `indeterminate`, `name`, `value` (mặc định `"on"`), `disabled`, `required`.
- `aria-checked`: `true` / `false` / `mixed`. Bấm vào khi đang `indeterminate` thì chuyển sang `checked`.
- Tên truy cập lấy từ nội dung (slot mặc định).
- Phím: Space đổi trạng thái. Click ở bất kỳ đâu trên host cũng đổi.
- Giá trị form: `value` khi tick, `null` khi không. `required` mà chưa tick → `valueMissing`.
- Event: `input` rồi `change` mỗi lần đổi.
- State: `checked`, `indeterminate`, `user-invalid`.
- Part: `base`, `control`, `indicator`, `label`.

**`neu-radio-group`** — role `radiogroup`, form (giá trị nằm ở group)
- Attribute: `label`, `name`, `value`, `required`, `disabled`, `orientation="vertical|horizontal"`.
- Roving tabindex: chỉ radio đang chọn (hoặc radio bật đầu tiên) nằm trong thứ tự Tab.
- Phím: mũi tên di chuyển **và** chọn, vòng lại ở hai đầu, bỏ qua radio `disabled`. Space chọn radio đang focus.
- Event: `input` rồi `change` trên group.
- Slot: `label` (thay cho attribute `label`). Tên truy cập của group theo chữ trong slot `label`, kể cả khi chữ đó đổi tại chỗ; không có thì dùng attribute `label`.
- Part: `base`, `label`.

**`neu-radio`** — role `radio`, không form-associated
- Attribute: `value`, `disabled`. Tên truy cập lấy từ nội dung.
- State: `checked`.
- Part: `base`, `control`, `indicator`, `label`.

**`neu-switch`** — host là control, role `switch`, form
- API như Checkbox nhưng không có `indeterminate`.
- Phím: Space và Enter đổi trạng thái.
- Hình: track lõm, núm nổi (theo mockup A).
- Part: `base`, `track`, `thumb`, `label`.

**`neu-slider`** — host là control, role `slider`, form
- Attribute: `value`, `min` (0), `max` (100), `step` (1), `name`, `label` (thành `aria-label`), `disabled`.
- Property `valueFormatter: (n: number) => string`, dùng cho `aria-valuetext`.
- Phím: mũi tên ±`step`; PageUp/PageDown ±bước lớn, với bước lớn = `max(step, (max−min)/10)`
  làm tròn theo `step`; Home/End về `min`/`max`. Đảo trái/phải khi RTL.
- Chuột/cảm ứng: bấm vào track thì nhảy tới vị trí đó; kéo dùng `setPointerCapture`.
- Event: `input` liên tục khi kéo; `change` khi thả hoặc sau mỗi lần bấm phím.
- Chỉ có chiều ngang ở v1.
- Part: `base`, `track`, `fill`, `thumb`.

**`neu-select`** + **`neu-option`** — pattern "select-only combobox" của APG, form
- `neu-select` attribute: `value`, `name`, `label`, `placeholder`, `help-text`, `error-text`,
  `required`, `disabled`, size. Chỉ chọn một giá trị ở v1.
- `neu-option` attribute: `value`, `disabled`. Nhãn là nội dung chữ.
- **Cấu trúc:** combobox (nút kích hoạt), listbox và các option đều nằm **trong cùng shadow root
  của `neu-select`**, để mọi tham chiếu ID (`aria-controls`, `aria-activedescendant`, `aria-labelledby`)
  hợp lệ. Các thẻ `neu-option` trong light DOM chỉ là **dữ liệu**: bị ẩn, và được đọc qua
  `MutationObserver` để dựng option trong shadow. Option chỉ có chữ ở v1.
- Listbox dùng `popover="auto"` (tự đóng khi click ra ngoài hoặc bấm Escape). Vị trí tính bằng JS
  từ `getBoundingClientRect()` của nút kích hoạt. Không đủ chỗ phía dưới thì lật lên trên.
  Tính lại khi cuộn hoặc đổi kích thước cửa sổ lúc đang mở.
- Focus luôn ở nút kích hoạt. Option đang trỏ được chỉ định bằng `aria-activedescendant`.
- **Phím khi đóng:** Down/Up/Enter/Space mở; Home/End mở và trỏ tới option đầu/cuối;
  gõ ký tự thì mở và nhảy tới option khớp.
- **Phím khi mở:** Up/Down di chuyển; Home/End; PageUp/PageDown ±10 option; Enter/Space chọn
  và đóng; Escape đóng, không đổi giá trị; Tab chọn, đóng và chuyển focus đi; Alt+Up chọn và đóng;
  gõ ký tự để nhảy (gom các ký tự gõ trong vòng 500ms).
- Event: `input` rồi `change` khi giá trị đổi; `neu-open`, `neu-close`.
- Slot: `label` (thay cho attribute `label`).
- Part: `base`, `label`, `combobox`, `display`, `chevron`, `listbox`, `option`, `help-text`.

## 8. SSR (`@neumorphism-ui/ssr`)

### 8.1 Cơ chế

Server chèn `<template shadowrootmode="open">` (thêm `shadowrootdelegatesfocus` khi định nghĩa yêu
cầu) làm **con đầu tiên** của mỗi thẻ `<neu-*>`. Trình duyệt dùng template này để gắn shadow root
ngay lúc parse HTML, rồi **bỏ thẻ template khỏi DOM**. Vì thế cây DOM mà framework gặp khi hydrate
khớp với cây framework render ở client, nơi không có template. Giả thuyết này được kiểm chứng ở
cổng giai đoạn 1.

Nội dung template: `<style data-neu-ssr>` (CSS của component) + `template(props)`.
CSS bị lặp lại ở mỗi instance trong HTML. Gzip nén tốt phần lặp này, và khi hydrate thì thẻ style
được gỡ để thay bằng stylesheet dùng chung. Bản thử SSR phải đo và báo lại mức tăng dung lượng HTML.

### 8.2 API

- `renderDSD(tag: string, attrs: Record<string, string>, ctx?: { options?: OptionData[] }): string`,
  với `OptionData = { value: string; label: string; disabled?: boolean }`. Tag lạ thì trả về chuỗi rỗng.
- `transformHtml(html: string): string`. Quét HTML và chèn template vào sau thẻ mở của mọi tag
  `neu-*` đã biết. Quy tắc:
  - Bỏ qua nội dung của comment, `<script>`, `<style>`, `<textarea>`, `<title>`.
  - Bỏ qua element đã có sẵn `<template shadowrootmode>` làm con đầu tiên. Nhờ vậy gọi 2 lần vẫn
    cho cùng kết quả.
  - Với `neu-select`: đọc các `<neu-option>` con cho tới `</neu-select>` để lấy nhãn của option
    đang chọn.
  - Tag lạ và HTML lỗi: giữ nguyên, không ném lỗi.
- v1 chỉ có bản xử lý chuỗi. Bản xử lý stream nằm ngoài phạm vi.

### 8.3 Ràng buộc SSR

- Template SSR chỉ phụ thuộc vào **attribute** (cộng `ctx.options` của Select). Dữ liệu chỉ đặt qua
  property sẽ hiển thị khi client chạy.
- Select chỉ SSR phần nút kích hoạt (nhãn đang chọn hoặc placeholder). Listbox được dựng ở client
  khi mở lần đầu.

### 8.4 Next.js (qua `@neumorphism-ui/react`)

Wrapper render `<template shadowrootmode="open" dangerouslySetInnerHTML={…}>` làm con đầu tiên
**chỉ khi `typeof window === 'undefined'`**. Wrapper Select đọc các `<NeuOption>` con (props
`value`, nội dung chữ) để lấy nhãn. Không đọc được thì để trống cho tới khi hydrate (chiều cao cố
định, không nhảy layout).

### 8.5 Nuxt và các framework khác

- `@neumorphism-ui/ssr/nuxt`: module Nuxt khai báo `compilerOptions.isCustomElement` cho tag `neu-*`
  và thêm plugin Nitro gọi `transformHtml` trên `html.body` trong hook `render:html`.
- Astro, SvelteKit, Express, site tĩnh: docs hướng dẫn gọi `transformHtml` trong hook HTML của
  từng framework.

### 8.6 Tiêu chí của cổng SSR

Trên `apps/examples/next` (App Router, React 19, có streaming qua Suspense) và `apps/examples/nuxt`,
mỗi trang có Button, Switch, TextField:

1. Không có lỗi hay cảnh báo hydration trong console, ở cả `dev` lẫn bản build production.
2. Tắt JS vẫn hiển thị đúng giao diện (so screenshot với bản bật JS).
3. CLS = 0 trong lúc hydrate.
4. Sau khi hydrate: click, bàn phím và submit form (`FormData` đúng giá trị) hoạt động.

**Nếu framework nào trượt:** framework đó chuyển sang **SSR-lite**. Server chỉ render thẻ host;
rule `:not(:defined)` ở 5.6 giữ chỗ cho tới khi JS chạy. Kết quả phải được báo cho người dùng
trước khi làm tiếp.

## 9. React wrapper (`@neumorphism-ui/react`)

- Sinh tự động bởi `tools/gen` từ **định nghĩa component** (mục 4.3). Cùng nguồn đó sinh luôn
  `custom-elements.json` theo chuẩn Custom Elements Manifest (cho IDE) và bảng API của docs.
  Không dùng CEM analyzer, vì nó không hiểu cách khai báo props của dự án.
- Tên export: `NeuButton`, `NeuSwitch`, `NeuOption`…
- Mọi file wrapper có `'use client'` ở đầu.
- `forwardRef` trỏ tới element thật (chạy được cả React 18.3 và 19).
- Props được đặt bằng **property** trên element (qua ref, trong `useLayoutEffect`), không đặt
  bằng attribute, để React 18 và 19 hoạt động giống nhau. Trên server thì render thành attribute
  để SSR dùng được.
- Map event: `onChange` → `change`, `onInput` → `input`, `onNeuOpen` → `neu-open`…
  Riêng control có `value` (text field) theo `<input>` của React: cả `onInput` và `onChange` đều
  nghe `input` (chạy mỗi lần sửa); event DOM `change` không có prop trong v1.
  Handler nhận event DOM gốc.
- **Controlled / uncontrolled** như `<input>` của React: truyền `value` (hoặc `checked`) thì sau
  mỗi `input`/`change`, wrapper đặt lại property theo prop ở lần commit kế tiếp. Dùng
  `defaultValue` / `defaultChecked` thì thành attribute mặc định.
- Có type test (chạy `tsc` trên file mẫu) để bảo đảm type của props và event đúng.

## 10. CDN và ngân sách dung lượng

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@neumorphism-ui/tokens@1.0.0/neu.css"
      integrity="sha384-…" crossorigin="anonymous">
<script type="module" src="https://cdn.jsdelivr.net/npm/@neumorphism-ui/elements@1.0.0/cdn/neu.min.js"
        integrity="sha384-…" crossorigin="anonymous"></script>
```

- `cdn/neu.min.js` là một bundle ESM đã minify, đăng ký cả 17 component.
- Ví dụ trong docs luôn **ghim version** và kèm **SRI** (`integrity`). Mỗi lần release, CI tính
  hash `sha384` của 2 file và ghi vào docs cùng release notes. Docs cảnh báo rõ rằng URL không
  ghim version thì không dùng được SRI.

Ngân sách (min+gzip), kiểm bằng `size-limit` trong CI, vượt thì CI fail:

| Gói | Giới hạn |
|---|---|
| `cdn/neu.min.js` (cả 17 component) | ≤ 25KB |
| `neu.css` (tokens) | ≤ 4KB |
| Module dùng chung `components/shared/` | ≤ 3KB |
| Mỗi component riêng, không tính core, module dùng chung và component cha | ≤ 3KB (riêng Select ≤ 5KB) |
| Base class + mixin form + `html` | ≤ 4KB |

## 11. Testing

- **Unit/component:** Vitest browser mode + Playwright, chạy trên **Chromium, Firefox và WebKit**.
- **Checklist mỗi component:**
  1. API: attribute ↔ property, giá trị mặc định, giá trị không hợp lệ thay bằng mặc định,
     event đúng lúc và đúng thứ tự, không có event nào khi `disabled`.
  2. Bàn phím: mọi phím ghi ở mục 7.
  3. Form (control có giá trị): `FormData`, reset về mặc định, `required` / validation,
     `:state(user-invalid)` chỉ bật sau khi người dùng tương tác, kế thừa `disabled` từ `<fieldset>`.
  4. Accessibility: axe-core với **rule `color-contrast` tắt** (theo quyết định A), các rule khác
     phải pass. Kiểm role, tên truy cập, trạng thái ARIA.
  5. SSR parity: dựng DOM từ `renderDSD()`, giữ tham chiếu tới một node trong shadow root, đăng ký
     element, rồi assert vẫn là node đó (client không render lại) và trạng thái đúng.
- **Visual regression:** Playwright `toHaveScreenshot`, mỗi component × mọi trạng thái × sáng/tối,
  cộng một trường hợp màu nền tùy chỉnh. Chạy trong Docker image Playwright (Linux) để ảnh ổn định.
  Đây là lớp bảo vệ chính cho thẩm mỹ.
- **SSR e2e:** Playwright trên `examples/next` và `examples/nuxt`, theo 4 tiêu chí ở 8.6.
- **`transformHtml`:** test bằng bộ fixture HTML, gồm: tag lồng nhau, attribute có dấu `>` và dấu
  nháy, nội dung `<script>`, comment, gọi 2 lần, HTML lỗi.
- **Type test:** wrapper React.
- **Dung lượng:** `size-limit`.

## 12. Docs (`apps/docs`)

- Astro Starlight. Component trong docs được SSR qua `transformHtml`, tức là docs tự kiểm chứng SSR.
- Mỗi trang component gồm: demo trực tiếp; bảng API sinh từ định nghĩa (attributes, properties,
  events, slots, parts, CSS vars); ví dụ HTML và React; bảng phím tắt.
- Trang chủ có khung thử 5 biến theme (`--neu-bg`, `--neu-accent`, `--neu-distance`,
  `--neu-intensity`, `--neu-radius`) cùng nút chuyển sáng/tối.
- Các trang hướng dẫn: Cài đặt (npm, CDN), Theming, SSR (Next, Nuxt, các framework khác),
  React, Form.

## 13. Phát hành và repo

- GitHub, repo public, license MIT.
- Changesets, 4 package version cùng nhau.
- Trong lúc xây: mỗi giai đoạn publish `1.0.0-next.x` với dist-tag `next`. Bản `1.0.0` ra khi
  giai đoạn 4 xong.
- CI (GitHub Actions) trên mỗi PR: lint → typecheck → unit test 3 trình duyệt → visual →
  SSR e2e → size. Release từ `main` bằng Changesets action, publish kèm **npm provenance**,
  xác thực bằng npm trusted publishing (OIDC) nên không lưu npm token nào.
- Scope `@neu-ui` đã có người khác dùng, nên ngày 2026-11-05 đã tạo org `neumorphism-ui` trên
  npmjs.com và đổi tên các gói sang `@neumorphism-ui/*`. Tên thẻ vẫn giữ prefix `neu-`.

## 14. Các giai đoạn

| # | Nội dung | Điều kiện xong |
|---|---|---|
| **1** | Monorepo, CI, `tokens`, `NeuElement` + `FormControl` + `html`, `tools/gen`. **Button, Switch, TextField.** `@neumorphism-ui/ssr`, `@neumorphism-ui/react` cho 3 component đó. `examples/next`, `examples/nuxt`. | 3 component qua checklist mục 11. Tinh chỉnh tokens khớp mockup A. **🚧 Cổng SSR (8.6): báo kết quả cho người dùng và chờ quyết định trước khi sang giai đoạn 2.** Publish `1.0.0-next.0`. |
| **2** | IconButton, ButtonGroup, Surface, Divider, Icon (+ `registerIconLibrary`), Badge, Avatar, Spinner. | Qua checklist. Visual regression cho cả nhóm. `next.x`. |
| **3** | Textarea, Checkbox, Radio + RadioGroup, Slider, NumberField, rồi Select + Option. | Qua checklist. `next.x`. |
| **4** | Docs Starlight, khung thử theme, rà soát API của 17 component, hướng dẫn. | CI xanh toàn bộ, đúng ngân sách dung lượng. Publish **`1.0.0`**. |

Mỗi giai đoạn có kế hoạch triển khai riêng, viết khi giai đoạn trước xong, vì cổng SSR có thể
làm thay đổi các giai đoạn sau.

## 15. Ngoài phạm vi v1

- 28 component còn lại: Form nâng cao, Overlay, Navigation, Hiển thị dữ liệu (lên v1.x).
- Theme builder đầy đủ; theme preset ngoài sáng/tối; theme high-contrast; cam kết contrast WCAG.
- Select chọn nhiều, option có nội dung phong phú; Button dạng link (`href`); TextField có nút xóa
  hay nút hiện mật khẩu; Slider dọc hoặc 2 đầu.
- `transformHtml` dạng stream.
- Wrapper Vue/Angular (cả hai vẫn dùng thẳng custom element được); bản CommonJS; polyfill.

## 16. Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| Giả thuyết "template chỉ ở server" không qua được hydration của React hoặc Vue | Cổng SSR ở giai đoạn 1, trước khi viết hàng loạt; dự phòng SSR-lite (8.6) |
| Bóng tính bằng `color-mix()` xấu trên nền bão hòa mạnh | Visual regression có trường hợp nền tùy chỉnh; người dùng ghi đè được `--neu-shadow-dark/light` |
| Cây accessibility khác nhau giữa các engine với role đặt trên `ElementInternals` | Test a11y chạy trên cả 3 engine; kiểm tay bằng screen reader cho Select và RadioGroup ở giai đoạn 3 |
| Tự tính vị trí popover lỗi trong container cuộn hoặc có transform | Test e2e Select trong container cuộn và trong phần tử có `transform` |
| Tự viết bộ quét HTML sai ở ca hiếm | Bộ fixture ở mục 11; gặp HTML lạ thì giữ nguyên, không ném lỗi |
