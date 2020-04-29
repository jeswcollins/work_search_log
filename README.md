# work_search_log
node/html for logging work searches for unemployment insurance, specifically with required fields for MA

![Screenshot](https://github.com/jeswcollins/work_search_log/blob/master/Annotation%202020-04-29%20070157.png)

## How to try it
1. Install node if you haven't, there are guides online.
2. Download this directory and unzip or just the files addForm.html and server_log_work_search_by_day.js.
3. Then open Terminal (Mac), or Command Prompt or Powershell (Windows).
4. `cd` to the directory containing the files.
5. type `node server_log_work_search_by_day.js` or `node s<Tab>` to autocomplete and press `<Enter>`.

## How to load this server on automatically at start up (Windows)
1. Make a new file, called for example, `server_work_search_log.cmd` in the startup folder:
   `C:\Users\USERNAME\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\`, where USERNAME is your user name.
2. In that file, add the following lines to wherever you saved this node directory, e.g. C:\Users\USERNAME\work_search_log
   ```
   cd C:\Users\USERNAME\work_search_log
   node server_log_work_search_by_day.js
   ```
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
