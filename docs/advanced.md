(advanced)=

## Advanced Configuration

```{warning}
This section is mostly for reference and should not be needed for regular use of the `jupyterlite-xeus` kernel.
```

### Provide a custom `empack_config.yaml`

Packages sometimes ship more data than needed for the package to work (tests, documentation, data files etc). This is fine on a regular installation of the package, but in the emscripten case when running in the browser this means that starting the kernel would download more files.
For this reason, `empack` filters out anything that is not required for the Python code to run. It does it by following a set of filtering rules available in this file: https://github.com/emscripten-forge/empack/blob/main/config/empack_config.yaml.

But this default filtering could break some packages. In that case you would probably want to either contribute to the default empack config, or provide your own set of filtering rules.

The xeus-python kernel supports passing a custom `empack_config.yaml`. This file can be used to override the default filter rules set by the underlying `empack` tool used for packing the environment.

If you would like to provide additional rules for including or excluding files in the packed environment, create a `empack_config.yaml` with the following content as an example:

```yaml
packages:
  xarray:
    include_patterns:
      - pattern: '**/*.py'
      - pattern: '**/static/css/*.css'
      - pattern: '**/static/html/*.html'
```

This example defines a set of custom rules for the `xarray` package to make sure it includes some static files that should be available from the kernel.

You can use this file when building JupyterLite:

```shell
jupyter lite build --XeusAddon.empack_config=empack_config.yaml
```

```{note}
Filtering files helps reduce the size of the assets to download and as a consequence reduce network traffic.
```
