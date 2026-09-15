Add-Type -AssemblyName System.Drawing

$projectRoot = (Get-Location).Path
$sourcePath = Join-Path $projectRoot 'public\players\우진우.png'
$targetPath = Join-Path $projectRoot 'public\generated\01-var-anatomy-lesson-v2.png'
$outputPath = Join-Path $projectRoot 'public\generated\01-var-anatomy-lesson-v3.png'

$source = [System.Drawing.Bitmap]::FromFile($sourcePath)
$target = [System.Drawing.Bitmap]::FromFile($targetPath)

try {
    # The clean player PNG is the lossless counterpart of the requested WebP reference.
    # Crop Woo Jin-woo's face and hair, then feather it as an oval over the painted head.
    $crop = [System.Drawing.Rectangle]::new(90, 50, 420, 450)
    $cutout = [System.Drawing.Bitmap]::new($crop.Width, $crop.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    for ($y = 0; $y -lt $crop.Height; $y++) {
        for ($x = 0; $x -lt $crop.Width; $x++) {
            $pixel = $source.GetPixel($crop.X + $x, $crop.Y + $y)
            $nx = ($x - 210.0) / 205.0
            $ny = ($y - 220.0) / 220.0
            $radius = [Math]::Sqrt(($nx * $nx) + ($ny * $ny))
            $fade = if ($radius -le 0.84) { 1.0 } elseif ($radius -ge 1.0) { 0.0 } else { (1.0 - $radius) / 0.16 }
            $alpha = [int]($pixel.A * $fade)
            $cutout.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $pixel.R, $pixel.G, $pixel.B))
        }
    }

    $canvas = [System.Drawing.Bitmap]::new(1080, 1080, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($target, 0, 0, 1080, 1080)

        # Align the real face over the far-left player while retaining the painted body.
        $destination = [System.Drawing.Rectangle]::new(88, 230, 330, 354)
        $graphics.DrawImage($cutout, $destination)
    }
    finally {
        $graphics.Dispose()
    }

    $canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
    $cutout.Dispose()
}
finally {
    $source.Dispose()
    $target.Dispose()
}

$result = [System.Drawing.Image]::FromFile($outputPath)
try {
    [PSCustomObject]@{
        Path = (Resolve-Path $outputPath).Path
        Width = $result.Width
        Height = $result.Height
        Length = (Get-Item $outputPath).Length
    } | ConvertTo-Json
}
finally {
    $result.Dispose()
}
