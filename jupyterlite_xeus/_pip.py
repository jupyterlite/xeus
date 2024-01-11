import sys
import shutil
import os
from subprocess import run as subprocess_run
from tempfile import TemporaryDirectory
from pathlib import Path
import csv
from .constants import PYTHON_VERSION


def _install_pip_dependencies(prefix_path, dependencies, log=None):
    # Why is this so damn complicated?
    # Isn't it easier to download the .whl ourselves? pip is hell

    if log is not None:
        log.warning(
            """
            Installing pip dependencies. This is very much experimental so use
            this feature at your own risks.
            Note that you can only install pure-python packages.
            pip is being run with the --no-deps option to not pull undesired
            system-specific dependencies, so please install your package dependencies
            from emscripten-forge or conda-forge.
            """
        )

    # Installing with pip in another prefix that has a different Python version IS NOT POSSIBLE
    # So we need to do this whole mess "manually"
    pkg_dir = TemporaryDirectory()

    subprocess_run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            *dependencies,
            # Install in a tmp directory while we process it
            "--target",
            pkg_dir.name,
            # Specify the right Python version
            "--python-version",
            PYTHON_VERSION,
            # No dependency installed
            "--no-deps",
            "--no-input",
            "--verbose",
        ],
        check=True,
    )

    # We need to read the RECORD and try to be smart about what goes
    # under site-packages and what goes where
    packages_dist_info = Path(pkg_dir.name).glob("*.dist-info")

    for package_dist_info in packages_dist_info:
        with open(package_dist_info / "RECORD") as record:
            record_content = record.read()
            record_csv = csv.reader(record_content.splitlines())
            all_files = [_file[0] for _file in record_csv]

            # List of tuples: (path: str, inside_site_packages: bool)
            files = [(_file, not _file.startswith("../../")) for _file in all_files]

            # Why?
            fixed_record_data = record_content.replace("../../", "../../../")

        # OVERWRITE RECORD file
        with open(package_dist_info / "RECORD", "w") as record:
            record.write(fixed_record_data)

        non_supported_files = [".so", ".a", ".dylib", ".lib", ".exe.dll"]

        # COPY files under `prefix_path`
        for _file, inside_site_packages in files:
            path = Path(_file)

            # FAIL if .so / .a / .dylib / .lib / .exe / .dll
            if path.suffix in non_supported_files:
                raise RuntimeError(
                    "Cannot install binary PyPI package, only pure Python packages are supported"
                )

            file_path = _file[6:] if not inside_site_packages else _file
            install_path = (
                prefix_path
                if not inside_site_packages
                else prefix_path / "lib" / f"python{PYTHON_VERSION}" / "site-packages"
            )

            src_path = Path(pkg_dir.name) / file_path
            dest_path = install_path / file_path

            os.makedirs(dest_path.parent, exist_ok=True)

            shutil.copy(src_path, dest_path)
