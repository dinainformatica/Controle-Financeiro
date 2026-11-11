import { supabase } from "./supabase"

export async function excluirConta(id) {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if(authError || !user) {
        throw new Error('Sessão inválida')
    }

    const  { data, error } = await supabase
        .from('contas')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('status', 'pendente')
        .select('id')

    if (error) throw error
    if(!data?.length) {
        throw new Error('Conta não encontrada ou já liquidada.')
    }
}

export async function listarContas() {
    const { data, error } = await supabase
        .from('contas')
        .select('*')
        .order('vencimento', {ascending: true})

    if(error) throw error
    return data ?? []
}

export async function criarContas(dados) {
    const { error } = await supabase.rpc('criar_contas', {
        p_descricao: dados.descricao,
        p_tipo: dados.tipo,
        p_categoria: dados.categoria,
        p_valor: Number(dados.valor),
        p_vencimento: dados.vencimento,
        p_parcelas: Number(dados.parcelas)
    })

    if (error) throw error
}

export async function liquidarContas(id, data) {
    const { error } = await supabase.rpc('liquidar_conta', {
        p_conta_id: id,
        p_data: data
    })

    if (error) throw error
}

export async function reabrirConta(id) {
    const { error } = await supabase.rpc('reabrir_conta', {
        p_conta_id: id
    })

    if (error) throw error
}