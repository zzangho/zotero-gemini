
export class ContextBuilder {
    /**
     * Builds the context string from the item's PDF attachment and child notes.
     * @param item The Zotero Item (Regular item with attachments)
     */
    static async buildContext(item: Zotero.Item): Promise<string> {
        const parts: string[] = [];

        // 1. Get Metadata
        const metadata = [
            `Title: ${item.getField("title")}`,
            `Abstract: ${item.getField("abstractNote")}`,
            `Date: ${item.getField("date")}`
        ].join("\n");
        parts.push(`[[METADATA]]\n${metadata}`);

        // 2. Get PDF Text
        // Find the best attachment (likely the PDF)
        const attachment = await item.getBestAttachment();
        if (attachment && attachment.isPDFAttachment()) {
            try {
                const cacheFile = (Zotero.Fulltext as any).getItemCacheFile(attachment);
                if (cacheFile && cacheFile.exists()) {
                    const pdfText = await Zotero.File.getContentsAsync(cacheFile.path) as string;
                    if (pdfText) {
                        parts.push(`[[PDF CONTENT]]\n${pdfText}`);
                    } else {
                        parts.push(`[[PDF CONTENT]]\n(PDF text cache is empty.)`);
                    }
                } else {
                    parts.push(`[[PDF CONTENT]]\n(PDF text not indexed. Please right-click -> 'Reindex Item'.)`);
                }
            } catch (e) {
                ztoolkit.log("Error reading PDF text", e);
                parts.push(`[[PDF CONTENT]]\n(Error reading PDF text: ${e})`);
            }
        } else {
            parts.push(`[[PDF CONTENT]]\n(No PDF attachment found.)`);
        }

        // 3. Get Child Notes
        const notes = item.getNotes();
        if (notes.length > 0) {
            const noteTexts = [];
            for (const noteId of notes) {
                const noteItem = Zotero.Items.get(noteId);
                // Notes are HTML, we might want to strip HTML tags or keep them.
                // Keeping them allows Gemini to see formatting.
                noteTexts.push(`--- Note (${noteItem.getNoteTitle()}) ---\n${noteItem.getNote()}`);
            }
            parts.push(`[[USER NOTES]]\n${noteTexts.join("\n\n")}`);
        }

        return parts.join("\n\n");
    }
}
