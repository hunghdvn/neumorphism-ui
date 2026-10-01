# Báo cáo cổng SSR, giai đoạn 1

Ngày chạy: 2026-10-01. Nhánh `feat/phase-1-foundation`, chạy lại toàn bộ từ cây làm việc sạch tại commit `876930c`.
Spec: `docs/superpowers/specs/2026-10-01-neumorphism-ui-v1-design.md` (§8.1, §8.6).

**Kết luận: cả 4 tiêu chí của cổng SSR đều đạt, trên cả Next và Nuxt, ở cả `dev` lẫn production.** Không có ô ❌. Không cần chuyển framework nào sang SSR-lite. Lần chạy đầu của cổng có một ô trượt trên WebKit (mục 6.2), đã được sửa trong thư viện chứ không phải né bằng SSR-lite.

## 0. Chạy lại từ trạng thái sạch

`git status --short` rỗng trước khi chạy. Từng lệnh, theo thứ tự:

| Lệnh | Kết quả |
|---|---|
| `pnpm install --frozen-lockfile` | pass |
| `pnpm lint` | pass |
| `pnpm build` | pass |
| `pnpm gen --check` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: elements 294 test (30 file, 3 engine), tokens 24, react 45 (kèm "React 18.3.1 SSR ok"), ssr 13, gen 6 |
| `pnpm size` | pass, mọi dòng `ok` (mục 4) |
| `pnpm examples:build` | pass |
| `pnpm test:ssr:prod` | pass: 25 passed, 11 skipped, 0 failed (11.3 s) |
| `pnpm test:ssr:dev` | pass: 25 passed, 11 skipped, 0 failed (17.7 s) |

Sau chuỗi lệnh, `git status --short` vẫn rỗng. 11 test bị skip là các `test.skip` theo thiết kế của brief (mục 1).

## 1. Bốn tiêu chí (spec §8.6) × framework × chế độ × engine

Mỗi ô là kết quả của test tương ứng trong `e2e/ssr.spec.ts`. Prod và dev cho kết quả giống hệt nhau, nên bảng ghi chung cho hai cột `prod` / `dev`.

| Tiêu chí | Test | Framework | Chromium | Firefox | WebKit |
|---|---|---|---|---|---|
| 1. Không có lỗi/cảnh báo hydration trong console | 1 | Next prod / dev | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ |
| | | Nuxt prod / dev | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ |
| 2. Tắt JS vẫn đúng giao diện (cùng layout với bản hydrate) | 2 | Next prod / dev | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ |
| | | Nuxt prod / dev | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ |
| 3. CLS = 0 khi hydrate | 3 | Next prod / dev | ✅ / ✅ | n/a (skip) | n/a (skip) |
| | | Nuxt prod / dev | ✅ / ✅ | n/a (skip) | n/a (skip) |
| 4. Click, bàn phím, submit form (`FormData`) sau hydrate | 4 | Next prod / dev | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ |
| | | Nuxt prod / dev | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ |

Ghi chú về phạm vi:

- Tiêu chí 3 dùng Layout Instability API, chỉ có trên Chromium, nên Firefox và WebKit bị skip theo brief. Hai engine này không có đo CLS trực tiếp. Tiêu chí 2 (so layout có JS và không JS) chạy trên cả ba engine và là bằng chứng gián tiếp cho độ ổn định layout ở Firefox, WebKit.
- Không có ô ❌, nên không có thông báo lỗi nào để ghi.

## 2. Cây accessibility và streaming Suspense

| Test | Phạm vi | Next prod | Next dev | Nuxt prod | Nuxt dev |
|---|---|---|---|---|---|
| Role từ `ElementInternals` có trong cây accessibility | Chromium | ✅ | ✅ | ✅ | ✅ |
| Nội dung Suspense được stream giữ declarative shadow root | Next, cả 3 engine | ✅ Chromium, ✅ Firefox, ✅ WebKit (xem ghi chú) | cùng kết quả | n/a | n/a |

Test accessibility chỉ chạy trên Chromium (skip ở Firefox, WebKit). Test streaming chỉ có nghĩa với Next, nên 3 ô Nuxt bị skip.

Ghi chú WebKit cho test streaming: test khẳng định "element được định nghĩa trước khi nội dung stream được parse" chỉ trên Chromium và Firefox. Trên WebKit, các module định nghĩa element chỉ chạy khoảng 100 ms sau khi chunk stream đã được parse (đo được: parse ở 1497 ms, định nghĩa ở 1576 ms, với độ trễ 1500 ms; tăng độ trễ lên 4000 ms vẫn y hệt). Vì vậy đường đi cần kiểm tra không tồn tại trên WebKit, và test ghi lại thứ tự quan sát được thành annotation thay vì khẳng định. Mọi kiểm tra khác của test (shadow root có 1 `.track`, không còn thẻ `template`, click đổi `checked`) vẫn chạy và pass trên WebKit.

## 3. Dung lượng HTML tăng thêm do DSD (spec §8.1)

Đo trên bản production (`next start` cổng 3100, `node .output/server/index.mjs` cổng 3200) bằng `pnpm measure:ssr`. "Không có DSD" là cùng HTML sau khi bỏ mọi `<template shadowrootmode>`.

| Trang | Số instance | HTML thô | Thô không DSD | Tăng (thô) | gzip | gzip không DSD | Tăng (gzip) | Trung bình / instance (gzip) |
|---|---|---|---|---|---|---|---|---|
| Next (`:3100`) | 4 | 24 318 B | 7 505 B | +16 813 B | 4 816 B | 2 618 B | +2 198 B | 550 B |
| Nuxt (`:3200`) | 3 | 14 758 B | 1 795 B | +12 963 B | 3 058 B | 886 B | +2 172 B | 724 B |

Nhận xét:

- Mỗi instance thêm khoảng 4,2 đến 4,3 KB HTML thô, chủ yếu là thẻ `<style data-neu-ssr>` lặp lại. Sau gzip còn khoảng 0,55 đến 0,72 KB mỗi instance.
- Trang Next có 4 instance (3 component cơ bản cộng switch ở phần Suspense được stream), trang Nuxt có 3.
- Mức tăng gzip của hai trang gần như bằng nhau (+2,2 KB) dù số instance khác nhau. Điều này cho thấy gzip nén phần CSS lặp rất tốt: instance đầu tiên trả gần hết chi phí, các instance sau rẻ hơn nhiều. Vì vậy trung bình theo instance của trang nhiều instance sẽ thấp hơn các con số trên. Đây chỉ là suy luận từ 2 trang mẫu nhỏ, chưa phải phép đo trên trang có hàng chục component.
- Mỗi instance hiện kèm CSS đầy đủ của component. Thiết kế đã chấp nhận điều này (§8.1). Nếu sang giai đoạn 2 mức tăng trở nên đáng kể, hướng tối ưu là dùng chung CSS giữa các instance cùng loại.

## 4. Ngân sách dung lượng (`pnpm size`, min + gzip)

| Mục | Thực đo | Ngân sách | Trạng thái |
|---|---|---|---|
| `cdn/neu.min.js` (tất cả component) | 6,97 KB | 25 KB | ok |
| `@neu-ui/tokens` `neu.css` | 0,86 KB | 4 KB | ok |
| core (base + form + html) | 3,24 KB | 4 KB | ok |
| `neu-button` (không gồm core) | 1,29 KB | 3 KB | ok |
| `neu-switch` (không gồm core) | 1,28 KB | 3 KB | ok |
| `neu-text-field` (không gồm core) | 2,05 KB | 3 KB | ok |

Lưu ý: core đã dùng 3,24 trên 4 KB (81%). Giai đoạn 2 thêm component và tính năng dùng chung sẽ chạm trần này nhanh nhất. Nên quyết định sớm là nâng ngân sách hay tách bớt core.

## 5. Giá trị tokens cuối cùng và lý do (Task 14)

Tinh chỉnh bằng cách dựng thẻ mockup A cạnh form dựng từ component của dự án, rồi lấy mẫu pixel ở những chỗ hình học bóng giống hệt nhau (nút md raised 6/6/12 và track của switch inset 3/3/6), nên màu pixel chỉ phụ thuộc giá trị token. Màu chữ so bằng khoảng cách OKLab tới nền.

| Biến | Trước | Sau | Lý do |
|---|---|---|---|
| shade (sáng) | 22% | **18%** | Viền tối quanh nút khớp mockup (R 194 / 212), track bên trong 199 như mockup. 16% quá nhạt. |
| light-shadow (sáng) | 70% | **100%** | Khớp highlight trắng của mockup (243 / 238 / 239). Chặn ở `min(100%, …)` nên `--neu-intensity` cao chỉ làm đậm bóng tối. |
| fg mix (sáng) | 50% | **32%** | ΔE_ok tới nền đạt 0,294, gần 0,292 của `#7b8aa3` ở mockup. |
| muted mix (sáng) | 30% | **18%** | ΔE_ok 0,166, gần 0,165 của `#a3b1c6`. |
| shade (tối) | 45% | **45%** (giữ) | ΔL OKLab 0,137, thấp hơn 0,166 của chế độ sáng nên không gắt hơn về cảm nhận. |
| light-shadow (tối) | 6% | **6%** (giữ) | 4% gần như vô hình, 6% cho viền sáng +3 mức luma, 8% cho +5. §5.5 yêu cầu rất tinh tế. |
| fg mix (tối) | (dùng chung 32%) | **42%** | Bản review: dùng chung tỉ lệ khiến chữ mờ ở chế độ tối chỉ còn khoảng 1,55:1. Chọn sao cho chênh lệch độ sáng OKLab của chữ so với nền bằng chế độ sáng (0,292). |
| muted mix (tối) | (dùng chung 18%) | **24%** | Tương tự, khớp 0,165. |

Hai biến private mới `--_neu-fg-mix` và `--_neu-fg-muted-mix` (mỗi theme một giá trị) được dùng trong tokens và `hostTheme`, có test trong `styles.test.ts` đảm bảo fallback bằng tokens. Spec §5.2 đã được cập nhật theo giá trị đã tinh chỉnh.

Cổng thị giác dùng `threshold: 0.02` và `maxDiffPixelRatio: 0.001` (mặc định 0,2 của Playwright không bắt được thay đổi token), và test focus khẳng định `toBeFocused` trước khi chụp.

Những khác biệt giá trị không thể sửa (cần sửa style/cấu trúc component, ghi nhận để xử lý sau): sắc xanh của chữ và bóng mockup (OKLab làm chữ trung tính hơn), input md sâu hơn (inset 6/6/12 so với 4/4/8, cao 44 so với khoảng 40 px), màu lỗi/invalid đỏ hơn mockup, tint khi bật của switch, màu chữ nút disabled.

## 6. Sai khác so với kế hoạch

Liệt kê mọi quyết định đã được xử lý trong quá trình làm (mục "Ruling" của sổ theo dõi), theo task.

### 6.1 Cấu hình và công cụ

1. **Task 1: Prettier không được định dạng bên trong `html\`\``.** Thêm `"embeddedLanguageFormatting": "off"` vào `.prettierrc.json` và khôi phục test joins-arrays như brief. Lý do: khoảng trắng trong template là output thật (SSR parity, §6.3). Đánh đổi: markup nhúng không còn được tự định dạng.
2. **Task 6: `axe-core` phát hiện muộn gây re-optimise và reload giữa lúc chạy khi cache lạnh.** Thêm `optimizeDeps.include: ['axe-core']` vào vitest config của elements. Task 12 phải làm tương tự cho `react`, `react-dom`, `react-dom/client` và alias react18. CI luôn lạnh nên đây là nguồn flake.
3. **Task 12: config `browserTest` dựng bằng factory cho mỗi project** (một object dùng chung làm Vitest từ chối tên instance trùng). Cần thiết về cơ học.
4. **Task 12: test text-field điều khiển gọi `setSelectionRange(1,1)` sau `host.focus()`** vì Chromium chọn toàn bộ giá trị khi focus được ủy quyền. Test kiểm tra giá trị điều khiển của wrapper, không phải vị trí caret. Hành vi `host.focus()` chọn hết chữ trên Chromium chưa được ghi vào docs (để giai đoạn 4).
5. **Task 10: kế hoạch thiếu kiểu cho module Nuxt.** `@nuxt/kit@4.5.2` lấy kiểu từ `@nuxt/schema` nhưng chỉ khai báo devDependency. Thêm `@nuxt/schema@4.5.2` vào devDependencies và peerDependency tùy chọn (`^4.0.0`, chỉ kiểu), chú thích export mặc định là `NuxtModule`. Hành vi không đổi, thêm một peer tùy chọn.

### 6.2 Cổng SSR (Task 13) và thư viện

1. **Lần chạy đầu của cổng trượt tiêu chí 2 trên WebKit** (Next và Nuxt, prod và dev): `neu-text-field` cao 66 px khi không có JS và 65 px sau khi hydrate, kéo switch và button lệch 1 px. Chromium và Firefox khớp hoàn toàn. Lần đó kết quả là 23 pass, 2 fail, 11 skip.
   - Nguyên nhân: rule của tokens `neu-text-field[label]:not(:defined)` đặt `min-block-size` giữ chỗ (66 px) vẫn áp dụng cho element đã SSR và đã có shadow root, làm WebKit lớn hơn kích thước tự nhiên 65 px.
   - Quyết định: coi là lỗi thư viện và sửa, không chuyển sang SSR-lite (SSR-lite sẽ bỏ SSR chỉ vì một lỗi giữ chỗ 1 px). Sửa bằng cách thêm `min-block-size: auto !important` vào rule `:host(:not(:defined))` của `hostTheme`, kèm test đơn vị trong `core/styles.test.ts`.
   - Bằng chứng: trước khi sửa (RED) test thất bại với `expected 66 to be 10` trên cả 3 engine, sau khi sửa elements test pass 288/288. Chạy lại cổng: prod 25 pass, dev 25 pass, 0 fail.
   - Đánh đổi: chỗ giữ trước khi định nghĩa không còn áp dụng cho element đã có shadow root (đúng ý định).
2. **Vòng sửa 1 của Task 13 lộ thêm thất bại trên WebKit** (test streaming, `__lateDefinedAtParse` là false). Điều tra: trên WebKit, định nghĩa element chạy sau khi chunk stream đã parse bất kể độ trễ (400, 1500, 4000 ms). Quyết định: chỉ khẳng định thứ tự "định nghĩa trước khi parse" trên Chromium và Firefox, ghi thứ tự quan sát được trên WebKit thành annotation; các kiểm tra khác vẫn chạy trên WebKit. Lý do: đường đi cần kiểm tra không tồn tại trên WebKit, đòi hỏi nó là kiểm tra trình duyệt chứ không phải thư viện. Rủi ro: nếu WebKit sau này chạy định nghĩa sớm, đường đi đó sẽ không được khẳng định ở WebKit cho tới khi xem lại.
3. **Vòng sửa 1 của Task 13 sửa thêm vì độ chính xác của cổng** (gate là sản phẩm của giai đoạn nên test phải chứng minh đúng điều nó tuyên bố): test streaming khẳng định thứ tự parse/định nghĩa bằng `MutationObserver`; gỡ `AGENTS.md` và `CLAUDE.md` do Next 16 sinh trong `apps/examples/next` rồi thêm vào `.gitignore` (là file chỉ dẫn agent sẽ nạp vào mọi phiên làm việc trong thư mục đó); context của test 2 kế thừa device options của project; `!!el?.shadowRoot`; chờ ngắn trước khi khẳng định test 1 trên Next; chú thích rằng bản build production của Vue không log hydration mismatch (nên test 1 trên Nuxt prod yếu hơn dev); script đo kiểm tra `res.ok`.

### 6.3 Review của từng task

1. **Task 5: `form.checkValidity()` làm lộ `user-invalid` mà người dùng chưa làm gì**, trái §6.6. Chỉ đánh dấu "đã tương tác" từ sự kiện `invalid` khi đang có thao tác submit của người dùng (listener capture ở form owner, bật khi click submitter hoặc Enter). `reportValidity()` tự đánh dấu. Bỏ cờ `checkingSilently`. Hệ quả: app tự gọi `form.requestSubmit()` sẽ nhận bong bóng của trình duyệt nhưng không có style `user-invalid`.
2. **Task 7: onClick hoãn `input`/`change` bằng `setTimeout` thay vì `queueMicrotask` như brief**, vì với click thật trình duyệt chạy microtask checkpoint sau mỗi listener nên microtask làm `input`/`change` xen vào giữa các listener click (test hỏng trên 3 engine). Hệ quả: `input`/`change` đến sau click một task, code đọc ngay sau `el.click()` phải `await`. Văn bản kế hoạch của Task 7 vẫn còn ghi "trong microtask". Test flake liên quan trên WebKit đã được sửa ở vòng sửa tiếp theo (thêm `await tick()`).
3. **Task 8: hydrate ghi lại nội dung** (`validate()` ghi lại span lỗi rỗng; ghi `input.defaultValue` vô điều kiện). Sửa: render `${p.errorText}` trong span, và bảo vệ ghi `defaultValue`. Không giới hạn fallback `validationMessage` ẩn theo `user-invalid` (cần hook mới ở lớp cơ sở). Hệ quả: ô SSR đang không hợp lệ vẫn điền span lỗi ẩn bằng thông báo của trình duyệt khi hydrate.
4. **Task 12: bỏ `defaultValue` ghi `"undefined"`** vào thuộc tính (làm hỏng `FormData`/reset). Đã sửa.
5. **Task 14: ba phát hiện review.** Ngưỡng thị giác đặt 0,02; thêm khẳng định focus; thêm biến mix riêng cho từng theme (mục 5). Task 14 cũng đã sửa test focus: tải lại trang trước khi nhấn Tab, vì ở bản brief Chromium và Firefox chụp baseline `focus.png` không có vòng focus.
6. **Quy ước commit:** trailer Co-Authored-By được phép ghi tên model của subagent thực hiện (đúng với thực tế). Các commit `c36b08c` và `6db38ea` của Task 3 đặt trailer ngay trên dòng subject, `b2f2b3e` và `08b4e87` của Task 1 là commit sửa chắp vá; có thể gộp hoặc viết lại khi chốt lịch sử.
7. **Phối hợp dùng chung:** công thức biến dẫn xuất trùng lặp giữa tokens CSS và `hostTheme`, và giá trị theme tối lặp hai lần trong tokens (media query và `[data-neu-theme='dark']`). Giữ nguyên vì §5.3 yêu cầu khai báo lại ở mỗi host và component phải chạy không cần tokens; test đồng bộ trong `styles.test.ts` chặn lệch.

### 6.4 Các mục hoãn (minor, chưa sửa)

- Task 2: prop chuỗi có `values` nhưng không có default suy ra kiểu union nhưng chạy ra `''` (mọi định nghĩa v1 đều đặt default); chưa có test `ComponentDef<S>` gán được cho `ComponentDef`.
- Task 3: khối `prefers-color-scheme: dark` ở tokens chưa được test (chỉ test `data-neu-theme` ép).
- Task 4: `define()` chỉ kiểm tra prototype lá; `formDisabledCallback` gọi `update()` không qua `willUpdate()`; listener capture của tổ tiên vẫn thấy click trên control bị disabled; `syncFocusable` ghi đè `tabindex` do tác giả đặt (ảnh hưởng roving tabindex sau này); thiếu test reconnect khi đang loading và đường render `DOMContentLoaded` không có DSD.
- Task 5: `implicitSubmit` đếm cả fieldset/output/button không submit; submitter gắn qua `form="id"` ngoài form không được thấy; `formStateRestoreCallback` bỏ qua File/FormData không báo; mọi Enter trong form đều bật cờ submit trong task đó.
- Task 6: chưa test Enter/Space hoặc `type=submit` không làm gì khi loading/disabled; keydown từ nội dung slot có thể kích hoạt nút.
- Task 7: callback hoãn vẫn chạy dù `checked`/reset/disconnect đã xảy ra; `preventDefault` hoàn tác để lại `dirty=true`; thiếu test `formStateRestoreCallback`; keyup Space không có keydown vẫn bật.
- Task 8: handler Enter bỏ qua `event.defaultPrevented`; setter boolean ghi lại attribute sẵn có khi adopt; thiếu vài test (validationMessage fallback, reset rồi đổi default, `pendingValue`, restore).
- Task 9: `dist` có `.js.map` trỏ tới `src` không publish; `dist/cdn.js` và `.d.ts` phát ra nhưng không dùng; `check-size.mjs` không kiểm tra đã build chưa; test escaping thiếu khẳng định dương.
- Task 10: `transformHtml` bậc hai khi có nhiều thẻ mở không đóng (rủi ro DoS chỉ khi `v-html` không escape); thuộc tính `__proto__` bị bỏ; entity số không remap theo HTML5; `<!-->` coi là chưa đóng; `<title>` trong SVG coi là raw text.
- Task 11: eslint ignore thừa cho `custom-elements.json`; `--check` bỏ qua file sinh mồ côi; `defaultText` không escape dấu nháy; ánh xạ `defaultProp` lặp.
- Task 12: pnpm cảnh báo peer `react@^18.3.1` của `react-dom18` (vô hại vì alias); test escaping ở `ssr.node` dùng prop không phải định nghĩa; ref ghi trong lúc render; thiếu khẳng định mỗi project chạy đúng bản React; thiếu test hydrate trong task.
- Task 14: `serve-static` sập khi `%` sai escape hoặc lỗi stream, bind mọi interface, ít content type.
- Task 15: release không đợi CI; token lộ cho build script trong `changesets/action` (cân nhắc trusted publishing); PR Version do `GITHUB_TOKEN` mở không kích hoạt CI; workflow baseline thiếu kiểm tra ref; action ghim theo tag major; `size` chạy trước `visual`/SSR.
- Ghi chú chung: các lần timeout `locator.click` 15 s ở Chromium chỉ xuất hiện trong lần chạy RED (lỗi import ở file khác làm nhiễu trang dùng chung), không tái hiện ở lần chạy GREEN, cả ở lần chạy lại hôm nay. Cần theo dõi trên CI.

## 7. Đề xuất

**Cổng SSR đạt. Có thể bắt đầu viết kế hoạch giai đoạn 2.** Bốn tiêu chí đều ✅ cho Next và Nuxt, prod và dev, trên Chromium, Firefox, WebKit (trừ các ô skip theo thiết kế ở mục 1), cây accessibility và streaming Suspense cũng đạt. Không có tiêu chí ❌ nên không đề xuất SSR-lite cho framework nào.

Điều nên cân nhắc khi lập kế hoạch giai đoạn 2:

1. Tiêu chí 3 (CLS) chỉ đo được trên Chromium; Firefox và WebKit chỉ có bằng chứng gián tiếp qua tiêu chí 2.
2. Ngân sách core đã dùng 81% (3,24/4 KB).
3. Thứ tự "định nghĩa trước khi parse" không chứng minh được trên WebKit (mục 2). Cổng hiện chỉ ghi lại hành vi này chứ không kiểm tra nó.
4. Mức tăng HTML sau gzip là khoảng 2,2 KB trên trang mẫu nhỏ; nên đo lại khi có trang nhiều component hơn.
5. Cổng thị giác cần baseline Linux (job `visual` sẽ fail cho tới khi chạy tay workflow "Update visual baselines" một lần).

Giai đoạn 2 cần một kế hoạch riêng (spec §14), chỉ viết sau khi người dùng duyệt kết quả cổng.
