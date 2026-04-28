/**
 * Create the two Qdrant collections (needs + volunteers) on Qdrant Cloud.
 * Idempotent — re-running is a no-op once they exist.
 *
 * Run once after setting QDRANT_URL + QDRANT_API_KEY in .env.local.
 */
import "dotenv/config";
import { ensureCollections, COL } from "../lib/qdrant";
import { EMBEDDING_DIM, MODELS } from "../lib/llm";

(async () => {
  console.log("→ Connecting to Qdrant at", process.env.QDRANT_URL);
  console.log(`  Embedding model: ${MODELS.embedding} (${EMBEDDING_DIM}-dim)`);
  await ensureCollections();
  console.log(`✓ Collections ready: ${COL.needs}, ${COL.volunteers}`);
})().catch((e) => {
  console.error("✗ init-qdrant failed:", e?.message || e);
  process.exit(1);
});
