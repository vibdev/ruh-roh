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
    const client = await context.newCDPSession(page);
    await client.send('Accessibility.enable');
    // Get the full accessibility tree
    const { nodes } = await client.send('Accessibility.getFullAXTree');
    // Filter for buttons
    const buttonNodes = nodes.filter(node => (node.role?.value === 'image'));
    const buttonNames = await Promise.all(buttonNodes.map(async (axNode) => {
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
    return buttonNames.filter(Boolean).join(', ');
};
