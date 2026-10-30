const clone = value => value === undefined ? undefined : structuredClone(value);

class FakeFirestore {
  constructor() { this.values = new Map(); this.tail = Promise.resolve(); this.next = 0; }
  snapshot(path) { const value = clone(this.values.get(path)); return { id: path.split('/').pop(), exists: value !== undefined, data: () => clone(value) }; }
  doc(path) {
    return { path, get: async () => this.snapshot(path), set: async (value, options) => { this.values.set(path, options?.merge ? { ...this.values.get(path), ...clone(value) } : clone(value)); }, update: async value => { if (!this.values.has(path)) throw new Error('Missing document'); this.values.set(path, { ...this.values.get(path), ...clone(value) }); }, delete: async () => { this.values.delete(path); } };
  }
  collection(name) {
    const database = this;
    const query = (filters = [], orders = [], maximum = Infinity, cursor = '') => ({
      doc: id => database.doc(`${name}/${id}`),
      add: value => database.doc(`${name}/audit-${++database.next}`).set(value),
      where: (field, operator, value) => query([...filters, { field, operator, value }], orders, maximum, cursor),
      orderBy: field => query(filters, [...orders, field], maximum, cursor),
      limit: value => query(filters, orders, value, cursor),
      startAfter: snapshot => query(filters, orders, maximum, snapshot.id),
      async get() {
        let docs = [...database.values.keys()].filter(path => path.startsWith(`${name}/`) && path.split('/').length === 2).map(path => database.snapshot(path));
        docs = docs.filter(document => filters.every(({ field, operator, value }) => operator === '==' ? document.data()[field] === value : operator === 'in' ? value.includes(document.data()[field]) : document.data()[field] <= value));
        docs.sort((first, second) => {
          for (const field of orders) { const left = field === '__name__' ? first.id : first.data()[field]; const right = field === '__name__' ? second.id : second.data()[field]; if (left !== right) return left < right ? -1 : 1; }
          return first.id.localeCompare(second.id);
        });
        if (cursor) docs = docs.slice(docs.findIndex(document => document.id === cursor) + 1);
        docs = docs.slice(0, maximum);
        return { docs, size: docs.length, empty: !docs.length };
      }
    });
    return query();
  }
  getAll(...references) { return Promise.all(references.map(reference => reference.get())); }
  runTransaction(operation) {
    const transaction = this.tail.then(async () => {
      const writes = [];
      const result = await operation({ get: reference => reference.get(), set: (reference, value, options) => writes.push(() => reference.set(value, options)), update: (reference, value) => writes.push(() => reference.update(value)), delete: reference => writes.push(() => reference.delete()) });
      for (const write of writes) await write();
      return result;
    });
    this.tail = transaction.catch(() => {});
    return transaction;
  }
}

module.exports = { FakeFirestore };
