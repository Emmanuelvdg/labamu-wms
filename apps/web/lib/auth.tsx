'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { fetchWithRetry, API_URL } from './api';
import Cookies from 'js-cookie';

interface Permission {
    resource: string;
    action: string;
}

interface Role {
    name: string;
    permissions: Permission[];
}

interface User {
    id: string;
    name: string;
    email: string;
    roles: Role[];
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    hasPermission: (resource: string, action: string) => boolean;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    hasPermission: () => false,
    refreshUser: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const userId = Cookies.get('user_id');
            if (!userId) {
                setUser(null);
                setLoading(false);
                return;
            }

            // We can't use fetchWithRetry here if it depends on this hook, but fetchWithRetry uses cookies directly so it's fine.
            // Actually, fetchWithRetry uses API_URL. We should probably just use fetchWithRetry.
            // But wait, fetchWithRetry might throw if 401.

            // Uses the proxied /api URL (same origin)
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { 'x-user-id': userId }
            });

            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshUser();
    }, []);

    const hasPermission = (resource: string, action: string) => {
        if (!user || !user.roles || user.roles.length === 0) return false;

        const allPermissions = user.roles.flatMap(r => r.permissions);

        // Admin Super-User Check
        if (allPermissions.some(p => p.resource === 'ALL' && p.action === 'MANAGE')) {
            return true;
        }

        return allPermissions.some(
            p => p.resource === resource && p.action === action
        );
    };

    return (
        <AuthContext.Provider value={{ user, loading, hasPermission, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
