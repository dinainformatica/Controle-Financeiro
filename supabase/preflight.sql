-- Somente leitura: executar antes de aplicar a migração no projeto existente.
select table_name,column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name in ('contas','movimentacoes') order by table_name,ordinal_position;
select tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public' and tablename in ('contas','movimentacoes');
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('contas','movimentacoes');
select table_name,grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name in ('contas','movimentacoes');
select t.tgname,pg_get_triggerdef(t.oid) from pg_trigger t where t.tgrelid in (to_regclass('public.contas'),to_regclass('public.movimentacoes')) and not t.tgisinternal;
select p.proname,pg_get_function_identity_arguments(p.oid),p.prosecdef,p.proconfig,p.proacl,pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('criar_contas','liquidar_conta','reabrir_conta');
