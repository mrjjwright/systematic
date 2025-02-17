#### Canonical Vercel AI SDK OpenAI Streaming Example

This example demonstrates a simple streaming chat implementation using the Vercel AI SDK with OpenAI:

```typescript
import {
	LanguageModel,
	StreamTextResult,
	ToolSet,
	streamText,
	generateText,
	StreamCallbacks,
} from "ai";
import { OpenAI } from "@ai-sdk/openai";

export interface StreamOptions {
	onToken?: (token: string) => void | Promise<void>;
	onError?: (error: Error) => void | Promise<void>;
	onComplete?: (text: string) => void | Promise<void>;
}

export class TransformerAI {
	private model: LanguageModel;

	constructor(apiKey: string, modelId: string = "gpt-3.5-turbo") {
		const openai = new OpenAI({ apiKey });
		this.model = openai.chat(modelId);
	}

	/**
	 * Stream text generation with progress callbacks
	 */
	async streamText(
		prompt: string,
		options: StreamOptions = {}
	): Promise<StreamTextResult<never, never>> {
		const result = streamText({
			model: this.model,
			prompt,
			onChunk: async ({ chunk }) => {
				if (chunk.type === "text-delta") {
					await options.onToken?.(chunk.textDelta);
				}
			},
			onError: async ({ error }) => {
				await options.onError?.(error as Error);
			},
			onFinish: async ({ text }) => {
				await options.onComplete?.(text);
			},
		});

		return result;
	}

	/**
	 * Stream markdown-formatted text
	 */
	async streamMarkdown(
		prompt: string,
		options: StreamOptions = {}
	): Promise<StreamTextResult<never, never>> {
		const wrappedPrompt = `
Format your response in markdown. Use appropriate headings, lists, code blocks, and other markdown formatting where it makes sense.

${prompt}`;

		return this.streamText(wrappedPrompt, options);
	}

	/**
	 * Generate text without streaming (for simpler use cases)
	 */
	async generateText(prompt: string): Promise<string> {
		const result = await generateText({
			model: this.model,
			prompt,
		});

		return result.text;
	}
}

// Example usage:
async function example() {
	const transformer = new TransformerAI("your-api-key");

	// Simple streaming example
	const streamResult = await transformer.streamText(
		"Write a short story about a robot learning to paint.",
		{
			onToken: (token) => console.log("Token:", token),
			onError: (error) => console.error("Error:", error),
			onComplete: (text) => console.log("Complete:", text),
		}
	);

	// You can also consume the stream directly
	for await (const chunk of streamResult.textStream) {
		console.log(chunk);
	}

	// Markdown streaming example
	await transformer.streamMarkdown(
		"Explain how to use async/await in JavaScript",
		{
			onToken: (token) => console.log("MD Token:", token),
			onComplete: (text) => console.log("Final Markdown:", text),
		}
	);

	// Simple generation without streaming
	const text = await transformer.generateText(
		"Write a haiku about programming"
	);
	console.log("Generated Text:", text);
}
```
