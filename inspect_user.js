const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@labamu.co.id' },
      include: { 
        roles: { 
          include: { 
            permissions: true 
          } 
        } 
      }
    });

    console.log('--- USER DATA ---');
    console.log(JSON.stringify(user, null, 2));
    
    if (user && user.roles) {
      user.roles.forEach((role, rIdx) => {
        console.log(`Role ${rIdx}: ${role.name}`);
        console.log('Permissions type:', typeof role.permissions);
        console.log('Is Permissions Array:', Array.isArray(role.permissions));
        console.log('Permissions value:', role.permissions);
      });
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
