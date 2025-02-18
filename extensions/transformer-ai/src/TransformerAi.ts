import * as vscode from 'vscode';
import {
	LanguageModel,
	streamText,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export type ValueCallback<T = unknown> = (value: T | Promise<T>) => void;

export class DeferredPromise<T> {

	private completeCallback!: ValueCallback<T>;
	private errorCallback!: (err: unknown) => void;
	private rejected = false;
	private resolved = false;

	public get isRejected() {
		return this.rejected;
	}

	public get isResolved() {
		return this.resolved;
	}

	public get isSettled() {
		return this.rejected || this.resolved;
	}

	public readonly p: Promise<T>;

	constructor() {
		this.p = new Promise<T>((c, e) => {
			this.completeCallback = c;
			this.errorCallback = e;
		});
	}

	public complete(value: T) {
		return new Promise<void>(resolve => {
			this.completeCallback(value);
			this.resolved = true;
			resolve();
		});
	}

	public error(err: unknown) {
		return new Promise<void>(resolve => {
			this.errorCallback(err);
			this.rejected = true;
			resolve();
		});
	}

	public cancel() {
		new Promise<void>(resolve => {
			this.errorCallback(new Error('Canceled'));
			this.rejected = true;
			resolve();
		});
	}
}



export class TransformerLanguageModel implements vscode.LanguageModelChatProvider {
	private model: LanguageModel;
	private readonly _onDidReceiveLanguageModelResponse2 = new vscode.EventEmitter<{ readonly extensionId: string; readonly participant?: string; readonly tokenCount?: number }>();
	readonly onDidReceiveLanguageModelResponse2 = this._onDidReceiveLanguageModelResponse2.event;

	constructor(public readonly outputChannel: vscode.OutputChannel, modelId: string = 'gpt-3.5-turbo') {
		const openai = createOpenAI({
			apiKey: process.env['OPENAI_API_KEY'],
		});
		this.model = openai(modelId);
	}

	async provideLanguageModelResponse(
		messages: vscode.LanguageModelChatMessage[],
		_: vscode.LanguageModelChatRequestOptions,
		extensionId: string,
		progress: vscode.Progress<vscode.ChatResponseFragment2>,
		token: vscode.CancellationToken
	): Promise<any> {
		const defer = new DeferredPromise<void>();

		// Handle cancellation
		token.onCancellationRequested(() => {
			defer.cancel();
		});
		try {
			await this._provideLanguageModelResponse(
				messages,
				progress,
			);

			defer.complete();
			this._onDidReceiveLanguageModelResponse2.fire({ extensionId });

		} catch (error) {
			this.outputChannel.appendLine(`ERROR: ${error}`);
			defer.error(error);
			throw error;
		}
		return defer.p;
	}

	private async _provideLanguageModelResponse(
		messages: vscode.LanguageModelChatMessage[],
		progress: vscode.Progress<vscode.ChatResponseFragment2>,
	) {
		let currentIndex = 0;

		try {
			const prompt = messages.map(msg =>
				msg.content
					.filter((part): part is vscode.LanguageModelTextPart => part instanceof vscode.LanguageModelTextPart)
					.map(part => part.value)
					.join('')
			).join('\n');

			const { textStream } = streamText({
				model: this.model,
				prompt,
			});

			let responseText = '';

			for await (const textPart of textStream) {
				responseText += textPart;
			}
			progress.report({
				index: currentIndex++,
				part: new vscode.LanguageModelTextPart(responseText)
			});


		} catch (error) {
			this.outputChannel.appendLine(`TransformerLM error: ${error}`);

			if (error instanceof vscode.LanguageModelError) {
				throw error;
			}
		}
	}

	async provideTokenCount(
		text: string | vscode.LanguageModelChatMessage,
		token: vscode.CancellationToken
	): Promise<number> {
		if (token.isCancellationRequested) {
			return 0;
		}

		try {
			const content = typeof text === 'string' ? text : text.content;
			if (typeof content !== 'string') {
				return 0;
			}

			// Use the model's tokenizer if available
			// For now using a more accurate approximation than simple word split
			// This should be replaced with actual tokenizer when available
			return Math.ceil(content.length / 4); // Rough approximation of GPT tokens
		} catch (error) {
			this.outputChannel.appendLine(`Token count error: ${error}`);
			return 0;
		}
	}
}

/**
 * Chat participant that uses the Transformer AI language model to handle requests.
 */
export class TransformerChatParticipant {
	constructor(public readonly outputChannel: vscode.OutputChannel) { }

	private getInitialContext(): vscode.LanguageModelChatMessage {
		return vscode.LanguageModelChatMessage.User(
			`You are Transformer AI`
		);
	}

	async handleRequest(
		request: vscode.ChatRequest,
		_: vscode.ChatContext,
		response: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	): Promise<vscode.ChatResult> {
		try {
			this.outputChannel.appendLine(`Yoyo: ${JSON.stringify(request)}`);
			// Get the language model from the request
			const model = request.model as vscode.LanguageModelChat;
			if (!model) {
				throw new Error('No language model provided in request');
			}

			// Build messages array including context
			const messages: vscode.LanguageModelChatMessage[] = [
				// Start with initial context
				this.getInitialContext()
			];

			// Add previous messages from context if available
			// if (context.history) {
			// 	for (const item of context.history) {
			// 		messages.push(
			// 			item.participant === 'transformer.ai'
			// 				? vscode.LanguageModelChatMessage.Assistant(item.)
			// 				: vscode.LanguageModelChatMessage.User(item.message)
			// 		);
			// 	}
			// }

			// Add command-specific context if needed
			if (request.command) {
				messages.push(vscode.LanguageModelChatMessage.User(
					`Execute the following command: ${request.command}\n${request.prompt}`
				));
			} else {
				// Add the current request
				messages.push(vscode.LanguageModelChatMessage.User(request.prompt));
			}

			// Handle any command-specific behavior
			const options: vscode.LanguageModelChatRequestOptions = {};
			if (request.command) {
				response.progress(`Processing ${request.command} command...`);
			}

			const result = await model.sendRequest(messages, options, token);

			for await (const part of result.text) {
				response.markdown(part);

			}

			return {};
		} catch (error) {
			const err = error as Error;
			this.outputChannel.appendLine('Transformer erro: Ooops, something went wrong');
			response.markdown(err.message);
			return {};
		}
	}
}
