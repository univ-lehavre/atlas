export const formatHelp = (): string =>
  [
    "atlas-stats — statistiques GitHub et npm du dépôt Atlas",
    "",
    "Usage:",
    "  atlas-stats [options]",
    "",
    "Options:",
    "  --token <token>              GitHub token (env: GITHUB_TOKEN)",
    "  --period <day|week|month|quarter>  Période à afficher",
    "  --force                      Ignorer le cache existant",
    "  --json                       Sortie JSON brute",
    "  -h, --help                   Aide",
    "",
    "Exemples:",
    "  atlas-stats",
    "  atlas-stats --period week --json",
    "  atlas-stats --force --token ghp_...",
  ].join("\n");
