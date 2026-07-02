#!/usr/bin/env bash
#
# audition_voices.sh -- hear macOS voices speaking the ACTUAL drill words
# (all eight file letters + both colors), so you can pick one before recording.
#
# Usage:
#   ./scripts/audition_voices.sh                       # a shortlist of clearer built-ins
#   ./scripts/audition_voices.sh Samantha "Ava (Premium)"   # only the voices you name
#
# Tip: the natural-sounding voices are the "Premium"/"Enhanced" ones you
# download in System Settings -> Accessibility -> Spoken Content -> Manage
# Voices. Once downloaded, pass their names here to compare them.

set -euo pipefail

# Exercises every letter + both colors + full examples, in the exact format
# the clips use.
SAMPLE="A. B. C. D. E. F. G. H. Light. Dark. A 1 is dark. E 5 is dark. H 1 is light."

if [ "$#" -gt 0 ]; then
  voices=("$@")
else
  # Clearer built-ins worth hearing (skips the novelty voices like Zarvox).
  # Add any "Premium"/"Enhanced" voices you've downloaded as arguments.
  voices=(
    "Samantha" "Kathy" "Fred" "Daniel"
    "Eddy (English (US))" "Flo (English (US))" "Reed (English (US))"
    "Rocko (English (US))" "Sandy (English (US))" "Shelley (English (US))"
  )
fi

if ! command -v say >/dev/null 2>&1; then
  echo "This needs macOS 'say' (run it on your Mac)." >&2
  exit 1
fi

for v in "${voices[@]}"; do
  if say -v '?' | grep -Fq -- "$v"; then
    echo "▶  $v"
    say -v "$v" "$SAMPLE"
    sleep 0.4
  else
    echo "–  $v  (not installed, skipping)"
  fi
done

echo
echo "Pick one, then record all 64 clips with it:"
echo "  ./scripts/generate_square_audio.sh \"VOICE NAME\""
