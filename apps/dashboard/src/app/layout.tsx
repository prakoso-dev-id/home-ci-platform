import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Home CI Platform',
    description: 'Internal deployment dashboard for home server',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <nav className="navbar">
                    <a href="/" className="navbar-brand">
                        <span>⚡</span> Home CI Platform
                    </a>
                </nav>
                <main className="container">{children}</main>
            </body>
        </html>
    );
}
