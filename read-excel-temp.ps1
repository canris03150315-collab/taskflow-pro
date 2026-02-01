$excelPath = "C:\Users\USER\Downloads\平台帳變(備).xlsx"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $workbook = $excel.Workbooks.Open($excelPath)
    $worksheet = $workbook.Worksheets.Item(1)
    
    Write-Host "=== Excel 檔案分析 ==="
    Write-Host "工作表名稱: $($worksheet.Name)"
    Write-Host ""
    
    $usedRange = $worksheet.UsedRange
    $rowCount = $usedRange.Rows.Count
    $colCount = $usedRange.Columns.Count
    
    Write-Host "總行數: $rowCount"
    Write-Host "總列數: $colCount"
    Write-Host ""
    
    Write-Host "=== 欄位標題 (第1行) ==="
    for ($i = 1; $i -le $colCount; $i++) {
        $header = $worksheet.Cells.Item(1, $i).Text
        Write-Host "欄位 $i : $header"
    }
    
    Write-Host ""
    Write-Host "=== 範例數據 (第2-4行) ==="
    $maxRow = [Math]::Min(4, $rowCount)
    for ($row = 2; $row -le $maxRow; $row++) {
        Write-Host "--- 第 $row 行 ---"
        for ($col = 1; $col -le $colCount; $col++) {
            $value = $worksheet.Cells.Item($row, $col).Text
            if ($value) {
                Write-Host "  [$col] $value"
            }
        }
    }
    
    $workbook.Close($false)
}
catch {
    Write-Host "錯誤: $_"
}
finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
