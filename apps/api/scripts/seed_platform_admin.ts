/**
 * Assigns ALL:MANAGE permission to admin@labamu.co.id so the user can
 * access /platform/* endpoints as a Labamu platform admin.
 *
 * Run: npx ts-node -r tsconfig-paths/register scripts/seed_platform_admin.ts
 */
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    // 1. Upsert global ADMIN role (companyId = null)
    let role = await prisma.role.findFirst({
        where: { name: 'ADMIN', companyId: null },
    });
    if (!role) {
        role = await prisma.role.create({
            data: { name: 'ADMIN', description: 'Labamu Platform Administrator', isSystem: true },
        });
        console.log('Created ADMIN role');
    } else {
        console.log('ADMIN role already exists');
    }

    // 2. Upsert ALL:MANAGE permission on that role
    await prisma.permission.upsert({
        where: { roleId_resource_action: { roleId: role.id, resource: 'ALL', action: 'MANAGE' } },
        update: {},
        create: { roleId: role.id, resource: 'ALL', action: 'MANAGE' },
    });
    console.log('ALL:MANAGE permission ensured');

    // 3. Connect admin@labamu.co.id to the ADMIN role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allUsers: any[] = await prisma.$queryRaw`SELECT id, email FROM "User" LIMIT 20`;
    console.log('Users in DB:', JSON.stringify(allUsers));
    const adminEmail = 'admin@labamu.co.id';
    const userRow = allUsers.find((u: any) => u.email === adminEmail)
        ?? allUsers.find((u: any) => u.email.toLowerCase().includes('admin'));
    if (!userRow) { throw new Error('No admin user found — run seed-realistic-data first'); }
    const user = { id: userRow.id, email: userRow.email };

    await prisma.user.update({
        where: { id: user.id },
        data: { roles: { connect: { id: role.id } } },
    });
    console.log(`admin@labamu.co.id (${user.id}) connected to ADMIN role with ALL:MANAGE`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
