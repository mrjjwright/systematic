import * as vscode from 'vscode';
import { TransformerAi, TransformerChatParticipant } from './transformerAi.js';

export async function activate(context: vscode.ExtensionContext) {
	console.log('Transformer AI Extension - Starting activation');
	try {
		// Create and register the language model provider
		const provider = new TransformerAi();
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

		// Register the language model provider

		// Create and register the chat participant
		const chatParticipant = new TransformerChatParticipant();
		const participant = vscode.chat.createChatParticipant(
			'transformer.ai',
			chatParticipant.handleRequest.bind(chatParticipant)
		);
		participant.iconPath = new vscode.ThemeIcon('transformer-logo');
		context.subscriptions.push(participant);

		const lmDisposable = vscode.lm.registerChatModelProvider('transformer.ai', provider, metadata);
		context.subscriptions.push(lmDisposable);
		console.log('Transformer AI Extension - Activation complete');

	} catch (error) {
		console.error('Transformer AI Extension - Activation failed:', error);
		throw error;
	}
}

export function deactivate() {
	// Clean up resources
}
