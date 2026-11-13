-- Meu Financeiro / Etapa 6. Aplicar em transação após conferir o esquema real.
-- Não apaga nem recria dados. Inconsistências antigas interrompem toda a migração.
-- Referências: https://supabase.com/docs/guides/database/postgres/row-level-security
-- https://supabase.com/docs/guides/database/functions
begin;
revoke create on schema public from public, anon, authenticated;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.contas (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 descricao text not null, tipo text not null, categoria text not null, valor numeric(14,2) not null,
 vencimento date not null, status text not null default 'pendente', data_pagamento date,
 grupo_parcelamento uuid, parcela_numero integer not null default 1, total_parcelas integer not null default 1,
 created_at timestamptz not null default now()
);
create table if not exists public.movimentacoes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 descricao text not null, tipo text not null, categoria text not null, valor numeric(14,2) not null,
 data date not null, conta_id uuid, created_at timestamptz not null default now()
);
alter table public.contas add column if not exists data_pagamento date;
alter table public.contas add column if not exists grupo_parcelamento uuid;
alter table public.contas add column if not exists parcela_numero integer not null default 1;
alter table public.contas add column if not exists total_parcelas integer not null default 1;
alter table public.movimentacoes add column if not exists conta_id uuid;

-- Somente vínculos antigos explícitos, com valor, tipo, data e proprietário corretos.
do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='contas' and column_name='movimentacao_id') then
  execute 'update public.movimentacoes m set conta_id=c.id from public.contas c where c.movimentacao_id=m.id and c.user_id=m.user_id and c.status=''pago'' and m.valor=c.valor and m.tipo=case c.tipo when ''pagar'' then ''despesa'' else ''receita'' end and c.data_pagamento=m.data and m.conta_id is null';
 end if;
 if exists(select 1 from public.contas c left join public.movimentacoes m on m.conta_id=c.id where (c.status='pago' and (m.id is null or m.user_id<>c.user_id or m.valor<>c.valor or m.descricao<>c.descricao or m.categoria<>c.categoria or m.data<>c.data_pagamento or m.tipo<>case c.tipo when 'pagar' then 'despesa' else 'receita' end)) or (c.status='pendente' and m.id is not null)) then
  raise exception 'Reconcilie as baixas antigas antes da Etapa 6. Nenhum dado foi apagado.';
 end if;
end $$;

alter table public.contas alter column user_id set not null, alter column descricao set not null, alter column tipo set not null, alter column categoria set not null, alter column valor set not null, alter column vencimento set not null, alter column status set not null;
alter table public.movimentacoes alter column user_id set not null, alter column descricao set not null, alter column tipo set not null, alter column categoria set not null, alter column valor set not null, alter column data set not null;
alter table public.contas add constraint mf_conta_valida check (
 tipo in ('pagar','receber') and status in ('pendente','pago') and valor>0 and valor<=999999999999.99 and valor=round(valor,2) and valor::text not in ('NaN','Infinity','-Infinity')
 and length(btrim(descricao)) between 1 and 150 and length(btrim(categoria)) between 1 and 80
 and vencimento between date '1900-01-01' and date '2200-12-31'
 and total_parcelas between 1 and 120 and parcela_numero between 1 and total_parcelas
 and ((status='pendente' and data_pagamento is null) or (status='pago' and data_pagamento is not null))
);
alter table public.movimentacoes add constraint mf_mov_valida check (
 tipo in ('receita','despesa') and valor>0 and valor<=999999999999.99 and valor=round(valor,2) and valor::text not in ('NaN','Infinity','-Infinity')
 and length(btrim(descricao)) between 1 and 150 and length(btrim(categoria)) between 1 and 80
 and data between date '1900-01-01' and date '2200-12-31'
);
create unique index mf_conta_id_usuario on public.contas(id,user_id);
do $$ begin
 if to_regclass('public.idx_movimentacoes_conta') is null then
  create unique index mf_uma_baixa_por_conta on public.movimentacoes(conta_id) where conta_id is not null;
 end if;
end $$;
alter table public.movimentacoes add constraint mf_baixa_mesmo_usuario foreign key(conta_id,user_id) references public.contas(id,user_id);
create index if not exists mf_mov_usuario_data on public.movimentacoes(user_id,data,id);
do $$ begin
 if to_regclass('public.idx_contas_usuario_vencimento') is null then
  create index mf_conta_usuario_vencimento on public.contas(user_id,vencimento,id);
 end if;
end $$;
create unique index mf_parcela_unica on public.contas(user_id,grupo_parcelamento,parcela_numero) where grupo_parcelamento is not null;

-- Substituir políticas permissivas antigas nestas duas tabelas e fechar escrita direta.
alter table public.contas enable row level security;
alter table public.movimentacoes enable row level security;
do $$ declare r record; begin
 for r in select tablename, policyname from pg_policies where schemaname='public' and tablename in ('contas','movimentacoes') loop
  execute format('drop policy %I on public.%I',r.policyname,r.tablename);
 end loop;
end $$;
revoke all on public.contas, public.movimentacoes from public, anon, authenticated;
-- Revogar também eventuais grants por coluna.
do $$ declare r record; begin
 for r in select table_name,column_name,privilege_type,grantee from information_schema.column_privileges where table_schema='public' and table_name in ('contas','movimentacoes') and grantee in ('anon','authenticated','PUBLIC') loop
  execute format('revoke %s (%I) on public.%I from %s',r.privilege_type,r.column_name,r.table_name,case when r.grantee='PUBLIC' then 'PUBLIC' else quote_ident(r.grantee) end);
 end loop;
end $$;
grant select on public.contas, public.movimentacoes to authenticated;
create policy mf_contas_proprias on public.contas for select to authenticated using(user_id=(select auth.uid()));
create policy mf_mov_proprias on public.movimentacoes for select to authenticated using(user_id=(select auth.uid()));
-- Fechar RPCs antigas que poderiam contornar as novas regras.
do $$ declare r record; begin
 for r in select p.oid::regprocedure as assinatura from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('criar_contas','liquidar_conta','reabrir_conta') loop
  execute format('revoke all on function %s from public, anon, authenticated',r.assinatura);
 end loop;
end $$;

create table private.mf_requisicoes (
 user_id uuid not null references auth.users(id), request_id uuid not null, operacao text not null,
 payload jsonb not null, resultado uuid, primary key(user_id,request_id,operacao)
);
create table private.mf_auditoria (
 id bigint generated always as identity primary key, user_id uuid not null,
 tabela text not null, registro_id uuid not null, acao text not null,
 antes jsonb, depois jsonb, ocorrido_em timestamptz not null default now()
);
revoke all on private.mf_requisicoes,private.mf_auditoria from public,anon,authenticated;
alter table private.mf_requisicoes enable row level security;
alter table private.mf_auditoria enable row level security;
create function private.mf_auditar() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.mf_auditoria(user_id,tabela,registro_id,acao,antes,depois)
 values(coalesce(new.user_id,old.user_id),tg_table_name,coalesce(new.id,old.id),tg_op,
 case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end);
 return coalesce(new,old);
end $$;
revoke all on function private.mf_auditar() from public,anon,authenticated;
create trigger mf_audit_contas after insert or update or delete on public.contas for each row execute function private.mf_auditar();
create trigger mf_audit_mov after insert or update or delete on public.movimentacoes for each row execute function private.mf_auditar();

-- Ao final da transação, uma conta liquidada deve ter exatamente uma baixa consistente.
create function private.mf_validar_baixa() returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid; c public.contas; m public.movimentacoes;
begin
 if tg_table_name='contas' then v_id=coalesce(new.id,old.id); else v_id=coalesce(new.conta_id,old.conta_id); end if;
 if v_id is null then return null; end if;
 select * into c from public.contas where id=v_id;
 if not found then return null; end if;
 select * into m from public.movimentacoes where conta_id=v_id;
 if (c.status='pago' and (m.id is null or m.user_id<>c.user_id or m.valor<>c.valor or m.descricao<>c.descricao or m.categoria<>c.categoria or m.data<>c.data_pagamento or m.tipo<>case c.tipo when 'pagar' then 'despesa' else 'receita' end)) or (c.status='pendente' and m.id is not null) then raise exception 'Conta e baixa inconsistentes.'; end if;
 return null;
end $$;
revoke all on function private.mf_validar_baixa() from public,anon,authenticated;
create constraint trigger mf_integridade_conta after insert or update or delete on public.contas deferrable initially deferred for each row execute function private.mf_validar_baixa();
create constraint trigger mf_integridade_mov after insert or update or delete on public.movimentacoes deferrable initially deferred for each row execute function private.mf_validar_baixa();

create function private.mf_validar_registro(p_descricao text,p_categoria text,p_valor numeric,p_data date) returns void language plpgsql set search_path='' as $$
begin
 if p_descricao is null or length(btrim(p_descricao)) not between 1 and 150 or p_categoria is null or length(btrim(p_categoria)) not between 1 and 80 or p_valor is null or p_valor::text in ('NaN','Infinity','-Infinity') or p_valor<=0 or p_valor>999999999999.99 or p_valor<>round(p_valor,2) or p_data is null or p_data not between date '1900-01-01' and date '2200-12-31' then raise exception 'Descrição, categoria, valor ou data inválidos.'; end if;
end $$;
revoke all on function private.mf_validar_registro(text,text,numeric,date) from public,anon,authenticated;

create function public.mf_snapshot() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
 return jsonb_build_object(
 'movimentacoes',coalesce((select jsonb_agg(to_jsonb(m) order by m.data desc,m.id) from public.movimentacoes m where m.user_id=auth.uid()),'[]'::jsonb),
 'contas',coalesce((select jsonb_agg(to_jsonb(c) order by c.vencimento,c.id) from public.contas c where c.user_id=auth.uid()),'[]'::jsonb));
end $$;

create function private.mf_salvar_movimentacao(p_id uuid,p_request_id uuid,p_descricao text,p_tipo text,p_categoria text,p_valor numeric,p_data date) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid=auth.uid(); v_id uuid; v_payload jsonb=jsonb_build_array(p_descricao,p_tipo,p_categoria,p_valor,p_data); v_anterior private.mf_requisicoes;
begin
 if v_user is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
 perform private.mf_validar_registro(p_descricao,p_categoria,p_valor,p_data);
 if p_tipo is null or p_tipo not in ('receita','despesa') then raise exception 'Tipo inválido.'; end if;
 if p_id is not null then
  update public.movimentacoes set descricao=btrim(p_descricao),tipo=p_tipo,categoria=btrim(p_categoria),valor=p_valor,data=p_data where id=p_id and user_id=v_user and conta_id is null returning id into v_id;
  if v_id is null then raise exception 'Registro inexistente ou vinculado a uma conta.' using errcode='42501'; end if;
 else
  if p_request_id is null then raise exception 'Identificador da requisição obrigatório.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text||p_request_id::text,0));
  select * into v_anterior from private.mf_requisicoes where user_id=v_user and request_id=p_request_id and operacao='movimentacao';
  if found then
   if v_anterior.payload<>v_payload then raise exception 'Requisição reutilizada com dados diferentes.'; end if;
   return v_anterior.resultado;
  end if;
  insert into public.movimentacoes(user_id,descricao,tipo,categoria,valor,data) values(v_user,btrim(p_descricao),p_tipo,btrim(p_categoria),p_valor,p_data) returning id into v_id;
  insert into private.mf_requisicoes values(v_user,p_request_id,'movimentacao',v_payload,v_id);
 end if;
 return v_id;
end $$;

create function private.mf_excluir_movimentacao(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
 delete from public.movimentacoes where id=p_id and user_id=auth.uid() and conta_id is null;
 if not found then raise exception 'Registro inexistente ou vinculado a uma conta.' using errcode='42501'; end if;
end $$;

create function private.mf_criar_contas(p_request_id uuid,p_descricao text,p_tipo text,p_categoria text,p_valor numeric,p_vencimento date,p_parcelas integer) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid=auth.uid(); v_cent bigint; v_valor numeric; v_dia int; v_inicio date; v_data date; v_grupo uuid=gen_random_uuid(); v_payload jsonb=jsonb_build_array(p_descricao,p_tipo,p_categoria,p_valor,p_vencimento,p_parcelas); v_anterior private.mf_requisicoes;
begin
 if v_user is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
 perform private.mf_validar_registro(p_descricao,p_categoria,p_valor,p_vencimento);
 if p_tipo is null or p_tipo not in ('pagar','receber') or p_parcelas is null or p_parcelas not between 1 and 120 or p_valor*100<p_parcelas or p_request_id is null then raise exception 'Tipo, parcelas ou requisição inválidos.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text||p_request_id::text,0));
 select * into v_anterior from private.mf_requisicoes where user_id=v_user and request_id=p_request_id and operacao='contas';
 if found then
  if v_anterior.payload<>v_payload then raise exception 'Requisição reutilizada com dados diferentes.'; end if;
  return v_anterior.resultado;
 end if;
 v_cent=(p_valor*100)::bigint; v_dia=extract(day from p_vencimento);
 for i in 0..p_parcelas-1 loop
  v_inicio=(date_trunc('month',p_vencimento)+(i||' months')::interval)::date;
  v_data=v_inicio+(least(v_dia,extract(day from (v_inicio+interval '1 month - 1 day')))::int-1);
  v_valor=((v_cent/p_parcelas)+case when i<mod(v_cent,p_parcelas) then 1 else 0 end)::numeric/100;
  insert into public.contas(user_id,descricao,tipo,categoria,valor,vencimento,status,grupo_parcelamento,parcela_numero,total_parcelas) values(v_user,btrim(p_descricao),p_tipo,btrim(p_categoria),v_valor,v_data,'pendente',v_grupo,i+1,p_parcelas);
 end loop;
 insert into private.mf_requisicoes values(v_user,p_request_id,'contas',v_payload,v_grupo);
 return v_grupo;
end $$;

create function private.mf_liquidar_conta(p_conta_id uuid,p_data date) returns void language plpgsql security definer set search_path='' as $$
declare c public.contas; v_user uuid=auth.uid();
begin
 if v_user is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
 if p_data is null or p_data>current_date or p_data<date '1900-01-01' then raise exception 'Data de pagamento inválida.'; end if;
 select * into c from public.contas where id=p_conta_id and user_id=v_user for update;
 if not found then raise exception 'Conta não encontrada.' using errcode='42501'; end if;
 if c.status='pago' then
  if c.data_pagamento<>p_data then raise exception 'Conta já liquidada em outra data.'; end if;
  return;
 end if;
 insert into public.movimentacoes(user_id,descricao,tipo,categoria,valor,data,conta_id) values(v_user,c.descricao,case c.tipo when 'pagar' then 'despesa' else 'receita' end,c.categoria,c.valor,p_data,c.id);
 update public.contas set status='pago',data_pagamento=p_data where id=c.id;
end $$;

create function private.mf_reabrir_conta(p_conta_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.contas; v_user uuid=auth.uid();
begin
 if v_user is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
 select * into c from public.contas where id=p_conta_id and user_id=v_user for update;
 if not found then raise exception 'Conta não encontrada.' using errcode='42501'; end if;
 if c.status='pendente' then return; end if;
 delete from public.movimentacoes where conta_id=c.id and user_id=v_user;
 update public.contas set status='pendente',data_pagamento=null where id=c.id;
end $$;
create function private.mf_excluir_conta(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
 delete from public.contas where id=p_id and user_id=auth.uid() and status='pendente';
 if not found then raise exception 'Conta inexistente ou já liquidada.' using errcode='42501'; end if;
end $$;

-- Interface REST sem privilégios elevados; implementações em esquema não exposto.
grant usage on schema private to authenticated;
create function public.mf_salvar_movimentacao(p_id uuid,p_request_id uuid,p_descricao text,p_tipo text,p_categoria text,p_valor numeric,p_data date) returns uuid language sql security invoker set search_path='' as $$ select private.mf_salvar_movimentacao(p_id,p_request_id,p_descricao,p_tipo,p_categoria,p_valor,p_data); $$;
revoke all on function private.mf_salvar_movimentacao(uuid,uuid,text,text,text,numeric,date) from public,anon,authenticated;
grant execute on function private.mf_salvar_movimentacao(uuid,uuid,text,text,text,numeric,date) to authenticated;
create function public.mf_excluir_movimentacao(p_id uuid) returns void language sql security invoker set search_path='' as $$ select private.mf_excluir_movimentacao(p_id); $$;
revoke all on function private.mf_excluir_movimentacao(uuid) from public,anon,authenticated;
grant execute on function private.mf_excluir_movimentacao(uuid) to authenticated;
create function public.mf_criar_contas(p_request_id uuid,p_descricao text,p_tipo text,p_categoria text,p_valor numeric,p_vencimento date,p_parcelas integer) returns uuid language sql security invoker set search_path='' as $$ select private.mf_criar_contas(p_request_id,p_descricao,p_tipo,p_categoria,p_valor,p_vencimento,p_parcelas); $$;
revoke all on function private.mf_criar_contas(uuid,text,text,text,numeric,date,integer) from public,anon,authenticated;
grant execute on function private.mf_criar_contas(uuid,text,text,text,numeric,date,integer) to authenticated;
create function public.mf_liquidar_conta(p_conta_id uuid,p_data date) returns void language sql security invoker set search_path='' as $$ select private.mf_liquidar_conta(p_conta_id,p_data); $$;
revoke all on function private.mf_liquidar_conta(uuid,date) from public,anon,authenticated;
grant execute on function private.mf_liquidar_conta(uuid,date) to authenticated;
create function public.mf_reabrir_conta(p_conta_id uuid) returns void language sql security invoker set search_path='' as $$ select private.mf_reabrir_conta(p_conta_id); $$;
revoke all on function private.mf_reabrir_conta(uuid) from public,anon,authenticated;
grant execute on function private.mf_reabrir_conta(uuid) to authenticated;
create function public.mf_excluir_conta(p_id uuid) returns void language sql security invoker set search_path='' as $$ select private.mf_excluir_conta(p_id); $$;
revoke all on function private.mf_excluir_conta(uuid) from public,anon,authenticated;
grant execute on function private.mf_excluir_conta(uuid) to authenticated;

-- Execução somente para sessão autenticada; nenhuma chave administrativa no navegador.
revoke all on function public.mf_snapshot(),public.mf_salvar_movimentacao(uuid,uuid,text,text,text,numeric,date),public.mf_excluir_movimentacao(uuid),public.mf_criar_contas(uuid,text,text,text,numeric,date,integer),public.mf_liquidar_conta(uuid,date),public.mf_reabrir_conta(uuid),public.mf_excluir_conta(uuid) from public,anon,authenticated;
grant execute on function public.mf_snapshot(),public.mf_salvar_movimentacao(uuid,uuid,text,text,text,numeric,date),public.mf_excluir_movimentacao(uuid),public.mf_criar_contas(uuid,text,text,text,numeric,date,integer),public.mf_liquidar_conta(uuid,date),public.mf_reabrir_conta(uuid),public.mf_excluir_conta(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
