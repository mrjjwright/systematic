import * as vscode from 'vscode';
import { config } from 'dotenv';
import * as path from 'path';
import { TransformerLanguageModel, TransformerChatParticipant } from './transformerAiProvider.js';

// Load environment variables from .env file
config({ path: path.join(__dirname, '..', '.env') });

// Debug logging for environment variables
const outputChannel = vscode.window.createOutputChannel('Transformer');

export async function activate(context: vscode.ExtensionContext) {
	outputChannel.appendLine('Transformer AI Extension - Starting activation');
	outputChannel.appendLine(`Env file path: ${path.join(__dirname, '..', '.env')}`);
	outputChannel.appendLine(`OPENAI_API_KEY loaded: ${process.env.OPENAI_API_KEY ? 'Yes (first 5 chars: ' + process.env.OPENAI_API_KEY.substring(0, 5) + ')' : 'No'}`);

	try {
		// Create and register the language model provider
		const provider = new TransformerLanguageModel(outputChannel);
		const metadata: vscode.ChatResponseProviderMetadata = {
			vendor: 'transformer',
			name: 'Transformer AI',
			family: 'transformer',
			version: '1.0.0',
			maxInputTokens: 4096000,
			maxOutputTokens: 4096000,
			isDefault: true,
			isUserSelectable: true,
			capabilities: {
				vision: false,
				toolCalling: true
			}
		};
		const lmDisposable = vscode.lm.registerChatModelProvider('transformer.ai', provider, metadata);
		context.subscriptions.push(lmDisposable);

		const chatParticipant = new TransformerChatParticipant(outputChannel);
		const participant = vscode.chat.createChatParticipant(
			'transformer.ai',
			chatParticipant.handleRequest.bind(chatParticipant)
		);
		participant.iconPath = new vscode.ThemeIcon('transformer-logo');
		context.subscriptions.push(participant);

		console.log('Transformer AI Extension - Activation complete');

	} catch (error) {
		console.error('Transformer AI Extension - Activation failed:', error);
		throw error;
	}
}

export function deactivate() {
	// Clean up resources
}
