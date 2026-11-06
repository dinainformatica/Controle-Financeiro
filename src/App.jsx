import { useState } from 'react'

import {
  BrowserRouter,
  Routes,
  Route,
  useLocation
} from 'react-router-dom'

import SideBar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'

const paginas = {
  '/' : 'Dashboard',
  '/receitas': 'Receitas',
  '/despesas': 'Despesas',
  '/contas': 'Contas',
  '/relatorios': 'Relatórios'
}

function PaginaEmConstrucao({ titulo }) {
  return (
    <div className='content-card text-center py-5'>
        <i className='bi bi-tools fs-1 text-sucess'></i>
        <h2 className='mt-3'>
          {titulo}
        </h2>

        <p className='text-secondary mb-0'>
          Esta funcionalidade será desenvolvida em breve.
        </p>
    </div>
  )
}

function Layout() {

  const [menuAberto, setMenuAberto] = useState(false)
  const location = useLocation()

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
          <Routes>
            <Route path='/' element={<Dashboard /> }/>

            {Object.entries(paginas)
              .filter(([rota]) => rota != '/')
              .map(([rota, nome]) => (
                <Route
                  key={rota}
                  path={rota}
                  element={<PaginaEmConstrucao titulo={nome} />}
                />
              ))}

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

  return (
   <BrowserRouter>
      <Layout />
   </BrowserRouter>
  )
}

export default App
