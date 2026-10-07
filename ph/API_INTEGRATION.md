# ライセンスAPI統合ドキュメント — Hock FF

## 概要

この API はデバイスに紐づくライセンスを検証し、安定した JSON オブジェクトを返します。クライアントはフィールド `valid` が厳密に boolean の `true` である場合にのみフローを解放してください。その他の値はアクセス拒否または一時的なエラーとして扱う必要があります。

> **現在の公開エンドポイント:** `https://api-production-182c.up.railway.app/api/license/validate`

呼び出しは管理者トークンを必要としません。管理者用の資格情報をクライアントアプリに含めてはいけません。

## リクエスト

`POST` を使用し、`Content-Type: application/json` を指定してください。

| フィールド | 型 | 必須 | 説明 |
|---|---|---:|---|
| `key` | string | はい | ユーザーが入力するライセンスキー。 |
| `device_id` | string | はい | アプリが生成する安定したデバイス識別子。 |
| `package` | string | はい | 検証を要求しているアプリの識別子。 |
| `app_version` | string | はい | クライアントアプリのバージョン。 |

リクエスト本文の例:

```json
{
  "key": "NX-ABC123456789XYZ",
  "device_id": "device-8f4c2d1a",
  "package": "com.hockff.app",
  "app_version": "1.0.0"
}
```

これらのフィールドに `null`、オブジェクト、数値、空文字列を送ってはいけません。クライアントは呼び出し前に入力を検証し、予期しないレスポンスも force unwrap を行わないで処理する必要があります。

## レスポンス

### 有効なライセンス — HTTP 200

最初の有効な検証時に期限のカウントが始まります。レスポンスには有効化・期限のデータが含まれることがあります:

```json
{
  "valid": true,
  "code": "valid",
  "message": "Chave válida",
  "expiresAt": "2026-09-18T19:43:05.960Z",
  "activatedAt": "2026-09-17T19:43:05.960Z",
  "durationDays": 1,
  "durationMinutes": 1440,
  "deviceLimit": 2000
}
```

`expiresAt` と `activatedAt` は UTC の ISO 8601 タイムスタンプです。クライアントはこれらをオプショナルな日付としてデコードしてください。`durationMinutes` はライセンスの正確な期間を分単位で表します。1日ライセンスなら `1440`、1時間ライセンスなら `60` です。

### 無効なキー — HTTP 200

```json
{
  "valid": false,
  "code": "invalid_key",
  "message": "Chave inválida",
  "supportUrl": "https://whatsapp.com/channel/0029VbD6Arm8kyyQAho7UP2t"
}
```

### ブロックまたは一時停止されたキー — HTTP 200

```json
{
  "valid": false,
  "code": "revoked",
  "message": "Chave revogada",
  "supportUrl": "https://whatsapp.com/channel/0029VbD6Arm8kyyQAho7UP2t"
}
```

### 期限切れのキー — HTTP 200

```json
{
  "valid": false,
  "code": "expired",
  "message": "Chave expirada",
  "supportUrl": "https://whatsapp.com/channel/0029VbD6Arm8kyyQAho7UP2t"
}
```

### デバイス数上限 — HTTP 200

```json
{
  "valid": false,
  "code": "device_limit",
  "message": "Limite de dispositivos atingido",
  "supportUrl": "https://whatsapp.com/channel/0029VbD6Arm8kyyQAho7UP2t"
}
```

### 不完全なリクエスト — HTTP 400

```json
{
  "valid": false,
  "code": "invalid_request",
  "message": "Campos obrigatórios: key, device_id, package e app_version"
}
```

### 一時的なサービス停止 — HTTP 503

```json
{
  "valid": false,
  "code": "service_unavailable",
  "message": "Serviço temporariamente indisponível",
  "supportUrl": "https://whatsapp.com/channel/0029VbD6Arm8kyyQAho7UP2t"
}
```

HTTP ステータスが `200` 以外の場合、それをライセンス有効と解釈してはいけません。`503` の場合、アプリは再試行を提案できますが、ローカルでアクセスを解放してはいけません。

## `URLSession` を使った Swift の例

以下の例は force unwrap を避け、HTTP ステータスを扱い、オプショナルなフィールドを受け入れ、かつ `valid == true` のときのみライセンスを承認します。

```swift
import Foundation

struct LicenseRequest: Encodable {
    let key: String
    let device_id: String
    let package: String
    let app_version: String
}

struct LicenseResponse: Decodable {
    let valid: Bool?
    let code: String?
    let message: String?
    let expiresAt: Date?
    let activatedAt: Date?
    let durationDays: Int?
    let durationMinutes: Int?
    let deviceLimit: Int?
    let supportUrl: String?
}

enum LicenseValidationError: Error {
    case invalidURL
    case invalidInput
    case httpStatus(Int)
    case invalidResponse
    case denied(String)
}

func validateLicense(
    key: String,
    deviceID: String,
    packageName: String,
    appVersion: String,
    completion: @escaping (Result<LicenseResponse, Error>) -> Void
) {
    let cleanKey = key.trimmingCharacters(in: .whitespacesAndNewlines)
    let cleanDeviceID = deviceID.trimmingCharacters(in: .whitespacesAndNewlines)
    let cleanPackage = packageName.trimmingCharacters(in: .whitespacesAndNewlines)
    let cleanVersion = appVersion.trimmingCharacters(in: .whitespacesAndNewlines)

    guard !cleanKey.isEmpty, !cleanDeviceID.isEmpty,
          !cleanPackage.isEmpty, !cleanVersion.isEmpty else {
        completion(.failure(LicenseValidationError.invalidInput))
        return
    }

    guard let url = URL(string: "https://api-production-182c.up.railway.app/api/license/validate") else {
        completion(.failure(LicenseValidationError.invalidURL))
        return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.timeoutInterval = 15
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    let payload = LicenseRequest(
        key: cleanKey,
        device_id: cleanDeviceID,
        package: cleanPackage,
        app_version: cleanVersion
    )

    do {
        let encoder = JSONEncoder()
        request.httpBody = try encoder.encode(payload)
    } catch {
        completion(.failure(error))
        return
    }

    URLSession.shared.dataTask(with: request) { data, response, error in
        DispatchQueue.main.async {
            if let error {
                completion(.failure(error))
                return
            }

            guard let http = response as? HTTPURLResponse else {
                completion(.failure(LicenseValidationError.invalidResponse))
                return
            }

            guard let data, !data.isEmpty else {
                completion(.failure(LicenseValidationError.invalidResponse))
                return
            }

            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601

            do {
                let result = try decoder.decode(LicenseResponse.self, from: data)

                guard http.statusCode == 200 else {
                    completion(.failure(LicenseValidationError.httpStatus(http.statusCode)))
                    return
                }

                guard result.valid == true else {
                    // クライアントは result.supportUrl を使ってサポート用のボタンを表示できます。
                    // ユーザーの明示的な操作なしにリンクを自動で開かないでください。
                    completion(.failure(LicenseValidationError.denied(result.message ?? "Chave não autorizada")))
                    return
                }

                completion(.success(result))
            } catch {
                completion(.failure(error))
            }
        }
    }.resume()
}
```

## クラッシュを避けるためのルール

クライアントは `valid`、`code`、`message`、`expiresAt`、`activatedAt`、`durationDays`、`durationMinutes`、`deviceLimit` をオプショナルなフィールドとして扱う必要があります。これにより、エラーレスポンスに有効なレスポンス用フィールドが含まれていない場合のクラッシュを防げます。

クライアントは日付を `!` で変換したり、配列の位置にサイズチェックなしでアクセスしたり、すべての HTTP ステータスが `200` であると仮定したり、`message` のみを根拠にフローを解放してはいけません。承認の唯一の条件は、デコードに成功し HTTP 200 を確認した上で `response.valid == true` であることです。

ローカルのカウントダウンには `expiresAt` を使用してください。まだ有効化されていないライセンスに対して期限を捏造してはいけません。その場合は「有効化待ち」と表示してください。無効なレスポンスでは `supportUrl` に公式サポートチャンネルが含まれています。クライアントはユーザーの明示的な操作後にそのアドレスを開くためのボタンを提供してもよいです。

## cURL による手動テスト

```bash
curl -i -X POST \
  'https://api-production-182c.up.railway.app/api/license/validate' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  --data '{
    "key": "NX-ABC123456789XYZ",
    "device_id": "device-test-001",
    "package": "com.hockff.app",
    "app_version": "1.0.0"
  }'
```

承認ケースをテストするには、パネルの実際のキーを使用してください。エラーをテストするには、存在しないキー、空のフィールド、あるいは既に上限に達しているデバイスを使用してください。本番ログに完全なキーを記録しないでください。

## 統合チェックリスト

| 確認項目 | 期待される結果 |
|---|---|
| URL が HTTPS を使用している | はい |
| メソッド | `POST` |
| 本文 | 4つの空でない文字列を含む JSON |
| ヘッダー | `Content-Type: application/json` |
| 承認条件 | `valid` が boolean の `true` のみ |
| 日付 | ISO 8601 UTC、オプショナル |
| エラー処理 | force unwrap やクラッシュなしで処理 |
| タイムアウト | クライアントで設定されている |
| 管理者の秘密情報 | クライアントに送信しない |

## セキュリティに関する注意

この API は検証用の公開エンドポイントです。実際の保護はサーバー側で行うべきです：クライアントは管理者の資格情報を保存してはいけませんし、ローカルで受け取った JSON の改ざんを信頼してはいけません。レスポンスは正当なアプリケーションの認可確認にのみ使用してください。
