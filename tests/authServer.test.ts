import test from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, validatePassword, verifyPassword } from '../server/auth.ts'

test('hashPassword stores a salted hash instead of the raw password', () => {
  const authFile = hashPassword('correct horse battery staple', 'fixed-salt')

  assert.equal(authFile.version, 1)
  assert.equal(authFile.salt, 'fixed-salt')
  assert.notEqual(authFile.passwordHash, 'correct horse battery staple')
  assert.equal(verifyPassword('correct horse battery staple', authFile), true)
  assert.equal(verifyPassword('wrong password', authFile), false)
})

test('validatePassword enforces length bounds', () => {
  assert.equal(validatePassword('1234567'), '密码至少需要 8 个字符')
  assert.equal(validatePassword('a'.repeat(129)), '密码不能超过 128 个字符')
  assert.equal(validatePassword('12345678'), null)
})
