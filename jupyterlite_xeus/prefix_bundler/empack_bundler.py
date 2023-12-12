from pathlib import Path
from empack.pack import DEFAULT_CONFIG_PATH, pack_env
from empack.file_patterns import pkg_file_filter_from_yaml

from .prefix_bundler_base import PrefixBundlerBase



class EmpackBundler(PrefixBundlerBase):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


    def build(self):

        prefix_path = Path(self.prefix)

        # temp dir for the packed env
        out_path = Path(self.cwd.name) / "packed_env"
        out_path.mkdir(parents=True, exist_ok=True)

        # Pack the environment (TODO make this configurable)
        file_filters = pkg_file_filter_from_yaml(DEFAULT_CONFIG_PATH)

        pack_env(
            env_prefix=prefix_path,
            relocate_prefix="/",
            outdir=out_path,
            use_cache=True,
            file_filters=file_filters
        )

        # copy all the packages to the packages dir 
        # (this is shared between multiple xeus-python kernels)
        for pkg_path in out_path.iterdir():
            if pkg_path.name.endswith(".tar.gz"):
                yield dict(
                    name=f"xeus:{self.kernel_name}:copy_package:{pkg_path.name}",
                    actions=[(self.copy_one, [pkg_path, self.packages_dir / pkg_path.name ])],
                )

        # copy the empack_env_meta.json
        # this is individual for xeus-python kernel
        empack_env_meta = "empack_env_meta.json"
        yield dict(
            name=f"xeus:{self.kernel_name}:copy_env_file:{empack_env_meta}",
            actions=[(self.copy_one, [out_path / empack_env_meta, Path(self.kernel_dir)/ empack_env_meta ])],
        )