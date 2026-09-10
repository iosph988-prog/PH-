# Integração do aplicativo iOS

Depois de publicar este painel, use a URL HTTPS atribuída pelo Railway como base. O endpoint público de validação é:

```text
https://api-production-182c.up.railway.app/api/license/validate
```

O app deve enviar uma requisição `POST` com `Content-Type: application/json` e este corpo:

```json
{
  "key": "NX-SUA-CHAVE",
  "device_id": "id-estavel-do-dispositivo",
  "package": "com.suaempresa.seuapp",
  "app_version": "1.0.0"
}
```

A liberação deve ocorrer exclusivamente quando a resposta tiver o booleano JSON exato `valid: true`. Uma string como `"true"`, um campo ausente ou qualquer erro deve ser tratado como não autorizado.

Resposta de sucesso:

```json
{
  "valid": true,
  "code": "valid",
  "message": "Chave válida",
  "expiresAt": null,
  "deviceLimit": 1
}
```

Resposta de chave inválida:

```json
{
  "valid": false,
  "code": "invalid_key",
  "message": "Chave inválida"
}
```

Para testar, gere uma chave no painel autenticado, use-a uma vez com um `device_id` de teste e confira `valid: true`. Em seguida, altere um caractere da chave ou revogue-a no painel e repita a chamada; o aplicativo deve permanecer bloqueado com `valid: false`.

No SwiftUI, a condição deve ser equivalente a:

```swift
let allowed = response.valid == true
if allowed {
    showMainApp = true
} else {
    showMainApp = false
}
```

Não coloque o segredo administrativo, hash da chave ou credenciais do banco no app. O app conhece apenas o endpoint público e a chave de licença digitada pelo usuário.
