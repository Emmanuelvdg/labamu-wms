
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/settings/users/users.service';
import { RolesService } from '../src/settings/roles.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);
    const rolesService = app.get(RolesService);

    console.log('Starting User Management Verification...');

    try {
        // 1. Get a Role
        const roles = await rolesService.getRoles();
        const viewerRole = roles.find(r => r.name === 'Viewer') || roles[0];
        if (!viewerRole) throw new Error('No roles found');
        console.log(`Using Role: ${viewerRole.name}`);

        // 2. Create User
        const email = `test.user.${Date.now()}@labamu.co.id`;
        console.log(`Creating User: ${email}`);
        const user = await usersService.createUser({
            name: 'Test User',
            email: email,
            password: 'password123',
            roleIds: [viewerRole.id]
        });
        console.log('User Created:', user.id);

        // 3. Fetch User
        const fetchedUser = await usersService.getUser(user.id);
        if (fetchedUser.email !== email) throw new Error('Email mismatch');
        if (!fetchedUser.roles || !fetchedUser.roles.some((r: any) => r.id === viewerRole.id)) throw new Error('Role mismatch');
        console.log('User Fetched & Verified');

        // 4. Update User
        console.log('Updating User...');
        const updatedUser = await usersService.updateUser(user.id, {
            name: 'Updated Test User'
        });
        if (updatedUser.name !== 'Updated Test User') throw new Error('Name update failed');
        console.log('User Updated');

        // 5. Delete User
        console.log('Deleting User...');
        await usersService.deleteUser(user.id);
        try {
            await usersService.getUser(user.id);
            throw new Error('User should be deleted');
        } catch (e: any) {
            if (e.message !== 'User not found') throw e;
        }
        console.log('User Deleted');

        console.log('SUCCESS: User Management Verification Passed!');

    } catch (error) {
        console.error('FAILED:', error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

bootstrap();
