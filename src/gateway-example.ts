import "dotenv/config";
import { experimental_decide } from "ai";

// Minimal Vercel AI Gateway example using TypeSafe AI's Jev decision model.
// String model IDs resolve through AI Gateway using AI_GATEWAY_API_KEY.
// Shape follows the SDK's own Decisions doc (ai@7: docs/03-ai-sdk-core/32-decisions.mdx).

const result = await experimental_decide({
  model: "typesafe-ai/jev",
  state: "I was charged twice. Please refund the extra charge.",
  questions: {
    refund: {
      type: "boolean",
      instructions: "Is the customer asking for a refund?",
    },
    department: {
      type: "choice",
      instructions: "Which team should handle this?",
      criteria: {
        billing: "Charges and refunds",
        support: "Other requests",
      },
    },
  },
}).catch((error: unknown) => {
  console.error(
    `gateway-example failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exit(1);
});

console.log(JSON.stringify(result.answers, null, 2));
