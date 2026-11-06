function Header({ titulo, abrirMenu}) {
    const dataAtual = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date())

    
    return (
       <header className="topbar">
        <div className="d-flex align-items-center gap-3">
            <button
                className="menu-toggle d-lg-none"
                onClick={abrirMenu}
                aria-label="Abrir menu"
            >
                <i className="bi bi-list"></i>
            </button>

            <div>
                <h1 className="page-title">
                    {titulo}
                </h1>

                <p className="page-subtitle mb-0">
                    {dataAtual}
                </p>
            </div>
        </div>

        <div className="user-profile">
            <div className="user-avatar">
                <i className="bi bi-person"></i>
            </div>

            <div className="d-none d-sm-block">
                <strong>Administrador</strong>
                <small>Conta de demonstração</small>
            </div>
        </div>
       </header>
    )
}

export default Header