import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateRendererService {
    private compiledTemplates = new Map<string, Handlebars.TemplateDelegate<any>>();

    private resolveTemplatePath(templateName: string): string {
        // Prefer dist build output, fall back to src during dev
        const distPath = path.join(process.cwd(), 'dist', 'templates', `${templateName}.hbs`);
        if (fs.existsSync(distPath)) return distPath;
        const srcPath = path.join(process.cwd(), 'src', 'templates', `${templateName}.hbs`);
        return srcPath;
    }

    private compileTemplate(templateName: string): Handlebars.TemplateDelegate<any> {
        const filePath = this.resolveTemplatePath(templateName);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Template not found: ${filePath}`);
        }
        const content = fs.readFileSync(filePath, 'utf8');
        const compiled = Handlebars.compile(content, { noEscape: false });
        this.compiledTemplates.set(templateName, compiled);
        return compiled;
    }

    public render(templateName: string, data: any): string {
        const tmpl = this.compiledTemplates.get(templateName) || this.compileTemplate(templateName);
        return tmpl(data);
    }
}


