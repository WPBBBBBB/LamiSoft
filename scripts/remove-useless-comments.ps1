# Script to remove useless comments from TypeScript files

$projectRoot = "c:\Projects\AL-LamiSoft\al-lamisoft-app"

$files = Get-ChildItem -Path "$projectRoot\lib" -Recurse -Filter "*.ts*" | Where-Object { $_.Extension -match "\.tsx?$" }

foreach ($file in $files) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Cyan
    
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalLength = $content.Length
    
    $content = $content -replace '(?m)^\s*//\s*[0-9]\)\s+[^\r\n]+\r?\n', ''
    
    $arabicWords = @(
        'جلب', 'تحديث', 'إضافة', 'حذف', 'التحقق من', 'استخراج', 
        'تنسيق', 'إرسال', 'تسجيل', 'تعديل', 'البحث', 'إنشاء',
        'إزالة', 'المادة', 'الرصيد', 'الكمية', 'المخزون',
        'الصلاحيات', 'المستخدمين', 'العملاء', 'الدفعة'
    )
    
    foreach ($word in $arabicWords) {
        $pattern = "(?m)^\s*//\s*$word[^\r\n]*\r?\n"
        $content = $content -replace $pattern, ''
    }
    
    $content = $content -replace '(?m)^\s*//\s*(PGRST116|CASCADE)[^\r\n]+\r?\n', ''
    
    $commentedCode = @(
        'if \(', 'for \(', 'const ', 'let ', 'var ', 'return', 
        'await ', 'async ', 'function', '\{', '\}', '\.push', '\.map'
    )
    
    foreach ($pattern in $commentedCode) {
        $regex = "(?m)^\s*//\s*$pattern[^\r\n]*\r?\n"
        $content = $content -replace $regex, ''
    }
    
    $content = $content -replace '(?m)^\s*//\s*console\.log[^\r\n]*\r?\n', ''
    
    $content = $content -replace '(\r?\n){3,}', "`r`n`r`n"
    
    if ($content.Length -ne $originalLength) {
        Set-Content $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $removedChars = $originalLength - $content.Length
        Write-Host "  Updated (removed $removedChars characters)" -ForegroundColor Green
    } else {
        Write-Host "  - No changes" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Done! Processed $($files.Count) files" -ForegroundColor Green
