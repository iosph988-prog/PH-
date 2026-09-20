# Guia rápido de integração da API PH-

## URL base

```text
https://api-production-182c.up.railway.app
```

## Importante sobre a chave

Esta API não usa uma `X-API-Key` fixa no cabeçalho. O aplicativo usa uma **chave de licença** gerada no painel administrativo e envia essa chave no campo `key` do corpo JSON.

A mesma chave pode ser usada para validar a licença e obter o catálogo de patches. O `device_id`, o pacote e a versão do aplicativo também precisam ser enviados.

## Validar uma licença

Endpoint:

```text
POST /api/license/validate
```

Exemplo com cURL:

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

Exemplo de resposta válida:

```json
{
  "valid": true,
  "code": "valid",
  "message": "Licença válida"
}
```

Se a licença for inválida, expirada, revogada ou exceder o limite de dispositivos, a resposta terá `valid: false`.

## Obter patches do PROXY

Endpoint:

```text
POST /api/patches/catalog
```

Exemplo:

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

A resposta contém um array `patches`. Cada item pode conter `slug`, `title`, `game`, `section`, `interfaceTab`, `fileName`, `sha256`, `sizeBytes` e `downloadUrl`.

## Obter patches do External / Online separado

Endpoint:

```text
POST /api/patches/external/catalog
```

O corpo é o mesmo:

```json
{
  "key": "COLE_A_CHAVE_GERADA_AQUI",
  "device_id": "ID_UNICO_DO_DISPOSITIVO",
  "package": "com.exemplo.meuapp",
  "app_version": "1.0.0"
}
```

Esse endpoint retorna somente as publicações da seção `external`.

## Baixar um patch

Não monte o download manualmente. Use o `downloadUrl` retornado pelo catálogo:

```bash
curl -L "URL_DO_CAMPO_downloadUrl" -o patch.3105
```

O endereço é temporário e assinado. Ele fica vinculado à licença, ao dispositivo, ao pacote e à versão do aplicativo. Se o token expirar, consulte o catálogo novamente.

## Exemplo em JavaScript

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

## Campos obrigatórios

| Campo | Descrição |
|---|---|
| `key` | Chave de licença criada no painel |
| `device_id` | Identificador estável do dispositivo |
| `package` | Bundle ID ou package name do aplicativo |
| `app_version` | Versão atual do aplicativo |

## Códigos comuns

| HTTP | Código | Significado |
|---:|---|---|
| 200 | `valid` | Licença válida e resposta disponível |
| 400 | `invalid_request` | Campo obrigatório ausente ou vazio |
| 403 | resposta com `valid: false` | Licença recusada ou download não autorizado |
| 503 | `service_unavailable` | Falha temporária no banco ou no serviço |

## Onde gerar a chave

Entre no painel administrativo, abra **Gerar key**, defina a quantidade e o prazo e copie a chave exibida. Essa é a chave que deve ser colocada no campo `key` do outro projeto.

Não coloque a senha do administrador, o cookie de sessão ou o segredo do servidor no aplicativo. O aplicativo deve receber apenas a chave de licença destinada ao usuário.

## Documentação completa

[Documentação completa da API](https://github.com/iosph988-prog/PH-/blob/main/API-DOCUMENTATION.md)

## Referências

[1]: https://github.com/iosph988-prog/PH- "Repositório do projeto PH-"

[2]: https://api-production-182c.up.railway.app "API pública implantada"
