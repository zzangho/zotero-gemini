# Zotero Gemini

Zotero 7 plugin for interacting with Google Gemini AI models.

Based on: [zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template)

## Features

- **Context-Aware Chat**: Interrogate selected Zotero items. Context includes PDF full-text and existing Zotero notes.
  ![Chat Interface Example](doc/chat_interface.png)
- **Session Persistence**: Chat history is saved per item and restored upon reopening.
- **Window Management**: 
  - Toggle visibility with `Ctrl+/` (or `Cmd+/` on Mac).
  - Remembers last window position and dimensions.
- **Markdown Rendering**: Supports headers, bold text, and lists in AI responses.
- **Note Integration**: Export the last AI response as a Zotero Note.
- **Dynamic Model Selection**: Select from available Gemini models (e.g., flash, pro) via settings.
- **API Verification**: In-settings API key validation and model list fetching.
  ![Preferences Configuration](doc/preferences.png)

## Environment

- OS: Windows 11
- Zotero: 7.0.30

## Installation

1. Download `.xpi`.
2. Install via Zotero **Tools** -> **Add-ons**.
3. Set API Key in **Edit** -> **Settings** -> **Zotero Gemini**.

## Development

- **Prerequisites**: Node.js 18+
- **Build**: `npm install` followed by `npm run build`.

## Project Files

- `addon/`: Plugin chrome and UI code.
- `src/`: TypeScript application logic.
- `tools/`: Build automation.
