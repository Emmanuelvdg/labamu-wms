const fs = require('fs');
const path = require('path');

const src = path.join(process.cwd(), 'apps', 'web', 'app', '(dashboard)', 'purchase-orders', '[id]', 'receive');
const dest = path.join(process.cwd(), 'apps', 'web', 'app', '(dashboard)', 'inventory', 'purchases', '[id]', 'receive');

try {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);
    for (const file of files) {
        fs.copyFileSync(path.join(src, file), path.join(dest, file));
    }
    console.log("SUCCESS: Copied receive folder successfully to", dest);
} catch (e) {
    console.error("FAIL:", e);
}
