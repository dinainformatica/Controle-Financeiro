# Meu Financeiro —

Projeto React + Bootstrap Light Modern.

## Estado da integração

A conexão com o projeto Controle-Financeiro está configurada com a URL e chave publishable pública, sem chaves administrativas no cliente. A migração `etapa6_seguranca_relatorios` foi aplicada no Supabase em 13/11/2026.

Foram validados no banco hospedado: snapshot autenticado, cadastro/edição/exclusão de movimentação, parcelas exatas, reenvio idempotente, baixa/reversão, bloqueio de baixas vinculadas e isolamento entre usuários. A validação executou em transação com rollback, sem deixar registros fictícios. Os 38 lançamentos existentes foram preservados byte a byte (hash do JSON ordenado antes e depois).

A API REST reconhece `mf_snapshot` e rejeita chamadas anônimas. Login interativo com a senha do proprietário e e-mails de recuperação não foram executados pelo agente. As URLs autorizadas de confirmação/recuperação no Supabase precisam incluir o domínio privado se esses recursos forem usados.

O acesso da hospedagem continua privado e restrito ao proprietário. O repositório GitHub e a implantação pública anterior não foram atualizados. A Etapa 6 usa RPCs com escrita direta revogada: a interface antiga que escreve diretamente nas tabelas precisa migrar para os serviços desta versão.

O modo de teste continua separado e explicitamente sinalizado. Seus dados fictícios ficam somente no navegador e nunca são gravados no Supabase.

## Recursos

- Relatórios de caixa realizado e contas por vencimento, sem somar baixas duas vezes.
- Filtros de data, categoria e tipo, atalhos de período e comparação com período anterior de mesma duração.
- Gráficos mensais, distribuição por categoria, resultado acumulado e tabelas com detalhamento.
- CSV com todos os registros filtrados, BOM UTF-8 e proteção contra fórmulas em texto.
- PDF direto com resumo, gráfico, categorias e todos os registros filtrados.
- Correção de status pagas/pendentes/atrasadas, cancelamento e exclusão de conta.
- Parcelas com soma exata em centavos e vencimentos no último dia dos meses curtos.

## Segurança e integridade aplicadas

`supabase/migrations/20261113132931_etapa6_seguranca_relatorios.sql`:

- RLS por `auth.uid()`, somente leitura de registros do usuário.
- Escrita direta e acesso anônimo revogados. RPCs antigas conhecidas fechadas.
- RPCs públicas SECURITY INVOKER chamam implementações em esquema privado; autenticação e propriedade são verificadas no servidor, com `search_path` vazio e execução restrita.
- Validação de valor, tipo, data, texto, parcelas e vínculo de mesma propriedade.
- Baixa e reversão transacionais com bloqueio de linha, unicidade da baixa e consistência diferida.
- Identificador de requisição em cadastros para reenvio idempotente no servidor.
- Auditoria em esquema privado, sem acesso do cliente.
- Snapshot consistente para relatórios sem truncamento de mil linhas do PostgREST.

Antes de aplicar em projeto existente, executar `supabase/preflight.sql`, conferir os tipos, constraints, grants, triggers e funções existentes. A migração aborta se houver baixas antigas sem vínculo consistente. Não infere vínculos financeiros por semelhança, não elimina dados e não deve ser aplicada cegamente. Ajustar a compatibilidade de campos/constraints antigos, em especial `movimentacao_id`, após inspeção real. Testar primeiro em branch/cópia de desenvolvimento: a revogação de RPCs antigas altera a compatibilidade do frontend antigo que usa o mesmo banco.

Configurar no Supabase as URLs autorizadas para `/login` e `/atualizar-senha` no domínio privado, confirmação de e-mail e políticas de senha. Nunca colocar secret/service_role em `VITE_*`. A interface aceita somente chave pública publishable/anon. O acesso privado da hospedagem é adicional à autenticação e RLS do Supabase.

## Execução e validação

```
npm ci
npm run dev
npm test
npm run build
```

Os 15 testes locais verificam RLS entre dois usuários, bloqueio de anônimo e escrita direta, idempotência, parcelas, baixa/reversão, auditoria, rollback de inconsistências, cálculo em centavos e exportação de mais de mil registros. PGlite usa PostgreSQL, mas não substitui testes do Auth, PostgREST e concorrência em múltiplas conexões no Supabase real.

Também foram conferidos no navegador: relatórios, filtros combinados, datas inválidas, CSV, baixas, proteção de movimentações vinculadas, contas pagas, cadastro e cancelamento, e parcelas ancoradas no dia 31. O PDF foi gerado e renderizado para conferir tabelas e paginação.

A revisão do Supabase não encontrou erros de integridade ou saúde. A proteção adicional contra senhas vazadas permanece desativada e está disponível somente nos planos Pro ou superiores: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Nenhuma assinatura ou custo foi alterado.
