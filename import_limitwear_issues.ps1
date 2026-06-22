$csvPath = "LimitWear_Project_Board_Import_v1.0.csv"

$items = Import-Csv $csvPath

foreach ($item in $items) {
    $title = "$($item.ID) — $($item.Title)"

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

    $labelArgs = ""
    foreach ($label in $labels) {
        $labelArgs += " --label `"$label`""
    }

    $command = "gh issue create --title `"$title`" --body `"$body`"$labelArgs"

    Write-Host "Creating issue: $title"
    Invoke-Expression $command
}