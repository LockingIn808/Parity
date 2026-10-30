const express = require("express");
const cors = require("cors");
const supabase = require("./supabase");
const { compareElement } = require("./compare");
const {
  scoreAccessibility,
  getAccessibilityIssues,
} = require("./accessibility");
const {
  parseFigmaUrl,
  fetchFigmaFileSummary,
  fetchFigmaNodes,
  extractFrames,
  normalizeFetchedNode,
} = require("./figma");

const {
  validateFigmaProjectBody,
  validateFrameBody,
  validateCompareBody,
} = require("./validation");

// AI explanations (./ai/explainResults, Gemini) are intentionally no longer called from
// the comparison route: the panel's AI area was replaced by Figma connection history.
// The module and its test are kept so the work is not lost.
const githubRoutes = require("./changes/routes");
const { contrast } = require("./changes/contrast");
const {
  commitFixesFromCss,
} = require("./changes/fixes");

const app = express();
const port = process.env.PORT || 3000;

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (origin.startsWith("chrome-extension://")) {
        return callback(null, true);
      }

      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }

      if (configuredOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-GitHub-Token",
    ],
    methods: [
      "GET",
      "POST",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
  })
);

app.use(express.json({ limit: "2mb" }));

// Columns the panel needs for history and frame selection. cached_properties (every
// node in the selected frame) stays server-side; it can be large and the panel never reads it.
const PROJECT_FIELDS =
  "id,file_key,file_url,file_name,selected_frame_id,selected_frame_name,frames,last_fetched_at,created_at,updated_at";
const HISTORY_FIELDS =
  "id,file_key,file_url,file_name,selected_frame_id,selected_frame_name,created_at,updated_at";

function publicProject(row) {
  if (!row) return row;
  const { cached_properties, user_id, ...rest } = row;
  return rest;
}

async function requireUser(req, res, next) {
  if (!supabase) {
    return res.status(503).json({
      error:
        "The Parity backend is running but Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in backend/.env and restart it.",
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const token = authHeader.slice(7);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Invalid login" });
  }

  req.user = user;
  next();
}

async function getUserProject(projectId, userId) {
  const { data, error } = await supabase
    .from("figma_projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function sendFigmaError(res, error) {
  if (error.code === "FIGMA_NOT_CONFIGURED") {
    return res.status(500).json({ error: error.message });
  }

  if (error.code === "FIGMA_API_ERROR") {
    if (error.status === 401 || error.status === 403) {
      return res.status(502).json({
        error: "Figma rejected the request. Check the file access and Figma token.",
      });
    }

    if (error.status === 404) {
      return res.status(404).json({
        error: "The Figma file or node could not be found.",
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: "Figma rate limit reached. Try again later.",
      });
    }

    return res.status(502).json({
      error: error.message,
    });
  }

  return res.status(500).json({
    error: error.message || "Unexpected server error",
  });
}

app.get("/", (req, res) => {
  res.send("Parity backend is running");
});

app.get("/health", (req, res) => {
  // Booleans only: never echo secret values.
  res.json({
    status: "ok",
    service: "parity-backend",
    supabase_configured: Boolean(supabase),
    figma_configured: Boolean(process.env.FIGMA_ACCESS_TOKEN),
  });
});

app.get("/me", requireUser, (req, res) => {
  const metadata = req.user.user_metadata || {};

  res.json({
    id: req.user.id,
    email: req.user.email || null,
    username:
      metadata.user_name ||
      metadata.preferred_username ||
      metadata.name ||
      null,
    avatar_url: metadata.avatar_url || null,
    provider: req.user.app_metadata?.provider || null,
  });
});

app.get("/figma-projects", requireUser, async (req, res) => {
  // Recent Figma history: newest use first. updated_at is bumped by the DB trigger on every
  // connect, frame change, refresh and reopen, so it doubles as "last used".
  const { data, error } = await supabase
    .from("figma_projects")
    .select(HISTORY_FIELDS)
    .eq("user_id", req.user.id)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// Reopen a project from history without re-entering the URL or calling Figma again.
app.post("/figma-projects/:id/open", requireUser, async (req, res) => {
  const { data, error } = await supabase
    .from("figma_projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select(PROJECT_FIELDS)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: "Project not found" });
  }

  res.json(data);
});

// Layers inside the selected frame, so the panel can let the user pick the matching
// Figma layer by hand when automatic matching guesses wrong.
app.get("/figma-projects/:id/nodes", requireUser, async (req, res) => {
  try {
    const project = await getUserProject(req.params.id, req.user.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (!project.selected_frame_id) {
      return res.status(400).json({ error: "Select a Figma frame first" });
    }

    let nodes = Array.isArray(project.cached_properties?.nodes)
      ? project.cached_properties.nodes
      : [];

    if (nodes.length === 0) {
      const nodeResponse = await fetchFigmaNodes(project.file_key, [project.selected_frame_id]);
      const cachedProperties = normalizeFetchedNode(nodeResponse, project.selected_frame_id) || {};
      nodes = cachedProperties.nodes || [];

      if (nodes.length > 0) {
        await supabase
          .from("figma_projects")
          .update({ cached_properties: cachedProperties, last_fetched_at: new Date().toISOString() })
          .eq("id", project.id)
          .eq("user_id", req.user.id);
      }
    }

    res.json(
      nodes
        .filter((node) => node.visible !== false)
        .map((node) => ({
          id: node.id,
          name: node.name,
          type: node.type,
          text: node.text ? String(node.text).slice(0, 60) : null,
          parent_id: node.parent_id,
        }))
    );
  } catch (error) {
    return sendFigmaError(res, error);
  }
});

app.get("/figma-projects/:id", requireUser, async (req, res) => {
  try {
    const project = await getUserProject(req.params.id, req.user.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(publicProject(project));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/figma-projects", requireUser, async (req, res) => {
  const validationError = validateFigmaProjectBody(req.body);

  if (validationError) {
    return res.status(400).json({
      error: validationError,
    });
  }

  const { file_url } = req.body;

  const parsed = parseFigmaUrl(file_url);

  if (!parsed) {
    return res.status(400).json({
      error: "A valid Figma URL is required",
    });
  }

  try {
    const figmaFile = await fetchFigmaFileSummary(parsed.fileKey);
    const frames = extractFrames(figmaFile);

    const { data: existing, error: existingError } = await supabase
      .from("figma_projects")
      .select("*")
      .eq("user_id", req.user.id)
      .eq("file_key", parsed.fileKey)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({
        error: existingError.message,
      });
    }

    let selectedFrame = null;

    if (parsed.nodeId) {
      selectedFrame =
        frames.find((frame) => frame.id === parsed.nodeId) || null;
    }

    if (!selectedFrame && existing?.selected_frame_id) {
      selectedFrame =
        frames.find(
          (frame) => frame.id === existing.selected_frame_id
        ) || null;
    }

    let cachedProperties = {};

    if (selectedFrame) {
      const nodeResponse = await fetchFigmaNodes(
        parsed.fileKey,
        [selectedFrame.id]
      );

      cachedProperties =
        normalizeFetchedNode(nodeResponse, selectedFrame.id) || {};
    }

    const projectData = {
      user_id: req.user.id,
      file_key: parsed.fileKey,
      file_url,
      file_name: figmaFile.name || parsed.fileName || null,
      selected_frame_id: selectedFrame?.id || null,
      selected_frame_name: selectedFrame?.name || null,
      figma_version: figmaFile.version || null,
      frames,
      cached_properties: cachedProperties,
      last_modified_at: figmaFile.lastModified || null,
      last_fetched_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("figma_projects")
      .upsert(projectData, {
        onConflict: "user_id,file_key",
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(existing ? 200 : 201).json(publicProject(data));
  } catch (error) {
    return sendFigmaError(res, error);
  }
});

app.get(
  "/figma-projects/:id/frames",
  requireUser,
  async (req, res) => {
    try {
      const project = await getUserProject(
        req.params.id,
        req.user.id
      );

      if (!project) {
        return res.status(404).json({
          error: "Project not found",
        });
      }

      res.json(project.frames || []);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.patch(
  "/figma-projects/:id/frame",
  requireUser,
  async (req, res) => {
    const validationError = validateFrameBody(req.body);

    if (validationError) {
      return res.status(400).json({
        error: validationError,
      });
    }

    const { frame_id } = req.body;

    try {
      const project = await getUserProject(
        req.params.id,
        req.user.id
      );

      if (!project) {
        return res.status(404).json({
          error: "Project not found",
        });
      }

      const frame = (project.frames || []).find(
        (item) => item.id === frame_id
      );

      if (!frame) {
        return res.status(400).json({
          error: "That frame does not belong to this Figma project",
        });
      }

      const nodeResponse = await fetchFigmaNodes(
        project.file_key,
        [frame.id]
      );

      const cachedProperties =
        normalizeFetchedNode(nodeResponse, frame.id);

      if (!cachedProperties) {
        return res.status(502).json({
          error: "Figma did not return the selected frame",
        });
      }

      const { data, error } = await supabase
        .from("figma_projects")
        .update({
          selected_frame_id: frame.id,
          selected_frame_name: frame.name,
          cached_properties: cachedProperties,
          last_fetched_at: new Date().toISOString(),
        })
        .eq("id", project.id)
        .eq("user_id", req.user.id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          error: error.message,
        });
      }

      res.json(publicProject(data));
    } catch (error) {
      return sendFigmaError(res, error);
    }
  }
);

app.post(
  "/figma-projects/:id/refresh",
  requireUser,
  async (req, res) => {
    try {
      const project = await getUserProject(
        req.params.id,
        req.user.id
      );

      if (!project) {
        return res.status(404).json({
          error: "Project not found",
        });
      }

      const figmaFile = await fetchFigmaFileSummary(
        project.file_key
      );

      const frames = extractFrames(figmaFile);

      const selectedFrame = project.selected_frame_id
        ? frames.find(
            (frame) => frame.id === project.selected_frame_id
          ) || null
        : null;

      let cachedProperties = {};

      if (selectedFrame) {
        const nodeResponse = await fetchFigmaNodes(
          project.file_key,
          [selectedFrame.id]
        );

        cachedProperties =
          normalizeFetchedNode(
            nodeResponse,
            selectedFrame.id
          ) || {};
      }

      const { data, error } = await supabase
        .from("figma_projects")
        .update({
          file_name: figmaFile.name || project.file_name,
          selected_frame_id: selectedFrame?.id || null,
          selected_frame_name: selectedFrame?.name || null,
          figma_version: figmaFile.version || null,
          frames,
          cached_properties: cachedProperties,
          last_modified_at: figmaFile.lastModified || null,
          last_fetched_at: new Date().toISOString(),
        })
        .eq("id", project.id)
        .eq("user_id", req.user.id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          error: error.message,
        });
      }

      res.json(publicProject(data));
    } catch (error) {
      return sendFigmaError(res, error);
    }
  }
);

app.post("/compare/element", requireUser, async (req, res) => {
  const validationError = validateCompareBody(req.body);

  if (validationError) {
    return res.status(400).json({
      error: validationError,
    });
  }

  const {
    project_id,
    element,
    figma_node_id = null,
  } = req.body;

  try {
    const project = await getUserProject(
      project_id,
      req.user.id
    );

    if (!project) {
      return res.status(404).json({
        error: "Project not found",
      });
    }

    if (!project.selected_frame_id) {
      return res.status(400).json({
        error: "Select a Figma frame before comparing an element",
      });
    }

    let cachedProperties =
      project.cached_properties || {};

    let nodes = Array.isArray(cachedProperties.nodes)
      ? cachedProperties.nodes
      : [];

    if (nodes.length === 0) {
      const nodeResponse = await fetchFigmaNodes(
        project.file_key,
        [project.selected_frame_id]
      );

      cachedProperties =
        normalizeFetchedNode(
          nodeResponse,
          project.selected_frame_id
        ) || {};

      nodes = Array.isArray(cachedProperties.nodes)
        ? cachedProperties.nodes
        : [];

      if (nodes.length === 0) {
        return res.status(502).json({
          error: "The selected Figma frame has no nodes",
        });
      }

      const { error: cacheError } = await supabase
        .from("figma_projects")
        .update({
          cached_properties: cachedProperties,
          last_fetched_at: new Date().toISOString(),
        })
        .eq("id", project.id)
        .eq("user_id", req.user.id);

      if (cacheError) {
        return res.status(500).json({
          error: cacheError.message,
        });
      }
    }

    const result = compareElement({
      element,
      nodes,
      figmaNodeId: figma_node_id,
    });
    const accessibility =
      scoreAccessibility(element);

    const accessibilityIssues =
      getAccessibilityIssues(accessibility);

    // GitHub-commit fixes are optional extras; a value the commit validator refuses
    // must not break the comparison itself.
    let commitFixes = [];

    try {
      commitFixes = element.selector
        ? commitFixesFromCss(element.selector, result.css_fixes)
        : [];
    } catch (error) {
      console.warn("[parity] commit fixes skipped:", error.message);
    }

    res.json({
      project: {
        id: project.id,
        file_key: project.file_key,
        file_name: project.file_name,
        frame_id: project.selected_frame_id,
        frame_name: project.selected_frame_name,
      },
      element: {
        selector: element.selector || null,
        tag: element.tag || null,
        text: element.text || null,
      },
      ...result,
      accessibility_score: accessibility.total,
      accessibility_categories: accessibility.parts,
      accessibility_issues: accessibilityIssues,
      commit_fixes: commitFixes,
    });
  } catch (error) {
    if (
      error.code === "FIGMA_API_ERROR" ||
      error.code === "FIGMA_NOT_CONFIGURED"
    ) {
      return sendFigmaError(res, error);
    }

    return res.status(400).json({
      error: error.message || "Comparison failed",
    });
  }
});

app.delete("/figma-projects/:id", requireUser, async (req, res) => {
  const { data, error } = await supabase
    .from("figma_projects")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      error: "Project not found",
    });
  }

  res.status(204).end();
});

app.post("/api/contrast", (req, res) => {
  try {
    const { foreground, background } = req.body || {};
    res.json(contrast(foreground, background));
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.use("/api/github", requireUser, githubRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      error: "Invalid JSON body",
    });
  }

  console.error(error);

  return res.status(500).json({
    error: "Unexpected server error",
  });
});

app.listen(port, () => {
  console.log(`Parity backend running on port ${port}`);
});