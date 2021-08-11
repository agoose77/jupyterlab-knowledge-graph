import { Message } from "@lumino/messaging";
import { Widget } from "@lumino/widgets";
import cytoscape, {
  Core,
  ElementDataDefinition,
  ElementDefinition,
} from "cytoscape";
import { DocumentRegistry } from "./document";
import { ISignal, Signal } from "@lumino/signaling";

export class KnowledgeGraphWidget extends Widget {
  private _documentSelected = new Signal<this, string>(this);

  get documentSelected(): ISignal<this, string> {
    return this._documentSelected;
  }

  /**
   * The div element associated with the widget.
   */
  readonly div: HTMLDivElement;

  private readonly _cy: Core;
  private readonly _registry: DocumentRegistry;

  /**
   * Construct a new APOD widget.
   */
  constructor(registry: DocumentRegistry) {
    super();

    // Add an image element to the panel
    this.div = document.createElement("div");
    this.node.appendChild(this.div);

    this.div.style.height = "100%";
    this.div.style.width = "100%";

    this.addClass("knowledge-graph-widget");

    this._cy = cytoscape({
      container: this.div,
      elements: [],
      style: [
        // the stylesheet for the graph
        {
          selector: "node",
          style: {
            "background-color": "#666",
            label: "data(label)",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": "#4080d0",
            "target-arrow-color": "#4080d0",
            "target-arrow-shape": "triangle",
            "curve-style": "straight",
          },
        },
        {
          selector: "[?isCurrent]",
          css: {
            "background-color": "#4080d0",
          },
        },
      ],

      layout: {
        name: "cose",
      },
    });

    // Register event handlers
    this._cy.on("click", (event) => {
      const elem = event.target;
      console.log("Click", elem, elem.group)

      if (elem.group() === "nodes") {
        const path = elem.data("path");
        this._documentSelected.emit(path);
        console.log("Open", path)
      }
    });

    // Register document handler
    this._registry = registry;
    registry.documentsChanged.connect((_, docs) => {
      this._updateElements();
      this._updateLayout();
    });
  }

  private _currentDocumentPath: string = "";

  get currentDocumentPath(): string {
    return this._currentDocumentPath;
  }

  set currentDocumentPath(path: string) {
    this._currentDocumentPath = path;
    this._updateElements();
  }

  private _updateLayout() {
    this._cy.fit();
    this._cy.layout({ name: "cose" }).run();
  }

  private _labelLength: number = 32;
  private _truncateLabel(label: string) : string {
    if (label.length > this._labelLength) {
      return label.substr(0, this._labelLength) + "…"
    }
    return label;
  }

  private _updateElements() {
    const documents = this._registry.documents;

    let nodes: ElementDefinition[] = [];
    let validURIs: string[] = [];

    Object.values(documents).forEach((doc) => {
      validURIs.push(doc.uri);
    });

    Object.values(documents).forEach((doc) => {
      nodes.push(<ElementDefinition>{
        data: <ElementDataDefinition>{
          id: doc.uri,
          label: this._truncateLabel(doc.name),
          path: doc.path,
          isCurrent: doc.path === this._currentDocumentPath,
        },
      });

      doc.links.forEach((link) => {
        if (!validURIs.includes(link.uri)) {
          return;
        }
        nodes.push(<ElementDefinition>{
          data: <ElementDataDefinition>{
            id: `${doc.uri}-${link.uri}`,
            source: doc.uri,
            target: link.uri,
            label: "",
          },
        });
      });
    });
    console.log(nodes);
    this._cy.json({ elements: nodes });
  }
  /**
   * Handle update requests for the widget.
   */
  async onUpdateRequest(msg: Message): Promise<void> {}
}
