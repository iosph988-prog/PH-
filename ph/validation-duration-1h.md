# Validação visual da duração de 1 hora

A revisão do preview em 1280x720 e 375x812 confirmou que o shell do painel permanece responsivo, sem overflow visível, com sidebar e cartões preservados. A alteração do formulário usa dois controles lado a lado para valor e unidade (`hora`/`dias`), com texto explicativo sobre o início da contagem na primeira ativação. A tela inicial carregou os dados reais do painel durante a revisão.

Validações automatizadas associadas: 36 testes Vitest aprovados, TypeScript sem erros e build de produção concluído. O teste de integração cobre ativação de 60 minutos, retorno de `durationMinutes` e vínculo do dispositivo.
