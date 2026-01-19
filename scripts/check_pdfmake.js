const PdfPrinter = require('pdfmake');
console.log('Type:', typeof PdfPrinter);
console.log('Keys:', Object.keys(PdfPrinter));
try {
    new PdfPrinter({ Roboto: { normal: 'a', bold: 'a', italics: 'a', bolditalics: 'a' } });
    console.log('Constructor SUCCESS');
} catch (e) {
    console.log('Constructor FAIL:', e.message);
}
