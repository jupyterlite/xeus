"""Test creating Python envs for jupyterlite-xeus-python."""

import os
from tempfile import TemporaryDirectory
from pathlib import Path

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
    assert os.path.isdir(addon.prefix)

    assert os.path.isfile(Path(addon.prefix) / "bin/xpython.js")
    assert os.path.isfile(Path(addon.prefix) / "bin/xpython.wasm")

    assert os.path.isfile(Path(addon.prefix) / "bin/xlua.js")
    assert os.path.isfile(Path(addon.prefix) / "bin/xlua.wasm")

    # Checking pip packages
    assert os.path.isdir(Path(addon.prefix) / "lib/python3.11")
    assert os.path.isdir(Path(addon.prefix) / "lib/python3.11/site-packages")
    assert os.path.isdir(Path(addon.prefix) / "lib/python3.11/site-packages/ipywidgets")
    assert os.path.isdir(Path(addon.prefix) / "lib/python3.11/site-packages/ipycanvas")
    assert os.path.isdir(Path(addon.prefix) / "lib/python3.11/site-packages/py2vega")

    # Checking labextensions
    assert os.path.isdir(
        Path(addon.prefix)
        / "share/jupyter/labextensions/@jupyter-widgets/jupyterlab-manager"
    )
    assert os.path.isdir(Path(addon.prefix) / "share/jupyter/labextensions/ipycanvas")


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
        Path(addon.prefix) / "lib/python3.11/site-packages/test_package"
    )
    assert os.path.isfile(
        Path(addon.prefix) / "lib/python3.11/site-packages/test_package/hey.py"
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
