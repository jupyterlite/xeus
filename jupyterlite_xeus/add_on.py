"""a JupyterLite addon for creating the env for xeus kernels"""
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import warnings

from jupyterlite_core.addons.federated_extensions import FederatedExtensionAddon
from jupyterlite_core.constants import (
    FEDERATED_EXTENSIONS,
    JUPYTERLITE_JSON,
    LAB_EXTENSIONS,
    SHARE_LABEXTENSIONS,
    UTF8,
)
from traitlets import List, Unicode

from .prefix_bundler import get_prefix_bundler
from .create_conda_env import create_conda_env_from_yaml,create_conda_env_from_specs

EXTENSION_NAME = "xeus"
STATIC_DIR = Path("@jupyterlite") / EXTENSION_NAME / "static"


def get_kernel_binaries(path):
    """ return path to the kernel binary (js and wasm) if they exist, else None"""
    json_file = path / "kernel.json"
    if json_file.exists():

        kernel_spec = json.loads(json_file.read_text(**UTF8))
        argv = kernel_spec.get("argv")
        kernel_binary = argv[0]
        
        kernel_binary_js = Path(kernel_binary+".js")
        kernel_binary_wasm = Path(kernel_binary+".wasm")
         
        if kernel_binary_js.exists() and kernel_binary_wasm.exists():
            return kernel_binary_js, kernel_binary_wasm
        else:
            warnings.warn(f"kernel binaries not found for {path.name}")
            
    else:
        warnings.warn(f"kernel.json not found for {path.name}")
        
    return None



class XeusAddon(FederatedExtensionAddon):
    __all__ = ["post_build"]


    environment_file = Unicode(
        "environment.yml",
        config=True,
        description='The path to the environment file. Defaults to "environment.yml"',
    )

    prefix = Unicode(
        "",
        config=True,
        description='The path to the wasm prefix',
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.static_dir = self.output_extensions / STATIC_DIR
        self.cwd = TemporaryDirectory()
    
    def post_build(self, manager):

        # check that either prefix or environment_file is set
        if not self.prefix and not self.environment_file:
            raise ValueError("Either prefix or environment_file must be set")

        # create the prefix if it does not exist
        if not self.prefix:
            yield from self.create_prefix()
    
        # copy the kernels from the prefix
        yield from self.copy_kernels_from_prefix()
    
        # copy the jupyterlab extensions
        #yield from self.copy_jupyterlab_extensions_from_prefix()
    
    def create_prefix(self):
        print("environment_file", self.environment_file)

        
        # read the environment file
        root_prefix = Path(self.cwd.name) / "env"
        env_name = "xeus-env"
        env_prefix = root_prefix / "envs" / env_name
        self.prefix = str(env_prefix)

        env_file = Path(self.environment_file)
        if env_file.exists():
            create_conda_env_from_yaml(
                env_name=env_name,
                root_prefix=root_prefix,
                env_file=env_file
            )
        # this is atm for debugging
        else:
            create_conda_env_from_specs(
                env_name=env_name,
                root_prefix=root_prefix,
                specs=["xeus-python"],
                channels=["conda-forge", "https://repo.mamba.pm/emscripten-forge"],
            )



    
    def copy_jupyterlab_extensions_from_prefix(self):
        # Find the federated extensions in the emscripten-env and install them
        prefix = Path(self.prefix)
        for pkg_json in self.env_extensions(prefix / SHARE_LABEXTENSIONS):
            print("pkg_json", pkg_json)
            yield from self.safe_copy_extension(pkg_json)
    

    def safe_copy_extension(self, pkg_json):
        """Copy a labextension, and overwrite it
        if it's already in the output
        """
        pkg_path = pkg_json.parent
        stem = json.loads(pkg_json.read_text(**UTF8))["name"]
        dest = self.output_extensions / stem
        file_dep = [
            p for p in pkg_path.rglob("*") if not (p.is_dir() or self.is_ignored_sourcemap(p.name))
        ]

        yield dict(
            name=f"xeus:copy:ext:{stem}",
            file_dep=file_dep,
            actions=[(self.copy_one, [pkg_path, dest])],
        )

        

    def copy_kernels_from_prefix(self):
        
        if not os.path.exists(self.prefix) or not os.path.isdir(self.prefix):
            raise ValueError(f"Prefix {self.prefix} does not exist or is not a directory")

        kernel_spec_path = Path(self.prefix) / "share" / "jupyter" / "kernels"


        all_kernels = []
        # find all folders in the kernelspec path
        for kernel_dir in kernel_spec_path.iterdir():
            kernel_binaries = get_kernel_binaries(kernel_dir)
            if kernel_binaries:      
                kernel_js, kernel_wasm  = kernel_binaries
                all_kernels.append(kernel_dir.name)
                # take care of each kernel
                yield from self.copy_kernel(kernel_dir, kernel_wasm, kernel_js)

        # write the kernels.json file
        kernel_file = Path(self.cwd.name) / "kernels.json"
        kernel_file.write_text(json.dumps(all_kernels), **UTF8)
        yield dict(
            name=f"copy:kernels.json",
            actions=[
                (
                    self.copy_one, [kernel_file, self.static_dir / "share"/"jupyter" / "kernels.json" ]
                )
            ]
        )




    def copy_kernel(self, kernel_dir, kernel_wasm, kernel_js):
        print("copying kernel", kernel_dir.name)

        kernel_spec = json.loads((kernel_dir / "kernel.json").read_text(**UTF8))

        # update kernel_executable path in kernel.json
        kernel_spec["argv"][0] = f"bin/{kernel_js.name}"

        # write to temp file
        kernel_json = Path(self.cwd.name) / f"{kernel_dir.name}_kernel.json"
        kernel_json.write_text(json.dumps(kernel_spec), **UTF8)


        # copy the kernel binary files to the bin dir
        yield dict(name=f"copy:{kernel_dir.name}:binaries",  actions=[
            (self.copy_one, [kernel_js, self.static_dir / "bin"/ kernel_js.name ]),
            (self.copy_one, [kernel_wasm, self.static_dir / "bin"/ kernel_wasm.name ]),
        ])

        # copy the kernel.json file
        yield dict(
            name=f"copy:{kernel_dir.name}:kernel.json",
            actions=[(self.copy_one, [kernel_json, self.static_dir /"share"/"jupyter"/ "kernels"/ kernel_dir.name / "kernel.json" ])],
        )
        # copy the logo files
        yield dict(
            name=f"copy:{kernel_dir.name}:logos",
            actions=[
                (self.copy_one, [kernel_dir / "logo-32x32.png", self.static_dir /"share"/ "jupyter"/ "kernels"/  kernel_dir.name / "logo-32x32.png" ]),
                (self.copy_one, [kernel_dir / "logo-64x64.png", self.static_dir /"share"/ "jupyter"/ "kernels"/  kernel_dir.name / "logo-64x64.png" ])
            ])




        # this part is a bit more complicated:
        # Some kernels expect certain files to be at a certain places on the hard drive.
        # Ie python (even pure python without additional packages) expects to find certain *.py
        # files in a dir like $PREFIX/lib/python3.11/... .
        # Since the kernels run in the browser we need a way to take the needed files from the
        # $PREFIX of the emscripten-32 wasm env, bundle them into smth like  tar.gz file(s) and
        # copy them to the static/kernels/<kernel_name> dir.
        #
        # this concept of taking a prefix and turning it into something the kernels 
        # can consume is called a "bundler" in this context. 
        # At the moment, only xpython needs such a bundler, but this is likely to change in the future.
        # therefore we do the following. Each kernel can specify which bundler it needs in its kernel.json file.
        # If no bundler is specified, we assume that the default bundler is used (which does nothing atm).

        language = kernel_spec["language"].lower()
        prefix_bundler_name = kernel_spec["metadata"].get("prefix_bundler", None)
        prefix_bundler_kwargs = kernel_spec["metadata"].get("prefix_bundler_kwargs", dict())



        if language == "python":
            # we can also drop the "if" above and just always use empack.
            # but this will make the build a bit slower.
            # Besides that, there should not be any harm in using empack for all kernels.
            # If a kernel does not support empack, it will still just work and will
            # **not ** do any extra work at runtime / kernel startup time.
            prefix_bundler_name = "empack" 

        

        prefix_bundler = get_prefix_bundler(
            addon=self,
            prefix_bundler_name=prefix_bundler_name,
            kernel_name=kernel_dir.name,
            **prefix_bundler_kwargs
        )
        
        for item in prefix_bundler.build():
            if item:
                yield item