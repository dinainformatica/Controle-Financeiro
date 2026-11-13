import { useState, useEffect, useMemo } from "react";
import FormConta from "../components/FormConta";
import {
    listarContas,
    criarContas,
    liquidarContas,
    reabrirConta,
    excluirConta
} from '../services/contas'

const moeda = valor => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
}).format(valor)

const hoje = () => {
    const d = new Date()
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
    ].join('-')
}

const formatarData = valor => valor ? valor.split('-').reverse().join('/') : '-'

function Contas() {
    const [contas, setContas] = useState([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')
    const [formAberto, setFormAberto] = useState(false)
    const [tipo, setTipo] = useState('todos')
    const [status, setStatus] = useState('todos')
    const [mes, setMes] = useState('')
    const [processando, setProcessando] = useState(null)

    async function carregar() {
        setCarregando(true)

        try {
            const dados = await listarContas()
            setContas(dados)
            setErro('')
        } catch (error) {
            setErro(error.message)
        } finally {
            setCarregando(false)
        }
    }

    useEffect(() => {
        carregar()
    }, [])

    const situacao = conta => {
        if (conta.status === 'pago') return 'pago'
        return conta.vencimento < hoje() ? 'atrasado' : 'pendente'

    }

    const filtradas = useMemo(() => contas.filter(conta => {
        if (tipo != 'todos' && conta.tipo != tipo) return false
        if (status != 'todos' && situacao(conta) !== status) return false
        if (mes && !conta.vencimento.startsWith(mes)) return false
        return true
    }), [contas, tipo, status, mes])

    const totalPagar = contas
        .filter(c => c.tipo === 'pagar' && c.status === 'pendente')
        .reduce((s, c) => s + Number(c.valor), 0)

    const totalReceber = contas
        .filter(c => c.tipo === 'receber' && c.status === 'pendente')
        .reduce((s, c) => s + Number(c.valor), 0)

    const totalAtrasado = contas
        .filter(c => c.status === 'pendente' && c.vencimento < hoje())
        .reduce((s, c) => s + Number(c.valor), 0)

    async function salvar(dados) {
        await criarContas(dados)
        await carregar()
        setFormAberto(false)
    }

    async function executar(id, operacao) {
        setErro('')
        setProcessando(id)

        try {
            await operacao()
            await carregar()
        } catch (error) {
            setErro(error.message || 'Erro ao processar operação')
        } finally {
            setProcessando(null)
        }
    }

    function confirmar(conta) {
        const data = window.prompt(
            'Informe a data do pagamento (AAAA-MM-DD):',
            hoje()
        )

        if (data === null) return

        if (!/^\d{4}-\d{2}-\d{2}$/.test(data) ||
            Number.isNaN(new Date(`${data}T12:00:00`).getTime()) ||
            new Date(`${data}T12:00:00`).toISOString().slice(0, 10) !== data) {
            setErro('Informe uma data válida no formato AAAA-MM-DD.')
            return
        }

        executar(conta.id, () => liquidarContas(conta.id, data))
    }

    function desfazer(conta) {
        if (!window.confirm('Desfazer a liquidação desta conta?'))
            return
        executar(conta.id, () => reabrirConta(conta.id))
    }


    return (
        <div>
            <div className="dashboard-heading">
                <div>
                    <h2>Contas a pagar e receber</h2>
                    <p>Organize vencimentos, pagamentos e parcelas.</p>
                </div>

                <button
                    className="btn btn-success"
                    onClick={() => setFormAberto(true)}
                >
                    <i className="bi bi-plus-lg mt-2"></i>
                    Nova conta
                </button>
            </div>

            {erro && <div className="alert alert-danger">{erro}</div>}

            <div className="row g-3 mb-4">
                {[
                    { titulo: 'A pagar', valor: totalPagar, cor: 'icon-red', icone: 'arrow-up-right' },
                    { titulo: 'A receber', valor: totalReceber, cor: 'icon-green', icone: 'arrow-down-left' },
                    { titulo: 'Total atrasado', valor: totalAtrasado, cor: 'icon-purple', icone: 'exclamation-triangle' }
                ].map(card => (
                    <div className="col-md-4" key={card.titulo}>
                        <div className="finance-card">
                            <div className="d-flex justify-content-between">
                                <span className="card-label">
                                    {card.titulo}
                                </span>
                                <div className={`card-icon ${card.cor}`}>
                                    <i className={`bi bi-${card.icone}`}></i>
                                </div>
                            </div>

                            <h3 className="card-value">
                                {moeda(card.valor)}
                            </h3>
                            <span className="card-description">
                                Valores pendentes
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {formAberto && (
                <div className="content-card mb-4">
                    <div className="section-heading">
                        <h3>Cadastrar nova conta</h3>
                    </div>
                    <FormConta
                        onSalvar={salvar}
                        onCancelar={() => setFormAberto(false)}
                    />
                </div>
            )}

            <div className="content-card">
                <div className="row g-3 mb-4">
                    <div className="col-md-4">
                        <select aria-label="Filtrar tipo de conta" className="form-select" value={tipo} onChange={e => setTipo(e.target.value)}>
                            <option value="todos">Todas as contas</option>
                            <option value="pagar">A pagar</option>
                            <option value="receber">A receber</option>
                        </select>
                    </div>

                    <div className="col-md-4">
                        <select aria-label="Filtrar situação da conta" className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                            <option value="todos">Todos os status</option>
                            <option value="pendente">Pendentes</option>
                            <option value="atrasado">Atrasadas</option>
                            <option value="pago">Pagas / Recebidas</option>
                        </select>
                    </div>

                    <div className="col-md-4">
                        <input
                            type="month"
                            className="form-control"
                            value={mes}
                            onChange={e => setMes(e.target.value)}
                        />
                    </div>
                </div>

                {carregando ? (
                    <p className="text-secondary">Carregando contas...</p>
                ) : filtradas.length === 0 ? (
                    <p className="text-secondary text-center py-4">Nenhuma conta encontrada.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table finance-table align-middle">
                            <thead>
                                <tr>
                                    <th>Descrição</th>
                                    <th>Tipo</th>
                                    <th>Vencimento</th>
                                    <th>Valor</th>
                                    <th>Status</th>
                                    <th className="text-end">Ações</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filtradas.map(conta => {
                                    const atual = situacao(conta)
                                    const concluida = conta.status === 'pago'

                                    return (
                                        <tr key={conta.id}>
                                            <td>
                                                <strong>{conta.descricao}</strong>
                                                {conta.total_parcelas > 1 && (
                                                    <small className="d-block text-secondary">
                                                        Parcela {conta.parcela_numero}/{conta.total_parcelas}
                                                    </small>
                                                )}
                                            </td>

                                            <td>
                                                {conta.tipo === 'pagar' ? 'A pagar' : 'A receber'}
                                            </td>
                                            <td>{formatarData(conta.vencimento)}</td>
                                            <td>{moeda(Number(conta.valor))}</td>

                                            <td>
                                                <span className={`badge ${atual === 'pago' ? 'text-bg-success' : atual === 'atrasado' ? 'text-bg-danger' : 'text-bg-warning'}`}>
                                                    {atual === 'pago'
                                                        ? conta.tipo === 'pagar' ? 'Pago' : 'Recebido'
                                                        : atual === 'atrasado' ? 'Atrasado' : 'Pendente'}
                                                </span>
                                            </td>

                                            <td className="text-end">
                                                {concluida ? (
                                                    <button
                                                        className="btn btn-sm btn-outline-secondary"
                                                        disabled={!!processando}
                                                        onClick={() => desfazer(conta)}
                                                    >
                                                        Desfazer
                                                    </button>
                                                ) : (
                                                    <div className="d-flex justify-content-end gap-2">
                                                        <button className="btn btn-sm btn-success"
                                                        disabled={!!processando} 
                                                        onClick={() => confirmar(conta)}   
                                                    >
                                                            Confirmar
                                                        </button>

                                                        <button 
                                                            className="btn btn-sm btn-outline-danger"
                                                            title="Excluir conta"
                                                            disabled={!!processando}
                                                            aria-label={`Excluir ${conta.descricao}`}
                                                            onClick={() => { if (window.confirm('Excluir esta conta pendente?')) executar(conta.id, () => excluirConta(conta.id)) }}
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )

                }
            </div>
        </div>
    )
}

export default Contas