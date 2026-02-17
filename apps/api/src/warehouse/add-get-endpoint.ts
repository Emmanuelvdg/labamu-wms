import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, 'warehouse-area.controller.ts');

const endpoint = `
    @Get(':id')
    async getWarehouse(@Param('id') id: string) {
        return this.prisma.warehouse.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                shortName: true,
                address: true,
                city: true,
                state: true,
                postalCode: true,
                country: true,
                latitude: true,
                longitude: true,
                type: true,
                floorPlanShape: true,
                floorPlanVertices: true,
                floorPlanWidth: true,
                floorPlanHeight: true,
                gridEnabled: true,
                gridSize: true,
                snapToGrid: true,
            },
        });
    }
`;

const content = fs.readFileSync(filePath, 'utf-8');

// Insert after @Get() getAllWarehouses method
const insertAfter = '    }\r\n\r\n    @Patch(\':id\')';
const newContent = content.replace(insertAfter, endpoint + '\r\n' + insertAfter);

if (content === newContent) {
    console.log('⚠️  No changes made - pattern not found or endpoint already exists');
    process.exit(1);
}

fs.writeFileSync(filePath, newContent, 'utf-8');
console.log('✅ Successfully added GET /:id endpoint to warehouse controller');
