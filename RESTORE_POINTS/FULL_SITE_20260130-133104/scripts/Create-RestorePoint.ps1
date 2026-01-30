# Creates a timestamped ZIP restore point for the project with exclusions and writes metadata JSON
param(
    [string]$RootPath,
    [string[]]$ExcludeDirs = @('node_modules','dist','build','.git','RESTORE_POINTS')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function New-RestorePoint {
    param(
        [Parameter(Mandatory=$true)][string]$Root,
        [string[]]$Excludes
    )

    if (!(Test-Path -LiteralPath $Root)) {
        throw "Root path not found: $Root"
    }

    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $outDir = Join-Path -Path $Root -ChildPath 'RESTORE_POINTS'
    if (!(Test-Path -LiteralPath $outDir)) {
        New-Item -ItemType Directory -Path $outDir | Out-Null
    }

    $zipName = "FULL_SITE_$timestamp.zip"
    $zipPath = Join-Path -Path $outDir -ChildPath $zipName

    # Stage files with robocopy to avoid enumerating excluded and transient directories
    $stageDirName = "FULL_SITE_$timestamp"
    $stagePath = Join-Path -Path $outDir -ChildPath $stageDirName
    if (Test-Path -LiteralPath $stagePath) { Remove-Item -LiteralPath $stagePath -Recurse -Force }
    New-Item -ItemType Directory -Path $stagePath | Out-Null

    $xdArgs = @()
    foreach ($d in $Excludes) { $xdArgs += @('/XD', (Join-Path $Root $d)) }

    # Run robocopy to mirror source to staging excluding directories; suppress extra output
    & robocopy $Root $stagePath /MIR /NFL /NDL /NJH /NJS /R:1 /W:1 @xdArgs | Out-Null

    # Count files in staging
    $count = (Get-ChildItem -LiteralPath $stagePath -Recurse -File -Force -ErrorAction SilentlyContinue).Count

    # Create archive from staging
    if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
    Compress-Archive -Path (Join-Path $stagePath '*') -DestinationPath $zipPath -CompressionLevel Optimal -Force

    $size = (Get-Item -LiteralPath $zipPath).Length

    # Metadata
    $meta = [ordered]@{
        createdAt = (Get-Date).ToString('o')
        archiveName = $zipName
        archivePath = $zipPath
        rootPath = $Root
        excluded = $Excludes
        filesCount = $count
        sizeBytes = $size
    }

    $metaName = ([IO.Path]::GetFileNameWithoutExtension($zipName)) + '.json'
    $metaPath = Join-Path -Path $outDir -ChildPath $metaName
    $meta | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -LiteralPath $metaPath

    # Cleanup staging
    try { Remove-Item -LiteralPath $stagePath -Recurse -Force } catch {}

    return [pscustomobject]{
        ZipPath = $zipPath
        MetaPath = $metaPath
        Files = $count
        Size = $size
    }
}

# Determine root path: prefer provided valid RootPath; otherwise fall back to script parent directory
try {
    $scriptRoot = Split-Path -Parent $PSScriptRoot
    if ([string]::IsNullOrWhiteSpace($RootPath)) {
        $rootResolved = (Resolve-Path -LiteralPath $scriptRoot).Path
    } elseif (Test-Path -LiteralPath $RootPath) {
        $rootResolved = (Resolve-Path -LiteralPath $RootPath).Path
    } else {
        # Provided path invalid; fall back
        $rootResolved = (Resolve-Path -LiteralPath $scriptRoot).Path
    }
} catch {
    throw "Failed to resolve project root. Error: $($_.Exception.Message)"
}

$result = New-RestorePoint -Root $rootResolved -Excludes $ExcludeDirs
"ZIP: $($result.ZipPath)" | Write-Output
"FILES: $($result.Files)" | Write-Output
"SIZE: $($result.Size)" | Write-Output
"META: $($result.MetaPath)" | Write-Output
