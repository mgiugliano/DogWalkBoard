#!/usr/bin/env bash
#
# Setup wizard — run this ONCE on your own computer, BEFORE uploading
# webroot/ to your hosting via FTP. Asks for the map center, timezone, and
# the list of dog-walkers, then generates the config and starting data
# files. Pure bash + standard Unix tools — no PHP needed on your machine to
# run this (the deployed app still needs PHP on the *hosting* side, that's
# unavoidable for the write endpoints).
#
# Usage: bash bin/setup.sh [--force]

set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
webroot="$root_dir/webroot"
js_config_path="$webroot/assets/js/config.js"
php_config_path="$webroot/api/lib/config.php"
data_dir="$webroot/data"

force=0
for arg in "$@"; do
  [ "$arg" = "--force" ] && force=1
done

if [ -f "$js_config_path" ] && [ "$force" -ne 1 ]; then
  echo "webroot/assets/js/config.js already exists — re-run with --force to regenerate it." >&2
  exit 1
fi

# --- Named color palette: pick a number instead of typing a hex value. ---
color_names=(Green Red Blue Yellow Orange Purple Teal Pink Brown Black White Gray)
color_hex=(
  "#2E7D32" "#C62828" "#1565C0" "#F9A825" "#EF6C00" "#6A1B9A"
  "#00838F" "#D81B60" "#6D4C41" "#212121" "#FAFAFA" "#616161"
)

ask() {
  # ask <prompt> <default> -> echoes the answer (default if blank)
  local prompt="$1" default="$2" reply
  read -r -p "${prompt} [${default}]: " reply || true
  echo "${reply:-$default}"
}

ask_float() {
  local prompt="$1" default="$2" reply
  while true; do
    reply="$(ask "$prompt" "$default")"
    if [[ "$reply" =~ ^-?[0-9]+(\.[0-9]+)?$ ]]; then
      echo "$reply"
      return
    fi
    echo "Not a valid number, try again." >&2
  done
}

ask_int() {
  local prompt="$1" default="$2" reply
  while true; do
    reply="$(ask "$prompt" "$default")"
    if [[ "$reply" =~ ^[0-9]+$ ]]; then
      echo "$reply"
      return
    fi
    echo "Not a valid integer, try again." >&2
  done
}

json_escape() {
  # Minimal JSON string escaping for the plain text we generate here
  # (display names, ids) — backslash and double-quote only.
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

echo "== DogWalkBoard setup =="
echo

echo "-- Board --"
board_name="$(ask 'Neighborhood or board name (e.g. "Riverside Park")' "My Neighborhood")"

echo
echo "-- Map --"
echo 'Find the center coordinates on openstreetmap.org: search the spot,'
echo 'right-click -> "Show address" reveals lat/lon.'
map_lat="$(ask_float 'Center latitude' "44.395650")"
map_lon="$(ask_float 'Center longitude' "8.654534")"
map_zoom="$(ask_int 'Initial zoom level (14-19)' "17")"
radius_m="$(ask_float 'Map pan radius in meters' "1300")"
privacy_m="$(ask_float 'GPS auto-stop privacy radius in meters' "1500")"

echo
echo "-- Timezone --"
guessed_tz="UTC"
if [ -L /etc/localtime ]; then
  guessed_tz="$(readlink /etc/localtime | sed -n 's#.*zoneinfo/##p')"
  [ -z "$guessed_tz" ] && guessed_tz="UTC"
fi
timezone="$(ask "PHP/IANA timezone identifier (list: https://www.php.net/manual/en/timezones.php)" "$guessed_tz")"
if [ -d /usr/share/zoneinfo ] && [ ! -f "/usr/share/zoneinfo/$timezone" ]; then
  echo "Warning: \"$timezone\" wasn't found in the local timezone database — continuing anyway, but double-check it's a valid identifier." >&2
fi

echo
echo "-- Participants --"
echo "Add at least 2 people. Leave the id blank to finish."
echo
echo "Available colors:"
for i in "${!color_names[@]}"; do
  printf "  %2d) %-8s %s\n" "$((i + 1))" "${color_names[$i]}" "${color_hex[$i]}"
done

user_ids=()
user_names=()
user_colors=()
used_color_idx=()

while true; do
  n=$((${#user_ids[@]} + 1))
  echo
  echo "Participant $n"
  read -r -p "  Id (lowercase letters/digits/dashes only, e.g. \"anna\"): " id || true
  [ -z "$id" ] && break
  if [[ ! "$id" =~ ^[a-z0-9_-]+$ ]]; then
    echo "  Invalid id, try again." >&2
    continue
  fi
  duplicate=0
  for existing in "${user_ids[@]:-}"; do
    [ "$existing" = "$id" ] && duplicate=1 && break
  done
  if [ "$duplicate" -eq 1 ]; then
    echo "  Id already used, try again." >&2
    continue
  fi

  default_name="$(tr '[:lower:]' '[:upper:]' <<< "${id:0:1}")${id:1}"
  name="$(ask "  Display name" "$default_name")"

  default_color_idx=$(( (${#user_ids[@]}) % ${#color_names[@]} ))
  color_choice="$(ask_int "  Color number (see list above)" "$((default_color_idx + 1))")"
  if [ "$color_choice" -lt 1 ] || [ "$color_choice" -gt "${#color_names[@]}" ]; then
    echo "  Out of range, using ${color_names[$default_color_idx]}." >&2
    color_choice=$((default_color_idx + 1))
  fi
  color_idx=$((color_choice - 1))

  user_ids+=("$id")
  user_names+=("$name")
  user_colors+=("${color_hex[$color_idx]}")
  used_color_idx+=("$color_idx")
  echo "  -> ${name} (${color_names[$color_idx]})"
done

if [ "${#user_ids[@]}" -lt 2 ]; then
  echo
  echo "Warning: the app assumes at least 2 participants — continuing anyway," >&2
  echo "but you'll probably want to add more later by hand-editing" >&2
  echo "webroot/data/public_users.json." >&2
fi

# --- Write the files ---

mkdir -p "$(dirname "$js_config_path")" "$(dirname "$php_config_path")" "$data_dir"

radius_deg="$(awk -v m="$radius_m" 'BEGIN { printf "%.6f", m / 111320 }')"
board_name_json="$(json_escape "$board_name")"

cat > "$js_config_path" <<EOF
// Generated by bin/setup.sh — not tracked by git (see .gitignore).
const MCA_BOARD_NAME = "${board_name_json}";
const MCA_MAP_CENTER = [${map_lat}, ${map_lon}];
const MCA_MAP_ZOOM = ${map_zoom};
const MCA_MAP_MIN_ZOOM = 14;
const MCA_MAP_BOUNDS_RADIUS_DEG = ${radius_deg};
const MCA_PRIVACY_RADIUS_METERS = ${privacy_m};
EOF

cat > "$php_config_path" <<EOF
<?php
declare(strict_types=1);

// Generated by bin/setup.sh — not tracked by git (see .gitignore).
return [
    'timezone' => '$(printf '%s' "$timezone" | sed "s/'/\\\\'/g")',
];
EOF

{
  echo '{'
  echo '    "users": ['
  for i in "${!user_ids[@]}"; do
    sep=","
    [ "$i" -eq $((${#user_ids[@]} - 1)) ] && sep=""
    printf '        { "id": "%s", "name": "%s", "color": "%s" }%s\n' \
      "$(json_escape "${user_ids[$i]}")" "$(json_escape "${user_names[$i]}")" "${user_colors[$i]}" "$sep"
  done
  echo '    ]'
  echo '}'
} > "$data_dir/public_users.json"

pristine_live='{
    "active": false,
    "updated_at": null,
    "position": null,
    "position_updated_at": null,
    "route": [],
    "route_updated_at": null,
    "active_since": null
}'
pristine_schedule='{
    "updated_at": null,
    "slots": []
}'

for id in "${user_ids[@]}"; do
  printf '%s\n' "$pristine_live" > "$data_dir/live_${id}.json"
  printf '%s\n' "$pristine_schedule" > "$data_dir/schedule_${id}.json"
done

echo
echo "== Done =="
echo "Written:"
echo "  - webroot/assets/js/config.js"
echo "  - webroot/api/lib/config.php"
echo "  - webroot/data/public_users.json (${#user_ids[@]} participants)"
for id in "${user_ids[@]}"; do
  echo "  - webroot/data/live_${id}.json, webroot/data/schedule_${id}.json"
done
echo
echo "Next steps:"
echo "  1. Review the generated files (especially config.js/config.php)."
echo "  2. Upload the ENTIRE contents of webroot/ to your hosting via FTP."
echo "  3. Confirm webroot/data/ is writable by your host's PHP process."
echo "  4. Open board.html to confirm everything works."
echo
echo "See DEPLOYMENT.md for details."
