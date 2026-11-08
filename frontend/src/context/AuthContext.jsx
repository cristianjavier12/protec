import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../services/index'
import { setAuthToken, setUnauthorizedHandler } from '../services/apiClient'
import { useToast } from './ToastContext'

/**
 * AuthContext
 * -----------
 * Maneja autenticación real con JWT + Express + MySQL.
 * La sesión se conserva en localStorage y se valida contra GET /auth/me al recargar.
 *
 * Forma de `user`:
 * { id, nombre, apellidos, correo, telefono, rol: 'usuario' | 'tecnico' | 'admin', fechaRegistro }
 */
const AuthContext = createContext(null)

const TOKEN_KEY = 'protec_token'
const USER_KEY = 'protec_user'

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  setAuthToken(null)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null)
  const [loading, setLoading] = useState(true)
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  // Restaurar y validar la sesión al montar.
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY)
    if (!savedToken) {
      setLoading(false)
      return
    }
    setAuthToken(savedToken)
    authService
      .me()
      .then((res) => {
        const userData = res.user
        setUser(userData)
        setToken(savedToken)
        localStorage.setItem(USER_KEY, JSON.stringify(userData))
      })
      .catch((err) => {
        // Solo se descarta la sesión si el servidor la rechaza; con error de red
        // se conserva la sesión guardada.
        if (err?.status === 401 || err?.status === 403 || err?.status === 404) {
          clearStoredSession()
          setUser(null)
          setToken(null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  // Si una petición autenticada recibe 401 (token expirado), se cierra la sesión,
  // se avisa al usuario y se le envía a /login conservando la página de origen.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Varias peticiones pueden fallar a la vez: solo se avisa una vez.
      const hadSession = Boolean(localStorage.getItem(TOKEN_KEY))
      clearStoredSession()
      setUser(null)
      setToken(null)
      if (!hadSession) return
      notify({ type: 'warning', title: 'Tu sesión ha expirado. Inicia sesión nuevamente.' })
      if (location.pathname !== '/login') navigate('/login', { replace: true, state: { from: location } })
    })
    return () => setUnauthorizedHandler(null)
  }, [navigate, notify, location])

  const login = useCallback(async (credentials) => {
    const res = await authService.login(credentials)
    const { token: newToken, user: userData } = res
    setAuthToken(newToken)
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
    setToken(newToken)
    setUser(userData)
    return userData
  }, [])

  const register = useCallback(async (payload) => {
    const res = await authService.register(payload)
    return res
  }, [])

  const logout = useCallback(() => {
    setAuthToken(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
    setToken(null)
  }, [])

  /** Actualiza los datos del usuario en memoria (ej. después de editar el perfil). */
  const updateUser = useCallback((userData) => {
    if (!userData) return
    setUser(userData)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
  }, [])

  /** Reemplaza el token de la sesión actual (después de cambiar la contraseña). */
  const setSession = useCallback((newToken, userData) => {
    if (!newToken) return
    setAuthToken(newToken)
    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
    if (userData) {
      setUser(userData)
      localStorage.setItem(USER_KEY, JSON.stringify(userData))
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      logout,
      updateUser,
      setSession,
    }),
    [user, token, loading, login, register, logout, updateUser, setSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
