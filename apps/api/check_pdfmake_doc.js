const path = require('path');

try {
    const PdfPrinter = require('pdfmake/js/printer').default;
    const fonts = {
        Roboto: {
            normal: path.join(process.cwd(), '../../node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf'),
            bold: path.join(process.cwd(), '../../node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf'),
            italics: path.join(process.cwd(), '../../node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf'),
            bolditalics: path.join(process.cwd(), '../../node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf'),
        }
    };
    const printer = new PdfPrinter(fonts);

    // Simple content
    const docDefinition = { content: 'test', defaultStyle: { font: 'Roboto' } };

    console.log('Creating Doc...');
    const doc = printer.createPdfKitDocument(docDefinition);
    console.log('Doc Created.');

    console.log('Doc Type:', typeof doc);
    console.log('Has .on?', typeof doc.on === 'function');
    console.log('Has .pipe?', typeof doc.pipe === 'function');
    console.log('Keys:', Object.keys(doc));

} catch (e) {
    console.log('FAIL:', e.message);
    if (e.stack) console.log(e.stack);
}
