# Lalamove API Test Script
# Uses HMAC SHA256 signature authentication

$apiKey = "pk_test_52e56d6ec66860b46f97055e8abad7c8"
$apiSecret = "sk_test_mWG+YhCL0ynCExmqBkfu46v/clDx2CIUQpWkYBd705Ju+Pnr9coA/EVznHNPGWfK"
$market = "ID"
$baseUrl = "https://rest.sandbox.lalamove.com"

# Request details
$method = "POST"
$path = "/v3/quotations"
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()

# Request body - matching Lalamove docs exactly
$innerData = @{
    serviceType      = "MOTORCYCLE"
    language         = "en_ID"  # English for Indonesia
    stops            = @(
        @{
            coordinates = @{
                lat = "-6.2088"
                lng = "106.8456"
            }
            address     = "Jl. Jenderal Sudirman Kav 52-53, Jakarta Selatan"
        },
        @{
            coordinates = @{
                lat = "-6.1754"
                lng = "106.8272"
            }
            address     = "Jl. MH Thamrin No.1, Jakarta Pusat"
        }
    )
    item             = @{
        quantity   = "1"
        weight     = "LESS_THAN_3KG"
        categories = @("FOOD_DELIVERY")
    }
    isRouteOptimized = $false
}

$body = @{
    data = $innerData
} | ConvertTo-Json -Depth 10 -Compress

Write-Host "Request Body:" -ForegroundColor Cyan
Write-Host $body
Write-Host ""

# Generate signature
$rawSignature = "$timestamp`r`n$method`r`n$path`r`n`r`n$body"
Write-Host "Raw Signature String:" -ForegroundColor Cyan
Write-Host $rawSignature
Write-Host ""

$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($apiSecret)
$signatureBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($rawSignature))
$signature = [System.BitConverter]::ToString($signatureBytes).Replace("-", "").ToLower()

Write-Host "Generated Signature:" -ForegroundColor Cyan
Write-Host $signature
Write-Host ""

# Make request
$headers = @{
    "Content-Type"  = "application/json"
    "Authorization" = "hmac $($apiKey):$($timestamp):$signature"
    "Market"        = $market
    "Accept"        = "application/json"
}

Write-Host "Request Headers:" -ForegroundColor Cyan
$headers | ConvertTo-Json
Write-Host ""

Write-Host "Making request to: $baseUrl$path" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl$path" -Method $method -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Status Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:" -ForegroundColor Red
        Write-Host $responseBody
    }
    
    Write-Host "Full Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
