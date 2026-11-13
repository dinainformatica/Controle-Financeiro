import test from 'node:test'
import assert from 'node:assert/strict'
import { parcelasExatas, validarRegistro, analisar, gerarCSV, csvSeguro } from '../src/utils/financeiro.js'
const filtros={inicio:'2026-01-01',fim:'2026-03-31',categoria:'',tipo:'',base:'caixa'}
test('parcelas preservam cada centavo e o dia original em meses curtos',()=>{
 const p=parcelasExatas('100.00',3,'2026-01-31')
 assert.deepEqual(p,[{valor:33.34,vencimento:'2026-01-31'},{valor:33.33,vencimento:'2026-02-28'},{valor:33.33,vencimento:'2026-03-31'}])
 assert.equal(p.reduce((s,r)=>s+Math.round(r.valor*100),0),10000)
})
test('validação rejeita datas inexistentes, centavos extras e parcelas inválidas',()=>{
 const r={descricao:'Teste',tipo:'pagar',categoria:'Outros',valor:'12.00',vencimento:'2026-02-28',parcelas:2}
 assert.throws(()=>validarRegistro({...r,vencimento:'2026-02-30'},true))
 assert.throws(()=>validarRegistro({...r,valor:'12.001'},true))
 assert.throws(()=>validarRegistro({...r,parcelas:121},true))
 assert.throws(()=>validarRegistro({...r,valor:'0.01'},true))
 assert.throws(()=>validarRegistro({...r,tipo:'invalido'},true))
})
test('caixa não soma novamente contas pagas; filtros combinados e meses vazios',()=>{
 const mov=[{id:'a',descricao:'Entrada',categoria:'Serviços',tipo:'receita',valor:100,data:'2026-01-01'}, {id:'b',conta_id:'c',descricao:'Saída',categoria:'Moradia',tipo:'despesa',valor:30.10,data:'2026-03-31'}]
 const contas=[{id:'c',descricao:'Saída',categoria:'Moradia',tipo:'pagar',valor:30.10,vencimento:'2026-02-01',status:'pago'}]
 const r=analisar(mov,contas,filtros)
 assert.equal(r.resultado,69.9); assert.equal(r.despesas,30.1);assert.equal(r.evolucao.length,3);assert.equal(r.evolucao[1].receitas,0)
 assert.equal(analisar(mov,contas,{...filtros,categoria:'Moradia',tipo:'despesa'}).linhas.length,1)
 assert.equal(analisar(mov,contas,{...filtros,base:'contas'}).linhas.length,1)
 assert.throws(()=>analisar([],[],{...filtros,inicio:'2026-04-01'}))
})
test('CSV inclui todos os registros e neutraliza fórmulas, aspas e delimitadores',()=>{
 const mov=Array.from({length:1005},(_,i)=>({id:String(i),descricao:i===0?'=HYPERLINK("malicioso");x':'Teste '+i,categoria:'Outros',tipo:'receita',valor:0.1,data:'2026-02-01'}))
 const r=analisar(mov,[],filtros),csv=gerarCSV(r,filtros)
 assert.equal(r.receitas,100.5);assert.equal(r.linhas.length,1005);assert.equal(csv.split('\r\n').length,1010)
 assert.ok(csv.includes("'=HYPERLINK")); assert.ok(csv.startsWith('\uFEFF'))
 assert.equal(csvSeguro('  @SUM(A1)'), '"\'  @SUM(A1)"')
})
