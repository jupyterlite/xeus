(files)=

# Accessing and managing files

Using jupyterlite-xeus, you can mount files and directories into the kernel runtime. You have multiple approaches for this:

## JupyterLite content

### Using the default JupyterLite setup

⚠ This feature is very experimental and may fail in weird ways. ⚠

xeus kernels will automatically have access to files served by JupyterLite.

This feature depends on either the service worker ([which may not be available in some browser setups](https://jupyterlite.readthedocs.io/en/stable/howto/configure/advanced/service-worker.html#limitations)) or SharedArrayBuffers if the proper flags are set.

See [accessing files from a kernel](https://jupyterlite.readthedocs.io/en/stable/howto/content/python.html) for more information.

### Making it more robust

To make things more robust, you can embed the JupyterLite content into the xeus kernel.

You can enable this feature using the `--XeusAddon.mount_jupyterlite_content=True` CLI option:

```bash
jupyter lite build --XeusAddon.mount_jupyterlite_content=True
```

This approach has behavior differences with the service worker approach:

- This makes file access more robust, not depending on the service worker.
- Kernels will automatically start from the `/files` directory, where the jupyterlite content is mounted.
- If your kernel changes the content (creates files, updates files content _etc_), changes **will not** reflect in the JupyterLite served content. This means that if you open the updated files from the filebrowser UI by double clicking on them, you will see the initial content of the files. It also means that restarting the kernel will reinitialize the `/files` directory content, and it will not be shared between kernels.

```{note}
This option is set to True by default when generating a [Voici dashboard](https://github.com/voila-dashboards/voici)
```

## Extra mount points

You can mount extra directories into the kernel using the mounts option:

```bash
jupyter lite build  \
        --XeusAddon.mounts="mypackage:/lib/python3.11/site-packages/mypackage"
        --XeusAddon.mounts="hispackage:/lib/python3.11/site-packages/hispackage"
```
