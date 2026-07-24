# DreamBees MLX Metal Automated Benchmark Suite

A standardized 10-test automated benchmark suite for testing local Apple Silicon Metal GPU inference performance, VRAM consumption, iteration speeds ($it/s$), and image rendering quality.

## Suite Configuration

- **Manifest File**: [`suite_config.json`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/tests/benchmarks/suite_config.json)
- **Test Runner**: [`run_benchmarks.py`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/tests/benchmarks/run_benchmarks.py)
- **Output Directory**: [`outputs/`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/tests/benchmarks/outputs)
- **Report JSON**: [`benchmark_results.json`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/tests/benchmarks/benchmark_results.json)

## 🏃 Running Benchmarks

To execute all 10 test cases headlessly:

```bash
python3 tests/benchmarks/run_benchmarks.py
```

## 📊 10 Standardized Benchmark Test Cases

1. **Cyberpunk Neon City** (`test_01_cyberpunk_neon`): Sci-Fi / Cyberpunk volumetric neon lighting.
2. **Studio Portrait** (`test_02_photorealistic_portrait`): 8k RAW photorealistic studio portrait.
3. **Fantasy Floating Islands** (`test_03_fantasy_landscape`): Unreal Engine 5 style floating islands landscape.
4. **Macro Nature Dewdrop** (`test_04_macro_nature`): Extreme macro photography of a dewdrop on an orchid.
5. **Brutalist Cathedral** (`test_05_architecture_brutalist`): Monolithic brutalist cathedral at dusk.
6. **Anime Watercolor Countryside** (`test_06_anime_watercolor`): Studio Ghibli style watercolor illustration.
7. **Renaissance Oil Bee** (`test_07_oil_painting`): Impasto classical oil painting of a mechanical clockwork bee.
8. **Minimalist Solar Eclipse** (`test_08_minimalist_vector`): Flat minimalist vector artwork poster.
9. **80s Synthwave Grid** (`test_09_dark_synthwave`): Retro 80s synthwave highway extending into a neon grid sun.
10. **Glassmorphism Isometric Cube** (`test_10_glassmorphism_3d`): Frosted glass translucent 3D geometry render.
