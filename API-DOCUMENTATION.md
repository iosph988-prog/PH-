# PH- API e sistema de patches

## Visão geral

O projeto reúne a API Railway, o painel administrativo web, o sistema de autenticação local, o gerador de keys e o workflow que compila a interface iOS. A API pública valida licenças e entrega dois catálogos de patches: o catálogo do **PROXY** e o catálogo do **External**, usado pelo Online separado.

A URL pública atual da API é:

```text
https://api-production-182c.up.railway.app
```

O código-fonte está no repositório [PH-](https://github.com/iosph988-prog/PH-). O backend fica no diretório `ph/`.

## Autenticação administrativa e de subrevendedores

O login local usa sessão HTTP protegida por cookie. O administrador entra com o e-mail configurado em `ADMIN_EMAIL` e com `ADMIN_PASSWORD` ou `ADMIN_PASSWORD_HASH`. O administrador pode criar subrevendedores pelo painel.

Um subrevendedor pode usar qualquer e-mail válido, inclusive Gmail, ou um identificador de usuário válido. A senha precisa ter pelo menos seis caracteres. A conta recebe um limite de créditos e uma data de expiração. Cada key criada consome créditos conforme a quantidade solicitada. Quando a conta expira, o login e as operações de geração ficam bloqueados.

O subrevendedor possui somente as operações de gerar, apagar e resetar suas próprias keys. Ele não possui acesso ao gerenciamento de patches, à revogação administrativa global ou à criação de outras contas.

### Login local

`POST /api/auth/local/login`

Corpo JSON:

```json
{
  "email": "akiraalik@gmail.com",
  "password": "senha-definida-pelo-administrador"
}
```

O campo `username` também é aceito como alternativa ao campo `email`. Em caso de sucesso, a API grava uma sessão e retorna:

```json
{ "ok": true }
```

`POST /api/auth/local/logout` encerra a sessão atual.

## Validação de licença

`POST /api/license/validate`

Corpo obrigatório:

```json
{
  "key": "CHAVE-GERADA",
  "device_id": "identificador-do-dispositivo",
  "package": "com.exemplo.app",
  "app_version": "1.0.0"
}
```

A resposta informa se a key é válida, o estado da licença, a validade e os limites de dispositivos. A primeira ativação inicia a validade configurada para a key. Requisições incompletas retornam `400`; uma licença recusada retorna `valid: false`.

## Catálogo do PROXY

`POST /api/patches/catalog`

O corpo usa os mesmos quatro campos da validação de licença: `key`, `device_id`, `package` e `app_version`. A API valida a licença antes de devolver os patches publicados na seção padrão.

Cada item publicado inclui, entre outros campos, `slug`, `title`, `game`, `section`, `interfaceTab`, `versionId`, `version`, `fileName`, `sha256`, `sizeBytes`, `status`, `publishedAt` e `downloadUrl`.

## Catálogo do External

`POST /api/patches/external/catalog`

O corpo é igual ao do catálogo do PROXY. A diferença é que a API consulta exclusivamente a seção `external`, usada pelo Online separado. As categorias publicadas são convertidas para os identificadores usados pela IPA:

| Aba administrativa | Identificador entregue à IPA |
|---|---|
| MIRA | `aim` |
| ESP | `esp` |
| GERAL | `general` |
| RAIO-X | `xray` |
| OUTROS | `other` |

Para o jogo, a API usa o formato `online-free-fire:categoria` ou `online-free-fire-max:categoria`. O campo `interfaceTab` da publicação define a categoria entregue ao aplicativo.

## Download autorizado de patch

`GET /api/patches/download?t=TOKEN`

O `downloadUrl` recebido no catálogo contém um token temporário assinado. O token vincula a versão do patch à licença, ao dispositivo e ao pacote da aplicação. A API só redireciona para o arquivo quando o token é válido, a licença continua ativa e a versão ainda está publicada.

Os arquivos publicados precisam terminar em `.3105`, não podem conter caminhos de diretório e têm limite de 50 MB. O sistema calcula e retorna o SHA-256 do arquivo para permitir conferência de integridade.

## Publicação e gerenciamento de patches

O painel web usa a API tRPC em `/api/trpc`. As operações administrativas incluem publicação, listagem, edição e alteração do estado publicado ou desativado. O Online separado exige uma categoria `interfaceTab` válida.

Na publicação, o administrador informa o slug, o título, o jogo, a seção, a categoria e o arquivo `.3105`. Uma publicação cria uma versão armazenada no storage configurado e atualiza a versão atual do patch. Desativar uma publicação altera seu estado para rascunho; ativar novamente publica a versão corrente.

## Variáveis de ambiente

A implantação precisa fornecer a conexão MySQL usada pelo Drizzle e o storage configurado para os arquivos. Também deve definir uma chave estável para assinar sessões e tokens de download.

| Variável | Uso |
|---|---|
| `DATABASE_URL` ou configuração equivalente do MySQL | Conexão com o banco de dados |
| `ADMIN_EMAIL` | E-mail do administrador local |
| `ADMIN_PASSWORD` ou `ADMIN_PASSWORD_HASH` | Senha local do administrador |
| `SESSION_SECRET` ou `JWT_SECRET` | Assinatura das sessões e tokens |
| Variáveis do storage | Upload e URLs assinadas dos arquivos `.3105` |

Nunca publique senhas, hashes, chaves de sessão ou credenciais de storage no repositório.

## Estrutura do projeto

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

## Compilação e implantação

Para validar o projeto da API dentro de `ph/`, use:

```bash
pnpm install --frozen-lockfile
pnpm run build
```

O Railway está conectado ao repositório `iosph988-prog/PH-` e usa `ph` como diretório raiz. Um push na branch `main` dispara a implantação configurada.

O workflow iOS é [ios-kyojinx.yml](https://github.com/iosph988-prog/PH-/blob/main/.github/workflows/ios-kyojinx.yml). Ele injeta as correções da interface e compila o artefato IPA por meio do GitHub Actions.

## Diagnóstico rápido

Se o painel mostrar “E-mail indisponível”, atualize a interface para a versão que usa `username` como fallback. Contas novas com Gmail passam a gravar o endereço nos campos `email` e `username`.

Se o catálogo retornar `401` ou `403`, confirme a key, o identificador do dispositivo, o pacote e a versão do aplicativo. Se retornar `503`, verifique o banco, o storage e as variáveis de ambiente da implantação Railway.

Se um patch não aparecer no External, confirme que a publicação está ativa, que a seção é `external` e que `interfaceTab` foi definida. Se o arquivo não baixar, confira se a versão está publicada e se o token ainda não expirou.

## Referências

[1]: https://github.com/iosph988-prog/PH- "Repositório do projeto PH-"

[2]: https://github.com/iosph988-prog/PH-/blob/main/.github/workflows/ios-kyojinx.yml "Workflow de compilação da IPA"

[3]: https://api-production-182c.up.railway.app "API pública implantada"

[4]: https://github.com/iosph988-prog/PH-/blob/main/ph/server/_core/index.ts "Rotas HTTP da API"

[5]: https://github.com/iosph988-prog/PH-/blob/main/ph/server/remotePatches.ts "Catálogo e download de patches"


## Atualização de segurança — build autorizado 2026.09.28

A versão de cliente atualmente autorizada pelo backend é:

```text
Bundle ID: com.apple.mobile.MobileHouseArrest
Versão:   2026.09.28
```

As rotas móveis `/api/license/validate`, `/api/patches/catalog` e `/api/patches/external/catalog` recusam clientes que não correspondam simultaneamente ao Bundle ID e à versão configurados por `PH_ALLOWED_IOS_BUNDLE_ID` e `PH_ALLOWED_IOS_VERSION`.

O header reservado para o cliente iOS é:

```http
X-PH-IOS-Token: <token-do-cliente>
```

Na revisão atual do código, o header é mantido no protocolo para compatibilidade, mas a função `hasValidIosToken()` não compara o valor recebido. Portanto, o header não deve ser tratado como fator de autenticação isolado. A autorização efetiva continua sendo feita pela licença, dispositivo, Bundle ID e versão. Para exigir o token também no servidor, configure `PH_IOS_API_TOKEN` no Railway e implemente a comparação do header usando comparação em tempo constante; não coloque o segredo em documentação pública.

O catálogo do External aceita as categorias administrativas `MIRA`, `ESP`, `GERAL`, `RAIO-X`, `OUTROS`, `FUNÇÕES`, `EXTRAS/FERRAMENTAS` e `PERFIL`, convertendo-as para identificadores de cliente. Publicações External sem `interfaceTab` são rejeitadas.

O workflow iOS atualizado também bloqueia a entrega de uma IPA que contenha um arquivo `.dylib` independente ou uma pasta singular `Framework/` no bundle. A pasta padrão `Frameworks/` continua reservada a dependências legítimas reconhecidas pelo aplicativo.

### Códigos de resposta do cliente móvel

| HTTP | Código | Ação recomendada |
|---:|---|---|
| 200 | `valid` | Continuar e usar o catálogo retornado. |
| 400 | `invalid_request` | Corrigir campos obrigatórios. |
| 403 | `unsupported_client` | Atualizar para o build autorizado. |
| 403 | `invalid_key`, `revoked`, `expired`, `device_limit` | Exibir acesso negado e não tentar baixar. |
| 403 | `download_forbidden` | Solicitar um novo catálogo/token. |
| 503 | `service_unavailable` | Tratar como indisponibilidade temporária. |

### Exemplo mínimo de integração

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
    app_version: "2026.09.28"
))
```

Nunca confie apenas na IPA para autorização: o backend deve continuar sendo a autoridade final para licenças, catálogo, status de publicação e downloads.
