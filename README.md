# Dogen

Generate your Dockerfile based on your package.json

Very early stage of developpement, expect breaking changes

## Usage as cli

```bash
npm install -g dogen
cd ./app
dogen
cat Dockerfile
```

## Dogenrc

Generated Dockerfile can be configured using a `.dogenrc` at root of your project

```jsonc
{
  "nodeImage": "node:18-alpine3.17", // custom image to use for installing/building/running your service
  "build": {
    "script": "build:prod" // custom script (defined in your package.json) to call for building your service
  },
  "run": {
    "script": "start:prod" // custom script (defined in your package.json) to call for starting your service
  }
}
```

### Fields

```ts
type DogenConfig = {
  /**
   * customize image used for installing/bulding/running your service
   */
  nodeImage?: string;

  /**
   * Workdir to use in dockerfile
   */
  container: {
    /**
     * customize workir used in docker to install/build/run your service
     */
    workdir?: string;
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
};
```
