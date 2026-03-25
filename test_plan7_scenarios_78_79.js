const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
    let browser;
    let page; // Declare page here to make it accessible throughout the scope
    try {
        console.log('Launching browser...');
        browser = await chromium.launch({ headless: false }); // Changed headless to false
        const context = await browser.newContext();
        page = await context.newPage(); // Assign to the declared 'page' variable

        // Log all console messages
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        
        // Log failed requests
        page.on('requestfailed', request => {
            console.log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
        });
        
        // Log all error responses
        page.on('response', response => {
            if (response.status() >= 400) {
                console.log(`RESPONSE ERROR: ${response.url()} status ${response.status()}`);
            }
        });

        // 1. Login
        console.log('Navigating to login...');
        await page.goto('http://localhost:3000');
        await page.fill('input[type="email"]', 'admin@labamu.co.id');
        await page.fill('input[type="password"]', 'admin');
        await page.click('button[type="submit"]');

        console.log('Waiting for dashboard...');
        try {
            await page.waitForSelector('text="Dashboard Overview"', { timeout: 10000 });
        } catch (e) {
            console.log('Timeout waiting for dashboard. Taking screenshot...');
            await page.screenshot({ path: 'login_failure_screenshot.png' });
            throw e;
        }

        // 2. Navigate to Floor Plan
        console.log('Navigating to Floor Plan...');
        await page.goto('http://localhost:3000/floor-plan');
        await page.waitForSelector('svg', { timeout: 10000 });
        
        // Wait a moment for data to load
        await page.waitForTimeout(2000);

        // ==== SCENARIO 7.8: Distance Measurement Tool ====
        console.log('\n--- Scenario 7.8: Distance Measurement Tool ---');
        
        // Click the Measure button (look for the button with Ruler icon or "Measure" tooltip/text)
        // Let's assume there is a button with an svg containing 'lucide-ruler' class or similar.
        // Or we can find it by title or looking through buttons.
        const buttons = await page.$$('button');
        let measureButton;
        for (const btn of buttons) {
            const html = await btn.innerHTML();
            if (html.includes('lucide-ruler') || html.includes('Measure')) {
                measureButton = btn;
                break;
            }
        }
        
        if (!measureButton) {
            throw new Error('Measure button not found on toolbar');
        }
        
        await measureButton.click();
        console.log('Clicked Measure button.');

        // Get SVG bounding box
        const svg = await page.$('svg');
        const box = await svg.boundingBox();
        
        // Simulate drag to measure
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.down();
        await page.mouse.move(box.x + 200, box.y + 200);
        
        // Check if measurement text appears
        const measureText = await page.evaluate(() => {
            const texts = Array.from(document.querySelectorAll('text'));
            return texts.find(t => t.textContent.includes('m'))?.textContent;
        });
        
        if (measureText) {
            console.log(`✅ Scenario 7.8 Passed: Measurement text found: ${measureText}`);
        } else {
            throw new Error('Measurement text (ending in "m") not found while dragging');
        }
        
        await page.mouse.up();
        
        // Click again to toggle off measuring so we don't interfere with next test
        await measureButton.click();

        // ==== SCENARIO 7.9: Element Collision Prevention ====
        console.log('\n--- Scenario 7.9: Element Collision Prevention ---');
        
        // Get warehouse ID from the page state or first warehouse
        const warehouseId = await page.evaluate(async () => {
             // Try to find the selected warehouse in the dropdown or via API
             const res = await fetch('/api/inventory/warehouses');
             const data = await res.json();
             // Find which one is currently active by looking at the page title or similar
             // For now, let's just pick the first one and make sure we are on its page
             return data[0]?.id;
        });

        console.log(`Ensuring we are on warehouse ${warehouseId} page...`);
        await page.goto(`http://localhost:3000/floor-plan?warehouseId=${warehouseId}`);
        await page.waitForSelector('text="Dashboard"', { timeout: 10000 });

        console.log(`Creating test areas in warehouse ${warehouseId}...`);
        
        const createArea = async (name, x, y) => {
            const result = await page.evaluate(async ({ warehouseId, name, x, y }) => {
                try {
                    const res = await fetch(`/api/warehouses/${warehouseId}/areas`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name,
                            areaType: 'STORAGE',
                            x, y,
                            width: 5,
                            height: 5,
                            color: '#ef4444'
                        })
                    });
                    const data = await res.json();
                    return { ok: res.ok, status: res.status, data };
                } catch (e) {
                    return { ok: false, error: e.message };
                }
            }, { warehouseId, name, x, y });
            console.log(`Create Area "${name}" result:`, JSON.stringify(result));
            return result;
        };

        const resA = await createArea("Test Area A", 10, 10);
        const resB = await createArea("Test Area B", 15, 10);
        
        console.log('Reloading to see new areas...');
        await page.reload();
        
        try {
            await page.waitForSelector('text="Test Area A"', { timeout: 10000 });
        } catch (e) {
            console.log('Test Area A not found after reload. Taking screenshot...');
            await page.screenshot({ path: 'area_creation_failure.png' });
            throw e;
        }

        console.log('Dragging "Test Area A" onto "Test Area B" using explicit mouse movements...');
        const box1 = await page.locator('g.cursor-move:has-text("Test Area A") rect').first().boundingBox();
        const box2 = await page.locator('g.cursor-move:has-text("Test Area B") rect').first().boundingBox();
        
        if (box1 && box2) {
            await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2);
            await page.mouse.down();
            // Move it to overlap with Area B (move by 2 meters / ~150 pixels)
            await page.mouse.move(box1.x + box1.width / 2 + 150, box1.y + box1.height / 2, { steps: 10 });
            await page.mouse.up();
        } else {
            console.log('⚠️ Could not get bounding boxes for areas.');
        }
        
        // Wait for toast notification
        console.log('Waiting for collision toast...');
        // Increased timeout and checking for multiple possible toast types
        const collisionToast = await page.waitForSelector('.sonner-toast:has-text("Collision overlapping detected!")', { timeout: 8000, state: 'visible' }).catch(() => null);
        const anyCollisionText = await page.waitForSelector('text="Collision overlapping detected!"', { timeout: 8000 }).catch(() => null);
        
        if (collisionToast || anyCollisionText) {
            console.log('✅ Scenario 7.9 Passed: Collision prevented with error toast.');
        } else {
            await page.screenshot({ path: 'collision_failure.png' });
            throw new Error('Collision toast not found after overlapping Test Area A onto Test Area B. See collision_failure.png');
        }

        console.log('\nAll tests passed successfully!');
    } catch (err) {
        console.error('\n❌ Test failed:', err);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
    }
})();
