#!/bin/sh
# Voegt de bronbestanden samen tot één bestand: blanco/index.html (geen server en geen build-stap nodig om de app te gebruiken).
cd "$(dirname "$0")" || exit 1
STEMPEL=$(TZ=Europe/Amsterdam date '+%d-%m-%Y · %H:%M')
{
  cat src/00-kop.html
  cat src/react.html
  echo "<script>"
  echo "var APP_VERSIE = \"$STEMPEL\";"
  for f in src/[1-9]*.js; do cat "$f"; echo; done
  echo "</script>"
  cat src/99-voet.html
} > index.html
echo "Gebouwd: index.html ($STEMPEL)"
