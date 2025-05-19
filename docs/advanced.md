(advanced)=

## Advanced Configuration

```{warning}
This section is mostly for reference and should not be needed for regular use of the `jupyterlite-xeus` kernel.
```

### Provide a custom `empack_config.yaml`

Packages sometimes ship more data than needed for the package to work (tests, documentation, data files etc). This is fine on a regular installation of the package, but in the emscripten case when running in the browser this means that starting the kernel would download more files.
For this reason, `empack` allows filtering files that is are not required for the Python code to run. It does it by following a set of filtering rules available in this file: https://github.com/emscripten-forge/empack/blob/main/config/empack_config.yaml.

The xeus-python kernel supports passing a custom `empack_config.yaml`. This file can be used to override the default filter rules set by the underlying `empack` tool used for packing the environment.

If you would like to provide additional rules for excluding files in the packed environment, create a `empack_config.yaml` with the following content as an example:

```yaml
packages:
  xarray:
    exclude_patterns:
      - pattern: '**/static/css/*.css'
      - pattern: '**/static/html/*.html'
```

This example defines a set of custom rules for the `xarray` package to make sure it excludes some static files that are not required for the code to run.

You can use this file when building JupyterLite:

```shell
jupyter lite build --XeusAddon.empack_config=empack_config.yaml
```

```{note}
Filtering files helps reduce the size of the assets to download and as a consequence reduce network traffic.
```

### Build your xeus-kernel locally

#### Create a local environment / prefix

This workflow usually starts with creating a local conda environment / prefix for the `emscripten-wasm32` platform with all the dependencies required to build your kernel (here we install dependencies for `xeus-python`).

```bash
micromamba create -n xeus-python-dev \
    --platform=emscripten-wasm32 \
    -c https://repo.prefix.dev/emscripten-forge-dev \
    -c https://repo.prefix.dev/conda-forge \
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
