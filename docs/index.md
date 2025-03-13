# xeus kernels in JupyterLite 🚀🪐

![Xeus logo](./xeus.svg)

jupyterlite-xeus is a facility tool bringing xeus kernels into JupyterLite and Voici.

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

Or with `pip`:

```
pip install jupyterlite-xeus
```

## Usage

Once installed, you can create an `environment.yml` file at the root of your jupyterlite build directory containing the following:

```yml
name: xeus-kernels
channels:
  - https://repo.mamba.pm/emscripten-forge
  - conda-forge
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
