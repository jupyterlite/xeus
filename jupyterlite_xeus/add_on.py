"""a JupyterLite addon for creating the env for xeus kernels"""
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlparse
import warnings

import yaml

import requests

from jupyterlite_core.addons.federated_extensions import FederatedExtensionAddon
from jupyterlite_core.constants import (
    FEDERATED_EXTENSIONS,
    JUPYTERLITE_JSON,
    LAB_EXTENSIONS,
    SHARE_LABEXTENSIONS,
    UTF8,
)
from traitlets import List, Unicode

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
    add_tarfile_to_env_meta,
)
from empack.file_patterns import PkgFileFilter, pkg_file_filter_from_yaml


def get_kernel_binaries(path):
    """return path to the kernel binary (js and wasm) if they exist, else None"""
    json_file = path / "kernel.json"
    if json_file.exists():
        kernel_spec = json.loads(json_file.read_text(**UTF8))
        argv = kernel_spec.get("argv")
        kernel_binary = argv[0]

        kernel_binary_js = Path(kernel_binary + ".js")
        kernel_binary_wasm = Path(kernel_binary + ".wasm")

        if kernel_binary_js.exists() and kernel_binary_wasm.exists():
            return kernel_binary_js, kernel_binary_wasm
        else:
            warnings.warn(f"kernel binaries not found for {path.name}")

    else:
        warnings.warn(f"kernel.json not found for {path.name}")

    return None


class MountPoints(List):
    def from_string(self, s):
        return s.split(",")


class XeusAddon(FederatedExtensionAddon):
    __all__ = ["post_build"]

    empack_config = Unicode(
        None,
        config=True,
        allow_none=True,
        description="The path or URL to the empack config file",
    )

    environment_file = Unicode(
        "environment.yml",
        config=True,
        description='The path to the environment file. Defaults to "environment.yml"',
    )

    prefix = Unicode(
        "",
        config=True,
        description="The path to the wasm prefix",
    )

    mounts = MountPoints(
        [],
        config=True,
        description="A comma-separated list of mount points, in the form <host_path>:<mount_path> to mount in the wasm prefix",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.xeus_output_dir = Path(self.manager.output_dir) / "xeus"
        self.cwd = TemporaryDirectory()

    def post_build(self, manager):
        # check that either prefix or environment_file is set
        if not self.prefix and not self.environment_file:
            raise ValueError("Either prefix or environment_file must be set")

        # create the prefix if it does not exist
        if not self.prefix:
            self.create_prefix()

        # copy the kernels from the prefix
        yield from self.copy_kernels_from_prefix()

        # copy the jupyterlab extensions
        yield from self.copy_jupyterlab_extensions_from_prefix(manager)

    def create_prefix(self):
        # read the environment file
        root_prefix = Path(self.cwd.name) / "env"
        env_file = Path(self.environment_file)

        # open the env yaml file
        with open(env_file, "r") as file:
            yaml_content = yaml.safe_load(file)

        env_name = yaml_content.get("name", "xeus-env")
        env_prefix = root_prefix / "envs" / env_name
        self.prefix = str(env_prefix)

        if env_file.exists():
            create_conda_env_from_env_file(root_prefix, yaml_content, env_file.parent)
        # this is atm for debugging
        else:
            create_conda_env_from_specs(
                env_name=env_name,
                root_prefix=root_prefix,
                specs=["xeus-python"],
                channels=["conda-forge", "https://repo.mamba.pm/emscripten-forge"],
            )

    def copy_kernels_from_prefix(self):
        if not os.path.exists(self.prefix) or not os.path.isdir(self.prefix):
            raise ValueError(
                f"Prefix {self.prefix} does not exist or is not a directory"
            )

        kernel_spec_path = Path(self.prefix) / "share" / "jupyter" / "kernels"

        if not kernel_spec_path.exists():
            warnings.warn(
                f"No kernels are installed in the prefix. Try adding e.g. xeus-python in your environment.yml file."
            )
            return

        all_kernels = []
        # find all folders in the kernelspec path
        for kernel_dir in kernel_spec_path.iterdir():
            kernel_binaries = get_kernel_binaries(kernel_dir)
            if kernel_binaries:
                kernel_js, kernel_wasm = kernel_binaries
                all_kernels.append(kernel_dir.name)
                # take care of each kernel
                yield from self.copy_kernel(kernel_dir, kernel_wasm, kernel_js)

        # write the kernels.json file
        kernel_file = Path(self.cwd.name) / "kernels.json"
        kernel_file.write_text(json.dumps(all_kernels), **UTF8)
        yield dict(
            name=f"copy:{kernel_file}",
            actions=[
                (self.copy_one, [kernel_file, self.xeus_output_dir / "kernels.json"])
            ],
        )

    def copy_kernel(self, kernel_dir, kernel_wasm, kernel_js):
        kernel_spec = json.loads((kernel_dir / "kernel.json").read_text(**UTF8))

        # update kernel_executable path in kernel.json
        kernel_spec["argv"][0] = f"xeus/bin/{kernel_js.name}"

        # find logos in the directory
        image_files = []
        for file_type in ["*.jpg", "*.png", "*.svg"]:
            image_files.extend(kernel_dir.glob(file_type))

        kernel_spec["resources"] = {}
        for image in image_files:
            output_image = (
                self.xeus_output_dir / "kernels" / kernel_dir.name / image.name
            )
            kernel_spec["resources"][image.stem] = str(
                output_image.relative_to(self.manager.output_dir)
            )

            # copy the logo file
            yield dict(
                name=f"copy:{kernel_dir.name}:{image.name}",
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

        # write to temp file
        kernel_json = Path(self.cwd.name) / f"{kernel_dir.name}_kernel.json"
        kernel_json.write_text(json.dumps(kernel_spec), **UTF8)

        # copy the kernel binary files to the bin dir
        yield dict(
            name=f"copy:{kernel_dir.name}:binaries",
            actions=[
                (
                    self.copy_one,
                    [kernel_js, self.xeus_output_dir / "bin" / kernel_js.name],
                ),
                (
                    self.copy_one,
                    [kernel_wasm, self.xeus_output_dir / "bin" / kernel_wasm.name],
                ),
            ],
        )

        # copy the kernel.json file
        yield dict(
            name=f"copy:{kernel_dir.name}:kernel.json",
            actions=[
                (
                    self.copy_one,
                    [
                        kernel_json,
                        self.xeus_output_dir
                        / "kernels"
                        / kernel_dir.name
                        / "kernel.json",
                    ],
                )
            ],
        )

        yield from self.pack_prefix(kernel_dir=kernel_dir)

    def pack_prefix(self, kernel_dir):
        kernel_name = kernel_dir.name
        packages_dir = self.xeus_output_dir / "kernel_packages"
        full_kernel_dir = self.xeus_output_dir / "kernels" / kernel_name

        out_path = Path(self.cwd.name) / "packed_env"
        out_path.mkdir(parents=True, exist_ok=True)

        pack_kwargs = {}

        file_filters = pkg_file_filter_from_yaml(DEFAULT_CONFIG_PATH)
        empack_config = self.empack_config

        # Download env filter config
        if empack_config:
            empack_config_is_url = urlparse(empack_config).scheme in ("http", "https")
            if empack_config_is_url:
                empack_config_content = requests.get(empack_config).content
                pack_kwargs["file_filters"] = PkgFileFilter.parse_obj(
                    yaml.safe_load(empack_config_content)
                )
            else:
                pack_kwargs["file_filters"] = pkg_file_filter_from_yaml(empack_config)
        else:
            pack_kwargs["file_filters"] = pkg_file_filter_from_yaml(DEFAULT_CONFIG_PATH)

        pack_env(
            env_prefix=self.prefix,
            relocate_prefix="/",
            outdir=out_path,
            use_cache=True,
            file_filters=file_filters,
        )

        empack_env_meta = "empack_env_meta.json"
        # pack extra dirs
        for mount_index, mount in enumerate(self.mounts):
            if mount.count(":") != 1:
                msg = f"invalid mount {mount}, must be <host_path>:<mount_path>"
                raise ValueError(msg)
            host_path, mount_path = mount.split(":")
            mount_path = Path(mount_path)
            if not mount_path.is_absolute():
                msg = f"mount_path {mount_path} needs to be absolute"
                raise ValueError(msg)
            outname = f"mount_{mount_index}.tar.gz"
            pack_directory(
                host_dir=host_path,
                mount_dir=mount_path,
                outname=outname,
                outdir=out_path,
            )
            add_tarfile_to_env_meta(
                env_meta_filename=out_path / empack_env_meta, tarfile=out_path / outname
            )

        # copy all the packages to the packages dir
        # (this is shared between multiple xeus-python kernels)
        for pkg_path in out_path.iterdir():
            if pkg_path.name.endswith(".tar.gz"):
                yield dict(
                    name=f"xeus:{kernel_name}:copy_package:{pkg_path.name}",
                    actions=[(self.copy_one, [pkg_path, packages_dir / pkg_path.name])],
                )

        # copy the empack_env_meta.json
        # this is individual for xeus-python kernel
        yield dict(
            name=f"xeus:{kernel_name}:copy_env_file:{empack_env_meta}",
            actions=[
                (
                    self.copy_one,
                    [
                        out_path / empack_env_meta,
                        Path(full_kernel_dir) / empack_env_meta,
                    ],
                )
            ],
        )

    def copy_jupyterlab_extensions_from_prefix(self, manager):
        # Find the federated extensions in the emscripten-env and install them
        prefix = Path(self.prefix)
        for pkg_json in self.env_extensions(prefix / SHARE_LABEXTENSIONS):
            yield from self.safe_copy_jupyterlab_extension(pkg_json)

        jupyterlite_json = manager.output_dir / JUPYTERLITE_JSON
        lab_extensions_root = manager.output_dir / LAB_EXTENSIONS
        lab_extensions = self.env_extensions(lab_extensions_root)

        yield dict(
            name="patch:xeus",
            doc=f"ensure {JUPYTERLITE_JSON} includes the federated_extensions",
            file_dep=[*lab_extensions, jupyterlite_json],
            actions=[(self.patch_jupyterlite_json, [jupyterlite_json])],
        )

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
