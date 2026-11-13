# Atualizar seu código para a Etapa 6

Esta é a versão que está conectada ao Supabase e publicada no site privado. Seu GitHub e a Vercel não foram atualizados automaticamente.

1. Faça uma cópia da pasta do seu projeto atual.
2. Extraia este ZIP. Para usar a versão completa, abra a pasta Meu-Financeiro-Etapa6 no VS Code. Para atualizar seu projeto existente, copie src/, public/, tests/, supabase/, package.json, package-lock.json, index.html, vite.config.js e eslint.config.js. Preserve seu .env.local e a pasta .git existente. Se você tiver personalizações locais, compare antes de substituir.
3. Crie ou confira .env.local usando .env.example. Use a mesma URL do seu projeto e somente uma chave publishable/anon. A configuração pública padrão deste pacote já aponta para o Controle-Financeiro; as variáveis do seu .env.local têm prioridade.
4. No terminal da pasta que contém package.json, execute npm ci e depois npm run dev.
5. Valide receitas, despesas, contas, parcelas, baixa, desfazer baixa e relatórios. Depois execute npm test e npm run build. Os testes de banco automatizados usam PGlite local, sem gravar no seu Supabase.

## O que mudou

- src/services/dados.js: valida a sessão e centraliza chamadas RPC; mf_snapshot carrega contas e movimentações juntas.
- src/services/movimentacoes.js: usa mf_salvar_movimentacao e mf_excluir_movimentacao para gravar com as regras do banco.
- src/services/contas.js: usa mf_criar_contas, mf_liquidar_conta, mf_reabrir_conta e mf_excluir_conta.
- src/components/FormConta.jsx e FormMovimentacao.jsx: request_id por formulário, validação e cancelamento.
- src/pages/Contas.jsx: status de contas pagas/pendentes/atrasadas corrigido e exclusão com atualização da lista.
- src/pages/Movimentacoes.jsx: bloqueia edição/exclusão direta de baixas vinculadas. Use Desfazer na página Contas.
- src/pages/Relatorios.jsx e src/utils/: filtros, gráficos, comparação e exportação CSV/PDF.
- src/App.jsx: rota /relatorios integrada.
- src/contexts/AuthContext.jsx, src/services/demo.js e src/pages/Configuracao.jsx: conexão e modo de teste separado.
- src/styles/global.css: mantém Light Modern e estilos dos relatórios.
- package.json e package-lock.json: dependências de PDF e testes.

A migração JÁ foi aplicada no projeto Controle-Financeiro. Os SQLs do pacote servem como histórico. NÃO execute novamente essas migrações neste mesmo banco. Em outro Supabase, inspecione o esquema e o histórico antes de aplicar.

## Vercel, quando você decidir atualizar a hospedagem

Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no projeto da Vercel antes de gerar uma nova implantação. Preserve as restrições de acesso que deseja manter: privacidade do site no ChatGPT não é transferida automaticamente para a Vercel.

Se usar confirmação de e-mail ou recuperação de senha, configure no Supabase as URLs autorizadas correspondentes a /login e /atualizar-senha no domínio escolhido.

Referências:
- https://vercel.com/docs/environment-variables
- https://vite.dev/guide/env-and-mode
- https://supabase.com/docs/guides/database/functions
