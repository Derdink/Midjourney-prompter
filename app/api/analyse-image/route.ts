const compositionOptions = [
  "Character portrait",
  "Full-body character",
  "Two-character scene",
  "Party scene",
  "Creature encounter",
  "Establishing landscape",
  "Interior environment",
  "Action scene",
] as const;

const moodOptions = [
  "Unspecified",
  "Heroic",
  "Ominous",
  "Melancholic",
  "Mystical",
  "Serene",
  "Brutal",
  "Wonder",
  "Joyful",
  "Hopeful",
  "Triumphant",
  "Tense",
  "Uneasy",
  "Mysterious",
  "Ethereal",
  "Whimsical",
  "Romantic",
  "Nostalgic",
  "Desolate",
  "Dreamlike",
] as const;

const lightingOptions = [
  "Warm face light",
  "Soft frontal key light",
  "Diffused source-free light",
  "Bright diffused daylight",
  "Dim frontal light",
  "Torch or flame light",
  "Coloured ambient light",
  "Neutral face light",
] as const;

const genres = {
  Fantasy: {
    "High fantasy": ["The Lord of the Rings", "World of Warcraft"],
    "Low fantasy": ["Game of Thrones", "Mount & Blade II: Bannerlord"],
    Grimdark: ["Warhammer Fantasy", "Dark Souls"],
  },
  "Sci-fi": {
    Cyberpunk: ["Cyberpunk 2077", "Blade Runner"],
    "Space fantasy": ["Star Wars", "Destiny"],
    "Space opera": ["Mass Effect", "Dune"],
    "Hard sci-fi": ["The Expanse", "Star Citizen"],
  },
  Western: {
    "Frontier western": ["Red Dead Redemption 2", "Desperados III"],
    "Spaghetti western": ["The Dollars Trilogy", "Hard West II"],
    "Weird west": ["Hunt: Showdown", "Weird West"],
  },
  Victorian: {
    "Lovecraftian gothic": ["Bloodborne", "The Sinking City"],
    Romantic: ["The Order: 1886", "GreedFall"],
    Steampunk: ["Dishonored", "Frostpunk"],
  },
  Ancient: {
    Mythological: ["God of War", "Hades"],
    "Primal stone age": ["Far Cry Primal", "Ancestors: The Humankind Odyssey"],
    "Bronze age": ["Total War Saga: Troy", "Age of Mythology"],
    "Classical Greece": ["Assassin’s Creed Odyssey", "God of War III"],
    "Imperial Rome": ["Total War: Rome II", "Ryse: Son of Rome"],
  },
  Modern: {
    Dieselpunk: ["Iron Harvest", "Wolfenstein"],
    "Retro-futurist": ["Fallout", "Tales from the Loop"],
    Contemporary: ["The Division", "Call of Duty: Modern Warfare"],
    "Near future": ["Deus Ex", "Detroit: Become Human"],
  },
} as const;

const subgenres = Object.values(genres).flatMap((group) => Object.keys(group));
const references = Object.values(genres).flatMap((group) => Object.values(group).flat());

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "composition",
    "concept",
    "details",
    "action",
    "environment",
    "mood",
    "lightingPreset",
    "lightingColour",
    "genre",
    "subgenre",
    "visualReference",
    "ratio",
    "subjects",
  ],
  properties: {
    composition: { type: "string", enum: compositionOptions },
    concept: { type: "string" },
    details: { type: "string" },
    action: { type: "string" },
    environment: { type: "string" },
    mood: { type: "string", enum: moodOptions },
    lightingPreset: { type: "string", enum: lightingOptions },
    lightingColour: { type: "string" },
    genre: { type: "string", enum: Object.keys(genres) },
    subgenre: { type: "string", enum: subgenres },
    visualReference: { type: "string", enum: references },
    ratio: { type: "string", enum: ["1:1", "3:2", "2:3", "16:9", "9:16"] },
    subjects: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["role", "traits", "position"],
        properties: {
          role: { type: "string" },
          traits: { type: "string" },
          position: {
            type: "string",
            enum: ["left", "middle", "right", "foreground", "background"],
          },
        },
      },
    },
  },
};

function extractOutputText(payload: {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}) {
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Image analysis is not configured yet. Add the OpenAI API key to enable it." },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { image?: string; mode?: string };
    if (
      !body.image ||
      !body.image.startsWith("data:image/") ||
      body.image.length > 14_000_000
    ) {
      return Response.json({ error: "Provide a valid image smaller than 10 MB." }, { status: 400 });
    }

    const instructions =
      body.mode === "likeness"
        ? `Analyse the visible subject so a Midjourney prompt can recreate their likeness as closely as possible. Prioritise stable visible identity cues: face shape, facial features, apparent age range, skin tone, hair, build, clothing, accessories and distinguishing marks. Describe only what is visible; never identify the person or infer sensitive traits. Keep environment and action concise. Select the closest allowed composition, mood, lighting and world-language values. The first/main subject belongs in concept and details. Put only additional distinct subjects in subjects.`
        : body.mode === "copy"
          ? `Create the closest possible text-only Midjourney reconstruction of this image, without relying on an image-reference URL. Combine a precise likeness analysis of every visible subject with a precise reconstruction of the complete scene. Preserve visible face shape and features, apparent age range, skin tone, hair, build, clothing, accessories, distinguishing marks, expression, pose, gesture, subject scale, camera angle, crop, lens-like perspective, spatial arrangement, foreground and background objects, architecture or landscape, dominant colours, material textures, atmosphere, shadow placement and the visible effect of the lighting. Put the most identity-defining subject description in concept and details, the exact pose and expression in action, and the complete setting and spatial anchors in environment. Describe only visible facts; never identify a person or infer sensitive traits. Use compact concrete language with no metaphors, quality claims or redundant adjectives. Select the closest allowed composition, mood, lighting and world-language values. Put only additional distinct subjects in subjects.`
          : `Analyse the image so a Midjourney prompt can reproduce its visible content and composition as closely as possible. Capture the main subject, distinguishing details, exact pose or action, camera framing, spatial arrangement, environment, dominant colours, mood and the visible effect of the lighting. Describe only what is visible; never identify people or infer sensitive traits. Select the closest allowed composition, mood, lighting and world-language values. The first/main subject belongs in concept and details. Put only additional distinct subjects in subjects.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        store: false,
        instructions,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Return a compact, concrete visual analysis for the prompt-builder fields.",
              },
              {
                type: "input_image",
                image_url: body.image,
                detail: "high",
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "midjourney_image_analysis",
            strict: true,
            schema,
          },
        },
      }),
    });

    const payload = (await response.json()) as {
      error?: { message?: string };
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };
    if (!response.ok) {
      return Response.json(
        { error: payload.error?.message || "OpenAI could not analyse the image." },
        { status: response.status }
      );
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      return Response.json({ error: "OpenAI returned no image analysis." }, { status: 502 });
    }

    return Response.json({ analysis: JSON.parse(outputText) });
  } catch {
    return Response.json({ error: "The image could not be analysed." }, { status: 500 });
  }
}
