/** Read `data-sol-drop` from the element under the pointer (or an ancestor). */
export function findSolDropTarget(clientX: number, clientY: number): string | null {
  const hit = document.elementFromPoint(clientX, clientY);
  if (!hit) return null;
  const zone = hit.closest<HTMLElement>('[data-sol-drop]');
  return zone?.dataset.solDrop ?? null;
}
