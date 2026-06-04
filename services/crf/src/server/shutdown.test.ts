import { describe, it, expect, vi } from 'vitest';
import {
  createShutdownHandler,
  registerGracefulShutdown,
  SHUTDOWN_SIGNALS,
  type ClosableServer,
} from './shutdown.js';

/**
 * Tests du shutdown gracieux (facteur IX Disposability).
 *
 * On teste la logique d'arrêt **sans** processus réel : un serveur double
 * (`close` espionné) et une fonction `exit` injectée. Cela couvre la fermeture,
 * les codes de sortie et l'idempotence sans tuer le runner de test.
 */

/** Serveur double : capture le callback de `close` pour le déclencher à la main. */
const fakeServer = (): ClosableServer & {
  triggerClose: (err?: Error) => void;
  closeCalls: number;
} => {
  let cb: ((err?: Error) => void) | undefined;
  let closeCalls = 0;
  return {
    close(callback?: (err?: Error) => void) {
      closeCalls += 1;
      cb = callback;
      return this;
    },
    triggerClose(err?: Error) {
      cb?.(err);
    },
    get closeCalls() {
      return closeCalls;
    },
  };
};

describe('createShutdownHandler', () => {
  it('ferme le serveur et sort avec le code 0 en cas de succès', () => {
    const server = fakeServer();
    const setExitCode = vi.fn();
    const shutdown = createShutdownHandler(server, setExitCode);

    shutdown('SIGTERM');
    expect(server.closeCalls).toBe(1);
    expect(setExitCode).not.toHaveBeenCalled(); // pas encore : close est asynchrone

    server.triggerClose(); // close se termine sans erreur
    expect(setExitCode).toHaveBeenCalledWith(0);
  });

  it('pose process.exitCode par défaut (sans injection)', () => {
    const previous = process.exitCode;
    try {
      const server = fakeServer();
      // Pas de setExitCode injecté : on exerce le chemin par défaut réel.
      const shutdown = createShutdownHandler(server);
      shutdown('SIGTERM');
      server.triggerClose(); // succès → process.exitCode = 0
      expect(process.exitCode).toBe(0);
    } finally {
      process.exitCode = previous; // ne pas fausser le code de sortie du runner
    }
  });

  it('sort avec le code 1 si la fermeture échoue', () => {
    const server = fakeServer();
    const setExitCode = vi.fn();
    const shutdown = createShutdownHandler(server, setExitCode);

    shutdown('SIGINT');
    server.triggerClose(new Error('boom'));
    expect(setExitCode).toHaveBeenCalledWith(1);
  });

  it('est idempotent : un second appel ne re-ferme pas le serveur', () => {
    const server = fakeServer();
    const setExitCode = vi.fn();
    const shutdown = createShutdownHandler(server, setExitCode);

    shutdown('SIGTERM');
    shutdown('SIGTERM'); // doit être un no-op
    expect(server.closeCalls).toBe(1);
  });
});

describe('registerGracefulShutdown', () => {
  it("enregistre un handler par signal d'arrêt", () => {
    // Map (pas d'objet indexé dynamiquement) pour éviter le faux positif
    // security/detect-object-injection sur un accès par clé variable.
    const before = new Map(SHUTDOWN_SIGNALS.map((s) => [s, process.listeners(s)]));
    const server = fakeServer();

    registerGracefulShutdown(server, vi.fn());

    for (const signal of SHUTDOWN_SIGNALS) {
      const baseline = before.get(signal) ?? [];
      const after = process.listeners(signal);
      expect(after.length).toBe(baseline.length + 1);
      // Récupérer le handler ajouté et l'invoquer DIRECTEMENT (sans émettre un
      // vrai signal qui tuerait le runner) — couvre le branchement signal→close.
      const added = after.filter((l) => !baseline.includes(l));
      expect(added).toHaveLength(1);
      // @ts-expect-error — les listeners de signal sont typés `(...args) => void`.
      added[0]();
      // Nettoyer uniquement le(s) handler(s) ajouté(s), sans toucher aux autres.
      for (const listener of added) {
        process.removeListener(signal, listener);
      }
    }
    // Le premier signal invoqué a fermé le serveur ; les suivants sont no-op
    // (idempotence interne du handler).
    expect(server.closeCalls).toBe(1);
  });
});
