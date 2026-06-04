/**
 * Graceful shutdown for the CRF HTTP server.
 *
 * Facteur IX (Disposability) de l'audit cloud-native : un service doit s'arrêter
 * **proprement** quand l'orchestrateur lui envoie `SIGTERM` (redéploiement,
 * scaling). Sans cela, le processus est tué en plein vol et les requêtes en
 * cours sont perdues.
 *
 * Ce module enregistre **un seul** orchestrateur d'arrêt, idempotent : au
 * premier signal, il **ferme le serveur HTTP** (arrête d'accepter de nouvelles
 * connexions et draine les requêtes actives via `server.close`), puis sort. Un
 * second signal pendant l'arrêt est ignoré. Le flush de la télémétrie reste géré
 * indépendamment par `telemetry.ts` (hooks `process.once` idempotents).
 *
 * @module
 */

/**
 * Sous-ensemble du serveur Node dont on a besoin pour l'arrêt — `serve()` de
 * `@hono/node-server` retourne un `Server | Http2Server | Http2SecureServer`,
 * tous porteurs de `close(callback?)`. On ne dépend que de cette surface, ce qui
 * rend la fonction testable avec un double minimal.
 */
export interface ClosableServer {
  close(callback?: (err?: Error) => void): unknown;
}

/** Signaux d'arrêt gérés. */
export const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT'] as const;

/**
 * Pose le code de sortie du processus sans le tuer : une fois le serveur fermé
 * et tous les handles libérés, l'event loop se vide et Node sort naturellement
 * avec ce code. C'est le pattern du dépôt (cf. `process.exitCode` dans
 * `cli/crf/.../server/index.ts`) — préférable à `process.exit()`, qui couperait
 * les opérations asynchrones en cours (ex. flush télémétrie).
 */
type SetExitCode = (code: number) => void;
const defaultSetExitCode: SetExitCode = (code) => {
  process.exitCode = code;
};

/**
 * Ferme le serveur proprement, puis pose le code de sortie. Idempotent : les
 * appels après le premier sont des no-op (drapeau `closing`). Exporté pour le
 * test unitaire.
 *
 * @param server - le serveur à fermer.
 * @param setExitCode - pose le code de sortie (injectable pour le test).
 * @returns une fonction de shutdown à brancher sur un signal.
 */
export const createShutdownHandler = (
  server: ClosableServer,
  setExitCode: SetExitCode = defaultSetExitCode
): ((signal?: string) => void) => {
  let closing = false;
  return (signal?: string): void => {
    if (closing) return; // un second signal n'a aucun effet
    closing = true;
    if (signal !== undefined && signal !== '') {
      console.warn(`Received ${signal}, shutting down CRF service…`);
    }
    server.close((err?: Error) => {
      if (err) {
        console.error('Error while closing CRF server:', err);
        setExitCode(1);
        return;
      }
      console.warn('CRF service stopped accepting connections; exiting.');
      setExitCode(0);
    });
  };
};

/**
 * Enregistre l'arrêt gracieux sur SIGTERM/SIGINT pour un serveur donné.
 *
 * @param server - le serveur retourné par `serve()`.
 * @param setExitCode - pose le code de sortie (injectable pour le test).
 */
export const registerGracefulShutdown = (
  server: ClosableServer,
  setExitCode: SetExitCode = defaultSetExitCode
): void => {
  const handler = createShutdownHandler(server, setExitCode);
  for (const signal of SHUTDOWN_SIGNALS) {
    // `once` : le handler ne se déclenche qu'au premier signal de ce type ;
    // l'idempotence interne couvre le cas SIGINT puis SIGTERM.
    process.once(signal, () => handler(signal));
  }
};
