import { useEffect, useState, useMemo } from "react";
import FormMovimentacao from '../components/FormMovimentacao'

import {
    listarMovimentacoes,
    salvarMovimentacoes,
    excluirMovimentacao
} from '../services/movimentacoes'

const moeda = valor => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
}).format(valor)

const formatarData = data => {
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
}

const mesAtual = () => {
    const hoje = new Date()

    return `${hoje.getFullYear()}-${String(
        hoje.getMonth() + 1
    ).padStart(2, '0')}`
}

function Movimentacoes({ tipo }) {
    const [registros, setRegistros] = useState([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')
    const [formAberto, setFormAberto] = useState(false)
    const [editando, setEditando] = useState(null)
    const [busca, setBusca] = useState('')
    const [mes, setMes] = useState(mesAtual)
    const [categoria, setCategoria] = useState('')
    const [excluindo, setExcluindo] = useState(null)

    const titulo = tipo === 'receita' ? 'Receitas' : 'Despesas'

    async function carregar() {
        setCarregando(true)
        setErro('')

        try {
            setRegistros(await listarMovimentacoes())
        } catch (error) {
            setErro(error.message || 'Erro ao carregar dados.')
        } finally {
            setCarregando(false)
        }
    }

    useEffect(() => {
        let ativo = true

        async function carregarInicial() {
            try {
                const dados = await listarMovimentacoes()
                if (ativo) {
                    setRegistros(dados)
                    setErro('')
                }
            } catch (error) {
                if (ativo) setErro(error.message || 'Erro ao carregar dados.')
            } finally {
                if (ativo) setCarregando(false)
            }
        }

        carregarInicial()
        return () => { ativo = false }
    }, [tipo])

    const registrosTipo = useMemo(
        () => registros.filter(item => item.tipo === tipo),
        [registros, tipo]
    )

    const categorias = [...new Set(
        registrosTipo.map(item => item.categoria)
    )].sort()

    const filtrados = registrosTipo.filter(item => {
        const correspondeBusca = item.descricao
            .toLocaleLowerCase('pt-BR')
            .includes(busca.toLocaleLowerCase('pt-BR'))

        const correspondeMes = !mes || item.data.startsWith(mes)
        const correspondeCategoria = !categoria || item.categoria === categoria

        return correspondeBusca && correspondeMes && correspondeCategoria
    })

    const total = filtrados.reduce(
        (soma, item) => soma + Number(item.valor), 0
    )

    async function salvar(dados, id) {
        await salvarMovimentacoes({ ...dados, tipo }, id)
        setCarregando(true)
        await carregar()
        setFormAberto(false)
        setEditando(null)
    }

    async function excluir(item) {
        const confirmado = window.confirm(
            `Deseja realmente excluir "${item.descricao}"?`
        )

        if (!confirmado)
            return

        setExcluindo(item.id)
        setErro('')

        try {
            await excluirMovimentacao(item.id)
            setCarregando(true)
            await carregar()
        } catch (error) {
            setErro(error.message || 'Erro ao excluir.')
        } finally {
            setExcluindo(null)
        }
    }

    return (
        <div>
            <div className="dashboard-heading">
                <div>
                    <h2>Minhas {titulo.toLowerCase()}</h2>
                    <p>Gerencie seus lançamentos financeiros.</p>
                </div>

                <button
                    className="btn btn-success"
                    onClick={() => {
                        setEditando(null)
                        setFormAberto(true)
                    }}
                >
                    <i className="bi bi-plus-lg me-2"></i>
                    Nova {tipo}
                </button>
            </div>

            {erro && (
                <div className="alert alert-danger">
                    {erro}
                </div>
            )}

            <div className="finance-card mb-4">
                <span className="card-label">
                    Total {mes || categoria || busca ? 'filtrado' : 'registrado'}
                </span>

                <h3 className="card-value">
                    {moeda(total)}
                </h3>

                <span className="card-description">
                    {filtrados.length} movimentação(ões)
                </span>
            </div>

            {formAberto && (
                <div className="content-card mb-4">
                    <div className="section-heading">
                        <h3>{editando ? 'Editar' : 'Cadastrar'} {tipo}</h3>
                    </div>

                    <FormMovimentacao
                        tipo={tipo}
                        registro={editando}
                        onSalvar={salvar}
                        onCancelar={() => {
                            setFormAberto(false)
                            setEditando(null)
                        }}
                    />
                </div>
            )}

            <div className="content-card">
                <div className="row g-3 mb-4">
                    <div className="col-md-5">
                        <input
                            className="form-control"
                            aria-label="Buscar movimentações" placeholder="Buscar pela descrição..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                        />
                    </div>

                    <div className="col-md-3">
                        <input
                            type="month"
                            className="form-control"
                            value={mes}
                            onChange={e => setMes(e.target.value)}
                        />
                    </div>

                    <div className="col-md-4">
                        <select
                            className="form-select"
                            value={categoria}
                            onChange={e => setCategoria(e.target.value)}
                        >
                            <option value="">Todas as categorias</option>
                            {categorias.map(item => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {carregando ? (
                    <p className="text-secondary">Carregando movimentações...</p>
                ) : filtrados.length === 0 ? (
                    <div className="text-center py-5 text-secondary">
                        <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                        Nenhuma movimentação encontrada.
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table finance-table align-middle">
                            <thead>
                                <tr>
                                    <th>Descrição</th>
                                    <th>Categoria</th>
                                    <th>Data</th>
                                    <th>Valor</th>
                                    <th className="text-end">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.map(item => (
                                    <tr key={item.id}>
                                        <td className="fw-semibold">{item.descricao}{item.conta_id && <small className="d-block text-secondary">Baixa vinculada a uma conta</small>}</td>
                                        <td>{item.categoria}</td>
                                        <td>{formatarData(item.data)}</td>
                                        <td className={tipo === 'receita' ? 'text-success' : 'text-danger'}>
                                            {moeda(Number(item.valor))}
                                        </td>

                                        <td className="text-end">
                                            <button
                                                className="btn btn-sm btn-outline-primary me-2"
                                                disabled={!!item.conta_id}
                                                title={item.conta_id ? "Gerencie esta baixa na página Contas" : "Editar"}
                                                aria-label={`Editar ${item.descricao}`}
                                                onClick={() => {
                                                    setEditando(item)
                                                    setFormAberto(true)
                                                }}
                                            >
                                                <i className="bi bi-pencil"></i>
                                            </button>

                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                title="Excluir"
                                                aria-label={`Excluir ${item.descricao}`}
                                                disabled={!!excluindo || !!item.conta_id}
                                                onClick={() => excluir(item)}
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Movimentacoes