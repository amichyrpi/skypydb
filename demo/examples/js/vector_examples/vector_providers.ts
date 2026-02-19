// Ollama provider
import { vecClient } from "skypydb";

// Create a client
async function use_ollama_provider(): Promise<void> {
  const client = new vecClient({
    embedding_provider: "ollama",
    embedding_model_config: {
      model: "mxbai-embed-large",
      base_url: "http://localhost:11434",
    },
  });
}

// OpenAI provider
import { vecClient } from "skypydb";

// Create a client
async function use_openai_provider(): Promise<void> {
  const client = new vecClient({
    embedding_provider: "openai",
    embedding_model_config: {
      api_key: "your-openai-api-key",
      model: "text-embedding-3-small",
    },
  });
}

// Sentence Transformers provider
import { vecClient } from "skypydb";

// Create a client
async function use_sentence_transformers_provider(): Promise<void> {
  const client = new vecClient({
    embedding_provider: "sentence-transformers",
    embedding_model_config: {
      model: "all-MiniLM-L6-v2",
    },
  });
}
