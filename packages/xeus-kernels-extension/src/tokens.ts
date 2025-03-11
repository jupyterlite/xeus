import { Token } from '@lumino/coreutils';

export interface IEmpackEnvMetaFile {
  /**
   * Get empack_env_meta link.
   */
  getLink: (kernelspec: Record<string, any>) => Promise<string>;
}

export const IEmpackEnvMetaFile = new Token<IEmpackEnvMetaFile>(
  '@jupyterlite/xeus:IEmpackEnvMetaFile'
);
