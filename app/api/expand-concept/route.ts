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
    composition: {
      type: "string",
      enum: [
        "Character portrait",
        "Full-body character",
        "Two-character scene",
        "Party scene",
        "Creature encounter",
        "Establishing landscape",
        "Interior environment",
        "Action scene",
      ],
    },
    concept: { type: "string" },
    details: { type: "string" },
    action: { type: "string" },
    environment: { type: "string" },
    mood: {
      type: "string",
      enum: [
        "Unspecified", "Heroic", "Ominous", "Melancholic", "Mystical", "Serene", "Brutal",
        "Wonder", "Joyful", "Hopeful", "Triumphant", "Tense", "Uneasy", "Mysterious",
        "Ethereal", "Whimsical", "Romantic", "Nostalgic", "Desolate", "Dreamlike",
        "Sinister", "Malevolent", "Infernal", "Corrupted", "Unholy", "Predatory",
        "Apocalyptic", "Dread",
      ],
    },
    lightingPreset: {
      type: "string",
      enum: [
        "Warm face light",
        "Soft frontal key light",
        "Diffused source-free light",
        "Bright diffused daylight",
        "Harsh light",
        "Dim frontal light",
        "Torch or flame light",
        "Coloured ambient light",
        "Neutral face light",
      ],
    },
    lightingColour: { type: "string" },
    genre: {
      type: "string",
      enum: ["Fantasy", "Sci-fi", "Western", "Victorian", "Ancient", "Modern"],
    },
    subgenre: {
      type: "string",
      enum: [
        "High fantasy", "Low fantasy", "Grimdark", "Cyberpunk", "Space fantasy",
        "Space opera", "Hard sci-fi", "Frontier western", "Spaghetti western", "Weird west",
        "Lovecraftian gothic", "Romantic", "Steampunk", "Mythological", "Primal stone age",
        "Bronze age", "Classical Greece", "Imperial Rome", "Dieselpunk", "Retro-futurist",
        "Contemporary", "Near future",
      ],
    },
    visualReference: {
      type: "string",
      enum: [
        "The Lord of the Rings", "World of Warcraft", "Game of Thrones",
        "Mount & Blade II: Bannerlord", "Warhammer Fantasy", "Dark Souls", "Cyberpunk 2077",
        "Blade Runner", "Star Wars", "Destiny", "Mass Effect", "Dune", "The Expanse",
        "Star Citizen", "Red Dead Redemption 2", "Desperados III", "The Dollars Trilogy",
        "Hard West II", "Hunt: Showdown", "Weird West", "Bloodborne", "The Sinking City",
        "The Order: 1886", "GreedFall", "Dishonored", "Frostpunk", "God of War", "Hades",
        "Far Cry Primal", "Ancestors: The Humankind Odyssey", "Total War Saga: Troy",
        "Age of Mythology", "Assassin’s Creed Odyssey", "God of War III",
        "Total War: Rome II", "Ryse: Son of Rome", "Iron Harvest", "Wolfenstein", "Fallout",
        "Tales from the Loop", "The Division", "Call of Duty: Modern Warfare", "Deus Ex",
        "Detroit: Become Human",
      ],
    },
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
        { error: "Concept expansion is not configured yet. Add the OpenAI API key to enable it." },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { concept?: string };
    const concept = body.concept?.trim();
    if (!concept || concept.length > 4_000) {
      return Response.json(
        { error: "Enter a concept between 1 and 4,000 characters." },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        store: false,
        instructions:
          "Turn the user's rough visual concept into a concrete Midjourney prompt-builder template. " +
          "Preserve their intent while inventing tasteful, coherent visual specifics where details are missing. " +
          "Describe visible content rather than instructions to an image model. Put the main subject in concept, " +
          "appearance and material details in details, pose or activity in action, and the complete setting in environment. " +
          "Use subjects only for additional distinct characters. Choose compatible genre, subgenre and visual reference values. " +
          "Keep every field compact and useful, avoid metaphors, quality claims, camera jargon, and parameter syntax.",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Expand this concept into the template:\n\n${concept}`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "midjourney_concept_expansion",
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
        { error: payload.error?.message || "OpenAI could not expand the concept." },
        { status: response.status }
      );
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      return Response.json({ error: "OpenAI returned no concept expansion." }, { status: 502 });
    }
    return Response.json({ analysis: JSON.parse(outputText) });
  } catch {
    return Response.json({ error: "The concept could not be expanded." }, { status: 500 });
  }
}
