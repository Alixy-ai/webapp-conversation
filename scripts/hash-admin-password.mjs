#!/usr/bin/env node
import { randomBytes, scryptSync } from 'node:crypto'

const password = process.argv[2]
if (!password) {
  console.error('usage: node scripts/hash-admin-password.mjs <password>')
  process.exit(1)
}

const salt = randomBytes(16).toString('hex')
const hash = scryptSync(password, salt, 64).toString('hex')
console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt}:${hash}`)
