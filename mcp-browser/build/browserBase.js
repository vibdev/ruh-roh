import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";
const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY
});
export const browserBase = async (website = 'https://playwright.dev') => {
    // Create a new session
    const session = await bb.sessions.create({
        projectId: process.env.BROWSERBASE_PROJECT_ID || ""
    });
    // Connect to the session
    const browser = await chromium.connectOverCDP(session.connectUrl);
    // Getting the default context to ensure the sessions are recorded.
    const defaultContext = browser.contexts()[0];
    const page = defaultContext.pages()[0];
    const context = await browser.newContext();
    await page.goto(website);
    const searchActionTarget = await getSearchActionTarget(page);
    console.log(searchActionTarget);
    if (searchActionTarget.length > 0) {
        await page.goto(searchActionTarget[0]);
    }
    const client = await context.newCDPSession(page);
    await client.send('Accessibility.enable');
    // Get the full accessibility tree
    const { nodes } = await client.send('Accessibility.getFullAXTree');
    console.log(nodes.filter(node => (node.role?.value === 'script')));
    // Filter for buttons
    const imgNodes = nodes.filter(node => (node.role?.value === 'image'));
    const imgSrcs = await Promise.all(imgNodes.map(async (axNode) => {
        // Each AXNode usually has a backend DOM node reference
        const backendDOMNodeId = axNode.backendDOMNodeId;
        if (!backendDOMNodeId)
            return;
        const { object } = await client.send('DOM.resolveNode', {
            backendNodeId: backendDOMNodeId,
        });
        // Evaluate in page context to log outerHTML
        const result = await client.send('Runtime.callFunctionOn', {
            functionDeclaration: `function() { return this.src.startsWith('http') ? this.src : \`${website}\${this.src.startsWith('/') ? this.src : \`/\${this.src}\`}\` }`,
            objectId: object.objectId,
            returnByValue: true,
        });
        // console.log(`🔘 Button AX Name: ${axNode.name?.value || '(no name)'}`);
        console.log(`🧱 Corresponding DOM: ${result.result.value}`);
        console.log('---');
        return result.result.value || null;
    }));
    await page.close();
    await browser.close();
    console.log(`Session complete! View replay at https://browserbase.com/sessions/${session.id}`);
    return imgSrcs.filter(Boolean).join();
};
const getSearchActionTarget = async (page) => {
    console.log('getting search action target');
    const documentHandle = await page.evaluate('document');
    console.log('evaluating');
    const scripts = documentHandle.querySelectorAll('script[type="application/ld+json"]');
    console.log('s', scripts);
    console.log('sl', scripts.length);
    const targets = [];
    console.log(scripts);
    Array.from(scripts).forEach(script => {
        console.log(script.textContent);
        try {
            const data = JSON.parse(script.textContent || '');
            // Handle both single objects and arrays of objects
            const schemas = Array.isArray(data) ? data : [data];
            schemas.forEach(schema => {
                if (schema.potentialAction?.type === "SearchAction" && schema.potentialAction.target) {
                    targets.push(schema.potentialAction.target);
                }
            });
        }
        catch (e) {
            // Skip invalid JSON
        }
    });
    return targets;
};
