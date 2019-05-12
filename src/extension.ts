// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cppHelper from "./cppext";
import * as semantics from './semantics';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let generateSouce = vscode.commands.registerCommand('Cppext.generateSource', () => {
		let editor = vscode.window.activeTextEditor;
		if (!editor) { return; }

		let document = editor.document;
		if (document.languageId !== 'cpp' || !cppHelper.isHeaderFile(document.fileName)) {
			return;
		}
		document.save();
		let source = cppHelper.createSourceFromHeader(document.fileName);

		for (let line = 0; line < document.lineCount; ++line) {
			let declaration = document.lineAt(line).text;
			if (semantics.isDeclaration(declaration)) {
				let selection = source.updateDefinition(declaration);
			}
		}

		vscode.window.showTextDocument(vscode.Uri.file(source.getPath()));
	});

	let gotoDefinition = vscode.commands.registerCommand('Cppext.gotodefinition', () => {
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

		if (!semantics.isDeclaration(declaration)) { return; }

		// save header file.
		document.save();

		// create source file or do nothing if it's exists
		let source = cppHelper.createSourceFromHeader(document.fileName);
		// update definition
		let selection = source.updateDefinition(declaration);
		// open this file
		// let cppDocument = vscode.workspace.openTextDocument(source.getPath());
		vscode.window.showTextDocument(vscode.Uri.file(source.getPath())).then(editor => {
			editor.selection = selection;
		});
	});

	context.subscriptions.push(generateSouce);
	context.subscriptions.push(gotoDefinition);
}

// this method is called when your extension is deactivated
export function deactivate() {}
