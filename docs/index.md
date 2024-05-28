# xeus kernels in JupyterLite 🚀🪐

![Xeus logo](./xeus.svg)

jupyterlite-xeus is a facility tool bringing xeus kernels into JupyterLite and Voici.

Currently supported kernels are:

- [xeus-python](https://github.com/jupyter-xeus/xeus-python)
- [xeus-lua](https://github.com/jupyter-xeus/xeus-lua)
- [xeus-nelson](https://github.com/jupyter-xeus/xeus-nelson)
- [xeus-javascript](https://github.com/jupyter-xeus/xeus-javascript)

We are also working on bringing [xeus-cpp](https://github.com/compiler-research/xeus-cpp) and [xeus-r](https://github.com/jupyter-xeus/xeus-r) into jupyterlite, stay tuned!

Try it here!

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

```{eval-rst}
.. replite::
   :kernel: xlua
   :height: 600px

   print("Hello from xeus-lua!")
```

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
