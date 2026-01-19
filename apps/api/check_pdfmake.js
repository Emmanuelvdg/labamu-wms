try {
    const PdfPrinter = require('pdfmake/js/printer');
    console.log('Import Type:', typeof PdfPrinter);
    console.log('Is Constructor?', typeof PdfPrinter === 'function');

    // Check if it's the class or object
    if (typeof PdfPrinter === 'function') {
        new PdfPrinter({ Roboto: { normal: 'a', bold: 'a', italics: 'a', bolditalics: 'a' } });
        console.log('Constructor SUCCESS');
    } else {
        console.log('Keys:', Object.keys(PdfPrinter));
        // Maybe default export?
        if (PdfPrinter.default) {
            const P = PdfPrinter.default;
            new P({ Roboto: { normal: 'a', bold: 'a', italics: 'a', bolditalics: 'a' } });
            console.log('Constructor (default) SUCCESS');
        }
    }
} catch (e) {
    console.log('FAIL:', e.message);
}
