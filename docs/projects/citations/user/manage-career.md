# Manage Your Career

This guide explains how Atlas Verify reconstructs and allows you to validate your professional career.

## Why Manage Your Career?

Your professional career (affiliations, laboratories, universities) is automatically reconstructed from your publications. This information allows you to:

- **Contextualize your publications**: Associate each article with the correct period
- **Identify homonyms**: A researcher with the same name but in a different laboratory
- **Complete your profile**: Some affiliations may be missing from databases

## What We Reconstruct

### Your Affiliations

For each period of your career, we identify:

| Information | Example |
|-------------|---------|
| **Institution** | Le Havre Normandie University |
| **Laboratory** | LITIS - EA 4108 |
| **Country/City** | France, Le Havre |
| **Period** | 2018 - present |
| **Role** | Associate Professor |

### Sources Used

We cross-reference multiple sources to reconstruct your career:

| Source | Reliability | What it provides |
|--------|-------------|------------------|
| **ORCID** | ⭐⭐⭐⭐⭐ | Data you have entered yourself |
| **OpenAlex** | ⭐⭐⭐⭐ | Affiliations extracted from millions of publications |
| **HAL** | ⭐⭐⭐⭐ | Standardized French research structures |
| **Crossref** | ⭐⭐⭐ | Affiliations declared by publishers |

> **Tip**: Keeping your ORCID profile up to date greatly improves the quality of the reconstruction.

## Visualize Your Career

### Timeline

Your career is displayed as a timeline:

```
2010        2015        2020        2025
  |-----------|-----------|-----------|

  [====== Univ. Paris ======]
                    [=== LITIS, Le Havre ===]

  PhD Student          Associate Prof.
```

### Affiliation Details

By clicking on a period, you access the details:

- **Main institution**: Le Havre Normandie University
- **Laboratory**: LITIS (Laboratory of Computer Science, Information Processing and Systems)
- **ROR identifier**: https://ror.org/01k40cz91
- **Detected period**: January 2018 - present
- **Associated publications**: 23 articles
- **Concordant sources**: ORCID ✓, OpenAlex ✓, HAL ✓

## Validate and Correct

### Confirm an Affiliation

If the affiliation is correct, confirm it. This:
- Increases system confidence
- Helps disambiguate homonyms
- Improves future suggestions

### Correct a Period

If the dates are incorrect:

1. Click on **Modify dates**
2. Adjust the start and/or end date
3. Validate the modification

> **Note**: Your corrections take priority over automatic data.

### Add a Missing Affiliation

Some affiliations may not appear if:
- You did not publish during that period
- The information is not in the databases
- The affiliation was misspelled

To add an affiliation:

1. Click on **Add an affiliation**
2. Search for the institution (by name or ROR identifier)
3. Enter the dates
4. Specify your role (optional)

### Delete an Erroneous Affiliation

If an affiliation doesn't belong to you (error or homonym):

1. Click on **Report as erroneous**
2. Indicate the reason (homonym, database error, etc.)
3. The affiliation will be removed from your profile

## Conflicts and Inconsistencies

### Overlaps

Two affiliations may overlap if you had a dual affiliation. The system asks for confirmation:

```
⚠️ Overlap detected (2019-2020)

During this period, you appear affiliated with:
- Paris-Saclay University (according to OpenAlex)
- Le Havre Normandie University (according to HAL)

[ ] Both are correct (dual affiliation)
[ ] Only Paris-Saclay is correct
[ ] Only Le Havre is correct
```

### Gaps

If a period without affiliation is detected, you can:
- Confirm that it was a period without academic activity
- Add the missing affiliation

## Impact on Your Publications

Validating your career improves:

1. **Publication matching**: Articles from the confirmed period have a higher score
2. **Homonym detection**: An article with a different affiliation will be scrutinized
3. **Your expertise profile**: Themes are contextualized by period

## Export Your Career

You can export your validated career in the following formats:

- **PDF**: Formatted academic CV
- **JSON-LD**: Structured data (for integration)
- **BibTeX**: For bibliography software

## See Also

- [Verify your publications](./verify-publications.md) - Validate your articles
- [Expertise profile](./expertise-profile.md) - Your research domains

**Technical documentation:** [Researcher profile](../dev/researcher-profile.md) - For developers
