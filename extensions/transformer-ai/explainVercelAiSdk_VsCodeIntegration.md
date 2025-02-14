Got it! I'll research how to integrate the Vercel AI SDK into a VS Code extension that registers a chat participant, enabling AI-powered interactions within VS Code's chat UI.

I'll explore:

- How to implement a VS Code extension that adds a new chat participant powered by the Vercel AI SDK.
- TypeScript type compatibility between VS Code’s `ChatResponseStream`, `IChatProgress`, etc., and Vercel AI SDK’s streaming API (`streamText`).
- Methods for efficiently streaming AI responses from Vercel AI SDK into VS Code’s chat UI in real-time.
- Best practices for leveraging the SDK’s provider flexibility (e.g., switching models dynamically in the VS Code chat agent).

I'll also note any potential improvements that might require modifying/forking VS Code.

I'll update you once I have the findings.

# Integrating Vercel AI SDK into a VS Code Chat Extension

This guide explains how to build a VS Code extension that adds an AI-powered chat participant using Vercel’s AI SDK. We’ll cover how to register a new chat participant with VS Code’s Chat API, ensure type compatibility between VS Code’s chat stream types and Vercel’s streaming functions, stream AI responses progressively into the chat UI, switch between different AI providers (OpenAI, Anthropic, etc.), handle errors with fallbacks, and consider if any deeper VS Code core changes could provide extra capabilities.

## Registering a Chat Participant via VS Code’s Chat API

**Manifest Registration:** Start by declaring the chat participant in your extension’s `package.json`. Under the `"contributes"` section, add a `chatParticipants` entry with properties like a unique `id`, a user-facing name, and a description. For example:

```json
"contributes": {
  "chatParticipants": [
    {
      "id": "myext.my-ai-assistant",
      "fullName": "My AI Assistant",
      "name": "assistant",
      "description": "Ask me anything about your code",
      "isSticky": true
    }
  ]
}
```

This registers a chat participant with ID `"myext.my-ai-assistant"` (used in code), a display name _My AI Assistant_, and a mention handle `@assistant` that users can invoke in the chat. The description appears as placeholder text in the chat input ([Tutorial: Build a code tutorial chat participant with the Chat API | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat-tutorial#:~:text=This%20code%20registers%20a%20chat,participant%20with%20the%20following%20attributes)). Setting `"isSticky": true` makes VS Code automatically prepend `@assistant` in the input once the user starts using this participant ([Tutorial: Build a code tutorial chat participant with the Chat API | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat-tutorial#:~:text=Finally%2C%20setting%20,started%20interacting%20with%20the%20participant)).

**Activation and Creation:** In your extension’s activation function, create the chat participant using the VS Code Chat API. You’ll use the same ID as in the manifest and provide a handler function for incoming chat requests:

```ts
export function activate(context: vscode.ExtensionContext) {
	// Define the chat request handler (see next sections for implementation)
	const handler: vscode.ChatRequestHandler = async (
		request: vscode.ChatRequest,
		context: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	) => {
		/* implementation below */
	};

	// Register the chat participant with VS Code
	const participant = vscode.chat.createChatParticipant(
		"myext.my-ai-assistant",
		handler
	);
	participant.iconPath = vscode.Uri.joinPath(
		context.extensionUri,
		"resources/ai-icon.png"
	);
}
```

The `createChatParticipant` call ties the participant ID to your handler logic ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=After%20registration%2C%20all%20your%20extension,and%20a%20request%20handler)). You can also set an icon to show in the chat UI next to the assistant’s messages. Once registered and activated, your participant can be invoked in VS Code’s Chat view (for example, in the Copilot Chat pane) by mentioning its name (e.g. typing `@assistant`). VS Code will route chat messages to your handler whenever the user addresses this participant.

## Type Compatibility: VS Code ChatResponseStream vs Vercel AI Streams

VS Code’s Chat API is **streaming-based**, designed to handle incremental responses from AI models ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=In%20practice%2C%20extensions%20typically%20send,can%20use%20the%20%2028)). When your handler is called, VS Code passes in a `ChatResponseStream` object (`stream` in the handler parameters). This stream is how you send output back to the chat UI. It has methods to emit different content types – for example, `stream.markdown()` for text/markdown content, `stream.progress()` for interim status updates, `stream.button()` for interactive buttons, etc. ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=Code%20command,Command)) ([Missing doc for `@param value` in `ChatResponseStream.progress` · Issue #205812 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/205812#:~:text=%2F,progress%28value%3A%20string%29%3A%20ChatResponseStream)). Under the hood, each call pushes a piece of the response (e.g. a chunk of text or a progress update) into the chat UI.

The **Vercel AI SDK** is likewise built for streaming outputs from language models. Its `streamText()` function returns an asynchronous stream of text chunks, which we can iterate over as they arrive ([Getting Started: Node.js](https://sdk.vercel.ai/docs/getting-started/nodejs#:~:text=process.stdout.write%28%27)). The **types align well**: Vercel’s `textStream` yields plain text (`string`) segments, and VS Code’s `ChatResponseStream.markdown()` accepts markdown text (which can just be the string content, formatted as needed). This means you can directly pipe each chunk from the AI SDK into the VS Code chat stream. There’s no complex type conversion – a text fragment from `streamText` can be written as chat markdown. In practice, you’ll use the two in tandem: call the AI SDK to get a text stream, then for each chunk, call `stream.markdown(chunk)` to push it to the UI. VS Code’s chat API was explicitly designed to work with streaming model APIs in this way ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=In%20practice%2C%20extensions%20typically%20send,can%20use%20the%20%2028)).

If you want to show a loading indicator or partial result message while the AI is thinking, you can use `stream.progress("Your message...")`. This inserts a transient message in the chat (often styled in italics) indicating progress. For example, `stream.progress("🤖 Thinking...")` will show a _Thinking..._ message that can reassure the user while waiting for the first tokens. Once you start streaming the actual answer via `stream.markdown`, VS Code will update the chat with the real content (the progress message can either remain as a separate entry or be cleared by your final output depending on VS Code’s behavior). In summary, the **TypeScript interfaces** are compatible: VS Code’s `ChatResponseStream` expects strings for text responses and the Vercel SDK produces exactly that, enabling a smooth hand-off of data.

## Streaming AI Responses to the Chat UI

To generate answers, you’ll call Vercel’s AI SDK within the chat request handler and stream the result back to VS Code. The basic pattern is:

1. **Collect the prompt and context:** The `request` object provides the user’s prompt (`request.prompt`). You can also build a prompt with system instructions or conversation history if needed. Often, you’ll construct an array of messages in the format the model expects (e.g., an array of `{ role, content }` objects). For example, with Vercel’s SDK you might create a messages array like:

   ```ts
   const messages: CoreMessage[] = [];
   // (Optional) add a system prompt or instructions
   messages.push({
   	role: "system",
   	content: "You are a helpful coding assistant...",
   });
   // User's question:
   messages.push({ role: "user", content: request.prompt });
   ```

   If you want to include prior chat history, VS Code provides it via `context.history`. You can filter that to get previous user or assistant turns and include them in the `messages` array if your model benefits from conversation contex ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=Participants%20have%20access%20to%20the,in%20the%20current%20chat%20session))】. (Remember to include only the relevant messages or those directed to your participant.)

2. **Call the Vercel AI SDK’s streaming function:** Import the appropriate provider and the `streamText` helper from the `ai` package. For example, if using OpenAI’s API:

   ```ts
   import { openai } from "@ai-sdk/openai";
   import { streamText } from "ai";
   // ...
   const result = streamText({
   	model: openai("gpt-4"), // or 'gpt-3.5-turbo', etc.
   	messages: messages,
   });
   ```

   The `openai('gpt-4')` call returns a model interface that `streamText` will use to call the OpenAI API. (Ensure the `OPENAI_API_KEY` is set in your environment for this to work.) The `result` from `streamText` contains a `textStream` – an async iterable of text chunks from the mode ([Getting Started: Node.js](https://sdk.vercel.ai/docs/getting-started/nodejs#:~:text=process.stdout.write%28%27))】. This call is non-blocking; the streaming begins as soon as you iterate the `textStream`.

3. **Stream the response into VS Code:** Use a `for await` loop to read chunks from `result.textStream` and immediately forward them to the `ChatResponseStream`:

   ```ts
   let fullResponse = "";
   for await (const chunk of result.textStream) {
   	fullResponse += chunk;
   	stream.markdown(chunk);
   }
   ```

   Each call to `stream.markdown(chunk)` appends that piece of text to the chat UI response. VS Code will render the combined chunks as one continuous response to the user. This is exactly how the Chat API is intended to be used for progressive renderin ([Tutorial: Build a code tutorial chat participant with the Chat API | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat-tutorial#:~:text=const%20chatResponse%20%3D%20await%20request,token))】. The user will see the answer appear token-by-token (or word-by-word) rather than waiting for the entire response to be ready. By accumulating in `fullResponse`, you also keep the final assembled answer in case you need it (for logging or providing follow-up suggestions, etc.).

4. **Finish the response:** After the loop completes (meaning the model finished sending all tokens), you can do any cleanup. Often, no explicit action is needed – you’ve already output the full answer via the stream. You typically **do not need to call** `return` with a value containing the text, since you’ve streamed it out. In our handler, we can just return an empty result or nothing. For example, in the earlier snippet, `return;` at the end is sufficien ([Tutorial: Build a code tutorial chat participant with the Chat API | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat-tutorial#:~:text=const%20chatResponse%20%3D%20await%20request,token))】. The VS Code chat UI will consider the response complete once the handler resolves and no more chunks are coming.

   _Important:_ Make sure to handle the cancellation token (`token`) if provided – e.g., break out of the loop if `token.isCancellationRequested` becomes true (meaning the user or system canceled the request). This prevents streaming further content if the user aborted the query.

**Putting it together**, a simplified handler using OpenAI via Vercel SDK might look like:

```ts
const handler: vscode.ChatRequestHandler = async (
	request,
	context,
	stream,
	token
) => {
	// Build prompt messages
	const messages: CoreMessage[] = [
		{ role: "system", content: "You are a helpful coding assistant..." },
		{ role: "user", content: request.prompt },
	];

	// Call OpenAI GPT-4 and stream result
	const result = streamText({ model: openai("gpt-4"), messages });
	try {
		for await (const part of result.textStream) {
			if (token.isCancellationRequested) break;
			stream.markdown(part);
		}
	} finally {
		// (Optional) any finalization
	}
	return;
};
```

This will progressively display the model’s answer in the chat. VS Code’s chat API is designed to make this seamless, giving a smooth user experience as the answer “types out” in real tim ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=In%20practice%2C%20extensions%20typically%20send,can%20use%20the%20%2028))】.

## Supporting Multiple AI Providers and Models

One advantage of the Vercel AI SDK is its **unified API** for different model providers. You can switch from OpenAI to Anthropic (Claude), Hugging Face, etc. by changing just one line in your cod ([AI SDK](https://sdk.vercel.ai/#:~:text=OpenAI%20Claude%20Hugging%20Face%20The,11))】. The SDK offers separate provider modules for each service, but they all conform to the same interface. For example:

- **OpenAI**: import from `@ai-sdk/openai` and call `openai('model-name')`. Models might include `'gpt-4'`, `'gpt-3.5-turbo'`, or fine-tuned model IDs.
- **Anthropic**: import from `@ai-sdk/anthropic` and call `anthropic('model-name')` (e.g. Claude variants like `'claude-2'`).
- **Azure OpenAI**: use `@ai-sdk/azure` if you have an Azure OpenAI endpoint.
- **Others**: The SDK also supports providers like Amazon Bedrock and any OpenAI-compatible API ([Foundations: Providers and Models](https://sdk.vercel.ai/docs/foundations/providers-and-models#:~:text=%2A%20OpenAI%20Provider%20%28%60%40ai,bedrock))】.

To **dynamically switch** models within your chat participant logic, you can incorporate configuration or logic checks. For instance, you might let the user choose a model via a VS Code setting or a special chat command, and then use the corresponding provider in `streamText`. One approach is to read a config value and branch accordingly:

```ts
// Example: choosing provider based on extension setting
const provider = vscode.workspace
	.getConfiguration("myext")
	.get<string>("aiProvider");
let model;
switch (provider) {
	case "anthropic":
		model = anthropic("claude-2");
		break;
	case "openai-gpt3":
		model = openai("gpt-3.5-turbo");
		break;
	default:
		model = openai("gpt-4");
}
const result = streamText({ model, messages });
```

In the above snippet, `aiProvider` could be a user setting like `"openai-gpt4"`, `"openai-gpt3"`, or `"anthropic"`. The code then picks the appropriate model. All models return a `LanguageModel` object that `streamText` can use. **Crucially, the rest of the code doesn’t need to change** – the streaming logic remains the same regardless of provider, since the SDK standardizes the streaming interface. This flexibility means you could even implement a fallback strategy: try one provider, and if it fails (due to downtime or rate limits), seamlessly call a different provider (we’ll cover error handling next).

When switching models, keep in mind practical details: you’ll need to have API credentials for each provider and adhere to their usage policies. The Vercel SDK will typically look for environment variables like `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` depending on which model you call. Also, different models have different capabilities (context length, speed, cost), so you might expose model choice to advanced users or decide based on question context (e.g., use a larger model for more complex queries).

In summary, the chat participant can be provider-agnostic. By abstracting model selection, you can **hot-swap AI models** even at runtime. For example, you might default to OpenAI’s GPT-4 but allow a quick switch to Claude for certain requests – all using the same streaming code path. Vercel’s SDK makes this as simple as choosing a different provider functio ([Foundations: Providers and Models](https://sdk.vercel.ai/docs/foundations/providers-and-models#:~:text=%2A%20OpenAI%20Provider%20%28%60%40ai,bedrock))】. Just be sure to inform the user (or document) which model is answering, if that context is important.

## Error Handling and Fallback Strategies

Robust error handling is essential for a good user experience. When dealing with external AI APIs, things can go wrong – network issues, API rate limits, model service downtime, or input errors. Here are best practices for handling errors and implementing fallbacks:

**Use Try/Catch Around API Calls:** The Vercel AI SDK will throw exceptions for errors (for example, if the API returns an error status). You should wrap your `streamText` call and streaming loop in a try/catch bloc ([AI SDK Core: Error Handling](https://sdk.vercel.ai/docs/ai-sdk-core/error-handling#:~:text=Error%20Handling))】. If an error is caught _before_ any response has been sent, you can send an error message to the user via the chat stream. For example:

```ts
try {
	const result = streamText({ model: openai("gpt-4"), messages });
	for await (const chunk of result.textStream) {
		stream.markdown(chunk);
	}
} catch (err: any) {
	console.error("AI API error:", err);
	stream.markdown(`**Error:** ${err.message || "Failed to get a response."}`);
	return;
}
```

In this snippet, any exception will result in a bolded error notice to the user. Tailor the message to be user-friendly (avoid exposing raw stack traces). Common errors might be timeouts, network failures, or API quota issues (429 Too Many Requests).

**Handling Rate Limits or Quota Issues:** If the AI provider returns a "rate limit exceeded" or similar error, you might want to implement a **retry with backoff** or a **fallback model**. For example, if GPT-4 API is over capacity or hitting a rate limit, you could catch that specific error and automatically retry the request with a smaller model or another provider:

```ts
let result;
try {
	result = streamText({ model: openai("gpt-4"), messages });
} catch (err: any) {
	if (isRateLimitError(err) || isQuotaError(err)) {
		// Custom check functions to identify error type
		stream.progress("Primary model at capacity, switching to backup...");
		result = streamText({ model: openai("gpt-3.5-turbo"), messages });
	} else {
		throw err; // rethrow unknown errors to be caught by outer handler
	}
}
for await (const chunk of result.textStream) {
	stream.markdown(chunk);
}
```

In the above, `isRateLimitError` would be a helper that checks `err.message` or an error code to determine if the error was due to rate limiting. We then notify the user via `stream.progress` that we’re switching models (this progress message will appear above the streamed answer, giving context). After switching to the backup model (GPT-3.5 in this case), we continue streaming as usual. This way, the user still gets an answer, albeit from a fallback model, with minimal delay.

This **fallback model strategy** is a manual implementation – as of now, Vercel’s SDK does not automatically try a secondary model on failure (though you can configure a `fallbackProvider` for missing model IDs, it doesn’t handle runtime errors ([Switching providers/models during retries / Exposing retry system · vercel ai · Discussion #3387 · GitHub](https://github.com/vercel/ai/discussions/3387#:~:text=))】. Therefore, it’s up to your extension to implement retries or provider switching when errors occur. Make sure to limit the number of retries to avoid infinite loops. A simple rule could be: try the primary model once, if it fails with a known issue, try one fallback, and if that also fails, report the error to the user.

**Graceful Degradation:** In cases where no provider succeeds, the extension should respond gracefully. Provide a friendly error message like “Sorry, I’m having trouble reaching the AI service. Please try again later.” This is better than leaving the user with no response. Using `stream.markdown` to output an error in **markdown format** allows you to style it (e.g., bold or italics) for visibility. You could also log details to the console (for development/debugging) but not expose technical details to the end user.

**Cancellation and Timeouts:** If the model takes too long, you might want to cancel the request. VS Code’s `CancellationToken` (`token`) will be signaled if the user abandons the query, in which case you should stop processing. Additionally, you could implement your own timeout (e.g., if no response after X seconds, throw an error or message to user). The Vercel SDK might have its own timeout options you can configure when initiating the request.

**Validation:** Ensure user inputs are valid to send to the model (e.g., not excessively long, not empty). If the input is too long, consider truncating or warning the user. This can prevent certain API errors (like 400 Bad Request for inputs that are too large).

By handling errors and using fallbacks smartly, you make the chat experience resilient. Users will either get an answer from an alternate model or a clear error message, rather than a silent failure. This approach is **production-friendly** – it accounts for real-world API limitations. As one developer noted, a pattern of retrying with a fallback provider for certain errors can greatly improve reliabilit ([Switching providers/models during retries / Exposing retry system · vercel ai · Discussion #3387 · GitHub](https://github.com/vercel/ai/discussions/3387#:~:text=))】. Just be transparent when a fallback kicks in (so the user isn’t confused if the style or capabilities change slightly with a different model).

## Extending Capabilities via VS Code Core Changes

The VS Code extension API provides the tools needed for chat integration, but it has some _limitations_ by design. VS Code’s Chat API was (at least initially) a **proposed API**, meaning it wasn’t available to all extensions in stable builds. Only Microsoft’s own GitHub Copilot Chat extension was using it under special permissions, while third-party developers had to wait or use VS Code Insiders for experimental API ([Microsoft is introducing hidden APIs to VS Code only enabled for Copilot extension : ChatGPTCoding](https://old.reddit.com/r/ChatGPTCoding/duplicates/1g8xrub/microsoft_is_introducing_hidden_apis_to_vs_code/#:~:text=VS%20Code%20has%20a%20way,APIs%2C%20it%27s%20called%20Proposed%20APIs)) ([Microsoft is introducing hidden APIs to VS Code only enabled for Copilot extension : ChatGPTCoding](https://old.reddit.com/r/ChatGPTCoding/duplicates/1g8xrub/microsoft_is_introducing_hidden_apis_to_vs_code/#:~:text=You%20can%20only%20use%20the,the%20store%20that%20contains%20them))】. This led some teams (like Cursor) to **fork VS Code** and modify the core to build custom AI feature ([Microsoft is introducing hidden APIs to VS Code only enabled for Copilot extension : ChatGPTCoding](https://old.reddit.com/r/ChatGPTCoding/duplicates/1g8xrub/microsoft_is_introducing_hidden_apis_to_vs_code/#:~:text=It%20looks%20like%20an%20anti,using%20it%20only%20for%20themselves))】.

**What could core modifications offer beyond the extension API?** Here are a few possibilities:

- **Access to Unstable/Hidden APIs:** By building a custom VS Code, you could unlock proposed or internal APIs (for example, advanced chat UI controls or deeper integration points) that are not accessible to normal extensions. In the past, Microsoft’s Copilot used APIs that others couldn’t, which a fork could re-enable for your use.

- **Deeper UI Customization:** The extension API confines you to the provided chat UI components. If you fork the VS Code codebase, you could alter the chat panel’s behavior or appearance beyond what extensions allow. For instance, you might implement a completely custom chat pane or modify how messages are rendered (perhaps to support richer content or a different layout).

- **Bypassing Sandbox Restrictions:** Extensions run in a sandbox with certain restrictions (they can’t access the main DOM of the workbench, for example). A core mod could embed your AI logic directly into the editor, possibly improving performance or capabilities (though this is complex).

However, modifying VS Code’s core is **non-trivial and generally not recommended** unless you have a very specific requirement that cannot be met with the extension API. Maintaining a fork means you need to keep up with upstream VS Code changes. The effort is significant – essentially, you’d be shipping your own version of VS Code to users, which is a big ask compared to shipping a simple extension.

Microsoft is actively working on making the Chat API public and stable (the documentation we cited is a sign of this). As those APIs stabilize, the need for a fork diminishes. The VS Code team wants to enable rich chat extensions without requiring anyone to hack the core. So before considering a fork, evaluate if the latest VS Code releases perhaps already provide the hooks you need (for example, check if the Chat API is marked stable and usable in the marketplace version of VS Code now).

**In summary**, core modification can unlock capabilities but at the cost of complexity and breaking from the official platform. Companies like Cursor chose that route when the official API was very limite ([Microsoft is introducing hidden APIs to VS Code only enabled for Copilot extension : ChatGPTCoding](https://old.reddit.com/r/ChatGPTCoding/duplicates/1g8xrub/microsoft_is_introducing_hidden_apis_to_vs_code/#:~:text=It%20looks%20like%20an%20anti,using%20it%20only%20for%20themselves))】, but with the ongoing improvements, a well-implemented extension should suffice for most needs. Only pursue a fork if you require an extreme level of control that absolutely cannot be achieved with an extension (and be prepared for a maintenance burden). For most developers, leveraging the VS Code Chat API and Vercel AI SDK together – as demonstrated above – will provide a powerful, stream-enabled chat experience inside VS Code without needing to patch the editor itself.

## References

- VS Code Chat API Tutorial – \*Building a code tutor chat extension ([Tutorial: Build a code tutorial chat participant with the Chat API | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat-tutorial#:~:text=,true)) ([Tutorial: Build a code tutorial chat participant with the Chat API | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat-tutorial#:~:text=This%20code%20registers%20a%20chat,participant%20with%20the%20following%20attributes)) ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=After%20registration%2C%20all%20your%20extension,and%20a%20request%20handler)) ([Tutorial: Build a code tutorial chat participant with the Chat API | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat-tutorial#:~:text=const%20chatResponse%20%3D%20await%20request,token))】
- VS Code Chat API Reference – \*ChatRequestHandler, ChatResponseStream, and streaming outputs ([Chat extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/chat#:~:text=In%20practice%2C%20extensions%20typically%20send,can%20use%20the%20%2028)) ([Missing doc for `@param value` in `ChatResponseStream.progress` · Issue #205812 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/205812#:~:text=%2F,progress%28value%3A%20string%29%3A%20ChatResponseStream))】
- Vercel AI SDK Documentation – \*Node.js streaming example and provider support ([Getting Started: Node.js](https://sdk.vercel.ai/docs/getting-started/nodejs#:~:text=process.stdout.write%28%27)) ([Foundations: Providers and Models](https://sdk.vercel.ai/docs/foundations/providers-and-models#:~:text=%2A%20OpenAI%20Provider%20%28%60%40ai,bedrock))】
- Vercel AI SDK Error Handling Guideline ([AI SDK Core: Error Handling](https://sdk.vercel.ai/docs/ai-sdk-core/error-handling#:~:text=Error%20Handling))】
- Community insights on fallback models and VS Code API limitation ([Switching providers/models during retries / Exposing retry system · vercel ai · Discussion #3387 · GitHub](https://github.com/vercel/ai/discussions/3387#:~:text=)) ([Microsoft is introducing hidden APIs to VS Code only enabled for Copilot extension : ChatGPTCoding](https://old.reddit.com/r/ChatGPTCoding/duplicates/1g8xrub/microsoft_is_introducing_hidden_apis_to_vs_code/#:~:text=It%20looks%20like%20an%20anti,using%20it%20only%20for%20themselves))】
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
