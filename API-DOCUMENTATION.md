# PH- API とパッチシステム

## 概要

このプロジェクトには Railway 上の API、管理用 Web パネル、ローカル認証システム、キー生成器、iOS インターフェイスをビルドするワークフローが含まれます。公開 API はライセンスを検証し、2 つのパッチカタログを配信します：**PROXY** カタログと、別運用の Online が使用する **External** カタログです。

現在の公開 API の URL:

```text
https://api-production-182c.up.railway.app
```

ソースコードはリポジトリ [PH-]() にあります。バックエンドは `ph/` ディレクトリに配置されています。

## 管理者およびサブ販売者の認証

ローカルログインはクッキーで保護された HTTP セッションを使用します。管理者は `ADMIN_EMAIL` に設定したメールアドレスと `ADMIN_PASSWORD` または `ADMIN_PASSWORD_HASH` を使ってログインします。管理者はパネル上でサブ販売者を作成できます。

サブ販売者は有効な任意のメール（Gmail を含む）または有効なユーザー識別子を使用できます。パスワードは最低 6 文字必要です。アカウントにはクレジット上限と有効期限が設定されます。作成された各 `key` は要求された数量に応じてクレジットを消費します。アカウントの有効期限が切れると、ログインおよび生成操作はブロックされます。

サブ販売者は自身の `key` の生成、削除、リセットのみを行えます。パッチ管理、管理者によるグローバルな無効化、他アカウントの作成にはアクセスできません。

### ローカルログイン

`POST /api/auth/local/login`

リクエストボディ JSON:

```json
{
  "email": "akiraalik@gmail.com",
  "password": "senha-definida-pelo-administrador"
}
```

`email` の代わりに `username` フィールドも受け付けます。成功時、API はセッションを記録して次を返します：

```json
{ "ok": true }
```

`POST /api/auth/local/logout` は現在のセッションを終了します。

## ライセンス検証

`POST /api/license/validate`

必須ボディ:

```json
{
  "key": "CHAVE-GERADA",
  "device_id": "identificador-do-dispositivo",
  "package": "com.exemplo.app",
  "app_version": "1.0.0"
}
```

レスポンスでは `key` の有効性、ライセンス状態、有効期限、デバイス数上限が返されます。最初のアクティベーションで `key` に設定された有効期間が開始されます。不完全なリクエストは `400` を返し、拒否されたライセンスは `valid: false` を返します。

## PROXY カタログ

`POST /api/patches/catalog`

リクエストボディはライセンス検証と同じ 4 つのフィールド：`key`、`device_id`、`package`、`app_version` を使用します。API はライセンスを検証した上で、標準セクションに公開されているパッチを返します。

各公開アイテムには `slug`、`title`、`game`、`section`、`interfaceTab`、`versionId`、`version`、`fileName`、`sha256`、`sizeBytes`、`status`、`publishedAt`、`downloadUrl` などのフィールドが含まれます。

## External カタログ

`POST /api/patches/external/catalog`

ボディは PROXY カタログと同じです。違いは API が `external` セクションのみを照会することで、これは独立した Online が使用します。公開されたカテゴリは IPA が使用する識別子に変換されます：

| 管理パネルのタブ | IPA に渡される識別子 |
|---|---|
| MIRA | `aim` |
| ESP | `esp` |
| GERAL | `general` |
| RAIO-X | `xray` |
| OUTROS | `other` |

ゲーム向けには API は `online-free-fire:categoria` または `online-free-fire-max:categoria` 形式を使用します。公開データの `interfaceTab` フィールドがアプリへ渡されるカテゴリを定義します。

## 承認されたパッチのダウンロード

`GET /api/patches/download?t=TOKEN`

カタログで受け取る `downloadUrl` は署名付きの一時トークンを含みます。トークンはパッチのバージョンをライセンス、デバイス、アプリのパッケージに紐付けます。トークンが有効であり、ライセンスが有効で、バージョンが公開されたままの場合にのみ API はファイルへリダイレクトします。

公開されるファイルは `.3105` で終わる必要があり、ディレクトリパスを含めてはいけません。ファイルサイズは 50 MB の上限があります。システムは整合性検証のためファイルの SHA-256 を計算して返します。

## パッチの公開と管理

Web パネルは `/api/trpc` の tRPC API を使用します。管理操作には公開、一覧表示、編集、公開/無効化の状態変更が含まれます。独立した Online は有効な `interfaceTab` カテゴリを要求します。

公開時、管理者は slug、タイトル、ゲーム、セクション、カテゴリ、および `.3105` ファイルを指定します。公開は設定されたストレージにバージョンを保存し、パッチの現在バージョンを更新します。公開を無効化すると状態は下書きになり、再度有効化すると現在のバージョンが公開されます。

## 環境変数

デプロイ時は Drizzle が使用する MySQL 接続と、ファイル用の設定済みストレージを提供する必要があります。また、セッションとダウンロードトークンの署名に使う安定したキーを設定してください。

| 変数 | 用途 |
|---|---|
| `DATABASE_URL` または同等の MySQL 設定 | データベース接続 |
| `ADMIN_EMAIL` | ローカル管理者のメールアドレス |
| `ADMIN_PASSWORD` または `ADMIN_PASSWORD_HASH` | 管理者ローカルパスワード |
| `SESSION_SECRET` または `JWT_SECRET` | セッションおよびトークンの署名 |
| ストレージ関連の変数 | `.3105` ファイルのアップロードと署名付き URL |

パスワード、ハッシュ、セッションキー、ストレージの認証情報をリポジトリに公開しないでください。

## プロジェクト構成

```text
PH-/
├── .github/workflows/ios-kyojinx.yml   # compilação e montagem da IPA
├── ph/client/                           # painel web administrativo
├── ph/server/_core/localAuth.ts        # login local e subrevendedores
├── ph/server/_core/index.ts            # rotas HTTP públicas
├── ph/server/remotePatches.ts          # catálogo, versões e downloads
├── ph/server/licenses.ts               # keys e validação de licenças
├── ph/server/routers.ts                # procedimentos tRPC do painel
├── ph/drizzle/schema.ts                # schema do banco
└── ph/package.json                     # scripts do backend e frontend
```

## ビルドとデプロイ

`ph/` の API プロジェクトを検証するには次を使用します：

```bash
pnpm install --frozen-lockfile
pnpm run build
```

Railway は `iosph988-prog/PH-` リポジトリに接続されており、ルートディレクトリとして `ph` を使用しています。`main` ブランチへの push が設定されたデプロイをトリガーします。

iOS ワークフローは [ios-kyojinx.yml](/blob/main/.github/workflows/ios-kyojinx.yml) です。これはインターフェイス修正を注入して GitHub Actions 経由で IPA アーティファクトをビルドします。

## 簡易トラブルシューティング

パネルが「E-mail indisponível」を表示する場合は、`username` をフォールバックとして使うバージョンのインターフェイスに更新してください。Gmail で作成された新規アカウントは `email` と `username` の両方にアドレスが保存されます。

カタログが `401` または `403` を返す場合は、`key`、デバイス識別子、パッケージ、アプリバージョンを確認してください。`503` が返る場合は、データベース、ストレージ、および Railway デプロイの環境変数を確認してください。

External にパッチが表示されない場合は、公開が有効であること、セクションが `external` であること、`interfaceTab` が設定されていることを確認してください。ファイルがダウンロードできない場合は、バージョンが公開中であることとトークンの有効期限を確認してください。

## 参考

[1]:  "プロジェクト PH- のリポジトリ"

[2]: /blob/main/.github/workflows/ios-kyojinx.yml "IPA ビルドのワークフロー"

[3]: https://api-production-182c.up.railway.app "公開 API のデプロイ先"

[4]: /blob/main/ph/server/_core/index.ts "API の HTTP ルート"

[5]: /blob/main/ph/server/remotePatches.ts "パッチのカタログとダウンロード"


## セキュリティ更新 — 承認済みビルド 2026.10.07

現在バックエンドが承認しているクライアント版は次のとおりです：

```text
Bundle ID: com.apple.mobile.MobileHouseArrest
Versões autorizadas: 2026.09.28 e 2026.10.07
```

モバイル向けルート `/api/license/validate`、`/api/patches/catalog`、`/api/patches/external/catalog` は、`PH_ALLOWED_IOS_BUNDLE_ID` と `PH_ALLOWED_IOS_VERSION` で設定された Bundle ID とバージョンの両方に同時に一致しないクライアントを拒否します。

iOS クライアント用に予約されたヘッダーは次です：

```http
X-PH-IOS-Token: <token-do-cliente>
```

現行コードのレビューでは、このヘッダーは互換性のためにプロトコルに残されていますが、関数 `hasValidIosToken()` は受信した値を比較していません。したがって、このヘッダーを単独の認証要素として扱うべきではありません。実際の認可は引き続きライセンス、デバイス、Bundle ID、およびバージョンで行われます。サーバー側でトークンも必須にするには、Railway に `PH_IOS_API_TOKEN` を設定し、ヘッダー値との比較を定数時間比較で実装してください。秘密は公開ドキュメントに置かないでください。

External カタログは管理タブ `MIRA`、`ESP`、`GERAL`、`RAIO-X`、`OUTROS`、`FUNÇÕES`、`EXTRAS/FERRAMENTAS`、`PERFIL` を受け入れ、それらをクライアント識別子に変換します。`interfaceTab` を欠く External 公開は拒否されます。

更新された iOS ワークフローは、バンドルに独立した `.dylib` ファイルまたは単一の `Framework/` フォルダを含む IPA の配布をブロックします。標準の `Frameworks/` フォルダは引き続きアプリが認識する正当な依存関係用に予約されています。

### モバイルクライアントの応答コード

| HTTP | コード | 推奨アクション |
|---:|---|---|
| 200 | `valid` | 続行して返されたカタログを使用する。 |
| 400 | `invalid_request` | 必須フィールドを修正する。 |
| 403 | `unsupported_client` | 承認されたビルドにアップデートする。 |
| 403 | `invalid_key`, `revoked`, `expired`, `device_limit` | アクセス拒否を表示し、ダウンロードを試みない。 |
| 403 | `download_forbidden` | 新しいカタログ／トークンを要求する。 |
| 503 | `service_unavailable` | 一時的なサービス停止として扱う。 |

### 最小限の統合例

```swift
struct LicenseRequest: Encodable {
    let key: String
    let device_id: String
    let package: String
    let app_version: String
}

var request = URLRequest(url: URL(string: "https://api-production-182c.up.railway.app/api/patches/catalog")!)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.setValue("<token-do-cliente>", forHTTPHeaderField: "X-PH-IOS-Token")
request.httpBody = try JSONEncoder().encode(LicenseRequest(
    key: licenseKey,
    device_id: deviceIdentifier,
    package: "com.apple.mobile.MobileHouseArrest",
    app_version: "2026.10.07"
))
```

IPA のみを認可手段として信頼してはいけません：バックエンドは引き続きライセンス、カタログ、公開状態、ダウンロードの最終的な権威であるべきです。

## 承認された Android クライアント

バックエンドは現在、承認された iOS IPA に加えて次の Android 組み合わせのみを受け入れます：

```text
Package/Application ID: com.my.rtxxiters
Versão:                 1.0
```

Railway で設定可能な変数は次のとおりです：

```env
PH_ALLOWED_ANDROID_PACKAGE=com.my.rtxxiters
PH_ALLOWED_ANDROID_VERSION=1.0
```

APK は IPA と同じ JSON ボディを送信する必要があります：

```json
{
  "key": "EXTERNAL-CHAVEGERADA",
  "device_id": "identificador-do-dispositivo-android",
  "package": "com.my.rtxxiters",
  "app_version": "1.0"
}
```

許可されるルートは `/api/license/validate`、`/api/patches/catalog`、`/api/patches/external/catalog` です。その他の package またはバージョンは `403` を `code: "unsupported_client"` で受け取ります。

デプロイ後に APK が「Cliente não autorizado」を表示し続ける場合は、Railway 上で上記変数が別の値に上書きされていないか確認し、サービスを再起動して設定を反映させてください。

## API変更時の安全な動作
IPA は API の応答が不正、未知の形式、未承認の Bundle ID、または未承認バージョンの場合に、保護された画面とカタログを開放しません。意図的にアプリをクラッシュさせるのではなく、アクセスを拒否してライセンス画面へ戻るフェイルクローズ方式を使用します。これによりデータ破損や端末の不安定化を避けながら、API の変更や改ざんによる利用を防ぎます。

このリポジトリの Markdown は API サーバーから自動的に公開されません。管理用ドキュメントへのアクセスを制限するには、GitHub リポジトリを private にし、管理者だけに権限を付与してください。日本語化は可読性の変更であり、認証・暗号化・アクセス制御の代替ではありません。
