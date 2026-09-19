# Documentação de integração da API de licença — Hock FF

## Visão geral

A API valida uma licença associada a um dispositivo e retorna um objeto JSON estável. O cliente deve liberar o fluxo somente quando o campo `valid` for exatamente o booleano `true`. Qualquer outro valor deve ser tratado como acesso negado ou erro temporário.

> **Endpoint público atual:** `https://apikeydash-rhz9ayn4.manus.space/api/license/validate`

A chamada não exige token administrativo. As credenciais administrativas nunca devem ser incluídas no aplicativo cliente.

## Requisição

Use `POST` com `Content-Type: application/json`.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---:|---|
| `key` | string | Sim | Chave de licença digitada pelo usuário. |
| `device_id` | string | Sim | Identificador estável do dispositivo gerado pelo aplicativo. |
| `package` | string | Sim | Identificador do aplicativo que está solicitando a validação. |
| `app_version` | string | Sim | Versão do aplicativo cliente. |

Exemplo de corpo:

```json
{
  "key": "NX-ABC123456789XYZ",
  "device_id": "device-8f4c2d1a",
  "package": "com.hockff.app",
  "app_version": "1.0.0"
}
```

Não envie `null`, objetos, números ou strings vazias nesses campos. O cliente deve validar a entrada antes da chamada e também tratar respostas inesperadas sem fazer force unwrap.

## Respostas

### Licença válida — HTTP 200

Na primeira validação válida, o prazo começa a contar. A resposta pode conter os dados de ativação e expiração:

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

`expiresAt` e `activatedAt` são timestamps ISO 8601 em UTC. O cliente deve decodificá-los como datas opcionais. `durationMinutes` é a duração precisa da licença; para uma licença de um dia, o valor é `1440`, e para uma licença de uma hora, `60`.

### Key inválida — HTTP 200

```json
{
  "valid": false,
  "code": "invalid_key",
  "message": "Chave inválida",
  "supportUrl": "https://whatsapp.com/channel/0029VbD6Arm8kyyQAho7UP2t"
}
```

### Key bloqueada ou pausada — HTTP 200

```json
{
  "valid": false,
  "code": "revoked",
  "message": "Chave revogada",
  "supportUrl": "https://whatsapp.com/channel/0029VbD6Arm8kyyQAho7UP2t"
}
```

### Key expirada — HTTP 200

```json
{
  "valid": false,
  "code": "expired",
  "message": "Chave expirada",
  "supportUrl": "https://whatsapp.com/channel/0029VbD6Arm8kyyQAho7UP2t"
}
```

### Limite de dispositivos — HTTP 200

```json
{
  "valid": false,
  "code": "device_limit",
  "message": "Limite de dispositivos atingido",
  "supportUrl": "https://whatsapp.com/channel/0029VbD6Arm8kyyQAho7UP2t"
}
```

### Requisição incompleta — HTTP 400

```json
{
  "valid": false,
  "code": "invalid_request",
  "message": "Campos obrigatórios: key, device_id, package e app_version"
}
```

### Indisponibilidade temporária — HTTP 503

```json
{
  "valid": false,
  "code": "service_unavailable",
  "message": "Serviço temporariamente indisponível",
  "supportUrl": "https://whatsapp.com/channel/0029VbD6Arm8kyyQAho7UP2t"
}
```

Códigos HTTP diferentes de `200` não devem ser interpretados como licença válida. Em `503`, o aplicativo pode oferecer uma nova tentativa; não deve liberar o acesso localmente.

## Exemplo Swift com `URLSession`

O exemplo abaixo evita force unwrap, trata status HTTP, aceita campos opcionais e só considera a licença aprovada quando `valid == true`.

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

    guard let url = URL(string: "https://apikeydash-rhz9ayn4.manus.space/api/license/validate") else {
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
                    // O cliente pode exibir um botão de suporte usando result.supportUrl;
                    // não abra links automaticamente sem uma ação explícita do usuário.
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

## Regras para evitar crash

O cliente deve manter `valid`, `code`, `message`, `expiresAt`, `activatedAt`, `durationDays`, `durationMinutes` e `deviceLimit` como campos opcionais. Isso evita falha quando uma resposta de erro não contém os campos de uma resposta válida.

O cliente não deve converter datas com `!`, acessar posições de arrays sem verificar o tamanho, presumir que todo status HTTP é `200`, ou liberar o fluxo com base apenas em `message`. A única condição de aprovação é `response.valid == true` após a decodificação bem-sucedida e a confirmação de HTTP 200.

Para o contador local, use `expiresAt` quando estiver presente. Uma licença ainda não ativada não deve inventar uma data de expiração; nesse caso, exiba “Aguardando ativação”. Em respostas inválidas, `supportUrl` contém o canal oficial de suporte; o cliente pode oferecer um botão para abrir esse endereço após ação explícita do usuário.

## Teste manual com cURL

```bash
curl -i -X POST \
  'https://apikeydash-rhz9ayn4.manus.space/api/license/validate' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  --data '{
    "key": "NX-ABC123456789XYZ",
    "device_id": "device-test-001",
    "package": "com.hockff.app",
    "app_version": "1.0.0"
  }'
```

Use uma key real do painel para testar o caso aprovado. Para testar erros, use uma key inexistente, campos vazios e um dispositivo que já tenha atingido o limite. Não registre keys completas em logs de produção.

## Checklist de integração

| Verificação | Resultado esperado |
|---|---|
| URL usa HTTPS | Sim |
| Método | `POST` |
| Corpo | JSON com quatro strings não vazias |
| Header | `Content-Type: application/json` |
| Aprovação | Somente `valid` booleano igual a `true` |
| Datas | ISO 8601 UTC e opcionais |
| Erros | Tratados sem force unwrap ou crash |
| Timeout | Definido no cliente |
| Segredos administrativos | Nunca enviados ao cliente |

## Observação de segurança

Esta API é um endpoint público de validação. A proteção real deve permanecer no servidor: o cliente não deve armazenar credenciais administrativas nem confiar em uma alteração local do JSON. A resposta deve ser usada apenas como autorização de uma aplicação própria e legítima.
