import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell,
} from "@jupyterlab/application";
import { IDocumentManager } from "@jupyterlab/docmanager";
import { MainAreaWidget } from "@jupyterlab/apputils";
import { RecordManager } from "./record";

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
} from "./parser";
import { recursiveWalk } from "./contents";

/**
 * Build initial graph from content manager files
 */
export async function buildInitialGraph(
  contents: Contents.IManager,
  docManager: RecordManager,
  parserRegistry: ModelParserRegistry
) {
  const filterModels = (model: Contents.IModel) => {
    // TODO make this configurable
    if (model.type == "directory") {
      return model.name !== "node_modules";
    }
    // Only load supported fields
    return PathExt.extname(model.path) in parserRegistry.parsers;
  };
  // Load known models
  const models = await recursiveWalk(contents, "/", filterModels);

  // Add loaded models
  for (let model of models) {
    const fullModel = await contents.get(model.path);
    const record = await parserRegistry.parse(fullModel);
    docManager.add(record);
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
  optional: [],

  activate: (
    app: JupyterFrontEnd,
    docManager: IDocumentManager,
    notebookTracker: INotebookTracker,
    editorTracker: IEditorTracker,
    markdownViewerTracker: IMarkdownViewerTracker,
    labShell: ILabShell
  ) => {
    console.log(
      "JupyterLab extension jupyterlab-knowledge-graph is activated!"
    );

    const contents = app.serviceManager.contents;

    // Create model parser
    const parserRegistry = new ModelParserRegistry(contents);
    parserRegistry.register(".md", parseMarkdownDocument);
    parserRegistry.register(".ipynb", parseNotebookDocument);

    // Create record registry
    const recordManager = new RecordManager();

    app.serviceManager.contents.fileChanged.connect(async (_, change) => {
      // On create
      if (change.type == "new") {
        const path = (change.newValue as Contents.IModel).path;
        const model = await contents.get(path);
        // Add model to record registry
        try {
          const record = await parserRegistry.parse(model);
          recordManager.add(record);
        } catch (e) {
          console.log(`Couldn't create Record for ${path} due to ${e}`);
        }
      }
      // On delete
      else if (change.type == "delete") {
        const path = (change.oldValue as Contents.IModel).path;
        // Remove by path
        for (let doc of Object.values(recordManager.records)) {
          if (doc.path == path) {
            recordManager.remove(doc);
            break;
          }
        }
      }
      // On rename
      else if (change.type == "rename") {
        // Remove by path
        const oldPath = (change.oldValue as Contents.IModel).path;
        for (let doc of Object.values(recordManager.records)) {
          if (doc.path == oldPath) {
            recordManager.remove(doc);
            break;
          }
        }
        // Add under new path!
        const newPath = (change.newValue as Contents.IModel).path;
        const model = await contents.get(newPath);
        // Add model to record registry
        try {
          const record = await parserRegistry.parse(model);
          recordManager.add(record);
        } catch (e) {
          console.log(`Couldn't create Record for ${newPath} due to ${e}`);
        }
      }
      // On save
      else {
        const path = (change.newValue as Contents.IModel).path;
        const model = await contents.get(path);
        // Add model to record registry
        try {
          const record = await parserRegistry.parse(model);
          recordManager.add(record);
        } catch (e) {
          console.log(`Couldn't create Record for ${path} due to ${e}`);
        }
      }
    });

    // Handle active record change
    function onWidgetChanged() {
      const widget = labShell.currentWidget;
      if (widget === null) {
        return;
      }
      // Set current record of graph
      let path: string;
      if (widget instanceof DocumentWidget) {
        path = widget.context.path;
        content.currentRecordPath = path;
      } else {
        return;
      }
    }
    labShell.currentChanged.connect(onWidgetChanged);

    // Create graph
    const content = new KnowledgeGraphWidget(recordManager);

    // Allow graph to set active record
    content.recordSelected.connect((widget: any, path: string) => {
      docManager.openOrReveal(path);
    });

    const widget = new MainAreaWidget({ content });
    widget.id = "knowledge-graph-jupyterlab";
    widget.title.label = "Knowledge Graph";
    widget.title.closable = false;

    // Build initial graph
    buildInitialGraph(contents, recordManager, parserRegistry);

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
