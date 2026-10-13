import { describe, expect, it } from 'vitest';
import { CITATION_SOURCE, PAPERS, RESEARCH_TOPICS } from './research';
import { toBibTeX } from '../lib/export';

/**
 * The research page published invented papers once. These tests do not check
 * that the citations are *correct* — only a human opening the DOI can do that
 * — but they do refuse the shapes a fabricated entry takes: no DOI, a link
 * that points somewhere other than the DOI it claims, or an empty summary.
 */
describe('research references', () => {
  it('gives every entry a DOI whose link matches it', () => {
    for (const paper of PAPERS) {
      expect(paper.doi, paper.id).toMatch(/^10\.\d{4,9}\/\S+$/);
      expect(paper.url, paper.id).toBe(`https://doi.org/${paper.doi}`);
    }
  });

  it('keeps ids unique so BibTeX keys and React keys do not collide', () => {
    const ids = PAPERS.map((paper) => paper.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fills in every field a reader needs to judge the source', () => {
    for (const paper of PAPERS) {
      expect(paper.title.trim().length, paper.id).toBeGreaterThan(10);
      expect(paper.authors.trim().length, paper.id).toBeGreaterThan(3);
      expect(paper.venue.trim().length, paper.id).toBeGreaterThan(3);
      expect(paper.summary_th.trim().length, paper.id).toBeGreaterThan(40);
      expect(paper.relevance_th.trim().length, paper.id).toBeGreaterThan(40);
      expect(RESEARCH_TOPICS, paper.id).toContain(paper.topic);
    }
  });

  it('stores publication years as CE, not Buddhist era', () => {
    // `/research` prints "ค.ศ. {year}" and BibTeX exports the same number.
    // A BE year (2569) would be both a wrong label and a broken citation.
    for (const paper of PAPERS) {
      expect(paper.year, paper.id).toBeGreaterThan(1900);
      expect(paper.year, paper.id).toBeLessThan(2100);
    }
  });

  it('dates the citation counts, because they drift', () => {
    expect(CITATION_SOURCE.retrieved_th.trim().length).toBeGreaterThan(3);
    expect(CITATION_SOURCE.url).toMatch(/^https:\/\//);
    for (const paper of PAPERS) {
      expect(Number.isInteger(paper.citations), paper.id).toBe(true);
      expect(paper.citations, paper.id).toBeGreaterThanOrEqual(0);
    }
  });

  it('does not credit this project for other people’s work in BibTeX', () => {
    for (const paper of PAPERS) {
      const entry = toBibTeX(paper);
      expect(entry, paper.id).toContain(`doi     = {${paper.doi}}`);
      expect(entry, paper.id).not.toContain('Watermelon AI Research');
    }
  });
});
