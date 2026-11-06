import { Toast } from "bootstrap"
import { useState } from "react"

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts'

const historico = [
    { mes: 'Jan', receitas: 4200, despesas: 2000 },
    { mes: 'Fev', receitas: 5100, despesas: 3200 },
    { mes: 'Mar', receitas: 4700, despesas: 3000 },
    { mes: 'Abr', receitas: 5800, despesas: 3600 },
    { mes: 'Mai', receitas: 5400, despesas: 2900 },
    { mes: 'Jun', receitas: 6500, despesas: 3200 }
]

const transacoes = [
    { id: 1, descricao: 'Salário', categoria: 'Trabalho', tipo: 'receita', valor: 4500, data: '2026-06-05' },
    { id: 2, descricao: 'Supermercado', categoria: 'Alimentação', tipo: 'despesa', valor: 650, data: '2026-06-07' },
    { id: 3, descricao: 'Serviço de informática', categoria: 'Serviços', tipo: 'receita', valor: 2000, data: '2026-06-10' },
    { id: 4, descricao: 'Conta de energia', categoria: 'Moradia', tipo: 'despesa', valor: 350, data: '2026-06-12' },
    { id: 5, descricao: 'Outras despesas', categoria: 'Diversos', tipo: 'despesa', valor: 2200, data: '2026-06-15' }
]

const moeda = (valor) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
}).format(valor)

const formatarData = (data) => new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR')

function CardFinanceiro({ titulo, valor, icone, cor, descricao }) {
    return (
        <div className="col-12 col-sm-6 col-xl-3">
            <div className="finance-card">
                <div className="d-flex justify-content-between align-start">
                    <span className="card-label">
                        {titulo}
                    </span>
                    <div className={`card-icon ${cor}`}>
                        <i className={`bi bi-${icone}`}></i>
                    </div>
                </div>

                <h3 className="card-value">
                    {moeda(valor)}
                </h3>

                <span className="card-description">
                    {descricao}
                </span>
            </div>
        </div>
    )
}

function Dashboard() {
    const [mesSelecionado, setMesSelecionado] = useState(5)

    const dadosMes = historico[mesSelecionado]
    const receitas = dadosMes.receitas
    const despesas = dadosMes.despesas
    const resultado = receitas - despesas

    // Saldo fictício anterior ao inicio do historico
    const saldoInicial = 3200

    const saldoAtual = saldoInicial + historico.slice(0, mesSelecionado + 1).reduce(
        (total, mes) => total + mes.receitas - mes.despesas, 0
    )
    return (
        <div className="dashboard-page">
            <div className="dashboard-heading">
                <div>
                    <h2>Visão Geral</h2>
                    <p>Acompanhe sua saúde financeira</p>
                </div>

                <select
                    className="form-select month-select"
                    value={mesSelecionado}
                    onChange={(e) => setMesSelecionado(Number(e.target.value))}
                >
                    {historico.map((item, index) => (
                        <option key={item.mes} value={index}>
                            {item.mes} / 2026
                        </option>
                    ))}
                </select>
            </div>

            <div className="row g-3 mb-4">
                <CardFinanceiro
                    titulo="Saldo acumulado"
                    valor={saldoAtual}
                    icone="wallet2"
                    cor="icon-blue"
                    descricao="Até o mês selecionado"
                />

                <CardFinanceiro
                    titulo="Receitas"
                    valor={receitas}
                    icone="arrow-down-left"
                    cor="icon-green"
                    descricao="Entradas do mês"
                />

                <CardFinanceiro
                    titulo="Despesas"
                    valor={despesas}
                    icone="arrow-up-right"
                    cor="icon-red"
                    descricao="Saídas do mês"
                />

                <CardFinanceiro
                    titulo="Resultado do mês"
                    valor={resultado}
                    icone="graph-up-arrow"
                    cor="icon-purple"
                    descricao="Receitas menos despesas"
                />
            </div>

            <div className="content-card mb-4">
                <div className="section-heading">
                    <div>
                        <h3>Receitas e Despesas</h3>
                        <p>Comparativo financeiro mensal</p>
                    </div>

                    <i className="bi bi-bar-chart text-success fs-4"></i>
                </div>

                <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={historico}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="mes" />
                            <YAxis tickFormatter={(valor) => `${valor / 1000}k`} />

                            <Tooltip formatter={(valor) => moeda(valor)} />

                            <Legend />

                            <Bar
                                dataKey="receitas"
                                name="Receitas"
                                fill="#16a34a"
                                radius={[6, 6, 0, 0]}
                            />

                            <Bar
                                dataKey="despesas"
                                name="Despesas"
                                fill="#f87171"
                                radius={[6, 6, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="content-card">
                <div className="section-heading">
                    <div>
                        <h3>últimas movimentações</h3>
                        <p>Exemplo de transações de junho de 2026</p>
                    </div>

                    <i className="bi bi-clock-history text-secondary fs-4"></i>
                </div>

                <div className="table responsive">
                    <table className="table finance-table align-middle">
                        <thead>
                            <tr>
                                <th>Descrição</th>
                                <th>Categoria</th>
                                <th>Data</th>
                                <th className="text-end">Valor</th>
                            </tr>
                        </thead>

                        <tbody>
                            {transacoes.map((item) => (
                                <tr key={item.id}>
                                    <td className="fw-semibold">{item.descricao}</td>
                                    <td>{item.categoria}</td>
                                    <td>{formatarData(item.data)}</td>

                                    <td className={`text-end fw-semibold ${item.tipo == 'receita' ? 'text-success' : 'text-danger'}`}>
                                        {item.tipo === 'receita' ? '+' : '-'}
                                        {moeda(item.valor)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default Dashboard