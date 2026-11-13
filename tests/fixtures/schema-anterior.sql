-- Esquema anterior, sem dados pessoais, usado em testes de compatibilidade.
create table public.contas (
"id" uuid default gen_random_uuid() not null,
"user_id" uuid not null,
"descricao" text not null,
"tipo" text not null,
"categoria" text not null,
"valor" numeric(14,2) not null,
"vencimento" date not null,
"status" text default 'pendente'::text not null,
"data_pagamento" date,
"grupo_parcelamento" uuid,
"parcela_numero" integer default 1 not null,
"total_parcelas" integer default 1 not null,
"created_at" timestamp with time zone default now() not null
);
create table public.movimentacoes (
"id" uuid default gen_random_uuid() not null,
"user_id" uuid not null,
"descricao" text not null,
"tipo" text not null,
"categoria" text not null,
"valor" numeric(14,2) not null,
"data" date not null,
"created_at" timestamp with time zone default now() not null,
"conta_id" uuid
);
alter table public."movimentacoes" add constraint "movimentacoes_pkey" PRIMARY KEY (id);
alter table public."contas" add constraint "contas_pkey" PRIMARY KEY (id);
alter table public."movimentacoes" add constraint "movimentacoes_categoria_check" CHECK (((char_length(TRIM(BOTH FROM categoria)) >= 1) AND (char_length(TRIM(BOTH FROM categoria)) <= 80)));
alter table public."movimentacoes" add constraint "movimentacoes_conta_id_fkey" FOREIGN KEY (conta_id) REFERENCES contas(id) ON DELETE RESTRICT;
alter table public."movimentacoes" add constraint "movimentacoes_descricao_check" CHECK (((char_length(TRIM(BOTH FROM descricao)) >= 1) AND (char_length(TRIM(BOTH FROM descricao)) <= 150)));
alter table public."movimentacoes" add constraint "movimentacoes_tipo_check" CHECK ((tipo = ANY (ARRAY['receita'::text, 'despesa'::text])));
alter table public."movimentacoes" add constraint "movimentacoes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."movimentacoes" add constraint "movimentacoes_valor_check" CHECK ((valor > (0)::numeric));
alter table public."contas" add constraint "contas_categoria_check" CHECK (((char_length(TRIM(BOTH FROM categoria)) >= 1) AND (char_length(TRIM(BOTH FROM categoria)) <= 80)));
alter table public."contas" add constraint "contas_check" CHECK ((parcela_numero <= total_parcelas));
alter table public."contas" add constraint "contas_check1" CHECK ((((status = 'pendente'::text) AND (data_pagamento IS NULL)) OR ((status = 'pago'::text) AND (data_pagamento IS NOT NULL))));
alter table public."contas" add constraint "contas_descricao_check" CHECK (((char_length(TRIM(BOTH FROM descricao)) >= 1) AND (char_length(TRIM(BOTH FROM descricao)) <= 150)));
alter table public."contas" add constraint "contas_parcela_numero_check" CHECK ((parcela_numero > 0));
alter table public."contas" add constraint "contas_status_check" CHECK ((status = ANY (ARRAY['pendente'::text, 'pago'::text])));
alter table public."contas" add constraint "contas_tipo_check" CHECK ((tipo = ANY (ARRAY['pagar'::text, 'receber'::text])));
alter table public."contas" add constraint "contas_total_parcelas_check" CHECK ((total_parcelas > 0));
alter table public."contas" add constraint "contas_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."contas" add constraint "contas_valor_check" CHECK ((valor > (0)::numeric));
CREATE INDEX idx_contas_usuario_vencimento ON public.contas USING btree (user_id, vencimento);
CREATE INDEX idx_movimentacoes_usuario_data ON public.movimentacoes USING btree (user_id, data DESC);
CREATE UNIQUE INDEX idx_movimentacoes_conta ON public.movimentacoes USING btree (conta_id) WHERE (conta_id IS NOT NULL);
CREATE OR REPLACE FUNCTION public.liquidar_conta(p_conta_id uuid, p_data date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_usuario uuid := (select auth.uid());
  v_conta public.contas%rowtype;
begin
  if v_usuario is null or p_data is null then
    raise exception 'Usuário ou data inválida';
  end if;

  select *
  into v_conta
  from public.contas
  where id = p_conta_id
    and user_id = v_usuario
  for update;

  if not found then
    raise exception 'Conta não encontrada';
  end if;

  if v_conta.status <> 'pendente' then
    raise exception 'Conta já liquidada';
  end if;

  insert into public.movimentacoes (
    user_id, conta_id, descricao, tipo,
    categoria, valor, data
  )
  values (
    v_usuario,
    v_conta.id,
    v_conta.descricao,
    case when v_conta.tipo = 'pagar'
      then 'despesa' else 'receita' end,
    v_conta.categoria,
    v_conta.valor,
    p_data
  );

  update public.contas
  set status = 'pago',
      data_pagamento = p_data
  where id = v_conta.id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.criar_contas(p_descricao text, p_tipo text, p_categoria text, p_valor numeric, p_vencimento date, p_parcelas integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_usuario uuid := (select auth.uid());
  v_grupo uuid := gen_random_uuid();
  v_total_centavos bigint;
  v_base bigint;
  v_resto bigint;
  v_centavos bigint;
  v_valor numeric(14,2);
  v_indice integer;
begin
  if v_usuario is null then
    raise exception 'Usuário não autenticado';
  end if;

  if p_descricao is null
     or length(trim(p_descricao)) not between 1 and 150
     or p_categoria is null
     or length(trim(p_categoria)) not between 1 and 80
     or p_tipo is null
     or p_tipo not in ('pagar', 'receber')
     or p_vencimento is null
     or p_valor is null
     or p_valor <= 0
     or p_valor > 999999999999.99
     or p_valor <> round(p_valor, 2)
     or p_parcelas is null
     or p_parcelas not between 1 and 120
  then
    raise exception 'Dados da conta inválidos';
  end if;

  v_total_centavos := (p_valor * 100)::bigint;

  if v_total_centavos < p_parcelas then
    raise exception 'O valor é insuficiente para a quantidade de parcelas';
  end if;

  v_base := v_total_centavos / p_parcelas;
  v_resto := mod(v_total_centavos, p_parcelas);

  for v_indice in 1..p_parcelas loop
    v_centavos := v_base +
      case when v_indice <= v_resto then 1 else 0 end;

    v_valor := v_centavos / 100.0;

    insert into public.contas (
      user_id,
      descricao,
      tipo,
      categoria,
      valor,
      vencimento,
      grupo_parcelamento,
      parcela_numero,
      total_parcelas
    )
    values (
      v_usuario,
      trim(p_descricao),
      p_tipo,
      trim(p_categoria),
      v_valor,
      (
        p_vencimento
        + make_interval(months => v_indice - 1)
      )::date,
      case when p_parcelas > 1 then v_grupo else null end,
      v_indice,
      p_parcelas
    );
  end loop;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.proteger_movimentacao_vinculada()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  -- Somente funções executadas pelo proprietário
  -- administrativo podem manipular vínculos.
  if current_user <> 'postgres' then

    if tg_op = 'INSERT' and new.conta_id is not null then
      raise exception 'Use a liquidação para criar esta movimentação';
    end if;

    if tg_op = 'UPDATE' and (
      old.conta_id is not null or new.conta_id is not null
    ) then
      raise exception 'Movimentação vinculada protegida';
    end if;

    if tg_op = 'DELETE' and old.conta_id is not null then
      raise exception 'Movimentação vinculada protegida';
    end if;

  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.proteger_status_conta()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if current_user <> 'postgres' then
    if tg_op = 'INSERT' then
      if new.status <> 'pendente'
         or new.data_pagamento is not null then
        raise exception 'Nova conta deve começar pendente';
      end if;
      return new;
    end if;

    if tg_op = 'UPDATE' then
      if old.status <> 'pendente'
         or new.status <> 'pendente'
         or old.data_pagamento is not null
         or new.data_pagamento is not null
         or new.user_id is distinct from old.user_id then
        raise exception 'Alteração de conta protegida';
      end if;
      return new;
    end if;

    if tg_op = 'DELETE' then
      if old.status <> 'pendente' then
        raise exception 'Reabra a conta antes de excluir';
      end if;
      return old;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.reabrir_conta(p_conta_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_usuario uuid := (select auth.uid());
  v_conta public.contas%rowtype;
begin
  if v_usuario is null then
    raise exception 'Usuário não autenticado';
  end if;

  select *
  into v_conta
  from public.contas
  where id = p_conta_id
    and user_id = v_usuario
  for update;

  if not found then
    raise exception 'Conta não encontrada';
  end if;

  if v_conta.status <> 'pago' then
    raise exception 'Conta já está pendente';
  end if;

  delete from public.movimentacoes
  where conta_id = v_conta.id
    and user_id = v_usuario;

  update public.contas
  set status = 'pendente',
      data_pagamento = null
  where id = v_conta.id;
end;
$function$
;
CREATE TRIGGER trg_proteger_movimentacao BEFORE INSERT OR DELETE OR UPDATE ON public.movimentacoes FOR EACH ROW EXECUTE FUNCTION proteger_movimentacao_vinculada();
CREATE TRIGGER trg_proteger_status_conta BEFORE INSERT OR DELETE OR UPDATE ON public.contas FOR EACH ROW EXECUTE FUNCTION proteger_status_conta();
grant all on public.contas,public.movimentacoes to anon,authenticated;
alter table public.contas enable row level security;
alter table public.movimentacoes enable row level security;
create policy "Excluir minhas contas" on public."contas" for DELETE to authenticated using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Editar minhas contas" on public."contas" for UPDATE to authenticated using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Cadastrar minhas contas" on public."contas" for INSERT to authenticated with check (((( SELECT auth.uid() AS uid) = user_id) AND (status = 'pendente'::text) AND (data_pagamento IS NULL)));
create policy "Consultar minhas contas" on public."contas" for SELECT to authenticated using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Excluir minhas movimentacoes" on public."movimentacoes" for DELETE to authenticated using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Editar minhas movimentacoes" on public."movimentacoes" for UPDATE to authenticated using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Cadastrar minhas movimentacoes" on public."movimentacoes" for INSERT to authenticated with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Visualizar minhas movimentacoes" on public."movimentacoes" for SELECT to authenticated using ((( SELECT auth.uid() AS uid) = user_id));

