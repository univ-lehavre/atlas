import assert from "node:assert/strict";
import { test } from "node:test";
import { checkHistory, upsert } from "./snapshot-coverage.mjs";

const entry = (date, lines = 50) => ({
  date,
  statements: 50,
  branches: 40,
  functions: 60,
  lines,
});

test("upsert ajoute une nouvelle date et trie par date croissante", () => {
  let history = [];
  history = upsert(history, entry("2026-06-02"));
  history = upsert(history, entry("2026-06-01"));
  assert.deepEqual(
    history.map((e) => e.date),
    ["2026-06-01", "2026-06-02"],
  );
});

test("upsert est idempotent par jour : la seconde écrase la première", () => {
  let history = [entry("2026-06-01", 50)];
  history = upsert(history, entry("2026-06-01", 99));
  assert.equal(history.length, 1);
  assert.equal(history[0].lines, 99);
});

test("checkHistory accepte une série valide", () => {
  const history = [entry("2026-06-01"), entry("2026-06-02")];
  assert.deepEqual(checkHistory(history, "2026-06-03"), []);
});

test("checkHistory rejette un doublon de date", () => {
  const history = [entry("2026-06-01"), entry("2026-06-01")];
  assert.ok(checkHistory(history, "2026-06-03").length > 0);
});

test("checkHistory rejette des dates non strictement croissantes", () => {
  const history = [entry("2026-06-02"), entry("2026-06-01")];
  assert.ok(checkHistory(history, "2026-06-03").length > 0);
});

test("checkHistory rejette une date dans le futur", () => {
  const history = [entry("2026-12-31")];
  assert.ok(checkHistory(history, "2026-06-03").length > 0);
});

test("checkHistory rejette un pourcentage hors bornes", () => {
  const history = [{ ...entry("2026-06-01"), lines: 150 }];
  assert.ok(checkHistory(history, "2026-06-03").length > 0);
});

test("checkHistory rejette une date mal formée", () => {
  const history = [{ ...entry("2026-6-1"), date: "2026-6-1" }];
  assert.ok(checkHistory(history, "2026-06-03").length > 0);
});

test("checkHistory exige un tableau à la racine", () => {
  assert.ok(checkHistory({ date: "2026-06-01" }, "2026-06-03").length > 0);
});

test("checkHistory accepte une série vide", () => {
  assert.deepEqual(checkHistory([], "2026-06-03"), []);
});
