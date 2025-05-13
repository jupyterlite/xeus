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
    env_name = "xeus-python-kernel-1"
    assert env_name in addon.prefixes
    env_path = Path(addon.prefixes[env_name])
    assert env_path.is_dir()

    assert os.path.isfile(env_path / "bin/xpython.js")
    assert os.path.isfile(env_path / "bin/xpython.wasm")

    assert os.path.isfile(env_path / "bin/xlua.js")
    assert os.path.isfile(env_path / "bin/xlua.wasm")

    # Checking pip packages
    assert os.path.isdir(env_path / "lib/python3.13")
    assert os.path.isdir(env_path / "lib/python3.13/site-packages")
    assert os.path.isdir(env_path / "lib/python3.13/site-packages/ipywidgets")
    assert os.path.isdir(env_path / "lib/python3.13/site-packages/ipycanvas")
    assert os.path.isdir(env_path / "lib/python3.13/site-packages/py2vega")

    # Checking labextensions
    assert os.path.isdir(
        env_path
        / "share/jupyter/labextensions/@jupyter-widgets/jupyterlab-manager"
    )
    assert os.path.isdir(env_path / "share/jupyter/labextensions/ipycanvas")


def test_python_env_from_file_3():
    app = LiteStatusApp(log_level="DEBUG")
    app.initialize()
    manager = app.lite_manager

    addon = XeusAddon(manager)
    addon.environment_file = "test_package/environment-3.yml"

    for step in addon.post_build(manager):
        pass

    # Test
    env_name = "xeus-python-kernel-3"
    assert env_name in addon.prefixes
    env_path = Path(addon.prefixes[env_name])
    assert env_path.is_dir()

    assert os.path.isdir(
        env_path / "lib/python3.13/site-packages/test_package"
    )
    assert os.path.isfile(
        env_path / "lib/python3.13/site-packages/test_package/hey.py"
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

    env_name = "xeus-python-kernel-1"
    assert env_name in addon.prefixes

    outpath = Path(addon.cwd_name) / "packed_env" / env_name

    with tarfile.open(outpath / "mount_0.tar.gz", "r") as fobj:
        names = fobj.getnames()
    assert "share/environment-1.yml" in names

    with tarfile.open(outpath / "mount_1.tar.gz", "r") as fobj:
        names = fobj.getnames()
    assert "share/test_package/environment-3.yml" in names


def test_multiple_envs_with_same_name_raises():
    app = LiteStatusApp(log_level="DEBUG")
    app.initialize()
    manager = app.lite_manager

    addon = XeusAddon(manager)
    addon.environment_file = ["environment-3.yml", "environment-3.yml"]

    with pytest.raises(ValueError):
        for step in addon.post_build(manager):
            pass


def test_multiple_envs():
    app = LiteStatusApp(log_level="DEBUG")
    app.initialize()
    manager = app.lite_manager

    addon = XeusAddon(manager)
    addon.environment_file = ["environment-1.yml", "environment-3.yml"]

    # Store steps by name so can check locations copied to without actually copying.
    steps = {}
    for step in addon.post_build(manager):
        steps[step["name"]] = step

    env_name_py_lua = "xeus-python-kernel-1"
    env_name_cpp = "xeus-cpp-env"
    assert env_name_py_lua in addon.prefixes
    assert env_name_cpp in addon.prefixes

    env_path_py_lua = Path(addon.prefixes[env_name_py_lua])
    env_path_cpp = Path(addon.prefixes[env_name_cpp])
    assert env_path_py_lua.is_dir()
    assert env_path_cpp.is_dir()

    target_path = Path(__file__).parent / "_output" / "xeus"
    keys = list(steps.keys())

    # kernel.json (one per kernel)
    action = steps[f"copy:{env_name_py_lua}:xpython:kernel.json"]["actions"][0][1]
    assert action[1] == target_path / env_name_py_lua / "xpython" / "kernel.json"

    action = steps[f"copy:{env_name_py_lua}:xlua:kernel.json"]["actions"][0][1]
    assert action[1] == target_path / env_name_py_lua / "xlua" / "kernel.json"

    action = steps[f"copy:{env_name_cpp}:xcpp20:kernel.json"]["actions"][0][1]
    assert action[1] == target_path / env_name_cpp / "xcpp20" / "kernel.json"

    # shared libraries
    action = steps[f"copy:{env_name_cpp}:xcpp20:libclangCppInterOp.so"]["actions"][0][1]
    assert action[1] == target_path / env_name_cpp / "xcpp20" / "libclangCppInterOp.so"

    # binaries (one set per kernel)
    actions = steps[f"copy:{env_name_py_lua}:xlua:binaries"]["actions"]
    assert actions[0][1][1] == target_path / env_name_py_lua / "bin" / "xlua.js"
    assert actions[1][1][1] == target_path / env_name_py_lua / "bin" / "xlua.wasm"

    actions = steps[f"copy:{env_name_py_lua}:xpython:binaries"]["actions"]
    assert actions[0][1][1] == target_path / env_name_py_lua / "bin" / "xpython.js"
    assert actions[1][1][1] == target_path / env_name_py_lua / "bin" / "xpython.wasm"

    actions = steps[f"copy:{env_name_cpp}:xcpp20:binaries"]["actions"]
    assert actions[0][1][1] == target_path / env_name_cpp / "bin" / "xcpp.js"
    assert actions[1][1][1] == target_path / env_name_cpp / "bin" / "xcpp.wasm"

    # data (potentially one per kernel but only for xcpp here)
    action = steps[f"copy:{env_name_cpp}:xcpp20:data"]["actions"][0][1]
    assert action[1] == target_path / env_name_cpp / "bin" / "xcpp.data"

    # empack_env_meta.json (one per env)
    action = steps[f"xeus:{env_name_py_lua}:copy_env_file:empack_env_meta.json"]["actions"][0][1]
    assert action[1] == target_path / env_name_py_lua / "empack_env_meta.json"

    action = steps[f"xeus:{env_name_cpp}:copy_env_file:empack_env_meta.json"]["actions"][0][1]
    assert action[1] == target_path / env_name_cpp / "empack_env_meta.json"

    # kernel_packages (one directory per env)
    ## packages that are in py_lua env but not cpp env
    for pkg in ["xeus-lua-", "ipycanvas-"]:
        match = list(filter(lambda k: k.startswith(f"xeus:{env_name_py_lua}:copy:{pkg}"), keys))
        assert len(match) == 1
        filename = match[0].split(':')[-1]  # e.g. xeus-lua-0.7.4-he62be5e_0.tar.gz
        action = steps[match[0]]["actions"][0][1]
        assert action[1] == target_path / env_name_py_lua / "kernel_packages" / filename

        match = list(filter(lambda k: k.startswith(f"xeus:{env_name_cpp}:copy:{pkg}"), keys))
        assert len(match) == 0

    ## packages that are in cpp env but not py_lua env
    for pkg in ["xeus-cpp-", "cppinterop-"]:
        match = list(filter(lambda k: k.startswith(f"xeus:{env_name_py_lua}:copy:{pkg}"), keys))
        assert len(match) == 0

        match = list(filter(lambda k: k.startswith(f"xeus:{env_name_cpp}:copy:{pkg}"), keys))
        assert len(match) == 1
        filename = match[0].split(':')[-1]  # e.g. xeus-cpp-0.6.0-h18da88b_1.tar.gz
        action = steps[match[0]]["actions"][0][1]
        assert action[1] == target_path / env_name_cpp / "kernel_packages" / filename
