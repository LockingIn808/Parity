function getFigmaFileKey(figmaUrl) {
  try {
    const url = new URL(figmaUrl);

    if (
      url.hostname !== "figma.com" &&
      url.hostname !== "www.figma.com"
    ) {
      return null;
    }

    const parts = url.pathname.split("/").filter(Boolean);

    const validTypes = ["file", "design", "proto", "board"];
    const typeIndex = parts.findIndex((part) =>
      validTypes.includes(part)
    );

    if (typeIndex === -1 || !parts[typeIndex + 1]) {
      return null;
    }

    return parts[typeIndex + 1];
  } catch {
    return null;
  }
}

module.exports = { getFigmaFileKey };