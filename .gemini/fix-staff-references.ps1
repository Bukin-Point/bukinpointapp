# PowerShell script to replace all 'staff' references with 'userProvider' in TypeScript files

$rootPath = "C:\Users\kabio\source\repos\bukinpointapp\src"
$backupPath = "C:\Users\kabio\source\repos\bukinpointapp\.gemini\backup-before-staff-fix"

# Create backup
Write-Host "Creating backup..." -ForegroundColor Yellow
if (Test-Path $backupPath) {
    Remove-Item -Recurse -Force $backupPath
}
Copy-Item -Recurse $rootPath $backupPath
Write-Host "Backup created at: $backupPath" -ForegroundColor Green

# Get all TypeScript files
$files = Get-ChildItem -Path $rootPath -Recurse -Include *.ts,*.tsx

$totalFiles = 0
$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileChanged = $false
    
    # Pattern 1: Replace 'staff: {' with 'userProvider: {' in includes
    if ($content -match 'staff:\s*\{') {
        $content = $content -replace '(\s+)staff:\s*\{', '$1userProvider: {'
        $fileChanged = $true
    }
    
    # Pattern 2: Replace '.staff.' with '.userProvider.' (property access)
    if ($content -match '\.staff\.') {
        $content = $content -replace '\.staff\.', '.userProvider.'
        $fileChanged = $true
    }
    
    # Pattern 3: Replace '.staff)' with '.userProvider)' (end of chain)
    if ($content -match '\.staff\)') {
        $content = $content -replace '\.staff\)', '.userProvider)'
        $fileChanged = $true
    }
    
    # Pattern 4: Replace 'booking.staff' with 'booking.userProvider'
    if ($content -match 'booking\.staff') {
        $content = $content -replace 'booking\.staff', 'booking.userProvider'
        $fileChanged = $true
    }
    
    if ($fileChanged) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $totalFiles++
        $changes = ($originalContent.Length - $content.Length)
        Write-Host "Updated: $($file.FullName)" -ForegroundColor Cyan
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Green
Write-Host "Files updated: $totalFiles" -ForegroundColor Green
Write-Host "Backup location: $backupPath" -ForegroundColor Yellow
Write-Host "`nTo restore backup if needed:" -ForegroundColor Yellow
Write-Host "Remove-Item -Recurse -Force '$rootPath'" -ForegroundColor Gray
Write-Host "Copy-Item -Recurse '$backupPath' '$rootPath'" -ForegroundColor Gray
