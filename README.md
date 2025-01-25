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

By default dogen try to detect the right configuration given the project.
But you can be configure the Dockerfile generation using a `.dogenrc` at the root of your project

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/shantlr/dogen/refs/heads/main/schemas/dogen-config.schema.json",
  "node": {
    "from": "node:current-alpine"
  },
  "build": {
    "script": "build" // custom script (defined in your package.json) to call for building your service
  },
  "run": {
    "script": "start" // custom script (defined in your package.json) to call for starting your service
  }
}
```

### Workspace

In case of a yarn workspace, you can provide a dogen config per package.

### Reference

```ts
type DogenConfig = {
  /**
   * customize image used for installing/bulding/running your service
   */
  node?: {
    /**
     * base node image to use
     */
    from?: string;
    /**
     * node version to use.
     * ignored if `from` is provided
     */
    version? string;
    /**
     * add package manager version setup
     */
    setup_package_manager_version?: boolean;
  };

  package_manager?: 'npm' | 'yarn@1' | 'yarn@4';

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
     * base image used for install step
     */
    from?: string;
    /**
     * customize dockerfile install target name
     */
    target_name?: string;
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
    target_name?: string;
    /**
     * name of script present in you package.json to use to build your service. Ignored if `build.cmd` is provided
     */
    script?: string;
    /**
     * override build command with custom command
     */
    cmd?: string;


    output_dir?: string;

    /**
     * files to copy for building service. (by default dogen try to autodetect files that should be copied)
     */
    src_files?: string[];
    src_additional_files?: string[];
    src_detect_additional_files?: (string | { oneOf: string[] })[];
    src_copy_from?: {
      from: string; // from target name
      src: string;
      dst: string;
    }[]

    post_files?: string[];
    post_additional_files?: string[];
    post_detect_additional_files?: string[];
    post_copy_from?: {
      from: string; // from target name
      src: string;
      dst: string;
    }[]
  };

  /**
   * Run service target
   * Configuration used in case we are building a service like an api
   */
  run?: {
    /**
     * customize dockerfile run target name
     */
    target_name?: string;
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
   * Serve target
   * Configuration used in case we building static content to be served behind a reverse proxy
   */
  serve?: {
    from_image?: string;
    config?: string;
    config_dst?: string;
    target_name?: string;
    cmd?: string;
    script?: string;
    expose?: number;
  }
};
```
