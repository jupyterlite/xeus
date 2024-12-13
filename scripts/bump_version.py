import argparse
import json
from pathlib import Path
from subprocess import run

BUMP_VERSION_CMD = "npx lerna version --no-push --force-publish --no-git-tag-version --yes"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("version")
    args = parser.parse_args()
    version = args.version

    run(f"{BUMP_VERSION_CMD} {version}", shell=True, check=True)

    root = Path(__file__).parent.parent
    version_file = root / "packages" / "xeus-extension" / "package.json"
    package_file = root / "package.json"

    version_json = json.loads(version_file.read_text())
    version = version_json["version"].replace("-alpha.", "-a").replace("-beta.", "-b").replace("-rc.", "-rc")

    package_json = json.loads(package_file.read_text())
    package_json["version"] = version
    package_file.write_text(json.dumps(package_json, indent=4))


if __name__ == "__main__":
    main()
