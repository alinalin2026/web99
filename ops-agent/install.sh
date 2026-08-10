#!/usr/bin/env bash
set -Eeuo pipefail

APP=/srv/web99/app
ENV=/srv/web99/config/dashboard.env
NGINX=/etc/nginx/sites-available/web99

[[ $EUID -eq 0 ]] || { echo 'run with sudo'; exit 1; }
[[ -d "$APP/.git" ]] || { echo 'missing /srv/web99/app git checkout'; exit 1; }
[[ -f "$ENV" ]] || { echo 'missing /srv/web99/config/dashboard.env'; exit 1; }
[[ -f "$APP/ops-agent/server.mjs" ]] || { echo 'missing ops-agent/server.mjs — pull the repo as ubuntu first'; exit 1; }
[[ -f "$APP/ops-agent/web99-ops-agent.service" ]] || { echo 'missing ops-agent systemd unit'; exit 1; }
[[ -f "$APP/ops/web99-ops-tool" ]] || { echo 'missing restricted ops helper'; exit 1; }

# IMPORTANT: this installer never runs git. /srv/web99/app is owned and updated
# by ubuntu. Running git as root here would recreate mixed ownership in .git/objects.

install -m 0644 "$APP/ops-agent/web99-ops-agent.service" /etc/systemd/system/web99-ops-agent.service
install -d -m 0755 /usr/local/libexec
install -o root -g root -m 0755 "$APP/ops/web99-ops-tool" /usr/local/libexec/web99-ops-tool
cat >/etc/sudoers.d/web99-ops-agent <<'EOF'
ubuntu ALL=(root) NOPASSWD: /usr/local/libexec/web99-ops-tool *
EOF
chmod 0440 /etc/sudoers.d/web99-ops-agent
visudo -cf /etc/sudoers.d/web99-ops-agent >/dev/null

# Install one independent Nginx route. This deliberately does not depend on
# /srv/web99/live or the Next dashboard.
python3 - <<'PY'
from pathlib import Path
p=Path('/etc/nginx/sites-available/web99')
if not p.exists():
    raise SystemExit('missing /etc/nginx/sites-available/web99')
s=p.read_text()
marker='# WEB99_STANDALONE_OPS_AGENT'
block='''\n    # WEB99_STANDALONE_OPS_AGENT\n    location = /ops-console { return 301 /ops-console/; }\n    location ^~ /ops-console/ {\n        proxy_pass http://127.0.0.1:3011/;\n        proxy_http_version 1.1;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_read_timeout 300s;\n        add_header X-Robots-Tag "noindex, nofollow, noarchive" always;\n        add_header Cache-Control "no-store" always;\n        add_header X-Frame-Options "DENY" always;\n    }\n'''
if marker not in s:
    needle='    # Never expose operational source files from the live directory.\n'
    if needle not in s:
        needle='    location ^~ /dashboard/ { return 404; }\n'
    if needle not in s:
        # Last-resort insertion immediately before the TLS server's closing brace:
        # use the final "location /" block as an anchor rather than guessing a server.
        needle='    location / {\n'
    if needle not in s:
        raise SystemExit('could not find safe insertion point in nginx config')
    s=s.replace(needle,block+'\n'+needle,1)
    p.write_text(s)
PY

ln -sfn "$NGINX" /etc/nginx/sites-enabled/web99
rm -f /etc/nginx/sites-enabled/web99-main /etc/nginx/sites-enabled/web99-dashboard

systemctl daemon-reload
systemctl enable --now web99-ops-agent
nginx -t
systemctl reload nginx
sleep 2

echo '=== OPS SERVICE ==='
systemctl is-active web99-ops-agent

echo '=== LOCAL AGENT ==='
code=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3011/)
echo "$code"
[[ "$code" == 200 ]]

echo '=== PUBLIC CONSOLE ==='
code=$(curl -sS -o /dev/null -w '%{http_code}' https://web99.ie/ops-console/)
echo "$code"
[[ "$code" == 200 ]]

echo 'Standalone Web99 Ops Agent installed: https://web99.ie/ops-console/'
