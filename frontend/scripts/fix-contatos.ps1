# frontend\scripts\fix-contatos.ps1
# Uso:
#   .\scripts\fix-contatos.ps1              -> aplica
#   .\scripts\fix-contatos.ps1 -DryRun      -> so mostra o que faria
#   .\scripts\fix-contatos.ps1 -Backup      -> cria .bak antes

param(
    [switch]$DryRun,
    [switch]$Backup
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$EmailNovo = "mailto:suporte@nortmarkas.com.br"
$WaNovo    = "wa.me/5547992065908"
$DomNovo   = "https://omnirepmax.com.br"

Write-Host "Working dir: $Root" -ForegroundColor Cyan
Write-Host ""

$files = Get-ChildItem -Path "src" -Recurse -File -Include *.js,*.jsx,*.ts,*.tsx,*.html,*.css
if (-not $files) {
    Write-Host "No files found under src/" -ForegroundColor Yellow
    exit 0
}

$totalAntes = 0
foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw
    if ($c -match 'mailto:|wa\.me/|omnirepmax\.com\.br|suporte@|47992065908') { $totalAntes++ }
}

Write-Host "Files with old contacts/domains: $totalAntes" -ForegroundColor Cyan
Write-Host ""

$alterados = 0

foreach ($f in $files) {
    $orig = Get-Content $f.FullName -Raw
    $novo = $orig

    # 1) E-mail
    $novo = [regex]::Replace($novo, 'mailto:(?!suporte@nortmarkas\.com\.br)[^"''\s<>]+', $EmailNovo)

    # 2) WhatsApp
    $novo = [regex]::Replace($novo, 'wa\.me/(?!5547992065908)\d+', $WaNovo)

    # 3) Dominio
    $novo = [regex]::Replace($novo, '(?:https?://)?(?:www\.)?omnirepmax\.com\.br', $DomNovo)

    if ($orig -eq $novo) { continue }

    $alterados++
    Write-Host "---- $($f.FullName)" -ForegroundColor Yellow

    $linhasOrig = $orig -split "`r?`n"
    $linhasNovo = $novo -split "`r?`n"
    $maxLinhas = [Math]::Max($linhasOrig.Count, $linhasNovo.Count)
    for ($i = 0; $i -lt $maxLinhas; $i++) {
        $a = ""
        $b = ""
        if ($i -lt $linhasOrig.Count) { $a = $linhasOrig[$i] }
        if ($i -lt $linhasNovo.Count) { $b = $linhasNovo[$i] }
        if ($a -ne $b) {
            Write-Host ("  - " + $a) -ForegroundColor Red
            Write-Host ("  + " + $b) -ForegroundColor Green
        }
    }
    Write-Host ""

    if (-not $DryRun) {
        if ($Backup) { Copy-Item $f.FullName "$($f.FullName).bak" -Force }
        Set-Content -Path $f.FullName -Value $novo -NoNewline -Encoding UTF8
    }
}

Write-Host ""
if ($DryRun) {
    Write-Host "DRY-RUN: nothing was changed. Run without -DryRun to apply." -ForegroundColor Cyan
} else {
    Write-Host "Done: $alterados file(s) updated." -ForegroundColor Green
    if ($Backup) { Write-Host "Backups created with .bak suffix" -ForegroundColor DarkGray }
}

Write-Host ""
Write-Host "=========== FINAL REPORT ===========" -ForegroundColor Magenta
Write-Host "Expected email:    $EmailNovo"
Write-Host "Expected WhatsApp: $WaNovo"
Write-Host "Expected domain:   $DomNovo"
Write-Host ""

Write-Host "Still NOT in the new pattern:" -ForegroundColor Yellow
$pendentes = Get-ChildItem -Path "src" -Recurse -File -Include *.js,*.jsx,*.ts,*.tsx,*.html |
    Select-String -Pattern 'mailto:','wa\.me/','omnirepmax\.com\.br' |
    Where-Object {
        $_.Line -notmatch 'suporte@nortmarkas\.com\.br|wa\.me/5547992065908|https://omnirepmax\.com\.br'
    }

if (-not $pendentes) {
    Write-Host "  (none - all clean)" -ForegroundColor Green
} else {
    $pendentes | ForEach-Object {
        Write-Host ("  " + $_.Path + ":" + $_.LineNumber + ": " + $_.Line.Trim())
    }
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green