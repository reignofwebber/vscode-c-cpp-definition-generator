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
export function isHeaderFile(fileName: string) :boolean {
    let dotPos = fileName.lastIndexOf('.');
    let ext = fileName.substr(dotPos);
    if (ext.includes('h')) {
        return true;
    }
    return false;
}

/**
 * create source file from header file, if source file is already exists, just return
 * @param fullFileName
 * @param isC
 * @returns fd
 */
export function createSourceFromHeader(fullFileName: string, isC: boolean = true) :SourceFile {
    let slashPos = fullFileName.lastIndexOf('/');
    if (slashPos === -1) {
        slashPos = fullFileName.lastIndexOf('\\');
    }
    if (slashPos === -1) {
        throw new Error('not recognized path');
    }


    let dotPos = fullFileName.lastIndexOf('.');

    let filePath = fullFileName.substr(0, slashPos);
    let fileNameNoExt = fullFileName.substring(slashPos + 1, dotPos);
    let headerFileName = fullFileName.substr(slashPos + 1);
    let file = path.join(filePath, fileNameNoExt + (isC ? '.c' : '.cpp'));
    return new SourceFile(file, headerFileName);
}

export function getDeclarationPos(content: string, declaration: string) :number {
    return content.indexOf(declaration);
}


class SourceFile {
    private _path: string;
    constructor(p: string, headerFile: string) {
        this._path = p;
        if (!fs.existsSync(p)) {
            fs.writeFileSync(p, `#include "${headerFile}"\n\n`, 'utf-8');
        }
    }
    /**
     * if exists definition in source file.
     * @param file
     * @param declaration
     */
    private _getDefinitionLine(declaration: string, scopes: string[]) :[string, number] | undefined {
        let line = -1;
        let data = fs.readFileSync(this._path, 'utf-8');
        let definition = semantics.getDefinition(declaration, scopes);
        let identifier = definition.getIdentifier();
        let definitionIndex = data.indexOf(identifier);
        // determine if pure identifier
        let tmpIndex = definitionIndex;
        // 1. find towards left
        if (' \t\n\r\v'.indexOf(data.charAt(definitionIndex - 1)) === -1) {
            return undefined;
        }
        // 2. find towards right
        if (' \t\n\r\v('.indexOf(data.charAt(definitionIndex + identifier.length)) === -1) {
            return undefined;
        }

        if (definitionIndex === -1) { return undefined; }
        let linebreak = data.indexOf('\n', definitionIndex);
        let prevContent = data.substr(0, linebreak);
        let lastLinebreak = prevContent.lastIndexOf('\n');
        let definitionSnippet = data.substring(lastLinebreak + 1, linebreak);
        if (definitionSnippet.match(/.+\(.*\).*\{/)) {
            // determine which line
            return [definitionSnippet, tools.linesOfContent(prevContent)];
        } else {
            return undefined;
        }
    }

    /**
     * updateDefinition
     * @param declaration
     */
    public updateDefinition(declaration :string, scopes: string[]) :vscode.Selection {
        let definitionDesc = this._getDefinitionLine(declaration, scopes);
        if (definitionDesc) {
            let data = fs.readFileSync(this._path, 'utf-8');
            let definition = semantics.getDefinition(declaration, scopes);
            if (definition.isValid) {
                let newData = data.replace(definitionDesc[0], definition.toString(true));
                fs.writeFileSync(this._path, newData, 'utf-8');
                let pos = new vscode.Position(definitionDesc[1], 4);
                return new vscode.Selection(pos, pos);
            }
        } else {

            let definition = semantics.getDefinition(declaration, scopes);
            if (definition.isValid) {
                fs.appendFileSync(this._path, definition.toString(), 'utf-8');
                let length = tools.lines(this._path);
                let pos = new vscode.Position(length - 3, 4);
                return new vscode.Selection(pos, pos);
            }
        }
        return new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));
    }

    /**
     * getPath
     */
    public getPath() :string {
        return this._path;
    }



}
