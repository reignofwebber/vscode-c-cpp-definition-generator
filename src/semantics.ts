import * as vscode from "vscode";
import * as fs from "fs";

export class Definition {
    public prefixs: string[] = [];
    public scopes: string[] = [];
    public name: string = '';
    public params: string = '';
    public decoration: string[] = [];
    public isValid: boolean = false;

    /**
     * toString
     */
    public toString(half: boolean = false) :string {
        let s = '';
        if (!half) {
            s += '\n';
        }

        let scopePrefix = '';
        for (let scope of this.scopes) {
            scopePrefix += (scope + '::');
        }
        let prefix = this.prefixs.join(' ');
        s += prefix;
        s += ` ${scopePrefix}${this.name}(${this.params})`;
        let postfix = this.decoration.join(' ');
        s += postfix;
        if (half) {
            s += ' {';
        } else {
            s += ' {\n    \n}\n';
        }
        return s;
    }

    /**
     * getIdentifier
     */
    public getIdentifier() {
        let scopePrefix = '';
        for (let scope of this.scopes) {
            scopePrefix += (scope + '::');
        }
        return scopePrefix + this.name;
    }
}

const regDeclaration = /(.*?)\((.*)\)\s*(\d*)\s*;/;

/**
 * if is declaration (suppose all in this string)
 * @param statement
 */
export function isDeclaration(statement: string) :boolean {
    if (regDeclaration.exec(statement)) {
        return true;
    }
    return false;
}

/**
 * get declaration from content.
 * @param declaration
 */
export function getDefinition(declaration: string, scopes: string[]) :Definition {
    let definition = new Definition;
    definition.scopes = scopes;

    let match = regDeclaration.exec(declaration);
    if (!match) { return definition; }

    // return and name
    let rn = match[1].trim();
    let rns = rn.split(/\s+/);

    // filter specific identifier
    let filters = ['virtual'];
    for (let identifier of rns) {
        let filt = false;
        for (let filter of filters) {
            if (identifier.indexOf(filter) !== -1) {
                filt = true;
            }
        }
        if (filt) {
            continue;
        }
        // add to prefix
        definition.prefixs.push(identifier);
    }

    let name = definition.prefixs.pop();
    if (name) {
        definition.name = name;
    } else {
        return definition;
    }

    // parameters (not verify for now)
    definition.params = match[2];


    let remain = match[3];
    let validDecorations = ['const'];
    for (let d of validDecorations) {
        if (remain.indexOf(d) !== -1) {
            definition.decoration.push(d);
        }
    }

    definition.isValid = true;
    return definition;
}


class ScopeEntity {
    public name :string = '';
    public leftBrace: number = -1;
    public rightBrace: number = -1;
}

export class Scope {
    private _scopes: ScopeEntity[] = [];
    private _regexScope: RegExp = /(?:namespace|class|struct)\s+(\S+)\s*.*{/;
    private _scopeIdentifiers: string[] = ['namespace', 'class', 'struct'];

    constructor(content: string) {
        // find all scopes
        let lastPos :number = 0;
        while (true) {
            let miniPos :number = -1;
            for (let identifier of this._scopeIdentifiers) {
                let pos = content.indexOf(identifier, lastPos);
                if (pos === -1) { continue; }
                if (miniPos !== -1 && miniPos > pos) {
                    miniPos = pos;
                } else if (miniPos === -1) {
                    miniPos = pos;
                }
            }

            if (miniPos !== -1) {
                let leftBraceMarkPos = content.indexOf('{', miniPos);
                let snippet = content.substring(miniPos, leftBraceMarkPos + 1);
                let res = this._regexScope.exec(snippet);
                if (res) {
                    let entity = new ScopeEntity;
                    entity.name = res[1];
                    entity.leftBrace = leftBraceMarkPos;
                    this._scopes.push(entity);
                } else {
                    vscode.window.showErrorMessage('grammer error---' + snippet);
                    throw new Error("grammer error");
                }
                // ready for next loop
                lastPos = miniPos + 1;

            } else {
                // no more scope identifier
                break;
            }
        }
        // determine scope's right brace position
        lastPos = 0;
        let scopeIndex = 0;
        let brackMatcher = [];
        while (this._scopes[scopeIndex]) {
            let lPos = content.indexOf('{', lastPos);
            let rPos = content.indexOf('}', lastPos);
            if (lPos !== -1 && lPos < rPos) {
                brackMatcher.push(lPos);
                lastPos = lPos + 1;
            } else if ((rPos !== -1 && lPos > rPos) || (lPos === -1 && rPos !== -1)) {
                let pPos = brackMatcher.pop();
                if (pPos) {
                    if (this._scopes[scopeIndex].leftBrace === pPos) {
                        this._scopes[scopeIndex].rightBrace = rPos;
                        ++scopeIndex;
                    }
                } else {
                    throw new Error('bracket unmatched');
                }
                lastPos = rPos + 1;
            } else {
                throw new Error('unexpected error');
            }
        }

    }

    public static createScope(content: string) :Scope {
        return new Scope(content);
    }

    /**
     * getScopePrefix
     */
    public getScopePrefix(pos: number) :string {
        let res = '';
        for (let scope of this._scopes) {
            if (pos > scope.leftBrace && pos < scope.rightBrace) {
                res += `${scope.name}::`;
            }
        }
        return res;
    }

    /**
     * getScopes
     */
    public getScopes(pos: number) :string[] {
        let res: string[] = [];
        for (let scope of this._scopes) {
            if (pos > scope.leftBrace && pos < scope.rightBrace) {
                res.push(scope.name);
            }
        }
        return res;
    }

    /**
     * isEmpty
     */
    public isEmpty() : boolean {
        if (this._scopes.length) {
            return false;
        }
        return true;
    }
}
