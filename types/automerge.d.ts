declare module 'automerge' {
  //
  // Automerge basic interfaces & types
  //
  interface Doc {
    addToSet: (docSet: DocSet) => void;
    removeFromSet: (docSet: DocSet) => void;
  }
  interface Deps {
    [s: string]: number;
  }
  interface MutableDoc {
    [s: string]: number;
  }
  interface Op<T = any> {
    action: string;
    obj: string;
    key: string;
    value: T;
  }
  interface Change {
    actor: string;
    ops: Op[];
    seq: number;
    deps: Deps;
    message?: string;
  }
  type Generator = () => string;
  interface UUID {
    setFactory: (generator: Generator) => void;
  }
  interface History<T = any> {
    change: Change;
    snapshot: T;
  }
  //
  // Autmerge methods
  //
  // .uuid
  export let uuid: UUID;
  // .load
  type load = (doc: string) => Doc;
  export let load: load;
  // .init
  type init = () => Doc;
  export let init: init;
  // .change
  type change = {
    (doc: Doc, message: string | undefined, handler: ChangeHandler): Doc;
    (doc: Doc, handler: ChangeHandler): Doc;
  };
  type ChangeHandler = (doc: MutableDoc) => void;
  export let change: change;
  // .getChanges
  type getChanges = (oldDoc: Doc, newDoc: Doc) => Change[];
  export let getChanges: getChanges;
  // .save
  type save = (doc: Doc) => string;
  export let save: save;
  // .getHistory
  type getHistory = (doc: Doc) => History[];
  export let getHistory: getHistory;
  // .equals
  type equals = (val: any, otherVal: any) => boolean;
  export let equals: equals;
  // .applyChanges
  type applyChanges = (doc: Doc, changes: Change[]) => Doc;
  export let applyChanges: applyChanges;
  // .diff
  type diff = (oldDoc: Doc, newDoc: Doc) => Change[];
  export let diff: diff;
  // .emptyChange
  type emptyChange = (doc: Doc, message?: string) => Doc;
  export let emptyChange: emptyChange;
  // .merge
  type merge = (oldDoc: Doc, newDoc: Doc) => Doc;
  export let merge: merge;
  // .getMissingDeps
  type getMissingDeps = (doc: Doc) => Deps;
  export let getMissingDeps: getMissingDeps;
  // .undo
  type undo = (doc: Doc, message?: string) => Doc;
  export let undo: undo;
  // .undo
  type redo = (doc: Doc, message?: string) => Doc;
  export let redo: redo;
  //
  // Connection
  //
  interface Clock {
    [s: string]: number;
  }
  interface ConnectionMsg {
    docId: string;
    clock: Clock;
    changes: Change[];
  }
  type sendMsg = (data: ConnectionMsg) => void;
  export class Connection {
    constructor(docSet: DocSet, sendMsg: sendMsg);
    receiveMsg: (data: ConnectionMsg) => void;
    sendMsg: (docId: string, clock: Clock, change: Change[]) => void;
    open: () => void;
    close: () => void;
    maybeSendChanges: (docId: string) => void;
    docChanged: (docId: string, doc: Doc) => void;
  }
  //
  // DocSet
  //
  type docSetHandler = (id: string, doc: Doc) => void;
  export class DocSet {
    setDoc: (docId: string, doc: Doc) => void;
    getDoc: (docId: string) => Doc;
    registerHandler: (handler: docSetHandler) => void;
    unregisterHandler: (handler: docSetHandler) => void;
    docIds: () => string[];
    applyChanges: (docId: string, changes: Change[]) => Doc;
  }
  //
  // WatchableDoc
  //
  type watchableDocHandler = (id: string, doc: Doc) => void;
  export class WatchableDoc {
    constructor(doc: Doc);
    get: () => Doc;
    set: (doc: Doc) => void;
    applyChanges: (changes: Change[]) => Doc;
    registerHandler: (handler: watchableDocHandler) => void;
    unregisterHandler: (handler: watchableDocHandler) => void;
  }
}
