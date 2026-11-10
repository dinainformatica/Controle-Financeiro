import { supabase } from './supabase'

export async function listarMovimentacoes() {
    const { data, error } = await supabase
        .from('movimentacoes')
        .select('*')
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
}

export async function salvarMovimentacoes(dados, id = null) {
    const {
        data: { user },
        error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
        throw new Error('Sessão inválida. Faça login novamente.')
    }

    const registro = {
        descricao: dados.descricao.trim(),
        tipo: dados.tipo,
        categoria: dados.categoria.trim(),
        valor: Number(dados.valor),
        data: dados.data
    }

    if (!registro.descricao || !registro.categoria || !Number.isFinite(registro.valor) || registro.valor <= 0) {
        throw new Error('Preencha os campos com valores válidos.')
    }

    if (id) {
        const { data, error } = await supabase
            .from('movimentacoes')
            .update(registro)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error
        return data
    }

    const { data, error } = await supabase
        .from('movimentacoes')
        .insert({
            ...registro,
            user_id: user.id
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function excluirMovimentacao(id) {
    const {
        data: { user }, 
        error: authError 
    } = await supabase.auth.getUser()

    if(authError || !user) {
        throw new Error('Sessão inválida. Faça o login')
    }

    const { data, error } = await supabase
        .from('movimentacoes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id')
        .single()

    if(error) throw error
    return data
}