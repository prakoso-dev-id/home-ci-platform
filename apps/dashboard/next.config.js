/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    // Proxy API calls to Deploy Engine in development
    async rewrites() {
        return [
            {
                source: '/api/engine/:path*',
                destination: `http://127.0.0.1:${process.env.DEPLOY_ENGINE_PORT || 4000}/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
