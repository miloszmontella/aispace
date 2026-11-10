#!/bin/sh
root=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
cd "$root" || exit 1
export PATH="$HOME/.local/node/bin:$PATH"
if python3 -c 'import urllib.request; urllib.request.urlopen("http://127.0.0.1:8080/", timeout=1).read(1)' >/dev/null 2>&1; then
  exit 0
fi
npm run dev > /tmp/aurelle-dev.log 2>&1 &
exit 0
