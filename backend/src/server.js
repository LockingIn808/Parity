const express = require("express");
const supabase = require("./supabase");

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
    file_key,
    file_url,
    file_name,
    selected_frame_id,
    cached_properties,
  } = req.body;

  if (!file_key || !file_url) {
    return res.status(400).json({
      error: "file_key and file_url are required",
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