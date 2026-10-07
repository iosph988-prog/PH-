ファイル名: API_RAILWAY.md

# iOSアプリの統合

このパネルを公開したら、Railway により割り当てられた HTTPS URL をベースとして使用してください。公開検証エンドポイントは次のとおりです:

```text
https://api-production-182c.up.railway.app/api/license/validate
```

アプリは `Content-Type: application/json` の `POST` リクエストを送信し、ボディは次のとおりにしてください:

```json
{
  "key": "NX-SUA-CHAVE",
  "device_id": "id-estavel-do-dispositivo",
  "package": "com.suaempresa.seuapp",
  "app_version": "1.0.0"
}
```

アプリの解放（アクセス許可）は、レスポンスに JSON ブール値として正確に `valid: true` が含まれている場合にのみ行われるべきです。文字列 `"true"`、フィールドが存在しない場合、またはその他のエラーはすべて未承認として扱ってください。

成功時のレスポンス:

```json
{
  "valid": true,
  "code": "valid",
  "message": "Chave válida",
  "expiresAt": null,
  "deviceLimit": 1
}
```

無効なキー時のレスポンス:

```json
{
  "valid": false,
  "code": "invalid_key",
  "message": "Chave inválida"
}
```

テストするには、認証済みのパネルでキーを生成し、テスト用の `device_id` で一度使用して `valid: true` を確認してください。その後、キーの文字を1つ変更するかパネル上で取り消してリクエストを再度行ってください。アプリは `valid: false` のままブロックされている必要があります。

SwiftUI では、条件は次のように等価であるべきです:

```swift
let allowed = response.valid == true
if allowed {
    showMainApp = true
} else {
    showMainApp = false
}
```

管理用のシークレット、キーのハッシュ、データベースの資格情報をアプリ内に置かないでください。アプリが知っているのは公開エンドポイントとユーザが入力したライセンスキーだけです。
