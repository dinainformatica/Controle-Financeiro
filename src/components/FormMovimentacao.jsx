import { useEffect, useState } from "react";

const categorias = {
    receita: [
        'Salário', 'Serviços', 'Vendas', 'Investimentos', 'Outros'
    ],

    despesa: [
        'Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Cartão', 'Outros'
    ]
}

function FormMovimentacao({
    tipo,
    registro,
    onSalvar,
    onCancelar
}) {
    const [form, setForm] = useState({
        descricao: '',
        categoria: '',
        valor: '',
        data: new Date().toLocaleDateString('en-CA')
    })

    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')

    useEffect(() => {
        setForm({
            descricao: registro?.descricao ?? '',
            categoria: registro?.categoria ?? '',
            valor: registro?.valor ?? '',
            data: registro?.data ?? new Date().toLocaleDateString('en-CA')
        })
        setErro('')
    }, [registro, tipo])

    function alterar(campo, valor) {
        setForm(atual => ({ ...atual, [campo]: valor }))
    }

    async function enviar(e) {
        e.preventDefault()
        setErro('')
        setSalvando(true)

        try {
            await onSalvar({
                ...form,
                valor: Number(form.valor)
            }, registro?.id)
        } catch (error) {
            setErro(error.message || 'Erro ao salvar.')
        } finally {
            setSalvando(false)
        }
    }


    return (
        <form onSubmit={enviar}>
            {erro && (
                <div className="alert alert-danger">{erro}</div>
            )}

            <div className="mb-3">
                <label className="form-label">Descrição</label>
                <input
                    className="form-control"
                    value={form.descricao}
                    onChange={e => alterar('descricao', e.target.value)}
                    placeholder={tipo === 'receita' ? 'Ex.: Serviço de informática' : 'Ex:. Supermercado'}
                    maxLength={150}
                    required
                />
            </div>

            <div className="row g-3">
                <div className="col-md-6">
                    <label className="form-label">Valor (R$)</label>
                    <input
                        type="number"
                        className="form-control"
                        value={form.valor}
                        onChange={e => alterar('valor', e.target.value)}
                        min="0.01"
                        max="999999999999.99"
                        step="0.01"
                        placeholder="0,00"
                        required
                    />
                </div>

                <div className="col-md-6">
                    <label className="form-label">Data</label>
                    <input
                        type="date"
                        className="form-control"
                        value={form.data}
                        onChange={e => alterar('data', e.target.value)}
                        required
                    />
                </div>

                <div className="col-12">
                    <label className="form-label">Categoria</label>
                    <select
                        className="form-select"
                        value={form.categoria}
                        onChange={e => alterar('categoria', e.target.value)}
                        required
                    >
                        <option value="">Selecione uma categoria</option>
                        {categorias[tipo].map(categoria => (
                            <option key={categoria} value={categoria}>
                                {categoria}
                            </option>
                        ))}

                        {form.categoria &&
                            !categorias[tipo].includes(form.categoria) && (
                                <option value={form.categoria}>
                                    {form.categoria}
                                </option>
                            )}
                    </select>
                </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
                <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={onCancelar}
                    disabled={salvando}
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    className="btn btn-success"
                    disabled={salvando}
                >
                    <i className="bi bi-check-lg me-2"></i>
                    {salvando ? 'Salvando...' : registro ? 'Salvando alterações' : 'Cadastrar'}
                </button>
            </div>
        </form>
    )
}

export default FormMovimentacao