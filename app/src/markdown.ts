import hubdown from "hubdown";
import DOMPurify from 'dompurify';


export async function markdownToSafeHtml(markdown: string) {
    const unsafeHtml = await hubdown(markdown);
    return DOMPurify.sanitize(unsafeHtml.content);
}
