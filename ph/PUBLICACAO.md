# Publicação e URL HTTPS

O projeto está pronto para publicação no hosting gerenciado do Manus. No painel de gerenciamento do projeto, abra o checkpoint mais recente e clique em **Publish**. O sistema fornecerá uma URL HTTPS compartilhável; não é necessário configurar um servidor VPS para o painel.

Depois da publicação, copie a URL HTTPS e use:

```text
https://SEU-DOMINIO.manus.space/api/license/validate
```

Para usar um domínio próprio, abra **Settings → Domains**, associe o domínio e mantenha o certificado TLS gerenciado pelo hosting. Não aponte o aplicativo iOS para um endereço HTTP ou para um IP sem certificado.

O painel exige login Manus e as operações de criação, revogação, reativação, listagem e detalhes usam autorização administrativa no servidor. O endpoint `/api/license/validate` é público por design, mas aceita somente os campos de validação e não expõe chaves, hashes ou rotas administrativas.

## Primeiro teste após publicar

1. Entre na URL publicada com a conta administrativa.
2. Gere uma chave com o limite de dispositivos desejado e copie-a imediatamente; o segredo bruto não será mostrado novamente.
3. No app iOS, configure a URL completa do endpoint publicado.
4. Teste a chave sem alterações e confirme uma resposta JSON com `valid: true` (booleano).
5. Altere um caractere da chave ou revogue-a no painel e confirme `valid: false`.

A URL de desenvolvimento/preview pode ser usada para revisão antes da publicação, mas não deve ser usada como endereço permanente do aplicativo.
