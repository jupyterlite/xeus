import shutil
import sys
from pathlib import Path
from subprocess import run as subprocess_run
import os

from ._pip import _install_pip_dependencies

try:
    from mamba.api import create as mamba_create

    MAMBA_PYTHON_AVAILABLE = True
except ImportError:
    MAMBA_PYTHON_AVAILABLE = False

MAMBA_COMMAND = shutil.which("mamba")
MICROMAMBA_COMMAND = shutil.which("micromamba")
CONDA_COMMAND = shutil.which("conda")
PLATFORM = "emscripten-wasm32"


def _extract_specs(env_location, env_data):
    specs = []
    pip_dependencies = []

    # iterate dependencies
    for dependency in env_data.get("dependencies", []):
        if isinstance(dependency, str):
            specs.append(dependency)
        elif isinstance(dependency, dict) and "pip" in dependency:
            for pip_dependency in dependency["pip"]:
                # If it's a local Python package, make its path relative to the environment file
                if (env_location / pip_dependency).is_dir():
                    pip_dependencies.append((env_location / pip_dependency).resolve())
                else:
                    pip_dependencies.append(pip_dependency)

    return specs, pip_dependencies


def create_conda_env_from_env_file(root_prefix, env_file_content, env_file_location):
    # get the name of the environment
    env_name = env_file_content.get("name", "xeus-env")

    # get the channels
    channels = env_file_content.get(
        "channels", ["https://repo.mamba.pm/emscripten-forge", "conda-forge"]
    )

    # get the specs
    specs, pip_dependencies = _extract_specs(env_file_location, env_file_content)
    # Force emscripten version
    specs.append("emscripten-abi=3.1.45")

    create_conda_env_from_specs(
        env_name=env_name,
        root_prefix=root_prefix,
        specs=specs,
        channels=channels,
        pip_dependencies=pip_dependencies,
    )


def create_conda_env_from_specs(
    env_name,
    root_prefix,
    specs,
    channels,
    pip_dependencies=None,
):
    _create_conda_env_from_specs_impl(
        env_name=env_name,
        root_prefix=root_prefix,
        specs=specs,
        channels=channels,
    )
    if pip_dependencies:
        _install_pip_dependencies(
            prefix_path=Path(root_prefix) / "envs" / env_name,
            dependencies=pip_dependencies,
        )


def _create_conda_env_from_specs_impl(env_name, root_prefix, specs, channels):
    """Create the emscripten environment with the given specs."""
    prefix_path = Path(root_prefix) / "envs" / env_name

    # Cleanup tmp dir in case it's not empty
    shutil.rmtree(Path(root_prefix) / "envs", ignore_errors=True)
    Path(root_prefix).mkdir(parents=True, exist_ok=True)

    if MAMBA_PYTHON_AVAILABLE:
        mamba_create(
            env_name=env_name,
            base_prefix=root_prefix,
            specs=specs,
            channels=channels,
            target_platform=PLATFORM,
        )
        return

    channels_args = []
    for channel in channels:
        channels_args.extend(["-c", channel])

    if MICROMAMBA_COMMAND:
        subprocess_run(
            [
                MICROMAMBA_COMMAND,
                "create",
                "--yes",
                "--no-pyc",
                "--root-prefix",
                root_prefix,
                "--name",
                env_name,
                f"--platform={PLATFORM}",
                *channels_args,
                *specs,
            ],
            check=True,
        )
        return

    if MAMBA_COMMAND:
        # Mamba needs the directory to exist already
        prefix_path.mkdir(parents=True, exist_ok=True)
        return _create_env_with_config(MAMBA_COMMAND, prefix_path, specs, channels_args)

    if CONDA_COMMAND:
        return _create_env_with_config(CONDA_COMMAND, prefix_path, specs, channels_args)

    raise RuntimeError(
        """Failed to create the virtual environment for xeus-python,
        please make sure at least mamba, micromamba or conda is installed.
        """
    )


def _create_env_with_config(conda, prefix_path, specs, channels_args):
    subprocess_run(
        [conda, "create", "--yes", "--prefix", prefix_path, *channels_args],
        check=True,
    )
    _create_config(prefix_path)
    subprocess_run(
        [
            conda,
            "install",
            "--yes",
            "--prefix",
            prefix_path,
            *channels_args,
            *specs,
        ],
        check=True,
        env=os.environ.copy(),
    )


def _create_config(prefix_path):
    with open(prefix_path / ".condarc", "w") as fobj:
        fobj.write(f"subdir: {PLATFORM}")
    os.environ["CONDARC"] = str(prefix_path / ".condarc")
