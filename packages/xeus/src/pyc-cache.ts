// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

/**
 * Persistent cache for the Python bytecode compiled at runtime.
 *
 * The packed environments ship no .pyc files (to keep the download small), so every
 * kernel start compiles every imported module from source. Python writes the compiled
 * bytecode to __pycache__ in the in-memory FS, but that is lost with the worker.
 *
 * After the kernel is up, we collect all __pycache__/*.pyc, turn them into
 * "unchecked hash-based" pycs (PEP 552) and store them in IndexedDB. Unchecked pycs are
 * used without comparing them to the source mtime, which is needed because the unpacked
 * sources get a fresh mtime in every worker. A new worker writes them back into the FS
 * before Python starts.
 *
 * The cache key is a fingerprint of the packed package set, so any change of the
 * environment invalidates the cache.
 */

const DB_NAME = 'jupyterlite-xeus-pyc-cache';
const STORE = 'pyc';
const DB_VERSION = 1;

interface IPycCacheEntry {
  key: string;
  files: [string, Uint8Array][];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Small non-cryptographic string hash (two FNV-1a style lanes), good enough for a cache key.
 */
function hashString(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/**
 * Cache key: environment name + fingerprint of the packed package set.
 */
export function envFingerprint(envName: string, empackEnvMeta: any): string {
  const pkgs = (empackEnvMeta?.packages ?? [])
    .map((p: any) => `${p.name}=${p.version}=${p.build}=${p.filename ?? ''}`)
    .sort()
    .join('\n');
  return `${envName}:${hashString(pkgs)}`;
}

/**
 * Write the cached pycs for `key` into the emscripten FS.
 * Returns the paths of the files written.
 */
export async function restorePycCache(
  Module: any,
  key: string
): Promise<string[]> {
  if (typeof indexedDB === 'undefined') {
    return [];
  }
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const entry = (await idbRequest(tx.objectStore(STORE).get(key))) as
      | IPycCacheEntry
      | undefined;
    const written: string[] = [];
    for (const [path, data] of entry?.files ?? []) {
      try {
        Module.FS.mkdirTree(path.substring(0, path.lastIndexOf('/')));
        Module.FS.writeFile(path, data);
        written.push(path);
      } catch {
        // ignore single files
      }
    }
    return written;
  } finally {
    db.close();
  }
}

/**
 * Collect all __pycache__/*.pyc below `root`, with their header rewritten to
 * "unchecked hash-based" (PEP 552: flags = 0b01).
 */
function collectPycs(Module: any, root: string): [string, Uint8Array][] {
  const FS = Module.FS;
  const out: [string, Uint8Array][] = [];
  const walk = (dir: string) => {
    let names: string[];
    try {
      names = FS.readdir(dir);
    } catch {
      return;
    }
    for (const name of names) {
      if (name === '.' || name === '..') {
        continue;
      }
      const path = `${dir}/${name}`;
      const mode = FS.lstat(path).mode;
      if (FS.isDir(mode)) {
        walk(path);
      } else if (name.endsWith('.pyc') && dir.endsWith('/__pycache__')) {
        const data: Uint8Array = FS.readFile(path);
        if (data.length >= 16) {
          // bytes 4..8: little-endian flags; 0b01 = hash-based, don't check the source
          data.set([1, 0, 0, 0], 4);
          out.push([path, data]);
        }
      }
    }
  };
  walk(root);
  return out;
}

/**
 * Collect the pycs below `root` and store them under `key`, unless nothing new was
 * compiled since the cache was restored. Older entries of the same environment name
 * are dropped.
 */
export async function savePycCache(
  Module: any,
  key: string,
  root: string,
  restoredCount: number
): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    return;
  }
  const files = collectPycs(Module, root);
  if (files.length <= restoredCount) {
    return;
  }
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const envName = key.substring(0, key.lastIndexOf(':'));
    for (const k of (await idbRequest(store.getAllKeys())) as string[]) {
      if (k !== key && k.startsWith(`${envName}:`)) {
        store.delete(k);
      }
    }
    const entry: IPycCacheEntry = { key, files };
    store.put(entry);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
