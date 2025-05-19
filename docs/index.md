# xeus kernels in JupyterLite 🚀🪐

![Xeus logo](./xeus.svg)

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

Try it here!

::::{tab-set}
:::{tab-item} Python

```{eval-rst}
.. replite::
   :kernel: xpython
   :height: 600px

   print("Hello from xeus-python!")

   from ipyleaflet import Map, Marker

   center = (52.204793, 360.121558)

   m = Map(center=center, zoom=15)

   marker = Marker(location=center, draggable=False)
   m.add(marker);

   m
```

:::
:::{tab-item} Lua

```{eval-rst}
.. replite::
   :kernel: xlua
   :height: 600px
   :prompt: Try Lua!

   print("Hello from xeus-lua!")
```

:::
:::{tab-item} R

```{eval-rst}
.. replite::
   :kernel: xr
   :height: 600px
   :prompt: Try R!

   print("Hello from R!")

   A <- matrix(c(4, 1, 1, 3), nrow = 2, byrow = TRUE)

   # Eigen decomposition
   eigen_result <- eigen(A)

   print(eigen_result$values)

   print(eigen_result$vectors)
```

:::
:::{tab-item} C++

```{eval-rst}
.. replite::
   :kernel: xcpp20
   :height: 600px
   :prompt: Try C++!

   #include <stdio.h>
   #include <math.h>

   void funky_sin_wave(int length) {
      for (int y = 0; y < 20; y++) {
         for (int x = 0; x < length; x++) {
               double wave = sin(x * 0.1);
               if ((int)(10 + 10 * wave) == y) {
                  printf("*");
               } else {
                  printf(" ");
               }
         }
         printf("\n");
      }
   }

   funky_sin_wave(80);
```

:::
::::

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

```yaml
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

## Features

### Dynamic install of packages

Starting with jupyterlite-xeus v4.0.0a11, you can use the `%pip` magic or the `%mamba` magics to install packages dynamically once the kernel started:

```
%pip install my_package
```

or

```
%mamba install my_package
```

### stdin

Starting with jupyterlite-xeus v4.0.0a8, latest jupyterlite 0.6.0, and latest xeus kernels (tested in Python, C++, lua), blocking stdin is now supported:

```python
name = input("what's your name")
```

### Multiple kernels

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

Learn more in [](./environment.md)

### Mounting additional files

To copy additional files and directories into the virtual filesystem of the xeus-lite kernels you can use the `--XeusAddon.mount` option.
Each mount is specified as a pair of paths separated by a colon `:`. The first path is the path to the file or directory on the host machine, the second path is the path to the file or directory in the virtual filesystem of the kernel.

```bash
jupyter lite build \
    --XeusAddon.environment_file=environment.yml \
    --XeusAddon.mounts=/some/path/on/host_machine:/some/path/in/virtual/filesystem
```

Learn more in [](./files.md)

## Learn more

```{toctree}
:maxdepth: 2

deploy
environment
files
advanced
changelog
```
