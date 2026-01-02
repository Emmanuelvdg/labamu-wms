# Lalamove Multi-Market Setup Guide

## Overview
Labamu WMS supports **multi-tenant, multi-market** Lalamove integration with market-specific API credentials.

## Platform-Level Credentials (Multi-Market Support)

### Why Market-Specific Credentials?
Lalamove requires different API key pairs for each market (country). For a multi-tenant platform serving customers across multiple regions, you need separate credentials per market.

### Environment Variable Naming Convention

**Pattern**: `LALAMOVE_API_KEY_{MARKET_CODE}` and `LALAMOVE_API_SECRET_{MARKET_CODE}`

**Example Configuration** (`apps/api/.env`):

```bash
# Singapore Market
LALAMOVE_API_KEY_SG=pk_live_sg_xxxxxxxxxxxxxxxx
LALAMOVE_API_SECRET_SG=sk_live_sg_yyyyyyyyyyyyyyyy

# Indonesia Market
LALAMOVE_API_KEY_ID=pk_live_id_xxxxxxxxxxxxxxxx
LALAMOVE_API_SECRET_ID=sk_live_id_yyyyyyyyyyyyyyyy

# Thailand Market
LALAMOVE_API_KEY_TH=pk_live_th_xxxxxxxxxxxxxxxx
LALAMOVE_API_SECRET_TH=sk_live_th_yyyyyyyyyyyyyyyy

# Malaysia Market
LALAMOVE_API_KEY_MY=pk_live_my_xxxxxxxxxxxxxxxx
LALAMOVE_API_SECRET_MY=sk_live_my_yyyyyyyyyyyyyyyy

# Global Fallback (optional - used if market-specific not set)
LALAMOVE_API_KEY=pk_test_xxxxxxxxxxxx
LALAMOVE_API_SECRET=sk_test_yyyyyyyyyyyy
```

### Supported Markets
- `SG` - Singapore
- `ID` - Indonesia
- `TH` - Thailand
- `MY` - Malaysia
- `HK` - Hong Kong
- `PH` - Philippines
- `TW` - Taiwan
- `VN` - Vietnam
- `BR` - Brazil
- `MX` - Mexico
- `JP` - Japan

## How It Works

### 1. Credential Selection Logic
When a Lalamove API request is made:
1. System retrieves the warehouse's configured market (e.g., 'SG')
2. Looks for market-specific credentials: `LALAMOVE_API_KEY_SG`
3. If not found, falls back to global credentials: `LALAMOVE_API_KEY`
4. If neither exists, throws an error with helpful message

### 2. Configuration Per Warehouse
Each warehouse in the system can be configured with:
- **Market**: The Lalamove market code (SG, ID, TH, etc.)
- **Environment**: SANDBOX or PRODUCTION
- **Default Service Type**: MOTORCYCLE, SEDAN, VAN, LORRY
- **Active**: Enable/disable Lalamove for this warehouse

Navigate to **Settings → Lalamove** to configure per warehouse.

### 3. Multi-Tenant Support
- **Tenant A** (Singapore warehouse, market='SG') → uses `LALAMOVE_API_KEY_SG`
- **Tenant B** (Indonesia warehouse, market='ID') → uses `LALAMOVE_API_KEY_ID`
- **Tenant C** (Thailand warehouse, market='TH') → uses `LALAMOVE_API_KEY_TH`

All tenants can use Lalamove simultaneously with their respective market credentials.

## Setup Instructions

### Step 1: Obtain API Credentials from Lalamove
1. Register with Lalamove for each market you operate in
2. Obtain API keys for each market:
   - Singapore: Contact Lalamove Singapore
   - Indonesia: Contact Lalamove Indonesia
   - etc.
3. Each market provides separate `API Key` and `API Secret`

### Step 2: Configure Environment Variables
Add credentials to `apps/api/.env`:

```bash
# Production credentials
LALAMOVE_API_KEY_SG=pk_live_sg_your_actual_key
LALAMOVE_API_SECRET_SG=sk_live_sg_your_actual_secret

LALAMOVE_API_KEY_ID=pk_live_id_your_actual_key
LALAMOVE_API_SECRET_ID=sk_live_id_your_actual_secret

# Add more markets as needed...
```

### Step 3: Restart API Server
```bash
cd apps/api
npm run dev
```

Environment variables are loaded on server startup.

### Step 4: Configure Warehouses
For each warehouse:
1. Navigate to **Settings → Lalamove**
2. Select the warehouse
3. Set **Market** to match your credentials (e.g., 'Singapore (SG)')
4. Set **Environment** (use SANDBOX for testing, PRODUCTION for live)
5. Set **Default Service Type** (auto-selected based on order weight)
6. Enable **Active** checkbox
7. Click **Save Configuration**

## Testing

### Verify Credential Selection
Check API server logs when making Lalamove requests:

```
[LalamoveService] Using market-specific credentials for SG (LALAMOVE_API_KEY_SG)
```
or
```
[LalamoveService] Using global credentials for TH (fallback)
```

### Test Quotation Flow
1. Create a sales order with items
2. Navigate to order details page
3. Click "Get Delivery Quote" in Lalamove card
4. Verify:
   - Service type is auto-selected based on weight
   - Price is calculated from correct market API
   - No credential errors in console

## Migration from Single-Key Setup

**Existing Setup** (single global key):
```bash
LALAMOVE_API_KEY=pk_test_xxxx
LALAMOVE_API_SECRET=sk_test_xxxx
```

**No Breaking Changes Required:**
- Global credentials continue to work as fallback
- Add market-specific credentials incrementally
- Existing functionality preserved

**Recommended Migration Path:**
1. Keep global credentials in place
2. Add market-specific credentials one market at a time
3. Test each market thoroughly
4. Eventually remove global fallback (optional)

## Error Messages

### Missing Credentials
```
Lalamove API credentials not configured for market: SG.
Please set LALAMOVE_API_KEY_SG and LALAMOVE_API_SECRET_SG
in environment variables, or set global LALAMOVE_API_KEY
and LALAMOVE_API_SECRET as fallback.
```

**Resolution:** Add the required environment variables to `.env` file and restart server.

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use separate credentials** for SANDBOX and PRODUCTION environments
3. **Rotate credentials periodically**
4. **Limit access** to environment variables in production
5. **Consider using** secret management services (AWS Secrets Manager, Azure Key Vault, etc.) in production

## Support

For questions about:
- **Lalamove API credentials**: Contact Lalamove support for your specific market
- **Labamu WMS configuration**: Check documentation or contact platform support
