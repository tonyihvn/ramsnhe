# 1. Local Git Operations
Write-Host "--- Moving into jb folder and starting Git ---" -ForegroundColor Cyan

$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

git add .
git commit -m "Automated push on $Timestamp"
git push origin main

# 2. Remote Server Operations
Write-Host "--- Connecting to Remote Server ---" -ForegroundColor Cyan

# Bundling Linux commands to execute over SSH
$RemoteCommands = @"
    cd jb && \
    git pull && \
    source /home/jbadmin/nodevenv/jb/24/bin/activate && \
    cd /home/jbadmin/jb && \
    npm cache clean --force && \
    npm install --production=false && \
    npm run build && \
    cp -r dist/. ../public_html && \
    echo 'Remote Deployment Complete!'
"@

# Execute via SSH (It will prompt for password here)
ssh jbadmin@jobiz.ng $RemoteCommands

Write-Host "--- All Done! ---" -ForegroundColor Green