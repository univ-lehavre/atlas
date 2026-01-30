# Your Collaboration Network

This guide explains how Atlas Verify analyzes and visualizes your scientific collaboration network.

## What is the Collaboration Network?

The collaboration network represents all the researchers with whom you have co-published. This analysis allows you to:

- **Visualize your partnerships**: Who are your regular collaborators?
- **Identify opportunities**: Which researchers close to your network could be future partners?
- **Document your activity**: Demonstrate the collaborative dimension of your work

## Network Visualization

### Collaboration Graph

Your network is displayed as an interactive graph:

```
                    [Dr. Martin]
                         │
                         │ 8 articles
                         │
    [Prof. Bernard]──────●──────[Dr. Petit]
         │              /│\              │
    3 articles        /  │  \       5 articles
         │          /    │    \          │
                  /      │      \
        [Dr. Chen]    [You]    [Prof. Kim]
              │                      │
         2 articles             4 articles
```

- **Node size**: Number of co-publications with you
- **Link thickness**: Intensity of collaboration
- **Color**: Primary research area
- **Distance**: Thematic proximity

### Available Filters

You can filter your network by:

| Filter | Description |
|--------|-------------|
| **Period** | Collaborations from a specific time period |
| **Domain** | Only a specific research area |
| **Institution** | Collaborators from a given institution |
| **Country** | International dimension |
| **Intensity** | Minimum number of co-publications |

## Collaboration Details

### Collaborator Profile

By clicking on a collaborator, you see:

| Information | Example |
|-------------|---------|
| **Name** | Dr. Sophie Martin |
| **Current institution** | CNRS, Paris |
| **Co-publications** | 8 articles |
| **First collaboration** | 2019 |
| **Last collaboration** | 2024 |
| **Common domains** | Machine Learning, NLP |

### Collaboration History

The timeline shows the evolution of your collaboration:

```
2019    2020    2021    2022    2023    2024

  ●       ●●      ●       ●●●     ●
Article  2 art.  Article  3 art.  Article
```

### Joint Publications

List of your co-publications with this researcher, sorted by date.

## Types of Collaborators

The system categorizes your collaborators:

| Type | Definition | Typical example |
|------|------------|-----------------|
| **Regular collaborator** | 5+ articles, continuous collaboration | Laboratory colleague |
| **Project partner** | 2-4 articles, defined period | Joint ANR project |
| **One-time collaboration** | 1 article | Conference, invited article |
| **Historical** | No co-publication for over 3 years | Former thesis advisor |

## Network Statistics

### Global Metrics

| Metric | Your value | Description |
|--------|------------|-------------|
| **Unique co-authors** | 47 | Total number of collaborators |
| **Extended network size** | 312 | Collaborators of your collaborators |
| **Collaboration index** | 3.2 | Average co-authors per article |
| **Internationalization** | 65% | Proportion of foreign collaborators |

### Geographic Distribution

Map showing the location of your collaborators:

```
France            ████████████████  35 (45%)
United States     ████████          15 (19%)
United Kingdom    █████             10 (13%)
Germany           ████               8 (10%)
China             ███                6 (8%)
Other             ██                 4 (5%)
```

### Distribution by Domain

```
Machine Learning    ████████████████████  28 collaborators
NLP                 ████████████          18 collaborators
Computer Vision     ████████               12 collaborators
Data Science        ██████                  9 collaborators
```

## Validate Your Network

### Confirm a Collaboration

If a collaborator is correctly identified, you can confirm them to improve reliability.

### Report an Error

If a person incorrectly appears as a collaborator:
- **Homonym**: That's not you on this article
- **Database error**: Incorrect attribution

### Add a Missing Collaborator

If a collaborator doesn't appear:
1. First check that the joint publication is in your list
2. If so, report the missing collaborator
3. Provide their identifier (preferably ORCID)

## Extended Network

### Second-level Collaborators

Discover researchers close to your network:

> **Dr. Laurent Dubois** (University of Lyon)
> - Collaborator of: Dr. Martin, Prof. Bernard
> - Domains: Machine Learning, Optimization
> - 23 publications (including 5 highly cited)

These suggestions can help you identify future partners.

### Collaboration Paths

The system shows how you are connected to a distant researcher:

```
You → Dr. Martin → Prof. Anderson → Dr. Target
         (8 art.)      (3 art.)
```

## Temporal Dimension

### Network Evolution

Visualize how your network has grown:

```
2015: ●●● (5 collaborators)
2018: ●●●●●●● (12 collaborators)
2021: ●●●●●●●●●●●● (25 collaborators)
2024: ●●●●●●●●●●●●●●●●●●● (47 collaborators)
```

### Active vs Historical Collaborations

| Status | Definition | Count |
|--------|------------|-------|
| **Active** | Co-publication < 2 years ago | 18 |
| **On hold** | 2-5 years without co-publication | 15 |
| **Historical** | > 5 years without co-publication | 14 |

## Export and Sharing

### Export Formats

- **PDF**: Visual report of your network
- **CSV**: List of collaborators with metrics
- **GraphML**: For analysis in Gephi or other tools
- **JSON**: Structured data for integration

### CV Integration

Automatically generate a "Collaborations" section for your CV:

> **International collaborations**
> - 47 co-authors from 15 countries
> - Established partnerships with 12 institutions
> - Regular collaborations with CNRS, MIT, Max Planck Institute

## See Also

- [Verify your publications](./verify-publications.md) - Basis of the analysis
- [Expertise profile](./expertise-profile.md) - Your domains
- [Manage your career](./manage-career.md) - Institutional context

**Technical documentation:** [Researcher profile](../dev/researcher-profile.md) - For developers
