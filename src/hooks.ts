import {
  BasicExampleFactory,
  HelperExampleFactory,
  KeyExampleFactory,
  PromptExampleFactory,
  UIExampleFactory,
} from "./modules/examples";
import { getString, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";

import { GeminiPrompt } from "./modules/prompt";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();

  BasicExampleFactory.registerPrefs();

  // BasicExampleFactory.registerNotifier();

  // KeyExampleFactory.registerShortcuts();

  // Register Gemini Chat Shortcut (Ctrl+/)
  ztoolkit.Keyboard.register((ev, keyOptions) => {
    // Check for Ctrl+/ (Windows/Linux) or Cmd+/ (Mac)
    const isAccel = Zotero.isMac ? ev.metaKey : ev.ctrlKey;
    if (isAccel && ev.key === "/") {
      // Check if item is selected
      const items = (Zotero.getMainWindow() as any).ZoteroPane.getSelectedItems();
      if (items.length === 1 && items[0].isRegularItem()) {
        GeminiPrompt.openChat(items[0]);
        ev.preventDefault(); // Consume event
      } else {
        ztoolkit.log("Gemini Shortcut triggered but no single regular item selected.");
      }
    }
  });

  // await UIExampleFactory.registerExtraColumn();
  // await UIExampleFactory.registerExtraColumnWithCustomCell();
  // UIExampleFactory.registerItemPaneCustomInfoRow();
  // UIExampleFactory.registerItemPaneSection();
  // UIExampleFactory.registerReaderItemPaneSection();


  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  // Mark initialized as true to confirm plugin loading status
  // outside of the plugin (e.g. scaffold testing process)
  addon.data.initialized = true;
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  win.MozXULElement.insertFTLIfNeeded(
    `${addon.data.config.addonRef}-mainWindow.ftl`,
  );

  const popupWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: true,
    closeTime: -1,
  })
    .createLine({
      text: getString("startup-begin"),
      type: "default",
      progress: 0,
    })
    .show();

  await Zotero.Promise.delay(1000);
  popupWin.changeLine({
    progress: 30,
    text: `[30%] ${getString("startup-begin")}`,
  });

  // UIExampleFactory.registerStyleSheet(win);
  // UIExampleFactory.registerRightClickMenuItem();
  // UIExampleFactory.registerRightClickMenuPopup(win);
  // UIExampleFactory.registerWindowMenuWithSeparator();
  // PromptExampleFactory.registerNormalCommandExample();
  // PromptExampleFactory.registerAnonymousCommandExample(win);
  // PromptExampleFactory.registerConditionalCommandExample();

  await Zotero.Promise.delay(1000);

  popupWin.changeLine({
    progress: 100,
    text: `[100%] ${getString("startup-finish")}`,
  });
  popupWin.startCloseTimer(5000);

  // addon.hooks.onDialogEvents("dialogExample");
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
  // Remove addon object
  addon.data.alive = false;
  // @ts-expect-error - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  // You can add your code to the corresponding notify type
  ztoolkit.log("notify", event, type, ids, extraData);
  if (
    event == "select" &&
    type == "tab" &&
    extraData[ids[0]].type == "reader"
  ) {
    // BasicExampleFactory.exampleNotifierCallback();
  } else {
    return;
  }
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
 * @param type event type
 * @param data event data
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      // Restore cached models if available
      try {
        const savedListStr = Zotero.Prefs.get("extensions.zotero.zoterogemini.geminiModelList") as string;
        if (savedListStr) {
          const savedModels = JSON.parse(savedListStr);
          if (Array.isArray(savedModels) && savedModels.length > 0) {
            const doc = data.window.document as Document;
            const select = doc.getElementById(`zotero-prefpane-${addon.data.config.addonRef}-geminiModel`) as HTMLSelectElement;
            if (select) {
              const currentVal = Zotero.Prefs.get("extensions.zotero.zoterogemini.geminiModel");
              select.innerHTML = "";
              savedModels.forEach(m => {
                const opt = doc.createElement("option");
                opt.value = m;
                opt.text = m;
                select.appendChild(opt);
              });
              if (currentVal) select.value = currentVal as string;

              // Explicit manual listener for robustness
              select.addEventListener('change', () => {
                Zotero.Prefs.set("extensions.zotero.zoterogemini.geminiModel", select.value);
              });
            }
          }
        }
      } catch (e) {
        ztoolkit.log("Failed to load cached models", e);
      }
      break;
    case "verify":
      (async () => {
        try {
          // Must import dynamic or use global implementation?
          // Using the GeminiService from modules (assuming it's loaded)
          // We need to import GeminiService in hooks.ts or access it via require
          const GeminiService = (await import("./modules/gemini")).GeminiService;
          const models = await GeminiService.listModels();

          // Save list to prefs
          Zotero.Prefs.set("extensions.zotero.zoterogemini.geminiModelList", JSON.stringify(models));

          data.window.alert(`API Key Verified! Available Models:\n${models.join(", ")}`);

          // Update dropdown in the pref window
          const doc = data.window.document as Document;
          const select = doc.getElementById(`zotero-prefpane-${addon.data.config.addonRef}-geminiModel`) as HTMLSelectElement;
          if (select) {
            const currentVal = select.value;
            // Clear existing options
            select.innerHTML = "";
            models.forEach(m => {
              const opt = doc.createElement("option");
              opt.value = m;
              opt.text = m;
              select.appendChild(opt);
            });
            // Try to keep current selection if valid, else default
            if (models.includes(currentVal)) {
              select.value = currentVal;
            } else if (models.includes("gemini-1.5-flash")) {
              select.value = "gemini-1.5-flash";
            }

            if (select.value) {
              // Initial save of the selected value to be sure
              Zotero.Prefs.set("extensions.zotero.zoterogemini.geminiModel", select.value);
            }

            // Force update UI and pref binding
            select.dispatchEvent(new data.window.Event('change', { bubbles: true }));
            select.dispatchEvent(new data.window.Event('command', { bubbles: true }));

            // Add separate listener for subsequent changes
            select.addEventListener('change', () => {
              Zotero.Prefs.set("extensions.zotero.zoterogemini.geminiModel", select.value);
            });
          }
        } catch (e: any) {
          data.window.alert("Verification Failed: " + (e.message || e));
        }
      })();
      break;
    case "saveInstruction":
      const doc = data.window.document as Document;
      const textarea = doc.getElementById(`zotero-prefpane-${addon.data.config.addonRef}-systemInstruction`) as HTMLTextAreaElement;
      if (textarea) {
        Zotero.Prefs.set("extensions.zotero.zoterogemini.systemInstruction", textarea.value);
        data.window.alert("System Instruction Saved!");
      }
      break;
    default:
      return;
  }
}

function onShortcuts(type: string) {
  switch (type) {
    case "larger":
      // KeyExampleFactory.exampleShortcutLargerCallback();
      break;
    case "smaller":
      // KeyExampleFactory.exampleShortcutSmallerCallback();
      break;
    default:
      break;
  }
}

function onDialogEvents(type: string) {
  switch (type) {
    // case "dialogExample":
    //   HelperExampleFactory.dialogExample();
    //   break;
    // case "clipboardExample":
    //   HelperExampleFactory.clipboardExample();
    //   break;
    // case "filePickerExample":
    //   HelperExampleFactory.filePickerExample();
    //   break;
    // case "progressWindowExample":
    //   HelperExampleFactory.progressWindowExample();
    //   break;
    // case "vtableExample":
    //   HelperExampleFactory.vtableExample();
    //   break;
    default:
      break;
  }
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintain.

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
  onShortcuts,
  onDialogEvents,
};
