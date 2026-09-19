# Atualização online dos patches

A IPA compilada com o workflow `ios-kyojinx.yml` consulta o catálogo remoto depois da validação da licença. O catálogo retorna somente versões publicadas e vinculadas à licença, ao dispositivo e ao bundle autorizado.

## Publicação pelo painel

Na tela **Patches online**, selecione o identificador do patch, informe o título e escolha o arquivo `.3105`. Publique uma nova versão. O sistema calcula o SHA-256, grava o arquivo no armazenamento persistente, cria uma nova versão imutável e deixa essa versão disponível no catálogo da IPA.

Para substituir um patch, publique outra versão com o mesmo identificador. A IPA continuará usando o arquivo local em cache até que o cache seja invalidado pela versão do catálogo; em uma instalação nova, ela baixa a versão publicada. O arquivo embutido na IPA permanece como fallback quando não houver rede ou quando a versão remota falhar na validação.

## Segurança e compatibilidade

O endpoint exige uma key válida, o dispositivo vinculado e o bundle esperado. O download utiliza URL temporária assinada. A IPA valida o tamanho e o SHA-256 antes de gravar o arquivo no diretório de suporte do aplicativo. Arquivos inválidos não substituem o cache nem o arquivo embutido.

A alteração do arquivo online não exige uma nova IPA depois que o mecanismo remoto estiver presente. Uma nova IPA ainda é necessária para alterar o código do mecanismo, os nomes dos patches suportados ou a estrutura incompatível dos arquivos.

A aplicação e a desativação permanecem protegidas pelo `PatchTransactionReceipt`: a IPA guarda o receipt retornado na aplicação e o utiliza para restaurar exatamente os arquivos originais ao desligar o toggle.
