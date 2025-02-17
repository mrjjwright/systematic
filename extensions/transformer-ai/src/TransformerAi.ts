import * as vscode from 'vscode';
import {
	LanguageModel,
	streamText,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

/**
 * TransformerAi implements the LanguageModelChatProvider interface to provide
 * AI language model capabilities using the OpenAI API.
 */
export class TransformerAi implements vscode.LanguageModelChatProvider {
	private model: LanguageModel;
	private readonly _onDidReceiveLanguageModelResponse2 = new vscode.EventEmitter<{ readonly extensionId: string; readonly participant?: string; readonly tokenCount?: number }>();
	readonly onDidReceiveLanguageModelResponse2 = this._onDidReceiveLanguageModelResponse2.event;

	constructor(modelId: string = 'gpt-3.5-turbo') {
		const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
		this.model = openai(modelId);
	}

	async provideLanguageModelResponse(
		messages: vscode.LanguageModelChatMessage[],
		_: vscode.LanguageModelChatRequestOptions,
		extensionId: string,
		progress: vscode.Progress<vscode.ChatResponseFragment2>,
		token: vscode.CancellationToken
	): Promise<any> {
		let currentIndex = 0;
		let totalText = '';

		try {
			const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

			const result = await streamText({
				model: this.model,
				prompt,
				onChunk: async ({ chunk }) => {
					if (token.isCancellationRequested) {
						return;
					}

					if (chunk.type === 'text-delta') {
						totalText += chunk.textDelta;
						progress.report({
							index: currentIndex++,
							part: new vscode.LanguageModelTextPart(chunk.textDelta)
						});
					}
				}
			});

			// Fire completion event with token count
			this._onDidReceiveLanguageModelResponse2.fire({
				extensionId,
				tokenCount: totalText.split(/\s+/).length
			});

			return result;

		} catch (error) {
			throw new Error(`TransformerAI error: ${(error as Error).message}`);
		}
	}

	async provideTokenCount(
		text: string | vscode.LanguageModelChatMessage,
		token: vscode.CancellationToken
	): Promise<number> {
		if (token.isCancellationRequested) {
			return 0;
		}

		const content = typeof text === 'string' ? text : text.content;
		return typeof content === 'string' ? content.split(/\s+/).length : 0;
	}
}

/**
 * Chat participant that uses the Transformer AI language model to handle requests.
 */
export class TransformerChatParticipant {
	constructor() { }

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

			// Send the request to the language model
			response.progress('Thinking...' + JSON.stringify(messages));
			const result = await model.sendRequest(messages, options, token);
			response.progress('Thinking1...' + JSON.stringify(result));

			// Stream the response back
			for await (const part of result.text) {
				response.progress('Thinking2...');

				if (token.isCancellationRequested) {
					break;
				}

				response.markdown(part);

			}

			return {};
		} catch (error) {
			const err = error as Error;
			response.progress('Ooops, something went wrong');
			response.markdown(err.message);
			return {};
		}
	}
}
