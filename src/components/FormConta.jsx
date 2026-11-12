import { useState } from 'react'

const  hoje = () => {
    const data = new Date()
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
}

export default function FormConta({ onSalvar, onCancelar }) {
    const [form, setForm] = useState({
        descricao: '',
        tipo: 'pagar',
        categoria: 'Moradia',
        valor: '',
        vencimento: hoje(),
        parcelas: 1
    })

    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')

    const categorias = form.tipo === 'pagar' ? ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Cartão', 'Serviços', 'Outros'] : ['Salário', 'Serviço', 'Vendas', 'Aluguel', 'Outros']

    function alterar(campo, valor) {
        setForm(atual => ({ ...atual, [campo]: valor}))
    }

    async function enviar(e) {
        e.preventDefault()
        setErro('')
        setSalvando(true)

        try {
            await onSalvar(form)
        } catch (error) {
            setErro(error.message || 'Erro ao cadastrar conta')
        } finally {
            setSalvando(false)
        }
    }

    return (
        <form onSubmit={enviar}>
            {erro && <div className='alert alert-danger'>{erro}</div>}

            <div className="row g-3">
                <div className="col-md-6">
                    <label className='form-label'>
                        Tipo de conta
                    </label>

                    <select
                        className='form-select'
                        value={form.tipo}
                        onChange={e => {
                            const tipo = e.target.value
                            setForm(atual => ({
                                ...atual,
                                tipo,
                                categoria: tipo === 'pagar' ? 'Moradia' : 'Serviços'
                            }))
                        }}
                    >
                        <option value="pagar">Conta a pagar</option>
                        <option value="receber">Conta a receber</option>
                    </select>
                </div>

                <div className="col-md-6">
                    <label className='form-label'>Categoria</label>

                    <select
                        className='form-select'
                        value={form.categoria}
                        onChange={e => alterar('categoria', e.target.value)}
                    >
                        {categorias.map(item => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="col-12">
                    <label className='form-label'>
                        Descrição
                    </label>

                    <input 
                        className='form-control'
                        placeholder='Ex.: Compra de notebook'
                        value={form.descricao}
                        onChange={e => alterar('descricao', e.target.value)}
                        maxLength={150}
                        required
                    />
                </div>

                <div className="col-md-4">
                    <label className='form-label'>Valor total (R$)</label>
                    <input
                        type='number'
                        className='form-control'
                        min="0.01"
                        step="0.01"
                        value={form.valor}
                        onChange={e => alterar('valor', e.target.value)}
                        required
                    />
                </div>

                <div className="col-md-4">
                    <label className='form-label'>Primeiro vencimento</label>
                    <input
                        type='date'
                        className='form-control'
                        value={form.vencimento}
                        onChange={e => alterar('vencimento', e.target.value)}
                        required
                    />
                </div>

                <div className="col-md-4">
                    <label className='form-label'></label>
                    <input
                        type='number'
                        className='form-control'
                        min="1"
                        max="120"
                        value={form.parcelas}
                        onChange={e => alterar('parcelas', e.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="alert alert-light border mt-3">
                {Number(form.parcelas) > 1 ? `O sistema criará ${form.parcelas} parcelas mensais.` : 'Será criada uma conta com pagamento único.'}
            </div>

            <div className="d-flex justify-content-end gap-2 mt-2">
                <button
                    type='button'
                    className='btn btn-outline-secondary'
                >
                    Cancelar
                </button>

                <button
                    type='submit'
                    className='btn btn-success'
                    disabled={salvando}
                >
                    {salvando ? 'Salvando...' : 'Cadastrar conta'}
                </button>
            </div>
        </form>
    )
}