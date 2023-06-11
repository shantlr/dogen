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

`nodeImage`: {string} customize image used for installing/bulding/running your service

`container.workdir`: {string} customize workir used in docker to install/build/run your service

`install.keepCache`: {boolean} keep package manager cache on node_modules installation

`install.npmrc`: {boolean|string} mount a npmrc file when running installation command, npmrc file should be provided during build using secret (e.g `docker build --secret id=npmrc,src=.npmrc [...]`)

`install.cmd`: {string} custom command to run installation

`build.includes`: {string|string[]} files to copy for building service. (by default dogen try to autodetect files that should be copied)

`build.extraIncludes`: {string|string[]} additional files to copy for building service.

`build.script`: {string} name of script present in you package.json to use to build your service. Ignored if `build.cmd` is provided

`build.cmd`: {string} command to use to run to build your service

`postBuild.includes`: {string | string[]} files to copy after your service is built

`run.script`: {string} name of script present in you package.json to use to run your service. Ignored if `run.cmd` is provided

`run.cmd`: {string} command to use to run your service
