'use client';

import { usePathname, useRouter } from 'next/navigation';

export function Navbar() {
    const pathname = usePathname();
    const router = useRouter();

    // Hide navbar on login page
    if (pathname === '/login') return null;

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    return (
        <nav className="navbar">
            <a href="/" className="navbar-brand">
                <span>⚡</span> Home CI Platform
            </a>
            <div style={{ marginLeft: 'auto' }}>
                <button
                    onClick={handleLogout}
                    className="btn btn-outline"
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                    Logout
                </button>
            </div>
        </nav>
    );
}
