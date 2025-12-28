
import { getPref } from "../utils/prefs";

export class GeminiService {
    private static sessions: Map<string, { role: string, text: string }[]> = new Map();

    static getSession(itemId: string) {
        return this.sessions.get(itemId) || [];
    }

    static saveSession(itemId: string, history: { role: string, text: string }[]) {
        this.sessions.set(itemId, history);
    }

    static clearSession(itemId: string) {
        this.sessions.delete(itemId);
    }

    private static get apiKey(): string {
        return getPref("geminiApiKey");
    }

    private static get baseUrl(): string {
        const model = getPref("geminiModel") || "gemini-1.5-flash";
        return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    }

    static async query(context: string, question: string): Promise<string> {
        const key = this.apiKey;
        if (!key) {
            throw new Error("Gemini API Key is not set. Please set it in Zotero Preferences.");
        }

        const systemInstruction = getPref("systemInstruction") || "You are an expert academic researcher. Answer the user's question based on the provided context.";

        const payload = {
            contents: [
                {
                    parts: [
                        { text: systemInstruction + "\n\nContext:\n" + context },
                        { text: "Question:\n" + question }
                    ]
                }
            ]
        };

        try {
            const response = await fetch(`${this.baseUrl}?key=${key}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
            }

            const json = await response.json() as any;
            const content = json.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!content) {
                throw new Error("No content returned from Gemini.");
            }

            return content;
        } catch (e) {
            ztoolkit.log("Gemini Service Error", e);
            throw e;
        }
    }
    static async listModels(): Promise<string[]> {
        const key = this.apiKey;
        if (!key) throw new Error("API Key not set");

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`);
        }

        const json = await response.json() as any;
        if (!json.models) return [];

        return json.models
            .filter((m: any) => {
                const name = m.name.toLowerCase();
                return name.includes("gemini") &&
                    !name.includes("embedding") &&
                    !name.includes("robotics") &&
                    !name.includes("computer-use") &&
                    !name.includes("tts") &&
                    !name.includes("image");
            })
            .map((m: any) => m.name.replace("models/", ""));
    }
}
