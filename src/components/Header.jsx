import { useNavigate } from "react-router-dom"
import { useAuth } from '../contexts/AuthContext'

function Header({ titulo, abrirMenu}) {
    const { usuario, sair } = useAuth()
    const navigate = useNavigate()

    const nome = usuario?.user_metadata?.nome || 'Usuário'


    const dataAtual = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date())

    async function handleLogout() {
        const { error } = await sair()

        if (error) {
            alert('Não foi possícel sair. Tente novamente.')
            return
        }

        navigate('/login', {replace: true})
    }

    
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

       <div className="d-flex align-items-center gap-3">
        <div className="user-profile">
            <div className="user-avatar">
                <i className="bi bi-person"></i>
            </div>

            <div className="d-none d-sm-block">
                <strong>{nome}</strong>
                <small>{usuario?.email}</small>
            </div>
        </div>

        <button
            className="btn btn-outline-danger btn-sm"
            onClick={handleLogout}
            title="Sair da conta"
            aria-label="Sair da conta"
        >
            <i className="bi bi-box-arrow-right"></i>
        </button>
       </div>
       </header>
    )
}

export default Header