// Level-3 integration tests : amarre's `surveys.ts` service against a
// real REDCap docker instance.
//
// These tests self-skip when the REDCap stack is unreachable (probe at
// module load). Bring it up with the amarre-sandbox / crf-sandbox
// scripts to actually exercise them — see [apps/amarre/tests/README.md].

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fetchUserId, listRequests, newRequest } from '$lib/server/services/surveys';
import type { TUser } from '$lib/types/api/user';
import { deleteRecordsByPrefix, isRedcapReachable, nodeContext } from '../helpers/redcap';

const reachable = await isRedcapReachable();

// Prefix scoping our test records so afterAll cleanup can find them
// without touching real data, if any happens to live in the sandbox.
const TEST_PREFIX = 'amarre-integ-test-';

const makeTestUser = (suffix: string): TUser & { email: string } => ({
  // newRequest() generates the record_id internally via ID.unique(), so
  // we tag rows via the user.id (stored on the record as `userid`) plus
  // a unique email — both queryable via filterLogic on later assertions.
  id: `${TEST_PREFIX}${suffix}`,
  email: `${TEST_PREFIX}${suffix}@example.test`,
  labels: [],
});

describe.skipIf(!reachable)('surveys integration — amarre × REDCap', () => {
  beforeAll(async () => {
    await deleteRecordsByPrefix(TEST_PREFIX);
  });

  afterAll(async () => {
    await deleteRecordsByPrefix(TEST_PREFIX);
  });

  it('newRequest() imports a record and returns count=1', async () => {
    const user = makeTestUser('new');
    const result = await newRequest(user, nodeContext);
    expect(result).toEqual({ count: 1 });
  });

  it('fetchUserId() returns the userid stored for the given email', async () => {
    const user = makeTestUser('lookup');
    await newRequest(user, nodeContext);
    const found = await fetchUserId(user.email, nodeContext);
    expect(found).toBe(user.id);
  });

  it('fetchUserId() returns null when no contact matches', async () => {
    const found = await fetchUserId(`${TEST_PREFIX}does-not-exist@example.test`, nodeContext);
    expect(found).toBeNull();
  });

  it('listRequests() returns rows scoped to the given userid', async () => {
    const user = makeTestUser('list');
    await newRequest(user, nodeContext);
    const rows = await listRequests(user.id, nodeContext);
    // SurveyRequestItem doesn't expose `userid` (it's a filter input, not a
    // returned field). We assert exactly one row matches our newly-created
    // record under this distinct userid.
    expect(rows.length).toBe(1);
    expect(rows[0]?.record_id).toBeTruthy();
  });

  it('listRequests() returns an empty array when userid has no records', async () => {
    const rows = await listRequests(`${TEST_PREFIX}no-records`, nodeContext);
    expect(rows).toEqual([]);
  });

  it('filterLogic escaping survives double quotes in the userid', async () => {
    // The userid contains a double quote ; without escapeFilterLogicValue,
    // REDCap would 400 with a malformed filter. We're checking that the
    // service's escape logic produces a query REDCap accepts (rather
    // than asserting an exact row count, because REDCap normalises
    // special chars at write time in ways outside our control — that's
    // why the contract-level test was dropped in #179).
    const tricky = `${TEST_PREFIX}quote"in-id`;
    await expect(fetchUserId(`${tricky}@example.test`, nodeContext)).resolves.toBeNull();
    await expect(listRequests(tricky, nodeContext)).resolves.toEqual([]);
  });
});
