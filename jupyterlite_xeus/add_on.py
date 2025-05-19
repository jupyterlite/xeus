"""a JupyterLite addon for creating the env for xeus kernels"""

import json
import os
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory
from urllib.parse import urlparse
import warnings

import yaml

import requests

from jupyterlite_core.addons.federated_extensions import FederatedExtensionAddon
from jupyterlite_core.constants import (
    ALL_FEDERATED_JSON,
    FEDERATED_EXTENSIONS,
    JUPYTERLITE_JSON,
    LAB_EXTENSIONS,
    SHARE_LABEXTENSIONS,
    UTF8,
)
from traitlets import Bool, Callable, List, Unicode

from .create_conda_env import (
    create_conda_env_from_env_file,
    create_conda_env_from_specs,
)
from .constants import EXTENSION_NAME
from .constants import EXTENSION_NAME

from empack.pack import (
    DEFAULT_CONFIG_PATH,
    pack_env,
    pack_directory,
    pack_file,
    add_tarfile_to_env_meta,
)
from empack.file_patterns import PkgFileFilter, pkg_file_filter_from_yaml

EMPACK_ENV_META = "empack_env_meta.json"


def get_kernel_binaries(path):
    """Return paths to the kernel binaries (js, wasm, and optionally data) if they exist, else None."""
    json_file = path / "kernel.json"
    if json_file.exists():
        kernel_spec = json.loads(json_file.read_text(**UTF8))
        argv = kernel_spec.get("argv")
        kernel_binary = argv[0]

        kernel_binary_js = Path(kernel_binary + ".js")
        kernel_binary_wasm = Path(kernel_binary + ".wasm")
        kernel_binary_data = Path(kernel_binary + ".data")

        if kernel_binary_js.exists() and kernel_binary_wasm.exists():
            # Return all three, with None for .data if it doesn't exist
            # as this might not be neccessary for all kernels.
            return (
                kernel_binary_js,
                kernel_binary_wasm,
                kernel_binary_data if kernel_binary_data.exists() else None,
            )
        else:
            warnings.warn(f"kernel binaries not found for {path.name}")

    else:
        warnings.warn(f"kernel.json not found for {path.name}")

    return None


class ListLike(List):
    def from_string(self, s):
        return [s]


class XeusAddon(FederatedExtensionAddon):
    __all__ = ["post_build"]

    empack_config = Unicode(
        None,
        config=True,
        allow_none=True,
        description="The path or URL to the empack config file",
    )

    environment_file = ListLike(
        [],
        config=True,
        description='The path to the environment file. Defaults to looking for "environment.yml" or "environment.yaml"',
    )

    prefix = ListLike(
        [],
        config=True,
        description="The path to the wasm prefix",
    )

    mount_jupyterlite_content = Bool(
        None,
        allow_none=True,
        config=True,
        description="Whether or not to mount the jupyterlite content into the kernel. This would make the jupyterlite content available under the '/files' directory, and the kernels will automatically be started from there.",
    )

    mounts = ListLike(
        [],
        config=True,
        description="A list of mount points, in the form <host_path>:<mount_path> to mount in the wasm prefix",
    )

    package_url_factory = Callable(
        None,
        allow_none=True,
        config=True,
        description="Factory to generate package download URL from package metadata. This is used to load python packages from external host",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.xeus_output_dir = Path(self.manager.output_dir) / "xeus"
        self.cwd = TemporaryDirectory()
        # TODO Make this configurable
        # You can provide another cwd_name if you want
        self.cwd_name = self.cwd.name

    def post_build(self, manager):
        if not self.environment_file:
            if (Path(self.manager.lite_dir) / "environment.yml").exists():
                self.environment_file = ["environment.yml"]

            if (Path(self.manager.lite_dir) / "environment.yaml").exists():
                self.environment_file = ["environment.yaml"]

        # check that either prefix or environment_file is set
        if not self.prefix and not self.environment_file:
            raise ValueError("Either prefix or environment_file must be set")

        # create the prefixes if it does not exist
        self.prefixes = {}
        if not self.prefix:
            for environment_file in self.environment_file:
                env_name, prefix = self.create_prefix(Path(self.manager.lite_dir) / environment_file)
                if env_name in self.prefixes:
                    raise ValueError(f"Environment name '{env_name}' used more than once")
                self.prefixes[env_name] = prefix
        else:
            for prefix in self.prefix:
                path = Path(prefix)
                if not path.is_dir():
                    raise ValueError(f"Prefix '{prefix}' is not a directory")
                env_name = path.name  # Take the final path component and the env_name
                if env_name in self.prefixes:
                    raise ValueError(f"Environment name '{env_name}' used more than once")
                self.prefixes[env_name] = prefix

        all_kernels = []
        for env_name, prefix in self.prefixes.items():
            # copy the kernels from the prefix
            kernels = yield from self.copy_kernels_from_prefix(env_name, prefix)
            all_kernels.extend(kernels)

            # copy the jupyterlab extensions
            yield from self.copy_jupyterlab_extensions_from_prefix(prefix)

        # write the kernels.json file
        kernel_file = Path(self.cwd_name) / "kernels.json"
        kernel_file.write_text(json.dumps(all_kernels), **UTF8)
        yield dict(
            name=f"copy:{kernel_file}",
            actions=[
                (self.copy_one, [kernel_file, self.xeus_output_dir / "kernels.json"])
            ],
        )

    def create_prefix(self, env_file: Path):
        # read the environment file
        root_prefix = Path(self.cwd_name) / "_env"

        with open(env_file, "r") as file:
            yaml_content = yaml.safe_load(file)

        env_name = yaml_content["name"]
        env_prefix = root_prefix / "envs" / env_name

        create_conda_env_from_env_file(root_prefix, yaml_content, env_file.parent)

        return env_name, env_prefix

    def copy_kernels_from_prefix(self, env_name, prefix):
        kernel_spec_path = Path(prefix) / "share" / "jupyter" / "kernels"

        if not kernel_spec_path.exists():
            warnings.warn(
                f"No kernels are installed in the prefix {prefix}. Try adding e.g. xeus-python in your environment.yml file."
            )
            return

        all_kernels = []
        # find all folders in the kernelspec path
        for kernel_dir in kernel_spec_path.iterdir():
            kernel_binaries = get_kernel_binaries(kernel_dir)
            if kernel_binaries:
                kernel_js, kernel_wasm, kernel_data = kernel_binaries
                all_kernels.append(dict(kernel=kernel_dir.name, env_name=env_name))
                # take care of each kernel
                yield from self.copy_kernel(env_name, prefix, kernel_dir, kernel_wasm, kernel_js, kernel_data)

        # pack prefix packages
        yield from self.pack_prefix(env_name, prefix)

        return all_kernels

    def copy_kernel(self, env_name, prefix, kernel_dir, kernel_wasm, kernel_js, kernel_data):
        kernel_spec = json.loads((kernel_dir / "kernel.json").read_text(**UTF8))

        # update kernel_executable path in kernel.json
        kernel_spec["argv"][0] = f"xeus/{env_name}/bin/{kernel_js.name}"

        # find logos in the directory
        image_files = []
        for file_type in ["*.jpg", "*.png", "*.svg"]:
            image_files.extend(kernel_dir.glob(file_type))

        kernel_spec["resources"] = {}
        for image in image_files:
            output_image = (
                self.xeus_output_dir / env_name / kernel_dir.name / image.name
            )
            kernel_spec["resources"][image.stem] = str(
                output_image.relative_to(self.manager.output_dir)
            )

            # copy the logo file
            yield dict(
                name=f"copy:{env_name}:{kernel_dir.name}:{image.name}",
                actions=[
                    (
                        self.copy_one,
                        [
                            kernel_dir / image.name,
                            output_image,
                        ],
                    ),
                ],
            )

        if kernel_spec.get("metadata", {}).get("shared", None) is not None:
            for filename, location in kernel_spec["metadata"]["shared"].items():
                # Copy shared lib file in the output
                yield dict(
                    name=f"copy:{env_name}:{kernel_dir.name}:{filename}",
                    actions=[
                        (
                            self.copy_one,
                            [
                                Path(prefix) / location,
                                self.xeus_output_dir / env_name / kernel_dir.name / filename,
                            ],
                        ),
                    ],
                )

        # write to temp file
        kernel_json = Path(self.cwd_name) / env_name / f"{kernel_dir.name}_kernel.json"
        kernel_json.parent.mkdir(parents=True, exist_ok=True)
        kernel_json.write_text(json.dumps(kernel_spec), **UTF8)

        # copy the kernel binary files to the bin dir
        yield dict(
            name=f"copy:{env_name}:{kernel_dir.name}:binaries",
            actions=[
                (
                    self.copy_one,
                    [kernel_js, self.xeus_output_dir / env_name / "bin" / kernel_js.name],
                ),
                (
                    self.copy_one,
                    [kernel_wasm, self.xeus_output_dir / env_name / "bin" / kernel_wasm.name],
                ),
            ],
        )

        # copy the kernel.data file to the bin dir if present
        if kernel_data:
            yield dict(
                name=f"copy:{env_name}:{kernel_dir.name}:data",
                actions=[
                    (
                        self.copy_one,
                        [kernel_data, self.xeus_output_dir / env_name / "bin" / kernel_data.name],
                    ),
                ],
            )

        # copy the kernel.json file
        yield dict(
            name=f"copy:{env_name}:{kernel_dir.name}:kernel.json",
            actions=[
                (
                    self.copy_one,
                    [
                        kernel_json,
                        self.xeus_output_dir
                        / env_name
                        / kernel_dir.name
                        / "kernel.json",
                    ],
                )
            ],
        )

    def pack_prefix(self, env_name, prefix):
        env_dir = self.xeus_output_dir / env_name
        packages_dir = env_dir / "kernel_packages"

        out_path = Path(self.cwd_name) / "packed_env" / env_name
        out_path.mkdir(parents=True, exist_ok=True)

        pack_kwargs = {}

        empack_config = self.empack_config

        # Download env filter config
        if empack_config:
            empack_config_is_url = urlparse(empack_config).scheme in ("http", "https")
            if empack_config_is_url:
                empack_config_content = requests.get(empack_config).content
                pack_kwargs["file_filters"] = PkgFileFilter(
                    **yaml.safe_load(empack_config_content)
                )
            else:
                pack_kwargs["file_filters"] = pkg_file_filter_from_yaml(empack_config)
        else:
            pack_kwargs["file_filters"] = pkg_file_filter_from_yaml(DEFAULT_CONFIG_PATH)

        if self.package_url_factory is not None:
            pack_kwargs["package_url_factory"] = self.package_url_factory

        pack_env(
            env_prefix=prefix,
            relocate_prefix="/",
            outdir=out_path,
            use_cache=False,
            **pack_kwargs,
        )

        # Pack user defined mount points
        for mount_index, mount in enumerate(self.mounts):
            if mount.count(":") != 1:
                raise ValueError(
                    f"invalid mount {mount}, must be <host_path>:<mount_path>"
                )

            host_path, mount_path = mount.split(":")
            host_path = Path(host_path)
            mount_path = Path(mount_path)

            if not mount_path.is_absolute() or (
                os.name == "nt" and mount_path.anchor != "\\"
            ):
                raise ValueError(f"mount_path {mount_path} needs to be absolute")

            if str(mount_path).startswith("/files"):
                raise ValueError(
                    f"Mount point '/files' is reserved for jupyterlite content. Cannot mount {mount}"
                )

            outname = f"mount_{mount_index}.tar.gz"

            if host_path.is_dir():
                pack_directory(
                    host_dir=host_path,
                    mount_dir=mount_path,
                    outname=outname,
                    outdir=out_path,
                )
            elif host_path.is_file():
                pack_file(
                    host_file=host_path,
                    mount_dir=mount_path,
                    outname=outname,
                    outdir=out_path,
                )
            else:
                raise ValueError(
                    f"host_path {host_path} needs to be a file or a directory"
                )

            add_tarfile_to_env_meta(
                env_meta_filename=out_path / EMPACK_ENV_META, tarfile=out_path / outname
            )

        # Pack JupyterLite content if enabled
        # If we only build a voici output, mount jupyterlite content into the kernel by default
        if self.mount_jupyterlite_content or (
            list(self.manager.apps) == ["voici"]
            and self.mount_jupyterlite_content is None
        ):
            contents_dir = self.manager.output_dir / "files"

            outname = f"mount_{len(self.mounts)}.tar.gz"

            pack_directory(
                host_dir=contents_dir,
                mount_dir="/files",
                outname=outname,
                outdir=out_path,
            )

            add_tarfile_to_env_meta(
                env_meta_filename=out_path / EMPACK_ENV_META, tarfile=out_path / outname
            )

        # copy all the packages to the packages dir
        # (this is shared between multiple kernels in the same environment)
        for pkg_path in out_path.iterdir():
            if pkg_path.name.endswith(".tar.gz"):
                yield dict(
                    name=f"xeus:{env_name}:copy:{pkg_path.name}",
                    actions=[(self.copy_one, [pkg_path, packages_dir / pkg_path.name])],
                )

        # copy the empack_env_meta.json
        # (this is shared between multiple kernels in the same environment)
        yield dict(
            name=f"xeus:{env_name}:copy_env_file:{EMPACK_ENV_META}",
            actions=[
                (
                    self.copy_one,
                    [
                        out_path / EMPACK_ENV_META,
                        env_dir / EMPACK_ENV_META,
                    ],
                )
            ],
        )

    def copy_jupyterlab_extensions_from_prefix(self, prefix):
        federated_extensions = self.env_extensions(Path(prefix) / SHARE_LABEXTENSIONS)

        # Find the federated extensions in the emscripten-env and install them
        for pkg_json in federated_extensions:
            yield from self.safe_copy_jupyterlab_extension(pkg_json)

        jupyterlite_json = self.manager.output_dir / JUPYTERLITE_JSON

        yield dict(
            name=f"patch:xeus:{prefix}",
            doc=f"ensure {JUPYTERLITE_JSON} includes the federated_extensions",
            file_dep=[*federated_extensions, jupyterlite_json],
            actions=[(self.patch_jupyterlite_json, [jupyterlite_json])],
        )

        app_schemas = self.manager.output_dir / "build" / "schemas"
        all_federated_json = app_schemas / ALL_FEDERATED_JSON

        if app_schemas.is_dir():
            yield self.task(
                name=f"patch:xeus:federated_settings:{prefix}",
                doc=f"ensure {ALL_FEDERATED_JSON} includes the settings of federated extensions",
                file_dep=[*federated_extensions],
                actions=[
                    (self.patch_federated_settings, [self.manager, federated_extensions, all_federated_json])
                ],
            )

    def patch_federated_settings(self, manager, lab_extensions, all_federated_json):
        """ensure settings from federated extensions are aggregated in a single file"""
        federated_settings = [
            setting for p in lab_extensions for setting in self.get_federated_settings(p.parent)
        ]
        current_json = json.loads(all_federated_json.read_text())
        current_json = current_json + federated_settings
        all_federated_json.write_text(json.dumps(current_json), **UTF8)

    def safe_copy_jupyterlab_extension(self, pkg_json):
        """Copy a labextension, and overwrite it
        if it's already in the output
        """
        pkg_path = pkg_json.parent
        stem = json.loads(pkg_json.read_text(**UTF8))["name"]
        dest = self.output_extensions / stem
        file_dep = [
            p
            for p in pkg_path.rglob("*")
            if not (p.is_dir() or self.is_ignored_sourcemap(p.name))
        ]

        yield dict(
            name=f"xeus:copy:ext:{stem}",
            file_dep=file_dep,
            actions=[(self.copy_one, [pkg_path, dest])],
        )

    def dedupe_federated_extensions(self, config):
        if FEDERATED_EXTENSIONS not in config:
            return

        named = {}

        # Making sure to dedupe extensions by keeping the most recent ones
        for ext in config[FEDERATED_EXTENSIONS]:
            if os.path.exists(self.output_extensions / ext["name"] / ext["load"]):
                named[ext["name"]] = ext

        config[FEDERATED_EXTENSIONS] = sorted(named.values(), key=lambda x: x["name"])
