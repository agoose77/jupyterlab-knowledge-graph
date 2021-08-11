import { ISignal, Signal } from "@lumino/signaling";

export interface Link {
  name: string;
  uri: string;
}

export interface Document {
  name: string;
  uri: string;
  path: string;
  links: Link[];
}

export interface DocumentMap {
  [uri: string]: Document;
}

export class DocumentRegistry {

  private _documentsChanged = new Signal<this, DocumentMap>(this);

  get documentsChanged(): ISignal<this, DocumentMap> {
    return this._documentsChanged;
  }
  private _documents: DocumentMap = {};
  get documents() {
    return this._documents;
  }

  add(document: Document) {
    this._documents[document.uri] = document;

    // Notify observers
    this._documentsChanged.emit(this._documents);

    return document;
  }

  remove(document: Document) {
    delete this._documents[document.uri];

    // Notify observers
    this._documentsChanged.emit(this._documents);
  }
}
