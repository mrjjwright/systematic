#### Deep Explanation of Vercel AI SDK

from deep research by openai

<pre>

# Vercel AI SDK TypeScript Architecture Overview

The Vercel AI SDK is organized as a monorepo containing multiple TypeScript packages, each fulfilling a distinct role in the SDK’s architecture. At a high level, the SDK is split into a **core package** (published as the `ai` npm module) and numerous **provider-specific packages** (published under the `@ai-sdk/*` namespace). There are also utility and UI integration packages for frameworks (React, Svelte, Vue, Solid, etc.), but these are optional and separate from the core. This design allows the SDK to provide a unified API surface while keeping provider-specific logic and framework-specific helpers isolated.

## Core SDK Package (`ai`)

The **core package** (`ai`) is the heart of the SDK. It defines the **unified interfaces**, central types, and high-level functions used to interact with any large language model (LLM) provider. Key responsibilities of the core include:

- Exposing functions like `generateText`, `streamText`, `generateObject`, `embed`, etc., which handle common AI tasks (text completion, streaming responses, structured data generation, embeddings, image generation, etc.) in a provider-agnostic way ([AI SDK Core: generateText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text#:~:text=API%20Signature)) ([AI SDK Core: generateText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text#:~:text=prompt%3A)).
- Defining the **Language Model specification** – an interface that all model providers implement. In version 4 of the SDK, this is represented by **`LanguageModelV1`**, a TypeScript type that encapsulates a model’s capabilities. Each model instance specifies its interface version (`specificationVersion: 'v1'`), the provider name, and the model identifier, along with methods to invoke the model ([ai/packages/provider/src/language-model/v1/language-model-v1.ts at main · vercel/ai · GitHub](https://github.com/vercel/ai/blob/main/packages/provider/src/language-model/v1/language-model-v1.ts#:~:text=readonly%20specificationVersion%3A%20%27v1%27%3B)). For example, `LanguageModelV1` includes methods like `doGenerate()` for one-shot completions and `doStream()` for streaming results, which the core uses under the hood. (The `"do*"` prefix is used to prevent users from calling these low-level methods directly; they are invoked by the core functions instead ([ai/packages/provider/src/language-model/v1/language-model-v1.ts at main · vercel/ai · GitHub](https://github.com/vercel/ai/blob/main/packages/provider/src/language-model/v1/language-model-v1.ts#:~:text=Naming%3A%20,direct%20usage%20of%20the%20method)).)
- Implementing the orchestration logic for calls. When you call `generateText`, the core package prepares the prompt and messages, calls the model’s `doGenerate` method, and then handles post-processing like detecting tool usage, executing tools if requested by the model, and assembling the final result. Internally, this often involves a loop if the model output triggers tool calls (the core will parse the tool request, execute the tool, feed the result back, and let the model continue) ([AI 编程云课堂|1 小时快速理解开源项目\_豆包 MarsCode_InfoQ 写作社区](https://xie.infoq.cn/article/658d4533a47fdbab3e1666cf2#:~:text=1)) ([AI 编程云课堂|1 小时快速理解开源项目\_豆包 MarsCode_InfoQ 写作社区](https://xie.infoq.cn/article/658d4533a47fdbab3e1666cf2#:~:text=4)). This loop continues until the model finishes generating text or data.
- Providing **unified result types**. The output of `generateText` (and similar functions) is a rich object containing the generated text and metadata. For instance, a text generation result includes the main `text` output and may also include a `reasoning` string (for models that separate reasoning), any `sources` used (for retrieval-augmented generation), lists of `toolCalls` and their `toolResults` (if tools were invoked), the `finishReason` (e.g. `'stop'`, `'length'`, `'tool-calls'`, etc.), and a usage report (token counts) ([AI SDK Core: generateText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text#:~:text=Returns)) ([AI SDK Core: generateText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text#:~:text=usage%3A)). It also carries low-level request/response info for debugging (like the raw HTTP body sent to the provider and the provider’s response metadata) ([AI SDK Core: generateText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text#:~:text=request%3F%3A)) ([AI SDK Core: generateText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text#:~:text=response%3F%3A)). All of these are standardized across providers by the core.

In summary, the core package contains the provider-agnostic logic and **TypeScript types** that ensure all providers can be used interchangeably through the same functions. It knows how to format requests to models, when to invoke tools, and how to aggregate the final results in a consistent structure.

## Model Provider Packages

Each model provider (e.g. OpenAI, Anthropic, Google PaLM, Cohere, Mistral, Replicate, etc.) is implemented in its own package under the `@ai-sdk` scope ([AI 编程云课堂|1 小时快速理解开源项目\_豆包 MarsCode_InfoQ 写作社区](https://xie.infoq.cn/article/658d4533a47fdbab3e1666cf2#:~:text=%E8%BF%99%E4%BA%9B%E6%A8%A1%E5%9D%97%E5%88%86%E5%88%AB%E5%AF%B9%E5%BA%94%E4%B8%8D%E5%90%8C%E7%9A%84%20AI%20Provider%EF%BC%88%E5%A6%82%20anthropic%E3%80%81Cohere%E3%80%81Google%E3%80%81Mistral%E3%80%81OpenAI%E3%80%81Replicate%EF%BC%89%E3%80%82)). These **provider packages** are essentially plugins that conform to the core’s language model interface. This modular architecture means you only install and include the providers you need. For example, to use OpenAI models, you install `@ai-sdk/openai` and import its factory function into your code ([GitHub - vercel/ai: Build AI-powered applications with React, Svelte, Vue, and Solid](https://github.com/vercel/ai#:~:text=The%20AI%20SDK%20Core%20module,OpenAI%2C%20Anthropic%2C%20Google%2C%20and%20more)).

All provider packages follow a similar pattern by design:

- **Factory Function**: Each provider exports a factory (such as `openai()`, `anthropic()`, etc.) which you call with a model identifier to get a model instance. For example, `openai('gpt-4-turbo')` returns a `LanguageModel` object configured for that specific OpenAI model ([AI SDK Core: generateText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text#:~:text=import%20,sdk%2Fopenai)) ([AI SDK Core: generateText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text#:~:text=model%3A)). This object implements the `LanguageModelV1` interface – meaning it knows how to fulfill `doGenerate` and `doStream` calls for OpenAI’s API. Internally, providers often have multiple classes or functions to handle different model types (chat vs. completion vs. embedding models), but these details are abstracted away behind the factory function. The factory may route to different internal classes based on the model ID or provide sub-methods (e.g., an `.chat()` method on the factory) to explicitly create certain model types ([Community Providers: Writing a Custom Provider](https://sdk.vercel.ai/providers/community-providers/custom-providers#:~:text=Each%20AI%20SDK%20provider%20should,and%20provide%20a%20default%20instance)) ([Community Providers: Writing a Custom Provider](https://sdk.vercel.ai/providers/community-providers/custom-providers#:~:text=%2F%2F%20explicit%20method%20for%20targeting,in%20case%20there%20are%20several)).
- **Provider Implementation**: Under the hood, each provider package defines one or more classes that implement the core’s spec. For example, the OpenAI package has an `OpenAIChatLanguageModel` class (to call the Chat Completions API) and possibly others for non-chat completions or image generation. These classes include logic to **map core inputs to provider API requests** and **convert provider responses back into the core’s output format**. This includes converting the prompt and messages into the provider’s JSON payload, sending HTTP requests (usually via fetch), and parsing the response (extracting the generated text, reasoning, tool call signals, etc., and computing token usage).
- **Settings and Credentials**: Providers typically define TypeScript types for model-specific settings (e.g. temperature, max tokens) and accept those in their factory functions. They also handle API credentials. By convention, most providers load API keys from environment variables if not explicitly provided. For instance, the OpenAI provider will use the `OPENAI_API_KEY` from `process.env` by default ([GitHub - vercel/ai: Build AI-powered applications with React, Svelte, Vue, and Solid](https://github.com/vercel/ai#:~:text=import%20,OPENAI_API_KEY%20environment%20variable%20is%20set)). The SDK provides a utility `loadApiKey` (from `@ai-sdk/provider-utils`) to standardize this, so each provider package can easily retrieve the key and throw helpful errors if it's missing ([Community Providers: Writing a Custom Provider](https://sdk.vercel.ai/providers/community-providers/custom-providers#:~:text=headers%3A%20%28%29%20%3D)). This design is ideal for Node.js usage, since you can set environment variables for secrets and not hardcode them.
- **Unified Output**: Each provider is responsible for transforming its raw output into the unified result shape expected by the core. For example, OpenAI’s API returns a `choices` array with text; the provider class will take that and populate the `text` field of the result, map OpenAI’s `finish_reason` to the core’s `LanguageModelV1FinishReason` type, count tokens for the usage report, etc., so that when the core receives it, the data aligns with the core types. If the model supports streaming, the provider will wrap the streaming API (using a `ReadableStream` of tokens or JSON parts) and expose it via the `doStream` method so the core can consume it.

Importantly, all providers adhere to the same **Language Model Specification**. This means as a developer you can “swap” providers without changing your core logic – for example, replacing `openai('gpt-4')` with `anthropic('claude-2')` in the `model` field of `generateText` will work seamlessly, because both return objects implementing the same interface. The SDK’s core doesn’t need to know the details of each provider; it just calls `model.doGenerate()` or `model.doStream()` and expects the provider to handle it. This pluggable architecture also makes it straightforward to add new providers. In fact, the Vercel AI SDK team encourages **community providers** by publishing the spec (`@ai-sdk/provider`) and helper utilities (`@ai-sdk/provider-utils`) for anyone to implement their own integrations ([Community Providers: Writing a Custom Provider](https://sdk.vercel.ai/providers/community-providers/custom-providers#:~:text=You%20can%20find%20the%20Language,utils%60%20package%20%28source%20code)). The provider packages in the SDK (OpenAI, etc.) serve as reference implementations that new providers can mimic ([Community Providers: Writing a Custom Provider](https://sdk.vercel.ai/providers/community-providers/custom-providers#:~:text=Implementing%20a%20custom%20language%20model,provider%20involves%20several%20steps)). While this does lead to some **redundant code patterns** across provider packages, it’s an intentional trade-off to keep each integration self-contained and easier to maintain or evolve independently.

## Core TypeScript Types and Structures

For developers integrating deeply with the SDK, understanding the core TypeScript types is essential. Below are the most important types and interfaces, and how they structure the SDK’s functionality:

- **LanguageModel (LanguageModelV1)** – _Interface for Model Providers_: This is the primary interface that model provider instances implement. As mentioned, it includes properties identifying the model (`provider` name and `modelId`) and methods to invoke it. The two critical methods are `doGenerate(options)` and `doStream(options)`, which the core uses for non-streaming and streaming calls respectively ([ai/packages/provider/src/language-model/v1/language-model-v1.ts at main · vercel/ai · GitHub](https://github.com/vercel/ai/blob/main/packages/provider/src/language-model/v1/language-model-v1.ts#:~:text=)) ([ai/packages/provider/src/language-model/v1/language-model-v1.ts at main · vercel/ai · GitHub](https://github.com/vercel/ai/blob/main/packages/provider/src/language-model/v1/language-model-v1.ts#:~:text=doStream%28options%3A%20LanguageModelV1CallOptions%29%3A%20PromiseLike)). The `options` include everything the model needs (the prompt, messages, system prompt, function/tool definitions, etc.), and the result of `doGenerate` is a promise for an object containing at least the generated `text` (if any) and/or `toolCalls` (if the model requested tools), a `finishReason`, and token usage stats ([ai/packages/provider/src/language-model/v1/language-model-v1.ts at main · vercel/ai · GitHub](https://github.com/vercel/ai/blob/main/packages/provider/src/language-model/v1/language-model-v1.ts#:~:text=doGenerate%28options%3A%20LanguageModelV1CallOptions%29%3A%20PromiseLike)) ([ai/packages/provider/src/language-model/v1/language-model-v1.ts at main · vercel/ai · GitHub](https://github.com/vercel/ai/blob/main/packages/provider/src/language-model/v1/language-model-v1.ts#:~:text=%2F)). Streaming (`doStream`) returns a `ReadableStream` of incremental parts (tokens, or objects) that the core can read and forward to the consumer. The `LanguageModelV1` spec also defines capabilities flags like `supportsImageUrls` (whether the model can accept image/file URLs directly) and `supportsStructuredOutputs` (whether it natively supports following a JSON schema for structured output) ([ai/packages/provider/src/language-model/v1/language-model-v1.ts at main · vercel/ai · GitHub](https://github.com/vercel/ai/blob/main/packages/provider/src/language-model/v1/language-model-v1.ts#:~:text=%2F)) ([ai/packages/provider/src/language-model/v1/language-model-v1.ts at main · vercel/ai · GitHub](https://github.com/vercel/ai/blob/main/packages/provider/src/language-model/v1/language-model-v1.ts#:~:text=Flag%20whether%20this%20model%20supports,guided%20generation)). These flags let the core adjust its behavior (e.g. uploading an image file if the model can’t fetch URLs itself). In practice, as a developer using the SDK, you rarely handle `LanguageModel` objects directly beyond obtaining them via the provider factory (e.g., calling `openai(modelId)` returns a `LanguageModel`). But it's useful to know that under the hood this type guarantees a consistent interface for any model.

- **CoreMessage and Subtypes** – _Structured Chat Messages_: The SDK defines a unified message format for chat-based interactions, which is used in functions like `generateText` or `streamText` when you provide a conversation history. The base type is `CoreMessage`, and it has specific subtypes for different roles:

  - **CoreSystemMessage** – represents a system-level instruction, with `role: 'system'` and a plain string `content` (often used for behavior guidelines) ([AI SDK Core: CoreMessage](https://sdk.vercel.ai/docs/reference/ai-sdk-core/core-message#:~:text=CoreSystemMessage)).
  - **CoreUserMessage** – represents a user’s input. It has `role: 'user'` and a `content` that can be either a simple string or a structured payload of mixed content ([AI SDK Core: CoreMessage](https://sdk.vercel.ai/docs/reference/ai-sdk-core/core-message#:~:text=A%20user%20message%20that%20can,of%20text%2C%20images%2C%20and%20files)). Notably, the SDK allows user content to include not just text but also images or files, so `UserContent` is a union of `string` or an array of parts (each part could be a text segment, an image, or a file) ([AI SDK Core: CoreMessage](https://sdk.vercel.ai/docs/reference/ai-sdk-core/core-message#:~:text=type%20CoreUserMessage%20%3D%20)). This lets you include things like image prompts or file uploads in a conversation in a type-safe way.
  - **CoreAssistantMessage** – represents the AI assistant’s response. It has `role: 'assistant'` and its `content` can be a string or an array of parts that include `TextPart` and `ToolCallPart` ([AI SDK Core: CoreMessage](https://sdk.vercel.ai/docs/reference/ai-sdk-core/core-message#:~:text=An%20assistant%20message%20that%20can,or%20a%20combination%20of%20both)). This is where the model’s reply might include both text and a _tool call request_. A `ToolCallPart` is a special content part indicating the model wants to invoke a tool (e.g. asking to perform a web search or calculation).
  - **CoreToolMessage** – a message of `role: 'tool'` used to inject the result of a tool back into the conversation ([AI SDK Core: CoreMessage](https://sdk.vercel.ai/docs/reference/ai-sdk-core/core-message#:~:text=CoreToolMessage)). Its content is an array of `ToolResultPart` objects, which contain the output of tools previously called. Essentially, when the model requests a tool, the core will execute the tool and then append a `CoreToolMessage` to the messages list so the model can “see” the result in the next iteration.

  These message types mirror the roles in a chat-based chain-of-thought loop. By using these structured types (with rigorous Zod schemas for validation), the SDK ensures each provider gets the conversation in the format it expects. For example, the OpenAI provider will convert an array of `CoreMessage` into the API’s messages format. As a developer, you usually don’t construct these objects manually – instead you might use the `system` and `messages` fields of `generateText` (or the React/Vue hooks in the UI packages) and the SDK will convert them appropriately ([AI SDK Core: generateText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text#:~:text=messages%3A)) ([AI SDK Core: generateText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text#:~:text=Array,UIMessage)). However, understanding that messages can include rich content and tool directives can help you leverage advanced features (like image inputs or function calling).

- **Tool and Tool-Related Types** – _Extending model capabilities_: Tools are an optional but powerful part of the SDK’s design. A **Tool** in the SDK is typically an object with a name and an `execute` function (plus a JSON schema for its parameters) that you can pass into `generateText`/`streamText`. The SDK will allow the model to call these tools by outputting a special formatted request (captured as a `ToolCallPart` in an assistant message). The core parses that into a `ToolCall` object (with the tool name and arguments), matches it against the provided tools, and then executes it via the corresponding `execute` function ([AI 编程云课堂|1 小时快速理解开源项目\_豆包 MarsCode_InfoQ 写作社区](https://xie.infoq.cn/article/658d4533a47fdbab3e1666cf2#:~:text=1)) ([AI 编程云课堂|1 小时快速理解开源项目\_豆包 MarsCode_InfoQ 写作社区](https://xie.infoq.cn/article/658d4533a47fdbab3e1666cf2#:~:text=3)). After execution, the result is wrapped in a `ToolResultPart` and inserted as a `CoreToolMessage` for the model’s next round ([AI 编程云课堂|1 小时快速理解开源项目\_豆包 MarsCode_InfoQ 写作社区](https://xie.infoq.cn/article/658d4533a47fdbab3e1666cf2#:~:text=%E7%94%9F%E6%88%90%E7%9A%84%E6%96%87%E6%9C%AC%E4%B8%AD%E5%8F%AF%E8%83%BD%E5%8C%85%E5%90%AB%E5%B7%A5%E5%85%B7%E8%B0%83%E7%94%A8%E3%80%82generateText%20%E5%87%BD%E6%95%B0%E4%BC%9A%E8%A7%A3%E6%9E%90%E8%BF%99%E4%BA%9B%E8%B0%83%E7%94%A8%EF%BC%8C%E5%B9%B6%E5%B0%86%E5%85%B6%E8%BD%AC%E6%8D%A2%E4%B8%BA%20ToolCall%20%E5%AF%B9%E8%B1%A1%E3%80%82)). Important types here include:

  - `ToolCall` (often represented as `LanguageModelV1FunctionToolCall` internally) – holds the name of the tool and the arguments the model wants to use ([ai/packages/provider/src/language-model/v1/language-model-v1.ts at main · vercel/ai · GitHub](https://github.com/vercel/ai/blob/main/packages/provider/src/language-model/v1/language-model-v1.ts#:~:text=Tool%20calls%20that%20the%20model,Can%20be%20undefined%20if%20the)).
  - `ToolResult` – the output from a tool execution, which the model can then see.
  - The core also defines error types like `InvalidToolArgumentsError` for when a tool call doesn’t match the schema, etc., as part of robust error handling.

  For a deep integration, you might define custom tools and ensure your model prompts know how to invoke them. The SDK’s architecture around tools is quite extensible – it treats tool usage as just another part of the conversation flow, which is why those message types above include tool parts.

- **Result and Usage Types** – _Unified outputs_: As mentioned, the result of a text generation is a complex object. The SDK defines types for pieces of it:
  - `CompletionTokenUsage` – contains `promptTokens`, `completionTokens`, and `totalTokens` to report how many tokens were used ([AI SDK Core: generateText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text#:~:text=promptTokens%3A)). Every provider populates this if possible (OpenAI, for instance, includes token counts in responses; others may not, but the SDK will at least compute lengths for prompt vs output).
  - `FinishReason` – an enum of reasons a generation ended (like `'stop'` for normal finish or `'length'` if it hit a token limit, etc.) ([AI SDK Core: generateText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text#:~:text=finishReason%3A)).
  - `Source` – if using retrieval-augmented generation (RAG) models or functions, the `sources` array holds references to documents or URLs used, with fields like `id`, `url`, `title`, and provider-specific metadata for each source ([AI SDK Core: generateText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text#:~:text=Source)) ([AI SDK Core: generateText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text#:~:text=url%3A)). Not all models use this, but it’s part of the unified type so that (for example) a Bing search tool or a database retrieval can attach citations to the answer.
  - **Error types** – The core defines custom errors (under an `AI SDK Errors` module) for common failure cases (invalid API key, rate limits, tool errors, etc.), each as a typed class. This allows developers to catch and handle specific SDK-related errors if needed (for instance, distinguishing a validation error vs a provider API error).

All these types are exported from the core package, so you can import them if you need to type your own functions or data structures when integrating. For example, you might import `CoreMessage` or `CoreUserMessage` to strongly type the messages your function accepts, or use `LanguageModel` type to annotate a variable that could hold any provider’s model.

## Using the SDK in a Node.js Environment

The Vercel AI SDK is designed to run in **Node.js (server-side) or edge runtimes**, and its usage in a Node environment is straightforward. Browser-specific concerns (like not exposing secret API keys) mean that typically you will be calling the SDK from server code (e.g. within an API route, Next.js server function, CLI script, etc.) rather than directly in client-side code.

**Typical consumption in Node.js:**

1. **Install the core and a provider** – For example, if you plan to use OpenAI, you would install the `ai` package and `@ai-sdk/openai` package. The core `ai` package gives you the generic functions, and the OpenAI package provides the model connector ([GitHub - vercel/ai: Build AI-powered applications with React, Svelte, Vue, and Solid](https://github.com/vercel/ai#:~:text=The%20AI%20SDK%20Core%20module,OpenAI%2C%20Anthropic%2C%20Google%2C%20and%20more)).
2. **Set up credentials** – In Node, the simplest method is to set the appropriate environment variables for your provider (e.g. `OPENAI_API_KEY`). The provider packages will automatically read from `process.env` by default ([GitHub - vercel/ai: Build AI-powered applications with React, Svelte, Vue, and Solid](https://github.com/vercel/ai#:~:text=import%20,OPENAI_API_KEY%20environment%20variable%20is%20set)). This keeps your keys out of code. Alternatively, you can sometimes pass an `apiKey` in code when creating the model (the providers’ factory functions often accept an override in their settings object), but environment variables are the default.
3. **Import and call the core functions** – In your Node code, import the needed core function (e.g. `generateText`) from `'ai'`, and import the provider’s factory (e.g. `openai`) from the provider package ([GitHub - vercel/ai: Build AI-powered applications with React, Svelte, Vue, and Solid](https://github.com/vercel/ai#:~:text=import%20,OPENAI_API_KEY%20environment%20variable%20is%20set)). Then create a model instance and call the core function. For example:

   ```ts
   import { generateText } from "ai";
   import { openai } from "@ai-sdk/openai";

   const result = await generateText({
   	model: openai("gpt-4"), // create an OpenAI model instance
   	system: "You are a friendly assistant.", // optional system prompt
   	prompt: "Why is the sky blue?", // user prompt (for single-turn query)
   	// messages: [...]                 // or you could provide a conversation here instead of prompt
   	// tools: { ... }                  // optional: define tools if you want the model to use functions
   });
   console.log(result.text);
   ```
````

```

```

```

As shown above and in the official docs, using the SDK in Node is as simple as calling the core API with a chosen model ([AI 编程云课堂|1 小时快速理解开源项目\_豆包 MarsCode_InfoQ 写作社区](https://xie.infoq.cn/article/658d4533a47fdbab3e1666cf2#:~:text=import%20,main%28%29.catch%28console.error)) ([GitHub - vercel/ai: Build AI-powered applications with React, Svelte, Vue, and Solid](https://github.com/vercel/ai#:~:text=import%20,OPENAI_API_KEY%20environment%20variable%20is%20set)). The `model: openai('gpt-4')` pattern is crucial – it tells the core _which_ provider and model to use, without the rest of your code needing to know how that provider works.

4. **Handle streaming if needed** – If you want token-by-token streaming (for example, to send real-time updates to a client), you can use `streamText` instead of `generateText`. In Node, `streamText` returns an object that contains a native `ReadableStream` of the response. You can iterate over this stream or pipe it as needed. In a Next.js App Router route, for instance, you might convert it to a Web API response using `result.toDataStreamResponse()` for convenience ([GitHub - vercel/ai: Build AI-powered applications with React, Svelte, Vue, and Solid](https://github.com/vercel/ai#:~:text=import%20,sdk%2Fopenai)) ([GitHub - vercel/ai: Build AI-powered applications with React, Svelte, Vue, and Solid](https://github.com/vercel/ai#:~:text=const%20result%20%3D%20streamText%28,messages%2C)). In a plain Node environment, you can use the stream directly: e.g., `for await (const chunk of result.stream) { ... }`. The streaming parts are also well-typed (each chunk is a `LanguageModelV1StreamPart` which could contain a `delta` of text or other info), but often you just handle them as text chunks.

5. **Leverage other core features** – In Node, you can also use other core APIs similarly. For example, `generateImage` works if the provider supports image generation (you’d call `model: openai('dall-e')` or similar), and `embed` for embeddings (with e.g. `model: openai('text-embedding-ada-002')`). The usage pattern remains: get a model via the provider package, then call the core function. Because Node can handle binary data and larger payloads, the SDK will manage things like downloading images (if a model doesn’t support URL inputs) automatically ([ai/packages/provider/src/language-model/v1/language-model-v1.ts at main · vercel/ai · GitHub](https://github.com/vercel/ai/blob/main/packages/provider/src/language-model/v1/language-model-v1.ts#:~:text=%2F)). As a Node developer, you mainly ensure the environment is configured (API keys, any proxy settings) and then call the high-level APIs.

One thing to note is that the core uses the Fetch API under the hood to make HTTP requests to provider endpoints. Node 18+ has a global `fetch` built-in, so no additional polyfill is required ([GitHub - vercel/ai: Build AI-powered applications with React, Svelte, Vue, and Solid](https://github.com/vercel/ai#:~:text=Installation)). If you’re in an environment where `fetch` isn’t available, you’d need to polyfill it, but for most Node setups (or edge runtimes) this is taken care of. The SDK is isomorphic to some extent (it can run in the browser for certain providers or in development), but using it client-side is not recommended for production due to security of API keys.

In summary, consuming the SDK in Node boils down to: **import, configure, and call**. The heavy lifting of dealing with different AI APIs is abstracted away by the combination of the core and provider packages.

## Redundancy and Design Patterns in the SDK

The Vercel AI SDK’s architecture exhibits some deliberate redundancy in its implementation, which is driven by the goal of making the system both **unified and extensible**:

- **Repeated Provider Implementations**: As mentioned, each official provider module (OpenAI, Anthropic, etc.) implements the same interface in a similar way. There is inherent duplication in that each provider has to implement methods like `doGenerate` and map inputs to HTTP calls. Rather than abstracting all providers behind a single class hierarchy (which could become convoluted or hard to extend), the SDK opts for a **copy-and-customize** approach. The official guidance for adding a new provider is literally to copy an existing provider as a template ([Community Providers: Writing a Custom Provider](https://sdk.vercel.ai/providers/community-providers/custom-providers#:~:text=Implementing%20a%20custom%20language%20model,provider%20involves%20several%20steps)). This pattern means there’s some redundant code across packages (for example, each might have slightly different but analogous logic to stream responses or handle errors), but it ensures that each integration can evolve independently with the provider’s API changes. It also lowers the barrier for contributions – one can implement a new provider without understanding a complex inheritance structure, simply by fulfilling the spec in a new module.

- **Provider Utils and Shared Spec**: To mitigate some of the boilerplate repetition, the SDK provides the `@ai-sdk/provider` (spec definitions) and `@ai-sdk/provider-utils` libraries as shared dependencies ([Community Providers: Writing a Custom Provider](https://sdk.vercel.ai/providers/community-providers/custom-providers#:~:text=You%20can%20find%20the%20Language,utils%60%20package%20%28source%20code)) ([Community Providers: Writing a Custom Provider](https://sdk.vercel.ai/providers/community-providers/custom-providers#:~:text=provide%20utilities%20that%20make%20it,utils%60%20package%20%28source%20code)). These contain utilities that _all providers use_, such as:

  - `loadApiKey` – a helper to retrieve API keys from env or function args safely ([Community Providers: Writing a Custom Provider](https://sdk.vercel.ai/providers/community-providers/custom-providers#:~:text=Authorization%3A%20%60Bearer%20%24)).
  - `generateId` – a helper to create request IDs.
  - HTTP helpers for streaming fetch responses, etc.
  - JSON schema handling for structured outputs (ensuring the model’s returned JSON matches the expected schema).

  By using these utils, providers don’t have to rewrite common tasks, and it enforces consistency (e.g., all providers will look for an environment variable by default for credentials, all will trim base URLs similarly, etc.). This is a design pattern where redundancy is reduced by factoring out truly common pieces, but without forcing a one-size-fits-all implementation for everything. Each provider still has the freedom to handle its unique quirks (like OpenAI’s chat vs completion endpoints, or Anthropic’s need for a custom streaming parser) while leveraging shared tools for the mundane parts.

- **Functional Factory Pattern**: The use of a factory function per provider instead of a direct class instantiation is a notable pattern. For example, calling `openai('gpt-4')` is more ergonomic and abstract than instantiating an `OpenAIModel` class with a model ID. Under the hood, that factory might create different classes or call different endpoints, but the user experience is consistent. This also allows providers to expose multiple categories of models under one namespace if needed (for instance, a provider could have `provider.chat()` vs `provider.completion()` internally) while still looking like a single function to the user. It’s a **factory + interface** pattern that provides flexibility. The snippet below (from a custom provider guide) illustrates the approach: the factory function returns a callable object that can handle different model types and internally constructs the appropriate model instance ([Community Providers: Writing a Custom Provider](https://sdk.vercel.ai/providers/community-providers/custom-providers#:~:text=Each%20AI%20SDK%20provider%20should,and%20provide%20a%20default%20instance)) ([Community Providers: Writing a Custom Provider](https://sdk.vercel.ai/providers/community-providers/custom-providers#:~:text=%2F%2F%20explicit%20method%20for%20targeting,in%20case%20there%20are%20several)).

- **Unified Data Models with Extensibility**: The core types (messages, tool calls, etc.) are designed to cover a wide range of use cases, which can feel verbose but ensures future features can fit in. For example, by modeling messages and content parts in a generic way, the SDK can support things like multimodal inputs or function calls without changing the function signatures. This forward-thinking design means some parts of the types might seem “redundant” or not used in simple cases (e.g., a simple prompt doesn’t need an array of `TextPart` – just a string – but the type allows for either). This pattern of **permissive type unions** is intentional to make the SDK flexible. It allows optional features (like tools, or images in prompts) to plug in without overloading the function API with many overloads or separate methods. As a developer integrating deeply, you might notice this redundancy (for instance, content can be string or array in multiple types), but it is there so that advanced scenarios use the same structures as basic ones.

- **Backward Compatibility via Versioned Interfaces**: The `LanguageModelV1` interface is versioned (the `specificationVersion: 'v1'` field) ([ai/packages/provider/src/language-model/v1/language-model-v1.ts at main · vercel/ai · GitHub](https://github.com/vercel/ai/blob/main/packages/provider/src/language-model/v1/language-model-v1.ts#:~:text=readonly%20specificationVersion%3A%20%27v1%27%3B)). This hints at a pattern to allow evolution of the SDK without breaking existing providers. In the future, a `LanguageModelV2` could be introduced with new methods or changed semantics, and the core could discriminate based on the `specificationVersion`. For now, all providers implement v1 of the spec. The versioning is a form of redundancy (some fields like `rawCall` vs `request` in the result exist for legacy reasons ([ai/packages/provider/src/language-model/v1/language-model-v1.ts at main · vercel/ai · GitHub](https://github.com/vercel/ai/blob/main/packages/provider/src/language-model/v1/language-model-v1.ts#:~:text=Raw%20prompt%20and%20setting%20information,for%20observability%20provider%20integration)) ([ai/packages/provider/src/language-model/v1/language-model-v1.ts at main · vercel/ai · GitHub](https://github.com/vercel/ai/blob/main/packages/provider/src/language-model/v1/language-model-v1.ts#:~:text=%2F%2F%20TODO%20rename%20to%20,in%20v2))) that ensures older versions of providers or middleware don’t break as the SDK grows. It’s an architectural pattern to favor robustness: instead of assuming one interface forever, they built in a version tag to handle duplicates or changes gracefully.

In conclusion, the Vercel AI SDK’s TypeScript architecture emphasizes a **clean separation of concerns** (core vs providers vs UI), a strongly-typed unified interface for all model interactions, and a pragmatic approach to code reuse. For a developer aiming to deeply integrate or even extend the SDK, this means you have a clear blueprint to follow. You use the core interfaces and functions to interact with models in a uniform way, and if needed, you implement new providers or tools by adhering to the same interfaces. Despite some repetitive patterns across the codebase, the benefit is clarity – each part of the SDK has a well-defined purpose and shape. This makes the SDK both powerful out-of-the-box and amenable to customization, which is exactly what you want for building and integrating advanced AI capabilities into Node.js applications.

**Sources:**

- Vercel AI SDK Repository – README and usage examples ([GitHub - vercel/ai: Build AI-powered applications with React, Svelte, Vue, and Solid](https://github.com/vercel/ai#:~:text=The%20AI%20SDK%20Core%20module,OpenAI%2C%20Anthropic%2C%20Google%2C%20and%20more)) ([GitHub - vercel/ai: Build AI-powered applications with React, Svelte, Vue, and Solid](https://github.com/vercel/ai#:~:text=import%20,OPENAI_API_KEY%20environment%20variable%20is%20set))
- Vercel AI SDK Documentation – API reference for core functions and types ([AI SDK Core: generateText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text#:~:text=model%3A)) ([AI SDK Core: CoreMessage](https://sdk.vercel.ai/docs/reference/ai-sdk-core/core-message#:~:text=An%20assistant%20message%20that%20can,or%20a%20combination%20of%20both))
- Vercel AI SDK Source – Core message and model type definitions ([AI SDK Core: CoreMessage](https://sdk.vercel.ai/docs/reference/ai-sdk-core/core-message#:~:text=A%20user%20message%20that%20can,of%20text%2C%20images%2C%20and%20files)) ([ai/packages/provider/src/language-model/v1/language-model-v1.ts at main · vercel/ai · GitHub](https://github.com/vercel/ai/blob/main/packages/provider/src/language-model/v1/language-model-v1.ts#:~:text=doGenerate%28options%3A%20LanguageModelV1CallOptions%29%3A%20PromiseLike))
- Vercel AI SDK Blog/Community – Architecture overviews and provider implementation guides ([AI 编程云课堂|1 小时快速理解开源项目\_豆包 MarsCode_InfoQ 写作社区](https://xie.infoq.cn/article/658d4533a47fdbab3e1666cf2#:~:text=%E8%BF%99%E4%BA%9B%E6%A8%A1%E5%9D%97%E5%88%86%E5%88%AB%E5%AF%B9%E5%BA%94%E4%B8%8D%E5%90%8C%E7%9A%84%20AI%20Provider%EF%BC%88%E5%A6%82%20anthropic%E3%80%81Cohere%E3%80%81Google%E3%80%81Mistral%E3%80%81OpenAI%E3%80%81Replicate%EF%BC%89%E3%80%82))

```

#### VSCode Chat API (External/Public/Extension Host)

/Users/jjwright/src/transformer/src/vscode-dts/explainApiChat.md

````markdown
Got it! I’ll research the VS Code Chat Extension API, focusing on the external extension API rather than internal VS Code details. I'll provide a TypeScript-based progressive breakdown, starting with straightforward capabilities and building up to advanced features.

Expect code samples, best practices, and references to exact GitHub paths within the [vscode-dts](https://github.com/microsoft/vscode/tree/main/src/vscode-dts) directory or related areas in the VS Code repo.

I'll update you once I have the findings ready!

# Introduction to the VS Code Chat Extension API

Visual Studio Code’s Chat Extension API allows you to create **chat participants** – specialized bots or assistants that users can invoke with an `@name` in the VS Code Chat view. A chat participant can listen for user messages (including special slash-commands) and respond with rich content (Markdown, code, buttons, references, etc.) in a streaming fashion. In this tutorial, we’ll progressively build a chat extension from a simple example to more advanced features, using TypeScript and VS Code’s extension API. We’ll also reference relevant API definitions from the VS Code repository for clarity.

## Setting Up a Basic Chat Participant

### 1. Declare the Chat Participant in `package.json`

First, register your chat participant in your extension’s `package.json`. This uses the `contributes.chatParticipants` section to provide a unique **ID**, a short **name** (used after `@` in chat), a **fullName** (displayed in the UI), and a short **description** (shown as placeholder text when the participant is active). For example:

```json
{
	"name": "my-chat-extension",
	"publisher": "your-name",
	"contributes": {
		"chatParticipants": [
			{
				"id": "my-chat-extension.myBot",
				"fullName": "My Bot",
				"name": "mybot",
				"description": "Ask me anything about your workspace",
				"isSticky": true
			}
		]
	}
}
```
````

In this example, the participant’s ID is `"my-chat-extension.myBot"`, the user will invoke it with `@mybot`, and after a user starts using it, it will stay “sticky” (persist in the input) because `isSticky` is `true`. The **name** is recommended to be lowercase, and the **fullName** in Title Case ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=input%20field%20after%20the%20user,started%20interacting%20with%20the%20participant)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=,workspace)). (VS Code reserves some common names, like `"workspace"`, so always use a unique prefix to avoid conflicts.)

### 2. Create the Chat Participant in the Extension

With the package.json contribution in place, VS Code will know to activate your extension when the user mentions `@mybot` or selects it. In your extension’s activation code, use `vscode.chat.createChatParticipant` to actually create the participant and provide a handler for incoming chat requests ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=After%20registration%2C%20all%20your%20extension,and%20a%20request%20handler)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=)):

```typescript
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
	// Define the chat request handler (implementation shown next)
	const handler: vscode.ChatRequestHandler = async (
		request: vscode.ChatRequest,
		context: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	) => {
		// (handler logic will go here)
	};

	// Create the chat participant with the same ID as in package.json
	const myBot = vscode.chat.createChatParticipant(
		"my-chat-extension.myBot",
		handler
	);
	// Optionally set an icon (URI of an image file or a ThemeIcon)
	myBot.iconPath = vscode.Uri.joinPath(
		context.extensionUri,
		"images/mybot.png"
	);

	// Register disposal and any additional setup
	context.subscriptions.push(myBot);
}
```

The `createChatParticipant` function registers your participant with VS Code. It takes the participant ID and a request handler function, returning a `ChatParticipant` object ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=)). We set an `iconPath` so that responses from `@mybot` show a custom icon in the chat UI (this can be a file URI or a `ThemeIcon`) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=const%20cat%20%3D%20vscode.chat.createChatParticipant%28%27chat)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=,shown%20in%20UI)). We also push the participant to `context.subscriptions` so it’s disposed automatically on extension unload. Now let's implement the handler logic.

## Handling User Messages and Commands

The core of a chat extension is the **Chat Request Handler** – a callback invoked whenever the user sends a message to your participant. The handler is defined as a function that receives four parameters: `request`, `context`, `stream`, and `token` ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=export%20type%20ChatRequestHandler%20%3D%20,ChatResult)):

- **`request: vscode.ChatRequest`** – Contains details of the user’s message, including the raw prompt text, any slash-command used, referenced variables, and the language model (if the user selected one).
- **`context: vscode.ChatContext`** – Provides context of the conversation, chiefly a `history` of prior messages in this chat session (filtered to ones involving your participant) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=Participants%20have%20access%20to%20the,in%20the%20current%20chat%20session)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=%2F)).
- **`stream: vscode.ChatResponseStream`** – A stream to send your response back to the user. You will write to this stream (e.g., via `stream.markdown(...)`, `stream.progress(...)`, etc.) to output your answer incrementally.
- **`token: vscode.CancellationToken`** – A cancellation token to check for aborts (e.g., if the user resets the session or a new question interrupts the current one).

Let's start with a simple implementation of the handler that echoes the user’s input or recognizes a basic command. We’ll expand this shortly:

```typescript
const handler: vscode.ChatRequestHandler = async (
	request,
	context,
	stream,
	token
) => {
	// If the user invoked a slash command, handle it
	if (request.command === "hello") {
		// This is a custom command we define for greeting
		stream.markdown(
			`👋 Hello! You used the **/${request.command}** command.\n`
		);
		stream.markdown(`How can I assist you today?`);
		return; // end the response here
	}

	// If no special command, just echo the prompt for now
	const userMessage = request.prompt;
	stream.markdown(`You said: **${userMessage}**`);
	// No explicit return needed if we're done streaming (the stream will be closed automatically)
};
```

In this snippet, we check `request.command` – which will be the name of a slash command if the user used one (e.g., typing `/hello`). If it matches `'hello'`, we output a friendly greeting. Otherwise, we take the user’s prompt text (`request.prompt`) and simply echo it back in bold. Notice we used `stream.markdown()` to send formatted text as our response.

**Registering Commands:** To allow `/hello` to be recognized, we must list it in our **chat participant’s commands** in `package.json`. We can add a `commands` array under our participant entry:

```json
"contributes": {
  "chatParticipants": [
    {
      "id": "my-chat-extension.myBot",
      "name": "mybot",
      "fullName": "My Bot",
      "description": "Ask me anything about your workspace",
      "isSticky": true,
      "commands": [
        {
          "name": "hello",
          "description": "Say hello to the bot"
        }
      ]
    }
  ]
}
```

This declares that when the user types `/hello` after selecting `@mybot`, it’s a valid command. VS Code will show “Say hello to the bot” as the description in the autocomplete for slash command ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=One%20of%20the%20tasks%20when,registered%20commands%20with%20their%20description)) ([vscode-extension-samples/chat-sample/package.json at main · microsoft/vscode-extension-samples · GitHub](https://github.com/microsoft/vscode-extension-samples/blob/main/chat-sample/package.json#:~:text=))】. At runtime, `request.command` will be `"hello"` if the user uses this command, and our handler can respond accordingly. (The Chat API activates your extension on-demand, so these contributions ensure your extension loads at the right tim ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=Up,not%20before%20it%20is%20needed))】.)

### Understanding the ChatRequest and ChatContext

Inside the handler, `request.prompt` gives the user’s raw input (excluding the `@participant` name and any leading command ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=%2F)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=,link%20ChatCommand.name%20command))】. For example, if the user typed `@mybot /hello How are you?`, then `request.command === 'hello'` and `request.prompt === 'How are you?'`. If no slash command was used (e.g. just `@mybot Tell me a joke`), then `request.command` is `undefined` and `request.prompt` contains the full query.

The `request` may also include **variables** and a **location** in more complex scenarios. For instance, if the user references some code or context (like dragging in a variable or using an inline chat from an editor/terminal), `request.variables` will list those contextual variables with their resolved value ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=%2F)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=creating%20links%20to))】. The `request.location` property indicates where the chat was initiated (for example, a specific editor or a terminal). You can use this to vary behavior – e.g., if `request.location` indicates a terminal, you might interpret the prompt differently (perhaps as a shell command query) than if it came from the general Chat vie ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=If%20you%20want%20to%20process,return%20a%20more%20elaborate%20response))】.

Meanwhile, the `context.history` provides the conversation history as an array of turns (user questions and your responses) so fa ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=,history)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=%2F))】. This can be useful for context-aware replies. For example, to fetch the last user question to your bot, you could do:

```typescript
const previousRequests = context.history.filter(
	(h) => h instanceof vscode.ChatRequestTurn
);
const lastUserTurn = previousRequests.pop() as
	| vscode.ChatRequestTurn
	| undefined;
if (lastUserTurn) {
	console.log("Last question was:", lastUserTurn.prompt);
}
```

Here we filtered history for `ChatRequestTurn` items (user prompts ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=Participants%20have%20access%20to%20the,in%20the%20current%20chat%20session))】. Keep in mind the history only includes messages directed to _your_ participant – you won’t see other participants’ conversations. It’s up to your handler to decide if and how to use this history (for example, incorporating recent questions into a prompt for an AI model).

## Streaming Responses and Rich Content Output

The Chat API is **streaming-based**, meaning you can send partial results back to the user as they are ready, rather than waiting to produce a single final answe ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=participant,the%20supported%20response%20output%20types)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=In%20practice%2C%20extensions%20typically%20send,can%20use%20the%20%2028))】. The `vscode.ChatResponseStream` passed to your handler has methods for various content types. Each call will append a piece (or “part”) of the response to the chat UI. Some useful methods include:

- `stream.markdown(content: string | MarkdownString)`: Render text or Markdown conten ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=export%20interface%20ChatResponseStream%20)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=,should%20be%20interpreted%20as%20markdown))】. Use this for most text output, including code snippets and images (via Markdown image syntax). It supports full CommonMark Markdow ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=))】.
- `stream.progress(message: string)`: Show a transient progress/update message (like a status ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=%2F)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=))】. This is useful to inform the user that work is ongoing (e.g., “Searching the project…”) before the final answer is ready.
- `stream.codeblock(language: string, code: string)`: There isn’t a direct `codeblock` method, but you can achieve this by calling `stream.markdown` with triple-backtick fenced code. For example:
  ````ts
  stream.markdown("```python\nprint('Hello')\n```");
  ````
  This will render a syntax-highlighted code block. (You can send it in one chunk or multiple chunks – VS Code will combine them in the UI.)
- `stream.button(command: {command: string, title: string, arguments?: any[]})`: Render a clickable button that triggers a VS Code comman ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=%2F%2F%20Render%20a%20button%20to,t%28%27Run%20my%20command%27%29))】. For instance, you might present a “Refactor” button. Example:
  ```ts
  stream.button({
  	command: "myExtension.doRefactor",
  	title: vscode.l10n.t("Refactor Code"),
  });
  ```
  This will show a button labeled “Refactor Code” which, when clicked, runs the `myExtension.doRefactor` command (which your extension can define).
- `stream.reference(uriOrLocation: Uri | Location)`: Add a reference entry (link) to a resource, which will appear in a **References** section of the chat response (usually below the main answer ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=%2F%2F%20Add%20a%20reference%20to,reference%28fileUri))】. Use this to cite sources or point to files. For example, `stream.reference(vscode.Uri.file('/path/to/file.ts'));` will add a reference to that file. You can also specify a `Location` (Uri + range) to link to a specific line rang ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=match%20at%20L747%20stream,fileRange)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=%2F%2F%20Add%20a%20reference%20to,Location%28fileUri%2C%20fileRange))】. These references appear as a list the user can click on, without cluttering the main text.
- `stream.anchor(uriOrLocation, title?)`: Insert an inline link anchor into your Markdown conten ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=Example%20code%20snippet%3A))】. This is similar to embedding a markdown link, but using the API ensures the link is correctly handled by VS Code. For example, `stream.anchor(someUri, "details here")` will insert a hyperlink labeled "details here" that opens `someUri` when clicked.

All these methods return the stream itself, so you can chain calls or just call sequentially. **For example:** suppose our bot wants to show a code snippet, a reference, and a follow-up button:

````typescript
stream.progress("Analyzing your code..."); // immediate feedback to user

// Send a code block
stream.markdown("Here is an example:\n");
stream.markdown(
	"```javascript\nfunction hello() {\n  console.log('Hello World');\n}\n```"
);

// Add a reference to the source of this example (e.g., a file in the workspace)
const fileUri = vscode.Uri.file("/workspace/utils/example.js");
stream.reference(fileUri);

// Provide an interactive button for an additional action
stream.button({
	command: "my-chat-extension.explainCode", // assume we have a command to explain code
	title: vscode.l10n.t("Explain this code"),
});
````

In this snippet, the user will see a progress message _“Analyzing your code…”_ (which will disappear once the next parts appear), followed by a Markdown section with a JavaScript code block, then a **References** entry linking to `utils/example.js`, and a button **“Explain this code”**. The button is wired to a command `my-chat-extension.explainCode` – you would implement that command separately (perhaps to open a detailed explanation in the editor or to send another chat query).

**Note on command links:** You can also embed commands as markdown links (using the `command:` URI scheme) if needed. If doing so, wrap the string in a `vscode.MarkdownString` and mark it trusted for the specific command to avoid it being blocke ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=To%20protect%20against%20command%20injection,command%20link%20will%20not%20work)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=let%20markdownCommandString%3A%20vscode,enabledCommands%3A%20%5BCAT_NAMES_COMMAND_ID%5D))】. The button API as shown above simplifies this for common scenarios.

## Customizing Behavior with Slash Commands and Follow-ups

We already saw how to register and handle basic slash commands. Let’s extend our bot with more commands and **follow-up suggestions** that help the user continue the conversation.

### Adding More Slash Commands

Suppose our bot can perform a couple of actions: greet the user (`/hello`) and tell a joke (`/joke`). We add both to `package.json` under `commands`:

```json
"commands": [
  { "name": "hello", "description": "Greet the bot" },
  { "name": "joke",  "description": "Ask for a programming joke" }
]
```

With that, in our handler we handle them:

```typescript
if (request.command === "hello") {
	stream.markdown("Hello there! 🤖");
	return;
} else if (request.command === "joke") {
	// Provide a joke (simple hardcoded example)
	stream.markdown(
		"_Why do programmers prefer dark mode? Because light attracts bugs!_"
	);
	return;
}
```

When the user types `@mybot /joke`, the handler recognizes the `'joke'` command and responds accordingly. VS Code’s chat input will offer `/hello` and `/joke` as suggestions after typing `@mybot /` (with the descriptions we provide ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=One%20of%20the%20tasks%20when,registered%20commands%20with%20their%20description))6】.

### Suggesting Follow-Up Questions

After your participant answers a question, you can provide suggested next questions for the user, displayed as clickable chips in the UI. To do this, assign a **follow-up provider** to your `ChatParticipant` object. The follow-up provider is simply an object with a `provideFollowups` method that returns an array of `ChatFollowup` items (or a Promise thereo ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=After%20each%20chat%20request%2C%20VS,capabilities%20of%20the%20chat%20extension)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=%2F))3】. Each `ChatFollowup` includes a `prompt` (the text that will be sent if the user clicks it) and optionally a `title`/`label` to display if you want to show a shorter description.

For example, let’s suggest a follow-up if the user used our `/hello` command – maybe prompt them to ask for a joke next:

```typescript
myBot.followupProvider = {
	provideFollowups(result, context, token) {
		if (result.metadata?.command === "hello") {
			return [
				{
					prompt: "tell me a joke",
					title: vscode.l10n.t("Tell me a joke"),
				} as vscode.ChatFollowup,
			];
		}
		return [];
	},
};
```

In this code, after any chat turn, VS Code calls `provideFollowups` with the `result` from our participant’s last response (we can embed info in `result.metadata` if we want – here we assume we set `metadata.command` in the result when handling `/hello ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=provideFollowups%28result%3A%20ICatChatResult%2C%20context%3A%20vscode,))6】. If the last command was `'hello'`, we return an array with one suggestion: *“Tell me a joke”*. The `prompt`is the exact text that will be fed to our participant if the user clicks it, and`title`is a human-friendly text to display (if different – in this case we make them the same except for localization). Now, when the user uses`/hello`, they’ll see a follow-up chip “Tell me a joke” appear, and clicking it will send that as a new question to `@mybot`(which will trigger the`/joke` command response in our handler).

_(Under the hood, `ChatFollowup` can also specify a different participant or command, but typically you leave those blank to target the same participant. Only participants from your extension can be targeted via followups for safe ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=%2F)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=%2F))3】.)_

**Tip:** Follow-up prompts should be phrased as natural questions or instructions, not just single-word comman ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=Tip))7】. This makes it clearer to the user what the follow-up will do.

### Participant Detection (Advanced)

VS Code can automatically route user questions to your participant even if the user doesn’t explicitly type `@mybot`, using a mechanism called **participant detection**. This is configured via a `disambiguation` section in `package.json` where you provide example phrases and a description of the kinds of queries your participant can hand ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=VS%20Code%20uses%20the%20chat,with%20a%20description%20and%20examples)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=,list%20in%20a%20simple%20way))3】. For instance:

```json
"disambiguation": [
  {
    "category": "workspace_questions",
    "description": "Questions about the user's project structure or code.",
    "examples": [
      "How do I add a login page to my project?",
      "Show me where database connections happen in my code"
    ]
  }
]
```

With such metadata, if the user asks a question in chat (without any `@participant`), VS Code may decide to direct it to your participant if it matches the pattern of your examples/descriptions. This is an advanced feature to make the chat experience more seamless. If you use it, be **specific** in your descriptions and examples to avoid conflicts with other participants, and test thorough ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=Apply%20the%20following%20guidelines%20to,participant%20detection%20for%20your%20extension)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=,in%20chat%20participants))7】. (Built-in participants like `@workspace` take precedence, so ensure your categories don’t overlap too generally with them.)

## Context-Aware Responses and VS Code API Integration

So far, our bot has been fairly self-contained. In more advanced scenarios, your chat participant can leverage other VS Code APIs and external services to provide rich, context-aware answers. Here are a few ways to integrate:

### Using the Language Model API (AI Integration)

If your extension wants to provide AI-generated responses (like using an LLM such as OpenAI GPT), VS Code’s **Language Model API** can help. The `request.model` property is a ready-to-use `vscode.LanguageModel` instance selected by the user in the chat UI (for example, the user might choose “GPT-4” in a model dropdow ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=,28%20in%20your%20extension)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=chat%20location,Model%20API%20in%20your%20extension))2】. You can directly use this model to generate a response. For example:

```typescript
if (!request.command) {
	// no slash command, treat as a general question
	if (request.model) {
		// Use the selected AI model to answer the question
		const userQuery = request.prompt;
		stream.progress("Thinking..."); // show progress

		const response = await request.model.sendRequest(
			[vscode.LanguageModelChatMessage.user(userQuery)], // conversation so far; simple with one user prompt
			{ temperature: 0.7 }, // optional generation parameters
			token
		);
		if (token.isCancellationRequested) {
			return; // if cancelled, abort
		}
		if (response) {
			// Stream the AI response (assuming it comes as Markdown text)
			stream.markdown(response.content);
		} else {
			stream.markdown("_(No response)_");
		}
		return;
	} else {
		stream.markdown("*(No AI model selected to answer this)*");
		return;
	}
}
```

In this pseudo-code, if the user asks a question without a specific command and has a model selected, we call `request.model.sendRequest` with the user’s prompt. We stream a “Thinking…” message immediately, then output the model’s answer when ready. The Chat API’s streaming design is compatible with streaming model responses as we ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=In%20practice%2C%20extensions%20typically%20send,can%20use%20the%20%2028))7】. For instance, if using a model that provides incremental tokens, you could call `stream.markdown(partialText)` repeatedly in a loop as tokens arrive. (For simplicity, the above code waits for the full response.)

### Accessing Workspace or Editor Context

Your chat extension can use any other VS Code extension API to gather context. For example, if the question is about finding something in the workspace, you might use `vscode.workspace.findFiles` or search text in files. If the question is about the current open editor, you can inspect `vscode.window.activeTextEditor`. You can even manipulate the workspace in response to chat commands (though it’s best to confirm with the user).

For instance, suppose we have a command `/open <filename>` to open a file. Our handler could do:

```typescript
if (request.command === "open") {
	const fileName = request.prompt.trim();
	const files = await vscode.workspace.findFiles(`**/${fileName}`);
	if (files.length > 0) {
		stream.markdown(`Opening \`${fileName}\` ...`);
		vscode.window.showTextDocument(files[0]);
	} else {
		stream.markdown(`Sorry, I couldn't find any file named **${fileName}**.`);
	}
	return;
}
```

This demonstrates that the chat handler can call VS Code commands/APIs (like `showTextDocument`) as side effects to fulfill the user’s request. In this case, the bot searches the workspace for the given filename and opens the first match.

### Outputting VS Code Commands and Actions

We saw how to output buttons and command links that trigger VS Code commands. You can use this to let the user invoke other functionality. For example, if your extension already has a command to refactor code or create tests, your chat response can include a button that calls that command (which might open a webview or perform some task).

In our earlier code snippet with `stream.button`, we registered a command `my-chat-extension.explainCode`. You’d implement that in `activate` like any other command (using `vscode.commands.registerCommand`). The only difference is how the chat UI triggers it. Also, if you want to pass arguments via a command link, remember to encode them properly as shown in the VS Code do ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=If%20the%20command%20takes%20arguments%2C,string%20to%20the%20command%20link)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=%60%5BUse%20cat%20names%5D%28command%3A%24,enabledCommands%3A%20%5BCAT_NAMES_COMMAND_ID%5D))8】.

### Telemetry and Feedback Integration

For long-term improvement of your chat extension, you should collect feedback. VS Code provides an event `onDidReceiveFeedback` on the ChatParticipant, which fires when a user gives a thumbs-up or thumbs-down on a chat respon ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=const%20logger%20%3D%20vscode.env.createTelemetryLogger%28,logging%20implementation%20goes%20here)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=%2F))6】. You can use `vscode.env.createTelemetryLogger` to send this info to your telemetry service or output it for analysis:

```typescript
const logger = vscode.env.createTelemetryLogger(...);
myBot.onDidReceiveFeedback((feedback: vscode.ChatResultFeedback) => {
  // feedback.kind is an enum: 0 = Unhelpful, 1 = Helpf ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=export%20enum%20ChatResultFeedbackKind%20)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=%2F))4】
  logger.logUsage('chatResultFeedback', {
    kind: feedback.kind
  });
});
```

In the sample above, we log an event with whether the feedback was helpful or n ([vscode-extension-samples/chat-sample/src/simple.ts at main · microsoft/vscode-extension-samples · GitHub](https://github.com/microsoft/vscode-extension-samples/blob/main/chat-sample/src/simple.ts#:~:text=%2F%2F%20unhelpful%20%2F%20totalRequests%20is,a%20good%20success%20metric)) ([vscode-extension-samples/chat-sample/src/simple.ts at main · microsoft/vscode-extension-samples · GitHub](https://github.com/microsoft/vscode-extension-samples/blob/main/chat-sample/src/simple.ts#:~:text=logger.logUsage%28%27chatResultFeedback%27%2C%20))2】. You could also track the total number of requests handled, etc., to compute success metrics (e.g., a simple metric could be _unhelpful count_ / \*total request ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=We%20recommend%20that%20you%20measure,unhelpful_feedback_count%20%2F%20total_requests)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=%2F%2F%20Log%20chat%20result%20feedback,))9】). Be sure to follow user privacy guidelines when recording any telemetry.

## Best Practices for Chat Extension Developers

Working with the Chat API involves both UX considerations and proper use of the VS Code API. Here are some best practices:

- **Activate on Demand:** Do not activate your extension on startup for chat features. Rely on the `chatParticipants` contribution so VS Code activates your extension only when needed (e.g., when the user types `@mybot ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=Up,not%20before%20it%20is%20needed))9】. This keeps VS Code fast.
- **Unique Naming:** Choose a unique, descriptive `name` and `id` for your participant. Prefix the id with your extension or company name to avoid collisio ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=Property%20Description%20Naming%20guidelines%20,identifier%20for%20the%20chat%20participant)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=,participant))7】. Use a short lowercase nickname for `name` and a human-friendly `fullNam ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=input%20field%20after%20the%20user,started%20interacting%20with%20the%20participant))4】. Avoid names that might be reserved or easily confused with built-ins.
- **Stream Your Responses:** Leverage the streaming API to provide feedback. If an operation takes time (e.g., calling an API or running analysis), use `stream.progress()` to show intermediate stat ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=An%20extension%20can%20use%20the,stream%20in%20the%20following%20way)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=stream.button%28,))7】. This keeps the user engaged and aware that work is in progress.
- **Use Rich Content Wisely:** Markdown, code blocks, and buttons make your responses more helpful. For example, return formatted code when explaining code, use **References** for sources (instead of dumping long text), and provide buttons for quick actions. However, don’t overdo it – ensure the response is still readable.
- **Handle Commands and Variables Robustly:** If you define slash commands, always check `request.command` in your handler. Validate any parameters the user provides (the text in `request.prompt` after the command) to avoid errors or misuse. For variables in `request.variables`, decide if you want to inline them or mention them – do what makes sense so the response is coherent.
- **Cancellation**: Always pay attention to the `CancellationToken`. If `token.isCancellationRequested` becomes true (for instance, user aborted or a new question came in), stop any ongoing work (e.g., cancel external requests or break out of loops) to avoid doing unnecessary computations.
- **Participant Handoff:** If your extension can't answer a question, you might choose to not respond or defer to another participant. Currently, VS Code routes each question to one specific participant, so there isn’t a direct way to forward requests between participants. But you could detect out-of-scope queries and politely respond with a suggestion to try a different participant (or just an apology message).
- **Testing and Tuning:** Test your chat participant thoroughly in different scenarios – the Chat view, inline chat (like selecting code and clicking “Ask Copilot”), and with different model selections. Ensure your outputs render as expected (especially multi-part markdown or code). Use telemetry to gather feedback on what users ask and how they rate responses, and iterate on improving your logic or examples.
- **Security:** Be mindful of the content you output. If your extension includes data from the workspace in responses, avoid accidentally leaking sensitive info. When using `MarkdownString` for command links, specify allowed commands in `isTrusted` to prevent injecti ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=To%20protect%20against%20command%20injection,command%20link%20will%20not%20work)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=let%20markdownCommandString%3A%20vscode,enabledCommands%3A%20%5BCAT_NAMES_COMMAND_ID%5D))1】. Also, images/links in Markdown must be from trusted domains or they won’t rend ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=stream))9】.
- **Documentation and Guidance:** Consider providing a brief help for your participant. You can use the `sampleRequest` property of `ChatParticipant` (set via code) to define an example query that appears when the user selects your participant in the `/help` li ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=%2F))8】. Also make your `description` in package.json instructive. These help users discover your bot’s abilities.

By following these practices and utilizing the API features (commands, follow-ups, streaming content, model integration, etc.), you can create a powerful and user-friendly chat extension. The VS Code team’s sample chat extension (a “cat” tutor bot) is a great reference – it demonstrates registering participants, using the Language Model API, tools, and mo ([vscode-extension-samples/chat-sample/src/chatUtilsSample.ts at main · microsoft/vscode-extension-samples · GitHub](https://github.com/microsoft/vscode-extension-samples/blob/main/chat-sample/src/chatUtilsSample.ts#:~:text=export%20function%20registerChatLibChatParticipant%28context%3A%20vscode.ExtensionContext%29%20)) ([vscode-extension-samples/chat-sample/src/chatUtilsSample.ts at main · microsoft/vscode-extension-samples · GitHub](https://github.com/microsoft/vscode-extension-samples/blob/main/chat-sample/src/chatUtilsSample.ts#:~:text=const%20libResult%20%3D%20chatUtils))2】.

With this knowledge, you can start building your own chat participants to assist users in VS Code. Happy coding with `@` chats! 🚀

**Sources:**

- VS Code Chat Extension Guide and API referen ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=After%20registration%2C%20all%20your%20extension,and%20a%20request%20handler)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=export%20type%20ChatRequestHandler%20%3D%20,ChatResult)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=,shown%20in%20UI)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=Participants%20have%20access%20to%20the,in%20the%20current%20chat%20session)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=One%20of%20the%20tasks%20when,registered%20commands%20with%20their%20description))46】
- VS Code `vscode.d.ts` definitions for Chat API (ChatRequest, ChatResponseStream, ChatParticipant, et ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=%2F)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=%2F)) ([vscode/src/vscode-dts/vscode.proposed.chatParticipant.d.ts at b44593a612337289c079425a5b2cc7010216eef4 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/b44593a612337289c079425a5b2cc7010216eef4/src/vscode-dts/vscode.proposed.chatParticipant.d.ts#L475#:~:text=%2F))26】
- VS Code extension sample – Copilot Chat (`chat-sample`), demonstrating commands, follow-ups, and teleme ([vscode-extension-samples/chat-sample/package.json at main · microsoft/vscode-extension-samples · GitHub](https://github.com/microsoft/vscode-extension-samples/blob/main/chat-sample/package.json#:~:text=)) ([vscode-extension-samples/chat-sample/src/simple.ts at main · microsoft/vscode-extension-samples · GitHub](https://github.com/microsoft/vscode-extension-samples/blob/main/chat-sample/src/simple.ts#:~:text=cat.followupProvider%20%3D%20)) ([vscode-extension-samples/chat-sample/src/simple.ts at main · microsoft/vscode-extension-samples · GitHub](https://github.com/microsoft/vscode-extension-samples/blob/main/chat-sample/src/simple.ts#:~:text=context.subscriptions.push%28cat.onDidReceiveFeedback%28%28feedback%3A%20vscode.ChatResultFeedback%29%20%3D))79】
</pre>

src/vscode-dts/vscode.d.ts

````typescript
declare module "vscode" {
	export class ChatRequestTurn {
		/**
		 * The prompt as entered by the user.
		 *
		 * Information about references used in this request is stored in {@link ChatRequestTurn.references}.
		 *
		 * *Note* that the {@link ChatParticipant.name name} of the participant and the {@link ChatCommand.name command}
		 * are not part of the prompt.
		 */
		readonly prompt: string;

		/**
		 * The id of the chat participant to which this request was directed.
		 */
		readonly participant: string;

		/**
		 * The name of the {@link ChatCommand command} that was selected for this request.
		 */
		readonly command?: string;

		/**
		 * The references that were used in this message.
		 */
		readonly references: ChatPromptReference[];

		/**
		 * The list of tools were attached to this request.
		 */
		readonly toolReferences: readonly ChatLanguageModelToolReference[];

		/**
		 * @hidden
		 */
		private constructor(
			prompt: string,
			command: string | undefined,
			references: ChatPromptReference[],
			participant: string,
			toolReferences: ChatLanguageModelToolReference[]
		);
	}

	/**
	 * Represents a chat participant's response in chat history.
	 */
	export class ChatResponseTurn {
		/**
		 * The content that was received from the chat participant. Only the stream parts that represent actual content (not metadata) are represented.
		 */
		readonly response: ReadonlyArray<
			| ChatResponseMarkdownPart
			| ChatResponseFileTreePart
			| ChatResponseAnchorPart
			| ChatResponseCommandButtonPart
		>;

		/**
		 * The result that was received from the chat participant.
		 */
		readonly result: ChatResult;

		/**
		 * The id of the chat participant that this response came from.
		 */
		readonly participant: string;

		/**
		 * The name of the command that this response came from.
		 */
		readonly command?: string;

		/**
		 * @hidden
		 */
		private constructor(
			response: ReadonlyArray<
				| ChatResponseMarkdownPart
				| ChatResponseFileTreePart
				| ChatResponseAnchorPart
				| ChatResponseCommandButtonPart
			>,
			result: ChatResult,
			participant: string
		);
	}

	/**
	 * Extra context passed to a participant.
	 */
	export interface ChatContext {
		/**
		 * All of the chat messages so far in the current chat session. Currently, only chat messages for the current participant are included.
		 */
		readonly history: ReadonlyArray<ChatRequestTurn | ChatResponseTurn>;
	}

	/**
	 * Represents an error result from a chat request.
	 */
	export interface ChatErrorDetails {
		/**
		 * An error message that is shown to the user.
		 */
		message: string;

		/**
		 * If set to true, the response will be partly blurred out.
		 */
		responseIsFiltered?: boolean;
	}

	/**
	 * The result of a chat request.
	 */
	export interface ChatResult {
		/**
		 * If the request resulted in an error, this property defines the error details.
		 */
		errorDetails?: ChatErrorDetails;

		/**
		 * Arbitrary metadata for this result. Can be anything, but must be JSON-stringifyable.
		 */
		readonly metadata?: { readonly [key: string]: any };
	}

	/**
	 * Represents the type of user feedback received.
	 */
	export enum ChatResultFeedbackKind {
		/**
		 * The user marked the result as unhelpful.
		 */
		Unhelpful = 0,

		/**
		 * The user marked the result as helpful.
		 */
		Helpful = 1,
	}

	/**
	 * Represents user feedback for a result.
	 */
	export interface ChatResultFeedback {
		/**
		 * The ChatResult for which the user is providing feedback.
		 * This object has the same properties as the result returned from the participant callback, including `metadata`, but is not the same instance.
		 */
		readonly result: ChatResult;

		/**
		 * The kind of feedback that was received.
		 */
		readonly kind: ChatResultFeedbackKind;
	}

	/**
	 * A followup question suggested by the participant.
	 */
	export interface ChatFollowup {
		/**
		 * The message to send to the chat.
		 */
		prompt: string;

		/**
		 * A title to show the user. The prompt will be shown by default, when this is unspecified.
		 */
		label?: string;

		/**
		 * By default, the followup goes to the same participant/command. But this property can be set to invoke a different participant by ID.
		 * Followups can only invoke a participant that was contributed by the same extension.
		 */
		participant?: string;

		/**
		 * By default, the followup goes to the same participant/command. But this property can be set to invoke a different command.
		 */
		command?: string;
	}

	/**
	 * Will be invoked once after each request to get suggested followup questions to show the user. The user can click the followup to send it to the chat.
	 */
	export interface ChatFollowupProvider {
		/**
		 * Provide followups for the given result.
		 *
		 * @param result This object has the same properties as the result returned from the participant callback, including `metadata`, but is not the same instance.
		 * @param context Extra context passed to a participant.
		 * @param token A cancellation token.
		 */
		provideFollowups(
			result: ChatResult,
			context: ChatContext,
			token: CancellationToken
		): ProviderResult<ChatFollowup[]>;
	}

	/**
	 * A chat request handler is a callback that will be invoked when a request is made to a chat participant.
	 */
	export type ChatRequestHandler = (
		request: ChatRequest,
		context: ChatContext,
		response: ChatResponseStream,
		token: CancellationToken
	) => ProviderResult<ChatResult | void>;

	/**
	 * A chat participant can be invoked by the user in a chat session, using the `@` prefix. When it is invoked, it handles the chat request and is solely
	 * responsible for providing a response to the user. A ChatParticipant is created using {@link chat.createChatParticipant}.
	 */
	export interface ChatParticipant {
		/**
		 * A unique ID for this participant.
		 */
		readonly id: string;

		/**
		 * An icon for the participant shown in UI.
		 */
		iconPath?: IconPath;

		/**
		 * The handler for requests to this participant.
		 */
		requestHandler: ChatRequestHandler;

		/**
		 * This provider will be called once after each request to retrieve suggested followup questions.
		 */
		followupProvider?: ChatFollowupProvider;

		/**
		 * An event that fires whenever feedback for a result is received, e.g. when a user up- or down-votes
		 * a result.
		 *
		 * The passed {@link ChatResultFeedback.result result} is guaranteed to have the same properties as the result that was
		 * previously returned from this chat participant's handler.
		 */
		onDidReceiveFeedback: Event<ChatResultFeedback>;

		/**
		 * Dispose this participant and free resources.
		 */
		dispose(): void;
	}

	/**
	 * A reference to a value that the user added to their chat request.
	 */
	export interface ChatPromptReference {
		/**
		 * A unique identifier for this kind of reference.
		 */
		readonly id: string;

		/**
		 * The start and end index of the reference in the {@link ChatRequest.prompt prompt}. When undefined, the reference was not part of the prompt text.
		 *
		 * *Note* that the indices take the leading `#`-character into account which means they can
		 * used to modify the prompt as-is.
		 */
		readonly range?: [start: number, end: number];

		/**
		 * A description of this value that could be used in an LLM prompt.
		 */
		readonly modelDescription?: string;

		/**
		 * The value of this reference. The `string | Uri | Location` types are used today, but this could expand in the future.
		 */
		readonly value: string | Uri | Location | unknown;
	}

	/**
	 * A request to a chat participant.
	 */
	export interface ChatRequest {
		/**
		 * The prompt as entered by the user.
		 *
		 * Information about references used in this request is stored in {@link ChatRequest.references}.
		 *
		 * *Note* that the {@link ChatParticipant.name name} of the participant and the {@link ChatCommand.name command}
		 * are not part of the prompt.
		 */
		readonly prompt: string;

		/**
		 * The name of the {@link ChatCommand command} that was selected for this request.
		 */
		readonly command: string | undefined;

		/**
		 * The list of references and their values that are referenced in the prompt.
		 *
		 * *Note* that the prompt contains references as authored and that it is up to the participant
		 * to further modify the prompt, for instance by inlining reference values or creating links to
		 * headings which contain the resolved values. References are sorted in reverse by their range
		 * in the prompt. That means the last reference in the prompt is the first in this list. This simplifies
		 * string-manipulation of the prompt.
		 */
		readonly references: readonly ChatPromptReference[];

		/**
		 * The list of tools that the user attached to their request.
		 *
		 * When a tool reference is present, the chat participant should make a chat request using
		 * {@link LanguageModelChatToolMode.Required} to force the language model to generate input for the tool. Then, the
		 * participant can use {@link lm.invokeTool} to use the tool attach the result to its request for the user's prompt. The
		 * tool may contribute useful extra context for the user's request.
		 */
		readonly toolReferences: readonly ChatLanguageModelToolReference[];

		/**
		 * A token that can be passed to {@link lm.invokeTool} when invoking a tool inside the context of handling a chat request.
		 * This associates the tool invocation to a chat session.
		 */
		readonly toolInvocationToken: ChatParticipantToolToken;

		/**
		 * This is the model that is currently selected in the UI. Extensions can use this or use {@link chat.selectChatModels} to
		 * pick another model. Don't hold onto this past the lifetime of the request.
		 */
		readonly model: LanguageModelChat;
	}

	/**
	 * The ChatResponseStream is how a participant is able to return content to the chat view. It provides several methods for streaming different types of content
	 * which will be rendered in an appropriate way in the chat view. A participant can use the helper method for the type of content it wants to return, or it
	 * can instantiate a {@link ChatResponsePart} and use the generic {@link ChatResponseStream.push} method to return it.
	 */
	export interface ChatResponseStream {
		/**
		 * Push a markdown part to this stream. Short-hand for
		 * `push(new ChatResponseMarkdownPart(value))`.
		 *
		 * @see {@link ChatResponseStream.push}
		 * @param value A markdown string or a string that should be interpreted as markdown. The boolean form of {@link MarkdownString.isTrusted} is NOT supported.
		 */
		markdown(value: string | MarkdownString): void;

		/**
		 * Push an anchor part to this stream. Short-hand for
		 * `push(new ChatResponseAnchorPart(value, title))`.
		 * An anchor is an inline reference to some type of resource.
		 *
		 * @param value A uri or location.
		 * @param title An optional title that is rendered with value.
		 */
		anchor(value: Uri | Location, title?: string): void;

		/**
		 * Push a command button part to this stream. Short-hand for
		 * `push(new ChatResponseCommandButtonPart(value, title))`.
		 *
		 * @param command A Command that will be executed when the button is clicked.
		 */
		button(command: Command): void;

		/**
		 * Push a filetree part to this stream. Short-hand for
		 * `push(new ChatResponseFileTreePart(value))`.
		 *
		 * @param value File tree data.
		 * @param baseUri The base uri to which this file tree is relative.
		 */
		filetree(value: ChatResponseFileTree[], baseUri: Uri): void;

		/**
		 * Push a progress part to this stream. Short-hand for
		 * `push(new ChatResponseProgressPart(value))`.
		 *
		 * @param value A progress message
		 */
		progress(value: string): void;

		/**
		 * Push a reference to this stream. Short-hand for
		 * `push(new ChatResponseReferencePart(value))`.
		 *
		 * *Note* that the reference is not rendered inline with the response.
		 *
		 * @param value A uri or location
		 * @param iconPath Icon for the reference shown in UI
		 */
		reference(value: Uri | Location, iconPath?: IconPath): void;

		/**
		 * Pushes a part to this stream.
		 *
		 * @param part A response part, rendered or metadata
		 */
		push(part: ChatResponsePart): void;
	}

	/**
	 * Represents a part of a chat response that is formatted as Markdown.
	 */
	export class ChatResponseMarkdownPart {
		/**
		 * A markdown string or a string that should be interpreted as markdown.
		 */
		value: MarkdownString;

		/**
		 * Create a new ChatResponseMarkdownPart.
		 *
		 * @param value A markdown string or a string that should be interpreted as markdown. The boolean form of {@link MarkdownString.isTrusted} is NOT supported.
		 */
		constructor(value: string | MarkdownString);
	}

	/**
	 * Represents a file tree structure in a chat response.
	 */
	export interface ChatResponseFileTree {
		/**
		 * The name of the file or directory.
		 */
		name: string;

		/**
		 * An array of child file trees, if the current file tree is a directory.
		 */
		children?: ChatResponseFileTree[];
	}

	/**
	 * Represents a part of a chat response that is a file tree.
	 */
	export class ChatResponseFileTreePart {
		/**
		 * File tree data.
		 */
		value: ChatResponseFileTree[];

		/**
		 * The base uri to which this file tree is relative
		 */
		baseUri: Uri;

		/**
		 * Create a new ChatResponseFileTreePart.
		 * @param value File tree data.
		 * @param baseUri The base uri to which this file tree is relative.
		 */
		constructor(value: ChatResponseFileTree[], baseUri: Uri);
	}

	/**
	 * Represents a part of a chat response that is an anchor, that is rendered as a link to a target.
	 */
	export class ChatResponseAnchorPart {
		/**
		 * The target of this anchor.
		 */
		value: Uri | Location;

		/**
		 * An optional title that is rendered with value.
		 */
		title?: string;

		/**
		 * Create a new ChatResponseAnchorPart.
		 * @param value A uri or location.
		 * @param title An optional title that is rendered with value.
		 */
		constructor(value: Uri | Location, title?: string);
	}

	/**
	 * Represents a part of a chat response that is a progress message.
	 */
	export class ChatResponseProgressPart {
		/**
		 * The progress message
		 */
		value: string;

		/**
		 * Create a new ChatResponseProgressPart.
		 * @param value A progress message
		 */
		constructor(value: string);
	}

	/**
	 * Represents a part of a chat response that is a reference, rendered separately from the content.
	 */
	export class ChatResponseReferencePart {
		/**
		 * The reference target.
		 */
		value: Uri | Location;

		/**
		 * The icon for the reference.
		 */
		iconPath?: IconPath;

		/**
		 * Create a new ChatResponseReferencePart.
		 * @param value A uri or location
		 * @param iconPath Icon for the reference shown in UI
		 */
		constructor(value: Uri | Location, iconPath?: IconPath);
	}

	/**
	 * Represents a part of a chat response that is a button that executes a command.
	 */
	export class ChatResponseCommandButtonPart {
		/**
		 * The command that will be executed when the button is clicked.
		 */
		value: Command;

		/**
		 * Create a new ChatResponseCommandButtonPart.
		 * @param value A Command that will be executed when the button is clicked.
		 */
		constructor(value: Command);
	}

	/**
	 * Represents the different chat response types.
	 */
	export type ChatResponsePart =
		| ChatResponseMarkdownPart
		| ChatResponseFileTreePart
		| ChatResponseAnchorPart
		| ChatResponseProgressPart
		| ChatResponseReferencePart
		| ChatResponseCommandButtonPart;

	/**
	 * Namespace for chat functionality. Users interact with chat participants by sending messages
	 * to them in the chat view. Chat participants can respond with markdown or other types of content
	 * via the {@link ChatResponseStream}.
	 */
	export namespace chat {
		/**
		 * Create a new {@link ChatParticipant chat participant} instance.
		 *
		 * @param id A unique identifier for the participant.
		 * @param handler A request handler for the participant.
		 * @returns A new chat participant
		 */
		export function createChatParticipant(
			id: string,
			handler: ChatRequestHandler
		): ChatParticipant;
	}

	/**
	 * Represents the role of a chat message. This is either the user or the assistant.
	 */
	export enum LanguageModelChatMessageRole {
		/**
		 * The user role, e.g the human interacting with a language model.
		 */
		User = 1,

		/**
		 * The assistant role, e.g. the language model generating responses.
		 */
		Assistant = 2,
	}

	/**
	 * Represents a message in a chat. Can assume different roles, like user or assistant.
	 */
	export class LanguageModelChatMessage {
		/**
		 * Utility to create a new user message.
		 *
		 * @param content The content of the message.
		 * @param name The optional name of a user for the message.
		 */
		static User(
			content:
				| string
				| Array<LanguageModelTextPart | LanguageModelToolResultPart>,
			name?: string
		): LanguageModelChatMessage;

		/**
		 * Utility to create a new assistant message.
		 *
		 * @param content The content of the message.
		 * @param name The optional name of a user for the message.
		 */
		static Assistant(
			content:
				| string
				| Array<LanguageModelTextPart | LanguageModelToolCallPart>,
			name?: string
		): LanguageModelChatMessage;

		/**
		 * The role of this message.
		 */
		role: LanguageModelChatMessageRole;

		/**
		 * A string or heterogeneous array of things that a message can contain as content. Some parts may be message-type
		 * specific for some models.
		 */
		content: Array<
			| LanguageModelTextPart
			| LanguageModelToolResultPart
			| LanguageModelToolCallPart
		>;

		/**
		 * The optional name of a user for this message.
		 */
		name: string | undefined;

		/**
		 * Create a new user message.
		 *
		 * @param role The role of the message.
		 * @param content The content of the message.
		 * @param name The optional name of a user for the message.
		 */
		constructor(
			role: LanguageModelChatMessageRole,
			content:
				| string
				| Array<
						| LanguageModelTextPart
						| LanguageModelToolResultPart
						| LanguageModelToolCallPart
				  >,
			name?: string
		);
	}

	/**
	 * Represents a language model response.
	 *
	 * @see {@link LanguageModelAccess.chatRequest}
	 */
	export interface LanguageModelChatResponse {
		/**
		 * An async iterable that is a stream of text and tool-call parts forming the overall response. A
		 * {@link LanguageModelTextPart} is part of the assistant's response to be shown to the user. A
		 * {@link LanguageModelToolCallPart} is a request from the language model to call a tool. The latter will
		 * only be returned if tools were passed in the request via {@link LanguageModelChatRequestOptions.tools}. The
		 * `unknown`-type is used as a placeholder for future parts, like image data parts.
		 *
		 * *Note* that this stream will error when during data receiving an error occurs. Consumers of the stream should handle
		 * the errors accordingly.
		 *
		 * To cancel the stream, the consumer can {@link CancellationTokenSource.cancel cancel} the token that was used to make
		 * the request or break from the for-loop.
		 *
		 * @example
		 * ```ts
		 * try {
		 *   // consume stream
		 *   for await (const chunk of response.stream) {
		 *      if (chunk instanceof LanguageModelTextPart) {
		 *        console.log("TEXT", chunk);
		 *      } else if (chunk instanceof LanguageModelToolCallPart) {
		 *        console.log("TOOL CALL", chunk);
		 *      }
		 *   }
		 *
		 * } catch(e) {
		 *   // stream ended with an error
		 *   console.error(e);
		 * }
		 * ```
		 */
		stream: AsyncIterable<
			LanguageModelTextPart | LanguageModelToolCallPart | unknown
		>;

		/**
		 * This is equivalent to filtering everything except for text parts from a {@link LanguageModelChatResponse.stream}.
		 *
		 * @see {@link LanguageModelChatResponse.stream}
		 */
		text: AsyncIterable<string>;
	}

	/**
	 * Represents a language model for making chat requests.
	 *
	 * @see {@link lm.selectChatModels}
	 */
	export interface LanguageModelChat {
		/**
		 * Human-readable name of the language model.
		 */
		readonly name: string;

		/**
		 * Opaque identifier of the language model.
		 */
		readonly id: string;

		/**
		 * A well-known identifier of the vendor of the language model. An example is `copilot`, but
		 * values are defined by extensions contributing chat models and need to be looked up with them.
		 */
		readonly vendor: string;

		/**
		 * Opaque family-name of the language model. Values might be `gpt-3.5-turbo`, `gpt4`, `phi2`, or `llama`
		 * but they are defined by extensions contributing languages and subject to change.
		 */
		readonly family: string;

		/**
		 * Opaque version string of the model. This is defined by the extension contributing the language model
		 * and subject to change.
		 */
		readonly version: string;

		/**
		 * The maximum number of tokens that can be sent to the model in a single request.
		 */
		readonly maxInputTokens: number;

		/**
		 * Make a chat request using a language model.
		 *
		 * *Note* that language model use may be subject to access restrictions and user consent. Calling this function
		 * for the first time (for an extension) will show a consent dialog to the user and because of that this function
		 * must _only be called in response to a user action!_ Extensions can use {@link LanguageModelAccessInformation.canSendRequest}
		 * to check if they have the necessary permissions to make a request.
		 *
		 * This function will return a rejected promise if making a request to the language model is not
		 * possible. Reasons for this can be:
		 *
		 * - user consent not given, see {@link LanguageModelError.NoPermissions `NoPermissions`}
		 * - model does not exist anymore, see {@link LanguageModelError.NotFound `NotFound`}
		 * - quota limits exceeded, see {@link LanguageModelError.Blocked `Blocked`}
		 * - other issues in which case extension must check {@link LanguageModelError.cause `LanguageModelError.cause`}
		 *
		 * An extension can make use of language model tool calling by passing a set of tools to
		 * {@link LanguageModelChatRequestOptions.tools}. The language model will return a {@link LanguageModelToolCallPart} and
		 * the extension can invoke the tool and make another request with the result.
		 *
		 * @param messages An array of message instances.
		 * @param options Options that control the request.
		 * @param token A cancellation token which controls the request. See {@link CancellationTokenSource} for how to create one.
		 * @returns A thenable that resolves to a {@link LanguageModelChatResponse}. The promise will reject when the request couldn't be made.
		 */
		sendRequest(
			messages: LanguageModelChatMessage[],
			options?: LanguageModelChatRequestOptions,
			token?: CancellationToken
		): Thenable<LanguageModelChatResponse>;

		/**
		 * Count the number of tokens in a message using the model specific tokenizer-logic.

		 * @param text A string or a message instance.
		 * @param token Optional cancellation token.  See {@link CancellationTokenSource} for how to create one.
		 * @returns A thenable that resolves to the number of tokens.
		 */
		countTokens(
			text: string | LanguageModelChatMessage,
			token?: CancellationToken
		): Thenable<number>;
	}

	/**
	 * Describes how to select language models for chat requests.
	 *
	 * @see {@link lm.selectChatModels}
	 */
	export interface LanguageModelChatSelector {
		/**
		 * A vendor of language models.
		 * @see {@link LanguageModelChat.vendor}
		 */
		vendor?: string;

		/**
		 * A family of language models.
		 * @see {@link LanguageModelChat.family}
		 */
		family?: string;

		/**
		 * The version of a language model.
		 * @see {@link LanguageModelChat.version}
		 */
		version?: string;

		/**
		 * The identifier of a language model.
		 * @see {@link LanguageModelChat.id}
		 */
		id?: string;
	}

	/**
	 * An error type for language model specific errors.
	 *
	 * Consumers of language models should check the code property to determine specific
	 * failure causes, like `if(someError.code === vscode.LanguageModelError.NotFound.name) {...}`
	 * for the case of referring to an unknown language model. For unspecified errors the `cause`-property
	 * will contain the actual error.
	 */
	export class LanguageModelError extends Error {
		/**
		 * The requestor does not have permissions to use this
		 * language model
		 */
		static NoPermissions(message?: string): LanguageModelError;

		/**
		 * The requestor is blocked from using this language model.
		 */
		static Blocked(message?: string): LanguageModelError;

		/**
		 * The language model does not exist.
		 */
		static NotFound(message?: string): LanguageModelError;

		/**
		 * A code that identifies this error.
		 *
		 * Possible values are names of errors, like {@linkcode LanguageModelError.NotFound NotFound},
		 * or `Unknown` for unspecified errors from the language model itself. In the latter case the
		 * `cause`-property will contain the actual error.
		 */
		readonly code: string;
	}

	/**
	 * Options for making a chat request using a language model.
	 *
	 * @see {@link LanguageModelChat.sendRequest}
	 */
	export interface LanguageModelChatRequestOptions {
		/**
		 * A human-readable message that explains why access to a language model is needed and what feature is enabled by it.
		 */
		justification?: string;

		/**
		 * A set of options that control the behavior of the language model. These options are specific to the language model
		 * and need to be lookup in the respective documentation.
		 */
		modelOptions?: { [name: string]: any };

		/**
		 * An optional list of tools that are available to the language model. These could be registered tools available via
		 * {@link lm.tools}, or private tools that are just implemented within the calling extension.
		 *
		 * If the LLM requests to call one of these tools, it will return a {@link LanguageModelToolCallPart} in
		 * {@link LanguageModelChatResponse.stream}. It's the caller's responsibility to invoke the tool. If it's a tool
		 * registered in {@link lm.tools}, that means calling {@link lm.invokeTool}.
		 *
		 * Then, the tool result can be provided to the LLM by creating an Assistant-type {@link LanguageModelChatMessage} with a
		 * {@link LanguageModelToolCallPart}, followed by a User-type message with a {@link LanguageModelToolResultPart}.
		 */
		tools?: LanguageModelChatTool[];

		/**
		 * 	The tool-selecting mode to use. {@link LanguageModelChatToolMode.Auto} by default.
		 */
		toolMode?: LanguageModelChatToolMode;
	}

	/**
	 * Namespace for language model related functionality.
	 */
	export namespace lm {
		/**
		 * An event that is fired when the set of available chat models changes.
		 */
		export const onDidChangeChatModels: Event<void>;

		/**
		 * Select chat models by a {@link LanguageModelChatSelector selector}. This can yield multiple or no chat models and
		 * extensions must handle these cases, esp. when no chat model exists, gracefully.
		 *
		 * ```ts
		 * const models = await vscode.lm.selectChatModels({ family: 'gpt-3.5-turbo' });
		 * if (models.length > 0) {
		 * 	const [first] = models;
		 * 	const response = await first.sendRequest(...)
		 * 	// ...
		 * } else {
		 * 	// NO chat models available
		 * }
		 * ```
		 *
		 * A selector can be written to broadly match all models of a given vendor or family, or it can narrowly select one model by ID.
		 * Keep in mind that the available set of models will change over time, but also that prompts may perform differently in
		 * different models.
		 *
		 * *Note* that extensions can hold on to the results returned by this function and use them later. However, when the
		 * {@link onDidChangeChatModels}-event is fired the list of chat models might have changed and extensions should re-query.
		 *
		 * @param selector A chat model selector. When omitted all chat models are returned.
		 * @returns An array of chat models, can be empty!
		 */
		export function selectChatModels(
			selector?: LanguageModelChatSelector
		): Thenable<LanguageModelChat[]>;

		/**
		 * Register a LanguageModelTool. The tool must also be registered in the package.json `languageModelTools` contribution
		 * point. A registered tool is available in the {@link lm.tools} list for any extension to see. But in order for it to
		 * be seen by a language model, it must be passed in the list of available tools in {@link LanguageModelChatRequestOptions.tools}.
		 * @returns A {@link Disposable} that unregisters the tool when disposed.
		 */
		export function registerTool<T>(
			name: string,
			tool: LanguageModelTool<T>
		): Disposable;

		/**
		 * A list of all available tools that were registered by all extensions using {@link lm.registerTool}. They can be called
		 * with {@link lm.invokeTool} with input that match their declared `inputSchema`.
		 */
		export const tools: readonly LanguageModelToolInformation[];

		/**
		 * Invoke a tool listed in {@link lm.tools} by name with the given input. The input will be validated against
		 * the schema declared by the tool
		 *
		 * A tool can be invoked by a chat participant, in the context of handling a chat request, or globally by any extension in
		 * any custom flow.
		 *
		 * In the former case, the caller shall pass the
		 * {@link LanguageModelToolInvocationOptions.toolInvocationToken toolInvocationToken}, which comes with the a
		 * {@link ChatRequest.toolInvocationToken chat request}. This makes sure the chat UI shows the tool invocation for the
		 * correct conversation.
		 *
		 * A tool {@link LanguageModelToolResult result} is an array of {@link LanguageModelTextPart text-} and
		 * {@link LanguageModelPromptTsxPart prompt-tsx}-parts. If the tool caller is using `@vscode/prompt-tsx`, it can
		 * incorporate the response parts into its prompt using a `ToolResult`. If not, the parts can be passed along to the
		 * {@link LanguageModelChat} via a user message with a {@link LanguageModelToolResultPart}.
		 *
		 * If a chat participant wants to preserve tool results for requests across multiple turns, it can store tool results in
		 * the {@link ChatResult.metadata} returned from the handler and retrieve them on the next turn from
		 * {@link ChatResponseTurn.result}.
		 *
		 * @param name The name of the tool to call.
		 * @param options The options to use when invoking the tool.
		 * @param token A cancellation token. See {@link CancellationTokenSource} for how to create one.
		 * @returns The result of the tool invocation.
		 */
		export function invokeTool(
			name: string,
			options: LanguageModelToolInvocationOptions<object>,
			token?: CancellationToken
		): Thenable<LanguageModelToolResult>;
	}

	/**
	 * Represents extension specific information about the access to language models.
	 */
	export interface LanguageModelAccessInformation {
		/**
		 * An event that fires when access information changes.
		 */
		onDidChange: Event<void>;

		/**
		 * Checks if a request can be made to a language model.
		 *
		 * *Note* that calling this function will not trigger a consent UI but just checks for a persisted state.
		 *
		 * @param chat A language model chat object.
		 * @return `true` if a request can be made, `false` if not, `undefined` if the language
		 * model does not exist or consent hasn't been asked for.
		 */
		canSendRequest(chat: LanguageModelChat): boolean | undefined;
	}

	/**
	 * A tool that is available to the language model via {@link LanguageModelChatRequestOptions}. A language model uses all the
	 * properties of this interface to decide which tool to call, and how to call it.
	 */
	export interface LanguageModelChatTool {
		/**
		 * The name of the tool.
		 */
		name: string;

		/**
		 * The description of the tool.
		 */
		description: string;

		/**
		 * A JSON schema for the input this tool accepts.
		 */
		inputSchema?: object;
	}

	/**
	 * A tool-calling mode for the language model to use.
	 */
	export enum LanguageModelChatToolMode {
		/**
		 * The language model can choose to call a tool or generate a message. Is the default.
		 */
		Auto = 1,

		/**
		 * The language model must call one of the provided tools. Note- some models only support a single tool when using this
		 * mode.
		 */
		Required = 2,
	}

	/**
	 * A language model response part indicating a tool call, returned from a {@link LanguageModelChatResponse}, and also can be
	 * included as a content part on a {@link LanguageModelChatMessage}, to represent a previous tool call in a chat request.
	 */
	export class LanguageModelToolCallPart {
		/**
		 * The ID of the tool call. This is a unique identifier for the tool call within the chat request.
		 */
		callId: string;

		/**
		 * The name of the tool to call.
		 */
		name: string;

		/**
		 * The input with which to call the tool.
		 */
		input: object;

		/**
		 * Create a new LanguageModelToolCallPart.
		 *
		 * @param callId The ID of the tool call.
		 * @param name The name of the tool to call.
		 * @param input The input with which to call the tool.
		 */
		constructor(callId: string, name: string, input: object);
	}

	/**
	 * The result of a tool call. This is the counterpart of a {@link LanguageModelToolCallPart tool call} and
	 * it can only be included in the content of a User message
	 */
	export class LanguageModelToolResultPart {
		/**
		 * The ID of the tool call.
		 *
		 * *Note* that this should match the {@link LanguageModelToolCallPart.callId callId} of a tool call part.
		 */
		callId: string;

		/**
		 * The value of the tool result.
		 */
		content: Array<
			LanguageModelTextPart | LanguageModelPromptTsxPart | unknown
		>;

		/**
		 * @param callId The ID of the tool call.
		 * @param content The content of the tool result.
		 */
		constructor(
			callId: string,
			content: Array<
				LanguageModelTextPart | LanguageModelPromptTsxPart | unknown
			>
		);
	}

	/**
	 * A language model response part containing a piece of text, returned from a {@link LanguageModelChatResponse}.
	 */
	export class LanguageModelTextPart {
		/**
		 * The text content of the part.
		 */
		value: string;

		/**
		 * Construct a text part with the given content.
		 * @param value The text content of the part.
		 */
		constructor(value: string);
	}

	/**
	 * A language model response part containing a PromptElementJSON from `@vscode/prompt-tsx`.
	 * @see {@link LanguageModelToolResult}
	 */
	export class LanguageModelPromptTsxPart {
		/**
		 * The value of the part.
		 */
		value: unknown;

		/**
		 * Construct a prompt-tsx part with the given content.
		 * @param value The value of the part, the result of `renderPromptElementJSON` from `@vscode/prompt-tsx`.
		 */
		constructor(value: unknown);
	}

	/**
	 * A result returned from a tool invocation. If using `@vscode/prompt-tsx`, this result may be rendered using a `ToolResult`.
	 */
	export class LanguageModelToolResult {
		/**
		 * A list of tool result content parts. Includes `unknown` becauses this list may be extended with new content types in
		 * the future.
		 * @see {@link lm.invokeTool}.
		 */
		content: Array<
			LanguageModelTextPart | LanguageModelPromptTsxPart | unknown
		>;

		/**
		 * Create a LanguageModelToolResult
		 * @param content A list of tool result content parts
		 */
		constructor(
			content: Array<LanguageModelTextPart | LanguageModelPromptTsxPart>
		);
	}

	/**
	 * A token that can be passed to {@link lm.invokeTool} when invoking a tool inside the context of handling a chat request.
	 */
	export type ChatParticipantToolToken = never;

	/**
	 * Options provided for tool invocation.
	 */
	export interface LanguageModelToolInvocationOptions<T> {
		/**
		 * An opaque object that ties a tool invocation to a chat request from a {@link ChatParticipant chat participant}.
		 *
		 * The _only_ way to get a valid tool invocation token is using the provided {@link ChatRequest.toolInvocationToken toolInvocationToken}
		 * from a chat request. In that case, a progress bar will be automatically shown for the tool invocation in the chat response view, and if
		 * the tool requires user confirmation, it will show up inline in the chat view.
		 *
		 * If the tool is being invoked outside of a chat request, `undefined` should be passed instead, and no special UI except for
		 * confirmations will be shown.
		 *
		 * *Note* that a tool that invokes another tool during its invocation, can pass along the `toolInvocationToken` that it received.
		 */
		toolInvocationToken: ChatParticipantToolToken | undefined;

		/**
		 * The input with which to invoke the tool. The input must match the schema defined in
		 * {@link LanguageModelToolInformation.inputSchema}
		 */
		input: T;

		/**
		 * Options to hint at how many tokens the tool should return in its response, and enable the tool to count tokens
		 * accurately.
		 */
		tokenizationOptions?: LanguageModelToolTokenizationOptions;
	}

	/**
	 * Options related to tokenization for a tool invocation.
	 */
	export interface LanguageModelToolTokenizationOptions {
		/**
		 * If known, the maximum number of tokens the tool should emit in its result.
		 */
		tokenBudget: number;

		/**
		 * Count the number of tokens in a message using the model specific tokenizer-logic.
		 * @param text A string.
		 * @param token Optional cancellation token.  See {@link CancellationTokenSource} for how to create one.
		 * @returns A thenable that resolves to the number of tokens.
		 */
		countTokens(text: string, token?: CancellationToken): Thenable<number>;
	}

	/**
	 * Information about a registered tool available in {@link lm.tools}.
	 */
	export interface LanguageModelToolInformation {
		/**
		 * A unique name for the tool.
		 */
		readonly name: string;

		/**
		 * A description of this tool that may be passed to a language model.
		 */
		readonly description: string;

		/**
		 * A JSON schema for the input this tool accepts.
		 */
		readonly inputSchema: object | undefined;

		/**
		 * A set of tags, declared by the tool, that roughly describe the tool's capabilities. A tool user may use these to filter
		 * the set of tools to just ones that are relevant for the task at hand.
		 */
		readonly tags: readonly string[];
	}

	/**
	 * Options for {@link LanguageModelTool.prepareInvocation}.
	 */
	export interface LanguageModelToolInvocationPrepareOptions<T> {
		/**
		 * The input that the tool is being invoked with.
		 */
		input: T;
	}

	/**
	 * A tool that can be invoked by a call to a {@link LanguageModelChat}.
	 */
	export interface LanguageModelTool<T> {
		/**
		 * Invoke the tool with the given input and return a result.
		 *
		 * The provided {@link LanguageModelToolInvocationOptions.input} has been validated against the declared schema.
		 */
		invoke(
			options: LanguageModelToolInvocationOptions<T>,
			token: CancellationToken
		): ProviderResult<LanguageModelToolResult>;

		/**
		 * Called once before a tool is invoked. It's recommended to implement this to customize the progress message that appears
		 * while the tool is running, and to provide a more useful message with context from the invocation input. Can also
		 * signal that a tool needs user confirmation before running, if appropriate.
		 *
		 * * *Note 1:* Must be free of side-effects.
		 * * *Note 2:* A call to `prepareInvocation` is not necessarily followed by a call to `invoke`.
		 */
		prepareInvocation?(
			options: LanguageModelToolInvocationPrepareOptions<T>,
			token: CancellationToken
		): ProviderResult<PreparedToolInvocation>;
	}

	/**
	 * When this is returned in {@link PreparedToolInvocation}, the user will be asked to confirm before running the tool. These
	 * messages will be shown with buttons that say "Continue" and "Cancel".
	 */
	export interface LanguageModelToolConfirmationMessages {
		/**
		 * The title of the confirmation message.
		 */
		title: string;

		/**
		 * The body of the confirmation message.
		 */
		message: string | MarkdownString;
	}

	/**
	 * The result of a call to {@link LanguageModelTool.prepareInvocation}.
	 */
	export interface PreparedToolInvocation {
		/**
		 * A customized progress message to show while the tool runs.
		 */
		invocationMessage?: string | MarkdownString;

		/**
		 * The presence of this property indicates that the user should be asked to confirm before running the tool. The user
		 * should be asked for confirmation for any tool that has a side-effect or may potentially be dangerous.
		 */
		confirmationMessages?: LanguageModelToolConfirmationMessages;
	}

	/**
	 * A reference to a tool that the user manually attached to their request, either using the `#`-syntax inline, or as an
	 * attachment via the paperclip button.
	 */
	export interface ChatLanguageModelToolReference {
		/**
		 * The tool name. Refers to a tool listed in {@link lm.tools}.
		 */
		readonly name: string;

		/**
		 * The start and end index of the reference in the {@link ChatRequest.prompt prompt}. When undefined, the reference was
		 * not part of the prompt text.
		 *
		 * *Note* that the indices take the leading `#`-character into account which means they can be used to modify the prompt
		 * as-is.
		 */
		readonly range?: [start: number, end: number];
	}
}
````
