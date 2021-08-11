import { Message } from "@lumino/messaging";
import { Widget } from "@lumino/widgets";
import cytoscape, {
  Core,
  ElementDataDefinition,
  ElementDefinition,
  NodeCollection,
} from "cytoscape";
import { RecordManager } from "./record";
import { ISignal, Signal } from "@lumino/signaling";

export class KnowledgeGraphWidget extends Widget {
  private _recordSelected = new Signal<this, string>(this);

  // Get signal for document selection
  get recordSelected(): ISignal<this, string> {
    return this._recordSelected;
  }

  /**
   * The div element associated with the widget.
   */
  readonly div: HTMLDivElement;

  private readonly _cy: Core;
  private readonly _recordManager: RecordManager;

  /**
   * Construct a new Knowledge-Graph widget.
   */
  constructor(recordManager: RecordManager) {
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
            "line-color": "#ccc",
            "target-arrow-color": "#ccc",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
        {
          selector: ".active-document",
          style: {
            "background-color": "#4080d0",
          },
        },
        {
          selector: ".active-backlink",
          style: {
            "target-arrow-color": "#4080d0",
            "line-color": "#4080d0",
          },
        },
        {
          selector: "node[[degree > 4]]",
          style: {
            height: 30,
            width: 30,
          },
        },
        {
          selector: "node[[degree <= 4]]",
          style: {
            height: 25,
            width: 25,
          },
        },
        {
          selector: "node[[degree <= 2]]",
          style: {
            height: 20,
            width: 20,
          },
        },
        {
          selector: "node[[degree <= 1]]",
          style: {
            height: 15,
            width: 15,
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
      if (elem === this._cy) {
        return;
      }
      if (elem.isNode()) {
        const path = elem.data("path");
        this._recordSelected.emit(path);
      }
    });

    // Register document handler
    this._recordManager = recordManager;
    recordManager.recordsChanged.connect((_, docs) => {
      this._updateElements();
      this._updateLayout();
    });
  }

  private _activeNodes: NodeCollection | null = null;

  private _currentRecordPath: string = "";

  // Get path of current document
  get currentRecordPath(): string {
    return this._currentRecordPath;
  }

  // Set path of current document
  set currentRecordPath(path: string) {
    this._currentRecordPath = path;

    this._cy.batch(() => {
      // Cleanup existing selection
      if (this._activeNodes !== null) {
        this._activeNodes
          .removeClass("active-document")
          .connectedEdges()
          .removeClass("active-link")
          .removeClass("active-backlink");
      }

      // Store new selection
      this._activeNodes = this._cy
        .filter((elem, i, eles) => {
          return elem.isNode() && elem.data("path") === path;
        })
        .addClass("active-document");
      this._activeNodes.outgoers().addClass("active-link");
      this._activeNodes.incomers().addClass("active-backlink");
    });
  }

  // Update graph layout
  private _updateLayout() {
    this._cy.fit();
    this._cy.layout({ name: "cose" }).run();
  }

  private _labelLength: number = 32;
  private _truncateLabel(label: string): string {
    if (label.length > this._labelLength) {
      return label.substr(0, this._labelLength) + "…";
    }
    return label;
  }

  // Update graph data
  private _updateElements() {
    const records = this._recordManager.records;

    let nodes: ElementDefinition[] = [];
    let validURIs: string[] = [];

    Object.values(records).forEach((record) => {
      validURIs.push(record.uri);
    });

    Object.values(records).forEach((record) => {
      nodes.push(<ElementDefinition>{
        data: <ElementDataDefinition>{
          id: record.uri,
          label: this._truncateLabel(record.name),
          path: record.path,
        },
      });

      record.links.forEach((link) => {
        if (!validURIs.includes(link.uri)) {
          return;
        }
        nodes.push(<ElementDefinition>{
          data: <ElementDataDefinition>{
            id: `${record.uri}-${link.uri}`,
            source: record.uri,
            target: link.uri,
            label: "",
          },
        });
      });
    });

    this._cy.json({ elements: nodes });
  }
  /**
   * Handle update requests for the widget.
   */
  async onUpdateRequest(msg: Message): Promise<void> {}
}
