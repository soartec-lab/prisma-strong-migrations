# WriteMate サンプルアプリ

prisma-strong-migrations を使って、**実際の開発フローでマイグレーションの危険操作を検出・修正する**体験ができるサンプルです。

## ゴール

1. スキーマを変更して `prisma migrate dev --create-only` でマイグレーションを生成
2. `psm check` で危険な操作を検出
3. マイグレーション SQL を手動で修正
4. `prisma migrate dev` で適用

---

## セットアップ

### 1. 依存パッケージをインストール

```bash
vp install
```

### 2. `.env` を作成

```bash
cp .env.example .env
```

### 3. PostgreSQL を起動

```bash
vp run db:start
```

### 4. 初期マイグレーションを適用

```bash
vp run migrate:apply
```

> 初回は `20240101000000_init` が自動生成されてテーブルが作られます。

---

## チュートリアル

### シナリオ 1: インデックスを追加する（❌ 危険 → ✅ 修正）

#### Step 1: スキーマを編集

`prisma/schema.prisma` の `Post` モデルに `@@index([userId])` を追加します。

```prisma
model Post {
  // ...既存フィールド...

  @@index([userId])   // ← これを追加
  @@map("posts")
}
```

#### Step 2: マイグレーションを生成（DB 未適用）

```bash
vp run migrate:create
# マイグレーション名: add_index_posts_user_id
```

生成されたファイル: `prisma/migrations/YYYYMMDDHHMMSS_add_index_posts_user_id/migration.sql`

```sql
-- CreateIndex
CREATE INDEX "posts_user_id_idx" ON "posts"("user_id");
```

#### Step 3: psm check で危険を検出

```bash
vp run check
```

```
error [addIndex] line 2
  Adding index "posts_user_id_idx" without CONCURRENTLY locks the table
```

#### Step 4: マイグレーション SQL を修正

生成された `migration.sql` を以下のように編集します。

```sql
-- prisma-migrate-disable-next-transaction
-- CreateIndex
CREATE INDEX CONCURRENTLY "posts_user_id_idx" ON "posts"("user_id");
```

#### Step 5: 再チェック → エラーなし

```bash
vp run check
# ✓ 0 errors
```

#### Step 6: 適用

```bash
vp run migrate:apply
```

---

### シナリオ 2: カラムを削除する（❌ 危険 → ✅ 正しい手順）

#### Step 1: スキーマを編集

`User` モデルから `name` フィールドを削除します。

```prisma
model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  // name を削除
  createdAt DateTime  @default(now()) @map("created_at")
  // ...
}
```

#### Step 2: マイグレーションを生成

```bash
vp run migrate:create
# マイグレーション名: drop_column_users_name
```

#### Step 3: psm check で危険を検出

```bash
vp run check
```

```
error [removeColumn] line 2
  Removing column "name" from table "users" may cause errors in running application
```

#### Step 4: 提案された安全な手順に従う

psm の出力に示された手順を確認します。

```
✅ Good: Follow these steps:
   1. Remove all usages of 'name' field from your application code
   2. Run 'npx prisma generate' to update Prisma Client
   3. Deploy the application code changes
   4. Then apply this migration
```

カラム削除は SQL で自動修正できません。アプリコードの変更が先に必要です。

---

### シナリオ 3: カラム型を変更する（❌ 危険 → ✅ 修正）

#### Step 1: スキーマを編集

`Post.body` を `TEXT` から `VARCHAR(255)` に変更します。

```prisma
model Post {
  // ...
  body   String   @db.VarChar(255)   // ← 型を追加
  // ...
}
```

#### Step 2: マイグレーションを生成・チェック

```bash
vp run migrate:create
# マイグレーション名: change_posts_body_type

vp run check
# error [changeColumnType] ...
```

#### Step 3: 対応を検討

型変更は既存データの互換性に応じて対応が変わります。
- `TEXT → VARCHAR(255)`: 255文字超のデータがあると切り捨てられる
- psm の提案に従い、段階的な移行（新カラム → データ移行 → 旧カラム削除）を検討

---

## コマンド一覧

| コマンド | 内容 |
|---------|------|
| `vp run db:start` | PostgreSQL を起動 |
| `vp run db:stop` | PostgreSQL を停止 |
| `vp run migrate:create` | マイグレーションを生成（未適用） |
| `vp run migrate:apply` | マイグレーションを適用 |
| `vp run check` | 全マイグレーションをチェック |
| `vp run check:json` | JSON 形式でチェック結果を出力 |

---

## 参考: psm check の disable コメント

特定の警告を意図的にスキップしたい場合は、SQL の直前にコメントを追加します。

```sql
-- prisma-strong-migrations-disable-next-line addIndex
CREATE INDEX "posts_user_id_idx" ON "posts"("user_id");
```

全ルールをスキップ:

```sql
-- prisma-strong-migrations-disable-next-line
CREATE INDEX "posts_user_id_idx" ON "posts"("user_id");
```
