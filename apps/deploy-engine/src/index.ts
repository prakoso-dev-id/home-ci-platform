import Fastify from 'fastify';
import { env } from './config';
import { authHook } from './auth';
import { initializeDatabase, closeDatabase } from './services/database.service';
import { deployRoutes } from './routes/deploy.routes';
import { statusRoutes } from './routes/status.routes';
import { streamRoutes } from './routes/stream.routes';

async function main() {
    // Initialize database
    initializeDatabase();

    // Create Fastify instance
    const app = Fastify({
        logger: {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
                },
            },
        },
    });

    // Global auth hook
    app.addHook('onRequest', authHook);

    // CORS — allow dashboard on LAN
    app.addHook('onRequest', async (request, reply) => {
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (request.method === 'OPTIONS') {
            reply.code(204).send();
        }
    });

    // Health check
    app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

    // Register routes
    await app.register(deployRoutes);
    await app.register(statusRoutes);
    await app.register(streamRoutes);

    // Graceful shutdown
    const shutdown = async () => {
        app.log.info('Shutting down...');
        closeDatabase();
        await app.close();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Start server — bind to localhost ONLY
    try {
        await app.listen({
            port: env.DEPLOY_ENGINE_PORT,
            host: env.DEPLOY_ENGINE_HOST,
        });
        app.log.info(
            `🚀 Deploy Engine running on http://${env.DEPLOY_ENGINE_HOST}:${env.DEPLOY_ENGINE_PORT}`
        );
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

main();
