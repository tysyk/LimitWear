$csvPath = "LimitWear_Project_Board_Import_v1.0.csv"

$items = Import-Csv $csvPath -Encoding UTF8

foreach ($item in $items) {
    $title = "$($item.ID) - $($item.Title)"

    $body = @"
## Goal
$($item.Description)

## Milestone
$($item.Milestone)

## Phase
$($item.Phase)

## Area
$($item.Area)

## Type
$($item.Type)

## Priority
$($item.Priority)

## Depends On
$($item.'Depends On')

## Acceptance Criteria
$($item.'Acceptance Criteria')

## Testing Notes
$($item.'Testing Notes')
"@

    $labels = @()

    if ($item.Type) {
        $labels += "type: $($item.Type)"
    }

    if ($item.Priority) {
        $labels += "priority: $($item.Priority)"
    }

    if ($item.Area) {
        $labels += "area: $($item.Area)"
    }

    $tempBodyFile = New-TemporaryFile
    Set-Content -Path $tempBodyFile -Value $body -Encoding UTF8

    $argsList = @("issue", "create", "--title", $title, "--body-file", $tempBodyFile)

    foreach ($label in $labels) {
        $argsList += @("--label", $label)
    }

    Write-Host "Creating issue: $title"
    & gh @argsList

    Remove-Item $tempBodyFile -Force
}