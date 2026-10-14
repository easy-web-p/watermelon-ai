param(
  [string]$OutputPath = "watermelon-ai-oci.tar.gz"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$output = [System.IO.Path]::GetFullPath((Join-Path $root $OutputPath))
$tar = Join-Path $env:SystemRoot "System32\tar.exe"
if (-not (Test-Path -LiteralPath $tar)) {
  $tar = (Get-Command tar.exe -ErrorAction Stop).Source
}

$requiredModels = @(
  "fastapi_service\model.onnx",
  "fastapi_service\wide9.onnx"
)
foreach ($relative in $requiredModels) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $relative))) {
    throw "Missing required vision model: $relative"
  }
}

Push-Location $root
try {
  $oldApiBase = $env:VITE_API_BASE_URL
  $env:VITE_API_BASE_URL = ""
  try {
    npm run lint
    npm run test
    npm run build
  } finally {
    $env:VITE_API_BASE_URL = $oldApiBase
  }

  if (Test-Path -LiteralPath $output) {
    Remove-Item -LiteralPath $output -Force
  }

  # Package an explicit allowlist instead of walking the repository root.
  # This prevents a newly-created secret, database, upload, or cache directory
  # from entering the transfer bundle merely because it was not known here.
  $items = @(
    ".dockerignore",
    ".env.example",
    "Dockerfile",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "src",
    "dist",
    "deploy/oci/Caddyfile",
    "deploy/oci/docker-compose.yml",
    "deploy/oci/bootstrap.sh",
    "deploy/oci/oci.env.example",
    "deploy/oci/README.md"
  )
  $items += Get-ChildItem -LiteralPath $root -Filter "server*.ts" -File | ForEach-Object { $_.Name }
  $items += Get-ChildItem -LiteralPath (Join-Path $root "fastapi_service") -File | ForEach-Object {
    "fastapi_service/$($_.Name)"
  }

  & $tar -czf $output @items

  if ($LASTEXITCODE -ne 0) {
    throw "tar failed with exit code $LASTEXITCODE"
  }

  Write-Host "Created safe deployment bundle: $output"
  Write-Host "Excluded local database, uploads, .env, caches, and repository history."
} finally {
  Pop-Location
}
