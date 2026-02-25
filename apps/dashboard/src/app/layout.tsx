import type { Metadata } from 'next';
import { ToastProvider } from '@/components/Toast';
import { Navbar } from '@/components/Navbar';
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
                <ToastProvider>
                    <Navbar />
                    <main className="container">{children}</main>
                </ToastProvider>
            </body>
        </html>
    );
}
