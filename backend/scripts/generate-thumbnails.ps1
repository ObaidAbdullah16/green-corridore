Add-Type -AssemblyName System.Drawing

$files = Get-ChildItem -Path "backend/src/data/*.png"

foreach ($file in $files) {
    if ($file.Name.Contains("_thumb")) { continue }
    $src = $file.FullName
    $thumbName = $file.BaseName + "_thumb.jpg"
    $thumbBackend = Join-Path "backend/src/data" $thumbName
    $thumbFrontend = Join-Path "frontend/public/hazard-images" $thumbName

    $img = [System.Drawing.Image]::FromFile($src)
    $maxDim = 480
    $scale = $maxDim / [math]::Max($img.Width, 1)
    $newW = $maxDim
    $newH = [int]($img.Height * $scale)

    $thumb = New-Object System.Drawing.Bitmap($newW, $newH)
    $g = [System.Drawing.Graphics]::FromImage($thumb)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $newW, $newH)

    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]80)

    $thumb.Save($thumbBackend, $codec, $ep)
    $thumb.Save($thumbFrontend, $codec, $ep)

    $g.Dispose()
    $thumb.Dispose()
    $img.Dispose()

    $origSize = [math]::Round($file.Length / 1MB, 2)
    $newSize = [math]::Round((Get-Item $thumbBackend).Length / 1KB, 1)
    Write-Host "Optimized: $($file.Name) ($origSize MB -> $newSize KB)"
}
