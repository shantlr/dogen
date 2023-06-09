export type DogenConfig = {
  /**
   * customize image used for installing/bulding/running your service
   */
  nodeImage?: string;

  /**
   * dockerfile targets prefix
   */
  targetPrefix?: string;

  /**
   * workdir to use in dockerfile
   */
  container: {
    /**
     * customize workir used in docker to install/build/run your service
     */
    workdir?: string;
  };

  extractDeps?: {
    /**
     * customize dockerfile extract deps target name
     */
    name?: string;
  };

  install?: {
    /**
     * customize dockerfile install target name
     */
    name?: string;
    /**
     * keep package manager cache on node_modules installation
     */
    keepCache?: boolean;
    /**
     * mount a npmrc file when running installation command, npmrc file should be provided during build using secret (e.g `docker build --secret id=npmrc,src=.npmrc [...]`)
     */
    npmrc?: boolean | string;
    /**
     * custom command to run installation
     */
    cmd?: string;
  };
  /**
   * Build related target
   */
  build?: {
    /**
     * customize dockerfile build target name
     */
    name?: string;

    /**
     * where the build output dir is
     */
    dir?: string;

    /**
     * name of script present in you package.json to use to build your service. Ignored if `build.cmd` is provided
     */
    script?: string;
    /**
     * override build command with custom command
     */
    cmd?: string;

    /**
     * files to copy for building service. (by default dogen try to autodetect files that should be copied)
     */
    includes?: string | string[];
    /**
     * excludes files from `build.includes` and `build.extraIncludes`
     */
    excludes?: string | string[];
    /**
     * additional files to copy for building service.
     */
    extraIncludes?: string | string[];
  };
  postBuild: {
    /**
     * files to copy after your service is built
     */
    includes?: string | string[];
  };

  run?: {
    /**
     * customize dockerfile run target name
     */
    name?: string;
    /**
     * command to use to run your service
     */
    cmd?: string;
    /**
     * name of script present in you package.json to use to run your service. Ignored if `run.cmd` is provided
     */
    script?: string;
    /**
     * customize image used for installing/bulding/running your service
     */
    expose?: number;
  };
  /**
   * Configure how app should be served
   * This is only used for app that build a static files to be served
   */
  serve?: {
    /**
     * Serve target name
     */
    name?: string;
    customConfig?: string;
    configPath?: string;
    /**
     * Serve dir image
     */
    imageName?: string;
    /**
     * Served dir, built dir will be copied here
     */
    dir?: string;
    /**
     * Exposed port
     */
    expose?: number;
  };
};

export type DogenResolvedConfig = Pick<
  DogenConfig,
  | 'targetPrefix'
  | 'extractDeps'
  | 'run'
  | 'build'
  | 'postBuild'
  | 'install'
  | 'serve'
> & {
  nodeImage: string;
  container: {
    workdir: string;
  };
};
