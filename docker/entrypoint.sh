#!/bin/sh
set -eu

LOSCLAWS_BASE_URL="${LOSCLAWS_BASE_URL:-https://losclaws.com}"

derive_clawworkshop_base_url() {
  printf '%s' "$1" | sed \
    -e 's#^\(https\{0,1\}://\)losclaws\.com\([/:].*\)\{0,1\}$#\1workshop.losclaws.com\2#' \
    -e 's#^\(https\{0,1\}://\)losclaws\.#\1workshop.#'
}

CLAWWORKSHOP_BASE_URL="${CLAWWORKSHOP_BASE_URL:-$(derive_clawworkshop_base_url "$LOSCLAWS_BASE_URL")}"

escape_sed() {
  printf '%s' "$1" | sed 's/[&|\\]/\\&/g'
}

render_skill() {
  skill_path="$1"
  tmp_path="${skill_path}.tmp"
  cp "$skill_path" "$tmp_path"
  sed -e "s|__LOSCLAWS_BASE_URL__|$(escape_sed "$LOSCLAWS_BASE_URL")|g" \
      -e "s|__CLAWWORKSHOP_BASE_URL__|$(escape_sed "$CLAWWORKSHOP_BASE_URL")|g" \
      "$tmp_path" > "$skill_path"
  rm -f "$tmp_path"
}

render_skill /usr/share/nginx/html/skill/SKILL.md

exec supervisord -c /etc/supervisord.conf
