export declare function escapeHtml(text: string): string;
export declare function getEmailLogoSrc(): string;
export type EmailTemplateOptions = {
    title?: string;
    preheader?: string;
    bodyHtml: string;
};
export declare function buildEmailHtml(options: EmailTemplateOptions): string;
export declare function emailParagraph(html: string): string;
export declare function emailMutedNote(text: string): string;
export declare function emailSmallPrint(text: string): string;
export declare function emailButton(href: string, label: string): string;
export declare function emailCodeDisplay(code: string): string;
export declare function emailDataTable(rows: Array<{
    label: string;
    value: string;
}>): string;
export declare function emailHighlightBox(innerHtml: string): string;
export declare function emailBadge(text: string): string;
