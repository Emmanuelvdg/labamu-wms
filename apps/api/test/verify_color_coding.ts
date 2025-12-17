
import { PrismaClient } from '@labamu/database';
import { InventoryService } from '../src/inventory/inventory.service';
import { PrismaService } from '../src/prisma.service';

const prisma = new PrismaClient();
const prismaService = new PrismaService();
const inventoryService = new InventoryService(prismaService);

async function main() {
    console.log('Starting Color Coding Verification...');

    // 1. Create a Location with Color
    console.log('1. Creating Location with Color...');
    const locationName = 'Color Test Room ' + Date.now();
    const color = '#ff0000'; // Red

    const location = await inventoryService.createLocation({
        name: locationName,
        structuralType: 'ROOM',
        type: 'INTERNAL',
        attributes: { color: color, temperature: 'Refrigerated' }
    });
    console.log('Location Created:', location.id, location.attributes);

    // 2. Fetch Location Tree
    console.log('2. Fetching Location Tree...');
    const tree = await inventoryService.getLocationsTree();

    // Find our location in the tree (it might be a root or child, but let's search recursively)
    function findNode(nodes: any[], id: string): any {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findNode(node.children, id);
                if (found) return found;
            }
        }
        return null;
    }

    const node = findNode(tree, location.id);

    if (node) {
        console.log('Node Found:', node.name);
        console.log('Node Attributes:', node.attributes);

        if (node.attributes && node.attributes.color === color) {
            console.log('SUCCESS: Color attribute correctly parsed and returned.');
        } else {
            console.error('FAILURE: Color attribute missing or incorrect.');
            console.error('Expected:', color);
            console.error('Actual:', node.attributes?.color);
        }
    } else {
        console.error('FAILURE: Location not found in tree.');
    }

    // Cleanup
    await prisma.location.delete({ where: { id: location.id } });
    console.log('Cleanup complete.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
