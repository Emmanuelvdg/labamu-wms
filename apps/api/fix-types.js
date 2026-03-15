const fs = require('fs');
const path = require('path');

const handlersDir = path.join(__dirname, 'src', 'workflow', 'handlers');
const files = fs.readdirSync(handlersDir).filter(f => f.endsWith('.ts'));

// First update step-handler.interface.ts
const interfacePath = path.join(handlersDir, 'step-handler.interface.ts');
let interfaceContent = fs.readFileSync(interfacePath, 'utf8');
if (!interfaceContent.includes('TaskWithStep')) {
    interfaceContent = `import { Prisma } from '@prisma/client';\n\nexport type TaskWithStep = Prisma.WorkflowTaskInstanceGetPayload<{ include: { step: true } }>;\n\n` + interfaceContent.replace(`import { WorkflowTaskInstance } from '@prisma/client';`, '');
    interfaceContent = interfaceContent.replace(/execute\(task: WorkflowTaskInstance/g, 'execute(task: TaskWithStep');
    fs.writeFileSync(interfacePath, interfaceContent);
    console.log('Updated step-handler.interface.ts');
}

for (const f of files) {
    if (f === 'step-handler.interface.ts') continue;

    const filePath = path.join(handlersDir, f);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace Import
    content = content.replace(/import { WorkflowTaskInstance } from '@prisma\/client';\n?/, '');

    // Update interface import
    if (content.match(/import {.*?IStepHandler.*?StepResult.*?}/)) {
        content = content.replace(/import {(.*?IStepHandler.*?)}(.*?)'(\.\/step-handler\.interface)';/, (match, p1, p2, p3) => {
            if (match.includes('TaskWithStep')) return match;
            return `import {${p1}, TaskWithStep }${p2}'${p3}';`;
        });
    } else {
        // Fallback replacement if it's formatted differently
        content = content.replace(/import { IStepHandler, StepResult/, 'import { IStepHandler, StepResult, TaskWithStep');
        content = content.replace(/import { IStepHandler,\s*StepResult,\s*ValidationResult }/, 'import { IStepHandler, StepResult, ValidationResult, TaskWithStep }');
    }

    // Replace type usage
    content = content.replace(/task: WorkflowTaskInstance/g, 'task: TaskWithStep');

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${f}`);
}
