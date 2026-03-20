# Ghost Discovery Tree

Interactive Opportunity Solution Tree (OST) for Ghost product managers. Based on Teresa Torres' Continuous Discovery Habits framework.

Pre-loaded with real Ghost product signals — forum votes, GitHub issues, competitor moves — mapped to outcomes, opportunities, solutions, and experiments.

## Features

- Interactive tree visualization with expand/collapse
- Pre-seeded with real Ghost product data
- Score opportunities on Customer Value, Business Impact, and Effort
- Track assumption status (untested → testing → validated → invalidated)
- Signal inbox with unprocessed product signals
- AI Discovery Brief powered by Claude

## Deploy

```bash
vercel --prod
```

Set `ANTHROPIC_API_KEY` in Vercel dashboard for AI brief generation.
