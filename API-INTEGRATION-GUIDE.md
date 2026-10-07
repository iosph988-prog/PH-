# PH- API クイックガイド

## ベースURL

```text
https://api-production-182c.up.railway.app
```

## キーについての重要な注意

このAPIはヘッダーに固定の `X-API-Key` を使用しません。アプリは管理パネルで生成された**ライセンスキー**を使用し、そのキーをJSONボディの `key` フィールドで送信します。

同じキーでライセンスの検証とパッチカタログの取得ができます。`device_id`、パッケージ、およびアプリのバージョンも送信する必要があります。

## ライセンスを検証する

エンドポイント:

```text
POST /api/license/validate
```

cURL例:

```bash
curl -X POST "https://api-production-182c.up.railway.app/api/license/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "COLE_A_CHAVE_GERADA_AQUI",
    "device_id": "ID_UNICO_DO_DISPOSITIVO",
    "package": "com.exemplo.meuapp",
    "app_version": "1.0.0"
  }'
```

有効なレスポンス例:

```json
{
  "valid": true,
  "code": "valid",
  "message": "Licença válida"
}
```

ライセンスが無効、期限切れ、取り消し済み、またはデバイス数の上限を超えている場合、レスポンスは `valid: false` になります。

## PROXY からパッチを取得する

エンドポイント:

```text
POST /api/patches/catalog
```

例:

```bash
curl -X POST "https://api-production-182c.up.railway.app/api/patches/catalog" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "COLE_A_CHAVE_GERADA_AQUI",
    "device_id": "ID_UNICO_DO_DISPOSITIVO",
    "package": "com.exemplo.meuapp",
    "app_version": "1.0.0"
  }'
```

レスポンスには配列 `patches` が含まれます。各アイテムは `slug`、`title`、`game`、`section`、`interfaceTab`、`fileName`、`sha256`、`sizeBytes`、`downloadUrl` を含む場合があります。

## External / Online（別扱い）からパッチを取得する

エンドポイント:

```text
POST /api/patches/external/catalog
```

ボディは同じです:

```json
{
  "key": "COLE_A_CHAVE_GERADA_AQUI",
  "device_id": "ID_UNICO_DO_DISPOSITIVO",
  "package": "com.exemplo.meuapp",
  "app_version": "1.0.0"
}
```

このエンドポイントは `external` セクションの公開物のみを返します。

## パッチをダウンロードする

ダウンロードを手動で組み立てないでください。カタログで返される `downloadUrl` を使用してください:

```bash
curl -L "URL_DO_CAMPO_downloadUrl" -o patch.3105
```

URLは署名付きの一時的なものです。ライセンス、デバイス、パッケージ、アプリのバージョンに紐づいています。トークンが期限切れの場合は、カタログを再取得してください。

## JavaScript の例

```js
const API_BASE = "https://api-production-182c.up.railway.app";

const payload = {
  key: licenseKey,
  device_id: deviceId,
  package: "com.exemplo.meuapp",
  app_version: "1.0.0",
};

const validation = await fetch(`${API_BASE}/api/license/validate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
}).then(response => response.json());

if (!validation.valid) {
  throw new Error(validation.message || "Licença inválida");
}

const catalog = await fetch(`${API_BASE}/api/patches/external/catalog`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
}).then(response => response.json());

for (const patch of catalog.patches ?? []) {
  const file = await fetch(patch.downloadUrl).then(response => {
    if (!response.ok) throw new Error(`Falha no download: ${response.status}`);
    return response.arrayBuffer();
  });
  console.log(patch.fileName, patch.sha256, file.byteLength);
}
```

## 必須フィールド

| Campo | Descrição |
|---|---|
| `key` | 管理パネルで作成されたライセンスキー |
| `device_id` | デバイスの安定した識別子 |
| `package` | アプリの Bundle ID またはパッケージ名 |
| `app_version` | 現在のアプリバージョン |

## 共通のステータス / コード

| HTTP | Código | Significado |
|---:|---|---|
| 200 | `valid` | ライセンスが有効で、レスポンスが利用可能 |
| 400 | `invalid_request` | 必須フィールドが欠落しているか空 |
| 403 | resposta com `valid: false` | ライセンス拒否またはダウンロードが許可されていない |
| 503 | `service_unavailable` | データベースまたはサービスの一時的な障害 |

## キーの生成方法

管理パネルにログインし、**Gerar key** を開き、数量と期間を設定して表示されたキーをコピーしてください。このキーを別プロジェクトの `key` フィールドに入れてください。

管理者パスワード、セッションCookie、サーバーのシークレットをアプリに入れないでください。アプリにはユーザー向けのライセンスキーのみを渡してください。

## 完全なドキュメント

[API 完全ドキュメント](/blob/main/API-DOCUMENTATION.md)

## 参照

[1]:  "Repositório do projeto PH-"

[2]: https://api-production-182c.up.railway.app "公開 API"
