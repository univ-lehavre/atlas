# Verify Your Publications

This guide explains how to validate the publications attributed to you in Atlas Verify.

## Why Verify?

Bibliographic databases can contain errors:

- **Homonyms**: Another "Jean Dupont" may have publications incorrectly attributed to you
- **Name variants**: "J. Dupont", "Jean-Pierre Dupont" can create confusion
- **Data entry errors**: Publishers sometimes make mistakes

Your validation helps build a reliable and complete profile.

## Types of Decisions

### Confirm a Publication

Use this option when you are **certain** that the article is yours.

**Useful clues**:
- You recognize the title and co-authors
- The affiliation matches your career
- The date is consistent with your career

### Reject a Publication

Use this option when you are **certain** that the article is not yours.

**Common cases**:
- Homonym (same name, different researcher)
- Obvious error (completely different field)
- Impossible date (before your studies, for example)

> **Tip**: If you know the actual author, you can suggest them to help the database.

### Mark as Uncertain

Use this option when you **don't know**:
- Old article you no longer remember
- Co-author you don't recognize
- Title that doesn't ring a bell

The article will remain in your queue for later review.

### Report a Duplicate

Multiple entries may correspond to the same article:
- ArXiv preprint + published version
- Publisher DOI + institutional repository DOI
- Successive versions with corrections

Merge them to avoid duplicates in your bibliography.

## Confidence Levels

For each decision, indicate your level of certainty:

| Level | Meaning | Use |
|-------|---------|-----|
| **Certain** | I have no doubt | You perfectly recognize the article |
| **Probable** | I think yes/no | The article seems familiar/unfamiliar |
| **Possible** | It's possible | You're not sure but it's plausible |
| **Uncertain** | I really don't know | Old article or failing memory |

## Matching Score

Each candidate publication displays an automatically calculated **confidence score**:

```
Score 95%+: Very high confidence (ORCID confirmed)
Score 80-95%: High confidence (name + affiliation match)
Score 50-80%: Medium confidence (similar name, plausible context)
Score <50%: Low confidence (verification recommended)
```

### Criteria Considered

| Criterion | Impact | Explanation |
|-----------|--------|-------------|
| **ORCID present** | +++++ | Your ORCID is in the article's metadata |
| **Matching email** | ++++ | Your institutional email is mentioned |
| **Exact name** | +++ | First and last name identical |
| **Known affiliation** | +++ | Institution in your career history |
| **Known co-authors** | ++ | You have already validated articles with them |
| **Related topic** | + | Research domain similar to your other publications |

## Batch Verification

To save time, you can:

1. **Filter** by confidence score (e.g., show only >90%)
2. **Select multiple** similar articles
3. **Confirm in batch** all selected articles

> **Warning**: Batch verification is reserved for high-confidence articles. If in doubt, verify individually.

## Auto-confirmation

You can enable auto-confirmation for very high confidence publications:

**Settings** → **Auto-confirmation** → Threshold: 95%

Articles with a score ≥ 95% (generally those with confirmed ORCID) will be automatically added to your profile.

## Decision History

All your decisions are recorded with:
- Date and time
- Indicated confidence level
- Any notes

You can **reverse a decision** at any time from the history.

## Best Practices

1. **Start with high scores** - Faster and less risky
2. **Check the co-authors** - If you recognize a co-author, that's a good sign
3. **Check the affiliation** - Does it match your career at that date?
4. **If in doubt, mark "uncertain"** - You can come back to it later
5. **Document rejections** - Note why it's not you (helps the system)

## See Also

- [Manage your career](./manage-career.md) - Verify your affiliations
- [Expertise profile](./expertise-profile.md) - Your research domains

**Technical documentation:** [Author verification](../dev/author-verification.md) - For developers
