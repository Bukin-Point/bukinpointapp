# PowerShell script to replace all 'staff' references with 'userProvider' in TypeScript files
# Version 2 - More comprehensive patterns

$rootPath = "C:\Users\kabio\source\repos\bukinpointapp\src"

# Get all TypeScript files
$files = Get-ChildItem -Path $rootPath -Recurse -Include *.ts,*.tsx

$totalFiles = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileChanged = $false
    
    # Pattern 1: Replace 'staff: {' with 'userProvider: {' (with any whitespace)
    if ($content -match 'staff\s*:\s*\{') {
        $content = $content -replace 'staff\s*:\s*\{', 'userProvider: {'
        $fileChanged = $true
    }
    
    # Pattern 2: Replace '.staff.' with '.userProvider.'
    if ($content -match '\.staff\.') {
        $content = $content -replace '\.staff\.', '.userProvider.'
        $fileChanged = $true
    }
    
    # Pattern 3: Replace '.staff)' '.staff,' '.staff}' '.staff;'
    if ($content -match '\.staff[\),;\}]') {
        $content = $content -replace '\.staff\)', '.userProvider)'
        $content = $content -replace '\.staff,', '.userProvider,'
        $content = $content -replace '\.staff\}', '.userProvider}'
        $content = $content -replace '\.staff;', '.userProvider;'
        $fileChanged = $true
    }
    
    if ($fileChanged) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $totalFiles++
        Write-Host "Updated: $($file.Name)" -ForegroundColor Cyan
    }
}

Write-Host "`nFiles updated: $totalFiles" -ForegroundColor Green
