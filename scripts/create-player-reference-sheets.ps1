Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$players = Join-Path $root 'public\players'
$output = Join-Path $root 'public\generated\references'
New-Item -ItemType Directory -Path $output -Force | Out-Null

$sheets = [ordered]@{
    '12-who-kicks-references.png' = @('강현준','김한별','이건주','공도하','홍창의','문승환','박영휘')
    '16-protest-references.png' = @('강창훈','문승환','김주성','문대영','임준우','김준수','이재욱','임재준')
    '17-selfie-references.png' = @('황동주','임준우','강현준','이건주','김준수','김광민')
    '07-sticker-references.png' = @('강환국','신태민','김준수','박영휘','황동주')
    '04-halftime-references.png' = @('문승환','임준우','공도하','강창훈','최동권','금상덕')
    '05-shootout-references.png' = @('강현준','이건주','김한별','임재준','백성원','홍창의','우진우')
    '06-offside-references.png' = @('문대영','백성원','홍창의','강창훈','원석희','김주성','박영휘')
}

foreach ($entry in $sheets.GetEnumerator()) {
    $names = $entry.Value
    $cellWidth = 360
    $cellHeight = 480
    $columns = 4
    $rows = [Math]::Ceiling($names.Count / $columns)
    $sheet = [System.Drawing.Bitmap]::new($columns * $cellWidth, $rows * $cellHeight)
    $graphics = [System.Drawing.Graphics]::FromImage($sheet)
    try {
        $graphics.Clear([System.Drawing.Color]::FromArgb(225,225,225))
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $font = [System.Drawing.Font]::new('Malgun Gothic', 22, [System.Drawing.FontStyle]::Bold)
        $brush = [System.Drawing.Brushes]::Black
        for ($index = 0; $index -lt $names.Count; $index++) {
            $name = $names[$index]
            $png = Join-Path $players ($name + '.png')
            if (-not (Test-Path -LiteralPath $png)) { $png = Join-Path $players ('backup\' + $name + '.png') }
            $image = [System.Drawing.Image]::FromFile($png)
            try {
                $left = ($index % $columns) * $cellWidth
                $top = [Math]::Floor($index / $columns) * $cellHeight
                $graphics.FillRectangle([System.Drawing.Brushes]::White, $left, $top, $cellWidth, $cellHeight)
                $scale = [Math]::Min($cellWidth / $image.Width, 420 / $image.Height)
                $width = [int]($image.Width * $scale)
                $height = [int]($image.Height * $scale)
                $x = $left + [int](($cellWidth - $width) / 2)
                $graphics.DrawImage($image, $x, $top, $width, $height)
                $graphics.DrawString((($index + 1).ToString() + '. ' + $name), $font, $brush, $left + 12, $top + 432)
            }
            finally { $image.Dispose() }
        }
        $font.Dispose()
        $sheet.Save((Join-Path $output $entry.Key), [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $graphics.Dispose()
        $sheet.Dispose()
    }
}
