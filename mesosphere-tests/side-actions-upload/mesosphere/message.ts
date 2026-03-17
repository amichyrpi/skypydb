import { readFunction, sideaction } from "mesosphere/reactlibrary";
import { type } from "mesosphere/type";

const IMAGE_MODEL = "gpt-image-1.5";

const sizeType = type.optional(
  type.union(
    type.literal("1024x1024"),
    type.literal("1024x1536"),
    type.literal("1536x1024"),
  ),
);

export const generateImage = sideaction({
  args: {
    prompt: type.string(),
    size: sizeType,
  },
  handler: async (mesosphere, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY.");
    }

    const size = args.size ?? "1024x1024";
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          prompt: args.prompt,
          size,
          response_format: "b64_json",
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI error: ${errorText}`);
    }

    const payload = (await response.json()) as {
      data?: Array<{ b64_json?: string }>;
    };
    const b64 = payload.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("OpenAI did not return image data.");
    }

    const bytes = Buffer.from(b64, "base64");
    const blob = new Blob([bytes], { type: "image/png" });
    const storageId = await mesosphere.storage.upload(blob);
    const previewUrl = `data:image/png;base64,${b64}`;

    await mesosphere.database.add("images", {
      prompt: args.prompt,
      size,
      storageId,
      previewUrl,
    });

    return { storageId, previewUrl };
  },
});

export const readImages = readFunction({
  args: {},
  handler: async (mesosphere) => {
    return await mesosphere.database.get("images").accumulate();
  },
});
