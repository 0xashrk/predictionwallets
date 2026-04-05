# Artifacts

These artifacts capture the current reverse-engineering state for Polymarket wallet `@vidarx`.

- `vidarx-full-trades-raw.json`: complete raw on-chain fill history for proxy wallet `0x2d8b401d2f0e6937afebf18e19e11ca568a5260a`. This file is tracked with Git LFS.
- `vidarx-full-trades-raw.metadata.json`: stable metadata for the raw export, including verified date range and row count.
- `vidarx-full-trades-raw.log`: downloader log from the raw on-chain recovery workflow.
- `vidarx-full-trades-raw-node.log`: node-side log from the raw on-chain recovery workflow.
- `vidarx-struct-progress.json`: snapshot of the live Struct export progress at commit time.

The live Struct export log remains ignored because it is still growing while the background export runs.
