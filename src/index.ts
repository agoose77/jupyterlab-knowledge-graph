import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell,
} from "@jupyterlab/application";
import { IDocumentManager } from "@jupyterlab/docmanager";
import { MainAreaWidget } from "@jupyterlab/apputils";
import { DocumentRegistry } from "./document";

import { ISettingRegistry } from "@jupyterlab/settingregistry";
import { KnowledgeGraphWidget } from "./widget";

import { DocumentWidget } from "@jupyterlab/docregistry";
import { INotebookTracker } from "@jupyterlab/notebook";
import { IMarkdownViewerTracker } from "@jupyterlab/markdownviewer";
import { IEditorTracker } from "@jupyterlab/fileeditor";
import { Contents } from "@jupyterlab/services";
import { PathExt } from "@jupyterlab/coreutils";
import {
  ModelParserRegistry,
  parseNotebookDocument,
  parseMarkdownDocument,
} from "./model";

async function recursiveWalk(
  contents: Contents.IManager,
  path: string,
  filter: any
): Promise<Contents.IModel[]> {
  let documents: Contents.IModel[] = [];
  let dirModels: Contents.IModel[] = [await contents.get(path)];

  let dirModel;
  while ((dirModel = dirModels.shift())) {
    // For each content in directory
    for (let model of dirModel.content) {
      // Ignore non-filtered paths
      if (!filter(model)) {
        continue;
      }

      // Push new directories to stack
      if (model.type === "directory") {
        // Retrieve model metadata
        dirModels.push(await contents.get(model.path));
      } else {
        documents.push(model);
      }
    }
  }

  return documents;
}

export async function buildGraph(
  contents: Contents.IManager,
  docRegistry: DocumentRegistry,
  parserRegistry: ModelParserRegistry
) {
  const filterModels = (model: Contents.IModel) => {
    if (model.type == "directory") {
      return model.name !== "node_modules";
    }
    // Only load notebooks or MD files
    const ext = PathExt.extname(model.path);
    return ext == ".md" || ext == ".ipynb";
  };
  // Load known models
  const models = await recursiveWalk(contents, "/", filterModels);

  // Add loaded models
  for (let model of models) {
    const fullModel = await contents.get(model.path);
    const document = await parserRegistry.parse(fullModel);
    docRegistry.add(document);
  }
}

/**
 * Initialization data for the jupyterlab-knowledge-graph extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: "jupyterlab-knowledge-graph:plugin",
  autoStart: true,
  requires: [
    IDocumentManager,
    INotebookTracker,
    IEditorTracker,
    IMarkdownViewerTracker,
    ILabShell,
  ],
  optional: [ISettingRegistry],

  activate: (
    app: JupyterFrontEnd,
    docManager: IDocumentManager,
    notebookTracker: INotebookTracker,
    editorTracker: IEditorTracker,
    markdownViewerTracker: IMarkdownViewerTracker,
    labShell: ILabShell,
    settingRegistry?: ISettingRegistry
  ) => {
    console.log(
      "JupyterLab extension jupyterlab-knowledge-graph is activated!"
    );

    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then((settings) => {
          console.log(
            "jupyterlab-knowledge-graph settings loaded:",
            settings.composite
          );
        })
        .catch((reason) => {
          console.error(
            "Failed to load settings for jupyterlab-knowledge-graph.",
            reason
          );
        });
    }

    const contents = app.serviceManager.contents;
    // Create model parser
    const parserRegistry = new ModelParserRegistry(contents);
    parserRegistry.register(".md", parseMarkdownDocument);
    parserRegistry.register(".ipynb", parseNotebookDocument);

    // Create document registry
    const docRegistry = new DocumentRegistry();

    app.serviceManager.contents.fileChanged.connect(async (_, change) => {
      if (change.type == "new") {
        const path = (change.newValue as Contents.IModel).path;
        const model = await contents.get(path);
        // Add model to document registry
        try {
          const document = await parserRegistry.parse(model);
          docRegistry.add(document);
        } catch (e) {
          console.log(`Couldn't create Document for ${path} due to ${e}`);
        }
      } else if (change.type == "delete") {
        const path = (change.oldValue as Contents.IModel).path;
        // Remove by path
        for (let doc of Object.values(docRegistry.documents)) {
          if (doc.path == path) {
            docRegistry.remove(doc);
            break;
          }
        }
      }
    });

    function onConnect() {
      const widget = labShell.currentWidget;
      if (widget === null) {
        return;
      }

      let path: string;
      if (widget instanceof DocumentWidget) {
        path = widget.context.path;
        content.currentDocumentPath = path;
      } else {
        return;
      }
      console.log(path);
    }

    labShell.currentChanged.connect(onConnect);

    const content = new KnowledgeGraphWidget(docRegistry); // Track and restore the widget state
    content.documentSelected.connect((widget: any, path: string) => {
      docManager.openOrReveal(path);
    });

    const widget = new MainAreaWidget({ content });
    widget.id = "knowledge-graph-jupyterlab";
    widget.title.label = "Knowledge Graph";
    widget.title.closable = false;

    // Build initial graph
    buildGraph(contents, docRegistry, parserRegistry);

    new Promise((resolve) => setTimeout(resolve, 1000)).then(() => {
      if (!widget.isAttached) {
        // Attach the widget to the main work area if it's not there
        app.shell.add(widget, "main");
      }
      widget.content.update();

      // Activate the widget
      app.shell.activateById(widget.id);
    });
  },
};

export default plugin;
