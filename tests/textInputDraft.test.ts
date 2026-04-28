import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldCommitTextInputChange, toOptionalTextValue } from '../src/components/multiview/textInputDraft.ts'

test('text input changes are not committed while IME composition is active', () => {
  assert.equal(shouldCommitTextInputChange(true, false), false)
  assert.equal(shouldCommitTextInputChange(false, true), false)
  assert.equal(shouldCommitTextInputChange(false, false), true)
})

test('optional text values trim empty drafts to undefined', () => {
  assert.equal(toOptionalTextValue(''), undefined)
  assert.equal(toOptionalTextValue('   '), undefined)
  assert.equal(toOptionalTextValue('是否'), '是否')
})
