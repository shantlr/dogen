export type DogenInputConfig = {
  root?: boolean;

  nodeImage?: string;

  /**
   * Workdir to use in dockerfile
   */
  container: {
    workdir?: string;
  };

  install?: {
    name?: string;
    keepCache?: boolean;
    npmrc?: boolean | string;
    cmd?: string;
  };
  build?: {
    name?: string;
    /**
     * package.json script to call for building service
     * Script will be run using detected package manager
     *
     * @example buildScript: 'build'
     */
    script?: string;
    /**
     * override build command with custom command
     */
    cmd?: string;

    /**
     * Override build files
     */
    includes?: string | string[];
    /**
     * File that should be excluded from  build files
     */
    excludes?: string | string[];
    /**
     * Extra build files in case you dont want to override default detected files
     */
    extraIncludes?: string | string[];
  };
  postBuild: {
    /**
     * Files that should be copied after build
     */
    includes?: string | string[];
  };

  run?: {
    name?: string;
    cmd?: string;
    script?: string;
  };
};

export type DogenResolvedConfig = Pick<
  DogenInputConfig,
  'run' | 'build' | 'postBuild' | 'install'
> & {
  nodeImage: string;
  container: {
    workdir: string;
  };
};
