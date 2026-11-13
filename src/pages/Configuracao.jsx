import { useState } from 'react'
import { validarConfiguracao, configurado } from '../services/supabase'
export default function Configuracao() {
  const [url, setUrl] = useState(''), [key, setKey] = useState(''), [erro, setErro] = useState('')
  function salvar(e) {
    e.preventDefault(); setErro('')
    try { localStorage.setItem('mf-supabase', JSON.stringify(validarConfiguracao(url.trim(), key.trim()))); sessionStorage.removeItem('mf-demo'); window.location.assign('/login') } catch (e) { setErro(e.message) }
  }
  function testar() { sessionStorage.setItem('mf-demo', '1'); window.location.assign('/relatorios') }
  return <div className="setup-layout">
    <header className="setup-header"><a href="/" className="text-decoration-none text-dark d-flex gap-2 align-items-center fw-bold"><span className="brand-symbol"><i className="bi bi-wallet2" /></span> Meu Financeiro</a><span className="private-chip"><i className="bi bi-lock me-2" />Acesso privado</span></header>
    <main className="setup-main row g-5 align-items-center">
      <section className="col-lg-6"><span className="eyebrow">SEU DINHEIRO, COM MAIS CLAREZA</span><h1 className="setup-title">Cada conta no lugar.<br /><span>Mais tranquilidade<br />para você.</span></h1><p className="setup-description">Receitas, pagamentos e relatórios em um só lugar. Continue com seu Supabase ou conheça os recursos com dados de exemplo.</p>
        <div className="setup-preview"><div className="d-flex justify-content-between mb-3"><span><i className="bi bi-bar-chart-line me-2" />Uma visão completa</span><span className="badge text-bg-light">Etapa 6</span></div><div className="mini-bars" aria-hidden="true">{[38, 62, 46, 82, 66, 95, 74, 100].map((h, i) => <div key={i} style={{ height: h + '%' }} />)}</div><div className="d-flex flex-wrap gap-3 mt-4 small text-secondary"><span><i className="bi bi-check-circle text-success me-1" />Relatórios por categoria</span><span><i className="bi bi-check-circle text-success me-1" />Exportação CSV e PDF</span></div></div>
      </section>
      <section className="col-lg-6"><div className="content-card setup-card"><span className="private-chip mb-3"><i className="bi bi-database-lock me-2" />Seus dados, seu projeto</span><h2>Configure sua conexão</h2><p className="text-secondary small">{configurado ? 'A conexão padrão com o Controle-Financeiro já está configurada. Use os campos abaixo se quiser selecionar outro projeto neste navegador.' : 'Use a URL e a chave pública do seu projeto Supabase.'}</p>
        {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
        <form onSubmit={salvar}><label htmlFor="sb-url" className="form-label">URL do projeto Supabase</label><input id="sb-url" className="form-control mb-3" type="url" placeholder="https://seu-projeto.supabase.co" value={url} onChange={e => setUrl(e.target.value)} required />
          <label htmlFor="sb-key" className="form-label">Chave pública (publishable ou anon)</label><input id="sb-key" className="form-control mb-2" value={key} onChange={e => setKey(e.target.value)} placeholder="sb_publishable_..." autoComplete="off" required /><p className="small text-secondary">Nunca informe uma chave secret ou service_role.</p><button className="btn btn-success w-100" type="submit">Salvar configuração e entrar <i className="bi bi-arrow-right ms-2" /></button></form>
        <div className="setup-divider"><span>ou explore primeiro</span></div><button type="button" className="btn btn-outline-success w-100 py-3" onClick={testar}><i className="bi bi-play-circle me-2" />Abrir ambiente de teste</button><p className="small text-secondary mt-2 mb-4">Dados fictícios, salvos somente neste navegador. Nenhuma alteração no seu Supabase.</p>
        <details className="small"><summary>Preparação do banco de dados</summary><p className="text-secondary mt-2">A migração foi aplicada e validada no projeto Controle-Financeiro. Para conectar outro projeto, confira seu esquema e aplique a migração correspondente antes de usá-lo.</p><a href="/security/etapa6.sql" download>Baixar migração da Etapa 6</a></details></div></section>
    </main><footer className="setup-footer">Meu Financeiro · Light Modern · React + Bootstrap</footer>
  </div>
}
