#### Deep Explanation of VSCode Chat

src/vscode-dts/explainApiChat.md

<pre>
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
