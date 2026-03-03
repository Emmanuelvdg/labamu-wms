const { PrismaClient } = require('@labamu/database');
const p = new PrismaClient();
async function main() {
    const users = await p.user.findMany({ select: { id: true, email: true } });
    console.log(JSON.stringify(users));
}
main().catch(console.error).finally(() => p.$disconnect());
