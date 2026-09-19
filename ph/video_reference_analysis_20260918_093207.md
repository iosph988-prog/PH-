Com base na análise do vídeo da interface "License Atelier - Admin Console", aqui está o detalhamento solicitado para a implementação:

### 1. Ordem das Telas (Navegação Sidebar)
A interface segue uma estrutura de Dashboard Centralizado com as seguintes seções na barra lateral:
1.  **Início (Dashboard):** Visão geral com contadores em tempo real (Total de chaves, Ativas, Dispositivos, Revendedores).
2.  **Gerar key:** Formulário de criação de licenças.
3.  **Ver keys:** Listagem, filtragem e gerenciamento de chaves existentes.
4.  **Subrevendedores:** Gestão de contas de parceiros/revendedores.
5.  **Patches online:** Gerenciamento de modificações (scripts/offsets) injetados via nuvem.
6.  **Online separado:** Similar aos patches, mas com organização por abas de interface (ex: aba "MIRA").
7.  **Aviso global:** Configuração de mensagens de sistema e URLs de logotipos para o app.

---

### 2. Funcionalidades de Patches e Online Separado
As telas de **Patches Online** e **Online Separado** permitem modificar o comportamento do aplicativo iOS sem necessidade de recompilação (Mod Menu dinâmico).

*   **Campos de Entrada:**
    *   **Slug:** Identificador único interno.
    *   **Nome exibido:** Título que aparecerá para o usuário final.
    *   **Jogo:** Seleção via dropdown (ex: Free Fire, Free Fire MAX).
    *   **Arquivo .3105:** Upload do arquivo binário/patch.
    *   **Aba da interface (Apenas no "Online separado"):** Define em qual categoria o patch aparece.
*   **Ações:**
    *   **Publicar versão:** Envia o patch para o servidor e o torna disponível.
    *   **Editar:** Permite alterar o nome ou substituir o arquivo de um patch existente.
    *   **Ativar/Desativar:** Botões rápidos para habilitar ou remover a função da interface do usuário final instantaneamente.
    *   **Salvar nome da interface:** Personaliza o título do cabeçalho do menu (ex: "PROXY CHEATS").

---

### 3. Fluxo de Subrevendedor (Reseller)
O sistema possui um controle rigoroso de hierarquia para revenda:

*   **Criação:**
    *   Definição de **Limite de licenças** (ex: o revendedor só pode gerar 5000 chaves).
    *   **Dispositivos para login:** Limita em quantos aparelhos o revendedor pode acessar o painel dele.
    *   **Expiração:** Data limite para a conta do revendedor ser desativada.
*   **Gestão de Conta:**
    *   Visualização de métricas: "Keys geradas: X / Limite".
    *   **Resetar dispositivos:** Limpa o HWID do revendedor caso ele troque de aparelho.
    *   **Revogar:** Bloqueio imediato do acesso do revendedor.
    *   **Data de Expiração:** Calendário interativo para definir a validade da conta.

---

### 4. Comparativo e Requisitos de Implementação
Em relação ao projeto de API antigo, as seguintes funcionalidades são novas ou foram aprimoradas e **precisam ser implementadas**:

**A. Backend (API):**
*   **Sistema de Cotas:** Lógica para impedir que um revendedor gere chaves além do limite estipulado no banco de dados.
*   **Gerenciamento de Binários (.3105):** Endpoint para upload, armazenamento e entrega desses arquivos via API para o app iOS.
*   **Filtros Avançados:** Implementar busca por prefixo de chave e filtros por status (Pendente, Ativa, Bloqueada) com paginação.
*   **Logs de Dispositivos:** Rastreamento de HWID tanto para o usuário final da chave quanto para o login do revendedor.

**B. Frontend (Painel):**
*   **Seleção de Unidade de Tempo:** Dropdown no gerador de chaves para escolher entre "Hora" ou "Dias".
*   **Interface de Avisos:** Campos para "Logo URL" e "Logo MAX URL" para troca dinâmica de branding no app.
*   **Status Visual:** Badges coloridos para indicar chaves "Ativas" e tempo restante (ex: "Restam 21h 3min").
*   **Modal de Edição de Revendedor:** Interface para ajuste de limites e renovação de senhas.

**C. Segurança:**
*   **Hashing:** As chaves devem ser armazenadas como hash (conforme nota no rodapé da interface).
*   **Validação de HWID:** Bloqueio de login excedente para contas de revendedor.