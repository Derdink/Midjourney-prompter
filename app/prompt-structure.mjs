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
    ? "Full-body head-to-toe view with both feet visible."
    : "";
}

export function combineNoTags(...tagGroups) {
  return [
    ...new Set(
      tagGroups
        .flatMap((group) => group.split(","))
        .map((tag) => tag.trim())
        .filter(Boolean)
    ),
  ].join(", ");
}
