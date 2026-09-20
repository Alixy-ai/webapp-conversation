/**
 * Minimal typings for `node:sqlite` (Node >= 22.5) until `@types/node` is
 * upgraded from the pinned v18 — the runtime supports it, only the types are
 * missing. Remove this file once `@types/node` ships the module.
 */
declare module 'node:sqlite' {
  interface StatementResultingChanges {
    changes: number
    lastInsertRowid: number | bigint
  }

  interface StatementSync {
    all: (...params: any[]) => unknown[]
    get: (...params: any[]) => unknown
    run: (...params: any[]) => StatementResultingChanges
  }

  export class DatabaseSync {
    constructor(path: string, options?: { open?: boolean, readOnly?: boolean })
    exec: (sql: string) => void
    prepare: (sql: string) => StatementSync
    close: () => void
  }
}
