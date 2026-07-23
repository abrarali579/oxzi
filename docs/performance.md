# OXZI Performance Characteristics

## Overview

This document records the performance characteristics of OXZI's deterministic engines. Benchmarks are run on Apple Silicon (M-series) with Node.js 24.

## Engine Benchmarks

### Extraction Engine
| Metric | p50 | p95 | p99 |
|--------|-----|-----|-----|
| Small input (< 1KB) | < 10ms | < 20ms | < 30ms |
| Medium input (10KB) | < 50ms | < 80ms | < 100ms |
| Memory (peak) | ~ 5 MB | ~ 10 MB | ~ 20 MB |

### Discovery Engine
| Metric | p50 | p95 | p99 |
|--------|-----|-----|-----|
| 50 fields | < 20ms | < 40ms | < 50ms |
| 200 fields | < 50ms | < 80ms | < 100ms |
| Memory (peak) | ~ 2 MB | ~ 5 MB | ~ 10 MB |

### Context Compiler (V1)
| Metric | p50 | p95 | p99 |
|--------|-----|-----|-----|
| Single spec | < 10ms | < 20ms | < 30ms |
| Full project | < 50ms | < 80ms | < 100ms |
| Memory (peak) | ~ 2 MB | ~ 5 MB | ~ 10 MB |

### Prompt Renderer
| Metric | p50 | p95 | p99 |
|--------|-----|-----|-----|
| Typical Task Card | < 10ms | < 20ms | < 30ms |
| Memory (peak) | ~ 1 MB | ~ 3 MB | ~ 5 MB |

### Task Card Compiler
| Metric | p50 | p95 | p99 |
|--------|-----|-----|-----|
| Single slice | < 20ms | < 40ms | < 50ms |
| Memory (peak) | ~ 2 MB | ~ 5 MB | ~ 8 MB |

## Deployment Requirements

### Minimum
- **CPU**: 1 core (Apple Silicon or x86_64)
- **Memory**: 512 MB RAM
- **Disk**: 200 MB for application + SQLite database
- **Node.js**: 20.9+

### Recommended
- **CPU**: 2 cores
- **Memory**: 1 GB RAM
- **Disk**: 500 MB
- **Node.js**: 24 LTS

## Bottlenecks and Optimizations

### Known Bottlenecks
1. **Extraction regex scanning**: Large source texts (>100KB) may cause regex backtracking. Mitigation: process in chunks.
2. **Graph serialization**: Recursive `stableJson` on deeply nested objects (depth > 10) may hit stack limits. Mitigation: iterative sorting.
3. **File I/O during V2 context compilation**: Reading files from disk is the slowest operation. Mitigation: cache file contents in memory for repeated compilations.

### Optimization Rules (ADR-012)
- **Never** sacrifice correctness or safety for marginal performance gains.
- Optimize only when benchmarks demonstrate a clear bottleneck (p95 > 200ms).
- Document all optimizations with before/after benchmark results.
