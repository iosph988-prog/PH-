

## Cliente Android autorizado

O backend agora aceita, além da IPA iOS autorizada, somente esta combinação Android:

```text
Package/Application ID: com.my.rtxxiters
Versão:                 1.0
```

As variáveis configuráveis no Railway são:

```env
PH_ALLOWED_ANDROID_PACKAGE=com.my.rtxxiters
PH_ALLOWED_ANDROID_VERSION=1.0
```

O APK deve enviar o mesmo corpo JSON usado pela IPA:

```json
{
  "key": "EXTERNAL-CHAVEGERADA",
  "device_id": "identificador-do-dispositivo-android",
  "package": "com.my.rtxxiters",
  "app_version": "1.0"
}
```

As rotas aceitas são `/api/license/validate`, `/api/patches/catalog` e `/api/patches/external/catalog`. Qualquer outro package ou versão recebe `403` com `code: "unsupported_client"`.

Se o APK continuar mostrando “Cliente não autorizado” depois do deploy, confirme no Railway se as variáveis acima não foram sobrescritas por valores diferentes e reinicie o serviço para carregar a configuração.
