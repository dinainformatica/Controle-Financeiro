export const moeda = valor => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0)
export const dataHoje = () => new Date().toLocaleDateString('en-CA')
export const formatarData = data => data ? data.slice(0, 10).split('-').reverse().join('/') : '—'
export function dataValida(data) {
  return /^\d{4}-\d{2}-\d{2}$/.test(data || '') && !Number.isNaN(Date.parse(data + 'T12:00:00Z')) && new Date(data + 'T12:00:00Z').toISOString().slice(0, 10) === data
}
export function centavos(valor) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(valor))) throw new Error('Informe um valor positivo com até duas casas decimais.')
  const numero = Math.round(Number(valor) * 100)
  if (!Number.isSafeInteger(numero) || numero < 1 || numero > 99999999999999) throw new Error('Valor fora do limite permitido.')
  return numero
}
export function validarRegistro(dados, conta = false) {
  const registro = { ...dados, descricao: String(dados.descricao || '').trim(), categoria: String(dados.categoria || '').trim() }
  if (!registro.descricao || registro.descricao.length > 150 || !registro.categoria || registro.categoria.length > 80) throw new Error('Preencha descrição e categoria válidas.')
  if (!(conta ? ['pagar', 'receber'] : ['receita', 'despesa']).includes(registro.tipo)) throw new Error('Tipo inválido.')
  registro.valor = centavos(dados.valor) / 100
  if (!dataValida(conta ? registro.vencimento : registro.data)) throw new Error('Informe uma data válida.')
  if (conta && (!Number.isInteger(Number(registro.parcelas)) || registro.parcelas < 1 || registro.parcelas > 120 || centavos(registro.valor) < registro.parcelas)) throw new Error('Use de 1 a 120 parcelas, com pelo menos R$ 0,01 por parcela.')
  return registro
}
export function parcelasExatas(total, quantidade, primeiroVencimento) {
  const valor = centavos(total)
  const [ano, mes, dia] = primeiroVencimento.split('-').map(Number)
  return Array.from({ length: quantidade }, (_, indice) => {
    const alvo = new Date(Date.UTC(ano, mes - 1 + indice, 1))
    const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate()
    alvo.setUTCDate(Math.min(dia, ultimo))
    return { valor: (Math.floor(valor / quantidade) + (indice < valor % quantidade ? 1 : 0)) / 100, vencimento: alvo.toISOString().slice(0, 10) }
  })
}
export function periodoInicial(hoje = dataHoje()) {
  return { inicio: hoje.slice(0, 7) + '-01', fim: hoje, categoria: '', tipo: '', base: 'caixa' }
}
export function analisar(movimentacoes, contas, filtros) {
  if (!dataValida(filtros.inicio) || !dataValida(filtros.fim) || filtros.inicio > filtros.fim) throw new Error('Selecione um período válido: a data inicial deve ser anterior ou igual à final.')
  const dias = (Date.parse(filtros.fim) - Date.parse(filtros.inicio)) / 86400000 + 1
  if (dias > 3660) throw new Error('Selecione um período de até 10 anos.')
  // Caixa usa apenas movimentações. Contas pagas nunca entram novamente.
  const fonte = filtros.base === 'caixa' ? movimentacoes.map(m => ({ ...m, situacao: 'Realizado' })) : contas.map(c => ({ ...c, data: c.vencimento, tipo: c.tipo === 'pagar' ? 'despesa' : 'receita', situacao: c.status === 'pago' ? 'Liquidado' : c.vencimento < dataHoje() ? 'Atrasado' : 'Pendente' }))
  const aplicar = (inicio, fim) => fonte.filter(r => r.data >= inicio && r.data <= fim && (!filtros.categoria || r.categoria === filtros.categoria) && (!filtros.tipo || r.tipo === filtros.tipo))
  const linhas = aplicar(filtros.inicio, filtros.fim).sort((a, b) => b.data.localeCompare(a.data) || a.id.localeCompare(b.id))
  const somar = lista => {
    const receitas = lista.filter(r => r.tipo === 'receita').reduce((s, r) => s + centavos(r.valor), 0)
    const despesas = lista.filter(r => r.tipo === 'despesa').reduce((s, r) => s + centavos(r.valor), 0)
    return { receitas: receitas / 100, despesas: despesas / 100, resultado: (receitas - despesas) / 100 }
  }
  const anteriorFim = new Date(Date.parse(filtros.inicio) - 86400000).toISOString().slice(0, 10)
  const anteriorInicio = new Date(Date.parse(filtros.inicio) - dias * 86400000).toISOString().slice(0, 10)
  const anterior = somar(aplicar(anteriorInicio, anteriorFim))
  const meses = new Map()
  let cursor = filtros.inicio.slice(0, 7)
  while (cursor <= filtros.fim.slice(0, 7)) {
    meses.set(cursor, { mes: cursor, receitas: 0, despesas: 0, saldo: 0 })
    const [a, m] = cursor.split('-').map(Number)
    cursor = new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 7)
  }
  const categorias = new Map()
  for (const r of linhas) {
    const ponto = meses.get(r.data.slice(0, 7))
    ponto[r.tipo === 'receita' ? 'receitas' : 'despesas'] += centavos(r.valor)
    const key = r.tipo + '|' + r.categoria
    const grupo = categorias.get(key) || { nome: r.categoria, tipo: r.tipo, centavos: 0, quantidade: 0 }
    grupo.centavos += centavos(r.valor); grupo.quantidade++
    categorias.set(key, grupo)
  }
  let acumulado = 0
  const evolucao = [...meses.values()].map(p => {
    acumulado += p.receitas - p.despesas
    return { mes: p.mes, receitas: p.receitas / 100, despesas: p.despesas / 100, saldo: acumulado / 100 }
  })
  return { linhas, ...somar(linhas), anterior, anteriorInicio, anteriorFim, evolucao, categorias: [...categorias.values()].map(c => ({ ...c, valor: c.centavos / 100 })).sort((a, b) => b.valor - a.valor) }
}
export function csvSeguro(valor) {
  if (typeof valor === 'number' && Number.isFinite(valor)) return '"' + valor.toFixed(2).replace('.', ',') + '"'
  let texto = String(valor ?? '')
  if (/^[\s]*[=+@\-\t\r\n]/.test(texto)) texto = "'" + texto
  return '"' + texto.replace(/"/g, '""') + '"'
}
export function gerarCSV(relatorio, filtros) {
  const linhas = [
    ['Meu Financeiro', filtros.base === 'caixa' ? 'Fluxo de caixa realizado' : 'Contas por vencimento'],
    ['Período', filtros.inicio, filtros.fim, 'Categoria', filtros.categoria || 'Todas', 'Tipo', filtros.tipo || 'Todos'],
    ['Receitas', relatorio.receitas, 'Despesas', relatorio.despesas, 'Resultado', relatorio.resultado],
    [], ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor (R$)', 'Situação'],
    ...relatorio.linhas.map(r => [r.data, r.descricao, r.tipo, r.categoria, Number(r.valor).toFixed(2).replace('.', ','), r.situacao])
  ]
  return '\uFEFF' + linhas.map(l => l.map(csvSeguro).join(';')).join('\r\n')
}
export function baixar(nome, conteudo, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
