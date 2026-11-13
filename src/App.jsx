import { useState } from 'react'

import {
  BrowserRouter,
  Routes,
  Route,
  useLocation
} from 'react-router-dom'

import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SideBar from './components/Sidebar'
import Header from './components/Header'

import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import Contas from './pages/Contas'
import RecuperarSenha from './pages/RecuperarSenha'
import AtualizarSenha from './pages/AtualizarSenha'

import Relatorios from './pages/Relatorios'
import Configuracao from './pages/Configuracao'
import { configurado } from './services/supabase'
import { useAuth } from './contexts/AuthContext'
import Receitas from './pages/Receitas'
import Despesas from './pages/Despesas'

const paginas = {
  '/': 'Dashboard',
  '/receitas': 'Receitas',
  '/despesas': 'Despesas',
  '/contas': 'Contas',
  '/relatorios': 'Relatórios'
}

function PaginaEmConstrucao({ titulo }) {
  return (
    <div className='content-card text-center py-5'>
      <i className='bi bi-tools fs-1 text-success'></i>
      <h2 className='mt-3'>
        {titulo}
      </h2>

      <p className='text-secondary'>
        Esta funcionalidade será desenvolvida em breve.
      </p>
    </div>
  )
}

function Layout() {

  const [menuAberto, setMenuAberto] = useState(false)
  const location = useLocation()
  const { modoDemo, encerrarDemo } = useAuth()

  const titulo = paginas[location.pathname] || 'Página'

  return (
    <div className="app-layout">
      <SideBar
        aberto={menuAberto}
        fechar={() => setMenuAberto(false)}
      />

      <div className="main-area">
        <Header
          titulo={titulo}
          abrirMenu={() => setMenuAberto(true)}
        />
        <main className='main-content'>
          {modoDemo && <div className="demo-banner d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4"><span><i className="bi bi-info-circle me-2" />Modo de teste · dados fictícios salvos apenas neste navegador.</span><button className="btn btn-sm btn-outline-success" onClick={encerrarDemo}>Conectar meu Supabase</button></div>}
          <Routes>
            <Route path='/' element={<Dashboard />} />
            <Route path='/receitas' element={<Receitas />} />
            <Route path='/despesas' element={<Despesas />} />

            <Route
              path='/contas'
              element={<Contas />}
            />

            <Route
              path='/relatorios'
              element={<Relatorios />}
            />



            <Route
              path='*'
              element={<PaginaEmConstrucao titulo="Página não encontrada" />}
            />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function App() {
  if (window.location.pathname === '/configuracao' || (!configurado && !sessionStorage.getItem('mf-demo'))) return <Configuracao />

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path='/login' element={<Login />} />
          <Route path='/cadastro' element={<Cadastro />} />
          <Route path='/recuperar-senha' element={<RecuperarSenha />} />
          <Route path='/atualizar-senha' element={<AtualizarSenha />} />

          <Route element={<ProtectedRoute />}>
            <Route path='/*' element={<Layout />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
