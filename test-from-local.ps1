# 從本地 Windows 測試 API Key（不是從伺服器）
$apiKey = "AIzaSyC13jOlDBMpyEL9d-xQ4dvCrnoDBtOpYiI"
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$apiKey"

$body = @{
    contents = @(
        @{
            parts = @(
                @{
                    text = "Hello"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "Testing API Key from local Windows machine..."
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ SUCCESS! API Key works from local machine!"
    Write-Host "Response:", $response.candidates[0].content.parts[0].text
} catch {
    Write-Host "❌ FAILED from local machine"
    Write-Host "Status:", $_.Exception.Response.StatusCode
    Write-Host "Error:", $_.Exception.Message
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body:", $responseBody
    }
}
