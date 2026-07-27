/**
 * Keep the primary character together and ahead of every additional character.
 * Exact duplicate sentences are removed while preserving their first occurrence.
 */
export function buildCharacterBlock(primaryParts, groupIntroduction, additionalCharacters) {
  return [...new Set([...primaryParts, groupIntroduction, ...additionalCharacters].filter(Boolean))].join(
    " "
  );
}

export function compositionFraming(composition) {
  return composition === "Full-body character"
    ? "Full-length head-to-toe framing, the entire character visible from the top of the head to both feet, both feet fully inside the frame, no cropping."
    : "";
}
