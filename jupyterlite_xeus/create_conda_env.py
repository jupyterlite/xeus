import shutil
import sys
from pathlib import Path
from subprocess import run as subprocess_run
import os

from ._pip import _install_pip_dependencies

MICROMAMBA_COMMAND = shutil.which("micromamba")
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
        "channels", ["https://repo.prefix.dev/emscripten-forge-dev", "https://repo.prefix.dev/conda-forge"]
    )

    # get the specs
    specs, pip_dependencies = _extract_specs(env_file_location, env_file_content)

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

    Path(root_prefix).mkdir(parents=True, exist_ok=True)

    channels_args = []
    for channel in channels:
        channels_args.extend(["-c", channel])

    if not MICROMAMBA_COMMAND:
        raise RuntimeError("""
            micromamba is needed for creating the emscripten environment.
            Please install it using conda `conda install micromamba -c conda-forge` or
            from https://mamba.readthedocs.io/en/latest/installation/micromamba-installation.html
        """)

    subprocess_run(
        [
            MICROMAMBA_COMMAND,
            "create",
            "--yes",
            "--no-pyc",
            "--prefix",
            prefix_path,
            "--relocate-prefix",
            "",
            "--root-prefix",
            root_prefix,
            f"--platform={PLATFORM}",
            *channels_args,
            *specs,
        ],
        check=True,
    )
