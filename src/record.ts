import { ISignal, Signal } from "@lumino/signaling";

export interface Link {
  name: string;
  uri: string;
}

export interface Record {
  name: string;
  uri: string;
  path: string;
  links: Link[];
}

export interface RecordMap {
  [uri: string]: Record;
}

export class RecordManager {

  private _recordsChanged = new Signal<this, RecordMap>(this);

  get recordsChanged(): ISignal<this, RecordMap> {
    return this._recordsChanged;
  }
  private _records: RecordMap = {};
  get records() {
    return this._records;
  }

  add(record: Record) {
    this._records[record.uri] = record;

    // Notify observers
    this._recordsChanged.emit(this._records);

    return record;
  }

  remove(record: Record) {
    delete this._records[record.uri];

    // Notify observers
    this._recordsChanged.emit(this._records);
  }
}
