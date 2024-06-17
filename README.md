# JupyterLite Xeus

[![Github Actions Status](https://github.com/jupyterlite/xeus/workflows/Build/badge.svg)](https://github.com/jupyterlite/xeus/actions/workflows/build.yml)

JupyterLite loader for Xeus kernels

## Requirements

- JupyterLab >= 4.0.0

## Install

To install the extension, execute:

```bash
pip install jupyterlite_xeus
```

## Usage

### From environment.yml

#### xeus-python kernel

To load a `xeus-python` kernel with a custom environment, create an `environment.yml` file with `xeus-python` and the desired dependencies. Here is an example with `numpy` as a additional dependency:

```yaml
name: xeus-lite-wasm
channels:
  - https://repo.mamba.pm/emscripten-forge
  - conda-forge
dependencies:
  - xeus-python
  - numpy
```

To build JupyterLite, run the following command where `environment.yml` is the path to the file you just created

```bash
jupyter lite build --XeusAddon.environment_file=some_path/to/environment.yml
```

#### xeus-lua / xeus-sqlite / xeus-\<mylang\>

To load a `xeus-lua` or `xeus-sqlite` kernel you can
do the same as above, just with

```yaml
dependencies:
  - xeus-lua
```

or

```yaml
dependencies:
  - xeus-sqlite
```

Note that `xeus-sqlite` and `xeus-lua` do not support additional dependencies yet.
To build JupyterLite, run again:

```bash
jupyter lite build --XeusAddon.environment_file=environment.yml
```

#### Multiple kernels

To create a deployment with multiple kernels, you can simply add them to the `environment.yml` file:

```yaml
name: xeus-lite-wasm
channels:
  - https://repo.mamba.pm/emscripten-forge
  - conda-forge
dependencies:
  - xeus-python
  - xeus-lua
  - xeus-sqlite
  - numpy
```

### From local environment / prefix

When developing a xeus-kernel, it is very useful to be able to test it in JupyterLite without having to publish the kernel to emscripten-forge. Therefore, you can also use a local environment / prefix to build JupyterLite with a custom kernel.

#### Create a local environment / prefix

This workflow usually starts with creating a local conda environment / prefix for the `emscripten-wasm32` platform with all the dependencies required to build your kernel (here we install dependencies for `xeus-python`).

```bash
micromamba create -n xeus-python-dev \
    --platform=emscripten-wasm32 \
    -c https://repo.mamba.pm/emscripten-forge \
    -c conda-forge \
    --yes \
    "python>=3.11" pybind11 nlohmann_json pybind11_json numpy pytest \
    bzip2 sqlite zlib libffi xtl pyjs \
    xeus xeus-lite
```

#### Build the kernel

This depends on your kernel, but it will look something like this:

```bash
# path to your emscripten emsdk
source $EMSDK_DIR/emsdk_env.sh

WASM_ENV_NAME=xeus-python-dev
WASM_ENV_PREFIX=$MAMBA_ROOT_PREFIX/envs/$WASM_ENV_NAME

# let cmake know where the env is
export PREFIX=$WASM_ENV_PREFIX
export CMAKE_PREFIX_PATH=$PREFIX
export CMAKE_SYSTEM_PREFIX_PATH=$PREFIX

cd /path/to/your/kernel/src
mkdir build_wasm
cd build_wasm
emcmake cmake \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_FIND_ROOT_PATH_MODE_PACKAGE=ON \
    -DCMAKE_INSTALL_PREFIX=$PREFIX \
    ..
emmake make -j8 install
```

#### Build the JupyterLite site

You will need to create a new environment with the dependencies to build the JupyterLite site.

```bash
# create new environment
micromamba create -n xeus-lite-host \
    jupyterlite-core

# activate the environment
micromamba activate xeus-lite-host

# install jupyterlite_xeus via pip
python -m pip install jupyterlite-xeus
```

When running `jupyter lite build`, we pass the `prefix` option and point it to the local environment / prefix we just created:

```bash
jupyter lite build --XeusAddon.prefix=$WASM_ENV_PREFIX
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
