# Taxonomy Tầng 2 — Cây thư mục tài liệu thiết kế (design/)

> Đây là cấu trúc tài liệu thiết kế chi tiết (tầng 2) sinh ra dưới thư mục `docs/design/` cho dự án của người dùng khi được kích hoạt (opt-in).

## Tại sao cần file này
Taxonomy tầng 2 định nghĩa cấu trúc chi tiết cho các module thiết kế nâng cao gồm Glossary, Feature Specification, Architectural Decision Records (ADR), và Test Strategy. Nó đảm bảo tính nhất quán cấu trúc và truy vết nguồn gốc thông tin đến từng câu trả lời phỏng vấn.

## Cấu trúc cây thư mục đầu ra tầng 2

```text
docs/
  design/
    glossary.md           ← Từ điển thuật ngữ (Cardinality: 1 file)
    test-strategy.md      ← Chiến lược kiểm thử (Cardinality: 1 file)
    adr/                  ← Architectural Decision Records (ADR)
      ADR-001-<slug>.md   ← Quyết định 1 (Cardinality: 1 file/quyết định)
      ADR-002-<slug>.md   ← Quyết định 2
    features/             ← Đặc tả chi tiết tính năng Must-have
      <must-slug-1>.md    ← Tính năng 1 (Cardinality: 1 file/Must-have)
      <must-slug-2>.md    ← Tính năng 2
```

## Các module thiết kế tầng 2 & Điều kiện kích hoạt

| Module | Vị trí file đầu ra | Cardinality | Điều kiện kích hoạt / Opt-in |
|---|---|---|---|
| **glossary** | `docs/design/glossary.md` | 1 file duy nhất | Luôn được sinh khi kích hoạt tài liệu tầng 2. |
| **feature-spec** | `docs/design/features/<must-slug>.md` | 1 file cho mỗi Must-have | Luôn được sinh khi kích hoạt tài liệu tầng 2. |
| **adr** | `docs/design/adr/ADR-{NNN}-{slug}.md` | 1 file/quyết định (số thứ tự ba chữ số từ `001`) | Kích hoạt khi nhân sự >= 2 developers (suy từ câu S6 hoặc cấu hình dự án). |
| **test-strategy** | `docs/design/test-strategy.md` | 1 file duy nhất | Kích hoạt khi dự án sử dụng CI/CD hoặc yêu cầu kiểm thử tự động. |
| **contract-lane** | *N/A* | *N/A* | **HOÃN** (Deferred) sang phiên bản sau do các điều kiện multi-agent chưa được sản phẩm hoá. |

## Vòng đời deepen và ảnh hưởng lên execution state (B3e)

Mở (opt-in) một module tầng 2 chỉ được phép khi cả ba điều kiện đúng — kiểm bằng [`canStartDeepen`](../../src/core/deepenLifecycle.ts):
1. Tier-1 đã có manifest **activated** (không phải staging dở dang) — xem [emitManifest.ts](../../src/core/schemas/emitManifest.ts).
2. Phỏng vấn lõi không còn câu bắt buộc (`progress.current_step === null` và `phase !== 'interview'`).
3. Execution không ở pha bận: `executing`, `verifying`, `repairing`, `reviewing`, `blocked` đều bị deny.

`adr` và `test-strategy` là hai module **plan-affecting** — chúng mô tả lại chính architecture/test-strategy mà một execution plan đã validate dựa vào. Emit lại một trong hai module này khi execution đã đi qua khỏi `plan-validating` sẽ đánh dấu snapshot stale (`invalidateSnapshotForTier2`): state chuyển `blocked` với `block_reason.kind = 'snapshot-stale'`, `recoverable_by = '/build validate'`. `glossary` và `feature-spec` không bao giờ invalidate theo cách này.

### Rerun (amendment) một câu deepen đã trả lời

Một instance (câu × subject) đã commit không bị khoá vĩnh viễn — có thể **rerun** để sửa lại câu trả lời, nhưng đây là amendment (bản mới), không phải overwrite bản cũ:

1. [`issueDeepenRerunCapability`](../../src/core/deepenApplicationServices.ts) issue một capability nhắm đúng instance ĐÃ answered (khác `issueDeepenCapability`, vốn chỉ tìm câu **chưa** trả lời). Instance chưa từng commit bị deny `DEEPEN_RERUN_NOT_YET_ANSWERED`.
2. [`rerunDeepen`](../../src/core/deepenApplicationServices.ts) tiêu thụ capability đó và push một `generation` mới vào `deepen-state.json`'s `modules[x].answered` — entry cũ (generation trước) vẫn còn nguyên, `supersedes` trỏ ngược về nó. "Đã answered" cho một instance = tồn tại ≥1 generation; "hiện hành" = generation lớn nhất.
3. Giá trị answer text hiện hành vẫn chỉ có một bản trong `Design/.interview/answers.json` (mọi renderer/`computeSourceDigest`/`emitTier2` đọc không đổi), nhưng MỌI generation — kể cả bản đầu — được append vào `Design/.interview/deepen-answer-history.json`, nên câu trả lời cũ không bao giờ mất, chỉ không còn là bản hiện hành.
4. Rerun một module plan-affecting (`adr`/`test-strategy`) và emit lại module đó vẫn kích hoạt `invalidateSnapshotForTier2` như một lần commit/emit bình thường.

Rerun hiện chỉ có ở tầng Core (application service) — CLI/adapter chưa có subcommand `--rerun` tương ứng; đó là phạm vi B4, chưa mở trong B3e.

## Ngữ pháp SourceRef (Nguồn gốc thông tin)

Mỗi khối nội dung (heading hoặc block thông tin quan trọng) trong tài liệu tầng 2 bắt buộc phải kết thúc bằng **đúng một dòng** chỉ định nguồn gốc thông tin theo ngữ pháp chuẩn dưới đây. Không tự ý viết biến thể khác để hỗ trợ parser tự động đọc:

*   **Dạng câu trả lời phỏng vấn:**
    ```text
    > Nguồn: answers:<question_id>[@<subject_id>]
    ```
    *Ví dụ:* `> Nguồn: answers:S1`, `> Nguồn: answers:DS2@dang-nhap`
*   **Dạng tài liệu tầng 1 đã emit:**
    ```text
    > Nguồn: doc:docs/<file>.md#<anchor>
    ```
    *Ví dụ:* `> Nguồn: doc:docs/03-data-model.md#03-data-model/core-entities` (anchor id lấy nguyên `id=` của khối tầng 1, có tiền tố số thứ tự file).
*   **Dạng không truy được nguồn (chế độ an toàn - fail-closed):**
    ```text
    > ⚠ unknown — cần hỏi người
    ```

## Ví dụ cây thư mục đầu ra thực tế (HabitBuilder Mobile App)

```text
docs/
  design/
    glossary.md
    test-strategy.md
    adr/
      ADR-001-offline-sync.md
      ADR-002-supabase-auth.md
    features/
      ng-nh-p.md
      tao-thoi-quen.md
```
