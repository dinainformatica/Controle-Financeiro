import { moeda, formatarData } from './financeiro.js'
const texto=v=>String(v ?? '').replace(/\u00a0/g,' ').replace(/[–—]/g,'-')
export async function criarPDF(r,filtros,{demo=false}={}) {
 const [{jsPDF},{autoTable}]=await Promise.all([import('jspdf'),import('jspdf-autotable')])
 const doc=new jsPDF({unit:'mm',format:'a4',compress:true})
 const verde=[21,128,61],cinza=[100,116,139]
 doc.setProperties({title:'Meu Financeiro - Relatório financeiro',subject:`${filtros.inicio} a ${filtros.fim}`,author:'Meu Financeiro'})
 const titulo=(t,y)=>{doc.setTextColor(30,41,59);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text(texto(t),15,y)}
 const linha=(t,y)=>{doc.setTextColor(...cinza);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(texto(t),15,y)}
 doc.setFillColor(...verde);doc.roundedRect(15,14,10,10,2,2,'F');doc.setTextColor(...verde);doc.setFontSize(19);doc.setFont('helvetica','bold');doc.text('Meu Financeiro',29,21)
 doc.setFontSize(9);doc.setTextColor(...cinza);doc.setFont('helvetica','normal');doc.text(demo?'AMBIENTE DE TESTE - DADOS FICTÍCIOS':'RELATÓRIO PRIVADO',15,33)
 titulo(filtros.base==='caixa'?'Fluxo de caixa realizado':'Contas por vencimento',44)
 linha(`${formatarData(filtros.inicio)} a ${formatarData(filtros.fim)}`,51)
 const filtroTexto=doc.splitTextToSize(texto(`Categoria: ${filtros.categoria||'Todas'} | Tipo: ${filtros.tipo||'Todos'}`),180)
 doc.text(filtroTexto,15,57)
 const yCards=62+(filtroTexto.length-1)*4
 ;[['Receitas',r.receitas],['Despesas',r.despesas],['Resultado',r.resultado]].forEach(([nome,valor],i)=>{
  const x=15+i*62;doc.setFillColor(245,249,246);doc.roundedRect(x,yCards,56,25,2,2,'F');doc.setTextColor(...cinza);doc.setFontSize(9);doc.text(nome,x+5,yCards+8);doc.setTextColor(30,41,59);doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(texto(moeda(valor)),x+5,yCards+18);doc.setFont('helvetica','normal')
 })
 const nota=filtros.base==='caixa'?'Valores pela data da movimentação; baixas incluídas uma única vez.':'Contas pela data de vencimento, incluindo liquidadas. Não representa saldo em caixa.'
 linha(nota,yCards+32)
 let y=yCards+43
 titulo('Receitas e despesas por mês',y)
 const pontos=r.evolucao.slice(-12)
 linha(r.evolucao.length>12?'Gráfico dos últimos 12 meses. O detalhamento inclui todo o período.':'Visão mensal do período selecionado.',y+6)
 const topo=y+14, altura=42, largura=180,passo=largura/Math.max(pontos.length,1)
 const maior=Math.max(1,...pontos.flatMap(p=>[p.receitas,p.despesas]))
 doc.setDrawColor(225,230,235);doc.line(15,topo+altura,195,topo+altura)
 for(const [i,p]of pontos.entries()) {
  const x=15+i*passo+passo*.15,w=Math.min(8,passo*.3)
  for(const [j,campo]of ['receitas','despesas'].entries()) {const h=p[campo]/maior*altura;doc.setFillColor(...(j===0?[22,163,74]:[241,142,142]));doc.rect(x+j*(w+1),topo+altura-h,w,h,'F')}
  doc.setFontSize(7);doc.setTextColor(...cinza);doc.text(p.mes.slice(5)+'/'+p.mes.slice(2,4),15+i*passo+passo/2,topo+altura+5,{align:'center'})
 }
 doc.setFontSize(8);doc.setTextColor(21,128,61);doc.text('Receitas',15,topo+altura+13);doc.setTextColor(190,71,85);doc.text('Despesas',38,topo+altura+13)
 titulo('Resumo por categoria',topo+altura+25)
 autoTable(doc,{startY:topo+altura+30,head:[['Categoria','Tipo','Lançamentos','Total']],body:r.categorias.map(c=>[texto(c.nome),c.tipo==='receita'?'Receita':'Despesa',String(c.quantidade),texto(moeda(c.valor))]),margin:{left:15,right:15,bottom:18,top:18},styles:{font:'helvetica',fontSize:9,cellPadding:3,overflow:'linebreak'},headStyles:{fillColor:verde},alternateRowStyles:{fillColor:[247,250,248]},columnStyles:{3:{halign:'right'}}})
 doc.addPage();titulo('Detalhamento dos lançamentos',20);linha(`${r.linhas.length} registros | ${formatarData(filtros.inicio)} a ${formatarData(filtros.fim)}`,27)
 autoTable(doc,{startY:33,head:[['Data','Descrição','Categoria','Tipo / situação','Valor']],body:r.linhas.map(m=>[formatarData(m.data),texto(m.descricao),texto(m.categoria),(m.tipo==='receita'?'Receita':'Despesa')+' / '+m.situacao,texto(moeda(m.valor))]),margin:{left:15,right:15,top:18,bottom:18},styles:{font:'helvetica',fontSize:8,cellPadding:3,overflow:'linebreak'},headStyles:{fillColor:verde},alternateRowStyles:{fillColor:[247,250,248]},columnStyles:{0:{cellWidth:23},1:{cellWidth:54},2:{cellWidth:34},3:{cellWidth:37},4:{cellWidth:32,halign:'right'}}})
 for(let i=1;i<=doc.getNumberOfPages();i++){doc.setPage(i);doc.setTextColor(...cinza);doc.setFontSize(8);doc.text('Meu Financeiro | '+(demo?'Dados fictícios':'Acesso privado'),15,287);doc.text(`${i} / ${doc.getNumberOfPages()}`,195,287,{align:'right'})}
 return doc
}
