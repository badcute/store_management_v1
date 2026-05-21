// Simple confirm wrapper : uses native confirm() but centralized so it can be replaced with a Dialog later.
export function confirmAction(message: string): boolean {
  if (typeof window === 'undefined') return false
  return window.confirm(message)
}
