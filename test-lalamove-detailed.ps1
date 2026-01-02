# Lalamove API Testing Script
# This script tests the quotation and order placement flow step by step

# Configuration
$API_URL = "http://127.0.0.1:3001"
$ORDER_ID = "2d4fba64-9087-4f41-bc19-f18bc7a5f01c"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "LALAMOVE API TESTING" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Get Order Details
Write-Host "Step 1: Fetching order details..." -ForegroundColor Yellow
$orderResponse = Invoke-RestMethod -Uri "$API_URL/orders/$ORDER_ID" -Method Get
Write-Host "Order ID: $($orderResponse.id)" -ForegroundColor Green
Write-Host "Order Type: $($orderResponse.type)" -ForegroundColor Green
Write-Host "Warehouse ID: $($orderResponse.warehouseId)" -ForegroundColor Green
Write-Host "Customer: $($orderResponse.customer.name)" -ForegroundColor Green
Write-Host "Customer Phone: $($orderResponse.customer.phone)" -ForegroundColor Green

if (-not $orderResponse.warehouse) {
    Write-Host "WARNING: Order doesn't include warehouse details. Fetching separately..." -ForegroundColor Red
    $warehouseResponse = Invoke-RestMethod -Uri "$API_URL/warehouses/$($orderResponse.warehouseId)" -Method Get
    $warehouse = $warehouseResponse
}
else {
    $warehouse = $orderResponse.warehouse
}

Write-Host "Warehouse: $($warehouse.name)" -ForegroundColor Green
Write-Host "Warehouse Phone: $($warehouse.phone)" -ForegroundColor Green
Write-Host "Warehouse Address: $($warehouse.address)" -ForegroundColor Green
Write-Host "Warehouse Lat/Lng: $($warehouse.latitude), $($warehouse.longitude)" -ForegroundColor Green

# Step 2: Get Lalamove Quotation
Write-Host "`nStep 2: Getting Lalamove quotation..." -ForegroundColor Yellow
try {
    $quotationResponse = Invoke-RestMethod -Uri "$API_URL/lalamove/quotation/$ORDER_ID?warehouseId=$($orderResponse.warehouseId)" -Method Get
    
    Write-Host "`nQUOTATION RESPONSE:" -ForegroundColor Green
    Write-Host ($quotationResponse | ConvertTo-Json -Depth 10) -ForegroundColor White
    
    Write-Host "`nQuotation ID: $($quotationResponse.quotationId)" -ForegroundColor Cyan
    Write-Host "Price: $($quotationResponse.currency) $($quotationResponse.price)" -ForegroundColor Cyan
    Write-Host "Service Type: $($quotationResponse.serviceType)" -ForegroundColor Cyan
    Write-Host "Expires At: $($quotationResponse.expiresAt)" -ForegroundColor Cyan
    
    if ($quotationResponse.stops) {
        Write-Host "`nSTOPS:" -ForegroundColor Cyan
        for ($i = 0; $i -lt $quotationResponse.stops.Length; $i++) {
            $stop = $quotationResponse.stops[$i]
            Write-Host "  Stop $i (stopId: $($stop.stopId)):" -ForegroundColor Yellow
            Write-Host "    Address: $($stop.address)" -ForegroundColor White
            Write-Host "    Coordinates: $($stop.coordinates.lat), $($stop.coordinates.lng)" -ForegroundColor White
        }
    }
    else {
        Write-Host "WARNING: No stops array in quotation response!" -ForegroundColor Red
    }
    
    # Step 3: Prepare Order Payload
    Write-Host "`nStep 3: Preparing order placement payload..." -ForegroundColor Yellow
    
    if (-not $quotationResponse.stops -or $quotationResponse.stops.Length -lt 2) {
        Write-Host "ERROR: Cannot proceed - quotation missing stop IDs" -ForegroundColor Red
        exit 1
    }
    
    if (-not $warehouse.phone) {
        Write-Host "ERROR: Warehouse phone is missing!" -ForegroundColor Red
        exit 1
    }
    
    if (-not $orderResponse.customer.phone) {
        Write-Host "ERROR: Customer phone is missing!" -ForegroundColor Red
        exit 1
    }
    
    $orderPayload = @{
        warehouseId = $orderResponse.warehouseId
        quotationId = $quotationResponse.quotationId
    }
    
    Write-Host "`nORDER PAYLOAD:" -ForegroundColor Green
    Write-Host ($orderPayload | ConvertTo-Json -Depth 10) -ForegroundColor White
    
    # Step 4: Place Order
    Write-Host "`nStep 4: Placing Lalamove order..." -ForegroundColor Yellow
    Write-Host "Endpoint: POST $API_URL/lalamove/orders/$ORDER_ID" -ForegroundColor Gray
    
    $orderResult = Invoke-RestMethod -Uri "$API_URL/lalamove/orders/$ORDER_ID" `
        -Method Post `
        -Body ($orderPayload | ConvertTo-Json) `
        -ContentType "application/json"
    
    Write-Host "`nORDER PLACED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host ($orderResult | ConvertTo-Json -Depth 10) -ForegroundColor White
    
}
catch {
    Write-Host "`nERROR occurred:" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Status Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
    
    # Try to read the error response body
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        $reader.Close()
        Write-Host "`nError Response Body:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor White
        
        # Try to parse as JSON
        try {
            $errorJson = $responseBody | ConvertFrom-Json
            Write-Host "`nParsed Error:" -ForegroundColor Red
            Write-Host ($errorJson | ConvertTo-Json -Depth 10) -ForegroundColor White
        }
        catch {
            # Not JSON, already displayed as text
        }
    }
    catch {
        Write-Host "Could not read error response body" -ForegroundColor Red
    }
    
    Write-Host "`nFull Exception:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor White
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
