#!/usr/bin/env bash
#
# generate_square_audio.sh -- render the 64 spoken square clips for the color
# drill, ON A MAC, using a good-quality voice.
#
# Why a Mac + `say`: Safari won't expose its high-quality voices to web pages,
# but the macOS `say` command CAN use the downloadable "Premium"/"Enhanced"
# voices. We render each of the 64 fixed utterances once to an .m4a (AAC, which
# every browser plays) and commit them as static assets.
#
# ONE-TIME manual step (UI only -- can't be scripted): download a better voice.
#   System Settings -> Accessibility -> Spoken Content -> System Voice ->
#   (dropdown) Manage Voices... -> English -> tick a "Premium" (or "Enhanced")
#   voice, e.g. "Ava (Premium)", and wait for it to download.
# (Exact menu wording varies slightly by macOS version.)
#
# Usage:
#   ./scripts/generate_square_audio.sh                 # uses the default voice
#   ./scripts/generate_square_audio.sh "Ava (Premium)" # uses the voice you name
#
# Run it from the project root. Re-run any time to regenerate.

set -euo pipefail

VOICE="${1:-Samantha}"
OUTDIR="app/static/audio/squares"

# --- sanity checks --------------------------------------------------------
if ! command -v say >/dev/null 2>&1; then
  echo "This script needs macOS 'say' (run it on your Mac)." >&2
  exit 1
fi
if ! command -v afconvert >/dev/null 2>&1; then
  echo "This script needs macOS 'afconvert' (ships with macOS)." >&2
  exit 1
fi
if ! say -v '?' | grep -Fq -- "$VOICE"; then
  echo "Voice \"$VOICE\" is not installed. Installed English voices:" >&2
  say -v '?' | grep -E 'en_US|en_GB' | sed 's/^/  /' >&2
  echo "Download a Premium/Enhanced voice in System Settings, then pass it, e.g.:" >&2
  echo "  ./scripts/generate_square_audio.sh \"Ava (Premium)\"" >&2
  exit 1
fi

mkdir -p "$OUTDIR"
echo "Voice:  $VOICE"
echo "Output: $OUTDIR"

# --- render all 64 squares ------------------------------------------------
# Color rule matches app/routes.py exactly:
#   dark  if (file_index + rank_index) is even  -> spoken "dark"
#   light otherwise                             -> spoken "light"
files=(a b c d e f g h)
# Speak each file as a plain CAPITAL letter -- enhanced voices read "A 1 is
# black" correctly (verified by ear with Tessa (Enhanced)). Phonetic spellings
# like "ay"/"eff" backfired: some voices spell them out letter-by-letter.
# Parallel to files[] (index 0..7). Must match SAY_LETTER in speech.js.
say_letter=(A B C D E F G H)
count=0
for fi in "${!files[@]}"; do
  f="${files[$fi]}"
  L="${say_letter[$fi]}"
  for r in 1 2 3 4 5 6 7 8; do
    ri=$(( r - 1 ))
    if (( (fi + ri) % 2 == 0 )); then color="dark"; else color="light"; fi
    sq="${f}${r}"
    # e.g. "A 1 is dark"
    text="${L} ${r} is ${color}"
    aiff="${OUTDIR}/${sq}.aiff"
    m4a="${OUTDIR}/${sq}.m4a"
    say -v "$VOICE" -o "$aiff" "$text"
    afconvert "$aiff" "$m4a" -f m4af -d aac >/dev/null
    rm -f "$aiff"
    count=$(( count + 1 ))
  done
done

echo "Rendered $count clips."
echo "Total size: $(du -sh "$OUTDIR" | cut -f1)"
echo
echo "Listen to a couple to check pronunciation:"
echo "  afplay ${OUTDIR}/a1.m4a   # should say: A 1 is dark"
echo "  afplay ${OUTDIR}/h1.m4a   # should say: H 1 is light"
echo
echo "If a letter sounds wrong (e.g. \"A\" read as \"uh\"), tweak the \$text line and re-run."
