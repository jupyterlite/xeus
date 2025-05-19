# JupyterLite Xeus

[![Github Actions Status](https://github.com/jupyterlite/xeus/workflows/Build/badge.svg)](https://github.com/jupyterlite/xeus/actions/workflows/build.yml)

`jupyterlite-xeus` is an extension for JupyterLite that enables fully client-side Jupyter environments powered by xeus kernels compiled to WebAssembly (Wasm). It allows users to create statically-served Jupyter deployments with custom pre-built environments — no server required.

The core feature of `jupyterlite-xeus` is its integration with [emscripten-forge](https://github.com/emscripten-forge), a conda package distribution tailored for WebAssembly. This makes it possible to bundle your favorite scientific or data analysis packages directly into the browser-based environment, delivering a reproducible computing experience with zero backend dependencies.

Ideal for demos, educational resources, and offline computing. Use it in combination with [Voici](https://github.com/voila-dashboards/voici)!

Currently supported kernels are:

- [xeus-python](https://github.com/jupyter-xeus/xeus-python)
- [xeus-lua](https://github.com/jupyter-xeus/xeus-lua)
- [xeus-r](https://github.com/jupyter-xeus/xeus-r)
- [xeus-cpp](https://github.com/compiler-research/xeus-cpp)
- [xeus-nelson](https://github.com/jupyter-xeus/xeus-nelson)
- [xeus-javascript](https://github.com/jupyter-xeus/xeus-javascript)

## Requirements

- JupyterLab >= 4.0.0

## Installation

You can install `jupyterlite-xeus` with conda/mamba

```
mamba install -c conda-forge jupyterlite-xeus
```

Or with `pip` (you must install micromamba 2.0.5):

```
pip install jupyterlite-xeus
```

## Documentation

Learn more about `jupyterlite-xeus` and test our live demo on https://jupyterlite-xeus.readthedocs.io

## Contributing

### Development install from a conda / mamba environment

Create the conda environment with `conda`/`mamba`/`micromamba` (replace `micromamba` with `conda` or `mamba` according to your preference):

```bash
micromamba create -f environment-dev.yml -n xeus-lite-dev
```

Activate the environment:

```bash
micromamba activate xeus-lite-dev
```

```bash
python -m pip install -e .   -v --no-build-isolation
```

### Packaging the extension

See [RELEASE](RELEASE.md).
