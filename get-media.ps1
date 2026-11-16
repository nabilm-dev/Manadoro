$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue
    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
    
    Function Await($WinRtTask, $ResultType) {
        $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
        $netTask = $asTask.Invoke($null, @($WinRtTask))
        $netTask.Wait(1500) | Out-Null
        $netTask.Result
    }

    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType=WindowsRuntime] | Out-Null
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media, ContentType=WindowsRuntime] | Out-Null

    $asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
    $manager = Await $asyncOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
    
    $sessions = $manager.GetSessions()
    $candidate = $null
    $playingCandidate = $null

    foreach ($s in $sessions) {
        $appId = ("" + $s.SourceAppUserModelId).ToLower()
        $propsOp = $s.TryGetMediaPropertiesAsync()
        $props = Await $propsOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
        if ($props -and $props.Title) {
            $playback = $s.GetPlaybackInfo()
            $status = if ($playback) { "$($playback.PlaybackStatus)" } else { 'Unknown' }
            
            $isSpotify = ($appId -like '*spotify*') -or ($props.Artist -like '*spotify*')
            $item = [PSCustomObject]@{
                app = $appId
                title = $props.Title
                artist = $props.Artist
                album = $props.AlbumTitle
                status = $status
                isSpotify = $isSpotify
            }

            if ($status -eq 'Playing') {
                if ($isSpotify) {
                    $playingCandidate = $item
                    break
                }
                if (-not $playingCandidate) {
                    $playingCandidate = $item
                }
            } elseif (-not $candidate) {
                $candidate = $item
            }
        }
    }

    $final = if ($playingCandidate) { $playingCandidate } else { $candidate }

    if ($final) {
        $final | ConvertTo-Json -Compress
    } else {
        # Fallback to desktop Spotify window title if any
        $proc = Get-Process Spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object -First 1
        if ($proc -and $proc.MainWindowTitle -like '* - *') {
            $parts = $proc.MainWindowTitle -split ' - ', 2
            [PSCustomObject]@{
                app = 'spotify.exe'
                title = $parts[1].Trim()
                artist = $parts[0].Trim()
                album = ''
                status = 'Playing'
                isSpotify = $true
            } | ConvertTo-Json -Compress
        } else {
            '{"status":"None"}'
        }
    }
} catch {
    '{"status":"None"}'
}
