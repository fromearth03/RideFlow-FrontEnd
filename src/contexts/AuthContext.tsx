import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthUser, AuthState, UserRole } from '@/types';
import { authApi, resolveCachedUserIdByEmail } from '@/services/api';

interface RegisterData {
  email: string;
  password: string;
  role: UserRole;
  licenseNumber?: string;
  adminSecretKey?: string;
  phone?: string;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

function getRoleDashboard(role: UserRole): string {
  switch (role) {
    case 'ROLE_ADMIN': return '/admin-dashboard';
    case 'ROLE_DRIVER': return '/driver-dashboard';
    case 'ROLE_DISPATCHER': return '/dispatcher-dashboard';
    case 'ROLE_CUSTOMER':
    default: return '/user-dashboard';
  }
}

function requiresApproval(role: UserRole): boolean {
  return role === 'ROLE_DRIVER' || role === 'ROLE_DISPATCHER';
}

function resolveApproval(role: UserRole, approved?: boolean | null): boolean {
  if (!requiresApproval(role)) return true;
  if (approved === undefined || approved === null) return true;
  return approved === true;
}

function extractUserIdFromToken(token: string | null): number | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    const candidates = [payload.userId, payload.user_id, payload.id, payload.uid, payload.sub];
    for (const candidate of candidates) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  } catch {
    return null;
  }

  return null;
}

const AuthProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role') as UserRole | null;
    const email = localStorage.getItem('email');
    const storedUserId = Number(localStorage.getItem('userId') ?? 0);
    const persistedUserId = Number.isFinite(storedUserId) && storedUserId > 0 ? storedUserId : null;
    const tokenUserId = extractUserIdFromToken(token);
    const cachedUserId = resolveCachedUserIdByEmail(email);
    const userId = persistedUserId ?? tokenUserId ?? cachedUserId;
    const approvedRaw = localStorage.getItem('approved');
    const approved = approvedRaw === null ? undefined : approvedRaw === 'true';
    if (token && role && email) {
      const resolvedApproved = resolveApproval(role, approved);
      if (requiresApproval(role) && !resolvedApproved) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('email');
        localStorage.removeItem('approved');
        localStorage.removeItem('userId');
        setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
        return;
      }
      setState({
        user: { id: userId, email, role, approved: resolvedApproved },
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      if (userId && userId > 0) {
        localStorage.setItem('userId', String(userId));
      }
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  // Listen for 401 → logout event from api.ts
  useEffect(() => {
    const handler = () => {
      setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [navigate]);

  const persistAuth = (email: string, token: string, role: UserRole, approved: boolean, userId?: number | null) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('email', email);
    localStorage.setItem('approved', String(approved));
    if (userId && userId > 0) {
      localStorage.setItem('userId', String(userId));
    } else {
      localStorage.removeItem('userId');
    }
    setState({ user: { id: userId ?? null, email, role, approved }, token, isAuthenticated: true, isLoading: false });
  };

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    const approved = resolveApproval(data.role, data.approved);
    if (requiresApproval(data.role) && !approved) {
    }
    const fallbackUserId = data.userId ?? resolveCachedUserIdByEmail(email);
    persistAuth(email, data.token, data.role, approved, fallbackUserId);
    navigate(getRoleDashboard(data.role), { replace: true });
  }, [navigate]);

  const register = useCallback(async ({ email, password, role, licenseNumber, adminSecretKey, phone }: RegisterData) => {
    let data;
    switch (role) {
      case 'ROLE_DRIVER':
        if (!licenseNumber?.trim()) {
          throw { errors: { licenseNumber: 'License number is required for drivers.' } };
        }
        data = await authApi.registerDriver(email, password, licenseNumber.trim());
        break;
      case 'ROLE_DISPATCHER':
        data = await authApi.registerDispatcher(email, password);
        break;
      case 'ROLE_ADMIN':
        if (!adminSecretKey?.trim()) {
          throw { errors: { adminSecretKey: 'Admin secret key is required.' } };
        }
        data = await authApi.registerAdmin(email, password, adminSecretKey.trim());
        break;
      case 'ROLE_CUSTOMER':
      default:
        data = await authApi.registerCustomer(email, password, phone);
        break;
    }
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    localStorage.removeItem('approved');
    localStorage.removeItem('userId');
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
    navigate('/login', { replace: true, state: { justRegistered: true, role: data.role } });
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    localStorage.removeItem('approved');
    localStorage.removeItem('userId');
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
    navigate('/login', { replace: true });
  }, [navigate]);

  const hasRole = useCallback((role: UserRole | UserRole[]) => {
    if (!state.user) return false;
    return Array.isArray(role) ? role.includes(state.user.role) : state.user.role === role;
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

// Wrap with BrowserRouter context (navigate requires it)
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthProviderInner>{children}</AuthProviderInner>;
};
