import { FormEvent, useState } from "react";
import { callread, callsideaction } from "mesosphere/reactlibrary";
import { api } from "../mesosphere/deploy";

const SIZE_OPTIONS = [
  { value: "1024x1024", label: "Square 1024" },
  { value: "1024x1536", label: "Portrait 1024x1536" },
  { value: "1536x1024", label: "Landscape 1536x1024" },
] as const;

export default function App() {
  const images = callread(api.message.readImages);
  const generateImage = callsideaction(api.message.generateImage);

  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState(SIZE_OPTIONS[0].value);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim()) {
      setError("Add a prompt to generate an image.");
      return;
    }
    setError("");
    setIsGenerating(true);
    try {
      await generateImage({
        prompt: prompt.trim(),
        size,
      });
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">Mesosphere Side Actions</p>
          <h1>ChatGPT Image in a server-side action.</h1>
          <p className="lead">
            Generate an image with OpenAI, upload it to Mesosphere Storage, and
            keep a gallery in your database.
          </p>
        </div>
        <div className="note">
          <h2>Before you start</h2>
          <p className="muted">
            Add your <code>OPENAI_API_KEY</code> to the environment and run the
            Mesosphere dev server.
          </p>
        </div>
      </header>

      <section className="panel">
        <form className="prompt-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="prompt">Prompt</label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="A cozy studio with a neon cactus, cinematic lighting"
              rows={3}
            />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="size">Size</label>
              <select
                id="size"
                value={size}
                onChange={(event) => setSize(event.target.value)}
              >
                {SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate image"}
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
        </form>
      </section>

      <section className="panel">
        <h2>Generated gallery</h2>
        <p className="muted">
          Each image is stored in Mesosphere Storage with a database record for
          the prompt.
        </p>
        <div className="gallery">
          {images?.length ? (
            images.map((image: any) => (
              <figure key={image._id} className="card">
                <img src={image.previewUrl} alt={image.prompt} />
                <figcaption>
                  <p>{image.prompt}</p>
                  <span className="muted">Storage: {image.storageId}</span>
                </figcaption>
              </figure>
            ))
          ) : (
            <p className="muted">No images generated yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
