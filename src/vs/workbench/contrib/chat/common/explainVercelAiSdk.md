I'll gather a comprehensive report on the Vercel AI SDK, focusing on its general AI integration capabilities, including supported models such as Claude Sonnet and others. The report will include clear TypeScript code examples covering basic use cases like chatbot integration, AI-powered search, and text completion.

I'll provide details on how to set up the SDK, configure it, and interact with different AI models. I'll also include insights on model compatibility and best practices for efficient integration.

I'll let you know once the report is ready.

# Vercel AI SDK: AI Integration Capabilities

## Overview of the Vercel AI SDK

The Vercel AI SDK is an open-source TypeScript toolkit that streamlines integration of AI models into applications. It provides a unified API and UI components for building AI-powered apps and agents with frameworks like Next.js, React, Svelte, Vue, and Node.js ([AI SDK by Vercel](https://sdk.vercel.ai/docs/introduction#:~:text=AI%20SDK)). In essence, the SDK abstracts the differences between various large language model (LLM) providers (OpenAI, Anthropic, etc.), allowing developers to switch models without changing application code ([Foundations: Providers and Models](https://sdk.vercel.ai/docs/foundations/providers-and-models#:~:text=Companies%20such%20as%20OpenAI%20and,capabilities%20through%20their%20own%20APIs)) ([Foundations: Providers and Models](https://sdk.vercel.ai/docs/foundations/providers-and-models#:~:text=interacting%20with%20LLMs%20through%20a,same%20API%20for%20all%20providers)). This unified interface helps avoid vendor lock-in and simplifies experimenting with different models to leverage their unique strengths ([How to build scalable AI applications - Vercel](https://vercel.com/blog/how-to-build-scalable-ai-applications#:~:text=While%20each%20has%20pros%20and,locked%20into%20a%20single%20ecosystem)). Whether you need to generate text, perform completions, or build chat interfaces, the Vercel AI SDK offers a consistent set of functions and hooks to do so.

## Supported AI Models and Providers

One of the core advantages of the Vercel AI SDK is its support for multiple AI model providers through a pluggable system. The SDK comes with first-class providers for many popular LLM services, including:

- **OpenAI** – Access to OpenAI’s chat and completion models (e.g. GPT-3.5-Turbo, GPT-4) and embedding models ([AI SDK Providers: OpenAI](https://sdk.vercel.ai/providers/ai-sdk-providers/openai#:~:text=You%20can%20use%20OpenAI%20language,function)). The OpenAI provider uses your `OPENAI_API_KEY` and can call the Chat Completion API or others as needed ([AI SDK Providers: OpenAI](https://sdk.vercel.ai/providers/ai-sdk-providers/openai#:~:text=Language%20Models)).
- **Anthropic** – Support for Anthropic’s Claude models (e.g. Claude 1, Claude 2, and the Claude 3.5 series). Notably, it supports Claude 3.5 "Sonnet", a powerful model variant geared towards enterprise use ([Vercel Expands AI Toolkit with AI SDK 4.0 Update - InfoQ](https://www.infoq.com/news/2024/11/vercel-ai-sdk/#:~:text=Developers%20can%20now%20extract%2C%20summarize%2C,screenshots%2C%20and%20running%20terminal%20commands)). Claude Sonnet 3.5 can even handle advanced operations like controlling a computer interface (mouse/keyboard actions, running terminal commands) via specialized tools ([Vercel Expands AI Toolkit with AI SDK 4.0 Update - InfoQ](https://www.infoq.com/news/2024/11/vercel-ai-sdk/#:~:text=Developers%20can%20now%20extract%2C%20summarize%2C,screenshots%2C%20and%20running%20terminal%20commands)).
- **Azure OpenAI** – Microsoft’s Azure-hosted OpenAI service, usable via a similar interface as the OpenAI provider.
- **Google AI** – Includes Google’s Generative AI (PaLM API) and Vertex AI models for text and chat ([Vercel Expands AI Toolkit with AI SDK 4.0 Update - InfoQ](https://www.infoq.com/news/2024/11/vercel-ai-sdk/#:~:text=The%20update%20enables%20PDF%20handling,screenshots%2C%20and%20running%20terminal%20commands)).
- **Others** – Additional providers like Amazon Bedrock, Cohere, Mistral AI, xAI Grok, Together.ai, and more are available ([Foundations: Providers and Models](https://sdk.vercel.ai/docs/foundations/providers-and-models#:~:text=%2A%20OpenAI%20Provider%20%20%28%60%40ai,sdk%2Ftogetherai)). The SDK also supports community and self-hosted models through providers like Ollama or by implementing the OpenAI-compatible API spec ([Foundations: Providers and Models](https://sdk.vercel.ai/docs/foundations/providers-and-models#:~:text=The%20open,the%20following%20providers)) ([Foundations: Providers and Models](https://sdk.vercel.ai/docs/foundations/providers-and-models#:~:text=Self)).

Thanks to the unified API design, switching from one model to another is straightforward. For example, you can prototype with OpenAI’s GPT-3.5 and later swap in Anthropic’s Claude 3.5 Sonnet by changing only the provider and model ID, without rewriting your integration logic ([How to build scalable AI applications - Vercel](https://vercel.com/blog/how-to-build-scalable-ai-applications#:~:text=import%20,sdk%2Fanthropic)). This flexibility means you can choose models based on their strengths (speed, knowledge, cost, etc.) and even mix providers in one application without extra complexity ([How to build scalable AI applications - Vercel](https://vercel.com/blog/how-to-build-scalable-ai-applications#:~:text=Full%20model%20portability%20like%20this,enables%20you%20to)).

## Setting Up the SDK in a TypeScript Project

Setting up Vercel’s AI SDK in a TypeScript project is simple:

1. **Install the SDK Package:** In your project, install the core `ai` package (and any provider packages you plan to use). For example:

   ```bash
   npm install ai @ai-sdk/openai @ai-sdk/anthropic
   ```

   This will add the main SDK utilities and the OpenAI and Anthropic providers (install only the providers you need). ([Introducing the Vercel AI SDK: npm i ai - Vercel](https://vercel.com/blog/introducing-the-vercel-ai-sdk#:~:text=To%20install%20the%20SDK%2C%20enter,following%20command%20in%20your%20terminal)) ([AI SDK Providers: OpenAI](https://sdk.vercel.ai/providers/ai-sdk-providers/openai#:~:text=Setup))

2. **Configure API Keys:** Obtain API keys from your chosen AI providers (e.g., an OpenAI API key, Anthropic API key, etc.). The SDK will automatically pick up these credentials from environment variables. For instance, the OpenAI provider looks for an `OPENAI_API_KEY` environment variable, and Anthropic uses `ANTHROPIC_API_KEY` by default ([AI SDK Providers: OpenAI](https://sdk.vercel.ai/providers/ai-sdk-providers/openai#:~:text=)) ([AI SDK Providers: Anthropic](https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic#:~:text=API%20key%20that%20is%20being,environment%20variable)). Ensure you set these in your development environment (e.g. in a `.env` file) and never commit them to source control.

3. **Import and Initialize Providers:** In your code, import the provider functions from the installed packages. For example, to use OpenAI and Anthropic:

   ```ts
   import { openai } from "@ai-sdk/openai";
   import { anthropic } from "@ai-sdk/anthropic";
   ```

   These imports give you functions that create model instances when called with a model identifier (like `'gpt-3.5-turbo'` or `'claude-3-5-sonnet-20241022'`). You typically won’t need additional configuration if your API keys are set, but you can override settings (like base URLs or custom headers) via options if necessary.

4. **Project Setup (Next.js example):** If you are using Next.js or a similar framework, you might create API routes or serverless functions to handle AI requests. No special build steps are required beyond having the packages installed. In Next.js App Router, for instance, you can use the Edge runtime for optimal performance (e.g., `export const runtime = 'edge'` in your route file) ([Introducing the Vercel AI SDK: npm i ai - Vercel](https://vercel.com/blog/introducing-the-vercel-ai-sdk#:~:text=%2F%2F%20IMPORTANT%21%20Set%20the%20runtime,to%20edge)), since the AI SDK is designed to work in edge environments as well.

With installation and configuration done, you’re ready to integrate AI capabilities using the SDK’s functions and hooks.

## Common Use Cases and Examples

Below are three common AI use cases – chatbot interactions, AI-powered search, and text completion – and how to implement them with the Vercel AI SDK. Each example is in TypeScript with clear, commented code.

### Chatbot Integration

Integrating a chatbot using the Vercel AI SDK typically involves two parts: a server API endpoint that processes chat messages with an AI model, and a client-side component that calls this API and renders the conversation. The SDK provides a React hook `useChat` to manage the chat state on the client, and server utilities to stream responses back to the client efficiently.

**Server-Side (Next.js API Route):** You can create an API route (for example, `/api/chat/route.ts` in Next.js App Router) that accepts chat messages and generates a reply using an LLM. Using the SDK’s unified API, the code looks like:

```ts
// app/api/chat/route.ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(req: Request) {
	const { messages } = await req.json(); // messages is an array of {role, content}
	// Use OpenAI's GPT-3.5 Turbo model to generate a completion for the chat
	const responseStream = await streamText({
		model: openai("gpt-3.5-turbo"), // specify the model
		messages, // chat history: e.g. [{ role: 'user', content: 'Hello' }]
	});
	return responseStream.toTextStreamResponse();
}
```

In this example, we import the OpenAI provider and use `streamText` to handle a chat completion. We pass the model (`openai('gpt-3.5-turbo')`) and the conversation history (`messages`). The SDK returns a streamable response which we directly return to the client. The `streamText` function immediately begins streaming tokens as they are generated, which is ideal for interactive chat so the user can start seeing the answer before it's fully complete ([AI SDK Core: Generating Text](https://sdk.vercel.ai/docs/ai-sdk-core/generating-text#:~:text=streamText)) ([AI SDK Core: Generating Text](https://sdk.vercel.ai/docs/ai-sdk-core/generating-text#:~:text=%2F%2F%20example%3A%20use%20textStream%20as,an%20async%20iterable)). (Internally, the SDK manages the OpenAI streaming API and yields a `ReadableStream` of the response text.)

**Client-Side (React Component):** On the frontend, the `useChat` hook makes it easy to send user input to the above API and update the UI with new messages. For example:

```tsx
"use client";
import { useChat } from "ai/react";

export default function ChatWidget() {
	// useChat manages message state and communicates with the `/api/chat` endpoint by default
	const { messages, input, handleInputChange, handleSubmit } = useChat({
		api: "/api/chat", // our API route to call on form submit
	});

	return (
		<div className="chat-widget">
			<div className="messages">
				{messages.map((m) => (
					<div key={m.id} className={`message ${m.role}`}>
						<strong>{m.role}:</strong> {m.content}
					</div>
				))}
			</div>
			<form onSubmit={handleSubmit}>
				<input
					value={input}
					onChange={handleInputChange}
					placeholder="Type your message..."
				/>
				<button type="submit" disabled={!input.trim()}>
					Send
				</button>
			</form>
		</div>
	);
}
```

In the code above, `useChat` handles the form state and posting to the API. When the user submits the form, `useChat` will call our `/api/chat` endpoint, which in turn streams a response from the model. The hook updates the `messages` array state with the new assistant reply as it streams in, so the UI re-renders with the latest chat content. This drastically simplifies building a chat UI – as Vercel notes, a rich streaming chat interface can be made with just a few lines using `useChat` ([Introducing the Vercel AI SDK: npm i ai - Vercel](https://vercel.com/blog/introducing-the-vercel-ai-sdk#:~:text=Building%20a%20rich%20chat%20or,thanks%20to%20useChat%20and%20useCompletion)). By default, `useChat` assumes the API route is `/api/chat`, but this can be customized as shown.

_Switching models:_ Because of the SDK’s provider abstraction, you could swap out the model in the server code without changing the client. For instance, to use Anthropic Claude instead of OpenAI, simply import the Anthropic provider and use `model: anthropic('claude-3-5-sonnet-20241022')` in the `streamText` call. Everything else remains the same – the client code doesn’t need to know which model is serving the responses. This flexibility allows you to choose a model that fits your chatbot’s needs (Claude might excel at longer, detailed answers, for example) and even A/B test models by toggling an environment variable ([How to build scalable AI applications - Vercel](https://vercel.com/blog/how-to-build-scalable-ai-applications#:~:text=Full%20model%20portability%20like%20this,enables%20you%20to)).

### AI-Powered Search (Semantic Search with Embeddings)

AI-powered search refers to using AI to improve search results – often by understanding semantic meaning rather than exact keyword matches. A common approach is to use **embeddings** to enable semantic search. With the Vercel AI SDK, you can generate embeddings for text and use them to build a semantic search or Retrieval-Augmented Generation (RAG) system.

**What are embeddings?** Embeddings are vector representations of text (or images) in a high-dimensional space, such that semantically similar inputs are nearby in that space ([Guides: RAG Chatbot](https://sdk.vercel.ai/docs/guides/rag-chatbot#:~:text=Embeddings%20are%20a%20way%20to,used%20to%20measure%20their%20similarity)). By comparing vectors (e.g., via cosine similarity), you can measure how related two pieces of text are. The SDK supports embedding models from various providers (OpenAI, Cohere, etc.), which you can use via the same interface.

**Example – Finding a relevant document:** Imagine you have an array of documents or sentences, and you want to find which one is most relevant to a user’s query. You can use the SDK’s `embedMany` function to embed all documents, and `embed` to embed the user query, then compare results:

```ts
import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

// Some sample documents to search within
const documents = [
	"The cat sat on the mat.",
	"A guide to Italian cooking.",
	"Latest news in quantum computing.",
];

// 1. Embed all documents (batch embedding)
const { embeddings: docEmbeddings } = await embedMany({
	model: openai.embedding("text-embedding-ada-002"), // OpenAI embedding model
	values: documents,
});

// 2. Embed the search query
const userQuery = "recipes for pasta";
const { embedding: queryEmbedding } = await embed({
	model: openai.embedding("text-embedding-ada-002"),
	value: userQuery,
});

// 3. Find the document with highest cosine similarity to the query
function cosineSimilarity(vecA: number[], vecB: number[]): number {
	// (Helper to calculate cosine similarity between two vectors)
	const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
	const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
	const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
	return dot / (normA * normB);
}
const similarities = docEmbeddings.map((docVec) =>
	cosineSimilarity(docVec, queryEmbedding)
);
const bestMatchIndex = similarities.indexOf(Math.max(...similarities));
console.log("Most relevant document:", documents[bestMatchIndex]);
```

In this code, we use OpenAI’s text embedding model (`text-embedding-ada-002`) to convert both the documents and the query into embedding vectors. We then calculate which document vector is closest to the query vector by cosine similarity. The one with the highest similarity is deemed the most relevant. In practice, this approach lets you perform semantic search: even though the query "recipes for pasta" doesn’t literally match the words in our documents array, the embedding for "recipes for pasta" will be closer to the embedding for "A guide to Italian cooking." than to unrelated sentences, correctly identifying the cookbook as the relevant result.

The SDK’s embedding functions make it straightforward to implement more advanced search systems. For large document sets, you would typically store embeddings in a vector database and query it for nearest neighbors, but the above illustrates the core idea on a small scale. You can also integrate this with a chatbot: for example, find the top relevant documents via embeddings and then feed them (as context) along with the user’s question to a text generation model. This technique, known as Retrieval-Augmented Generation, allows the model to provide answers based on up-to-date or domain-specific data even if the model itself didn’t train on that data ([Guides: RAG Chatbot](https://sdk.vercel.ai/docs/guides/rag-chatbot#:~:text=Combining%20all%20of%20this%20together%2C,process%20would%20look%20like%20this)).

### Text Completion

Text completion is the task of having an AI model continue a piece of text or generate content given a prompt. This could range from autocompleting a sentence to writing a paragraph given an instruction. With Vercel AI SDK, you can use the `generateText` function for one-off text generation tasks, and the `useCompletion` hook (in React) for building an interactive UI component that suggests completions as a user types.

**Basic text generation example:** Suppose we want to generate a short paragraph of text based on a prompt. We can call `generateText` with a prompt and a model. For instance, using Anthropic’s Claude model:

```ts
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const response = await generateText({
	model: anthropic("claude-3-5-sonnet-20240620"), // Claude 3.5 "Sonnet" model
	prompt: "Write a short inspirational quote about teamwork.",
});
console.log(response.text);
```

In this example, we import the Anthropic provider and use Claude 3.5 (Sonnet version) to generate text. The `prompt` is a simple instruction. The result of `generateText` is an object that includes the generated `text` plus metadata like `finishReason` and token usage ([AI SDK Core: Generating Text](https://sdk.vercel.ai/docs/ai-sdk-core/generating-text#:~:text=The%20result%20object%20of%20,all%20required%20data%20is%20available)). We retrieve `response.text` to get the completed quote.

If we used an OpenAI model instead, the code would be nearly identical — just swap `anthropic('claude-3-5-sonnet-20240620')` with `openai('gpt-4')` or another model ID. For example, using OpenAI’s GPT-4:

```ts
const { text } = await generateText({
	model: openai("gpt-4"),
	prompt: "Write a short inspirational quote about teamwork.",
});
```

The SDK automatically handles whether it should call a chat completion or text completion endpoint based on the model; in this case GPT-4 is a chat model but since we provided a single prompt string, the SDK will format it appropriately. You can also provide a `system` message or use `messages` array instead of `prompt` if you need more control (e.g., to set AI assistant behavior or include conversation context) ([AI SDK Core: Generating Text](https://sdk.vercel.ai/docs/ai-sdk-core/generating-text#:~:text=const%20,await%20generateText)) ([AI SDK Core: Generating Text](https://sdk.vercel.ai/docs/ai-sdk-core/generating-text#:~:text=%27You%20are%20a%20professional%20writer,)).

**Streaming vs. non-streaming:** The `generateText` function we used is non-streaming – it waits for the full completion. This is fine for short completions or background tasks. For longer texts or interactive scenarios, the SDK offers `streamText` which streams the output in parts. For example, if building a live autocomplete suggestion or showing the answer as it’s written out, `streamText` would let you update the UI token-by-token. The usage is similar, but you iterate over `result.textStream` (an async iterable of text chunks) instead of waiting for a final `text` ([AI SDK Core: Generating Text](https://sdk.vercel.ai/docs/ai-sdk-core/generating-text#:~:text=%2F%2F%20example%3A%20use%20textStream%20as,an%20async%20iterable)). There is also a React hook `useCompletion` that works analogous to `useChat`, managing the state of an input field and streaming completion results as the user types. In either case, streaming can greatly improve perceived performance for the user.

## Best Practices for Efficient Use of the SDK

To get the most out of the Vercel AI SDK, keep these best practices in mind:

- **Leverage Provider Flexibility:** Design your integration to be model-agnostic. Use environment variables or config to specify which provider/model to use, so you can **easily switch models** to optimize for speed, cost, or quality ([How to build scalable AI applications - Vercel](https://vercel.com/blog/how-to-build-scalable-ai-applications#:~:text=Full%20model%20portability%20like%20this,enables%20you%20to)). The SDK’s unified API allows you to swap out models with minimal code changes, ensuring you’re not locked in to one vendor. For example, you might use a faster, cheaper model for simple queries and a more powerful model for complex tasks ([How to build scalable AI applications - Vercel](https://vercel.com/blog/how-to-build-scalable-ai-applications#:~:text=,coding%20expertise%2C%20etc)).

- **Use Streaming for Better UX:** For chatbots and any interactive prompts, prefer streaming responses. The SDK makes it easy to stream with `streamText` and the `useChat`/`useCompletion` hooks. Streaming allows the AI’s answer to appear token by token, significantly improving the user experience for long responses. Start the stream as soon as the request is made, and update the UI incrementally rather than waiting for the full completion. Vercel’s hooks abstract this for you, so take advantage of them for a responsive UI ([Introducing the Vercel AI SDK: npm i ai - Vercel](https://vercel.com/blog/introducing-the-vercel-ai-sdk#:~:text=Building%20a%20rich%20chat%20or,thanks%20to%20useChat%20and%20useCompletion)).

- **Optimize Context and Prompts:** Large context windows and prompts can incur high token usage and latency. Wherever possible, **keep the input concise**. If building a chatbot, consider summarizing or truncating older conversation history when it grows too large. For question-answering or search, use embeddings to retrieve only relevant context (as shown in the search example) instead of blindly stuffing many documents into the prompt. This not only saves cost but can improve the accuracy of the model’s response by focusing it on relevant information.

- **Secure and Manage API Keys:** Treat your model API keys like any sensitive credential. Use environment variables (as the SDK expects by default) and do not expose keys on the client side. In Next.js, for instance, calls to `generateText` or `streamText` should happen in API routes or server components, not directly in client components, to avoid leaking keys. Also, monitor your usage – if the SDK is running in production, track how often you’re calling the AI APIs to detect anomalies or abuse.

- **Monitor and Tune Performance:** Utilize the SDK’s support for observability and tracing in development. The AI SDK can integrate with OpenTelemetry for tracing requests ([Vercel AI SDK 3.3 - Vercel](https://vercel.com/blog/vercel-ai-sdk-3-3#:~:text=Given%20the%20non,content%20for%20individual%20model%20calls)), which helps in debugging and understanding latency or token consumption for each call. Logging token usage (available in the `result.usage` from `generateText`) or enabling SDK telemetry can help you identify bottlenecks. From a performance standpoint, also take advantage of features like edge runtime (to run requests closer to users) and caching of results where applicable (some providers or models may allow caching frequent queries).

- **Stay Updated and Manage Versions:** The field of AI is moving fast, and Vercel’s SDK is actively evolving. Keep an eye on updates – new versions often add support for the latest models (for example, adding Claude Sonnet 3.5 or new OpenAI versions) and new features like multi-modal inputs. When using experimental features from the SDK, pin your package versions to avoid breaking changes ([Vercel AI SDK 3.3 - Vercel](https://vercel.com/blog/vercel-ai-sdk-3-3#:~:text=changelog)). Regularly review the changelog and upgrade guides when moving to a new major version.

By following these practices, you can build AI integrations that are not only powerful and feature-rich but also maintainable, scalable, and cost-effective. The Vercel AI SDK is designed to handle much of the heavy lifting, so you can focus on crafting great user experiences powered by AI ([Introducing the Vercel AI SDK: npm i ai - Vercel](https://vercel.com/blog/introducing-the-vercel-ai-sdk#:~:text=Vercel%E2%80%99s%20AI%20SDK%20embraces%20interoperability%2C,edge%20streaming%20UI%20experiences)). Using the SDK’s abstractions judiciously – for provider flexibility, streaming, and advanced features – will help ensure your AI-powered application remains robust and future-proof.
