import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { carregarDados } from '../services/dados'
import { moeda, dataHoje, formatarData, periodoInicial, analisar, gerarCSV, baixar } from '../utils/financeiro'


const cores = [
  '#16a34a', 
  '#3b82f6', 
  '#8b5cf6', 
  '#f59e0b', 
  '#f97373', 
  '#0d9488', 
  '#64748b', 
  '#d946ef'
]
function Campo({ id, label, children }) { return <div className="col-6 col-lg-4 col-xxl"><label htmlFor={id} className="form-label">{label}</label>{children}</div> }
function Vazio({ texto = 'Nenhum lançamento neste período.' }) { return <div className="empty-state"><i className="bi bi-bar-chart" /><h4>Nada por aqui, por enquanto</h4><p>{texto}</p></div> }
function Linhas({ linhas }) { return <tbody>{linhas.map(r => <tr key={r.id}><td className="text-nowrap">{formatarData(r.data)}</td><td><strong>{r.descricao}</strong><small className="d-block text-secondary">{r.conta_id ? 'Baixa de conta' : r.total_parcelas > 1 ? `Parcela ${r.parcela_numero}/${r.total_parcelas}` : r.situacao}</small></td><td>{r.categoria}</td><td><span className={`type-pill ${r.tipo === 'receita' ? 'income' : 'expense'}`}>{r.tipo === 'receita' ? 'Receita' : 'Despesa'}</span></td><td className={`text-end fw-semibold ${r.tipo === 'receita' ? 'text-success' : 'text-danger'}`}>{moeda(r.valor)}</td></tr>)}</tbody> }
export default function Relatorios() {
  const { modoDemo } = useAuth()
  const [exportando, setExportando] = useState(false), [erroExportacao, setErroExportacao] = useState('')
  async function exportarPDF() {
    setExportando(true); setErroExportacao('')
    try { const { criarPDF } = await import('../utils/exportarPDF'); const doc = await criarPDF(resultado, filtros, { demo: modoDemo }); doc.save(`meu-financeiro-${filtros.inicio}-${filtros.fim}.pdf`) } catch { setErroExportacao('Não foi possível gerar o PDF. Tente novamente.') } finally { setExportando(false) }
  }
  const [dados, setDados] = useState(null), [erro, setErro] = useState(''), [carregando, setCarregando] = useState(true)
  const [rascunho, setRascunho] = useState(periodoInicial), [filtros, setFiltros] = useState(periodoInicial)
  const [erroFiltro, setErroFiltro] = useState(''), [pagina, setPagina] = useState(1), [categoriaGrafico, setCategoriaGrafico] = useState('despesa')
  async function atualizar() {
    setCarregando(true); setErro('')
    try { setDados(await carregarDados()) } catch (e) { setDados(null); setErro(e.message) } finally { setCarregando(false) }
  }
  useEffect(() => { let ativo = true; carregarDados().then(r => { if (ativo) setDados(r) }).catch(e => { if (ativo) setErro(e.message) }).finally(() => { if (ativo) setCarregando(false) }); return () => { ativo = false } }, [])
  const categorias = useMemo(() => [...new Set([...(dados?.movimentacoes || []), ...(dados?.contas || [])].map(r => r.categoria))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [dados])
  const resultado = useMemo(() => dados ? analisar(dados.movimentacoes, dados.contas, filtros) : null, [dados, filtros])
  const pizza = resultado?.categorias.filter(c => c.tipo === categoriaGrafico) || []
  const paginas = Math.max(1, Math.ceil((resultado?.linhas.length || 0) / 25))
  function alterar(campo, valor) { setRascunho(r => ({ ...r, [campo]: valor })) }
  function aplicar(e) {
    e?.preventDefault(); setErroFiltro('')
    try { analisar([], [], rascunho); setFiltros({ ...rascunho }); setPagina(1) } catch (e) { setErroFiltro(e.message) }
  }
  function atalho(tipo) {
    const hoje = dataHoje(), d = new Date(hoje + 'T12:00:00')
    let inicio, fim = hoje
    if (tipo === 'mes') inicio = hoje.slice(0, 7) + '-01'
    if (tipo === 'anterior') { inicio = new Date(d.getFullYear(), d.getMonth() - 1, 1).toLocaleDateString('en-CA'); fim = new Date(d.getFullYear(), d.getMonth(), 0).toLocaleDateString('en-CA') }
    if (tipo === '90') { d.setDate(d.getDate() - 89); inicio = d.toLocaleDateString('en-CA') }
    if (tipo === 'ano') inicio = hoje.slice(0, 4) + '-01-01'
    const novos = { ...rascunho, inicio, fim }; setRascunho(novos); setFiltros(novos); setErroFiltro(''); setPagina(1)
  }
  const base = filtros.base === 'caixa' ? 'Caixa realizado' : 'Contas por vencimento'
  const pendente = JSON.stringify(rascunho) !== JSON.stringify(filtros)
  return <div className="reports-page">
    <div className="dashboard-heading report-heading"><div><span className="eyebrow">ENTENDA SEUS NÚMEROS</span><h2>Relatórios financeiros</h2><p>Transforme seus lançamentos em decisões mais claras.</p></div><div className="d-flex gap-2 report-actions"><button className="btn btn-white" disabled={!resultado || carregando} onClick={() => baixar(`meu-financeiro-${filtros.inicio}-${filtros.fim}.csv`, gerarCSV(resultado, filtros))}><i className="bi bi-download me-2" />Exportar CSV</button><button className="btn btn-success" disabled={!resultado || carregando || exportando} onClick={exportarPDF}><i className="bi bi-file-earmark-pdf me-2" />{exportando ? 'Gerando PDF…' : 'Exportar PDF'}</button></div></div>
    <form className="content-card report-filters mb-4 no-print" onSubmit={aplicar}>
      <div className="d-flex justify-content-between flex-wrap align-items-center gap-2 mb-3"><h3 className="filter-title"><i className="bi bi-sliders2 me-2" />Personalize sua análise</h3><div className="period-shortcuts">{[['mes', 'Este mês'], ['anterior', 'Mês anterior'], ['90', '90 dias'], ['ano', 'Este ano']].map(([key, label]) => <button type="button" key={key} onClick={() => atalho(key)}>{label}</button>)}</div></div>
      <div className="row g-3 align-items-end"><Campo id="inicio" label="Data inicial"><input id="inicio" className="form-control" type="date" value={rascunho.inicio} onInput={e => alterar('inicio', e.currentTarget.value)} required onChange={e => alterar('inicio', e.target.value)} /></Campo><Campo id="fim" label="Data final"><input id="fim" className="form-control" type="date" value={rascunho.fim} onInput={e => alterar('fim', e.currentTarget.value)} required onChange={e => alterar('fim', e.target.value)} /></Campo><Campo id="categoria" label="Categoria"><select id="categoria" className="form-select" value={rascunho.categoria} onChange={e => alterar('categoria', e.target.value)}><option value="">Todas as categorias</option>{categorias.map(c => <option key={c}>{c}</option>)}</select></Campo><Campo id="tipo" label="Tipo"><select id="tipo" className="form-select" value={rascunho.tipo} onChange={e => alterar('tipo', e.target.value)}><option value="">Receitas e despesas</option><option value="receita">Receitas</option><option value="despesa">Despesas</option></select></Campo><Campo id="base" label="Visão do relatório"><select id="base" className="form-select" value={rascunho.base} onChange={e => alterar('base', e.target.value)}><option value="caixa">Caixa realizado</option><option value="contas">Contas por vencimento</option></select></Campo><div className="col-12 col-lg-4 col-xxl-auto"><button className="btn btn-success w-100" type="submit">Aplicar filtros</button></div></div>
      {erroFiltro && <div className="alert alert-danger mt-3 mb-0" role="alert">{erroFiltro}</div>}{pendente && <p className="small text-warning-emphasis mt-3 mb-0">Há filtros não aplicados. Os gráficos e a exportação mostram o último período aplicado.</p>}
    </form>
    <div className="report-context"><span><span className="status-dot" />{base} <span className="text-secondary">· {formatarData(filtros.inicio)} a {formatarData(filtros.fim)} · {filtros.categoria || 'Todas as categorias'} · {filtros.tipo || 'Todos os tipos'}</span></span><button className="btn btn-sm text-secondary no-print" onClick={atualizar} disabled={carregando}><i className="bi bi-arrow-clockwise me-1" />Atualizar</button></div>
    <p className="report-note">{filtros.base === 'caixa' ? 'Receitas e despesas efetivamente lançadas, pela data da movimentação. Baixas de contas entram uma única vez.' : 'Contas a pagar e receber, pelo vencimento, incluindo pendentes e liquidadas. Esta visão não representa o saldo em caixa.'}</p>
    {erroExportacao && <div className="alert alert-danger" role="alert">{erroExportacao}</div>}
    {erro && <div className="alert alert-danger" role="alert">{erro}<button className="btn btn-sm btn-outline-danger ms-3" onClick={atualizar}>Tentar novamente</button></div>}
    {carregando ? <div className="content-card text-center py-5" role="status"><span className="spinner-border text-success" /><p className="mt-3 text-secondary">Preparando seu relatório…</p></div> : resultado && <>
      <div className="row g-3 mb-4">{[['Receitas', resultado.receitas, 'arrow-down-left', 'green', 'receitas'], ['Despesas', resultado.despesas, 'arrow-up-right', 'red', 'despesas'], ['Resultado do período', resultado.resultado, 'wallet2', 'blue', 'resultado']].map(([titulo, valor, icone, cor, campo]) => <div className="col-md-4" key={campo}><div className={`finance-card report-stat ${campo === 'resultado' ? 'balance-card' : ''}`}><div className="d-flex justify-content-between align-items-center"><span className="card-label">{titulo}</span><span className={`card-icon icon-${cor}`}><i className={`bi bi-${icone}`} /></span></div><h3 className="card-value">{moeda(valor)}</h3><div className="card-description">Período anterior: {moeda(resultado.anterior[campo])}</div><div className={`stat-change ${valor - resultado.anterior[campo] < 0 ? 'text-secondary' : 'text-success'}`}>{valor - resultado.anterior[campo] >= 0 ? '+' : ''}{moeda(valor - resultado.anterior[campo])} <span className="text-secondary">de diferença</span></div></div></div>)}</div>
      <p className="small text-secondary mb-4">Comparação com os {Math.round((Date.parse(filtros.fim) - Date.parse(filtros.inicio)) / 86400000) + 1} dias anteriores: {formatarData(resultado.anteriorInicio)} a {formatarData(resultado.anteriorFim)}, com os mesmos filtros.</p>
      <div className="row g-4 mb-4"><div className="col-xl-8"><section className="content-card h-100"><div className="section-heading"><div><h3>Receitas e despesas</h3><p>Acompanhe o movimento de cada mês</p></div><span className="chart-badge">Mensal</span></div>{resultado.linhas.length ? <div className="chart-container"><ResponsiveContainer width="100%" height="100%"><BarChart data={resultado.evolucao} barGap={6}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f4" /><XAxis dataKey="mes" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5) + '/' + v.slice(2, 4)} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${v / 1000} mil` : v} axisLine={false} tickLine={false} /><Tooltip formatter={moeda} /><Legend iconType="circle" /><Bar dataKey="receitas" name="Receitas" fill="#16a34a" radius={[5, 5, 0, 0]} maxBarSize={34} /><Bar dataKey="despesas" name="Despesas" fill="#f18e8e" radius={[5, 5, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer></div> : <Vazio />}</section></div>
        <div className="col-xl-4"><section className="content-card h-100"><div className="section-heading"><div><h3>Por categoria</h3><p>Onde seu dinheiro se concentra</p></div></div><label htmlFor="grafico-tipo" className="visually-hidden">Tipo do gráfico de categorias</label><select id="grafico-tipo" className="form-select form-select-sm mb-2" value={categoriaGrafico} onChange={e => setCategoriaGrafico(e.target.value)}><option value="despesa">Despesas</option><option value="receita">Receitas</option></select>{pizza.length ? <><div style={{ height: 200 }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pizza} dataKey="valor" nameKey="nome" innerRadius={58} outerRadius={86} paddingAngle={3}>{pizza.map((c, i) => <Cell key={c.nome} fill={cores[i % cores.length]} />)}</Pie><Tooltip formatter={moeda} /></PieChart></ResponsiveContainer></div><div className="category-legend">{pizza.slice(0, 5).map((c, i) => <div key={c.nome}><span><i style={{ background: cores[i % cores.length] }} />{c.nome}</span><strong>{moeda(c.valor)}</strong></div>)}</div></> : <Vazio texto="Não há valores deste tipo para os filtros." />}</section></div></div>
      <section className="content-card mb-4"><div className="section-heading"><div><h3>Resultado acumulado no período</h3><p>Parte de zero no início do período; não inclui saldo anterior.</p></div></div>{resultado.linhas.length ? <div style={{ height: 210 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={resultado.evolucao}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="mes" tick={{ fontSize: 11 }} /><YAxis tickFormatter={v => v >= 1000 ? `${v / 1000} mil` : v} tick={{ fontSize: 11 }} /><Tooltip formatter={moeda} /><Line type="monotone" dataKey="saldo" name="Resultado acumulado" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div> : <Vazio />}</section>
      <section className="content-card mb-4"><div className="section-heading"><div><h3>Resumo por categoria</h3><p>Valores exatos que compõem os gráficos</p></div></div><div className="table-responsive"><table className="table finance-table"><thead><tr><th>Categoria</th><th>Tipo</th><th>Lançamentos</th><th className="text-end">Total</th><th className="text-end">Participação no tipo</th></tr></thead><tbody>{resultado.categorias.map(c => <tr key={c.tipo + c.nome}><td>{c.nome}</td><td>{c.tipo === 'receita' ? 'Receita' : 'Despesa'}</td><td>{c.quantidade}</td><td className="text-end">{moeda(c.valor)}</td><td className="text-end">{(c.valor / (c.tipo === 'receita' ? resultado.receitas : resultado.despesas) * 100).toFixed(1)}%</td></tr>)}</tbody></table></div>{!resultado.categorias.length && <Vazio />}</section>
      <section className="content-card"><div className="section-heading"><div><h3>Detalhamento dos lançamentos</h3><p>{resultado.linhas.length} registros · ordenados do mais recente para o mais antigo</p></div><span className="chart-badge">{base}</span></div>{resultado.linhas.length ? <><div className="table-responsive no-print"><table className="table finance-table align-middle"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th className="text-end">Valor</th></tr></thead><Linhas linhas={resultado.linhas.slice((pagina - 1) * 25, pagina * 25)} /></table></div><div className="print-only"><table className="table finance-table"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th className="text-end">Valor</th></tr></thead><Linhas linhas={resultado.linhas} /></table></div><div className="d-flex justify-content-between align-items-center mt-4 no-print"><span className="small text-secondary">Página {pagina} de {paginas}</span><div className="d-flex gap-2"><button className="btn btn-sm btn-outline-secondary" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>Anterior</button><button className="btn btn-sm btn-outline-secondary" disabled={pagina >= paginas} onClick={() => setPagina(p => p + 1)}>Próxima</button></div></div></> : <Vazio />}</section>
    </>}
  </div>
}
