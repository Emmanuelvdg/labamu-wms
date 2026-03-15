const fs = require('fs');
const path = require('path');

const plan11Path = path.join(__dirname, 'E2E_Test_Plan11.md');

try {
    let content = fs.readFileSync(plan11Path, 'utf8');

    // Remove all lines that contain the test execution results
    content = content.replace(/^\s*- \*\*Result\*\*:.*$/gm, '');

    // The replace above might leave empty lines, though \n is at the end of the replaced line.
    // Let's actually match the line including its trailing newline to avoid blank lines.
    // First, restore content and do it properly:
    content = fs.readFileSync(plan11Path, 'utf8');
    content = content.replace(/^\s*- \*\*Result\*\*:.*\n?/gm, '');

    // Reset all checkboxes to empty
    content = content.replace(/- \[[xX]\]/g, '- [ ]');

    fs.writeFileSync(plan11Path, content, 'utf8');
    console.log('Successfully reset all results in E2E_Test_Plan11.md');
} catch (error) {
    console.error('Error processing the file:', error);
}
