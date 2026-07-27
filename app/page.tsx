"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import {
  buildCharacterBlock,
  compositionFraming,
} from "./prompt-structure.mjs";

type SourceMode = "concept" | "image";
type AnalysisMode = "likeness" | "reproduce" | "copy";
type PromptLength = "concise" | "detailed";
type Subject = { id: number; role: string; traits: string; position: string };
type Reference = { name: string; traits: string };
type Subgenre = { name: string; traits: string; references: [Reference, Reference] };
type LightingPreset = {
  name: string;
  character: string;
  environment: string;
};
type ImageAnalysis = {
  composition: string;
  concept: string;
  details: string;
  action: string;
  environment: string;
  mood: string;
  lightingPreset: string;
  lightingColour: string;
  genre: string;
  subgenre: string;
  visualReference: string;
  ratio: string;
  subjects: Array<{ role: string; traits: string; position: string }>;
};

const paintedStyle = "painterly digital artwork, visible brushwork, crisp focal detail";

const genreData: Record<string, { traits: string; subgenres: Subgenre[] }> = {
  Fantasy: {
    traits: "fantastical worldbuilding, handcrafted materials, ancient history and magical atmosphere",
    subgenres: [
      { name: "High fantasy", traits: "mythic scale, heroic silhouettes, monumental landscapes and visible magic", references: [
        { name: "The Lord of the Rings", traits: "mythic naturalism, ancient ruins, heroic grandeur and vast romantic landscapes" },
        { name: "World of Warcraft", traits: "bold heroic proportions, saturated magic, exaggerated armour and readable faction design" },
      ]},
      { name: "Low fantasy", traits: "grounded medieval life, restrained magic, practical clothing and human-scale stakes", references: [
        { name: "Game of Thrones", traits: "weathered medieval materials, restrained colour, political realism and severe landscapes" },
        { name: "Mount & Blade II: Bannerlord", traits: "practical armour, grounded warfare, lived-in settlements and culturally distinct factions" },
      ]},
      { name: "Grimdark", traits: "decayed grandeur, oppressive shadow, scarred materials and brutal scale", references: [
        { name: "Warhammer Fantasy", traits: "baroque armour, monumental brutality, dense heraldry, decay and apocalyptic scale" },
        { name: "Dark Souls", traits: "ruined majesty, corroded armour, ash, lonely scale and mournful gothic architecture" },
      ]},
    ],
  },
  "Sci-fi": {
    traits: "speculative technology, designed machinery, unfamiliar infrastructure and future-facing materials",
    subgenres: [
      { name: "Cyberpunk", traits: "neon density, cybernetics, rain-slick surfaces and high-tech inequality", references: [
        { name: "Cyberpunk 2077", traits: "neon urban density, visible cybernetics, corporate excess and street-level technology" },
        { name: "Blade Runner", traits: "noir lighting, rain, monumental advertising, crowded futures and industrial melancholy" },
      ]},
      { name: "Space fantasy", traits: "mythic adventure among stars, ancient cosmic relics and dramatic alien worlds", references: [
        { name: "Star Wars", traits: "used-future machinery, mythic silhouettes, desert worlds and readable factions" },
        { name: "Destiny", traits: "luminous cosmic ruins, elegant armour, mystical technology and monumental planetary vistas" },
      ]},
      { name: "Space opera", traits: "interstellar civilisations, grand fleets, political spectacle and sweeping scale", references: [
        { name: "Mass Effect", traits: "cinematic alien civilisations, sleek military technology and colourful galactic environments" },
        { name: "Dune", traits: "monumental architecture, ritualised technology, desert severity and dynastic power" },
      ]},
      { name: "Hard sci-fi", traits: "credible engineering, functional spacecraft, physical wear and realistic scale", references: [
        { name: "The Expanse", traits: "functional spacecraft, zero-gravity practicality, lived-in stations and restrained realism" },
        { name: "Star Citizen", traits: "detailed industrial spacecraft, believable materials, planetary infrastructure and technical scale" },
      ]},
    ],
  },
  Western: {
    traits: "frontier landscapes, practical workwear, dust, timber settlements and open horizons",
    subgenres: [
      { name: "Frontier western", traits: "sun-bleached towns, worn workwear, horses and grounded survival", references: [
        { name: "Red Dead Redemption 2", traits: "weathered frontier realism, natural landscapes, lived-in towns and period detail" },
        { name: "Desperados III", traits: "readable western archetypes, frontier settlements, warm colour and tactical compositions" },
      ]},
      { name: "Spaghetti western", traits: "stark deserts, long shadows, iconic silhouettes and tense stillness", references: [
        { name: "The Dollars Trilogy", traits: "dusty widescreen landscapes, graphic close-ups, ponchos, hard light and operatic tension" },
        { name: "Hard West II", traits: "stylised frontier darkness, dramatic painted characters and occult western environments" },
      ]},
      { name: "Weird west", traits: "frontier imagery crossed with occult strangeness and uncanny landscapes", references: [
        { name: "Hunt: Showdown", traits: "rotting bayous, improvised weapons, gothic monsters and diseased frontier horror" },
        { name: "Weird West", traits: "graphic painted frontier scenes, supernatural threats and stylised western silhouettes" },
      ]},
    ],
  },
  Victorian: {
    traits: "nineteenth-century tailoring, ornamented interiors, soot-dark cities and crafted mechanical detail",
    subgenres: [
      { name: "Lovecraftian gothic", traits: "scholarly dread, maritime decay, impossible antiquity and cosmic unease", references: [
        { name: "Bloodborne", traits: "gothic streets, ornate weapons, diseased grandeur and oppressive moonlit horror" },
        { name: "The Sinking City", traits: "flooded period streets, maritime decay, occult investigation and cosmic dread" },
      ]},
      { name: "Romantic", traits: "sublime nature, emotional skies, ruins and dramatic atmospheric light", references: [
        { name: "The Order: 1886", traits: "luxurious Victorian materials, cinematic gaslight, industrial detail and dark romantic atmosphere" },
        { name: "GreedFall", traits: "painted colonial fantasy, ornate clothing, wild landscapes and romantic historical atmosphere" },
      ]},
      { name: "Steampunk", traits: "brass machinery, exposed mechanisms, tailored clothing and elaborate invention", references: [
        { name: "Dishonored", traits: "whalepunk machinery, plague-dark streets, angular architecture and painterly Victorian decay" },
        { name: "Frostpunk", traits: "steam machinery, frozen industrial cities, survivalist design and heavy atmospheric light" },
      ]},
    ],
  },
  Ancient: {
    traits: "pre-modern materials, ritual spaces, hand-built monuments and culturally specific dress",
    subgenres: [
      { name: "Mythological", traits: "gods among mortals, symbolic creatures, sacred landscapes and heroic archetypes", references: [
        { name: "God of War", traits: "monumental gods, weathered mythic landscapes, tactile relics and brutal heroic scale" },
        { name: "Hades", traits: "graphic mythic silhouettes, underworld colour, ornate divine costume and clear character motifs" },
      ]},
      { name: "Primal stone age", traits: "stone tools, hides, ochre markings, immense wilderness and firelight", references: [
        { name: "Far Cry Primal", traits: "tactile stone-age tools, tribal markings, dangerous megafauna and raw wilderness" },
        { name: "Ancestors: The Humankind Odyssey", traits: "primeval landscapes, early hominid survival and immense untouched nature" },
      ]},
      { name: "Bronze age", traits: "bronze weapons, linen, painted palaces, chariots and fortified hill cities", references: [
        { name: "Total War Saga: Troy", traits: "painted bronze-age warfare, heroic armour, Aegean settlements and mythic battle scale" },
        { name: "Age of Mythology", traits: "readable ancient civilisations, mythic creatures, divine spectacle and monumental temples" },
      ]},
      { name: "Classical Greece", traits: "marble sanctuaries, painted statuary, bronze armour and sunlit islands", references: [
        { name: "Assassin’s Creed Odyssey", traits: "colourful classical cities, Aegean light, bronze armour and monumental sanctuaries" },
        { name: "God of War III", traits: "colossal Greek gods, ruined temples, dramatic mythic violence and monumental scale" },
      ]},
      { name: "Imperial Rome", traits: "civic monuments, disciplined military design, frescoed interiors and imperial ceremony", references: [
        { name: "Total War: Rome II", traits: "large Roman armies, culturally detailed units, ancient cities and strategic spectacle" },
        { name: "Ryse: Son of Rome", traits: "ornate legionary armour, monumental Rome, dramatic battlefields and cinematic imperial grandeur" },
      ]},
    ],
  },
  Modern: {
    traits: "recognisable contemporary materials, current infrastructure and believable technology",
    subgenres: [
      { name: "Dieselpunk", traits: "interwar machinery, riveted steel, smoke, heavy engines and alternate history", references: [
        { name: "Iron Harvest", traits: "diesel mechs, agrarian Europe, heavy steel and alternate 1920s warfare" },
        { name: "Wolfenstein", traits: "massive diesel machinery, brutalist industry, alternate history and militarised technology" },
      ]},
      { name: "Retro-futurist", traits: "past visions of tomorrow, analogue controls, atomic-era forms and aged plastics", references: [
        { name: "Fallout", traits: "atomic-age optimism, retro technology, weathered Americana and postwar decay" },
        { name: "Tales from the Loop", traits: "quiet retro machinery, rural landscapes, childhood wonder and melancholic scale" },
      ]},
      { name: "Contemporary", traits: "current architecture, believable clothing, ordinary technology and documentary detail", references: [
        { name: "The Division", traits: "urban crisis, contemporary tactical clothing, weathered city infrastructure and grounded technology" },
        { name: "Call of Duty: Modern Warfare", traits: "contemporary military equipment, global urban environments and grounded tactical realism" },
      ]},
      { name: "Near future", traits: "plausible emerging technology, familiar cities and restrained speculative design", references: [
        { name: "Deus Ex", traits: "human augmentation, corporate geometry, black-and-gold technology and near-future inequality" },
        { name: "Detroit: Become Human", traits: "familiar cities, elegant android design, restrained technology and polished near-future life" },
      ]},
    ],
  },
};

const ratioOptions = ["1:1", "3:2", "2:3", "16:9", "9:16"];
const compositionOptions = [
  "Character portrait",
  "Full-body character",
  "Two-character scene",
  "Party scene",
  "Creature encounter",
  "Establishing landscape",
  "Interior environment",
  "Action scene",
];
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
  "Sinister",
  "Malevolent",
  "Infernal",
  "Corrupted",
  "Unholy",
  "Predatory",
  "Apocalyptic",
  "Dread",
];

const lightingPresets: Record<string, LightingPreset> = {
  "Warm face light": {
    name: "Warm face light",
    character:
      "Warm light illuminates the entire face, with open shadows, clear catchlights, sharply defined eyes and readable facial features",
    environment:
      "Warm light clearly illuminates the foreground and its important details",
  },
  "Soft frontal key light": {
    name: "Soft frontal key light",
    character:
      "Large soft frontal key light and gentle fill evenly illuminate the entire face, with open shadows, clear catchlights, sharply defined eyes and readable facial features",
    environment:
      "Large soft frontal key light and gentle fill evenly illuminate the foreground with open shadows",
  },
  "Diffused source-free light": {
    name: "Diffused source-free light",
    character:
      "Large soft diffused frontal light and gentle ambient fill evenly illuminate the entire face, with open shadows, clear catchlights, sharply defined eyes and readable facial features; soft neutral illumination with no visible directional light source",
    environment:
      "Soft neutral diffused light and gentle ambient fill evenly illuminate the scene with no visible directional light source",
  },
  "Bright diffused daylight": {
    name: "Bright diffused daylight",
    character:
      "Bright overcast daylight evenly illuminates the face, with open shadows and clear facial details",
    environment:
      "Bright overcast daylight evenly illuminates the scene with soft open shadows",
  },
  "Harsh light": {
    name: "Harsh light",
    character:
      "Harsh direct frontal light creates crisp high-contrast definition while keeping the entire face, eyes and facial features clearly readable",
    environment:
      "Harsh direct light creates stark contrast and hard-edged shadows across the scene",
  },
  "Dim frontal light": {
    name: "Dim frontal light",
    character:
      "Soft frontal light and gentle fill illuminate the entire face within the dark scene, with open shadows, clear catchlights, sharply defined eyes and readable facial features",
    environment:
      "Soft frontal light reveals the foreground within the dark scene while the surroundings remain dim",
  },
  "Torch or flame light": {
    name: "Torch or flame light",
    character:
      "Warm torchlight illuminates the entire face, with gentle fill, open shadows, clear catchlights, sharply defined eyes and readable facial features",
    environment:
      "Warm firelight illuminates the foreground while the surrounding environment remains dark",
  },
  "Coloured ambient light": {
    name: "Coloured ambient light",
    character:
      "Powerful diffuse coloured light floods the entire scene from outside the frame and overpowers every other light source, bathing the face, clothing, air and environment in the same saturated colour",
    environment:
      "Powerful diffuse coloured light floods the entire scene and overpowers every other light source",
  },
  "Neutral face light": {
    name: "Neutral face light",
    character:
      "Soft neutral frontal light and gentle fill illuminate the face, with clear eyes and readable facial details",
    environment:
      "Soft neutral light and gentle fill clearly illuminate the foreground",
  },
  Custom: {
    name: "Custom",
    character: "",
    environment: "",
  },
};

function sentence(value: string) {
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean) return "";
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function firstTraits(value: string, limit: number) {
  return value
    .split(/,\s+|\s+and\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, limit)
    .join(", ");
}

function visibleRewrite(value: string) {
  return value
    .replace(/\bwithout a helmet\b/gi, "with a bare, clearly visible head")
    .replace(/\bwithout helmet\b/gi, "with a bare, clearly visible head")
    .replace(/\bwithout a hat\b/gi, "with uncovered hair")
    .replace(/\bwithout hat\b/gi, "with uncovered hair")
    .replace(/\bno wings\b/gi, "a wingless silhouette with an uninterrupted back")
    .replace(/\bnot photorealistic\b/gi, "illustrated with visible painted brushwork")
    .replace(/\bnot realistic\b/gi, "stylised painted illustration")
    .replace(/\bno armour\b/gi, "wearing simple cloth garments")
    .replace(/\bwithout armour\b/gi, "wearing simple cloth garments")
    .replace(/\bno background\b/gi, "isolated against a plain neutral backdrop")
    .replace(/\bwithout\b/gi, "with")
    .replace(/\bnot\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function Home() {
  const [sourceMode, setSourceMode] = useState<SourceMode>("concept");
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("likeness");
  const [imageData, setImageData] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageName, setImageName] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [promptLength, setPromptLength] = useState<PromptLength>("detailed");
  const [genre, setGenre] = useState("Fantasy");
  const [subgenre, setSubgenre] = useState("High fantasy");
  const [visualReference, setVisualReference] = useState("The Lord of the Rings");
  const [concept, setConcept] = useState(
    "A veteran elven ranger tracking something through an ancient flooded ruin"
  );
  const [composition, setComposition] = useState("Full-body character");
  const [environment, setEnvironment] = useState(
    "Knee-deep dark water, broken white-stone arches, hanging roots and distant blue witchlight"
  );
  const [action, setAction] = useState(
    "She pauses mid-step with one hand near her bow, watching ripples spread ahead"
  );
  const [mood, setMood] = useState("Ominous");
  const [lightingPreset, setLightingPreset] = useState("Warm face light");
  const [lightingColour, setLightingColour] = useState("deep red");
  const [customLighting, setCustomLighting] = useState("");
  const [details, setDetails] = useState(
    "Weathered green cloak, silver leaf-shaped clasp, dark braided hair, scar across one cheek"
  );
  const [avoid, setAvoid] = useState(
    "photorealism, 3D render, text, watermark, backlight, back light, shadows on face"
  );
  const [ratio, setRatio] = useState("3:2");
  const [stylize, setStylize] = useState(80);
  const [raw, setRaw] = useState(true);
  const [quality, setQuality] = useState<"sd" | "hd">("sd");
  const [copied, setCopied] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [promptEdit, setPromptEdit] = useState({ generated: "", value: "" });
  const nextSubject = useRef(2);

  const prompt = useMemo(() => {
    const genreEntry = genreData[genre];
    const subgenreEntry =
      genreEntry.subgenres.find((item) => item.name === subgenre) ?? genreEntry.subgenres[0];
    const referenceEntry =
      subgenreEntry.references.find((item) => item.name === visualReference) ??
      subgenreEntry.references[0];
    const subjectLead = sentence(visibleRewrite(concept));
    const attached = sentence(visibleRewrite(details));
    const additionalCharacters = subjects.map((subject) =>
      sentence(
        `The ${subject.role || `character ${subject.id}`} ${
          subject.position ? `on the ${subject.position}` : ""
        } is ${visibleRewrite(subject.traits)}`
      )
    );
    const groupIntroduction =
      subjects.length > 0
        ? sentence(
            `${subjects.length + 1} different characters arranged in a ${composition.toLowerCase()}`
          )
        : "";
    const subjectBlock = buildCharacterBlock(
      [subjectLead, attached],
      groupIntroduction,
      additionalCharacters
    );
    const framingLine = sentence(compositionFraming(composition));

    const actionLed = ["Action scene", "Creature encounter", "Two-character scene", "Party scene"].includes(
      composition
    );
    const conciseScene = sentence(visibleRewrite(actionLed ? action : environment));
    const detailedScene = [sentence(visibleRewrite(action)), sentence(visibleRewrite(environment))]
      .filter(Boolean)
      .join(" ");
    const scene = promptLength === "concise" ? conciseScene : detailedScene;
    const style =
      promptLength === "concise"
        ? `${referenceEntry.name}-inspired ${subgenreEntry.name.toLowerCase()} ${paintedStyle}.`
        : `${referenceEntry.name}-inspired ${subgenreEntry.name.toLowerCase()} ${paintedStyle}, ${firstTraits(
            subgenreEntry.traits,
            2
          )}, ${firstTraits(referenceEntry.traits, 2)}.`;
    const hasCharacterFocus = !["Establishing landscape", "Interior environment"].includes(
      composition
    );
    const selectedLighting = lightingPresets[lightingPreset];
    const lightingText =
      lightingPreset === "Custom"
        ? visibleRewrite(customLighting)
        : (hasCharacterFocus ? selectedLighting.character : selectedLighting.environment).replace(
            /coloured|colour/g,
            (word) => (word === "coloured" ? lightingColour : lightingColour)
          );
    const lightingLine = sentence(lightingText);
    const aesthetic = [
      mood !== "Unspecified" ? `${mood.toLowerCase()} atmosphere.` : "",
      style,
    ]
      .filter(Boolean)
      .join(" ");
    const params = [
      `--ar ${ratio}`,
      raw ? "--raw" : "",
      `--s ${stylize}`,
      quality === "sd" ? "--sd" : "",
      avoid.trim() ? `--no ${avoid.trim()}` : "",
      "--v 8.2",
    ]
      .filter(Boolean)
      .join(" ");

    if (promptLength === "concise") {
      const concisePrompt = [
        sentence(`${composition} composition`),
        framingLine,
        subjectBlock,
        sentence(visibleRewrite(action)),
        mood !== "Unspecified" ? `${mood.toLowerCase()} atmosphere.` : "",
        style,
      ]
        .filter(Boolean)
        .join(" ");
      return `${concisePrompt} ${params}`.replace(/\s+/g, " ").trim();
    }

    return `${[framingLine, subjectBlock, lightingLine, scene, aesthetic]
      .filter(Boolean)
      .join(" ")} ${params}`
      .replace(/\s+/g, " ")
      .trim();
  }, [
    action,
    avoid,
    composition,
    concept,
    details,
    environment,
    genre,
    customLighting,
    lightingColour,
    lightingPreset,
    mood,
    promptLength,
    quality,
    ratio,
    raw,
    stylize,
    subgenre,
    subjects,
    visualReference,
  ]);

  const editablePrompt = promptEdit.generated === prompt ? promptEdit.value : prompt;

  const availableSubgenres = genreData[genre].subgenres;
  const activeSubgenre =
    availableSubgenres.find((item) => item.name === subgenre) ?? availableSubgenres[0];

  function changeGenre(value: string) {
    const first = genreData[value].subgenres[0];
    setGenre(value);
    setSubgenre(first.name);
    setVisualReference(first.references[0].name);
  }

  function changeSubgenre(value: string) {
    const selected = genreData[genre].subgenres.find((item) => item.name === value);
    setSubgenre(value);
    if (selected) setVisualReference(selected.references[0].name);
  }

  const charCount = editablePrompt.length;
  const risk =
    charCount > 1024
      ? "Prompt Shortener will activate"
      : charCount > 850
        ? "Prompt is too long"
        : charCount > 650
          ? "Consider trimming"
          : "Good prompt length";
  const riskLevel = charCount > 850 ? "danger" : charCount > 650 ? "warning" : "lean";

  function addSubject() {
    const id = nextSubject.current++;
    setSubjects((current) => [
      ...current,
      { id, role: `character ${id}`, traits: "", position: id % 2 ? "left" : "right" },
    ]);
  }

  function updateSubject(id: number, key: keyof Subject, value: string) {
    setSubjects((current) =>
      current.map((subject) => (subject.id === id ? { ...subject, [key]: value } : subject))
    );
  }

  function removeSubject(id: number) {
    setSubjects((current) => current.filter((subject) => subject.id !== id));
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAnalysisStatus("error");
      setAnalysisMessage("Choose a PNG, JPEG, WebP or GIF image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAnalysisStatus("error");
      setAnalysisMessage("Choose an image smaller than 10 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      setImageData(value);
      setImagePreview(value);
      setImageName(file.name);
      setAnalysisStatus("idle");
      setAnalysisMessage("");
    };
    reader.onerror = () => {
      setAnalysisStatus("error");
      setAnalysisMessage("The image could not be read.");
    };
    reader.readAsDataURL(file);
  }

  async function analyseImage() {
    if (!imageData || analysisStatus === "loading") return;
    setAnalysisStatus("loading");
    setAnalysisMessage(
      analysisMode === "likeness"
        ? "Reading the subject’s visible features…"
        : analysisMode === "copy"
          ? "Building the closest prompt-only copy…"
          : "Reading the full image and composition…"
    );

    try {
      const response = await fetch("/api/analyse-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, mode: analysisMode }),
      });
      const payload = (await response.json()) as { analysis?: ImageAnalysis; error?: string };
      if (!response.ok || !payload.analysis) {
        throw new Error(payload.error || "The image could not be analysed.");
      }

      const result = payload.analysis;
      setComposition(
        compositionOptions.includes(result.composition) ? result.composition : "Character portrait"
      );
      setConcept(result.concept);
      setDetails(result.details);
      setAction(result.action);
      setEnvironment(result.environment);
      setMood(moodOptions.includes(result.mood) ? result.mood : "Unspecified");
      setRatio(ratioOptions.includes(result.ratio) ? result.ratio : "3:2");

      const matchedGenre = genreData[result.genre] ? result.genre : "Fantasy";
      const matchedSubgenre =
        genreData[matchedGenre].subgenres.find((item) => item.name === result.subgenre) ??
        genreData[matchedGenre].subgenres[0];
      const matchedReference =
        matchedSubgenre.references.find((item) => item.name === result.visualReference) ??
        matchedSubgenre.references[0];
      setGenre(matchedGenre);
      setSubgenre(matchedSubgenre.name);
      setVisualReference(matchedReference.name);

      const matchedLighting = lightingPresets[result.lightingPreset]
        ? result.lightingPreset
        : "Soft frontal key light";
      setLightingPreset(matchedLighting);
      if (matchedLighting === "Coloured ambient light" && result.lightingColour) {
        setLightingColour(result.lightingColour);
      }

      setSubjects(
        result.subjects.slice(0, 5).map((subject, index) => ({
          id: index + 2,
          role: subject.role,
          traits: subject.traits,
          position: subject.position,
        }))
      );
      nextSubject.current = result.subjects.length + 2;
      setPromptLength("detailed");
      setAnalysisStatus("success");
      setAnalysisMessage("Fields populated. Review anything you want to change.");
    } catch (error) {
      setAnalysisStatus("error");
      setAnalysisMessage(error instanceof Error ? error.message : "The image could not be analysed.");
    }
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(editablePrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="builder-panel">
          <div className="mode-switch" role="tablist" aria-label="Prompt source">
            <button
              type="button"
              role="tab"
              aria-selected={sourceMode === "concept"}
              className={sourceMode === "concept" ? "active" : ""}
              onClick={() => setSourceMode("concept")}
            >
              From a concept
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sourceMode === "image"}
              className={sourceMode === "image" ? "active" : ""}
              onClick={() => setSourceMode("image")}
            >
              From an image
            </button>
          </div>

          {sourceMode === "image" && (
            <section className="image-analyser" aria-labelledby="image-analyser-title">
              <div className="analyser-heading">
                <div>
                  <span className="section-number">AI</span>
                  <strong id="image-analyser-title">Image analyser</strong>
                </div>
                <small>Processed privately and not retained by this tool.</small>
              </div>

              <div className="analysis-mode" role="group" aria-label="Image analysis mode">
                <button
                  type="button"
                  className={analysisMode === "likeness" ? "active" : ""}
                  aria-pressed={analysisMode === "likeness"}
                  onClick={() => setAnalysisMode("likeness")}
                >
                  <strong>Capture likeness</strong>
                  <span>Subject, face, clothing and distinguishing details</span>
                </button>
                <button
                  type="button"
                  className={analysisMode === "reproduce" ? "active" : ""}
                  aria-pressed={analysisMode === "reproduce"}
                  onClick={() => setAnalysisMode("reproduce")}
                >
                  <strong>Reproduce image</strong>
                  <span>Adds pose, framing, setting, colours and lighting</span>
                </button>
                <button
                  type="button"
                  className={analysisMode === "copy" ? "active" : ""}
                  aria-pressed={analysisMode === "copy"}
                  onClick={() => setAnalysisMode("copy")}
                >
                  <strong>Copy as closely as possible</strong>
                  <span>Combines detailed likeness with the complete original scene</span>
                </button>
              </div>

              <label className={`dropzone ${imagePreview ? "has-image" : ""}`}>
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Selected reference" />
                    <span className="image-name">{imageName}</span>
                  </>
                ) : (
                  <>
                    <span className="upload-icon">↑</span>
                    <strong>Choose a reference image</strong>
                    <small>PNG, JPEG, WebP or GIF · maximum 10 MB</small>
                  </>
                )}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={chooseImage} />
              </label>

              <div className="analyse-row">
                <button
                  type="button"
                  className="analyse-button"
                  disabled={!imageData || analysisStatus === "loading"}
                  onClick={analyseImage}
                >
                  {analysisStatus === "loading" ? "Analysing…" : "Analyse and fill fields"}
                </button>
                {analysisMessage && (
                  <p className={`analysis-message ${analysisStatus}`} role="status">
                    {analysisMessage}
                  </p>
                )}
              </div>
            </section>
          )}

          <div className="field-stack">
            <label className="primary-field">
              <span>Core concept</span>
              <textarea
                rows={3}
                value={concept}
                onChange={(event) => setConcept(event.target.value)}
                placeholder="Describe what must be visible..."
              />
              <small>Write what can be seen, not instructions to the model.</small>
            </label>

            <div className="field-grid">
              <label>
                <span>Composition</span>
                <select value={composition} onChange={(event) => setComposition(event.target.value)}>
                  {compositionOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Mood</span>
                <select value={mood} onChange={(event) => setMood(event.target.value)}>
                  {moodOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <span>Attached subject details</span>
              <textarea rows={2} value={details} onChange={(event) => setDetails(event.target.value)} />
            </label>

            {subjects.map((subject) => (
              <div className="subject-card" key={subject.id}>
                <div className="subject-head">
                  <strong>Additional character {subject.id}</strong>
                  <button onClick={() => removeSubject(subject.id)} aria-label="Remove character">
                    Remove
                  </button>
                </div>
                <div className="subject-row">
                  <input
                    value={subject.role}
                    onChange={(event) => updateSubject(subject.id, "role", event.target.value)}
                    placeholder="Role or anchor"
                  />
                  <select
                    value={subject.position}
                    onChange={(event) => updateSubject(subject.id, "position", event.target.value)}
                  >
                    <option>left</option>
                    <option>middle</option>
                    <option>right</option>
                    <option>foreground</option>
                    <option>background</option>
                  </select>
                </div>
                <textarea
                  rows={2}
                  value={subject.traits}
                  onChange={(event) => updateSubject(subject.id, "traits", event.target.value)}
                  placeholder="Distinct appearance, clothing and action"
                />
              </div>
            ))}

            <button className="text-button" onClick={addSubject}>
              + Add another character
            </button>

            <div className="field-grid">
              <label>
                <span>Action or foreground</span>
                <textarea rows={2} value={action} onChange={(event) => setAction(event.target.value)} />
              </label>
              <label>
                <span>Environment</span>
                <textarea
                  rows={2}
                  value={environment}
                  onChange={(event) => setEnvironment(event.target.value)}
                />
              </label>
            </div>

            <div className="lighting-block">
              <div className="genre-heading">
                <div>
                  <span className="section-number">01</span>
                  <strong>Lighting</strong>
                </div>
                <small>Tested wording that keeps the subject readable.</small>
              </div>
              <div className="field-grid">
                <label>
                  <span>Lighting type</span>
                  <select
                    value={lightingPreset}
                    onChange={(event) => setLightingPreset(event.target.value)}
                  >
                    {Object.keys(lightingPresets).map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                {lightingPreset === "Coloured ambient light" && (
                  <label>
                    <span>Light colour</span>
                    <input
                      value={lightingColour}
                      onChange={(event) => setLightingColour(event.target.value)}
                      placeholder="deep red, cobalt blue..."
                    />
                  </label>
                )}
                {lightingPreset === "Custom" && (
                  <label>
                    <span>Custom lighting</span>
                    <input
                      value={customLighting}
                      onChange={(event) => setCustomLighting(event.target.value)}
                      placeholder="Describe the visible effect of the light"
                    />
                  </label>
                )}
              </div>
              <small className="lighting-note">
                Direct sunlight is excluded because it repeatedly backlit the subject in testing.
              </small>
            </div>

            <div className="genre-block">
              <div className="genre-heading">
                <div>
                  <span className="section-number">02</span>
                  <strong>World language</strong>
                </div>
                <small>Each subgenre offers two recognisable painterly references.</small>
              </div>
              <div className="genre-grid">
                <label>
                  <span>Genre</span>
                  <select value={genre} onChange={(event) => changeGenre(event.target.value)}>
                    {Object.keys(genreData).map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
                <label>
                  <span>Subgenre</span>
                  <select value={subgenre} onChange={(event) => changeSubgenre(event.target.value)}>
                    {availableSubgenres.map((option) => <option key={option.name}>{option.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Visual reference</span>
                  <select value={visualReference} onChange={(event) => setVisualReference(event.target.value)}>
                    {activeSubgenre.references.map((option) => <option key={option.name}>{option.name}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>

        <aside className="output-panel">
          <div className="output-head">
            <div>
              <p className="eyebrow">Editable prompt</p>
              <h2>Ready for Midjourney</h2>
            </div>
            <button className="copy-button" onClick={copyPrompt}>
              {copied ? "Copied" : "Copy prompt"}
            </button>
          </div>

          <div className="length-switch" role="group" aria-label="Prompt length">
            <button
              className={promptLength === "concise" ? "active" : ""}
              aria-pressed={promptLength === "concise"}
              onClick={() => setPromptLength("concise")}
            >
              <strong>Concise</strong>
              <span>One scene anchor</span>
            </button>
            <button
              className={promptLength === "detailed" ? "active" : ""}
              aria-pressed={promptLength === "detailed"}
              onClick={() => setPromptLength("detailed")}
            >
              <strong>Detailed</strong>
              <span>Adds four visual traits</span>
            </button>
          </div>

          <textarea
            className="prompt-box"
            aria-label="Editable Midjourney prompt"
            value={editablePrompt}
            onChange={(event) => setPromptEdit({ generated: prompt, value: event.target.value })}
          />

          <div className={`health ${riskLevel}`}>
            <div>
              <span>{risk}</span>
              <small>{charCount} characters · clarity-first target under 650</small>
            </div>
            <div className="meter" aria-label={`${charCount} of 1024 characters`}>
              <i style={{ width: `${Math.min((charCount / 1024) * 100, 100)}%` }} />
            </div>
            <div className="budget-labels" aria-hidden="true">
              <span>Concise</span>
              <span>650 trim</span>
              <span>1,024 limit</span>
            </div>
          </div>

          <div className="settings">
            <div className="settings-title">
              <h3>Output controls</h3>
              <span>Parameters stay at the end</span>
            </div>

            <div className="control-grid">
              <label>
                <span>Aspect ratio</span>
                <select value={ratio} onChange={(event) => setRatio(event.target.value)}>
                  {ratioOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Working mode</span>
                <select
                  value={quality}
                  onChange={(event) => setQuality(event.target.value as "sd" | "hd")}
                >
                  <option value="sd">SD — iterate</option>
                  <option value="hd">HD — final</option>
                </select>
              </label>
            </div>

            <label className="slider-field">
              <span>
                Stylisation <b>{stylize}</b>
              </span>
              <input
                type="range"
                min="0"
                max="400"
                step="10"
                value={stylize}
                onChange={(event) => setStylize(Number(event.target.value))}
              />
              <small>Kept below 100 by default so V8.2 follows the subject and clarity instructions.</small>
            </label>

            <label className="toggle-row">
              <div>
                <span>Raw mode</span>
                <small>Reduces the default aesthetic layer for more control.</small>
              </div>
              <input type="checkbox" checked={raw} onChange={(event) => setRaw(event.target.checked)} />
            </label>

            <label>
              <span>--no tags</span>
              <textarea rows={2} value={avoid} onChange={(event) => setAvoid(event.target.value)} />
              <small>Comma-separated exclusions are added to the final Midjourney prompt.</small>
            </label>
          </div>

          <div className="principle">
            <span>01</span>
            <p>
              <strong>Visible language wins.</strong> “Weathered bronze plate with a bare head”
              gives Midjourney more control than “a knight without a helmet.”
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
