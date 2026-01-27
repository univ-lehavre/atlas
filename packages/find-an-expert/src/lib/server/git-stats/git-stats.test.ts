import { describe, it, expect } from 'vitest';
import {
  formatHourlyPeriod,
  groupCommitsByHour,
  aggregatePeriodStats,
  aggregateByHour,
  calculateTotals,
  addCodeStats,
  addTestStats,
  calculateCodeDelta,
  findDateRange,
} from './aggregator';
import {
  PATTERNS,
  isTypeScriptSourceFile,
  isTestFile,
  countMatches,
  analyzeTypeScriptContent,
  analyzeTestContent,
  analyzeFileContent,
} from './code-analyzer';
import { parseNumstatLine } from './repository';
import {
  emptyCodeStats,
  emptyTestStats,
  emptyCodeDelta,
  type TCommitStats,
  type TCodeStats,
} from './types';
import { emptyRepositoryStats } from './service';

describe('aggregator', () => {
  describe('formatHourlyPeriod', () => {
    it('should format date to hourly period string', () => {
      const date = new Date('2025-01-14T10:30:45.000Z');
      expect(formatHourlyPeriod(date)).toBe('2025-01-14T10');
    });

    it('should handle midnight correctly', () => {
      const date = new Date('2025-01-14T00:15:00.000Z');
      expect(formatHourlyPeriod(date)).toBe('2025-01-14T00');
    });
  });

  describe('groupCommitsByHour', () => {
    it('should group commits by hour', () => {
      const commits: TCommitStats[] = [
        {
          hash: 'abc123',
          timestamp: new Date('2025-01-14T10:30:00Z'),
          author: 'Dev1',
          message: 'First commit',
          additions: 10,
          deletions: 5,
          filesChanged: 2,
        },
        {
          hash: 'def456',
          timestamp: new Date('2025-01-14T10:45:00Z'),
          author: 'Dev2',
          message: 'Second commit',
          additions: 20,
          deletions: 10,
          filesChanged: 3,
        },
        {
          hash: 'ghi789',
          timestamp: new Date('2025-01-14T11:15:00Z'),
          author: 'Dev1',
          message: 'Third commit',
          additions: 5,
          deletions: 2,
          filesChanged: 1,
        },
      ];

      const groups = groupCommitsByHour(commits);

      expect(groups.size).toBe(2);
      expect(groups.get('2025-01-14T10')?.length).toBe(2);
      expect(groups.get('2025-01-14T11')?.length).toBe(1);
    });

    it('should return empty map for empty commits', () => {
      const groups = groupCommitsByHour([]);
      expect(groups.size).toBe(0);
    });
  });

  describe('aggregatePeriodStats', () => {
    it('should aggregate commits correctly', () => {
      const commits: TCommitStats[] = [
        {
          hash: 'abc123',
          timestamp: new Date('2025-01-14T10:30:00Z'),
          author: 'Dev1',
          message: 'Commit 1',
          additions: 10,
          deletions: 5,
          filesChanged: 2,
        },
        {
          hash: 'def456',
          timestamp: new Date('2025-01-14T10:45:00Z'),
          author: 'Dev2',
          message: 'Commit 2',
          additions: 20,
          deletions: 10,
          filesChanged: 3,
        },
      ];

      const result = aggregatePeriodStats('2025-01-14T10', commits);

      expect(result.period).toBe('2025-01-14T10');
      expect(result.commits).toBe(2);
      expect(result.additions).toBe(30);
      expect(result.deletions).toBe(15);
      expect(result.filesChanged).toBe(5);
      expect(result.authors).toContain('Dev1');
      expect(result.authors).toContain('Dev2');
    });

    it('should deduplicate authors', () => {
      const commits: TCommitStats[] = [
        {
          hash: 'abc',
          timestamp: new Date(),
          author: 'Dev1',
          message: '',
          additions: 1,
          deletions: 0,
          filesChanged: 1,
        },
        {
          hash: 'def',
          timestamp: new Date(),
          author: 'Dev1',
          message: '',
          additions: 1,
          deletions: 0,
          filesChanged: 1,
        },
      ];

      const result = aggregatePeriodStats('2025-01-14T10', commits);
      expect(result.authors.length).toBe(1);
    });
  });

  describe('aggregateByHour', () => {
    it('should return sorted periods', () => {
      const commits: TCommitStats[] = [
        {
          hash: 'c',
          timestamp: new Date('2025-01-14T12:00:00Z'),
          author: 'Dev',
          message: '',
          additions: 1,
          deletions: 0,
          filesChanged: 1,
        },
        {
          hash: 'a',
          timestamp: new Date('2025-01-14T10:00:00Z'),
          author: 'Dev',
          message: '',
          additions: 1,
          deletions: 0,
          filesChanged: 1,
        },
        {
          hash: 'b',
          timestamp: new Date('2025-01-14T11:00:00Z'),
          author: 'Dev',
          message: '',
          additions: 1,
          deletions: 0,
          filesChanged: 1,
        },
      ];

      const result = aggregateByHour(commits);

      expect(result.length).toBe(3);
      expect(result[0].period).toBe('2025-01-14T10');
      expect(result[1].period).toBe('2025-01-14T11');
      expect(result[2].period).toBe('2025-01-14T12');
    });
  });

  describe('calculateTotals', () => {
    it('should calculate totals correctly', () => {
      const commits: TCommitStats[] = [
        {
          hash: 'a',
          timestamp: new Date(),
          author: 'Dev',
          message: '',
          additions: 10,
          deletions: 5,
          filesChanged: 2,
        },
        {
          hash: 'b',
          timestamp: new Date(),
          author: 'Dev',
          message: '',
          additions: 20,
          deletions: 10,
          filesChanged: 3,
        },
      ];

      const result = calculateTotals(commits);

      expect(result.totalAdditions).toBe(30);
      expect(result.totalDeletions).toBe(15);
      expect(result.totalFilesChanged).toBe(5);
    });

    it('should return zeros for empty commits', () => {
      const result = calculateTotals([]);

      expect(result.totalAdditions).toBe(0);
      expect(result.totalDeletions).toBe(0);
      expect(result.totalFilesChanged).toBe(0);
    });
  });

  describe('addCodeStats', () => {
    it('should add two code stats together', () => {
      const a: TCodeStats = { files: 5, constants: 10, functions: 15, types: 20 };
      const b: TCodeStats = { files: 3, constants: 5, functions: 7, types: 10 };

      const result = addCodeStats(a, b);

      expect(result.files).toBe(8);
      expect(result.constants).toBe(15);
      expect(result.functions).toBe(22);
      expect(result.types).toBe(30);
    });
  });

  describe('addTestStats', () => {
    it('should add two test stats together', () => {
      const a = { files: 3, describes: 5, tests: 20 };
      const b = { files: 2, describes: 3, tests: 10 };

      const result = addTestStats(a, b);

      expect(result.files).toBe(5);
      expect(result.describes).toBe(8);
      expect(result.tests).toBe(30);
    });
  });

  describe('calculateCodeDelta', () => {
    it('should detect additions', () => {
      const before: TCodeStats = { files: 5, constants: 10, functions: 15, types: 20 };
      const after: TCodeStats = { files: 7, constants: 12, functions: 18, types: 25 };

      const delta = calculateCodeDelta(before, after);

      expect(delta.added.files).toBe(2);
      expect(delta.added.constants).toBe(2);
      expect(delta.added.functions).toBe(3);
      expect(delta.added.types).toBe(5);
      expect(delta.deleted.files).toBe(0);
    });

    it('should detect deletions', () => {
      const before: TCodeStats = { files: 10, constants: 20, functions: 30, types: 40 };
      const after: TCodeStats = { files: 8, constants: 15, functions: 25, types: 35 };

      const delta = calculateCodeDelta(before, after);

      expect(delta.deleted.files).toBe(2);
      expect(delta.deleted.constants).toBe(5);
      expect(delta.deleted.functions).toBe(5);
      expect(delta.deleted.types).toBe(5);
      expect(delta.added.files).toBe(0);
    });
  });

  describe('findDateRange', () => {
    it('should find earliest and latest dates', () => {
      const commits: TCommitStats[] = [
        {
          hash: 'a',
          timestamp: new Date('2025-01-14T10:00:00Z'),
          author: 'Dev',
          message: '',
          additions: 0,
          deletions: 0,
          filesChanged: 0,
        },
        {
          hash: 'b',
          timestamp: new Date('2025-01-10T10:00:00Z'),
          author: 'Dev',
          message: '',
          additions: 0,
          deletions: 0,
          filesChanged: 0,
        },
        {
          hash: 'c',
          timestamp: new Date('2025-01-20T10:00:00Z'),
          author: 'Dev',
          message: '',
          additions: 0,
          deletions: 0,
          filesChanged: 0,
        },
      ];

      const { firstCommitDate, lastCommitDate } = findDateRange(commits);

      expect(firstCommitDate?.toISOString()).toBe('2025-01-10T10:00:00.000Z');
      expect(lastCommitDate?.toISOString()).toBe('2025-01-20T10:00:00.000Z');
    });

    it('should return null for empty commits', () => {
      const { firstCommitDate, lastCommitDate } = findDateRange([]);

      expect(firstCommitDate).toBeNull();
      expect(lastCommitDate).toBeNull();
    });
  });
});

describe('code-analyzer', () => {
  describe('isTypeScriptSourceFile', () => {
    it('should return true for .ts files', () => {
      expect(isTypeScriptSourceFile('file.ts')).toBe(true);
      expect(isTypeScriptSourceFile('path/to/file.ts')).toBe(true);
    });

    it('should return false for test files', () => {
      expect(isTypeScriptSourceFile('file.test.ts')).toBe(false);
      expect(isTypeScriptSourceFile('file.spec.ts')).toBe(false);
    });

    it('should return false for declaration files', () => {
      expect(isTypeScriptSourceFile('file.d.ts')).toBe(false);
    });

    it('should return false for non-ts files', () => {
      expect(isTypeScriptSourceFile('file.js')).toBe(false);
      expect(isTypeScriptSourceFile('file.svelte')).toBe(false);
    });
  });

  describe('isTestFile', () => {
    it('should return true for test files', () => {
      expect(isTestFile('file.test.ts')).toBe(true);
      expect(isTestFile('file.spec.ts')).toBe(true);
    });

    it('should return false for source files', () => {
      expect(isTestFile('file.ts')).toBe(false);
    });
  });

  describe('countMatches', () => {
    it('should count pattern matches', () => {
      const content = 'export const a = 1;\nexport const b = 2;';
      expect(countMatches(content, PATTERNS.exportedConstant)).toBe(2);
    });

    it('should return 0 for no matches', () => {
      const content = 'const a = 1;';
      expect(countMatches(content, PATTERNS.exportedConstant)).toBe(0);
    });
  });

  describe('analyzeTypeScriptContent', () => {
    it('should count exported constants', () => {
      const content = `
export const FOO = 'bar';
export const BAZ: string = 'qux';
const notExported = 1;
`;
      const result = analyzeTypeScriptContent(content);
      expect(result.constants).toBe(2);
    });

    it('should count exported functions', () => {
      const content = `
export const myFunc = () => {};
export const asyncFunc = async (a: string) => {};
export function namedFunc() {}
const notExported = () => {};
`;
      const result = analyzeTypeScriptContent(content);
      expect(result.functions).toBe(3);
    });

    it('should count exported types', () => {
      const content = `
export type MyType = string;
export interface MyInterface {}
type NotExported = number;
`;
      const result = analyzeTypeScriptContent(content);
      expect(result.types).toBe(2);
    });
  });

  describe('analyzeTestContent', () => {
    it('should count describe blocks', () => {
      const content = `
describe('module', () => {
  describe('nested', () => {});
});
`;
      const result = analyzeTestContent(content);
      expect(result.describes).toBe(2);
    });

    it('should count test/it blocks', () => {
      const content = `
it('should work', () => {});
test('should also work', () => {});
`;
      const result = analyzeTestContent(content);
      expect(result.tests).toBe(2);
    });
  });
});

describe('repository', () => {
  describe('parseNumstatLine', () => {
    it('should parse valid numstat line', () => {
      const result = parseNumstatLine('10\t5\tsrc/file.ts');

      expect(result).not.toBeNull();
      expect(result?.additions).toBe(10);
      expect(result?.deletions).toBe(5);
      expect(result?.path).toBe('src/file.ts');
    });

    it('should handle binary files with dashes', () => {
      const result = parseNumstatLine('-\t-\timage.png');

      expect(result).not.toBeNull();
      expect(result?.additions).toBe(0);
      expect(result?.deletions).toBe(0);
    });

    it('should return null for invalid line', () => {
      expect(parseNumstatLine('invalid')).toBeNull();
      expect(parseNumstatLine('')).toBeNull();
    });

    it('should detect added status', () => {
      const result = parseNumstatLine('10\t0\tfile.ts');
      expect(result?.status).toBe('added');
    });

    it('should detect deleted status', () => {
      const result = parseNumstatLine('0\t10\tfile.ts');
      expect(result?.status).toBe('deleted');
    });

    it('should detect modified status', () => {
      const result = parseNumstatLine('5\t3\tfile.ts');
      expect(result?.status).toBe('modified');
    });
  });
});

describe('types', () => {
  describe('emptyCodeStats', () => {
    it('should return zeros', () => {
      const result = emptyCodeStats();
      expect(result.files).toBe(0);
      expect(result.constants).toBe(0);
      expect(result.functions).toBe(0);
      expect(result.types).toBe(0);
    });
  });

  describe('emptyTestStats', () => {
    it('should return zeros', () => {
      const result = emptyTestStats();
      expect(result.files).toBe(0);
      expect(result.describes).toBe(0);
      expect(result.tests).toBe(0);
    });
  });

  describe('emptyCodeDelta', () => {
    it('should return empty deltas', () => {
      const result = emptyCodeDelta();
      expect(result.added.files).toBe(0);
      expect(result.modified.files).toBe(0);
      expect(result.deleted.files).toBe(0);
    });
  });

  describe('emptyRepositoryStats', () => {
    it('should return complete empty stats', () => {
      const result = emptyRepositoryStats();

      expect(result.totalCommits).toBe(0);
      expect(result.totalAdditions).toBe(0);
      expect(result.totalDeletions).toBe(0);
      expect(result.firstCommitDate).toBeNull();
      expect(result.lastCommitDate).toBeNull();
      expect(result.currentCode.files).toBe(0);
      expect(result.currentTests.files).toBe(0);
      expect(result.hourlyStats).toEqual([]);
      expect(result.github.issues.open).toBe(0);
    });
  });
});

describe('code-analyzer extended', () => {
  describe('analyzeFileContent', () => {
    it('should analyze TypeScript source file', () => {
      const content = `
export const FOO = 'bar';
export function myFunc() {}
export type MyType = string;
`;
      const result = analyzeFileContent('src/utils.ts', content);

      expect(result.type).toBe('source');
      expect(result.codeStats).toBeDefined();
      expect(result.codeStats?.constants).toBe(1);
      expect(result.codeStats?.functions).toBe(1);
      expect(result.codeStats?.types).toBe(1);
    });

    it('should count arrow function constants as both constant and function', () => {
      const content = `export const myFunc = () => {};`;
      const result = analyzeFileContent('src/utils.ts', content);

      // Arrow functions match both patterns
      expect(result.codeStats?.constants).toBe(1);
      expect(result.codeStats?.functions).toBe(1);
    });

    it('should analyze test file', () => {
      const content = `
describe('module', () => {
  it('should work', () => {});
  test('should also work', () => {});
});
`;
      const result = analyzeFileContent('src/utils.test.ts', content);

      expect(result.type).toBe('test');
      expect(result.testStats).toBeDefined();
      expect(result.testStats?.describes).toBe(1);
      expect(result.testStats?.tests).toBe(2);
    });

    it('should return other for non-ts files', () => {
      const content = '<div>Hello</div>';
      const result = analyzeFileContent('src/App.svelte', content);

      expect(result.type).toBe('other');
      expect(result.codeStats).toBeUndefined();
      expect(result.testStats).toBeUndefined();
    });
  });
});
