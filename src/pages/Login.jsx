import { useState } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

function Login() {
    const { usuario, entrar } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [mostrarSenha, setMostrarSenha] = useState(false)
    const [erro, setErro] = useState('')
    const [enviando, setEnviando] = useState(false)

    if (usuario)
        return <Navigate to='/' replace />

    async function handleSubmit(e) {
        e.preventDefault()
        setErro('')
        setEnviando(true)

        try {
            const { error } = await entrar(email, senha)

            if (error) {
                setErro('Não foi possível entrar. Verifique seus dados e a confirmação do e-mail.')
                return
            }

            navigate('/', { replace: true })
        } catch {
            setErro('Ocorreu um erro de conexão. Tente novamente.')
        } finally {
            setEnviando(false)
        }
    }


    return (
        <div className="auth-layout">
            <section className="auth-side d-none d-lg-flex">
                <div className="auth-side-content">
                    <div className="auth-side-icon">
                        <i className="bi bi-wallet2"></i>
                    </div>
                    <h1>Suas finanças em boas mãos</h1>

                    <p>Organize receitas, despesas e acompanhe seu crescimento financeiro em um só lugar.</p>

                    <div className="auth-feature">
                        <i className="bi bi-graph-up-arrow"></i>
                        Controle inteligente e organizado
                    </div>

                    <div className="auth-feature">
                        <i className="bi bi-shield-check"></i>
                        Acesso protegido à sua conta
                    </div>
                </div>
            </section>

            <div className="auth-main">
                <div className="auth-card">
                    <div className="auth-mobile-brand d-lg-none">
                        <i className="bi bi-wallet2"></i>
                        Meu Financeiro
                    </div>

                    <div className="auth-heading">
                        <h2>Bem-vindo de volta!</h2>
                        <p>Entre com seus dados para continuar.</p>
                    </div>

                    {erro && (
                        <div className="alert alert-danger" role="alert">
                            {erro}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="login-email" className="form-label">
                                E-mail
                            </label>

                            <input
                                id="login-email"
                                type="email"
                                className="form-control auth-input"
                                placeholder="seuemail@exemplo.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className="mb-2">
                            <label htmlFor="login-senha" className="form-label">
                                Senha
                            </label>

                            <div className="input-group">
                                <input
                                    id="login-senha"
                                    type={mostrarSenha ? 'text' : 'password'}
                                    className="form-control auth-input"
                                    placeholder="Digite sua senha"
                                    value={senha}
                                    onChange={e => setSenha(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                />

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setMostrarSenha(!mostrarSenha)}
                                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}

                                >
                                    <i className={`bi bi-eye${mostrarSenha ? '-slash' : ''}`}></i>
                                </button>
                            </div>
                        </div>

                        <div className="text-end mb-4">
                            <Link to="/recuperar-senha" className="auth-link">
                                Esqueceu sua senha?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-success auth-button w-100"
                            disabled={enviando}
                        >
                            {enviando ? 'Entrando...' : 'Entrar na minha conta'}

                            {!enviando && <i className="bi bi-arrow-right ms-2"></i>}
                        </button>
                    </form>

                    <p className="auth-footer">
                        Ainda não tem uma conta?{' '}
                        <Link to={"/cadastro"} className="auth-link">
                            Cadastre-se
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Login