const PdfPrinter = require('pdfmake/js/printer').default;
const path = require('path');

const fonts = {
    Roboto: {
        normal: path.join(__dirname, 'node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf'),
        bold: path.join(__dirname, 'node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf'),
        italics: path.join(__dirname, 'node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, 'node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf'),
    },
};

const printer = new PdfPrinter(fonts);
const docDefinition = {
    content: ['Hello world']
};

try {
    const pdfDocPromise = printer.createPdfKitDocument(docDefinition);
    console.log('pdfDocPromise constructor name:', pdfDocPromise.constructor.name);

    pdfDocPromise.then(pdfDoc => {
        console.log('Resolved pdfDoc type:', typeof pdfDoc);
        console.log('Resolved pdfDoc has .on:', typeof pdfDoc.on);
        console.log('Resolved pdfDoc constructor name:', pdfDoc.constructor.name);
    }).catch(err => {
        console.error('Promise error (likely font issue):', err.message);
    });
} catch (err) {
    console.error('Catch error:', err);
}
