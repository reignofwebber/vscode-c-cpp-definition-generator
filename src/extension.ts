// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from "fs";
import * as cppHelper from "./cppext";
import * as semantics from './semantics';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let generateSouce = vscode.commands.registerCommand('Cppext.generateSource', async () => {
		let editor = vscode.window.activeTextEditor;
		if (!editor) { return; }

		let document = editor.document;
		if (document.languageId !== 'cpp' || !cppHelper.isHeaderFile(document.fileName)) {
			return;
		}

		let scope = semantics.Scope.createScope(document.getText());
		let source = new cppHelper.SourceFile(document.fileName, scope.isEmpty() ? '.c' : '.cpp');

		for (let line = 0; line < document.lineCount; ++line) {
			let declaration = document.lineAt(line).text;
			if (semantics.isDeclaration(declaration)) {
				let declarationPos = document.offsetAt(new vscode.Position(line, 0));
				let scopes = scope.getScopes(declarationPos);
				await source.update(declaration, scopes);
			}
		}
	});

	let gotoDefinition = vscode.commands.registerCommand('Cppext.gotodefinition', async () => {
		let editor = vscode.window.activeTextEditor;
		if (!editor) { return; }
		// if has document
		let document = editor.document;
		// if c/c++ header file
		if (document.languageId !== "cpp" || !cppHelper.isHeaderFile(document.fileName)) {
			return;
		}

		let position = editor.selection.active.line;
		let declaration = document.lineAt(position).text;
		let declarationPos = document.offsetAt(editor.selection.active);

		// TEST
		if (!semantics.isDeclaration(declaration)) { return; }

		// analyse scope
		let scope = semantics.Scope.createScope(document.getText());
		// TEST
		let scopes = scope.getScopes(declarationPos);

		let source = new cppHelper.SourceFile(document.fileName, scope.isEmpty() ? '.c' : '.cpp');
		source.update(declaration, scopes);

	});

	context.subscriptions.push(generateSouce);
	context.subscriptions.push(gotoDefinition);
}

// this method is called when your extension is deactivated
export function deactivate() {}
