title: "Prisma + PostgreSQL の危険なマイグレーションを検出する prisma-strong-migrations を作った"
emoji: "🛡️"
type: "tech"
topics: ["prisma", "postgresql", "migration", "nodejs", "typescript"]
published: false

## はじめに

稼働中のアプリケーションに影響を与えないよう、データベースのスキーマ変更を安全に発行するのは至難の技です。テーブルロックが発生する操作、デプロイ順序に依存するカラムの削除、既存データによって失敗する制約の追加こういった問題はレビューで経験則に頼らなければ見落としやすく、本番環境で初めて顕在化することも少なくありません。

そこで prisma-strong-migrations を作りました。`Prisma` + `PostgreSQL`向けに特化した、マイグレーション安全性チェックツールです。主な特徴は次の通りです。

- 38ルール内蔵（`Prisma`固有のパターンを含む）
- 一部ルールは`--fix`で`SQL`を自動修正
- `migrate dev` / `migrate deploy`をラップし、既存ワークフローに組み込める
- スキップ時は`SQL`ファイルにコメントで理由を記録（`git`履歴に残る）
- カスタムルールを追加して、プロジェクト固有のチェックを実装できる

この記事では、ライブラリのインストールから基本的な使い方、検出できるルールの一覧、そして作るに至った背景を説明します。

https://github.com/soartec-lab/prisma-strong-migrations

## インストール

```bash
# npm
npm install @soartec-lab/prisma-strong-migrations --save-dev
# yarn
yarn add @soartec-lab/prisma-strong-migrations --dev
# pnpm
pnpm add @soartec-lab/prisma-strong-migrations --save-dev
# bun
bun add @soartec-lab/prisma-strong-migrations --dev
# vite-plus
vp add -D @soartec-lab/prisma-strong-migrations
```

## 使い方

コマンドは `prisma-strong-migrations`と省略形の`psm`のどちらでも動作します。この記事ではコマンドが長くなるため、省略形の`psm`で統一します。

1. `schema.prisma`を変更してマイグレーションを実行する

`psm migrate dev`を実行すると、マイグレーションファイルの生成・安全性チェック・適用までを一括で行います。

```bash
npx psm migrate dev --name remove_user_name
```

2. 危険な操作が検出された場合、警告が表示される

例えば`users`テーブルのカラムを削除するマイグレーションを含む場合、次のようなエラーが表示されて処理が止まります。

```
Prisma Migrate created the following migration without applying it 20260322040753_remove_user_name

You can now edit it and apply it by running prisma migrate dev.

prisma/migrations/20260322040753_remove_user_name/migration.sql

error [removeColumn] line 1
  Removing column "name" from table "users"

  ❌ Bad: Removing a column may cause application errors.
         If you deploy the migration before updating your application code,
         requests handled by old instances will fail.

  ✅ Good: Follow these steps:
     1. Remove all usages of 'name' field from your code
     2. Run 'npx prisma generate' to update Prisma Client
     3. Deploy the code changes
     4. Then apply this migration with a disable comment

  To skip this check, add above the statement:
     -- prisma-strong-migrations-disable-next-line removeColumn
────────────────────────────────────────────────────────────

✗ 1 error

❌ Migration check failed.
```

3. 警告の指示に従って対応する

出力に表示された手順に従います。`removeColumn`の場合は、先にアプリケーションコード側から該当フィールドの参照をすべて削除し、コード変更をデプロイします。その後、`migration.sql`にdisableコメントを追加して、チェックをスキップできる状態にします。

```sql
-- prisma-strong-migrations-disable-next-line removeColumn
-- Reason: コード側の参照をすべて削除しデプロイ済み
ALTER TABLE "users" DROP COLUMN "name";
```

4. 再実行してマイグレーションを適用する

disableコメントを追加した状態で再実行するとチェックをパスし、マイグレーションが適用されます。

```bash
npx psm migrate dev --name remove_user_name
```

```
✅ No issues found.

Running prisma migrate dev...
The following migration(s) have been applied:

migrations/
  └─ 20260322040753_remove_user_name/
    └─ migration.sql

Your database is now in sync with your schema.
```

### チェックをスキップする

内容を確認した上で意図的に実行する場合は、`SQL`ファイルにコメントを追加してチェックをスキップできます。理由を残しておくと`git`履歴での追跡がしやすくなります。

```sql
-- prisma-strong-migrations-disable-next-line removeColumn
-- Reason: v2.0で非推奨化済み。コード内の参照がないことを grep で確認済み
ALTER TABLE "users" DROP COLUMN "legacy_field";
```

複数ルールをまとめてスキップしたり、対象ステートメントのすべてのルールをスキップすることも可能です。

```sql
-- 複数ルールをスキップ（スペース区切りでもカンマ区切りでも動作する）
-- prisma-strong-migrations-disable-next-line removeColumn renameColumn
ALTER TABLE "users" DROP COLUMN "name";
-- prisma-strong-migrations-disable-next-line removeColumn, renameColumn
ALTER TABLE "users" DROP COLUMN "name";

-- すべてのルールをスキップ（ルール名なし）
-- prisma-strong-migrations-disable-next-line
ALTER TABLE "users" DROP COLUMN "name";
```

### Auto-fix（`--fix`）

一部のルールは`--fix`フラグで`SQL`を自動的に安全な形に書き換えられます。

例えば`posts`テーブルに通常のインデックスを追加するマイグレーションを生成した場合、`Prisma`は次のような`SQL`を生成します。

```sql
-- prisma/migrations/20260322040753_add_index_posts_user_id/migration.sql
CREATE INDEX "posts_user_id_idx" ON "posts"("user_id");
```

`CONCURRENTLY`なしの`CREATE INDEX`はテーブルへの書き込みをブロックするため、次のような警告が表示されます。

```
prisma/migrations/20260322040753_add_index_posts_user_id/migration.sql

error [addIndex] line 2
  Adding index "posts_user_id_idx" without CONCURRENTLY locks the table

  ❌ Bad: Creating an index without CONCURRENTLY acquires a lock that prevents reads and writes

  ✅ Good: Follow these steps:
     1. Generate migration file only (do not apply yet):
        npx prisma migrate dev --create-only --name add_your_index_name

     2. Edit the generated migration file:
        - Add the following as the FIRST LINE of the file:
          -- prisma-migrate-disable-next-transaction
        - Add CONCURRENTLY to the CREATE INDEX statement:
          CREATE INDEX CONCURRENTLY "index_name" ON "table_name"("column_name");

     3. Apply the migration:
        npx prisma migrate dev

  ⚠️  Notes:
     - -- prisma-migrate-disable-next-transaction disables transactions for the ENTIRE file.
     - Keep this migration file separate — ideally one statement only.

  To skip this check, add above the statement:
     -- prisma-strong-migrations-disable-next-line addIndex
────────────────────────────────────────────────────────────

✗ 1 error

❌ Migration check failed.

💡 These issues can be auto-fixed (migration SQL only — schema.prisma will not be changed).
   If this looks correct, run with --fix to apply:

   npx psm migrate dev --fix
```

`--fix`を付けて実行すると、`SQL`が自動的に書き換えられます。

```bash
npx psm migrate dev --fix
```

```
✔ Auto-fixed 1 issue(s) in prisma/migrations/20260322040753_add_index_posts_user_id/migration.sql
✅ Auto-fix applied. Run the same command again (without --fix) to apply the migration.
```

修正後の`migration.sql`は次のようになります。`CONCURRENTLY`が追加され、トランザクション無効化ヘッダーも自動で挿入されています。

```sql
-- prisma-migrate-disable-next-transaction
CREATE INDEX CONCURRENTLY "posts_user_id_idx" ON "posts"("user_id");
```

内容を確認したら`--fix`なしで再実行して適用します。

```bash
npx psm migrate dev
```

`--fix`は修正のみを行い、マイグレーションは適用されません。適用は`--fix`なしで再実行します。

アプリケーションコードの変更が必要なルール（`removeColumn`、`renameColumn`など）は自動修正の対象外です。

### migrate deploy

`migrate deploy`は既存のマイグレーションファイルをすべてチェックしたうえで、`prisma migrate deploy`を実行するコマンドです。

```bash
npx psm migrate deploy
```

`migrate dev`との違いは次の通りです。

|                      | `migrate dev`            | `migrate deploy`         |
| -------------------- | ------------------------ | ------------------------ |
| 用途                 | ローカル開発             | 本番・ステージング環境   |
| マイグレーション作成 | あり（`--create-only`）  | なし（適用のみ）         |
| インタラクティブ     | あり                     | なし                     |
| 対象                 | 未適用のマイグレーション | 未適用のマイグレーション |

本番環境へのデプロイ時には`prisma migrate deploy`の代わりに`npx psm migrate deploy`を使うことで、安全でないマイグレーションが含まれている場合にデプロイを止めることができます。

### カスタマイズ

カスタマイズが必要な場合はプロジェクトルートに`prisma-strong-migrations.config.js`を作成します。

```javascript
module.exports = {
  // 特定のルールをプロジェクト全体で無効化する
  disabledRules: ["indexColumnsCount"],

  // 特定のマイグレーションをスキップする（部分一致）
  ignoreMigrations: ["20240101_initial"],

  // マイグレーションファイルのディレクトリ（デフォルト: ./prisma/migrations）
  migrationsDir: "./prisma/migrations",

  // カスタムルールのディレクトリ（デフォルト: ./prisma-strong-migrations-rules）
  customRulesDir: "./prisma-strong-migrations-rules",

  // 警告をエラーとして扱う（デフォルト: false）
  warningsAsErrors: false,

  // 警告があった場合に終了コード非ゼロで終了する（デフォルト: false）
  failOnWarning: false,
  // エラーがあった場合に終了コード非ゼロで終了する（デフォルト: true）
  failOnError: true,
};
```

全設定項目の一覧は [README](https://github.com/soartec-lab/prisma-strong-migrations#configuration) を参照してください。

`init`コマンドを使うと、設定ファイルの生成と`package.json`のスクリプト置き換えをインタラクティブに行えます。

```bash
npx psm init
```

#### カスタムルールの作成

組み込みルールでカバーできないプロジェクト固有のチェックは、カスタムルールとして追加できます。

`init-rule`コマンドでテンプレートファイルを生成します。

```bash
npx psm init-rule my-rule-name
```

`./prisma-strong-migrations-rules/my-rule-name.js`が生成されます。

```javascript
/** @type {import('@soartec-lab/prisma-strong-migrations').Rule} */
export default {
  name: "my-rule-name",
  severity: "error",
  description: "Description of my-rule-name rule",

  detect: (statement, _context) => {
    // 検出したい条件を実装する
    return false;
  },

  message: (statement) => {
    return `Detected issue in ${statement.table ?? "unknown table"}`;
  },

  suggestion: (statement) => {
    return `Review the operation on ${statement.table ?? "unknown table"} carefully`;
  },
};
```

`detect`が`true`を返したステートメントに対して`message`と`suggestion`が表示されます。カスタムルールは`customRulesDir`で指定したディレクトリに置くことで自動的に読み込まれます。

### 既存プロジェクトへの導入（`--force`）

すでに稼働中のプロジェクトに導入する場合、既存のマイグレーションファイルが大量のエラーを出す場合があります。`--force`フラグを使うとチェックをスキップしてすべてのマイグレーションを適用できます。

```bash
# ローカル環境のセットアップ時のみ使用
npx psm migrate dev --force
```

> 注意: `--force`はすべての安全チェックを無効にします。ローカルの開発環境セットアップ時のみ使用し、本番 CI/CD パイプラインでは使用しないでください。

## CI 統合

### GitHub Actions

プルリクエスト時にマイグレーションファイルを自動チェックするワークフローの例です。

```yaml
name: Migration Check

on:
  pull_request:
    paths:
      - "prisma/schema.prisma"
      - "prisma/migrations/**"

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npm ci
      - run: npx psm check
```

`--format json`での出力を使えば、PRコメントへの結果の書き込みなど、より細かいカスタマイズも可能です。

## 検出ルール

合計38ルール（エラー32個、警告6個）を内蔵しています。

| ルール                                   | 説明                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| `addIndex`                               | 書き込みをブロックする                                                               |
| `removeIndex`                            | 書き込みをブロックする                                                               |
| `addForeignKey`                          | 両テーブルへの書き込みをブロックする                                                 |
| `addCheckConstraint`                     | 全行スキャン中に読み書きをブロックする                                               |
| `addUniqueConstraint`                    | 全行スキャン中に読み書きをブロックする                                               |
| `addExclusionConstraint`                 | 全行スキャン中にロックを取得する                                                     |
| `setNotNull`                             | 全行スキャンを必要とする                                                             |
| `createTableAsSelect`                    | `CREATE TABLE AS SELECT`は長時間ロックが発生する可能性がある                         |
| `changeColumnType`                       | テーブル全体の再書き込みで長時間ロックが発生する                                     |
| `addVolatileDefault`                     | 揮発性デフォルト値の追加は全行更新を伴う                                             |
| `addAutoIncrement`                       | 全行の更新を必要とする                                                               |
| `addStoredGenerated`                     | テーブル全体の再書き込みが発生する                                                   |
| `removeColumn`                           | デプロイ順序によってはアプリがクラッシュする                                         |
| `renameColumn`                           | 使用中のカラムのリネームはエラーを引き起こす                                         |
| `renameTable`                            | 使用中のテーブルのリネームはエラーを引き起こす                                       |
| `dropTable`                              | テーブルの削除は回復不能なデータ損失を招く                                           |
| `renameSchema`                           | スキーマのリネームはエラーを引き起こす                                               |
| `truncateTable`                          | `AccessExclusiveLock`を取得し全行を削除する                                          |
| `disableTrigger`                         | 外部キーなどの制約トリガーを無効化し、データ整合性を損なう                           |
| `vacuumInMigration`                      | `VACUUM`はトランザクション内で実行できない                                           |
| `updateWithoutWhere`                     | `WHERE`なしの`UPDATE`は全行を更新し、大規模テーブルでロックが発生する                |
| `deleteWithoutWhere`                     | `WHERE`なしの`DELETE`は全行を削除する                                                |
| `backfillInMigration`                    | スキーマ変更とデータバックフィルを同一ファイルに混在させると長時間ロックが発生する   |
| `disableTransaction`                     | トランザクション無効化ファイルに複数のステートメントを含めるとロールバック不能になる |
| `enumValueRemoval`                       | `Prisma`は`ENUM`削除時に型を再作成するため、既存データがあると失敗する               |
| `implicitM2mTableChange`                 | `Prisma`管理の`M2M`テーブルを直接変更するとスキーマと乖離する                        |
| `intPrimaryKey`                          | `SERIAL`は最大約21億行。後から`BigInt`に変更するのはほぼ不可能                       |
| `cuidUuidDefaultRemoval`                 | DBレベルのデフォルト値削除は`Prisma Client`をバイパスする挿入のID生成を壊す          |
| `prismaManagedColumnChange`              | `@updatedAt`へのDBレベルのデフォルト/トリガー追加は`Prisma`の管理と競合する          |
| `addJsonColumn`                          | `json`型より`jsonb`型が推奨される                                                    |
| `addNotNullWithoutDefault`               | 既存行がある場合、デフォルトなしの`NOT NULL`カラム追加は失敗する                     |
| `indexColumnsCount`                      | 非ユニークインデックスのカラム数は3以下が推奨                                        |
| `implicitM2mRelation`                    | 暗黙の`M2M`リレーションより明示的な中間テーブルが推奨                                |
| `concurrentWithoutDisableTransaction`    | `CONCURRENTLY`はトランザクション無効化なしでは機能しない                             |
| `notValidValidateSameFile`               | `NOT VALID`と`VALIDATE CONSTRAINT`を同一ファイルに置くと最適化が無効になる           |
| `mixedStatementsWithDisabledTransaction` | トランザクション無効化ファイルには1ステートメントのみ                                |

### Prisma 固有ルールについて

`Prisma`固有のルールは、汎用`SQL`リンターでは検出できない部分をカバーしています。

`Prisma`のマイグレーションには、汎用ツールが知り得ない独自のコンテキストがあります。代表的なものが**トランザクション管理**です。`Prisma`はデフォルトで各マイグレーションファイル全体を1つのトランザクションで実行します。そのため、トランザクション内では実行できない操作（`CREATE INDEX CONCURRENTLY`など）は、ファイル先頭に`-- prisma-migrate-disable-next-transaction`コメントを付けてトランザクションを無効化する必要があります。このような`Prisma`固有の制約を理解したうえでルールを設計しています。

いくつか具体例を紹介します。

#### `ENUM`値の削除

`Prisma`は`ENUM`値を削除する際、型を一度削除して再作成するマイグレーション`SQL`を生成します。既存データに削除対象の値が含まれていると、このマイグレーションは本番環境で失敗します。

```sql
-- Prisma が生成するSQL（既存データがあると失敗する）
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::text::"Role";
DROP TYPE "Role_old";
```

#### 暗黙の`M2M`リレーションの変更

`Prisma`が自動生成する`_XToY`テーブルを直接`ALTER`すると、`schema.prisma`との乖離が生じます。明示的な中間テーブルへの移行を推奨します。

```sql
-- 検出対象
ALTER TABLE "_CategoryToPost" ADD COLUMN "extra" TEXT;
```

## なぜ作ったか

ここからは使い方の説明から離れ、このライブラリを作るに至った課題感とモチベーションについて説明します。

### 課題

#### マイグレーションの安全な実行は難しい

マイグレーションファイルは、作る側にとっても、レビューする側にとっても難しいです。`PostgreSQL`のロック挙動やバージョンごとの挙動差異といった知識、`Prisma`が生成する`SQL`や暗黙的なトランザクション管理の特性、そして既存の運用状況（テーブルサイズ、稼働中のアプリのデプロイ順序など）すべてを把握したうえで安全なマイグレーションを書き、さらにレビューでも危険な操作を見逃さないようにするのは簡単ではありません。

知識のある人が書いてもレビューしても見落としは起きますし、チームに知見が偏っていれば属人化します。

#### 既存ツールでは解決できなかった

汎用の`PostgreSQL`リンターである`squawk`などは、`SQL`の危険なパターンを検出できますが、`Prisma`の文脈を理解していません。

| ツール                   | Prisma 固有ルール   | Auto-fix   | カスタムルール | Prisma ワークフロー統合      |
| ------------------------ | ------------------- | ---------- | -------------- | ---------------------------- |
| prisma-strong-migrations | ✅ 充実（13ルール） | ✅ 6ルール | ✅ JS/TS       | ✅ migrate dev/deploy ラップ |
| squawk                   | ❌ なし             | ❌         | ❌             | ❌                           |
| Prisma 組み込み          | ❌ 構文エラーのみ   | ❌         | ❌             | ✅                           |

`Prisma`固有のルール（`ENUM`の再作成戦略、`M2M`テーブルの管理、`@updatedAt`との競合など）は、`Prisma`の内部実装を理解していないと検出できません。これらは汎用ツールのカバー範囲外です。

#### `Prisma`のアノテーションコメントだけでは不十分

`Prisma`自体も危険な操作を認識した際は生成した`migration.sql`にアノテーションコメントを追記します。

```sql
-- This is an empty migration.
-- WARNING: This migration contains a potentially unsafe operation!
-- See https://www.prisma.io/docs/concepts/components/prisma-migrate/...
ALTER TABLE "users" DROP COLUMN "name";
```

ただし、このコメントはあくまで注意を促すだけで強制力がありません。マイグレーションはレビューで見落とされることもありますし、コメントを無視してそのまま実行可能です。背景知識がなければ「まぁいいか」とそのまま進めてしまうこともあります。コメントがあっても安全性は保証されない、というのが根本的な問題です。

### モチベーション

#### ルールは強制力を持って機能すべき

コメントでの警告は見落とされます。`CI`パイプラインで自動チェックし、問題があればマイグレーションを止める仕組みが必要です。`prisma-strong-migrations`はデフォルトで問題発見時にプロセスを非ゼロで終了するため、`CI`でゲートとして機能します。

意図的なスキップも`SQL`ファイル内のコメントとして明示的に記録されるため、後から「なぜこの操作を実行したか」が`git`履歴で追跡できます。

#### AIエージェントのガードレールとして

マイグレーションのレビューを`AI`に任せることも選択肢としてありますが、`AI`の判断は非決定的です。同じ操作でも答えが変わりうるため、安全性のゲートとしては信頼しにくい部分があります。

機械的なチェックによる決定的なフィードバックがあれば、`AI`エージェントが自律的に問題を検出・修正するサイクルを回せます。`prisma-strong-migrations`のようなツールが出力するエラーは明確で再現性があるため、`AI`エージェントが動作する際のガードレールとして機能します。レビューの判断を`AI`に委ねるのではなく、ツールが正誤を決定し、`AI`はその結果に従って修正するという役割分担が、今後のAI活用において重要になると考えています。

#### `Rails`の`strong_migrations`から着想を得た

私は`Rails`での開発が長く、マイグレーションの安全性をサポートするために [strong_migrations](https://github.com/ankane/strong_migrations) を使用することが多かったです。`Prisma`に移行してから同様の仕組みを探しましたが、見当たりませんでした。この経験があったからこそ、「同じものを`Prisma`向けに作ればいい」という発想に至りました。そこで自分で作ることにしました。

## おわりに

本番稼働中のアプリケーションに対して安全にマイグレーションを実行したい、という方にまず使ってみてほしいライブラリです。`Prisma`のマイグレーションはコマンド一つで簡単に実行できる反面、その手軽さゆえに危険な操作が見過ごされやすい側面があります。`prisma-strong-migrations`を導入することで、そのリスクをチームのスキルレベルに依存せずツールで担保できます。

特に次のような方にも役立つと思います。

- マイグレーションのレビューで毎回同じ指摘をしている方
- `AI`エージェントを活用した開発で、マイグレーションの安全性を決定的なツールで担保したい方

今後はルール数の拡充や、`Prisma`のバージョンアップへの追随を継続していく予定です。Issue や PR はいつでも歓迎しています。

https://github.com/soartec-lab/prisma-strong-migrations
