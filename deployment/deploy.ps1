param(
    [string]$EnvFile = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ComposeFile = Join-Path $ScriptDir "docker-compose.yml"
if ([string]::IsNullOrWhiteSpace($EnvFile)) {
    $EnvFile = Join-Path $ScriptDir ".env"
}

if (-not (Test-Path -Path $EnvFile)) {
    Write-Error "Missing env file: $EnvFile"
    Write-Host "Create it from: $(Join-Path $ScriptDir '.env.example')"
    exit 1
}

function Invoke-Compose {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    docker compose --env-file $EnvFile -f $ComposeFile @Args
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose command failed: $($Args -join ' ')"
    }
}

Write-Host "Building images..."
Invoke-Compose build

Write-Host "Starting infrastructure (MySQL, Redis, Elasticsearch)..."
Invoke-Compose up -d mysql-marketplace mysql-jobs redis elasticsearch

Write-Host "Starting backend containers..."
Invoke-Compose up -d marketplace-backend jobs-backend

Write-Host "Running marketplace migrations and seeders..."
Invoke-Compose exec -T marketplace-backend sh -lc 'npx prisma generate && npx prisma migrate deploy && node scripts/seedAdmin.js && node scripts/seedAll.js'

Write-Host "Running jobs migrations and seeders..."
Invoke-Compose exec -T jobs-backend sh -lc 'npx prisma generate && npx prisma migrate deploy && npm run seed'

Write-Host "Reindexing search data..."
Invoke-Compose exec -T marketplace-backend sh -lc 'if [ "${ENABLE_ELASTIC_SEARCH:-false}" = "true" ]; then node scripts/initUsersIndex.js || true; node scripts/reindex-blogs.js || true; node scripts/reindex-search.js || true; fi'
Invoke-Compose exec -T jobs-backend sh -lc 'if [ -n "${ELASTICSEARCH_URL:-}" ]; then npm run reindex:es || true; fi'

Write-Host "Starting frontend containers..."
Invoke-Compose up -d marketplace-frontend jobs-frontend

Write-Host "Deployment completed."
Invoke-Compose ps
