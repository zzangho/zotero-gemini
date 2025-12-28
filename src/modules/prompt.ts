
import { GeminiService } from "./gemini";
import { ContextBuilder } from "./contextBuilder";

export class GeminiPrompt {
    static register() {
        ztoolkit.Prompt.register([
            {
                name: "Ask Gemini",
                label: "Ask Gemini about this paper...",
                id: "gemini-ask",
                // Only show if an item is selected
                when: () => {
                    const items = (Zotero.getMainWindow() as any).ZoteroPane.getSelectedItems();
                    return items.length === 1 && items[0].isRegularItem();
                },
                callback: async (prompt) => {
                    const items = (Zotero.getMainWindow() as any).ZoteroPane.getSelectedItems();
                    const item = items[0];

                    // 1. Setup UI
                    prompt.inputNode.placeholder = "Type your question here (e.g. Summarize this)...";
                    const container = prompt.createCommandsContainer();

                    // Helper to add messages
                    const addMessage = (text: string, type: "user" | "gemini" = "gemini") => {
                        const div = ztoolkit.UI.createElement(Zotero.getMainWindow().document, "div", {
                            styles: {
                                padding: "10px",
                                margin: "5px 0",
                                borderRadius: "5px",
                                backgroundColor: type === "user" ? "#e3f2fd" : "#f5f5f5",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word"
                            }
                        });
                        div.textContent = text;
                        container.appendChild(div);
                        div.scrollIntoView();
                    };

                    // Hijack the input to not close on enter, but send query
                    // Note: ztoolkit Prompt might close on Enter by default if we don't handle it.
                    // We need to attach a keydown listener to inputNode.

                    const input = prompt.inputNode;

                    // Remove default listeners if possible or add ours with higher priority?
                    // The Prompt class usually handles Enter. 
                    // Implementation strategy: We will use the callback as the entry point.
                    // But 'callback' in ztoolkit.Prompt is triggered when the command is SELECTED.
                    // Wait, the user pressed Ctrl+/ (triggers prompt), typed "Ask Gemini", ENTER.
                    // NOW we are in this callback.
                    // The prompt UI is still open? 
                    // ztoolkit.Prompt usually closes after selection.
                    // We need to keep it open or reopen a new custom dialog?

                    // Investigating PromptExample in examples.ts:
                    // "prompt.exit will remove current container element."
                    // So if we don't call exit, it might stay open?
                    // But `register` usually defines a list of *commands*.
                    // User selects "Ask Gemini", then this callback runs.

                    // The PLAN was: "User types question... result appears in scrollable results window".
                    // If we use the Prompt as a command palette, the flow is:
                    // 1. Ctrl+/ -> Prompt opens.
                    // 2. User types "Ask Gemini" (or selects it).
                    // 3. Callback runs.
                    // 4. NOW we want a chat interface.

                    // We should probably replace the content of the prompt container with our chat UI
                    // OR open a new Dialog.
                    // Given constraints, a new Dialog (ztoolkit.Dialog) might be cleaner for a Chat.
                    // But the user liked "Ctrl+/ -> Text Box".

                    // Let's try to reuse the Prompt UI if possible, or spawn a clean Dialog that LOOKS like a spotlight.
                    // ztoolkit.Dialog is a modal center dialog.

                    // Let's use `ztoolkit.Dialog` for the actual chat, it's safer.
                    // So the flow:
                    // 1. Ctrl+/ (Standard Zotero shortcut for our plugin command?)
                    // No, ztoolkit.Prompt is the command palette itself.
                    // If we want `Ctrl+/` to DIRECTLY open the chat, we should register a specific shortcut that calls our function, NOT go through the generic command palette.

                    // Let's register a dedicated shortcut in `src/hooks.ts` that calls `GeminiPrompt.openChat()`.

                    this.openChat(item);
                }
            }
        ]);
    }

    private static activeWindows: Map<string, any> = new Map();

    static async openChat(item: Zotero.Item) {
        const itemId = String(item.id);
        const existingWin = this.activeWindows.get(itemId);

        // Toggle Logic: If window exists and is open, close it (save state happens in onclose).
        if (existingWin && !existingWin.closed) {
            existingWin.close();
            this.activeWindows.delete(itemId);
            return;
        }

        const win = Zotero.getMainWindow();

        // Read persistence prefs
        const prefix = "extensions.zotero.zoterogemini.";
        const width = Zotero.Prefs.get(prefix + "chatWindowWidth", true) || 600;
        const height = Zotero.Prefs.get(prefix + "chatWindowHeight", true) || 600;
        const left = Zotero.Prefs.get(prefix + "chatWindowX", true);
        const top = Zotero.Prefs.get(prefix + "chatWindowY", true);

        let features = `chrome,resizable,scrollbars,width=${width},height=${height}`;
        if (left !== -1 && top !== -1) {
            features += `,left=${left},top=${top}`;
        } else {
            features += `,centerscreen`;
        }

        // Open the chat window, passing dependencies
        const openWin = win.openDialog(
            "chrome://zoterogemini/content/chat.html",
            `zotero-gemini-chat-${itemId}`,
            features,
            {
                item,
                Zotero: Zotero,
                GeminiService: GeminiService,
                ContextBuilder: ContextBuilder
            }
        );

        this.activeWindows.set(itemId, openWin);
    }
}
