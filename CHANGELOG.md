# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

## 4.0.0

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@3.1.1...5950a5bbe2c73b6d111a2eacd55b4512c78cdb97))

### Highlights of 4.0.0

This major release brings many new features and improvements:

- Blocking `input` support, no need to `await input` anymore! ⭐
- Dynamic installation of `pip` and `conda` packages using the new magics 📦
- Multi-environment support, you can now provide multiple environment files to `jupyterlite-xeus`, exposing kernels with different set of available packages. 💪🏽
- Defaults to using Python 3.13 and the new `emscripten-forge` channel from https://prefix.dev 🐍

![Screenshot From 2025-06-03 09-07-45](https://github.com/user-attachments/assets/a8966e80-5f70-4823-8267-6f2c50b20404)

### Enhancements made

- Bump jupyterlite 0.6.0 [#245](https://github.com/jupyterlite/xeus/pull/245) ([@martinRenou](https://github.com/martinRenou))
- Improve pip install support [#244](https://github.com/jupyterlite/xeus/pull/244) ([@martinRenou](https://github.com/martinRenou))
- Update mambajs: fix %pip install command [#230](https://github.com/jupyterlite/xeus/pull/230) ([@martinRenou](https://github.com/martinRenou))
- Introduce @jupyterlite/xeus-core pure typescript library [#228](https://github.com/jupyterlite/xeus/pull/228) ([@martinRenou](https://github.com/martinRenou))
- Support the same kernel in multiple environments [#225](https://github.com/jupyterlite/xeus/pull/225) ([@ianthomas23](https://github.com/ianthomas23))
- Separate deployment directory for each xeus environment [#223](https://github.com/jupyterlite/xeus/pull/223) ([@ianthomas23](https://github.com/ianthomas23))
- Making the kernel worker more extensible [#222](https://github.com/jupyterlite/xeus/pull/222) ([@martinRenou](https://github.com/martinRenou))
- Use `/api/stdin/kernel` for stdin requests via service worker [#220](https://github.com/jupyterlite/xeus/pull/220) ([@ianthomas23](https://github.com/ianthomas23))
- Add fallback for kernel constructor when argv is not accepted [#218](https://github.com/jupyterlite/xeus/pull/218) ([@anutosh491](https://github.com/anutosh491))
- Support stdin via SharedArrayBuffer [#217](https://github.com/jupyterlite/xeus/pull/217) ([@ianthomas23](https://github.com/ianthomas23))
- Expose sendMessage to subclasses [#214](https://github.com/jupyterlite/xeus/pull/214) ([@martinRenou](https://github.com/martinRenou))
- Support stdin via service worker [#212](https://github.com/jupyterlite/xeus/pull/212) ([@ianthomas23](https://github.com/ianthomas23))
- Enable Kernels to be built on top of kernlSpec arguments [#210](https://github.com/jupyterlite/xeus/pull/210) ([@anutosh491](https://github.com/anutosh491))
- Install packages dynamically [#208](https://github.com/jupyterlite/xeus/pull/208) ([@AnastasiaSliusar](https://github.com/AnastasiaSliusar))
- Bring back mount points as list [#203](https://github.com/jupyterlite/xeus/pull/203) ([@martinRenou](https://github.com/martinRenou))
- Micromamba dependency and proper prefix relocation [#200](https://github.com/jupyterlite/xeus/pull/200) ([@martinRenou](https://github.com/martinRenou))
- Report kernel status on startup [#197](https://github.com/jupyterlite/xeus/pull/197) ([@martinRenou](https://github.com/martinRenou))
- Installing xeus-cpp from prefix-dev [#191](https://github.com/jupyterlite/xeus/pull/191) ([@martinRenou](https://github.com/martinRenou))
- Bump mambajs: prefix relocation + untarjs speedup [#180](https://github.com/jupyterlite/xeus/pull/180) ([@martinRenou](https://github.com/martinRenou))
- Multi envs support [#164](https://github.com/jupyterlite/xeus/pull/164) ([@martinRenou](https://github.com/martinRenou))
- Adding xeus-cpp in the docs [#162](https://github.com/jupyterlite/xeus/pull/162) ([@anutosh491](https://github.com/anutosh491))

### Bugs fixed

- Do not use refreshSpecs [#236](https://github.com/jupyterlite/xeus/pull/236) ([@martinRenou](https://github.com/martinRenou))
- Fix missing labextensions settings [#234](https://github.com/jupyterlite/xeus/pull/234) ([@martinRenou](https://github.com/martinRenou))
- Do not export comlink worker as part of the library [#226](https://github.com/jupyterlite/xeus/pull/226) ([@martinRenou](https://github.com/martinRenou))
- Fix cwd for Notebooks [#187](https://github.com/jupyterlite/xeus/pull/187) ([@martinRenou](https://github.com/martinRenou))
- Non-hardcoded python version [#177](https://github.com/jupyterlite/xeus/pull/177) ([@martinRenou](https://github.com/martinRenou))
- Fix cwd when building the environment [#169](https://github.com/jupyterlite/xeus/pull/169) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Update to use new mambajs-core [#240](https://github.com/jupyterlite/xeus/pull/240) ([@martinRenou](https://github.com/martinRenou))
- Add UI tests for stdin and dynamic package install [#235](https://github.com/jupyterlite/xeus/pull/235) ([@martinRenou](https://github.com/martinRenou))
- Install micromamba 2.0.5 in update-snapshots gha [#231](https://github.com/jupyterlite/xeus/pull/231) ([@ianthomas23](https://github.com/ianthomas23))
- Add UI test for multiple python kernels in different environments [#229](https://github.com/jupyterlite/xeus/pull/229) ([@ianthomas23](https://github.com/ianthomas23))
- Update JupyterLite and JupyterLab - stdin support + use kernel logs UI [#221](https://github.com/jupyterlite/xeus/pull/221) ([@martinRenou](https://github.com/martinRenou))
- Update mambajs 0.10.0 [#213](https://github.com/jupyterlite/xeus/pull/213) ([@martinRenou](https://github.com/martinRenou))
- Update jupyterlite + mambajs [#211](https://github.com/jupyterlite/xeus/pull/211) ([@martinRenou](https://github.com/martinRenou))
- Remove unused code [#209](https://github.com/jupyterlite/xeus/pull/209) ([@martinRenou](https://github.com/martinRenou))
- Update mambajs [#205](https://github.com/jupyterlite/xeus/pull/205) ([@martinRenou](https://github.com/martinRenou))
- Update jupyterlite 0.6.0-alpha.3: remove split liteextension/labextension [#204](https://github.com/jupyterlite/xeus/pull/204) ([@martinRenou](https://github.com/martinRenou))
- Update to a newer `jupyterlite-core` in the docs environment [#194](https://github.com/jupyterlite/xeus/pull/194) ([@jtpio](https://github.com/jtpio))
- Snapshot the notebook section of the launcher only [#192](https://github.com/jupyterlite/xeus/pull/192) ([@jtpio](https://github.com/jtpio))
- Use Python version from environment [#174](https://github.com/jupyterlite/xeus/pull/174) ([@davidbrochart](https://github.com/davidbrochart))
- Rebuild with latest jupyterlite [#171](https://github.com/jupyterlite/xeus/pull/171) ([@martinRenou](https://github.com/martinRenou))

### Documentation improvements

- Docs: Push down the doc tree on the main page [#233](https://github.com/jupyterlite/xeus/pull/233) ([@martinRenou](https://github.com/martinRenou))
- Update docs for coming 4.0.0 release [#232](https://github.com/jupyterlite/xeus/pull/232) ([@martinRenou](https://github.com/martinRenou))
- Add docs for multi-env support [#202](https://github.com/jupyterlite/xeus/pull/202) ([@martinRenou](https://github.com/martinRenou))
- Debug docs [#198](https://github.com/jupyterlite/xeus/pull/198) ([@martinRenou](https://github.com/martinRenou))
- Python 3.13 on docs [#179](https://github.com/jupyterlite/xeus/pull/179) ([@martinRenou](https://github.com/martinRenou))
- Adding xeus-cpp in the docs [#162](https://github.com/jupyterlite/xeus/pull/162) ([@anutosh491](https://github.com/anutosh491))

### Other merged PRs

- Revert "Use Python version from environment" [#176](https://github.com/jupyterlite/xeus/pull/176) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-01-27&to=2025-06-03&type=c))

[@AnastasiaSliusar](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AAnastasiaSliusar+updated%3A2025-01-27..2025-06-03&type=Issues) | [@anutosh491](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Aanutosh491+updated%3A2025-01-27..2025-06-03&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Adavidbrochart+updated%3A2025-01-27..2025-06-03&type=Issues) | [@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Aianthomas23+updated%3A2025-01-27..2025-06-03&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Ajtpio+updated%3A2025-01-27..2025-06-03&type=Issues) | [@lumberbot-app](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Alumberbot-app+updated%3A2025-01-27..2025-06-03&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-01-27..2025-06-03&type=Issues)

<!-- <END NEW CHANGELOG ENTRY> -->

## 4.0.0rc0

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-core@4.0.0-b1...09601084da2fe78607e711a2298a3b9196a7af5e))

### Enhancements made

- Improve pip install support [#244](https://github.com/jupyterlite/xeus/pull/244) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-05-27&to=2025-06-02&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-05-27..2025-06-02&type=Issues)

## 4.0.0b1

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-core@4.0.0-b0...20fb938365b8a3b403f8f1f85a49842868a9499c))

### Bugs fixed

- Do not use refreshSpecs [#236](https://github.com/jupyterlite/xeus/pull/236) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Update to use new mambajs-core [#240](https://github.com/jupyterlite/xeus/pull/240) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-05-19&to=2025-05-27&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-05-19..2025-05-27&type=Issues)

## 4.0.0b0

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-core@4.0.0-a11...01df8b4d1e8cd609a32a26613e41376b61f07e8b))

### Bugs fixed

- Fix missing labextensions settings [#234](https://github.com/jupyterlite/xeus/pull/234) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Add UI tests for stdin and dynamic package install [#235](https://github.com/jupyterlite/xeus/pull/235) ([@martinRenou](https://github.com/martinRenou))
- Install micromamba 2.0.5 in update-snapshots gha [#231](https://github.com/jupyterlite/xeus/pull/231) ([@ianthomas23](https://github.com/ianthomas23))
- Add UI test for multiple python kernels in different environments [#229](https://github.com/jupyterlite/xeus/pull/229) ([@ianthomas23](https://github.com/ianthomas23))

### Documentation improvements

- Docs: Push down the doc tree on the main page [#233](https://github.com/jupyterlite/xeus/pull/233) ([@martinRenou](https://github.com/martinRenou))
- Update docs for coming 4.0.0 release [#232](https://github.com/jupyterlite/xeus/pull/232) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-05-16&to=2025-05-19&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Aianthomas23+updated%3A2025-05-16..2025-05-19&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-05-16..2025-05-19&type=Issues)

## 4.0.0a11

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@4.0.0-a10...b4f1230b0dd29d93bb31144a782a6218d7529c56))

### Enhancements made

- Update mambajs: fix %pip install command [#230](https://github.com/jupyterlite/xeus/pull/230) ([@martinRenou](https://github.com/martinRenou))
- Introduce @jupyterlite/xeus-core pure typescript library [#228](https://github.com/jupyterlite/xeus/pull/228) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-05-15&to=2025-05-16&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-05-15..2025-05-16&type=Issues)

## 4.0.0a10

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@4.0.0-a9...9e3510d2ad9dd143e8a349daf9e4a5abf1748123))

### Bugs fixed

- Do not export comlink worker as part of the library [#226](https://github.com/jupyterlite/xeus/pull/226) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-05-15&to=2025-05-15&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-05-15..2025-05-15&type=Issues)

## 4.0.0a9

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@4.0.0-a8...aedc9b33bbd75720d5fe17e3592e57b598801554))

### Enhancements made

- Support the same kernel in multiple environments [#225](https://github.com/jupyterlite/xeus/pull/225) ([@ianthomas23](https://github.com/ianthomas23))
- Separate deployment directory for each xeus environment [#223](https://github.com/jupyterlite/xeus/pull/223) ([@ianthomas23](https://github.com/ianthomas23))
- Making the kernel worker more extensible [#222](https://github.com/jupyterlite/xeus/pull/222) ([@martinRenou](https://github.com/martinRenou))
- Install packages dynamically [#208](https://github.com/jupyterlite/xeus/pull/208) ([@AnastasiaSliusar](https://github.com/AnastasiaSliusar))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-05-13&to=2025-05-15&type=c))

[@AnastasiaSliusar](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AAnastasiaSliusar+updated%3A2025-05-13..2025-05-15&type=Issues) | [@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Aianthomas23+updated%3A2025-05-13..2025-05-15&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-05-13..2025-05-15&type=Issues)

## 4.0.0a8

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@4.0.0-a7...b852adb6e121134cc227e2130f3187b051516f3f))

### Maintenance and upkeep improvements

- Update JupyterLite and JupyterLab - stdin support + use kernel logs UI [#221](https://github.com/jupyterlite/xeus/pull/221) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-05-06&to=2025-05-13&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-05-06..2025-05-13&type=Issues)

## 4.0.0a7

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@4.0.0-a6...3b2cb8754e8e8e9de0af02f915ce1b77ce778997))

### Enhancements made

- Use `/api/stdin/kernel` for stdin requests via service worker [#220](https://github.com/jupyterlite/xeus/pull/220) ([@ianthomas23](https://github.com/ianthomas23))
- Add fallback for kernel constructor when argv is not accepted [#218](https://github.com/jupyterlite/xeus/pull/218) ([@anutosh491](https://github.com/anutosh491))
- Support stdin via SharedArrayBuffer [#217](https://github.com/jupyterlite/xeus/pull/217) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-04-29&to=2025-05-06&type=c))

[@anutosh491](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Aanutosh491+updated%3A2025-04-29..2025-05-06&type=Issues) | [@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Aianthomas23+updated%3A2025-04-29..2025-05-06&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-04-29..2025-05-06&type=Issues)

## 4.0.0a6

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@4.0.0-a5...ddcb13c5cfe8bc3fc6c666ed7360ca222b945fbd))

### Enhancements made

- Enable Kernels to be built on top of kernel specs arguments [#210](https://github.com/jupyterlite/xeus/pull/210) ([@anutosh491](https://github.com/anutosh491))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-04-28&to=2025-04-29&type=c))

[@anutosh491](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Aanutosh491+updated%3A2025-04-28..2025-04-29&type=Issues)

## 4.0.0a5

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@4.0.0-a4...4ee136ef40830da69a925d32f9f803738092c075))

### Enhancements made

- Expose sendMessage to subclasses [#214](https://github.com/jupyterlite/xeus/pull/214) ([@martinRenou](https://github.com/martinRenou))
- Support stdin via service worker [#212](https://github.com/jupyterlite/xeus/pull/212) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-04-28&to=2025-04-28&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Aianthomas23+updated%3A2025-04-28..2025-04-28&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-04-28..2025-04-28&type=Issues)

## 4.0.0a4

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@4.0.0-a3...f7c8808554f95b58d1d5e0952fa76b826532993e))

### Maintenance and upkeep improvements

- Update mambajs 0.10.0 [#213](https://github.com/jupyterlite/xeus/pull/213) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-04-22&to=2025-04-28&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-04-22..2025-04-28&type=Issues)

## 4.0.0a3

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@4.0.0-a2...bf33a1181ab602a30fd4766e3cea1fe159293fbb))

### Maintenance and upkeep improvements

- Update jupyterlite + mambajs [#211](https://github.com/jupyterlite/xeus/pull/211) ([@martinRenou](https://github.com/martinRenou))
- Remove unused code [#209](https://github.com/jupyterlite/xeus/pull/209) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-03-20&to=2025-04-22&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-03-20..2025-04-22&type=Issues)

## 4.0.0a2

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@4.0.0-a1...870959c7a0d45f2d19305d86833a9964855f1cba))

### Enhancements made

- Installing xeus-cpp from prefix-dev [#191](https://github.com/jupyterlite/xeus/pull/191) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Update mambajs [#205](https://github.com/jupyterlite/xeus/pull/205) ([@martinRenou](https://github.com/martinRenou))
- Update jupyterlite 0.6.0-alpha.3: remove split liteextension/labextension [#204](https://github.com/jupyterlite/xeus/pull/204) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-03-13&to=2025-03-20&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-03-13..2025-03-20&type=Issues)

## 4.0.0a1

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@4.0.0-a0...f5d01e774a325e9d68ea95b70eab4703ce36ddb4))

### Enhancements made

- Bring back mount points as list [#203](https://github.com/jupyterlite/xeus/pull/203) ([@martinRenou](https://github.com/martinRenou))
- Micromamba dependency and proper prefix relocation [#200](https://github.com/jupyterlite/xeus/pull/200) ([@martinRenou](https://github.com/martinRenou))
- Report kernel status on startup [#197](https://github.com/jupyterlite/xeus/pull/197) ([@martinRenou](https://github.com/martinRenou))
- Bump mambajs: prefix relocation + untarjs speedup [#180](https://github.com/jupyterlite/xeus/pull/180) ([@martinRenou](https://github.com/martinRenou))

### Bugs fixed

- Fix cwd for Notebooks [#187](https://github.com/jupyterlite/xeus/pull/187) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Update to a newer `jupyterlite-core` in the docs environment [#194](https://github.com/jupyterlite/xeus/pull/194) ([@jtpio](https://github.com/jtpio))
- Snapshot the notebook section of the launcher only [#192](https://github.com/jupyterlite/xeus/pull/192) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- Add docs for multi-env support [#202](https://github.com/jupyterlite/xeus/pull/202) ([@martinRenou](https://github.com/martinRenou))
- Debug docs [#198](https://github.com/jupyterlite/xeus/pull/198) ([@martinRenou](https://github.com/martinRenou))
- Python 3.13 on docs [#179](https://github.com/jupyterlite/xeus/pull/179) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-01-30&to=2025-03-13&type=c))

[@jtpio](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Ajtpio+updated%3A2025-01-30..2025-03-13&type=Issues) | [@lumberbot-app](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Alumberbot-app+updated%3A2025-01-30..2025-03-13&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-01-30..2025-03-13&type=Issues)

## 4.0.0a0

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@3.1.1...feffc843489e684baecb11c12e06aa8eba21d827))

### Enhancements made

- Multi envs support [#164](https://github.com/jupyterlite/xeus/pull/164) ([@martinRenou](https://github.com/martinRenou))
- Adding xeus-cpp in the docs [#162](https://github.com/jupyterlite/xeus/pull/162) ([@anutosh491](https://github.com/anutosh491))

### Bugs fixed

- Non-hardcoded python version [#177](https://github.com/jupyterlite/xeus/pull/177) ([@martinRenou](https://github.com/martinRenou))
- Fix cwd when building the environment [#169](https://github.com/jupyterlite/xeus/pull/169) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Rebuild with latest jupyterlite [#171](https://github.com/jupyterlite/xeus/pull/171) ([@martinRenou](https://github.com/martinRenou))

### Documentation improvements

- Adding xeus-cpp in the docs [#162](https://github.com/jupyterlite/xeus/pull/162) ([@anutosh491](https://github.com/anutosh491))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-01-27&to=2025-01-30&type=c))

[@anutosh491](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Aanutosh491+updated%3A2025-01-27..2025-01-30&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Adavidbrochart+updated%3A2025-01-27..2025-01-30&type=Issues) | [@lumberbot-app](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Alumberbot-app+updated%3A2025-01-27..2025-01-30&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-01-27..2025-01-30&type=Issues)

## 3.1.1

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@3.1.0...762fd659abe3026603bfa0c1ed7c089e57e75419))

### Enhancements made

- Rebuild with untarjs 5.2.1 [#166](https://github.com/jupyterlite/xeus/pull/166) ([@martinRenou](https://github.com/martinRenou))
- Non verbose env bootstrap in production [#165](https://github.com/jupyterlite/xeus/pull/165) ([@martinRenou](https://github.com/martinRenou))

### Documentation improvements

- Improve docs landing page [#163](https://github.com/jupyterlite/xeus/pull/163) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-01-22&to=2025-01-27&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-01-22..2025-01-27&type=Issues)

## 3.1.0

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@3.0.3...00bf9ef6c335e109ee8254edff22e2271c04f8cf))

### Enhancements made

- Add support for using Python 3.13 [#161](https://github.com/jupyterlite/xeus/pull/161) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-01-20&to=2025-01-22&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-01-20..2025-01-22&type=Issues)

## 3.0.3

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@3.0.2...c49850af08fc3259efac63b0f9613be483302b5b))

### Enhancements made

- Update mambajs and untarjs [#159](https://github.com/jupyterlite/xeus/pull/159) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Update ui-tests screenshots [#157](https://github.com/jupyterlite/xeus/pull/157) ([@martinRenou](https://github.com/martinRenou))
- Use new mambajs splitted API [#154](https://github.com/jupyterlite/xeus/pull/154) ([@martinRenou](https://github.com/martinRenou))
- Update actions [#153](https://github.com/jupyterlite/xeus/pull/153) ([@IsabelParedes](https://github.com/IsabelParedes))
- Add 0.5.0 version specifier [#151](https://github.com/jupyterlite/xeus/pull/151) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- Remove xeus-r from docs for now [#156](https://github.com/jupyterlite/xeus/pull/156) ([@martinRenou](https://github.com/martinRenou))
- Adding back xeus-r in docs [#155](https://github.com/jupyterlite/xeus/pull/155) ([@martinRenou](https://github.com/martinRenou))
- Add xeus-r [#152](https://github.com/jupyterlite/xeus/pull/152) ([@IsabelParedes](https://github.com/IsabelParedes))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-01-16&to=2025-01-20&type=c))

[@IsabelParedes](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AIsabelParedes+updated%3A2025-01-16..2025-01-20&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Ajtpio+updated%3A2025-01-16..2025-01-20&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-01-16..2025-01-20&type=Issues)

## 3.0.2

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@3.0.1...5002e6e6bf33c74300124605a4b2441cff24e19a))

### Bugs fixed

- Update mambajs 0.2.2 [#150](https://github.com/jupyterlite/xeus/pull/150) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-01-15&to=2025-01-16&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-01-15..2025-01-16&type=Issues)

## 3.0.1

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@3.0.0...529dfb55e604677d556a7daf7ae076c7fbf188a5))

### Enhancements made

- Update mambajs 0.2.1 [#149](https://github.com/jupyterlite/xeus/pull/149) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2025-01-14&to=2025-01-15&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2025-01-14..2025-01-15&type=Issues)

## 3.0.0

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v2.1.2...1854f83f8b892a56f873485db517346bc3bac381))

### Enhancements made

- Kernel shared libs handling [#146](https://github.com/jupyterlite/xeus/pull/146) ([@martinRenou](https://github.com/martinRenou))
- Update JupyterLite packages [#134](https://github.com/jupyterlite/xeus/pull/134) ([@martinRenou](https://github.com/martinRenou))
- Split package in two: extension and library [#132](https://github.com/jupyterlite/xeus/pull/132) ([@martinRenou](https://github.com/martinRenou))
- Bootstrap environments using mambajs, allowing libraries handling for other kernels than xeus-python [#130](https://github.com/jupyterlite/xeus/pull/130) ([@AnastasiaSliusar](https://github.com/AnastasiaSliusar))
- Register all kernels in one plugin [#107](https://github.com/jupyterlite/xeus/pull/107) ([@trungleduc](https://github.com/trungleduc))

### Bugs fixed

- Fix empack custom config support [#139](https://github.com/jupyterlite/xeus/pull/139) ([@martinRenou](https://github.com/martinRenou))
- Fixing lerna setup [#136](https://github.com/jupyterlite/xeus/pull/136) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Update mambajs [#144](https://github.com/jupyterlite/xeus/pull/144) ([@martinRenou](https://github.com/martinRenou))
- Update bot triggering logic [#140](https://github.com/jupyterlite/xeus/pull/140) ([@martinRenou](https://github.com/martinRenou))
- Allow for JupyterLite 0.5.0 [#137](https://github.com/jupyterlite/xeus/pull/137) ([@jtpio](https://github.com/jtpio))
- Remove unused attributes [#131](https://github.com/jupyterlite/xeus/pull/131) ([@martinRenou](https://github.com/martinRenou))
- Docs: more verbose build [#129](https://github.com/jupyterlite/xeus/pull/129) ([@martinRenou](https://github.com/martinRenou))

### Documentation improvements

- Update CHANGELOG and mention the split [#133](https://github.com/jupyterlite/xeus/pull/133) ([@martinRenou](https://github.com/martinRenou))
- Docs: more verbose build [#129](https://github.com/jupyterlite/xeus/pull/129) ([@martinRenou](https://github.com/martinRenou))

### Other merged PRs

- Handle .data file for kernels that require preloading [#145](https://github.com/jupyterlite/xeus/pull/145) ([@anutosh491](https://github.com/anutosh491))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-10-24&to=2025-01-14&type=c))

[@AnastasiaSliusar](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AAnastasiaSliusar+updated%3A2024-10-24..2025-01-14&type=Issues) | [@anutosh491](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Aanutosh491+updated%3A2024-10-24..2025-01-14&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Ajtpio+updated%3A2024-10-24..2025-01-14&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-10-24..2025-01-14&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Atrungleduc+updated%3A2024-10-24..2025-01-14&type=Issues)

## 3.0.0a3

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@3.0.0-a2...d2cd7fe684fb35a43bdeaa8f8b477738c14a8ee3))

### Bugs fixed

- Fix empack custom config support [#139](https://github.com/jupyterlite/xeus/pull/139) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Update mambajs [#144](https://github.com/jupyterlite/xeus/pull/144) ([@martinRenou](https://github.com/martinRenou))
- Update bot triggering logic [#140](https://github.com/jupyterlite/xeus/pull/140) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-12-18&to=2025-01-13&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-12-18..2025-01-13&type=Issues)

## 3.0.0a2

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@3.0.0-a1...a3cc7e43c721ff9f344b366cdf44d803be8da192))

### Enhancements made

- Bootstrap environments using mambajs, allowing libraries handling for other kernels than xeus-python [#130](https://github.com/jupyterlite/xeus/pull/130) ([@AnastasiaSliusar](https://github.com/AnastasiaSliusar))

### Maintenance and upkeep improvements

- Allow for JupyterLite 0.5.0 [#137](https://github.com/jupyterlite/xeus/pull/137) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-12-17&to=2024-12-18&type=c))

[@AnastasiaSliusar](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AAnastasiaSliusar+updated%3A2024-12-17..2024-12-18&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Ajtpio+updated%3A2024-12-17..2024-12-18&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-12-17..2024-12-18&type=Issues)

## 3.0.0a1

([Full Changelog](https://github.com/jupyterlite/xeus/compare/@jupyterlite/xeus-extension@3.0.0-a0...de6e331c7143a3a0e71a15038e4bab75d74b6561))

### Enhancements made

- Update JupyterLite packages [#134](https://github.com/jupyterlite/xeus/pull/134) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-12-13&to=2024-12-17&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-12-13..2024-12-17&type=Issues)

## 3.0.0a0

The main change is on the packaging.

We have a new JS package `@jupyterlite/xeus-extension` which provides the JupyterLite plugin.
The new version of the JS package `@jupyterlite/xeus` now only contains the kernels implementation, no plugin.

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v2.1.2...8b774d7d18f166501d9770321c31dc79d3c40bd7))

### Enhancements made

- Split package in two: extension and library [#132](https://github.com/jupyterlite/xeus/pull/132) ([@martinRenou](https://github.com/martinRenou))
- Register all kernels in one plugin [#107](https://github.com/jupyterlite/xeus/pull/107) ([@trungleduc](https://github.com/trungleduc))

### Bugs fixed

- Fixing lerna setup [#136](https://github.com/jupyterlite/xeus/pull/136) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Remove unused attributes [#131](https://github.com/jupyterlite/xeus/pull/131) ([@martinRenou](https://github.com/martinRenou))
- Docs: more verbose build [#129](https://github.com/jupyterlite/xeus/pull/129) ([@martinRenou](https://github.com/martinRenou))

### Documentation improvements

- Update CHANGELOG and mention the split [#133](https://github.com/jupyterlite/xeus/pull/133) ([@martinRenou](https://github.com/martinRenou))
- Docs: more verbose build [#129](https://github.com/jupyterlite/xeus/pull/129) ([@martinRenou](https://github.com/martinRenou))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-10-24&to=2024-12-13&type=c))

[@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3AmartinRenou+updated%3A2024-10-24..2024-12-13&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Atrungleduc+updated%3A2024-10-24..2024-12-13&type=Issues)

## 2.1.2

([Full Changelog](https://github.com/jupyterlite/xeus/compare/v2.1.1...ea918a0cb1c5a59fc64e72f399effb0bdf66acd1))

### Enhancements made

- Export `IEmpackEnvMetaFile` from index [#127](https://github.com/jupyterlite/xeus/pull/127) ([@trungleduc](https://github.com/trungleduc))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/xeus/graphs/contributors?from=2024-10-23&to=2024-10-24&type=c))

[@trungleduc](https://github.com/search?q=repo%3Ajupyterlite%2Fxeus+involves%3Atrungleduc+updated%3A2024-10-23..2024-10-24&type=Issues)

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
