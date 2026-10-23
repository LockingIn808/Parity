const FIGMA_API_BASE = "https://api.figma.com/v1";

function parseFigmaUrl(input) {
  if (typeof input !== "string" || !input.trim()) {
    return null;
  }

  const raw = input.trim();
  const value = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let url;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (!/(^|\.)figma\.com$/i.test(url.hostname)) {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const validTypes = new Set([
    "file",
    "design",
    "proto",
    "board",
    "slides",
    "make",
  ]);

  const typeIndex = parts.findIndex((part) => validTypes.has(part.toLowerCase()));

  if (typeIndex === -1 || !parts[typeIndex + 1]) {
    return null;
  }

  const fileKey = parts[typeIndex + 1];
  const rawName = parts[typeIndex + 2] || "";
  const fileName = rawName
    ? decodeURIComponent(rawName).replace(/[-_+]+/g, " ").trim()
    : null;

  const rawNodeId = url.searchParams.get("node-id");
  const nodeId = rawNodeId ? rawNodeId.replace(/-/g, ":") : null;

  return {
    fileKey,
    fileName,
    nodeId,
  };
}

function getFigmaFileKey(figmaUrl) {
  return parseFigmaUrl(figmaUrl)?.fileKey || null;
}

function getFigmaToken() {
  const token = process.env.FIGMA_ACCESS_TOKEN;

  if (!token) {
    const error = new Error("FIGMA_ACCESS_TOKEN is not configured");
    error.code = "FIGMA_NOT_CONFIGURED";
    throw error;
  }

  return token;
}

async function figmaRequest(path, query = {}) {
  const url = new URL(`${FIGMA_API_BASE}${path}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Figma-Token": getFigmaToken(),
      Accept: "application/json",
    },
  });

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const message =
      data?.err ||
      data?.message ||
      `Figma request failed with status ${response.status}`;

    const error = new Error(message);
    error.code = "FIGMA_API_ERROR";
    error.status = response.status;
    throw error;
  }

  return data;
}

async function fetchFigmaFile(fileKey, options = {}) {
  if (!fileKey) {
    throw new Error("A Figma file key is required");
  }

  const query = {};

  if (options.depth !== undefined) {
    query.depth = options.depth;
  }

  if (Array.isArray(options.ids) && options.ids.length > 0) {
    query.ids = options.ids.join(",");
  }

  return figmaRequest(`/files/${encodeURIComponent(fileKey)}`, query);
}

async function fetchFigmaFileSummary(fileKey) {
  return fetchFigmaFile(fileKey, { depth: 2 });
}

async function fetchFigmaNodes(fileKey, nodeIds, options = {}) {
  if (!fileKey) {
    throw new Error("A Figma file key is required");
  }

  if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
    throw new Error("At least one Figma node ID is required");
  }

  const query = {
    ids: nodeIds.join(","),
  };

  if (options.depth !== undefined) {
    query.depth = options.depth;
  }

  return figmaRequest(
    `/files/${encodeURIComponent(fileKey)}/nodes`,
    query
  );
}

function extractFrames(figmaFile) {
  const frames = [];

  for (const page of figmaFile?.document?.children || []) {
    for (const node of page.children || []) {
      frames.push({
        id: node.id,
        name: node.name || "Untitled",
        type: node.type,
        page_id: page.id,
        page_name: page.name || "Untitled page",
        width: node.absoluteBoundingBox?.width ?? null,
        height: node.absoluteBoundingBox?.height ?? null,
      });
    }
  }

  return frames;
}

function channelToHex(value) {
  const channel = Math.max(0, Math.min(255, Math.round((value ?? 0) * 255)));
  return channel.toString(16).padStart(2, "0");
}

function colorToHex(color) {
  if (!color) {
    return null;
  }

  return `#${channelToHex(color.r)}${channelToHex(color.g)}${channelToHex(
    color.b
  )}`.toUpperCase();
}

function firstSolidFill(fills) {
  if (!Array.isArray(fills)) {
    return null;
  }

  const fill = fills.find(
    (item) =>
      item &&
      item.type === "SOLID" &&
      item.visible !== false &&
      item.color
  );

  return fill ? colorToHex(fill.color) : null;
}

function average(values) {
  const valid = values.filter(
    (value) => typeof value === "number" && Number.isFinite(value)
  );

  if (valid.length === 0) {
    return null;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function normalizeNode(node, parentId = null, frameId = null) {
  const bounds = node.absoluteBoundingBox || null;
  const style = node.style || {};

  const paddingTop =
    typeof node.paddingTop === "number" ? node.paddingTop : null;
  const paddingRight =
    typeof node.paddingRight === "number" ? node.paddingRight : null;
  const paddingBottom =
    typeof node.paddingBottom === "number" ? node.paddingBottom : null;
  const paddingLeft =
    typeof node.paddingLeft === "number" ? node.paddingLeft : null;

  return {
    id: node.id,
    parent_id: parentId,
    frame_id: frameId,
    name: node.name || "",
    type: node.type || "",
    text: typeof node.characters === "string" ? node.characters : null,
    visible: node.visible !== false,
    opacity:
      typeof node.opacity === "number" ? node.opacity : 1,
    font_family:
      typeof style.fontFamily === "string" ? style.fontFamily : null,
    font_size:
      typeof style.fontSize === "number" ? style.fontSize : null,
    font_weight:
      typeof style.fontWeight === "number" ? style.fontWeight : null,
    line_height:
      typeof style.lineHeightPx === "number" ? style.lineHeightPx : null,
    letter_spacing:
      typeof style.letterSpacing === "number" ? style.letterSpacing : null,
    color:
      node.type === "TEXT" ? firstSolidFill(node.fills) : null,
    background:
      node.type !== "TEXT" ? firstSolidFill(node.fills) : null,
    width:
      typeof bounds?.width === "number" ? bounds.width : null,
    height:
      typeof bounds?.height === "number" ? bounds.height : null,
    x:
      typeof bounds?.x === "number" ? bounds.x : null,
    y:
      typeof bounds?.y === "number" ? bounds.y : null,
    padding: average([
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
    ]),
    padding_top: paddingTop,
    padding_right: paddingRight,
    padding_bottom: paddingBottom,
    padding_left: paddingLeft,
    gap:
      typeof node.itemSpacing === "number" ? node.itemSpacing : null,
    corner_radius:
      typeof node.cornerRadius === "number" ? node.cornerRadius : null,
    layout_mode:
      typeof node.layoutMode === "string" ? node.layoutMode : null,
  };
}

function flattenNodeTree(rootNode) {
  const nodes = [];

  function visit(node, parentId, frameId) {
    if (!node || !node.id) {
      return;
    }

    const currentFrameId =
      frameId ||
      (["FRAME", "COMPONENT", "COMPONENT_SET", "SECTION"].includes(node.type)
        ? node.id
        : null);

    nodes.push(normalizeNode(node, parentId, currentFrameId));

    for (const child of node.children || []) {
      visit(child, node.id, currentFrameId);
    }
  }

  visit(rootNode, null, rootNode?.id || null);

  return nodes;
}

function normalizeFetchedNode(figmaNodesResponse, nodeId) {
  const entry = figmaNodesResponse?.nodes?.[nodeId];

  if (!entry?.document) {
    return null;
  }

  return {
    id: nodeId,
    nodes: flattenNodeTree(entry.document),
  };
}

module.exports = {
  parseFigmaUrl,
  getFigmaFileKey,
  fetchFigmaFile,
  fetchFigmaFileSummary,
  fetchFigmaNodes,
  extractFrames,
  normalizeNode,
  flattenNodeTree,
  normalizeFetchedNode,
};