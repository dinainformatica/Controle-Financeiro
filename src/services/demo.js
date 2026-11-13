import { parcelasExatas, validarRegistro, dataValida, dataHoje } from '../utils/financeiro'
const chave = 'mf-demo-data-v1'
const id = () => crypto.randomUUID()
function iniciais() {
  const hoje = new Date()
  const movimentacoes = [], contas = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const mes = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const itens = [['Salário mensal','receita','Salário',4200,2],['Serviços de informática','receita','Serviços',750+i*85,4],['Aluguel','despesa','Moradia',1200,5],['Supermercado','despesa','Alimentação',690+i*21,7],['Combustível','despesa','Transporte',280+i*8,10],['Internet','despesa','Serviços',119.90,11]]
    for (const [descricao,tipo,categoria,valor,dia] of itens) movimentacoes.push({ id:id(),descricao,tipo,categoria,valor,data:`${mes}-${String(dia).padStart(2,'0')}`,created_at:d.toISOString(),conta_id:null })
  }
  const mes = dataHoje().slice(0,7)
  for(const [descricao,tipo,categoria,valor,dia] of [['Energia elétrica','pagar','Moradia',187.45,'09'],['Plano de saúde','pagar','Saúde',310,'20'],['Manutenção de computadores','receber','Serviços',900,'25']]) contas.push({id:id(),descricao,tipo,categoria,valor,vencimento:mes+'-'+dia,status:'pendente',parcela_numero:1,total_parcelas:1})
  return { movimentacoes, contas }
}
export function lerDemo() {
  const salvo = localStorage.getItem(chave)
  if (salvo) return JSON.parse(salvo)
  const dados = iniciais(); localStorage.setItem(chave,JSON.stringify(dados)); return dados
}
function alterar(acao) {
  const dados = lerDemo(); const resultado = acao(dados)
  localStorage.setItem(chave,JSON.stringify(dados)); return resultado
}
export function resetarDemo() { localStorage.removeItem(chave); return lerDemo() }
export function salvarDemo(dados, registroId) {
  const registro = validarRegistro(dados)
  return alterar(db => {
    if(registroId) {
      const atual = db.movimentacoes.find(m=>m.id===registroId)
      if (!atual || atual.conta_id) throw new Error('Baixas vinculadas devem ser gerenciadas em Contas.')
      Object.assign(atual,registro);return atual
    }
    const novo = { ...registro, id:id(),conta_id:null,created_at:new Date().toISOString() };db.movimentacoes.push(novo);return novo
  })
}
export function excluirMovDemo(registroId) {
  return alterar(db => {
    const atual = db.movimentacoes.find(m=>m.id===registroId)
    if(!atual || atual.conta_id) throw new Error('Baixas vinculadas devem ser gerenciadas em Contas.')
    db.movimentacoes=db.movimentacoes.filter(m=>m.id!==registroId)
  })
}
export function criarContasDemo(dados) {
  const registro = validarRegistro(dados,true)
  return alterar(db => {
    const grupo=id()
    for (const [i,parcela] of parcelasExatas(registro.valor,Number(registro.parcelas),registro.vencimento).entries()) db.contas.push({...registro,...parcela,id:id(),grupo_id:grupo,status:'pendente',parcela_numero:i+1,total_parcelas:Number(registro.parcelas)})
  })
}
export function liquidarDemo(contaId,data) {
  if(!dataValida(data) || data > dataHoje()) throw new Error('Use uma data de pagamento válida, até hoje.')
  return alterar(db => {
    const conta=db.contas.find(c=>c.id===contaId)
    if(!conta) throw new Error('Conta não encontrada.')
    if(conta.status==='pago') return
    db.movimentacoes.push({id:id(),conta_id:conta.id,descricao:conta.descricao,tipo:conta.tipo==='pagar'?'despesa':'receita',categoria:conta.categoria,valor:conta.valor,data,created_at:new Date().toISOString()})
    conta.status='pago';conta.data_pagamento=data
  })
}
export function reabrirDemo(contaId) {
  return alterar(db => {
    const conta=db.contas.find(c=>c.id===contaId)
    if(!conta) throw new Error('Conta não encontrada.')
    db.movimentacoes=db.movimentacoes.filter(m=>m.conta_id!==contaId)
    conta.status='pendente';conta.data_pagamento=null
  })
}
export function excluirContaDemo(contaId) {
  return alterar(db => {
    const conta=db.contas.find(c=>c.id===contaId)
    if(!conta || conta.status==='pago') throw new Error('Somente contas pendentes podem ser excluídas.')
    db.contas=db.contas.filter(c=>c.id!==contaId)
  })
}
