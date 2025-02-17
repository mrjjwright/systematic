#### VSCode API Internal Chat Types

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
