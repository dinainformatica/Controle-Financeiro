import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function ProtectedRoute() {
    const { usuario, carregando } = useAuth();

    if (carregando) {
        return (
            <div className="loading-screen">
                <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">
                        Carregando...
                    </span>
                </div>

                <p>Verificando sua sessão...</p>
            </div>
        )
    }

    if(!usuario) {
        return <Navigate to="/login" replace />
    }

    return <Outlet />
}

export default ProtectedRoute