import { NavLink } from "react-router-dom"

const menus = [
    { nome: 'Dashboard', icone: 'grid', rota: '/' },
    { nome: 'Receitas', icone: 'arrow-down-circle', rota: '/receitas' },
    { nome: 'Despesas', icone: 'arrow-up-circle', rota: '/despesas' },
    { nome: 'Contas', icone: 'wallet2', rota: '/contas' },
    { nome: 'Relatórios', icone: 'bar-chart', rota: '/relatorios' },
]

function Sidebar({ aberto, fechar }) {
    return (
        <>
            {aberto && (
                <div
                    className="sidebar-overlay d-lg-none"
                    onClick={fechar}
                />
            )}

            <aside className={`sidebar ${aberto ? 'sidebar-open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="brand-symbol">
                        <i className="bi bi-wallet2"></i>
                    </div>

                    <span>Meu Financeiro</span>
                </div>

                <p className="sidebar-label">
                    MENU PRINCIPAL
                </p>

                <nav className="sidebar-nav">
                    {menus.map((menu) => (
                        <NavLink
                            key={menu.rota}
                            to={menu.rota}
                            end={menu.rota === '/'}
                            onClick={fechar}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`
                            }
                        >
                            <i className={`bi bi-${menu.icone}`}></i>
                            <span>{menu.nome}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-bottom">
                    <i className="bi bi-shield-check me-2"></i>
                    Acesso privado
                </div>
            </aside>
        </>
    )
}

export default Sidebar