"""a JupyterLite addon for creating the env for xeus-python"""
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory

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
from .create_conda_env import create_conda_env_from_yaml

EXTENSION_NAME = "xeus-python-kernel"
STATIC_DIR = Path("@jupyterlite") / EXTENSION_NAME / "static"


def get_kernel_binaries(path):
    """ return path to the kernel binary (js and wasm) if they exist, else None"""
    print("considering", path)
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
            print("kernel binary files not found")   
            print("kernel_binary_js.exists()", kernel_binary_js.exists())
            print("kernel_binary_wasm.exists()", kernel_binary_wasm.exists())
            
    else:
        print("no kernel.json found")
        
    return None


class PackagesList(List):
    def from_string(self, s):
        return s.split(",")




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

        # from prefix has higher priority than from environment file
        if self.prefix:
            # from existing prefix
            yield from self.copy_kernels_from_prefix()
        elif self.environment_file:
            # from environment file
            yield from self.create_and_copy_from_env()
        else:
            raise ValueError("Either prefix or environment_file must be set")
    
    def create_and_copy_from_env(self):
        print("environment_file", self.environment_file)
        # read the environment file
        root_prefix = Path(self.cwd.name) / "env"
        env_name = "xeus-python"
        env_prefix = root_prefix / "envs" / env_name
        self.prefix = str(env_prefix)
        create_conda_env_from_yaml(
            env_name=env_name,
            root_prefix=root_prefix,
            env_file=self.environment_file,
        )
        yield from self.copy_kernels_from_prefix()
       
        

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
        # Ie python (even pure python without additional packages) expects to find certail *.py
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


        # THIS WILL BE REMOVED ONCE THE NEXT VERSION OF XPYTHON IS RELEASED
        # (and the kernel.json file contains the prefix_bundler info)
        if language == "python":
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