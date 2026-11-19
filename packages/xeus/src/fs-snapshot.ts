// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

/**
 * Snapshot of the unpacked environment in the emscripten FS.
 *
 * On restart a new worker is created, which used to fetch, decompress and untar all
 * packages again. Instead, the previous worker packs the unpacked files into one buffer
 * (kept by the main thread), and the next worker writes them back.
 *
 * Only the environment directories are captured (not the drive, /tmp, /home, /dev,
 * /proc), and no __pycache__ (see pyc-cache.ts).
 */

export interface IFsSnapshot {
  /**
   * Fingerprint of the packed environment (see envFingerprint).
   */
  key: string;
  /**
   * What bootstrapEmpackPackedEnvironment returned for this environment.
   */
  paths: any;
  pythonVersion: number[] | undefined;
  sharedLibs: any;
  /**
   * The FS content: directories, files as [path, offset, length, mode] into `data`,
   * and symlinks as [path, target].
   */
  dirs: string[];
  files: [string, number, number, number][];
  symlinks: [string, string][];
  data: Uint8Array;
}

const NOT_ENV = new Set(['dev', 'proc', 'tmp', 'home', 'drive']);

/**
 * The top-level directories that belong to the environment.
 * Call it right after the packages have been unpacked.
 */
export function envRoots(Module: any): string[] {
  const FS = Module.FS;
  return FS.readdir('/')
    .filter((name: string) => !['.', '..'].includes(name) && !NOT_ENV.has(name))
    .map((name: string) => `/${name}`)
    .filter((path: string) => FS.isDir(FS.lstat(path).mode));
}

export function createFsSnapshot(
  Module: any,
  roots: string[],
  meta: Pick<IFsSnapshot, 'key' | 'paths' | 'pythonVersion' | 'sharedLibs'>
): IFsSnapshot {
  const FS = Module.FS;
  const dirs: string[] = [];
  const contents: [string, Uint8Array, number][] = [];
  const symlinks: [string, string][] = [];

  const walk = (dir: string) => {
    dirs.push(dir);
    for (const name of FS.readdir(dir)) {
      if (['.', '..', '__pycache__'].includes(name)) {
        continue;
      }
      const path = `${dir}/${name}`;
      const mode = FS.lstat(path).mode;
      if (FS.isLink(mode)) {
        symlinks.push([path, FS.readlink(path)]);
      } else if (FS.isDir(mode)) {
        walk(path);
      } else if (FS.isFile(mode)) {
        contents.push([path, FS.readFile(path), mode]);
      }
    }
  };
  roots.forEach(walk);

  const data = new Uint8Array(
    contents.reduce((total, [, d]) => total + d.length, 0)
  );
  const files: [string, number, number, number][] = [];
  let offset = 0;
  for (const [path, d, mode] of contents) {
    data.set(d, offset);
    files.push([path, offset, d.length, mode]);
    offset += d.length;
  }
  return { ...meta, dirs, files, symlinks, data };
}

export function restoreFsSnapshot(Module: any, snapshot: IFsSnapshot): void {
  const FS = Module.FS;
  snapshot.dirs.forEach(dir => FS.mkdirTree(dir));
  for (const [path, offset, length, mode] of snapshot.files) {
    // MEMFS copies the data, the snapshot buffer stays intact for the next restart
    FS.writeFile(path, snapshot.data.subarray(offset, offset + length));
    FS.chmod(path, mode);
  }
  for (const [path, target] of snapshot.symlinks) {
    FS.symlink(target, path);
  }
}
