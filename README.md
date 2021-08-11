# jupyterlab_knowledge_graph

![Github Actions Status](https://github.com/agoose77/jupyterlab-knowledge-graph/workflows/Build/badge.svg)[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/agoose77/jupyterlab-knowledge-graph/main?urlpath=lab)

A JupyterLab extension to add a [Foam](https://github.com/foambubble/foam)-like knowledge graph to JupyterLab.

![Screenshot from 2021-08-11 13-24-10](https://user-images.githubusercontent.com/1248413/129027986-59ffacb4-5669-4cc9-a466-7eb33556febf.png)


This extension is composed of a Python package named `jupyterlab_knowledge_graph`
which bundles the frontend extension and a NPM package named `jupyterlab-knowledge-graph`
for the frontend extension itself.

## Notes
* `RecordManager` tracks all known `Record`s with their associated `Link`s to other `Record`s. 
* `ParserRegistry` manages the parsing of JupyterLab documents into `Record`s.
* `KnowledgeGraph` displays a collection of `Records` using Cytoscape.js


## Requirements

* JupyterLab >= 3.0

## Install

To install the extension, execute:

```bash
pip install jupyterlab_knowledge_graph
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall jupyterlab_knowledge_graph
```


## Troubleshoot

If you are not seeing
the frontend extension, check the frontend extension is installed:

```bash
jupyter labextension list
```


## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the jupyterlab_knowledge_graph directory
# Install package in development mode
pip install -e .
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Rebuild extension Typescript source after making changes
jlpm run build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm run watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm run build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
pip uninstall jupyterlab_knowledge_graph
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyterlab-knowledge-graph` within that folder.
