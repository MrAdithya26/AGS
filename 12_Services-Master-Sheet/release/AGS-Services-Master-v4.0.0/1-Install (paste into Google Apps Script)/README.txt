Paste in this order (guide section 3, step B):
  1-Code.gs          -> Code.gs (replace everything)
  2-Index.html       -> + HTML, name it  Index
  3-Styles.html      -> + HTML, name it  Styles
  4-App.html         -> + HTML, name it  App
  5-appsscript.json  -> Project Settings > Show "appsscript.json", replace everything
Then Ctrl+S, run "setup" (allow the permissions, including Contacts), then
Deploy > New deployment > Web app (Me / Anyone). First login Admin / 1234, then set your own password.

ALREADY USING v3? Paste the 5 files over the old ones, run "setup" once, then
Deploy > Manage deployments > Edit > Version: New version > Deploy. Your data stays; new tabs are added.
