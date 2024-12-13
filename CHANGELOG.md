# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

## 2.1.2

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v2.1.1...ea918a0cb1c5a59fc64e72f399effb0bdf66acd1))

### Enhancements made

- Export `IEmpackEnvMetaFile` from index [#127](https://github.com/jupyterlite/xeus/pull/127) ([@trungleduc](https://github.com/trungleduc))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-10-23&to=2024-10-24&type=c))

[@trungleduc](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Atrungleduc+updated%3A2024-10-23..2024-10-24&type=Issues)

<!-- <END NEW CHANGELOG ENTRY> -->

## 2.1.1

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v2.1.0...473ab8be5735c267ea01dd2e17da77e50f6fda3a))

### Maintenance and upkeep improvements

- Bump empack [#126](https://github.com/jupyterlite/xeus/pull/126) ([@trungleduc](https://github.com/trungleduc))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-10-15&to=2024-10-23&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-10-15..2024-10-23&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Atrungleduc+updated%3A2024-10-15..2024-10-23&type=Issues)

## 2.1.0

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v2.0.0...d0369ff65cea926be186d0df70902bcb050df513))

### Enhancements made

- Passing the link of empack_env_meta.json file [#120](https://github.com/jupyterlite/xeus/pull/120) ([@AnastasiaSliusar](https://github.com/AnastasiaSliusar))

### Maintenance and upkeep improvements

- Fix job installation of micromamba [#121](https://github.com/jupyterlite/xeus/pull/121) ([@AnastasiaSliusar](https://github.com/AnastasiaSliusar))

### Documentation improvements

- Add changelog for `2.0.0` [#119](https://github.com/jupyterlite/xeus/pull/119) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-09-10&to=2024-10-15&type=c))

[@AnastasiaSliusar](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AAnastasiaSliusar+updated%3A2024-09-10..2024-10-15&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Ajtpio+updated%3A2024-09-10..2024-10-15&type=Issues)

## 2.0.0

### Highlights

Access to files served by JupyterLite can now be done via the use of `SharedArrayBuffer`.

Previously accessing files solely depended on the use of a Service Worker ([which may not be available in some browser setups](https://jupyterlite.readthedocs.io/en/stable/howto/configure/advanced/service-worker.html#limitations)). Now `SharedArrayBuffer` if the proper COOP/COEP server headers are set.

See [the documentation for accessing files from a kernel](https://jupyterlite.readthedocs.io/en/stable/howto/content/python.html) for more information.

### What's Changed

- FileSystem calls over Atomics.wait instead of service worker by @martinRenou in https://github.com/jupyterlite/xeus/pull/87
- Add xeus-javascript to the documentation deployment by @martinRenou in https://github.com/jupyterlite/xeus/pull/94
- Bump empack by @martinRenou in https://github.com/jupyterlite/xeus/pull/96
- Support environment.yaml (previously documented but not supported) or… by @martinRenou in https://github.com/jupyterlite/xeus/pull/92
- Bump empack (Backport #96) by @martinRenou in https://github.com/jupyterlite/xeus/pull/97
- Run the UI tests with the COOP/COEP headers by @jtpio in https://github.com/jupyterlite/xeus/pull/103
- Update to JupyterLite 0.4.0 final packages by @jtpio in https://github.com/jupyterlite/xeus/pull/105
- Hot fix: Pin Python version (Backport #111) by @martinRenou in https://github.com/jupyterlite/xeus/pull/112
- Pin emscripten abi by @martinRenou in https://github.com/jupyterlite/xeus/pull/114
- Align `jupyterlab` version range with the version used in JupyterLite by @jtpio in https://github.com/jupyterlite/xeus/pull/109
- Use `coincident` if `crossOriginIsolated`, `comlink` otherwise by @jtpio in https://github.com/jupyterlite/xeus/pull/108
- Update empack and docs by @martinRenou in https://github.com/jupyterlite/xeus/pull/116
- Update docs for file access by @martinRenou in https://github.com/jupyterlite/xeus/pull/117

## 0.2.0b0

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.2.0a3...71621433a78571eac4ba23b54da9df924079255f))

### Documentation improvements

- Update docs for file access [#117](https://github.com/jupyterlite/xeus/pull/117) ([@martinRenou](https://github.com/martinRenou))
- Update empack and docs [#116](https://github.com/jupyterlite/xeus/pull/116) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-09-10&to=2024-09-10&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-09-10..2024-09-10&type=Issues)

## 0.2.0a3

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.2.0a2...44b9acbbbfaa3f230ad28cbe09b26af0fababf5c))

### Maintenance and upkeep improvements

- Align `jupyterlab` version range with the version used in JupyterLite [#109](https://github.com/jupyterlite/xeus/pull/109) ([@jtpio](https://github.com/jtpio))
- Use `coincident` if `crossOriginIsolated`, `comlink` otherwise [#108](https://github.com/jupyterlite/xeus/pull/108) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-08-26&to=2024-09-10&type=c))

[@jtpio](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Ajtpio+updated%3A2024-08-26..2024-09-10&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-08-26..2024-09-10&type=Issues)

## 0.2.0a2

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.2.0a1...6730e2407b08e0634504dcce7c5e3aa7942147a5))

### Bugs fixed

- Pin emscripten abi [#114](https://github.com/jupyterlite/xeus/pull/114) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-08-23&to=2024-08-26&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-08-23..2024-08-26&type=Issues)

## 0.2.0a1

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.2.0a0...170d2de926e990d1919855ded3d30aec4b08ba96))

### Enhancements made

- Support environment.yaml (previously documented but not supported) or… [#92](https://github.com/jupyterlite/xeus/pull/92) ([@martinRenou](https://github.com/martinRenou))

### Bugs fixed

- Hot fix: Pin Python version (Backport #111) [#112](https://github.com/jupyterlite/xeus/pull/112) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Update to JupyterLite 0.4.0 final packages [#105](https://github.com/jupyterlite/xeus/pull/105) ([@jtpio](https://github.com/jtpio))
- Run the UI tests with the COOP/COEP headers [#103](https://github.com/jupyterlite/xeus/pull/103) ([@jtpio](https://github.com/jtpio))
- Bump empack (Backport #96) [#97](https://github.com/jupyterlite/xeus/pull/97) ([@martinRenou](https://github.com/martinRenou))
- Bump empack [#96](https://github.com/jupyterlite/xeus/pull/96) ([@martinRenou](https://github.com/martinRenou))

### Documentation improvements

- Add xeus-javascript to the documentation deployment [#94](https://github.com/jupyterlite/xeus/pull/94) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-06-05&to=2024-08-23&type=c))

[@jtpio](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Ajtpio+updated%3A2024-06-05..2024-08-23&type=Issues) | [@lumberbot-app](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Alumberbot-app+updated%3A2024-06-05..2024-08-23&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-06-05..2024-08-23&type=Issues) | [@nthiery](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Anthiery+updated%3A2024-06-05..2024-08-23&type=Issues)

## 0.2.0a0

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.1.8...a80ff1b3d7378bd20c11435aac7ba466d4d43cde))

### Enhancements made

- FileSystem calls over Atomics.wait instead of service worker [#87](https://github.com/jupyterlite/xeus/pull/87) ([@martinRenou](https://github.com/martinRenou))

### Bugs fixed

- give micromamba priority [#88](https://github.com/jupyterlite/xeus/pull/88) ([@DerThorsten](https://github.com/DerThorsten))
- Prevent failing when strict channel priority is set [#74](https://github.com/jupyterlite/xeus/pull/74) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Allow for JupyterLite 0.4.0 [#90](https://github.com/jupyterlite/xeus/pull/90) ([@jtpio](https://github.com/jtpio))
- Fix order of kernels in UI tests [#85](https://github.com/jupyterlite/xeus/pull/85) ([@jtpio](https://github.com/jtpio))
- Update release workflows [#82](https://github.com/jupyterlite/xeus/pull/82) ([@jtpio](https://github.com/jtpio))
- Update `@jupyterlite` packages [#81](https://github.com/jupyterlite/xeus/pull/81) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- Update ipywidgets in docs [#91](https://github.com/jupyterlite/xeus/pull/91) ([@martinRenou](https://github.com/martinRenou))
- Fix ReadTheDocs build [#89](https://github.com/jupyterlite/xeus/pull/89) ([@martinRenou](https://github.com/martinRenou))
- Add custom CSS to override the navbar max width [#78](https://github.com/jupyterlite/xeus/pull/78) ([@jtpio](https://github.com/jtpio))
- Add `xeus-python` to the example `environment.yml` in the docs [#77](https://github.com/jupyterlite/xeus/pull/77) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-02-20&to=2024-06-05&type=c))

[@DerThorsten](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3ADerThorsten+updated%3A2024-02-20..2024-06-05&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Ajtpio+updated%3A2024-02-20..2024-06-05&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-02-20..2024-06-05&type=Issues)

## 0.1.8

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.1.7...ff888aa84280ad7ab8905221c9537352c6447c29))

### Enhancements made

- JupyterLite-core 0.1.x support [#73](https://github.com/jupyterlite/xeus/pull/73) ([@martinRenou](https://github.com/martinRenou))
- Support JupyterLite 0.3.0 [#71](https://github.com/jupyterlite/xeus/pull/71) ([@jtpio](https://github.com/jtpio))
- Add check for windows absolute path [#51](https://github.com/jupyterlite/xeus/pull/51) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Clean up unused dependencies [#72](https://github.com/jupyterlite/xeus/pull/72) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-02-05&to=2024-02-20&type=c))

[@jtpio](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Ajtpio+updated%3A2024-02-05..2024-02-20&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-02-05..2024-02-20&type=Issues)

## 0.1.7

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.1.6...4ea46b47362f2cbd3a1c2edb811bdbc045ed9d71))

### Bugs fixed

- Fix mount points [#59](https://github.com/jupyterlite/xeus/pull/59) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-01-30&to=2024-02-05&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-01-30..2024-02-05&type=Issues)

## 0.1.6

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.1.5...b0dce2628f693232497804986abee16e611d9657))

### Bugs fixed

- Prevent using package caching [#57](https://github.com/jupyterlite/xeus/pull/57) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-01-29&to=2024-01-30&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-01-29..2024-01-30&type=Issues)

## 0.1.5

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.1.4...f442f25bcac03cb6a500d41ecd233768097e6201))

### Bugs fixed

- Fix voici check [#55](https://github.com/jupyterlite/xeus/pull/55) ([@martinRenou](https://github.com/martinRenou))

### Documentation improvements

- Docs: add note about behavior in Voici [#54](https://github.com/jupyterlite/xeus/pull/54) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-01-29&to=2024-01-29&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-01-29..2024-01-29&type=Issues)

## 0.1.4

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.1.3...970155afafc5be159b550c17ff16bec0160d103d))

### Enhancements made

- Allow mounting jupyterlite content [#49](https://github.com/jupyterlite/xeus/pull/49) ([@martinRenou](https://github.com/martinRenou))

### Bugs fixed

- fix loading empack_config [#53](https://github.com/jupyterlite/xeus/pull/53) ([@katotetsuro](https://github.com/katotetsuro))
- Prevent from failing if there is no environment file [#48](https://github.com/jupyterlite/xeus/pull/48) ([@martinRenou](https://github.com/martinRenou))

### Documentation improvements

- Add documentation [#50](https://github.com/jupyterlite/xeus/pull/50) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-01-23&to=2024-01-29&type=c))

[@jtpio](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Ajtpio+updated%3A2024-01-23..2024-01-29&type=Issues) | [@katotetsuro](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Akatotetsuro+updated%3A2024-01-23..2024-01-29&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-01-23..2024-01-29&type=Issues)

## 0.1.3

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.1.2...f38a7ef494d43abba7c20a26a348bcb6521f8b43))

### Enhancements made

- Add support for mounting single file [#44](https://github.com/jupyterlite/xeus/pull/44) ([@DerThorsten](https://github.com/DerThorsten))

### Bugs fixed

- Fix: Path to environment file should be relative to the lite dir [#47](https://github.com/jupyterlite/xeus/pull/47) ([@martinRenou](https://github.com/martinRenou))

### Documentation improvements

- Update README [#46](https://github.com/jupyterlite/xeus/pull/46) ([@IsabelParedes](https://github.com/IsabelParedes))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-01-15&to=2024-01-23&type=c))

[@DerThorsten](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3ADerThorsten+updated%3A2024-01-15..2024-01-23&type=Issues) | [@IsabelParedes](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AIsabelParedes+updated%3A2024-01-15..2024-01-23&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-01-15..2024-01-23&type=Issues)

## 0.1.2

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.1.1...b2a787aacb2189a7db56c074693683aca4147ef9))

### Bugs fixed

- Fix path to logo assets [#42](https://github.com/jupyterlite/xeus/pull/42) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-01-12&to=2024-01-15&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-01-12..2024-01-15&type=Issues)

## 0.1.1

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.1.0...98c72110e7749106534e99e1107867b39b0a6bd4))

### Bugs fixed

- Improve image loading logic [#40](https://github.com/jupyterlite/xeus/pull/40) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-01-12&to=2024-01-12&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-01-12..2024-01-12&type=Issues)

## 0.1.0

No merged PRs

## 0.1.0a4

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.1.0a3...36d47f86fe101481f0c777e24aef5b983fc329d8))

### Enhancements made

- Bring back empack filtering [#38](https://github.com/jupyterlite/xeus/pull/38) ([@martinRenou](https://github.com/martinRenou))
- Show warning if there is no kernel in the prefix [#37](https://github.com/jupyterlite/xeus/pull/37) ([@martinRenou](https://github.com/martinRenou))
- SVG Icon [#36](https://github.com/jupyterlite/xeus/pull/36) ([@martinRenou](https://github.com/martinRenou))

### Bugs fixed

- Fix missing dependencies [#35](https://github.com/jupyterlite/xeus/pull/35) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Bring back jupyterlite-xeus-python unit tests [#39](https://github.com/jupyterlite/xeus/pull/39) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-01-11&to=2024-01-12&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-01-11..2024-01-12&type=Issues)

## 0.1.0a3

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.1.0a2...4d5b63f49145ac5f3ee94ae30a3a0144f4092a52))

### Bugs fixed

- Attempt to fix the base_url from the worker [#34](https://github.com/jupyterlite/xeus/pull/34) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-01-11&to=2024-01-11&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-01-11..2024-01-11&type=Issues)

## 0.1.0a2

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.1.0a1...f67bf1ef74d0a58faf126df98658025abfd6538f))

### Enhancements made

- Rework xeus output paths and URLs [#23](https://github.com/jupyterlite/xeus/pull/23) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Missing jupyterlite in galata bot [#31](https://github.com/jupyterlite/xeus/pull/31) ([@martinRenou](https://github.com/martinRenou))
- Update test to match the new xeus-python [#30](https://github.com/jupyterlite/xeus/pull/30) ([@martinRenou](https://github.com/martinRenou))
- Ruff linting [#29](https://github.com/jupyterlite/xeus/pull/29) ([@martinRenou](https://github.com/martinRenou))
- Add a simple UI-test [#26](https://github.com/jupyterlite/xeus/pull/26) ([@martinRenou](https://github.com/martinRenou))

### Documentation improvements

- Remove broken link [#28](https://github.com/jupyterlite/xeus/pull/28) ([@martinRenou](https://github.com/martinRenou))
- update README.md with JupyterLite site instructions [#25](https://github.com/jupyterlite/xeus/pull/25) ([@Vipul-Cariappa](https://github.com/Vipul-Cariappa))
- fixed minor typos in README.md [#22](https://github.com/jupyterlite/xeus/pull/22) ([@Vipul-Cariappa](https://github.com/Vipul-Cariappa))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-01-09&to=2024-01-11&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-01-09..2024-01-11&type=Issues) | [@Vipul-Cariappa](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AVipul-Cariappa+updated%3A2024-01-09..2024-01-11&type=Issues)

## 0.1.0a1

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v0.1.0a0...8b14ad2dc6496bc42394a42fd18d417f9a16c80c))

### Enhancements made

- Update to a comma-separated list of mount points [#19](https://github.com/jupyterlite/xeus/pull/19) ([@martinRenou](https://github.com/martinRenou))

### Bugs fixed

- Re-enable service worker drive [#21](https://github.com/jupyterlite/xeus/pull/21) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Fix ui-tests [#20](https://github.com/jupyterlite/xeus/pull/20) ([@martinRenou](https://github.com/martinRenou))
- Fix lint failure on CI [#18](https://github.com/jupyterlite/xeus/pull/18) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-01-05&to=2024-01-09&type=c))

[@DerThorsten](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3ADerThorsten+updated%3A2024-01-05..2024-01-09&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Ajtpio+updated%3A2024-01-05..2024-01-09&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-01-05..2024-01-09&type=Issues)
