# Documentação de integração — License Atelier API

**Versão:** 1.0  
**Base URL:** `https://keypanel-mefhz8pp.manus.space`  
**Formato:** JSON em UTF-8  
**Autenticação administrativa:** não é necessária nos endpoints públicos descritos neste documento.

> Esta documentação cobre a integração pública de validação de licença e consulta de catálogo para um aplicativo controlado por você. O cliente deve apenas validar o acesso e exibir configurações/metadados permitidos; não deve conter chaves administrativas, segredos do servidor, exploração, injeção ou modificação de aplicativos de terceiros.

## 1. Endpoints públicos

| Finalidade | Método | URL |
|---|---:|---|
| Validar licença | `POST` | `https://keypanel-mefhz8pp.manus.space/api/license/validate` |
| Consultar catálogo autorizado | `POST` | `https://keypanel-mefhz8pp.manus.space/api/patches/catalog` |
| Base da API | — | `https://keypanel-mefhz8pp.manus.space` |

As rotas de validação e catálogo não são páginas HTML. Elas devem ser chamadas com `POST`, cabeçalho `Content-Type: application/json` e corpo JSON. A API aceita os campos com os nomes `key`, `device_id`, `package` e `app_version` [1] [2].

## 2. Bundle IDs suportados

O projeto mantém os dois jogos separados no catálogo. Use o Bundle ID correspondente ao aplicativo que você controla:

| Aplicativo | Bundle ID (`package`) |
|---|---|
| Free Fire | `com.dts.freefireth` |
| Free Fire MAX | `com.dts.freefiremax` |

O catálogo retorna somente itens habilitados e compatíveis com o `package` informado. Não use o Bundle ID de um aplicativo diferente do alvo legítimo da sua integração [3].

## 3. Validação de licença

### Requisição

```http
POST /api/license/validate HTTP/1.1
Host: keypanel-mefhz8pp.manus.space
Content-Type: application/json
Accept: application/json

{
  "key": "NX-SUA-CHAVE",
  "device_id": "device-unique-id",
  "package": "com.seu.app",
  "app_version": "1.0.0"
}
```

Os quatro campos são obrigatórios e devem ser strings não vazias. Os limites atuais são 200 caracteres para `key`, 255 para `device_id`, 255 para `package` e 64 para `app_version` [1]. O servidor remove espaços nas extremidades antes da validação.

### Exemplo com cURL

```bash
curl -sS -X POST \
  'https://keypanel-mefhz8pp.manus.space/api/license/validate' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  --data '{
    "key": "NX-SUA-CHAVE",
    "device_id": "device-unique-id",
    "package": "com.seu.app",
    "app_version": "1.0.0"
  }'
```

### Resposta de licença válida

```json
{
  "valid": true,
  "code": "valid",
  "message": "Chave válida",
  "expiresAt": "2026-10-01T12:00:00.000Z",
  "activatedAt": "2026-09-01T12:00:00.000Z",
  "durationDays": 30,
  "durationMinutes": 43200,
  "deviceLimit": 1
}
```

Na primeira validação de um dispositivo, a licença pode ser ativada e o dispositivo vinculado. Em chamadas posteriores com o mesmo `device_id`, a API atualiza a versão do aplicativo e o último acesso. O aplicativo deve considerar a licença concedida **somente quando `valid` for exatamente o booleano `true`**, nunca quando for a string `"true"` [4].

### Respostas de licença inválida

| HTTP | `code` | Significado |
|---:|---|---|
| `400` | `invalid_request` | Campo obrigatório ausente, vazio ou acima do limite permitido. |
| `200` | `invalid_key` | A chave não existe. |
| `200` | `revoked` | A licença foi revogada. |
| `200` | `expired` | A licença expirou. |
| `200` | `device_limit` | O limite de dispositivos foi atingido. |
| `503` | `service_unavailable` | O serviço ou banco de dados está temporariamente indisponível. |

Exemplo de erro:

```json
{
  "valid": false,
  "code": "invalid_key",
  "message": "Chave inválida",
  "supportUrl": "https://whatsapp.com/channel/0029VbD6Arm8kyyQAho7UP2t"
}
```

A regra de decisão recomendada é: `valid == true` permite o fluxo normal; qualquer outro valor bloqueia o recurso protegido e mostra uma mensagem apropriada ao usuário. Para `503`, use retentativa com espera progressiva e cache local da última configuração válida, sem transformar uma falha de rede em licença permanentemente válida.

## 4. Consulta do catálogo remoto

O catálogo usa o mesmo corpo básico da validação, pois a API valida a licença antes de devolver os itens autorizados.

```bash
curl -sS -X POST \
  'https://keypanel-mefhz8pp.manus.space/api/patches/catalog' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  --data '{
    "key": "NX-SUA-CHAVE",
    "device_id": "device-unique-id",
    "package": "com.dts.freefireth",
    "app_version": "1.0.0"
  }'
```

Quando a licença é válida, a resposta mantém os metadados da validação e acrescenta `patches`:

```json
{
  "valid": true,
  "code": "valid",
  "message": "Chave válida",
  "expiresAt": "2026-10-01T12:00:00.000Z",
  "activatedAt": "2026-09-01T12:00:00.000Z",
  "durationDays": 30,
  "durationMinutes": 43200,
  "deviceLimit": 1,
  "patches": [
    {
      "id": 12,
      "slug": "efeito-exemplo",
      "title": "Efeito exemplo",
      "game": "free-fire",
      "enabled": true,
      "injectionMode": "raw",
      "bundleId": "com.dts.freefireth",
      "injectionPath": null,
      "originalSearchName": "Efeito exemplo",
      "versionId": 34,
      "version": 2,
      "fileName": "EFEITO.3105",
      "sha256": "...",
      "sizeBytes": 123456,
      "publishedAt": "2026-09-01T12:00:00.000Z",
      "downloadUrl": "https://keypanel-mefhz8pp.manus.space/api/patches/download?v=34&t=..."
    }
  ]
}
```

A lista é filtrada pelo `package`: itens desativados não são retornados, e um item com `bundleId` diferente do pacote solicitado é excluído [3]. Um catálogo vazio com `valid: true` é uma resposta válida e significa que não há itens publicados para aquele jogo naquele momento.

> Para uma integração segura de aparência/configuração, use `title`, `slug`, `game`, `enabled`, `version`, `sha256`, `sizeBytes` e `publishedAt` para exibição e controle de versão. Não trate `injectionPath` ou `injectionMode` como instruções para modificar outro aplicativo.

## 5. Exemplo Swift usando URLSession

```swift
import Foundation

struct LicenseRequest: Encodable {
    let key: String
    let device_id: String
    let package: String
    let app_version: String
}

struct LicenseResponse: Decodable {
    let valid: Bool
    let code: String
    let message: String
    let expiresAt: String?
    let activatedAt: String?
    let durationDays: Int?
    let durationMinutes: Int?
    let deviceLimit: Int?
    let supportUrl: String?
}

struct CatalogResponse: Decodable {
    let valid: Bool
    let code: String
    let message: String
    let expiresAt: String?
    let activatedAt: String?
    let patches: [CatalogItem]?
}

struct CatalogItem: Decodable, Identifiable {
    let id: Int
    let slug: String
    let title: String
    let game: String
    let enabled: Bool
    let injectionMode: String?
    let bundleId: String?
    let injectionPath: String?
    let originalSearchName: String?
    let versionId: Int
    let version: Int
    let fileName: String
    let sha256: String
    let sizeBytes: Int
    let publishedAt: String?
    let downloadUrl: String?
}

enum LicenseAPIError: Error {
    case invalidHTTPStatus(Int)
    case denied(String)
}

final class LicenseAPI {
    private let baseURL = URL(string: "https://keypanel-mefhz8pp.manus.space")!

    func validate(_ request: LicenseRequest) async throws -> LicenseResponse {
        let response: LicenseResponse = try await post("/api/license/validate", body: request)
        guard response.valid == true else {
            throw LicenseAPIError.denied(response.message)
        }
        return response
    }

    func catalog(_ request: LicenseRequest) async throws -> CatalogResponse {
        let response: CatalogResponse = try await post("/api/patches/catalog", body: request)
        guard response.valid == true else {
            throw LicenseAPIError.denied(response.message)
        }
        return response
    }

    private func post<RequestBody: Encodable, ResponseBody: Decodable>(
        _ path: String,
        body: RequestBody
    ) async throws -> ResponseBody {
        var urlRequest = URLRequest(url: baseURL.appendingPathComponent(path))
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Accept")
        urlRequest.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        guard let http = response as? HTTPURLResponse else {
            throw LicenseAPIError.invalidHTTPStatus(-1)
        }
        guard (200...299).contains(http.statusCode) || http.statusCode == 503 else {
            throw LicenseAPIError.invalidHTTPStatus(http.statusCode)
        }
        return try JSONDecoder().decode(ResponseBody.self, from: data)
    }
}
```

Para Free Fire MAX, altere somente o campo `package` para `com.dts.freefiremax`. O identificador `device_id` deve ser estável para o seu aplicativo e não deve conter senha, token administrativo ou dados pessoais desnecessários.

## 6. Exemplo JavaScript/TypeScript

```ts
type LicenseRequest = {
  key: string;
  device_id: string;
  package: string;
  app_version: string;
};

const API_BASE = "https://keypanel-mefhz8pp.manus.space";

export async function validateLicense(input: LicenseRequest) {
  const response = await fetch(`${API_BASE}/api/license/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  });

  const payload = await response.json();
  if (payload.valid !== true) {
    throw new Error(payload.message ?? payload.code ?? "Licença recusada");
  }
  return payload;
}

export async function loadCatalog(input: LicenseRequest) {
  const response = await fetch(`${API_BASE}/api/patches/catalog`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  });

  const payload = await response.json();
  if (payload.valid !== true) {
    throw new Error(payload.message ?? payload.code ?? "Catálogo recusado");
  }
  return payload.patches ?? [];
}
```

## 7. Cache, expiração e indisponibilidade

O cliente pode guardar localmente apenas a última configuração/metadados recebidos junto com `expiresAt` e `version`. Antes de liberar um recurso protegido, verifique se a licença ainda está dentro do prazo e considere uma política curta de tolerância offline definida pelo proprietário do aplicativo. Não armazene uma chave em texto puro em logs, analytics ou URLs.

Quando a API retornar `503`, não trate a resposta como aprovação. Mostre estado temporário de indisponibilidade, tente novamente com backoff e mantenha a UI em modo seguro. Quando retornar `expired`, `revoked`, `invalid_key` ou `device_limit`, remova o acesso ao recurso protegido e solicite a ação adequada ao usuário.

## 8. Segurança

A chave de licença é um segredo do usuário final e deve ser transmitida apenas por HTTPS. O cliente nunca deve receber `JWT_SECRET`, credenciais do banco, tokens de storage ou rotas administrativas. As operações de criação, edição, ativação/desativação e publicação pertencem ao painel autenticado e não devem ser copiadas para o aplicativo cliente.

Não confie somente na resposta do cliente para proteger um serviço de backend. Se o recurso for valioso, faça a autorização novamente no servidor que o entrega. Valide certificados normalmente, não desative ATS/TLS e não grave o corpo completo das respostas em logs de produção.

## 9. Teste mínimo

Use primeiro uma chave inválida para confirmar o tratamento de erro:

```bash
curl -i -X POST \
  'https://keypanel-mefhz8pp.manus.space/api/license/validate' \
  -H 'Content-Type: application/json' \
  --data '{"key":"NX-INVALIDA","device_id":"test-device","package":"com.seu.app","app_version":"1.0.0"}'
```

O resultado esperado é HTTP `200` com `valid: false` e `code: "invalid_key"`. Um corpo incompleto, como `{}`, deve resultar em HTTP `400` com `code: "invalid_request"`. Não use chaves fictícias persistidas no banco para testar produção.

## Referências

[1]: `/home/ubuntu/api-key-panel/server/license-route.ts` — parser e rota pública de validação de licença.

[2]: `/home/ubuntu/api-key-panel/server/patch-route.ts` — parser e rota pública de catálogo.

[3]: `/home/ubuntu/api-key-panel/server/remotePatches.ts` — filtragem por Bundle ID, metadados e URLs autorizadas.

[4]: `/home/ubuntu/api-key-panel/server/licenses.ts` — regras de validação, ativação, expiração e limite de dispositivos.
