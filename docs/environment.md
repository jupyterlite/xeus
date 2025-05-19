(environment)=

# Emscripten Environment

## Pre-installed packages

`jupyterlite-xeus` allows you to pre-install packages in the runtime. You can pre-install packages by adding an `environment.yml` file in the JupyterLite build directory, this file will be found automatically by jupyterlite-xeus which will pre-build the environment when running `jupyter lite build`.

Furthermore, this automatically installs any labextension that it founds, for example installing ipyleaflet will make ipyleaflet work without the need to manually install the jupyter-leaflet labextension.

Say you want to install `NumPy`, `Matplotlib` and `ipycanvas`, it can be done by creating the `environment.yml` file with the following content:

```yaml
name: xeus-python-kernel
channels:
  - https://repo.prefix.dev/emscripten-forge-dev
  - https://repo.prefix.dev/conda-forge
dependencies:
  - xeus-python
  - numpy
  - matplotlib
  - ipycanvas
```

Then you only need to build JupyterLite:

```
jupyter lite build
```

You can also pick another name for that environment file (_e.g._ `custom.yml`), by doing so, you will need to specify that name to xeus-python:

```
jupyter lite build --XeusAddon.environment_file=custom.yml
```

```{warning}
It is common to provide `pip` dependencies in a conda environment file. This is currently **partially supported** by jupyterlite-xeus. See "pip packages" section.
```

Then those packages are usable directly:

```{eval-rst}
.. replite::
   :kernel: xeus-python
   :height: 600px
   :prompt: Try it!

   %matplotlib inline

   import matplotlib.pyplot as plt
   import numpy as np

   fig = plt.figure()
   plt.plot(np.sin(np.linspace(0, 20, 100)))
   plt.show();
```

### Multi environment support

Starting with jupyterlite-xeus v4.0.0a0, you can now pass multiple environment files or prefixes.

```
jupyter lite build --XeusAddon.environment_file=environment-python.yml --XeusAddon.environment_file=environment-r.yml
```

This allows e.g. to make multiple xeus-python kernels available, with a different set of packages.

### pip packages

⚠ This feature is experimental. You won't have the same user-experience as when using conda/mamba in a "normal" setup ⚠

`jupyterlite-xeus` provides a way to install packages with pip.

There are a couple of limitations that you should be aware of:

- it can **only** install **pure Python packages** (Python code + data files)
- it **does not install the package dependencies**, you should make sure to install them yourself using conda-forge/emscripten-forge.
- it does not work (yet?) using `-r requirements.txt` in your environment file

For example, if you were to install `ipycanvas` from PyPI, you would need to install the ipycanvas dependencies for it to work (`pillow`, `numpy` and `ipywidgets`):

```yaml
name: xeus-python-kernel
channels:
  - https://repo.prefix.dev/emscripten-forge-dev
  - https://repo.prefix.dev/conda-forge
dependencies:
  - xeus-python
  - numpy
  - pillow
  - ipywidgets
  - pip:
      - ipycanvas
```

You can also install a local Python package, this is very practical if you want to embed
a jupyterlite deployment in your Package documentation, allowing to test the very latest dev version:

```yaml
name: xeus-python-kernel
channels:
  - https://repo.prefix.dev/emscripten-forge-dev
  - https://repo.prefix.dev/conda-forge
dependencies:
  - xeus-python
  - pip:
      - ..
```
