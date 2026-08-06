#!/usr/bin/env sh
# block-no-verify — garde-fou : empêche Claude de contourner les git hooks.
#
# Hook PreToolUse (matcher Bash) déclaré dans le settings.json voisin. Reçoit sur
# stdin le JSON de l'appel outil ; refuse la commande si elle tente de sauter les
# hooks git (--no-verify, ou la forme courte `git commit -n`).
#
# Sortie : rien + exit 0 = autorisé ; JSON permissionDecision=deny = bloqué.

input=$(cat)

# Ne concerne que l'outil Bash (le matcher le garantit déjà, double sécurité).
case "$input" in
  *'"tool_name":"Bash"'* | *'"tool_name": "Bash"'*) ;;
  *) exit 0 ;;
esac

reason=''
if printf '%s' "$input" | grep -Eq -- '--no-verify'; then
  reason='le flag --no-verify'
elif printf '%s' "$input" | grep -Eq 'git[^"]*commit[^"]*[[:space:]]-[a-z]*n'; then
  reason='la forme courte git commit -n'
fi

[ -z "$reason" ] && exit 0

printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Contournement des git hooks bloqué (%s). Corrige les problèmes remontés par les hooks au lieu de les sauter ; un contournement volontaire doit être demandé explicitement par l utilisateur."}}\n' "$reason"
exit 0
