import { prisma } from './src/lib/db';
import { syncUserRBAC } from './src/actions/rbac';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function main() {
    try {
        const providerId = 'cmloc439k000d0gyjxnz5sp99';
        const provider = await prisma.provider.findUnique({
            where: { id: providerId },
            include: { user: true }
        });

        if (!provider) {
            console.error('Provider not found');
            return;
        }

        console.log(`Syncing RBAC for user ${provider.userId} (Email: ${provider.user.email})...`);
        const res = await syncUserRBAC(provider.userId);
        console.log('Result:', res);
    } catch (err) {
        console.error('Failed to sync RBAC:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
