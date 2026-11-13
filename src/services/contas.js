import { modoDemo } from './supabase'
import { carregarDados, rpc } from './dados'
import { criarContasDemo, liquidarDemo, reabrirDemo, excluirContaDemo } from './demo'
import { validarRegistro, dataValida, dataHoje } from '../utils/financeiro'
export async function listarContas() { return (await carregarDados()).contas }
export async function criarContas(dados) {
  const r=validarRegistro(dados,true)
  if(modoDemo()) return criarContasDemo(r)
  return rpc('mf_criar_contas',{p_request_id:r.request_id||crypto.randomUUID(),p_descricao:r.descricao,p_tipo:r.tipo,p_categoria:r.categoria,p_valor:r.valor,p_vencimento:r.vencimento,p_parcelas:Number(r.parcelas)})
}
export async function liquidarContas(id,data) {
  if(!dataValida(data) || data>dataHoje()) throw new Error('Use uma data de pagamento válida, até hoje.')
  if(modoDemo()) return liquidarDemo(id,data)
  return rpc('mf_liquidar_conta',{p_conta_id:id,p_data:data})
}
export async function reabrirConta(id) {
  if(modoDemo()) return reabrirDemo(id)
  return rpc('mf_reabrir_conta',{p_conta_id:id})
}
export async function excluirConta(id) {
  if(modoDemo()) return excluirContaDemo(id)
  return rpc('mf_excluir_conta',{p_id:id})
}
