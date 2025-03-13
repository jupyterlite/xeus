"""Test creating Python envs for jupyterlite-xeus-python."""

import os
from tempfile import TemporaryDirectory
from pathlib import Path
import tarfile

import pytest

from jupyterlite_core.app import LiteStatusApp

from jupyterlite_xeus.add_on import XeusAddon


def test_python_env_from_file_1():
    app = LiteStatusApp(log_level="DEBUG")
    app.initialize()
    manager = app.lite_manager

    addon = XeusAddon(manager)
    addon.environment_file = "environment-1.yml"

    for step in addon.post_build(manager):
        pass

    # Check env
    assert os.path.isdir(addon.prefixes[0])

    assert os.path.isfile(Path(addon.prefixes[0]) / "bin/xpython.js")
    assert os.path.isfile(Path(addon.prefixes[0]) / "bin/xpython.wasm")

    assert os.path.isfile(Path(addon.prefixes[0]) / "bin/xlua.js")
    assert os.path.isfile(Path(addon.prefixes[0]) / "bin/xlua.wasm")

    # Checking pip packages
    assert os.path.isdir(Path(addon.prefixes[0]) / "lib/python3.11")
    assert os.path.isdir(Path(addon.prefixes[0]) / "lib/python3.11/site-packages")
    assert os.path.isdir(Path(addon.prefixes[0]) / "lib/python3.11/site-packages/ipywidgets")
    assert os.path.isdir(Path(addon.prefixes[0]) / "lib/python3.11/site-packages/ipycanvas")
    assert os.path.isdir(Path(addon.prefixes[0]) / "lib/python3.11/site-packages/py2vega")

    # Checking labextensions
    assert os.path.isdir(
        Path(addon.prefixes[0])
        / "share/jupyter/labextensions/@jupyter-widgets/jupyterlab-manager"
    )
    assert os.path.isdir(Path(addon.prefixes[0]) / "share/jupyter/labextensions/ipycanvas")


def test_python_env_from_file_3():
    app = LiteStatusApp(log_level="DEBUG")
    app.initialize()
    manager = app.lite_manager

    addon = XeusAddon(manager)
    addon.environment_file = "test_package/environment-3.yml"

    for step in addon.post_build(manager):
        pass

    # Test
    assert os.path.isdir(
        Path(addon.prefixes[0]) / "lib/python3.11/site-packages/test_package"
    )
    assert os.path.isfile(
        Path(addon.prefixes[0]) / "lib/python3.11/site-packages/test_package/hey.py"
    )


def test_python_env_from_file_2():
    app = LiteStatusApp(log_level="DEBUG")
    app.initialize()
    manager = app.lite_manager

    addon = XeusAddon(manager)
    addon.environment_file = "environment-2.yml"

    with pytest.raises(RuntimeError, match="Cannot install binary PyPI package"):
        for step in addon.post_build(manager):
            pass


def test_mount_point():
    app = LiteStatusApp(log_level="DEBUG")
    app.initialize()
    manager = app.lite_manager

    addon = XeusAddon(manager)
    addon.environment_file = "environment-1.yml"
    addon.mounts = [
        f"{(Path(__file__).parent / "environment-1.yml").resolve()}:/share",
        f"{(Path(__file__).parent / "test_package").resolve()}:/share/test_package",
    ]

    for step in addon.post_build(manager):
        pass

    outpath = Path(addon.cwd_name) / "packed_env" / "xpython"

    with tarfile.open(outpath / "mount_0.tar.gz", "r") as fobj:
        names = fobj.getnames()
    assert "share/environment-1.yml" in names

    with tarfile.open(outpath / "mount_1.tar.gz", "r") as fobj:
        names = fobj.getnames()
    assert "share/test_package/environment-3.yml" in names
