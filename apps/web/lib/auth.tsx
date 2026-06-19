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
    companyId: string | null;
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

/**
 * Reads the `user_data` cookie (set at login) to build an initial User object.
 * This allows `hasPermission` to work immediately on page load without waiting
 * for the `/api/auth/me` round-trip, preventing intermittent button-not-found
 * failures when the network request is slow or retried.
 */
function getUserFromCookie(): User | null {
    try {
        const raw = Cookies.get('user_data');
        if (!raw) return null;
        const parsed = JSON.parse(decodeURIComponent(raw));
        if (!parsed?.id) return null;
        // permissions is stored as ["ALL:MANAGE", ...] flat strings
        const permissions: Permission[] = (parsed.permissions ?? []).map((p: string) => {
            const [resource, action] = p.split(':');
            return { resource: resource ?? '*', action: action ?? '*' };
        });
        return {
            id: parsed.id,
            name: parsed.name ?? '',
            email: parsed.email ?? '',
            companyId: parsed.companyId ?? null,
            roles: [{ name: 'cached', permissions }],
        };
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Initialise synchronously from cookie so hasPermission works on first render
    const [user, setUser] = useState<User | null>(() => getUserFromCookie());
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const userId = Cookies.get('user_id');
            if (!userId) {
                setUser(null);
                setLoading(false);
                return;
            }

            // Uses the proxied /api URL (same origin)
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { 'x-user-id': userId },
                cache: 'no-store',
            });

            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
            } else {
                // Keep cookie-hydrated user on non-401 failures; clear on 401
                if (res.status === 401) setUser(null);
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
            // Keep the cookie-hydrated user so the UI remains functional
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

        // Super-user wildcard: ALL:MANAGE (platform seed) or *:MANAGE (registerCompany)
        if (allPermissions.some(
            p => (p.resource === 'ALL' || p.resource === '*') &&
                 (p.action === 'MANAGE' || p.action === '*')
        )) {
            return true;
        }

        return allPermissions.some(
            p => (p.resource === resource || p.resource === '*') &&
                 (p.action === action || p.action === '*')
        );
    };

    return (
        <AuthContext.Provider value={{ user, loading, hasPermission, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
