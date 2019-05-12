import * as fs from "fs";

export function lines(file: string) :number {
    let content = fs.readFileSync(file, 'utf-8');
    return content.split(/\r\n|\r|\n/).length;
}

export function linesOfContent(content: string) :number {
    return content.split(/\r\n|\r|\n/).length;
}