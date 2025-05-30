# ruh-roh

## Run MCP Sever

```bash
cd ./mcp-browser
npm run build
node --env-file ../.env.local ./build/index.js
```

### Test it

npx @modelcontextprotocol/inspector
`SSE` transport with url === `http://localhost:3000/sse`
