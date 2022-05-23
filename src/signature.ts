// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import {
	CancellationToken,
	commands,
	Disposable,
	disposeAll,
	events,
	InsertChange,
	LanguageClient,
	Position,
	SignatureHelp,
	SignatureHelpContext,
	SignatureHelpProvider,
	TextDocument,
	workspace,
} from "coc.nvim";
import { SignatureHelpRequest } from "vscode-languageserver-protocol";
import { logger } from "./logger";

export class ClojureSignatureHelpProvider implements Disposable, SignatureHelpProvider {
	private disposables: Disposable[];
	constructor(private client: LanguageClient) {
		this.disposables = [];
		logger.info("created ClojureSignatureHelpProvider");
		this.disposables.push(
			events.on("TextInsert", (bufnr, info, character) =>
				this.triggerSignatureHelp(bufnr, info, character)
			)
		);
	}

	async triggerSignatureHelp(bufnr: number, info: InsertChange, character: string) {
		const doc = workspace.getDocument(bufnr);
		// doc.getDocumentContent() -> full document text
		// info -> {"lnum":13,"col":10,"changedtick":195,"line":"(scratch`)","pre":"(scratch`","insertChar":"`"}
		// charactr -> "`"
		if (!doc || doc.isCommandLine || !doc.attached) return;

		const triggerCharacters = ["(", " "];
		if (triggerCharacters && triggerCharacters.indexOf(character) != -1) {
			await commands.executeCommand("editor.action.triggerParameterHints");
		}
	}

	async provideSignatureHelp(
		document: TextDocument,
		position: Position,
		token: CancellationToken,
		context: SignatureHelpContext
	): Promise<SignatureHelp> {
		logger.info("provideSignatureHelp", document.getText());
		const result = this.client
			.sendRequest(
				SignatureHelpRequest.method,
				{
					textDocument: { uri: document.uri },
					position,
					context,
				},
				token
			)
			.then(
				(res) => {
					logger.info("provideSignatureHelp result", JSON.stringify(res));
					return res;
				},
				(error) => {
					return this.client.handleFailedRequest(
						SignatureHelpRequest.method as any,
						token,
						error,
						null
					);
				}
			);
		return result;
	}

	public dispose(): void {
		disposeAll(this.disposables);
	}
}
