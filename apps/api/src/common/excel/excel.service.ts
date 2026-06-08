import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface ExcelColumn {
    header: string;
    key: string;
    width?: number;
}

@Injectable()
export class ExcelService {
    async buildBuffer(
        sheetName: string,
        columns: ExcelColumn[],
        rows: Record<string, any>[],
    ): Promise<Buffer> {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet(sheetName);

        ws.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width ?? 20 }));

        const headerRow = ws.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3EAFD' } };
        headerRow.border = { bottom: { style: 'thin', color: { argb: 'FF93B4F5' } } };

        rows.forEach(r => ws.addRow(r));

        const ab = await wb.xlsx.writeBuffer();
        return Buffer.from(ab);
    }
}
