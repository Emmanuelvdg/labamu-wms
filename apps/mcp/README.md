# Labamu WMS MCP Server

Model Context Protocol (MCP) server for Labamu WMS. Enables LLMs like Claude to orchestrate warehouse tasks.

## Setup

1. **Generate an API Key**:
   - Log into the WMS web interface
   - Go to Settings > API Keys
   - Create a new key with appropriate scopes
   - Copy the key (you'll only see it once!)

2. **Configure the MCP Server**:
   ```bash
   cd apps/mcp
   cp .env.example .env
   # Edit .env and add your API key
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Build**:
   ```bash
   npm run build
   ```

## Usage

### With Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "labamu-wms": {
      "command": "node",
      "args": ["/path/to/labamu-ims/apps/mcp/dist/index.js"],
      "env": {
        "WMS_API_URL": "http://localhost:3001",
        "WMS_API_KEY": "your_key_here"
      }
    }
  }
}
```

### Available Tools

- **list_products**: List all products in inventory
- **get_stock_levels**: Get stock levels for a specific product
- **create_purchase_order**: Create a new purchase order
- **start_putaway_task**: Start a putaway task

## Example Queries

Once configured with Claude:

- "What products do we have in inventory?"
- "What's the current stock level for product X?"
- "Create a purchase order for 100 units of product Y from supplier Z"
- "Start putaway task ABC-123"
