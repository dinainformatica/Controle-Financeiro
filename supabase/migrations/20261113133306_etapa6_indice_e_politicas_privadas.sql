begin;
-- Defesa explícita: nenhum cliente lê ou escreve as tabelas internas.
create policy mf_auditoria_sem_acesso_cliente on private.mf_auditoria
 as restrictive for all to anon,authenticated using(false) with check(false);
create policy mf_requisicoes_sem_acesso_cliente on private.mf_requisicoes
 as restrictive for all to anon,authenticated using(false) with check(false);
-- Índice cobre a chave estrangeira composta sem remover a unicidade da baixa.
create index mf_mov_conta_usuario on public.movimentacoes(conta_id,user_id);
commit;
