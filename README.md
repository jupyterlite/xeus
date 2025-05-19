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

## Usage

Once installed, you can create an `environment.yml` file at the root of your jupyterlite build directory containing the following:

```yml
name: xeus-kernels
channels:
  - https://repo.prefix.dev/emscripten-forge-dev
  - https://repo.prefix.dev/conda-forge
dependencies:
  - xeus-python
  - xeus-lua
  - xeus-nelson
  - numpy
  - matplotlib
  - pillow
  - ipywidgets
  - pip:
      - ipycanvas
```

You can then run the usual `jupyter lite build` or `voici my-notebook.ipynb`. The `environment.yml` file will be picked-up automatically by `jupyterlite-xeus`, installing `xeus-python`, `xeus-lua`, `xeus-nelson` and some useful Python packages into the user environment.

```{toctree}
:caption: Usage
:maxdepth: 2

deploy
environment
files
advanced
changelog
```

## Features

#### Dynamic install of packages

You can use the `%pip` magic or the `%mamba` magics to install packages dynamically once the kernel started:

```
%pip install my_package
```

or

```
%mamba install my_package
```

#### Multiple kernels

To create a deployment with multiple kernels, you can simply add them to the `environment.yml` file:

```yaml
name: xeus-lite-wasm
channels:
  - https://repo.prefix.dev/emscripten-forge-dev
  - https://repo.prefix.dev/conda-forge
dependencies:
  - xeus-python
  - xeus-lua
  - xeus-sqlite
  - numpy
```

### Mounting additional files

To copy additional files and directories into the virtual filesystem of the xeus-lite kernels you can use the `--XeusAddon.mount` option.
Each mount is specified as a pair of paths separated by a colon `:`. The first path is the path to the file or directory on the host machine, the second path is the path to the file or directory in the virtual filesystem of the kernel.

```bash
jupyter lite build \
    --XeusAddon.environment_file=environment.yml \
    --XeusAddon.mounts=/some/path/on/host_machine:/some/path/in/virtual/filesystem
```

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
