/** Face-up market / shop slot helpers. */

/** Fill empty string slots by calling `draw` for each gap. */
export function refillEmptySlots(
  slots: string[],
  draw: (faceUpCardIds: string[]) => string,
  cardIdOf: (instanceId: string) => string | undefined,
): void {
  const faceUp: string[] = [];
  for (const instanceId of slots) {
    if (!instanceId) continue;
    const cardId = cardIdOf(instanceId);
    if (cardId) faceUp.push(cardId);
  }
  for (let i = 0; i < slots.length; i += 1) {
    if (slots[i]) continue;
    const instanceId = draw(faceUp);
    if (!instanceId) continue;
    slots[i] = instanceId;
    const cardId = cardIdOf(instanceId);
    if (cardId) faceUp.push(cardId);
  }
}
