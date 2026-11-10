import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'


function Cadastro() {
    const { usuario, cadastrar } = useAuth()

    const [nome, setNome] = useState('')
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [confirmar, setConfirmar] = useState('')
    const [erro, setErro] = useState('')
    const [sucesso, setSucesso] = useState('')
    const [enviando, setEnviando] = useState(false)

    if(usuario) 
        return <Navigate to="/" replace />


    async function handleSubmit(e) {
        e.preventDefault()
        setErro('')
        setSucesso('')

        if(senha.length < 8) {
            setErro('A senha deve ter pelo menos 8 caracteres.')
            return
        }

        if(senha != confirmar) {
            setErro('As senhas não conferem.')
            return
        }

        setEnviando(true)

        try {
            const { error } = await cadastrar(nome.trim(), email, senha)

            if(error) {
                setErro(error.message)
                return
            }

            setSucesso(
                'Solicitação recebida. Se o cadastro for aprovado, você receberá um e-mail de confirmação.'
            )
        } catch {
            setErro('Erro de conexão. Tente novamente.')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className="auth-layout">
            <section className="auth-side d-lg-flex">
                <div className="auth-side-content">
                    <div className="auth-side icon">
                        <i className="bi bi-person-plus"></i>
                    </div>
                    <h1>Comece a organizar suas finanças</h1>
                    <p>Tenha uma visão clara do seu dinheiro e acompanhe suas metas financeiras.</p>
                </div>
            </section>

            <main className="auth-main">
                <div className="auth-card">
                    <div className="auth-heading">
                        <h2>Criar minha conta</h2>
                        <p>Preencha seus dados para começar.</p>
                    </div>

                    {erro &&  <div className='alert alert-danger'>{erro}</div>}
                    {sucesso &&  <div className='alert alert-success'>{sucesso}</div>}


                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="cad-nome">
                                Nome completo
                            </label>

                            <input
                                id='cad-nome'
                                className='form-control auth-input'
                                value={nome}
                                onChange={e => setNome(e.target.value)}
                                autoComplete='name'
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="cad-email" className='form-label'>
                                E-mail
                            </label>

                            <input
                                id='cad-email'
                                type='email'
                                className='form-control auth-input'
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                autoComplete='email'
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="cad-senha" className='form-label'>
                                Senha
                            </label>

                            <input
                                id='cad-senha'
                                type='password'
                                className='form-control auth-input'
                                value={senha}
                                onChange={e => setSenha(e.target.value)}
                                autoComplete="new-password"
                                minLength={8}
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="cad-confirmar" className='form-label'>
                                Confirmar senha
                            </label>

                            <input 
                                id='cad-confirmar'
                                type='password'
                                className='form-control auth-input'
                                value={confirmar}
                                onChange={e => setConfirmar(e.target.value)}
                                autoComplete='new-password'
                                minLength={8}
                                required
                            />
                        </div>

                        <button 
                            type="submit"
                            className='btn btn-success auth-button w-100'
                            disabled={enviando}
                        >
                            {enviando ? 'Cadastrando...' : 'Criar conta'}
                        </button>
                    </form>

                    <p className='auth-footer'>
                        Já possui conta?     
                        <Link to='/login' className='auth-link'>
                             Fazer login</Link>
                    </p>
                </div>
            </main>
        </div>
    )
}

export default Cadastro