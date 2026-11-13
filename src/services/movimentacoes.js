import { modoDemo } from './supabase'
import { carregarDados, rpc } from './dados'
import { salvarDemo, excluirMovDemo } from './demo'
import { validarRegistro } from '../utils/financeiro'
export async function listarMovimentacoes() { return (await carregarDados()).movimentacoes }
export async function salvarMovimentacoes(dados,id=null) {
  const r=validarRegistro(dados)
  if(modoDemo()) return salvarDemo(r,id)
  return rpc('mf_salvar_movimentacao',{p_id:id,p_request_id:r.request_id||crypto.randomUUID(),p_descricao:r.descricao,p_tipo:r.tipo,p_categoria:r.categoria,p_valor:r.valor,p_data:r.data})
}
export async function excluirMovimentacao(id) {
  if(modoDemo()) return excluirMovDemo(id)
  return rpc('mf_excluir_movimentacao',{p_id:id})
}
