$ErrorActionPreference = "Stop"

$projectRef = "dqyqkeqdvsidmffaanys"
$siteUrl = "https://cardence.co.za"
$webhookUrl = "https://$projectRef.supabase.co/functions/v1/cardence-yoco-webhook"
$supabaseCli = Join-Path $PSScriptRoot "..\..\Kompo Nation\node_modules\.bin\supabase.cmd"

if (-not (Test-Path -LiteralPath $supabaseCli)) {
  throw "Supabase CLI was not found. Install it or update the path in this script."
}

$yocoPointer = [IntPtr]::Zero
$bobGoPointer = [IntPtr]::Zero
$yocoKey = $null
$bobGoToken = $null
$webhookSecret = $null

try {
  $secureYocoKey = Read-Host "Paste your Yoco LIVE SECRET key (input is hidden)" -AsSecureString
  $yocoPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureYocoKey)
  $yocoKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($yocoPointer)
  if ($yocoKey -notmatch "^sk_live_") {
    throw "That is not a Yoco live secret key. Expected a key beginning with sk_live_. Nothing was changed."
  }

  $secureBobGoToken = Read-Host "Paste your Bob Go production API token (input is hidden)" -AsSecureString
  $bobGoPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureBobGoToken)
  $bobGoToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bobGoPointer)
  if ([string]::IsNullOrWhiteSpace($bobGoToken)) {
    throw "A Bob Go production API token is required. Nothing was changed."
  }

  $collectionName = Read-Host "Collection name or business name"
  $collectionStreet = Read-Host "Collection street address"
  $collectionArea = Read-Host "Collection suburb or area"
  $collectionCity = Read-Host "Collection city"
  $collectionProvince = Read-Host "Collection province"
  $collectionPostal = Read-Host "Collection postal code"
  $collectionPhone = Read-Host "Collection phone"
  $collectionEmail = Read-Host "Collection email"

  foreach ($requiredValue in @($collectionName, $collectionStreet, $collectionCity, $collectionProvince, $collectionPostal, $collectionPhone, $collectionEmail)) {
    if ([string]::IsNullOrWhiteSpace($requiredValue)) {
      throw "Complete every required collection field. Nothing was changed."
    }
  }

  Write-Host "Testing the Yoco live key with an unpaid R2 checkout..."
  $testId = "cardence-setup-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
  $checkoutBody = @{
    amount = 200
    currency = "ZAR"
    successUrl = "$siteUrl/?payment=success&reference=$testId"
    cancelUrl = "$siteUrl/?payment=cancelled&reference=$testId"
    failureUrl = "$siteUrl/?payment=failed&reference=$testId"
    clientReferenceId = $testId
    externalId = $testId
    metadata = @{ purpose = "cardence-gateway-setup" }
  } | ConvertTo-Json -Depth 4

  $checkout = Invoke-RestMethod -Method Post -Uri "https://payments.yoco.com/api/checkouts" -Headers @{
    Authorization = "Bearer $yocoKey"
    "Idempotency-Key" = $testId
    "Content-Type" = "application/json"
  } -Body $checkoutBody

  if (-not $checkout.id -or -not $checkout.redirectUrl) {
    throw "Yoco did not return a checkout ID and redirect URL. Nothing was changed."
  }

  Write-Host "Registering the Cardence signed payment webhook..."
  $webhook = Invoke-RestMethod -Method Post -Uri "https://payments.yoco.com/api/webhooks" -Headers @{
    Authorization = "Bearer $yocoKey"
    "Content-Type" = "application/json"
  } -Body (@{
    name = "Cardence production payments"
    url = $webhookUrl
  } | ConvertTo-Json)

  $webhookSecret = $webhook.secret
  if (-not $webhookSecret -or $webhookSecret -notmatch "^whsec_") {
    throw "Yoco did not return the expected one-time webhook signing secret. Nothing was saved."
  }

  Write-Host "Saving encrypted Cardence commerce secrets in Supabase..."
  & $supabaseCli secrets set --project-ref $projectRef `
    "YOCO_SECRET_KEY=$yocoKey" `
    "YOCO_WEBHOOK_SECRET=$webhookSecret" `
    "BOBGO_API_TOKEN=$bobGoToken" `
    "BOBGO_API_BASE_URL=https://api.bobgo.co.za/v2" `
    "BOBGO_COLLECTION_NAME=$collectionName" `
    "BOBGO_COLLECTION_STREET=$collectionStreet" `
    "BOBGO_COLLECTION_AREA=$collectionArea" `
    "BOBGO_COLLECTION_CITY=$collectionCity" `
    "BOBGO_COLLECTION_PROVINCE=$collectionProvince" `
    "BOBGO_COLLECTION_POSTAL=$collectionPostal" `
    "BOBGO_COLLECTION_PHONE=$collectionPhone" `
    "BOBGO_COLLECTION_EMAIL=$collectionEmail"

  if ($LASTEXITCODE -ne 0) {
    throw "Supabase rejected the secret update. Cardence commerce was not activated."
  }

  Write-Host ""
  Write-Host "CARDENCE_COMMERCE_ACTIVATED" -ForegroundColor Green
  Write-Host "Return to Codex and say: done"
} catch {
  Write-Error $_.Exception.Message
  exit 1
} finally {
  if ($yocoPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($yocoPointer) }
  if ($bobGoPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bobGoPointer) }
  $yocoKey = $null
  $bobGoToken = $null
  $webhookSecret = $null
}
