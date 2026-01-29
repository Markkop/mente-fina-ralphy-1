import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Dexie, { type Table } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'

// Test interface for a simple table
interface TestItem {
  id?: number
  name: string
  value: number
}

// Test database class
class TestDatabase extends Dexie {
  items!: Table<TestItem>

  constructor() {
    super('TestDatabase')
    this.version(1).stores({
      items: '++id, name, value',
    })
  }
}

describe('Dexie', () => {
  let db: TestDatabase

  beforeEach(() => {
    db = new TestDatabase()
  })

  afterEach(async () => {
    await db.delete()
  })

  it('can be imported', () => {
    expect(Dexie).toBeDefined()
  })

  it('can create a database instance', () => {
    expect(db).toBeInstanceOf(Dexie)
    expect(db.name).toBe('TestDatabase')
  })

  it('can define tables with schema', () => {
    expect(db.items).toBeDefined()
  })

  it('can add items to a table', async () => {
    const id = await db.items.add({ name: 'Test Item', value: 42 })
    expect(id).toBeDefined()
    expect(typeof id).toBe('number')
  })

  it('can retrieve items from a table', async () => {
    await db.items.add({ name: 'Test Item', value: 42 })
    
    const items = await db.items.toArray()
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('Test Item')
    expect(items[0].value).toBe(42)
  })

  it('can get an item by id', async () => {
    const id = await db.items.add({ name: 'Test Item', value: 42 })
    
    const item = await db.items.get(id)
    expect(item).toBeDefined()
    expect(item?.name).toBe('Test Item')
  })

  it('can update an item', async () => {
    const id = await db.items.add({ name: 'Test Item', value: 42 })
    
    await db.items.update(id, { value: 100 })
    
    const item = await db.items.get(id)
    expect(item?.value).toBe(100)
  })

  it('can delete an item', async () => {
    const id = await db.items.add({ name: 'Test Item', value: 42 })
    
    await db.items.delete(id)
    
    const item = await db.items.get(id)
    expect(item).toBeUndefined()
  })

  it('can query items with where clause', async () => {
    await db.items.bulkAdd([
      { name: 'Item A', value: 10 },
      { name: 'Item B', value: 20 },
      { name: 'Item C', value: 30 },
    ])

    const items = await db.items.where('value').above(15).toArray()
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.name)).toContain('Item B')
    expect(items.map((i) => i.name)).toContain('Item C')
  })

  it('can perform bulk operations', async () => {
    const lastKey = await db.items.bulkAdd([
      { name: 'Item 1', value: 1 },
      { name: 'Item 2', value: 2 },
      { name: 'Item 3', value: 3 },
    ])

    // bulkAdd returns the last auto-incremented key
    expect(lastKey).toBeDefined()
    expect(typeof lastKey).toBe('number')

    const count = await db.items.count()
    expect(count).toBe(3)
  })

  it('can clear a table', async () => {
    await db.items.bulkAdd([
      { name: 'Item 1', value: 1 },
      { name: 'Item 2', value: 2 },
    ])

    await db.items.clear()

    const count = await db.items.count()
    expect(count).toBe(0)
  })

  it('supports transactions', async () => {
    await db.transaction('rw', db.items, async () => {
      await db.items.add({ name: 'Transaction Item', value: 999 })
      const count = await db.items.count()
      expect(count).toBe(1)
    })

    const items = await db.items.toArray()
    expect(items).toHaveLength(1)
  })
})

describe('dexie-react-hooks', () => {
  it('exports useLiveQuery hook', () => {
    expect(useLiveQuery).toBeDefined()
    expect(typeof useLiveQuery).toBe('function')
  })
})
