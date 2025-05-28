// Version 2: bumped DB version to force object-store creation
export class EventEmitter {
  constructor(){ this.listeners={}; }
  on(evt, fn){ (this.listeners[evt]||=[]).push(fn); }
  emit(evt, ...args){ (this.listeners[evt]||[]).forEach(fn=>fn(...args)); }
}

class ReaderState extends EventEmitter {
  constructor(){ super(); this.state={currentLocationIndex:0,totalLocationCount:0}; this._load(); }
  get(){ return this.state; }
  set(upd){ this.state={...this.state,...upd}; this._persist(); this.emit('change',this.state); }
  _persist(){
    const req=indexedDB.open('readerDB',2);
    req.onupgradeneeded=e=>e.target.result.createObjectStore('state');
    req.onsuccess=()=>{ const db=req.result; db.transaction('state','readwrite').objectStore('state').put(this.state,'readerState'); };
  }
  _load(){
    const req=indexedDB.open('readerDB',2);
    req.onupgradeneeded=e=>e.target.result.createObjectStore('state');
    req.onsuccess=()=>{ const db=req.result; const tx=db.transaction('state','readonly'); tx.objectStore('state').get('readerState').onsuccess=e=>{ if(e.target.result) this.state=e.target.result; this.emit('change',this.state);} };
  }
}

export const readerState=new ReaderState();