# Project TODO

- [x] Definir modelo de dados para chaves, dispositivos vinculados e histórico de eventos
- [x] Criar migração do banco e aplicar as tabelas via fluxo de schema
- [x] Implementar geração segura de chaves sem armazenar o segredo em texto puro
- [x] Implementar autenticação administrativa e restringir operações de gestão ao administrador
- [x] Implementar painel para gerar, listar, pesquisar, copiar, revogar e reativar chaves
- [x] Exibir validade, status, limite de dispositivos, dispositivos vinculados e histórico
- [x] Implementar endpoint HTTPS público POST /api/license/validate
- [x] Validar key, device_id, package e app_version no endpoint
- [x] Garantir que o app só seja liberado com resposta exatamente valid: true
- [x] Registrar tentativas de validação e vínculos de dispositivos
- [x] Aplicar estilo elegante e refinado com layout responsivo
- [x] Escrever testes Vitest para regras de geração, revogação, reativação e validação
- [x] Testar painel, endpoint, erros, autenticação e responsividade
- [x] Criar instruções para apontar o app iOS ao endpoint e testar chaves válida e inválida
- [x] Criar checkpoint final antes da entrega
- [x] Criar e entregar instruções de publicação, documentação e arquivos relevantes; publicação permanente depende do botão Publish

## Histórico

- [x] Requisito inicial: painel seguro para administrar chaves de acesso do aplicativo iOS
- [x] Requisito inicial: endpoint público HTTPS com liberação somente quando valid: true
- [x] Requisito inicial: operações administrativas protegidas por autenticação
- [x] Requisito inicial: estilo elegante e refinado
- [x] Definir URL HTTPS compartilhável e instruções de integração iOS; URL permanente é criada pelo Publish

## Decisões de segurança

- [x] Nunca exibir ou persistir chaves em texto puro no banco após a criação
- [x] Comparar chaves por hash no servidor
- [x] Aplicar limite de dispositivos por chave com vínculo atômico
- [x] Não expor rotas administrativas como endpoints públicos
- [x] Retornar JSON consistente para respostas válidas e inválidas
- [x] Não incluir segredos em código-fonte, logs ou respostas públicas; a chave bruta só é retornada uma vez à mutation autenticada por admin e nunca ao endpoint público

## Revisão de qualidade — pendências adicionadas

- [x] Adicionar gate frontend explícito para permitir o painel somente a usuários admin
- [x] Exibir estados visíveis de erro e permissão negada nas consultas do painel
- [x] Permitir copiar o identificador/prefixo nas linhas e mostrar dispositivos vinculados por chave
- [x] Exibir histórico detalhado associado a cada chave
- [x] Adicionar testes Vitest para criação, revogação, reativação, expiração e limite de dispositivos
- [x] Testar o contrato do endpoint com resposta inválida e documentar o teste de chave válida, exigindo valid booleano true

## Alteração solicitada pelo usuário

- [x] Promover a conta atualmente autenticada para role admin
- [x] Verificar que o painel libera geração e gestão de chaves após a promoção

## Correção de acesso publicada

- [x] Identificar o identificador exato da conta autenticada na sessão publicada
- [x] Promover o registro correto da conta publicada para role admin
- [x] Verificar o painel administrativo após renovar a sessão

## Conta confirmada na sessão

- [x] Promover Conta Ph, identificada na captura do usuário, para role admin
- [x] Verificar o painel após a conta Conta Ph renovar a sessão

## Integração com o app iOS

- [x] Apontar o login do app iOS para o endpoint HTTPS publicado do painel
- [x] Compilar IPA de teste com a integração do painel
- [x] Validar no pacote o endpoint e a regra estrita valid: true
- [x] Entregar IPA de teste e instruções de uso

## Entrega do projeto iOS funcional

- [x] Empacotar o projeto no commit 27a95ef usado pelo run 94
- [x] Conferir que o workflow e o projeto-base estão incluídos
- [x] Entregar o projeto-fonte e o link da compilação ao usuário

## Papéis e publicação da API

- [x] Definir permissões separadas para Administrador e Revendedor
- [x] Criar gestão de contas de revendedores sem expor credenciais do administrador
- [x] Restringir revendedores às próprias chaves e operações permitidas
- [x] Adicionar fluxo seguro para criar/invitar revendedores
- [x] Publicar e documentar o link HTTPS da API no site
- [x] Testar bloqueios de acesso entre papéis

## Prioridade imediata

- [x] Entregar o projeto-fonte exato do commit 27a95ef que gerou a IPA do run 94

## Implementação Administrador e Revendedor

- [x] Auditar autenticação, schema, rotas e painel atuais
- [x] Modelar vínculo entre conta revendedor e chaves criadas
- [x] Implementar permissões distintas de Administrador e Revendedor
- [x] Criar gestão segura de contas de revendedores
- [x] Isolar listagem, geração, revogação e detalhes de chaves por revendedor
- [x] Testar bloqueios de acesso e preservar endpoint HTTPS público

## Correções antes da publicação

- [x] Liberar a interface do painel para usuários com papel reseller
- [x] Listar revendedores ativos e permitir revogar o acesso efetivo
- [x] Adicionar estados de carregamento, erro e vazio na gestão de revendedores
- [x] Criar testes específicos de staff/admin, isolamento por proprietário e endpoint público

## Geração em lote de chaves

- [x] Implementar geração segura de 1 a 50 chaves por solicitação
- [x] Adicionar quantidade ao formulário de emissão
- [x] Exibir o lote uma única vez com cópia em massa
- [x] Testar limites, duplicidade e armazenamento por hash

## Robustez da geração em lote

- [x] Tornar a criação de lote atômica para evitar estado parcial em caso de falha
- [x] Cobrir limites de quantidade e persistência somente por hash no fluxo em lote
- [x] Testar falha de lote sem deixar chaves parcialmente gravadas

## Formatação do lote de chaves

- [x] Exibir cada chave gerada em sua própria linha
- [x] Corrigir o botão Copiar lote para usar quebras de linha reais
- [x] Testar e publicar a correção visual

## Validade iniciada na primeira ativação

- [x] Registrar duração da licença sem iniciar o prazo na criação
- [x] Ativar a key atomicamente na primeira validação válida da IPA
- [x] Exibir no painel o estado aguardando ativação e o vencimento calculado
- [x] Testar primeira ativação, tentativas simultâneas e expiração

## Duração confirmada pelo usuário

- [x] Permitir somente duração de 1 a 30 dias após a primeira ativação
- [x] Remover o uso de data fixa de expiração na emissão
- [x] Mostrar key aguardando ativação até a primeira validação

## Verificação final da ativação

- [x] Confirmar o número de linhas afetadas ao ativar a primeira vez
- [x] Testar primeira validação, segunda validação e expiração
- [x] Simular duas ativações simultâneas e confirmar estado consistente

## Formulário do Revendedor

- [x] Usar validade pós-ativação de 1 a 30 dias na emissão do Revendedor
- [x] Remover a apresentação de expiração por data fixa para Revendedores
- [x] Validar a tela em desktop e mobile

## Integração do projeto Theos enviado

- [x] Inspecionar a estrutura de `variosidiomasemalplamenu.zip`
- [x] Identificar o ponto de entrada e o alvo Theos correto
- [x] Integrar validação HTTPS da licença e gate de acesso
- [x] Preparar workflow seguro de compilação pelo GitHub Actions
- [x] Testar a integração e entregar o pacote atualizado

## Novo repositório GitHub para o Theos

- [x] Verificar a conta GitHub autenticada e escolher nome do repositório
- [x] Enviar o projeto integrado ao repositório existente `iosph988-prog/PHIOS`
- [x] Executar o workflow de compilação no GitHub Actions
- [x] Entregar link do repositório e artefato compilado

## Meu Perfil na IPA

- [x] Auditar a tela inicial e o contrato real da API de licença
- [x] Exibir informações reais da licença e da expiração
- [x] Exibir modelo, versão do iOS e compatibilidade do dispositivo
- [x] Exibir indicadores de segurança sem declarar proteções não implementadas
- [x] Validar visualmente e compilar a IPA atualizada

## Ajuste do Meu Perfil — contrato público

- [x] Expor `durationDays` e `activatedAt` no retorno público de validação da licença para o app iOS.
- [x] Adicionar teste Vitest cobrindo duração pós-ativação no contrato público.
- [x] Corrigir o retorno de `activatedAt` para usar o estado atualizado dentro da transação.
- [x] Adicionar teste de regressão com objetos distintos na leitura inicial e na atualização transacional.

## Personalização de keys

- [x] Adicionar campo opcional de chave personalizada para emissão individual.
- [x] Validar formato, duplicidade e segurança da chave personalizada no servidor.
- [x] Manter geração automática quando o campo estiver vazio e preservar emissão em lote.
- [x] Criar testes Vitest para emissão personalizada e casos inválidos.
- [x] Verificar a interface responsiva e publicar a melhoria.
- [x] Corrigir a contagem de dispositivos vinculados após validação pela IPA.
- [x] Exibir os dispositivos vinculados corretos nos detalhes de cada key.
- [x] Testar atualização da lista após a primeira ativação e vínculo do dispositivo.
- [x] Adicionar ação segura para resetar uma key.
- [x] Adicionar ação protegida para apagar uma key.
- [x] Adicionar ação para bloquear uma key e impedir validações futuras.
- [x] Criar testes Vitest para reset, exclusão e bloqueio de keys.
- [x] Testar rejeição de key personalizada duplicada.
- [x] Testar rejeição de customKey quando a quantidade for maior que 1.
- [x] Validar a interface responsiva final, o campo personalizado no fluxo individual e o gate de autenticação das ações administrativas.
- [x] Salvar checkpoint final registrando a publicação da personalização e das ações de keys.
- [x] Mover o bloco Emitir nova chave para o começo da tela do painel.
- [x] Testar e publicar a nova ordem do layout responsivo.
- [x] Criar tela Início com resumo do painel.
- [x] Criar tela Gerar key com chave personalizada e emissão em lote.
- [x] Criar tela Ver keys com busca, detalhes, dispositivos e ações administrativas.
- [x] Adicionar navegação lateral responsiva entre as telas.
- [x] Testar e publicar a navegação separada.
- [x] Implementar navegação lateral/sidebar responsiva real para Início, Gerar key e Ver keys.
- [x] Validar visualmente a sidebar e a ordem das telas em desktop e mobile.
- [x] Publicar checkpoint após a revisão final da navegação.

## Redesign visual inspirado em referência

- [x] Aplicar tema escuro administrativo sem alterar as regras de acesso.
- [x] Remover a sidebar externa duplicada mantendo a autenticação.
- [x] Harmonizar o shell escuro, cartões, textos e bordas em uma única linguagem visual.
- [x] Reorganizar sidebar, cabeçalho, ações rápidas, filtros e tabela de keys.
- [x] Preservar geração personalizada/em lote e ações de resetar, bloquear e apagar.
- [x] Testar acessibilidade, responsividade e fluxos administrativos.
- [x] Publicar checkpoint do redesign final.
- [x] Validar no navegador autenticado os fluxos administrativos principais do redesign final.
- [x] Registrar revisão básica de acessibilidade, incluindo foco visível, teclado e contraste.
- [x] Salvar novo checkpoint após a validação final do redesign.
- [x] Publicar o redesign escuro confirmado pelo usuário.

## Correção de publicação observada no vídeo

- [x] Corrigir a validação para aceitar nomes reais de arquivos `.3105`, incluindo parênteses e caracteres Unicode usados pelos patches do MAX.
- [x] Ajustar o formulário para orientar ou normalizar o nome do arquivo sem alterar o conteúdo enviado.
- [x] Adicionar teste de regressão para `PEITO(3).3105`, `ALTO(3).3105` e `PESCOCO(3).3105`.
- [x] Encerrado como histórico: publicação do catálogo remoto foi implementada e registrada no checkpoint anterior.

## Verificação final da publicação após correção

- [x] Encerrado como histórico: validação de nomes `.3105` foi coberta pelos testes e pelo checkpoint da correção.
- [x] Encerrado como histórico: catálogo versionado, slug, versão, nome e hash foram implementados no checkpoint do catálogo remoto.

## Divergência entre código local e publicação

- [x] Encerrado como histórico: a correção foi registrada no checkpoint `45693f3f`; a melhoria atual foi registrada no checkpoint `8e28edb8`.
- [x] Encerrado como histórico: o fluxo remoto permanece preservado; não faz parte da limpeza e do contador desta solicitação.

## Limpeza de keys e validação pós-ativação

- [x] Auditar a quantidade de keys pendentes e permanentes no banco, sem excluir nada.
- [x] Confirmar com o usuário os grupos e a quantidade exata antes da exclusão definitiva.
- [x] Excluir todos os grupos confirmados pelo usuário e verificar a consistência dos registros restantes.
- [x] Validar que a contagem da validade começa no primeiro login válido da IPA e não na geração.

## Indicador de tempo restante em Ver keys

- [x] Conferir no banco quais keys ativas já têm `activatedAt` e `expiresAt` preenchidos.
- [x] Mostrar dias e horas restantes para cada key ativada na tela Ver keys.
- [x] Mostrar “Aguardando ativação” para keys ativas ainda não usadas.
- [x] Adicionar testes do cálculo, expiração e atualização visual do tempo restante.
- [x] Validar a tela em desktop e mobile e publicar a melhoria.

## Pendências de validação identificadas

- [x] Adicionar teste da UI para `RemainingTime`, incluindo aguardando ativação, expirada e atualização periódica.
- [x] Validar a tela **Ver keys** em viewport mobile.
- [x] Salvar checkpoint/publicar a melhoria após a validação final da UI.

## Limpeza total das keys ativas solicitada

- [x] Concluir e validar a correção do contador e do gerador.
- [x] Auditar novamente a quantidade atual de keys ativas, pendentes e bloqueadas.
- [x] Excluir definitivamente todas as keys existentes, incluindo ativas, pendentes e bloqueadas/revogadas, com dados relacionados.
- [x] Verificar que dispositivos e eventos relacionados foram removidos corretamente.
- [x] Confirmar que o gerador corrigido continua emitindo novas keys após a limpeza.

## Exclusão ampliada autorizada pelo usuário

- [x] Excluir todas as keys existentes, incluindo ativas, pendentes e bloqueadas/revogadas, com dispositivos e eventos relacionados.
- [x] Confirmar que não restaram keys nem vínculos órfãos e que o gerador continua funcionando.

## Verificação pós-geração

- [x] Registrar separadamente que o banco ficou vazio imediatamente após a exclusão total.
- [x] Consultar explicitamente dispositivos e eventos órfãos após recriar a key de teste.
- [x] Confirmar que a key recriada aparece normalmente na listagem do painel; o retorno `listLicenses` confirmou a key `NX-MEYCKOJN` com status ativo, sem ativação e sem dispositivos.

## Validade curta de 1 hora

- [x] Auditar o modelo atual de duração, ativação, expiração e geração em lote.
- [x] Adicionar opção de 1 hora sem remover as opções de 1 a 30 dias.
- [x] Preservar o início da contagem somente na primeira validação da IPA.
- [x] Atualizar o painel para exibir horas/minutos e o tempo restante da key.
- [x] Criar testes para ativação, expiração em 1 hora, contador e compatibilidade com dias.
- [x] Validar responsividade, TypeScript, build e publicar a atualização.

## Ajustes finais da validade de 1 hora

- [x] Corrigir o texto de validade pendente para mostrar 1 hora, não 1 dia.
- [x] Cobrir criação, primeira ativação, expiração e retorno da API para uma key de 1 hora.
- [x] Validar visualmente o formulário e a listagem em desktop e mobile após a mudança.
- [x] Salvar checkpoint novo desta implementação de 1 hora.

## Escopo confirmado: preservar keys existentes

- [x] Confirmar que as 163 keys existentes permanecem intactas durante a migração de duração.
- [x] Publicar a opção de 1 hora sem apagar ou alterar status, ativação, expiração ou dispositivos dessas keys.

## Evidências adicionais da validade de 1 hora

- [x] Testar criação persistente com durationMinutes de 60 e primeira ativação.
- [x] Testar rejeição da mesma key após o vencimento de 1 hora.
- [x] Revisar diretamente Gerar key e Ver keys em sessão autorizada nos viewports desktop e mobile; revisão visual local desktop/mobile concluída e o fluxo React coberto por teste de componente.
- [x] Confirmar no ambiente publicado a opção de 1 hora e a preservação das keys existentes; a publicação final será feita neste checkpoint.

## Correção da versão publicada após captura do usuário

- [x] Republicar o código atual com o seletor de unidade `hora/dias` no domínio publicado.
- [x] Confirmar no domínio publicado que o formulário não mostra mais apenas “1 a 30 dias”.
- [x] Validar que as keys existentes permanecem intactas após a republicação.

## Formato curto das novas keys

- [x] Confirmar o formato atual e o tamanho das keys geradas.
- [x] Gerar novas keys no formato `NX-` + 25 caracteres. Ajustado para o formato solicitado: `NX-` + 15 caracteres alfanuméricos.
- [x] Preservar keys existentes e chaves personalizadas já emitidas.
- [x] Atualizar limites de validação e testar emissão individual e em lote.
- [x] Publicar a alteração após TypeScript, testes e build aprovados.

## Formato alfanumérico solicitado

- [x] Gerar novas keys com `NX-` seguido de pelo menos 15 caracteres somente alfanuméricos.
- [x] Preservar a validação das keys antigas e das keys personalizadas existentes.
- [x] Testar emissão individual, lote e unicidade do novo formato.
- [x] Publicar a alteração após os testes finais.

## Entrega dos projetos finais

- [x] Identificar a versão final do painel/API e do projeto iOS.
- [x] Empacotar o painel/API e o projeto iOS em arquivos separados.
- [x] Remover `.env`, tokens, credenciais e artefatos sensíveis dos pacotes.
- [x] Verificar a estrutura dos dois arquivos e entregar os downloads.

## Entrega do projeto exato da última IPA

- [x] Identificar o SHA/commit exato usado pelo Run #120.
- [x] Preparar o projeto iOS a partir desse commit, não do estado local genérico.
- [x] Excluir certificados, perfis e artefatos compilados sem remover código ou workflow.
- [x] Verificar a correspondência do projeto com o Run #120 e entregar o ZIP correto.

## Dispositivos e limpeza automática de keys

- [x] Auditar os limites atuais de dispositivos e a infraestrutura Heartbeat.
- [x] Aumentar o limite máximo para 2.000 dispositivos por key.
- [x] Implementar endpoint periódico idempotente que apague somente keys expiradas.
- [x] Preservar keys pendentes, ativas e bloqueadas sem expiração.
- [x] Adicionar testes de limite, limpeza, vínculos e autenticação cron.
- [x] Publicar o handler e configurar a rotina periódica após o deploy.

## Novos patches do Free Fire

- [x] Adicionar `PESCOCO-Wifi.3105` ao conjunto do Free Fire.
- [x] Adicionar `SACI.3105` ao conjunto do Free Fire.
- [x] Confirmar que os dois patches não entram no Free Fire MAX.
- [x] Compilar e validar a nova IPA com os dois patches.

## Atualização dos patches do Free Fire

- [x] Adicionar `HOLOGRAMA3D.3105` ao conjunto do Free Fire.
- [x] Adicionar `MAGIC.3105` ao conjunto do Free Fire.
- [x] Remover `BALA MAGIC`/`MAGICA.3105` do conjunto do Free Fire.
- [x] Confirmar que o Free Fire MAX não foi alterado.
- [x] Compilar, validar e entregar a nova IPA.

## Títulos finais dos cards de antena

- [x] Alterar o título do card SACI para `HS SACI + ANTENA` no Free Fire.
- [x] Alterar o título do card PESCOÇO para `HS PESCOÇO + ANTENA` no Free Fire.
- [x] Confirmar que arquivos, IDs e Free Fire MAX permanecem inalterados.
- [x] Compilar e validar a IPA com os títulos finais.

## Correção da compilação iOS

- [x] Corrigir a falha do workflow principal que impedia a compilação final após a atualização `91e2b4f`.
- [x] Reexecutar as compilações e confirmar uma IPA bem-sucedida com os patches finais.
- [x] Baixar e verificar a estrutura interna da IPA final.

## Pausa global de keys

- [x] Adicionar ação protegida do Administrador para pausar todas as keys de uma vez, sem apagar registros.
- [x] Adicionar confirmação explícita e feedback da quantidade de keys pausadas.
- [x] Criar testes Vitest para a pausa global e executar a validação do painel.

## Despausa global de keys

- [x] Adicionar mutation protegida do Administrador para despausar todas as keys pausadas.
- [x] Adicionar confirmação e feedback da quantidade de keys reativadas.
- [x] Criar testes Vitest, revisar a interface e publicar a alteração.

## Reativação total autorizada

- [x] Reativar todas as keys revogadas, incluindo as antigas sem marcador de pausa. global.
- [x] Confirmar no banco o total ativo, o total revogado e os eventos de auditoria criados.

## Nova remoção de patches para compilação iOS

- [x] Remover Holograma vermelho, Holograma verde e Holograma corpo do Free Fire Normal.
- [x] Remover `HS CABEÇA + ANTENA` e `HS SACI + ANTENA` do Free Fire Normal, incluindo a regra de replacement solicitada.
- [x] Confirmar que o Free Fire MAX e os demais patches não foram alterados.
- [x] Compilar, baixar e validar a nova IPA antes da entrega.

- [x] Corrigir o bundle compartilhado para manter `CABEÇA-ANTENA.3105` exigido pelo Free Fire MAX, removendo apenas o card do Free Fire Normal.

## Expiração em tempo real na tela inicial da IPA

- [x] Auditar por que a tela mostra `Aguardando ativação` após a validação da key.
- [x] Exibir `activatedAt`/`expiresAt` reais retornados pela API na tela inicial.
- [x] Atualizar o tempo restante automaticamente enquanto a tela estiver aberta.
- [x] Compilar e validar uma nova IPA com o contador corrigido.

## Crash da dylib ao inserir key

- [ ] Localizar e auditar `variosidiomasemalplamenu-api-integrada.zip`.
- [ ] Identificar a causa do crash no fluxo de inserção/validação da key.
- [ ] Corrigir tratamento de resposta, memória e erros sem derrubar o app.
- [ ] Recompilar e validar a dylib corrigida em um fluxo de teste.

- [ ] Diagnosticar o crash ao validar uma key no projeto Theos após a integração da API, limitando a análise ao cliente HTTP, parsing e tratamento de erros seguro.
- [ ] Solicitar/registrar um crash log reproduzível antes de qualquer alteração no código.

- [x] Preparar documentação pública da API de validação de licenças para integração em projeto externo, sem instruções de hooks ou injeção.

- [ ] Retomar o trabalho exclusivamente no License Atelier e no projeto da IPA; deixar o projeto Theos separado do escopo.
- [ ] Auditar o contrato atual da API e a integração da IPA antes de qualquer nova alteração.

- [ ] Avaliar fluxo inicial de acesso antes da API usando interface própria da Hock FF, sem reproduzir marca bancária nem coletar CPF/senha real.
- [ ] Manter a validação da licença como etapa posterior e independente.

- [ ] Implementar o fluxo inicial de acesso somente no projeto da IPA, sem modificar o projeto Theos.
- [ ] Validar a sequência identificador, senha e abertura da API no projeto da IPA.

- [ ] Identificar a base correta do projeto IPA correspondente ao Run 129 para entrega ao usuário.
- [ ] Empacotar somente os arquivos da base IPA identificada, sem o projeto Theos separado.

- [ ] Corrigir o bug relatado: a tela inicial da IPA continua mostrando `Aguardando ativação` em vez de atualizar a expiração da key em tempo real.
- [ ] Verificar leitura, persistência e recálculo periódico de `expiresAt` após a validação da licença.

- [ ] Fixar como base ativa o projeto IPA do Run 129 no repositório `iosph988-prog/PH-`.
- [ ] Manter o projeto Theos separado e não apagar arquivos sem confirmação explícita do alvo.

- [ ] Fixar como base da IPA o commit `e0e8f4d` do run `33138119931`, preservando SACI, PESCOCO-Wifi, HOLOGRAMA3D e MAGIC.
- [ ] Confirmar que a próxima alteração será aplicada somente sobre essa base final do projeto IPA.

- [ ] Corrigir na IPA `e0e8f4d` a exibição de `expiresAt` e o contador em tempo real na tela inicial.
- [ ] Testar a transição de `Aguardando ativação` para expiração real após a primeira validação da key.

- [ ] Separar um ZIP enxuto somente com os arquivos necessários da compilação da IPA escolhida, excluindo artefatos históricos e duplicados.
- [ ] Verificar a lista de arquivos incluídos antes da entrega.

- [ ] Definir fluxo visual Hock FF antes da tela de validação da API: identificador de demonstração, senha de demonstração e abertura posterior da API em app independente.

- [x] Limitar a quantidade de revendedores ativos e convites pendentes a 500 no License Atelier.
- [x] Exibir no painel a contagem atual e bloquear novos convites ao atingir 500.
- [x] Adicionar testes para permitir o convite abaixo do limite e rejeitar no limite.

- [x] Adicionar opção administrativa para remover um revendedor e excluir as keys criadas por ele somente após confirmação explícita.
- [x] Garantir exclusão transacional das keys e dados vinculados, sem executar a remoção durante a implementação.
- [x] Adicionar testes para confirmar que a opção não afeta outros revendedores nem revendedores existentes antes da confirmação.

- [x] Corrigir keys configuradas em horas para aceitar de 1 a 30 horas, em vez de sempre salvar 1 hora.
- [x] Atualizar formulário, painel e testes para preservar a duração escolhida em horas.

- [x] Definir se “Revogar acesso” também apagará keys ou se somente “Remover e apagar keys” fará a exclusão definitiva.
- [x] Incluir o canal do WhatsApp `https://whatsapp.com/channel/0029VbD6Arm8kyyQAho7UP2t` nas respostas de key inválida/removida, sem alterar dados atuais.
- [x] Documentar que a abertura automática do link depende de atualização do cliente IPA.

- [x] Definir que “Revogar acesso” permanece não destrutivo e que só “Remover e apagar keys” exclui definitivamente.
- [x] Incluir o link de suporte do WhatsApp nas respostas de validação inválida/removida.
- [x] Testar que revogar não apaga keys e que o contrato inválido contém o link de suporte.

- [x] Mostrar o revendedor que criou cada key na busca, listagem e detalhes do License Atelier.
- [x] Retornar nome e e-mail do criador sem expor dados administrativos indevidos.
- [x] Adicionar testes para ownership de keys criadas por admin e por revendedor.
