'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Mock authentication
    if (email === 'admin@labamu.co.id' && password === 'admin') {
        console.log('[Login Action] Setting auth cookie');
        (await cookies()).set('auth', 'true', {
            path: '/',
            httpOnly: true,
            secure: false, // Force false for localhost debugging
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        redirect('/');
    } else {
        return { error: 'Invalid credentials' };
    }
}
