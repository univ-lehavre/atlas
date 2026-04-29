import { describe, it, expect } from 'vitest';
import { ECR, RED, BLUE, GREEN, YELLOW, PURPLE } from './index.js';

describe('ECR', () => {
  it('has 3 entries', () => expect(ECR).toHaveLength(3));
  it('first entry is ecr1', () => expect(ECR[0]?.code).toBe('ecr1'));
  it('has label for each', () => {
    for (const item of ECR) {
      expect(item.label).toBeTruthy();
    }
  });
});

describe('color constants', () => {
  it('RED is a hex color', () => expect(RED).toMatch(/^#[0-9A-F]{6}$/i));
  it('BLUE is a hex color', () => expect(BLUE).toMatch(/^#[0-9A-F]{6}$/i));
  it('GREEN is a hex color', () => expect(GREEN).toMatch(/^#[0-9A-F]{6}$/i));
  it('YELLOW is a hex color', () => expect(YELLOW).toMatch(/^#[0-9A-F]{6}$/i));
  it('PURPLE is a hex color', () => expect(PURPLE).toMatch(/^#[0-9A-F]{6}$/i));
});
