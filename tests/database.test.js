import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222'
let n=10
const request=()=>`00000000-0000-4000-8000-${String(n++).padStart(12,'0')}`
test('migração PostgreSQL: isolamento, permissões, parcelas, idempotência, baixa e auditoria',async t=>{
 const db=new PGlite()
 try {
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${a}'),('${b}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`)
 await db.exec(await readFile(new URL('../supabase/migrations/20261113132931_etapa6_seguranca_relatorios.sql',import.meta.url),'utf8'))
 await db.exec(await readFile(new URL('../supabase/migrations/20261113133306_etapa6_indice_e_politicas_privadas.sql',import.meta.url),'utf8'))
 async function as(user,role='authenticated') { await db.exec(`reset role; select set_config('request.jwt.claim.sub','${user}',false); set role ${role};`) }
 async function snap(){ return (await db.query('select public.mf_snapshot() s')).rows[0].s }
 await as(a)
 const req=request()
 await t.test('criação atômica de parcelas com soma exata e reenvio sem duplicar',async()=>{
  const sql=`select public.mf_criar_contas($1,'Notebook','pagar','Educação',100,'2026-01-31',3)`
  await db.query(sql,[req]);await db.query(sql,[req]); const s=await snap()
  assert.equal(s.contas.length,3);assert.equal(s.contas.reduce((v,c)=>v+Math.round(c.valor*100),0),10000)
  assert.deepEqual(s.contas.map(c=>new Date(c.vencimento).toISOString().slice(0,10)),['2026-01-31','2026-02-28','2026-03-31'])
 })
 let conta=(await snap()).contas[0]
 await t.test('valores inválidos rejeitados no banco',async()=>{
  await assert.rejects(()=>db.query(`select public.mf_criar_contas($1,'X','pagar','Outros',1.001,'2026-01-01',1)`,[request()]))
  await assert.rejects(()=>db.query(`select public.mf_criar_contas($1,'X','pagar','Outros',0.01,'2026-01-01',2)`,[request()]))
  await assert.rejects(()=>db.query(`select public.mf_criar_contas($1,'X','pagar','Outros','NaN','2026-01-01',1)`,[request()]))
 })
 await t.test('baixa repetida gera uma única movimentação e protege edição/exclusão vinculada',async()=>{
  await db.query(`select public.mf_liquidar_conta($1,'2026-01-31')`,[conta.id]);await db.query(`select public.mf_liquidar_conta($1,'2026-01-31')`,[conta.id])
  const s=await snap();assert.equal(s.movimentacoes.length,1);assert.equal(s.contas[0].status,'pago');const m=s.movimentacoes[0]
  await assert.rejects(()=>db.query(`select public.mf_salvar_movimentacao($1,$2,'X','despesa','Outros',1,'2026-01-31')`,[m.id,request()]))
  await assert.rejects(()=>db.query(`select public.mf_excluir_movimentacao($1)`,[m.id]))
  await assert.rejects(()=>db.query(`select public.mf_excluir_conta($1)`,[conta.id]))
 })
 await t.test('usuário B não lê nem altera dados de A por RPC ou acesso direto',async()=>{
  await as(b);assert.equal((await snap()).contas.length,0)
  assert.equal((await db.query('select * from public.contas')).rows.length,0)
  await assert.rejects(()=>db.query(`select public.mf_liquidar_conta($1,'2026-01-31')`,[conta.id]))
  await assert.rejects(()=>db.query('update public.contas set user_id=$1 where id=$2',[b,conta.id]))
  await assert.rejects(()=>db.query('select public.mf_reabrir_conta($1)',[conta.id]))
  await as(a)
 })
 await t.test('escrita direta e acesso anônimo bloqueados; auditoria inacessível ao cliente',async()=>{
  await assert.rejects(()=>db.query('delete from public.movimentacoes'))
  await assert.rejects(()=>db.query('select * from private.mf_auditoria'))
  await as('','anon');await assert.rejects(()=>snap());await assert.rejects(()=>db.query('select * from public.contas'))
  await as(a)
 })
 await t.test('reabrir remove apenas a baixa vinculada e é idempotente',async()=>{
  await db.query('select public.mf_reabrir_conta($1)',[conta.id]);await db.query('select public.mf_reabrir_conta($1)',[conta.id]);const s=await snap()
  assert.equal(s.movimentacoes.length,0);assert.equal(s.contas[0].status,'pendente');assert.equal(s.contas[0].data_pagamento,null)
 })
 await t.test('movimentação manual: reenvio, edição e exclusão',async()=>{
  const req=request();const sql=`select public.mf_salvar_movimentacao(null,$1,'Salário','receita','Salário',4500,'2026-01-01') id`
  const id=(await db.query(sql,[req])).rows[0].id;await db.query(sql,[req]);assert.equal((await snap()).movimentacoes.length,1)
  await db.query(`select public.mf_salvar_movimentacao($1,$2,'Salário revisado','receita','Salário',4600,'2026-01-01')`,[id,request()]);assert.equal((await snap()).movimentacoes[0].valor,4600)
  await db.query('select public.mf_excluir_movimentacao($1)',[id]);assert.equal((await snap()).movimentacoes.length,0)
 })
 await t.test('snapshot não é truncado em mil registros e trilha de auditoria é gravada',async()=>{
  await db.exec('reset role');await db.exec(`insert into public.movimentacoes(user_id,descricao,tipo,categoria,valor,data) select '${a}','Registro '||g,'receita','Outros',0.1,'2026-02-01' from generate_series(1,1005) g;`)
  const logs=(await db.query('select count(*)::int n from private.mf_auditoria')).rows[0].n;assert.ok(logs>1005)
  await as(a);assert.equal((await snap()).movimentacoes.length,1005)
 })
 await t.test('constraint diferida rejeita conta paga sem baixa e rollback é completo',async()=>{
  await db.exec('reset role');await assert.rejects(()=>db.exec(`begin; update public.contas set status='pago',data_pagamento='2026-01-01' where id='${conta.id}'; commit;`));await db.exec('rollback');await as(a);assert.equal((await snap()).contas[0].status,'pendente')
 })
 } finally { await db.close() }
})

test('migração compatível com esquema anterior, preservando lançamentos e triggers',async()=>{
 const db=new PGlite()
 try {
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${a}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`)
 await db.exec(await readFile(new URL('./fixtures/schema-anterior.sql',import.meta.url),'utf8'))
 await db.exec(`insert into public.movimentacoes(user_id,descricao,tipo,categoria,valor,data) values('${a}','Registro anterior','receita','Outros',12.34,'2026-01-01');`)
 const hashAntes=(await db.query('select md5(jsonb_agg(to_jsonb(m) order by id)::text) h from public.movimentacoes m')).rows[0].h
 await db.exec(await readFile(new URL('../supabase/migrations/20261113132931_etapa6_seguranca_relatorios.sql',import.meta.url),'utf8'))
 await db.exec(await readFile(new URL('../supabase/migrations/20261113133306_etapa6_indice_e_politicas_privadas.sql',import.meta.url),'utf8'))
 assert.equal((await db.query('select md5(jsonb_agg(to_jsonb(m) order by id)::text) h from public.movimentacoes m')).rows[0].h,hashAntes)
 await db.exec(`select set_config('request.jwt.claim.sub','${a}',false);set role authenticated;`)
 const grupo=(await db.query(`select public.mf_criar_contas($1,'Conta teste','pagar','Outros',100,'2026-01-31',3) id`,[request()])).rows[0].id
 const contas=(await db.query('select * from public.contas where grupo_parcelamento=$1 order by parcela_numero',[grupo])).rows
 assert.equal(contas.length,3);assert.deepEqual(contas.map(c=>new Date(c.vencimento).toISOString().slice(0,10)),['2026-01-31','2026-02-28','2026-03-31'])
 await db.query(`select public.mf_liquidar_conta($1,'2026-01-31')`,[contas[0].id])
 assert.equal((await db.query('select public.mf_snapshot() s')).rows[0].s.movimentacoes.length,2)
 await db.query('select public.mf_reabrir_conta($1)',[contas[0].id])
 assert.equal((await db.query('select public.mf_snapshot() s')).rows[0].s.movimentacoes.length,1)
 } finally {await db.close()}
})
