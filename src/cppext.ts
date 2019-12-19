import * as vscode from "vscode";
import * as fs from "fs";
import * as path from 'path';
import * as semantics from './semantics';
import * as tools from "./tools";
import { fileURLToPath } from "url";


/**
 * determine if the file is a header file.
 * @param fileName
  */
export function isHeaderFile(fileName: string): boolean {
    let dotPos = fileName.lastIndexOf('.');
    let ext = fileName.substr(dotPos);
    if (ext.includes('h')) {
        return true;
    }
    return false;
}


export function getDeclarationPos(content: string, declaration: string): number {
    return content.indexOf(declaration);
}


export class SourceFile {
    private _path: string;
    private _doc: vscode.TextDocument | undefined;
    private _editor: vscode.TextEditor | undefined;

    public constructor(headerFile: string, ext: string) {
        let fileName = path.basename(headerFile);
        let dirName = path.dirname(headerFile);
        let srcName = fileName.split('.').slice(0, 1).join('.') + ext;
        this._path = path.join(dirName, srcName);

        if (!fs.existsSync(this._path)) {
            fs.writeFileSync(this._path, `#include "${path.basename(headerFile)}"\n\n`, 'utf-8');
        }
    }

    /**
     * show c/cpp file and call updateDefinition
     * @param declaration declaration snippet
     * @param scopes for cpp, definition prefix
     */
    async update(declaration: string, scopes: string[]) {
        this._doc = await vscode.workspace.openTextDocument(vscode.Uri.file(this._path));
        this._editor = await vscode.window.showTextDocument(this._doc);
        await this._updateDefinition(declaration, scopes);
    }

    /**
     * find if exist a definition with same name and params
     * @param declaration declaration snippet
     * @param scopes for cpp, definition prefix
     */
    private _getDefinitionLine(declaration: string, scopes: string[]): number {
        let definition = semantics.getDefinition(declaration, scopes);
        let identifier = definition.getIdentifier();
        
        // exactly identifier
        let regexIdentifier = new RegExp('\(^|\\s+\)' + identifier + '\\s*\\(' + definition.params);
        let line = 0;
        let text = '';
        while (line < this._doc!.lineCount) {
            text = this._doc!.lineAt(line).text;
            if (regexIdentifier.exec(text)) {
                break;
            }
            ++line;
        }
        // current definition not exist
        if (line === this._doc!.lineCount) {
            return -1;
        }

        if (/.+\(.*\).*\{/.exec(text)) {
            return line;
        } else {
            return -1;
        }
    }

    /**
     * update definition
     * @param declaration declaration snippet
     * @param scopes for cpp, definition prefix
     */
    private async _updateDefinition(declaration: string, scopes: string[]) {
        let line = this._getDefinitionLine(declaration, scopes);
        let definition = semantics.getDefinition(declaration, scopes);
        if (definition.isValid && this._editor) {
            if (line === -1) {
                let endLine = this._doc!.lineCount - 1;
                let endCh = this._doc!.lineAt(endLine).text.length;
                await this._editor.edit(editBuilder => {
                    editBuilder.insert(new vscode.Position(endLine, endCh), definition.toString());
                });
                endLine = this._doc!.lineCount - 1;
                let pos = new vscode.Position(endLine - 2, 0);
                this._editor.selection = new vscode.Selection(pos, pos);
                vscode.commands.executeCommand('revealLine', {
                    lineNumber: pos.line,
                    at: 'center'
                });

            } else {
                let lineEnd = this._doc!.lineAt(line).text.length;
                let startPos = new vscode.Position(line, 0);
                let endPos = new vscode.Position(line, lineEnd);
                await this._editor.edit(editBuilder => {
                    editBuilder.replace(new vscode.Range(startPos, endPos), definition.toString(true));
                });

                let pos = new vscode.Position(line + 1, 0);
                this._editor.selection = new vscode.Selection(pos, pos);
                vscode.commands.executeCommand('revealLine', {
                    lineNumber: pos.line,
                    at: 'center'
                });
            }

        }
    }
}
