#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
sdk=${ANDROID_SDK:-"$HOME/.local/android-sdk"}
jdk=${JAVA_HOME:-"$HOME/.local/jdk"}
bt="$sdk/build-tools/36.0.0"
android_jar="$sdk/platforms/android-36/android.jar"
work="$root/android/.build"
www="$root/android/.www"
ks="$root/android/debug.keystore"
export PATH="$HOME/.local/node/bin:$jdk/bin:$PATH"

if [ ! -x "$jdk/bin/javac" ] || [ ! -x "$bt/aapt2" ] || [ ! -f "$android_jar" ]; then
  echo "Android SDK or JDK is missing" >&2
  exit 1
fi

rm -rf "$work"
mkdir -p "$work/gen" "$work/classes"

npx vite build --config "$root/android/vite.config.mjs"
sed 's|\.\./assets|./assets|g' "$www/android/index.html" > "$www/index.html"
rm -rf "$www/android"
python3 - "$www" <<'PY'
import pathlib, sys
root = pathlib.Path(sys.argv[1])
html_path = root / "index.html"
html = html_path.read_text()
html = html.replace(' type="module"', " defer").replace(" crossorigin", "")
html_path.write_text(html)
scripts = [line for line in html.split('"') if line.startswith("./assets/") and line.endswith(".js")]
if len(scripts) != 1:
    raise SystemExit("expected one script in index.html, got %s" % scripts)
js_path = root / scripts[0][2:]
js_url = "file:///android_asset/www/assets/" + js_path.name
js = js_path.read_text()
js = js.replace("import.meta.url", '"' + js_url + '"').replace("import.meta.resolve", "void 0")
js_path.write_text(js)
PY
js=$(echo "$www"/assets/index-*.js)
npx esbuild "$js" --target=chrome70 --allow-overwrite --outfile="$js"
node --check "$js"

if [ ! -f "$ks" ]; then
  keytool -genkeypair \
    -keystore "$ks" \
    -storepass android \
    -keypass android \
    -alias aurelle \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -dname "CN=Aurelle, OU=Archive, O=Aurelle, C=US"
fi

"$bt/aapt2" compile --dir "$root/android/res" -o "$work/res.zip"
"$bt/aapt2" link \
  -o "$work/base.apk" \
  -I "$android_jar" \
  --manifest "$root/android/AndroidManifest.xml" \
  --java "$work/gen" \
  --min-sdk-version 24 \
  --target-sdk-version 33 \
  "$work/res.zip"

find "$work/gen" "$root/android/src" -name '*.java' > "$work/sources.txt"
javac --release 8 -classpath "$android_jar" -d "$work/classes" @"$work/sources.txt"
"$bt/d8" --min-api 24 --lib "$android_jar" --output "$work" $(find "$work/classes" -name '*.class')

python3 - "$work" "$www" <<'PY'
import os
import sys
import zipfile

work, www = sys.argv[1:]
apk = zipfile.ZipFile(os.path.join(work, "base.apk"), "a")
apk.write(os.path.join(work, "classes.dex"), "classes.dex", compress_type=zipfile.ZIP_STORED)
for dirpath, _, files in os.walk(www):
    for name in files:
        full = os.path.join(dirpath, name)
        rel = os.path.relpath(full, www).replace(os.sep, "/")
        apk.write(full, "assets/www/" + rel, compress_type=zipfile.ZIP_DEFLATED)
apk.close()
PY

"$bt/zipalign" -p -f 4 "$work/base.apk" "$work/aligned.apk"
"$bt/apksigner" sign \
  --ks "$ks" \
  --ks-pass pass:android \
  --key-pass pass:android \
  --ks-key-alias aurelle \
  --v1-signing-enabled true \
  --v2-signing-enabled true \
  --v3-signing-enabled true \
  --out "$root/public/aurelle.apk" \
  "$work/aligned.apk"
"$bt/apksigner" verify --verbose "$root/public/aurelle.apk"
"$bt/aapt" dump badging "$root/public/aurelle.apk" | head -n 5
ls -lh "$root/public/aurelle.apk"
rm -rf "$work" "$www"
