'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';

export async function login(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    let result: any;
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            return { error: 'Invalid credentials' };
        }

        result = await res.json();
    } catch {
        return { error: 'Could not reach the server. Please try again.' };
    }

    const { token, user } = result;
    if (!user) return { error: 'Unexpected response from server' };

    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === 'production';
    const opts = {
        path: '/',
        secure: isProd,
        maxAge: 60 * 60 * 24 * 7,
    };

    cookieStore.set('auth', 'true', { ...opts, httpOnly: true });
    if (token) {
        cookieStore.set('token', token, { ...opts, httpOnly: true });
    }
    cookieStore.set('user_id', user.id, { ...opts, httpOnly: false });
    if (user.companyId) {
        cookieStore.set('company_id', user.companyId, { ...opts, httpOnly: false });
    }
    cookieStore.set('user_data', JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: user.companyId ?? null,
        companySlug: user.company?.slug ?? null,
        permissions: user.roles?.flatMap(
            (r: any) => r.permissions?.map((p: any) => `${p.resource}:${p.action}`) ?? []
        ) ?? [],
    }), { ...opts, httpOnly: false });

    redirect('/');
}
