# Your Expertise Profile

This guide explains how Atlas Verify analyzes your publications to identify your areas of expertise.

## How Does the Analysis Work?

Atlas Verify analyzes all of your confirmed publications to identify:

- **Your research areas**: The topics on which you publish
- **Your expertise level**: Based on volume, impact, and regularity
- **Temporal evolution**: How your interests have evolved

### Analysis Sources

| Method | Description | Reliability |
|--------|-------------|-------------|
| **OpenAlex Topics** | Automatic AI classification of 65,000+ subjects | ⭐⭐⭐⭐⭐ |
| **Author keywords** | The keywords you have chosen | ⭐⭐⭐⭐ |
| **HAL domains** | French disciplinary classification | ⭐⭐⭐⭐ |
| **Text analysis** | Automatic extraction of key concepts | ⭐⭐⭐ |

## Your Expertise Map

### Overview

Your profile displays a **thematic map** showing your domains:

```
                    Machine Learning
                         ████████
                        ╱        ╲
        NLP            ╱          ╲         Computer Vision
       █████ ─────────●────────────────────── ███
                      │
                      │
               Deep Learning
                  ██████
```

- **Bubble size**: Number of publications
- **Proximity**: Domains often associated in your work
- **Color**: Period (more recent = darker)

### Domain Details

By clicking on a domain, you see:

| Information | Example |
|-------------|---------|
| **Domain name** | Machine Learning |
| **Publications** | 15 articles |
| **Active period** | 2018 - present |
| **Subdomains** | Deep Learning, Neural Networks, Optimization |
| **Frequent collaborators** | Dr. Martin, Prof. Dubois |
| **Main journals** | JMLR, NeurIPS, ICML |

## Expertise Levels

The system evaluates your level in each domain:

| Level | Criteria | Meaning |
|-------|----------|---------|
| **Recognized expert** | 10+ publications, high citations, > 5 years | Reference in the field |
| **Specialist** | 5-10 publications, regular activity | Established expertise |
| **Contributor** | 2-5 publications | Significant contributions |
| **Explorer** | 1-2 publications | Emerging or occasional interest |

> These levels are indicative and based solely on bibliographic data. They do not replace peer evaluation.

## Temporal Evolution

### Expertise Timeline

Visualize how your interests have evolved:

```
2010    2012    2014    2016    2018    2020    2022    2024

Statistics      ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Machine Learning          ░░░░████████████████████████████
NLP                             ░░░░░░░░████████████░░░░░░
Deep Learning                         ░░░░░░████████████████
```

### Transition Detection

The system identifies **key moments** in your career:

- **2016**: Transition to Machine Learning
- **2019**: Specialization in Deep Learning
- **2021**: New orientation toward NLP

These transitions may correspond to:
- A change of laboratory
- A new collaboration
- A specific research project

## Validate Your Profile

### Confirm a Domain

If an identified domain is correct, confirm it. This improves the system's accuracy.

### Adjust Importance

You can indicate whether a domain is:
- **Central**: This is your core expertise
- **Secondary**: You contribute to it regularly
- **Occasional**: Occasional contribution
- **Historical**: You no longer work in this area

### Add a Missing Domain

If an important domain doesn't appear:

1. Click on **Add a domain**
2. Search for the domain (by keyword or classification)
3. Associate it with your relevant publications

### Remove an Erroneous Domain

If a domain doesn't correspond to your expertise:

1. Click on **Report as erroneous**
2. The domain will be removed from your public profile

## Profile Uses

### Finding Collaborators

Your expertise profile allows other researchers to find you for collaborations on common themes.

### Project Evaluation

Funding agencies can identify relevant experts to evaluate research projects.

### Recommendations

The system can recommend:
- Relevant articles for your research
- Conferences in your domains
- Calls for projects matching your expertise

## Privacy

You control what is visible:

| Element | Default visibility | Modifiable |
|---------|-------------------|------------|
| Main domains | Public | ✓ |
| Expertise level | Public | ✓ |
| Associated publications | Public | ✓ |
| Temporal evolution | Verified researchers | ✓ |
| Collaborators | Verified researchers | ✓ |

## See Also

- [Verify your publications](./verify-publications.md) - The basis of your profile
- [Manage your career](./manage-career.md) - Institutional context
- [Collaboration network](./collaboration-network.md) - Your co-authors

**Technical documentation:** [Researcher profile](../dev/researcher-profile.md) - For developers
