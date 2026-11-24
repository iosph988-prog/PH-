# Inventário técnico público — mods.cheatiosvip.net

## Conteúdo preservado

O espelho inclui a página inicial, scripts e folhas de estilo públicos, ícones de categoria, pacote compactado original de dados, JSON descompactado com o manifesto e a geometria 3D, todos os arquivos de imagem únicos apontados pelo manifesto, miniaturas enumeradas pelo seletor e o fundo CSS.

Foram identificadas 298 entradas de imagem no manifesto, apontando para 274 URLs únicas em `assets/runtime/`; também foram consultadas 160 rotas de ícones de item listadas no `Set` do seletor (160 IDs presentes no catálogo), além do fundo `assets/bg.gif`. Consulte `texture-map.json` para mapear nomes lógicos e IDs aos arquivos locais, e `inventory.json` para tamanhos, hashes e status HTTP.

Os dois payloads públicos `export-*.bin` referenciados pelo exportador foram incluídos como dados opacos, sem descompactação ou execução.

## O que não é recuperável deste espelho público

O domínio não expõe o repositório original, o backend, o servidor do WebSocket `/ws`, a configuração da hospedagem, o banco de dados ou segredos. `robots.txt` e `sitemap.xml` retornaram 404. A coleta não tentou adivinhar caminhos nem atravessar autenticação. Para incluir arquivos que só existem no servidor ou no repositório privado, seria necessário fornecer um backup ou acesso autorizado a esses locais.
