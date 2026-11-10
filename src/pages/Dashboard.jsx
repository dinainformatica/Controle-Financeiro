import { useEffect, useMemo, useState } from 'react'
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts'

import { listarMovimentacoes } from '../services/movimentacoes'

const moeda = valor =>
    new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor)

const dataLocal = () => {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    return `${ano}-${mes}`
}

function CardFinanceiro({ titulo, valor, icone, cor, descricao }) {
    return (
        <div className="col-12 col-sm-6 col-xl-3">
            <div className="finance-card">
                <div className="d-flex justify-content-between align-items-start">
                    <span className="card-label">{titulo}</span>
                    <div className={`card-icon ${cor}`}>
                        <i className={`bi bi-${icone}`}></i>
                    </div>
                </div>
                <h3 className="card-value">{moeda(valor)}</h3>
                <span className="card-description">{descricao}</span>
            </div>
        </div>
    )
}

function Dashboard() {
    const [registros, setRegistros] = useState([])
    const [mesSelecionado, setMesSelecionado] = useState(dataLocal)
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')

    useEffect(() => {
        let ativo = true

        async function carregar() {
            try {
                const dados = await listarMovimentacoes()
                if (ativo) setRegistros(dados)
            } catch (error) {
                if (ativo) setErro(error.message)
            } finally {
                if (ativo) setCarregando(false)
            }
        }

        carregar()
        return () => { ativo = false }
    }, [])

    const resumo = useMemo(() => {
        const doMes = registros.filter(item =>
            item.data.startsWith(mesSelecionado)
        )

        const receitas = doMes
            .filter(item => item.tipo === 'receita')
            .reduce((soma, item) => soma + Number(item.valor), 0)

        const despesas = doMes
            .filter(item => item.tipo === 'despesa')
            .reduce((soma, item) => soma + Number(item.valor), 0)

        const ultimoDia = `${mesSelecionado}-31`

        const saldo = registros
            .filter(item => item.data <= ultimoDia)
            .reduce((soma, item) => {
                const valor = Number(item.valor)
                return soma + (item.tipo === 'receita' ? valor : -valor)
            }, 0)

        return {
            receitas,
            despesas,
            saldo,
            resultado: receitas - despesas,
            movimentacoes: doMes
        }
    }, [registros, mesSelecionado])

    const grafico = useMemo(() => {
        const [ano, mes] = mesSelecionado.split('-').map(Number)

        return Array.from({ length: 6 }, (_, indice) => {
            const data = new Date(ano, mes - 1 - (5 - indice), 1)
            const chave = `${data.getFullYear()}-${String(
                data.getMonth() + 1
            ).padStart(2, '0')}`

            const itens = registros.filter(item => item.data.startsWith(chave))

            return {
                mes: data.toLocaleDateString('pt-BR', {
                    month: 'short',
                    year: '2-digit'
                }),
                receitas: itens
                    .filter(item => item.tipo === 'receita')
                    .reduce((s, item) => s + Number(item.valor), 0),
                despesas: itens
                    .filter(item => item.tipo === 'despesa')
                    .reduce((s, item) => s + Number(item.valor), 0)
            }
        })
    }, [registros, mesSelecionado])

    if (carregando) {
        return <p>Carregando informações financeiras...</p>
    }

    if (erro) {
        return <div className="alert alert-danger">{erro}</div>
    }

    return (
        <div>
            <div className="dashboard-heading">
                <div>
                    <h2>Visão geral</h2>
                    <p>Acompanhe suas finanças em tempo real após cada atualização.</p>
                </div>

                <input
                    type='month'
                    className='form-control month-select'
                    value={mesSelecionado}
                    onChange={e => setMesSelecionado(e.target.value)}
                />
            </div>

            <div className="row g-3 mb-4">
                <CardFinanceiro
                    titulo="Saldo acumulado"
                    valor={resumo.saldo}
                    icone="wallet2"
                    cor="icon-blue"
                    descricao="Até o mês selecionado"
                />

                <CardFinanceiro
                    titulo="Receitas"
                    valor={resumo.receitas}
                    icone="arrow-down-left"
                    cor="icon-green"
                    descricao="Entradas do mês"
                />

                <CardFinanceiro
                    titulo="Despesas"
                    valor={resumo.despesas}
                    icone="arrow-up-right"
                    cor="icon-red"
                    descricao="Saídas do mês"
                />

                <CardFinanceiro
                    titulo="Resultado"
                    valor={resumo.resultado}
                    icone="graph-up-arrow"
                    cor="icon-purple"
                    descricao="Receitas menos despesas"
                />
            </div>

            <div className="content-card mb-4">
                <div className="section-heading">
                    <div>
                        <h3>Evolução financeira</h3>
                        <p>Últimos seis meses até o período selecionado</p>
                    </div>
                </div>

                <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={grafico}>

                            <CartesianGrid strokeDasharray="3 3" vertical={false} />

                            <XAxis dataKey="mes" />
                            <YAxis tickFormatter={v => `${v / 1000}k`} />
                            <Tooltip formatter={valor => moeda(valor)} />
                            <Legend />
                            <Bar
                                dataKey="receitas"
                                name="Receitas"
                                fill='#16a34a'
                                radius={[6, 6, 0, 0]}
                            />

                            <Bar
                                dataKey="despesas"
                                name="Despesas"
                                fill='#f87171'
                                radius={[6, 6, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="content-card">
                <div className="section-heading">
                    <div>
                        <h3>Movimentações do mês</h3>
                        <p>Últimos lançamentos do período selecionado</p>
                    </div>
                </div>

                {resumo.movimentacoes.length === 0 ? (
                    <p className="text-secondary">
                        Nenhuma movimentação cadastrada neste mês.
                    </p>
                ) : (
                    <div className="table-responsive">
                        <table className='table finance-table align-middle'>
                            <thead>
                                <tr>
                                    <th>Descrição</th>
                                    <th>Categoria</th>
                                    <th>Data</th>
                                    <th className='text-end'>Valor</th>
                                </tr>
                            </thead>

                            <tbody>
                                {resumo.movimentacoes.slice(0, 8).map(item => (
                                    <tr key={item.id}>
                                        <td className='fw-semibbold'>
                                            {item.descricao}
                                        </td>
                                        <td>{item.categoria}</td>
                                        <td>
                                            {item.data.split('-').reverse().join('/')}
                                        </td>

                                        <td className={`text-end fw-semibold ${item.tipo === 'receita' ? 'text-success' : 'text-danger'}`}>
                                            {item.tipo === 'receita' ? '+' : '-'}
                                            {moeda(Number(item.valor))}
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

export default Dashboard