import hubdown from "hubdown";
import createDOMPurify from 'dompurify';
import {JSDOM} from 'jsdom';


const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(<any>window);

export async function markdownToSafeHtml(markdown: string) {
    const unsafeHtml = await hubdown(markdown);
    return DOMPurify.sanitize(unsafeHtml.content);
}
