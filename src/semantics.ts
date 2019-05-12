import * as vscode from "vscode";

class Definition {
    public prefix: string[] = [];
    public scope: string[] = [];
    public name: string = '';
    public params: string = '';
    public decoration: string[] = [];
    public isValid: boolean = false;
}



/**
 * if is declaration (suppose all in this string)
 * @param statement
 */
export function isDeclaration(statement: string) :boolean {
    let leftBracketPos = statement.indexOf('(');
    if (leftBracketPos === -1) { return false; }

    let rightBracketPos = statement.indexOf(')');
    if (rightBracketPos === -1 || rightBracketPos <= leftBracketPos) { return false; }

    // return and name
    // let rn = statement.substr(0, leftBracketPos);
    // let rns = rn.split(/\s+/);
    // if (rns.length !== 2) {
    //     // vscode.window.showErrorMessage("not declaration: rn's length !== 2");
    //     return false;
    // }

    // parameters (not verify for now)

    let remain = statement.substr(rightBracketPos + 1);
    if (remain.indexOf(';') === -1) {
        // vscode.window.showErrorMessage('not declaration: remain not contains ;');
        return false;
    }

    return true;
}

/**
 * get declaration from content.
 * @param declaration
 */
export function getDefinition(declaration: string) :Definition {
    let definition = new Definition;

    let leftBracketPos = declaration.indexOf('(');
    if (leftBracketPos === -1) {
        return definition;
    }

    let rightBracketPos = declaration.indexOf(')');
    if (rightBracketPos === -1 || rightBracketPos <= leftBracketPos) {
        return definition;
    }

    // return and name
    let rn = declaration.substr(0, leftBracketPos);
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
        definition.prefix.push(identifier);
    }

    let name = definition.prefix.pop();
    if (name) {
        definition.name = name;
    } else {
        return definition;
    }

    // parameters (not verify for now)
    definition.params = declaration.substring(leftBracketPos + 1, rightBracketPos);


    let remain = declaration.substr(rightBracketPos + 1);
    let validDecorations = ['const'];
    for (let d of validDecorations) {
        if (remain.indexOf(d) !== -1) {
            definition.decoration.push(d);
        }
    }

    definition.isValid = true;
    return definition;
}


/**
 * get full definition
 * @param declaration
 */
export function getFullDefinition(declaration: string, half: boolean = false) :string {
    let definition = getDefinition(declaration);
    let s = '';
    if (!half) {
        s += '\n';
    }
    let prefix = definition.prefix.join(' ');
    s += prefix;
    s += ` ${definition.name}(${definition.params})`;
    let postfix = definition.decoration.join(' ');
    s += postfix;
    if (half) {
        s += ' {';
    } else {
        s += ' {\n    \n}\n';
    }
    return s;
}