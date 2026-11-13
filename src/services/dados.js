import { supabase, modoDemo } from './supabase'
import { lerDemo } from './demo'
export async function rpc(nome, parametros = {}) {
  if (!supabase) throw new Error('Conecte seu projeto Supabase para usar dados reais.')
  const {data:auth,error:authError}=await supabase.auth.getUser()
  if(authError || !auth.user) throw new Error('Sessão expirada. Entre novamente.')
  const {data,error}=await supabase.rpc(nome,parametros)
  if(error) {
    if(['PGRST202','42883','42P01'].includes(error.code)) throw new Error('A migração da Etapa 6 ainda precisa ser aplicada neste Supabase.')
    throw new Error(error.message || 'Não foi possível concluir a operação.')
  }
  return data
}
export async function carregarDados() {
  if(modoDemo()) { const dados=lerDemo(); return { movimentacoes:[...dados.movimentacoes].sort((a,b)=>b.data.localeCompare(a.data)||b.id.localeCompare(a.id)),contas:[...dados.contas].sort((a,b)=>a.vencimento.localeCompare(b.vencimento)||a.id.localeCompare(b.id)) } }
  const dados=await rpc('mf_snapshot')
  if(!dados || !Array.isArray(dados.movimentacoes) || !Array.isArray(dados.contas)) throw new Error('Resposta inválida do banco. Atualize a migração da Etapa 6.')
  return dados
}
