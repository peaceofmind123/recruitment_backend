import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateRendererService {
    private compiledTemplates = new Map<string, { compiled: Handlebars.TemplateDelegate<any>; mtimeMs: number; filePath: string }>();

    constructor() {
        Handlebars.registerHelper('multiply', (...args: any[]) => {
            const lastArg = args[args.length - 1];
            const values = lastArg && typeof lastArg === 'object' && lastArg !== null && 'hash' in lastArg
                ? args.slice(0, -1)
                : args;
            if (values.length < 2) {
                throw new Error('multiply helper requires at least two arguments');
            }
            const numbers = values.map((value: any) => {
                const num = typeof value === 'number' ? value : Number(value);
                if (Number.isNaN(num)) {
                    throw new Error('multiply helper accepts only numeric arguments');
                }
                return num;
            });
            return numbers.reduce((product: number, current: number) => product * current, 1);
        });

		Handlebars.registerHelper('toFixed', (...args: any[]) => {
			const lastArg = args[args.length - 1];
			const values = lastArg && typeof lastArg === 'object' && lastArg !== null && 'hash' in lastArg
				? args.slice(0, -1)
				: args;
			if (values.length < 2) {
				throw new Error('toFixed helper requires two arguments: number and decimals');
			}
			const [value, decimals] = values;
			const num = typeof value === 'number' ? value : Number(value);
			const dec = typeof decimals === 'number' ? decimals : Number(decimals);
			if (Number.isNaN(num) || Number.isNaN(dec)) {
				throw new Error('toFixed helper accepts numeric arguments');
			}
			const decInt = Math.trunc(dec);
			if (decInt < 0) {
				throw new Error('toFixed decimals must be >= 0');
			}
			return num.toFixed(decInt);
		});
    }

    private resolveTemplatePath(templateName: string): string {
        // Prefer dist build output, fall back to src during dev
        const distPath = path.join(process.cwd(), 'dist', 'templates', `${templateName}.hbs`);
        if (fs.existsSync(distPath)) return distPath;
        const srcPath = path.join(process.cwd(), 'src', 'templates', `${templateName}.hbs`);
        return srcPath;
    }

    private compileTemplate(templateName: string, filePath: string): Handlebars.TemplateDelegate<any> {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Template not found: ${filePath}`);
        }
        const content = fs.readFileSync(filePath, 'utf8');
        const compiled = Handlebars.compile(content, { noEscape: false });
        const stat = fs.statSync(filePath);
        this.compiledTemplates.set(templateName, { compiled, mtimeMs: stat.mtimeMs, filePath });
        return compiled;
    }

    public render(templateName: string, data: any): string {
        const filePath = this.resolveTemplatePath(templateName);
        const cached = this.compiledTemplates.get(templateName);

        // Always check the mtime to support hot-reload of templates without server restart
        try {
            const stat = fs.statSync(filePath);
            if (!cached || cached.filePath !== filePath || cached.mtimeMs !== stat.mtimeMs) {
                const compiled = this.compileTemplate(templateName, filePath);
                return compiled(data);
            }
            return cached.compiled(data);
        } catch (e) {
            // If stat fails for any reason, try compile once
            const compiled = this.compileTemplate(templateName, filePath);
            return compiled(data);
        }
    }
}


