export function shouldCommitTextInputChange(isComposing: boolean, nativeIsComposing: boolean): boolean {
  return !isComposing && !nativeIsComposing
}

export function toOptionalTextValue(value: string): string | undefined {
  return value.trim() ? value : undefined
}
