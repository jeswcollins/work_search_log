# work_search_log
node/html for logging work searches for unemployment insurance, specifically with required fields for MA

![Screenshot](https://github.com/jeswcollins/work_search_log/blob/master/Annotation%202020-04-29%20070157.png)

## How to try it

Phase 1 (SQLite, Form-1750-aligned, edit/backdate/delete, weekly view) — requires Node 22.5+:

1. `npm install` (no dependencies yet — this just creates `package-lock.json`).
2. `npm start` — server listens on http://localhost:1025.
3. Optional: `npm run migrate -- "/path/to/legacy/work_search_logs_by_day"` to import legacy daily HTML logs into SQLite.
4. `npm test` runs the integration tests.

The legacy server still works: `npm run start:legacy` (or `node server_log_work_search_by_day.js`).

## How to load this server on automatically at start up (Windows)
1. Make a new file, called for example, `server_work_search_log.cmd` in the startup folder:
   `C:\Users\USERNAME\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\`, where USERNAME is your user name.
2. In that file, add the following lines to wherever you saved this node directory, e.g. C:\Users\USERNAME\work_search_log
   ```
   cd C:\Users\USERNAME\work_search_log
   node server.js
   ```
   (Or `node server_log_work_search_by_day.js` for the legacy server.)
## How to move node window to another desktop automatically, to keep primary desktops uncluttered (Windows)
1. Download and unzip VirtualDesktop file, to get VirtualDesktop1.ps1 by Markus Scholtes from [this Microsoft site](https://gallery.technet.microsoft.com/scriptcenter/Powershell-commands-to-d0e79cc5/view/Discussions)
2. Keep track of where unzip VirtualDesktop, for example: mine is a location like C:/Users/USERNAME/startupScripts/PowerShellScripts/VirtualDesktop/
3. In that location, make a new file called `move_cmd.ps1`
4. In `move_cmd.ps1`, save this text:
    ```
    . "$PSScriptRoot\VirtualDesktop.ps1"
    Get-Desktop (4) | Move-Window (Get-ConsoleHandle)
    ```
5.  At the beginning of the file from the previous section (e.g. `server_work_search_log.cmd`), add the line:
    ```
    PowerShell C:\Users\USERNAME\startupScripts\PowerShellScripts\VirtualDesktop\move_cmd.ps1
    ```

## How the node script works
