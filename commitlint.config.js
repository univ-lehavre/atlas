export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-enum': [1, 'always', ['crf', 'net', 'ecrin', 'infra', 'docs', 'deps', 'config', 'ci']],
    'subject-case': [2, 'always', 'lower-case'],
  },
};
