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
        // s can be '', when it's a constructor or destructor
        if (s !== '' && s !== '\n') {
            s += ' ';
        }
        s += `${scopePrefix}${this.name}(${this.params})`;
        let postfix = this.decoration.join(' ');
        s += (postfix === '' ? '' : ' ' + postfix);
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

const regDeclaration = /(.*)\((.*)\)\s*(\S*)\s*;/;

/**
 * if is declaration (suppose all in this string)
 * @param statement
 */
export function isDeclaration(statement: string) :boolean {
    if (regDeclaration.exec(statement)) {
        let s = statement;
        // filt unmatched anglebracket statements.
        if (!hasMatchedAngleBrackets(statement)) {
            return false;
        }
        // filt prefix
        // filt special symbol
        let prefixPos = statement.indexOf('(');
        let prefix = statement.substr(0, prefixPos);
        if (prefix.indexOf('operator') === -1) {
            // filt .
            for (let c of prefix) {
                if ('.='.indexOf(c) !== -1) {
                    return false;
                }
            }
        }
        // filt other part
        // exclude `=`, for default argument
        let other = statement.substr(prefixPos);
        for (let c of other) {
            if ('.'.indexOf(c) !== -1) {
                return false;
            }
        }
        return true;
    }
    return false;
}

/**
 * for template parameter
 * @param content
 */
function hasMatchedAngleBrackets(content: string) {
    let i = 0;
    let matcher: number[]= [];
    while (i < content.length) {
        if (content.charAt(i) === '<') {
            matcher.push(1);
        } else if (content.charAt(i) === '>') {
            if (!matcher.pop()) {
                return false;
            }
        }
        ++i;
    }
    if (matcher.length !== 0) {
        return false;
    }
    return true;
}

/**
 * get declaration from content.
 * @param declaration
 */
export function getDefinition(declaration: string, scopes: string[] = []) :Definition {
    let definition = new Definition;
    definition.scopes = scopes;

    let match = regDeclaration.exec(declaration);
    if (!match) { return definition; }

    // return and name
    let rn = match[1].trim();
    let rns = rn.split(/\s+/);

    let isVirtual = false;
    // filter specific identifier
    let filters = ['virtual', 'explicit'];
    for (let identifier of rns) {
        let filt = false;
        for (let filter of filters) {
            if (identifier.indexOf(filter) !== -1) {
                filt = true;
                break;
            }
        }
        if (filt) {
            if (identifier.indexOf('virtual') !== -1) {
                isVirtual = true;
            }
            continue;
        }

        // add to prefix
        definition.prefixs.push(identifier);
    }

    let name = definition.prefixs.pop();
    if (name) {
        // destruction without override
        if (name.indexOf('~') !== -1) {
            isVirtual = false;
        }
        definition.name = name;
    } else {
        return definition;
    }

    // parameters (not verify for now)
    definition.params = trimEqual(match[2]);


    let remain = match[3];
    let validDecorations = ['const'];
    for (let d of validDecorations) {
        if (remain.indexOf(d) !== -1) {
            definition.decoration.push(d);
        }
    }

    if (isVirtual) {
        definition.decoration.push('override');
    }

    definition.isValid = true;
    return definition;
}

/**
 * Helper function, trim `=` in argument list
 */
function trimEqual(content: string) {
    let newContents: string[] = [];
    let args = content.split(',');
    for (let arg of args) {
        let leftSide = arg.split('=')[0].trim();
        newContents.push(leftSide);
    }
    return newContents.join(', ');
}


class ScopeEntity {
    public name :string = '';
    public leftBrace: number = -1;
    public rightBrace: number = -1;
}

export class Scope {
    private _scopes: ScopeEntity[] = [];
    private _regexScope: RegExp = /(?:namespace|class|struct)\s+(\S+)\s*.*{/;
    private _regexAnonymousScope: RegExp = /(?:namespace|class|struct)\s*{/;
    private _scopeIdentifiers: string[] = ['namespace', 'class', 'struct'];

    constructor(content: string) {
        // find all scopes
        let lastPos :number = 0;
        while (true) {
            let miniPos :number = -1;
            // find a identifier
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
                // can be happen in comments.
                if (leftBraceMarkPos === -1) {
                    lastPos = miniPos + 1;
                    continue;
                }
                let snippet = content.substring(miniPos, leftBraceMarkPos + 1);
                let res = this._regexScope.exec(snippet);
                if (res) {
                    let entity = new ScopeEntity;
                    entity.name = res[1];
                    entity.leftBrace = leftBraceMarkPos;
                    this._scopes.push(entity);
                } else if (this._regexAnonymousScope.exec(snippet)) {
                    // anoymous handle ?
                    let entity = new ScopeEntity;
                    entity.name = '<anonymous>';
                    entity.leftBrace = leftBraceMarkPos;
                    this._scopes.push(entity);
                } else {
                    vscode.window.showErrorMessage('grammar error---' + snippet);
                    throw new Error("grammar error");
                }
                // ready for next loop
                lastPos = miniPos + 1;

            } else {
                // no more scope identifier
                break;
            }
        }
        // determine scope's right brace position
        let matches = this.matchBracket(content, this.ignore(content));
        for (let i = 0; i < this._scopes.length; ++i) {
            let hasOne = false;
            for (let match of matches) {
                if (match.l === this._scopes[i].leftBrace) {
                    this._scopes[i].rightBrace = match.r;
                    hasOne = true;
                    break;
                }
            }
            if (!hasOne) {
                throw new Error(`can not resolve scope's right bracket--${this._scopes[i].leftBrace}`);
            }
        }
    }

    private matchBracket(content: string, ignores: number[]): { l: number, r: number}[] {
        let matcherResult: {
            l: number;
            r: number;
        }[] = [];
        let bracketMatcher = [];
        let pos = 0;

        while (pos < content.length) {
            if (content.charAt(pos) === '{' && ignores.indexOf(pos) === -1) {
                bracketMatcher.push(pos);
            } else if(content.charAt(pos) === '}' && ignores.indexOf(pos) === -1) {
                let l = bracketMatcher.pop();
                if (l) {
                    matcherResult.push({
                        l: l,
                        r: pos
                    });
                } else {
                    vscode.window.showErrorMessage('bracket unmatched.');
                    throw new Error('bracket unmatched.');
                }
            }
            ++pos;
        }

        if (bracketMatcher.length > 0) {
            vscode.window.showErrorMessage('bracket unmatched.');
            throw new Error('bracket unmatched.');
        }
        return matcherResult;
    }

    private ignore(content: string):number[] {
        // FIXME #define can also contain unmatched bracket. comment
        let res: number[] = [];
        let pos = 0;
        let ignoring = false;
        let expect = `'`;
        while (pos < content.length) {
            let c = content.charAt(pos);
            if (`'"`.indexOf(c) !== -1) {
                if (ignoring && expect === c) {
                    ignoring = false;
                } else if(!ignoring) {
                    ignoring = true;
                    expect = c;
                }
            }
            if (ignoring) {
                res.push(pos);
            }
            ++pos;
        }
        return res;
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

function getLineContent(content: string, offset: number) {
    let prev = offset;
    let next = offset;
    while (content.charAt(prev) !== '\n') {
        --prev;
    }

    while (content.charAt(next) !== '\n') {
        ++next;
    }

    return content.substring(prev + 1, next);
}
