(migration)=

# **jupyterlite-xeus-python** deprecation

**jupyterlite-xeus-python** is being deprecated over [jupyterlite-xeus](https://github.com/jupyterlite/xeus) as of January 2024, you will find in this page migration steps to this new package.

**jupyterlite-xeus** is a generalized approach of installing xeus-based kernels into a JupyterLite deployment. Using this new library, the main entry point is an `environment.yml` file, specifying your kernel environment including kernels and runtime dependencies.

Example of an `environment.yml`:

```yml
name: my-jupyterlite-env
channels:
  - https://repo.mamba.pm/emscripten-forge
  - conda-forge
dependencies:
  - xeus-python
  - xeus-lua
  - numpy
  - matplotlib
  - pip:
      - ipywidgets
```

# Migrating to **jupyterlite-xeus**

## Base setup

Considering you have a simple setup where you install **jupyterlite-xeus-python** and have an **environment.yml** file with your dependencies:

You will now need to install **jupyterlite-xeus** in your build environment instead of **jupyterlite-xeus-python**, and the diff for your **environment.yml** should look like the following (adding **xeus-python** explicitely in the runtime):

```diff
 name: my-jupyterlite-env
 channels:
   - https://repo.mamba.pm/emscripten-forge
   - conda-forge
 dependencies:
+  - xeus-python
   - numpy
   - matplotlib
```

See https://github.com/jupyterlite/xeus-python-demo for a deployment using **jupyterlite-xeus**.

## CLI options

Considering you are using more options from **jupyterlite-xeus-python** like **empack_config**:

- The **xeus_python_version** option is removed, you need to specify the xeus-python version you need in your **environment.yml** file
- The **empack_config** option is still supported: `jupyter lite build --XeusPythonEnv.empack_config=./file.yml` becomes `jupyter lite build --XeusAddon.empack_config=./file.yml`
- The **pin_packages** option is removed.
- The **packages** option is removed, you need to specify your dependencies in **environment.yml** only
- The **environment_file** is still supported: `jupyter lite build --XeusPythonEnv.environment_file=./file.yml` becomes `jupyter lite build --XeusAddon.environment_file=./file.yml`. Defaults to **environment.yml**.
