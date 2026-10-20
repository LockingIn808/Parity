const express = require("express");
const supabase = require("./supabase");
const { getFigmaFileKey } = require("./figma");

const app = express();
app.use(express.json());

async function requireUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const token = authHeader.substring(7);

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

app.get("/", (req, res) => {
  res.send("Parity backend is running");
});

app.get("/me", requireUser, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    name:
      req.user.user_metadata?.full_name ||
      req.user.user_metadata?.user_name ||
      req.user.email,
    avatar_url: req.user.user_metadata?.avatar_url || null,
  });
});

app.get("/figma-projects", requireUser, async (req, res) => {
  const { data, error } = await supabase
    .from("figma_projects")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.post("/figma-projects", requireUser, async (req, res) => {
  const {
    file_url,
    file_name,
    selected_frame_id,
    cached_properties,
  } = req.body;

  const file_key = getFigmaFileKey(file_url);

  if (!file_url || !file_key) {
    return res.status(400).json({
      error: "A valid Figma URL is required",
    });
  }

  const { data, error } = await supabase
    .from("figma_projects")
    .upsert(
      {
        user_id: req.user.id,
        file_key,
        file_url,
        file_name,
        selected_frame_id,
        cached_properties,
        last_fetched_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,file_key",
      }
    )
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
});

app.listen(3000, () => {
  console.log("Parity backend running on port 3000");
});