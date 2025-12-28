// Zotero 7 Bootstrap

var chromeHandle;

function install(data, reason) {
  // Clear prefs on install to ensure a fresh start
  // reason 5 is ADDON_INSTALL
  if (reason === 5) {
    try {
      var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
      // Use Services.prefs because Zotero object might not be available during install
      var prefs = Services.prefs.getBranch("extensions.zotero.zoterogemini.");
      // deleteBranch("") removes the branch node itself and all children
      prefs.deleteBranch("");
    } catch (e) {
      if (typeof console !== 'undefined') console.error("Failed to clear prefs on install", e);
    }
  }
}

async function startup({ id, version, resourceURI, rootURI }, reason) {
  var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
  var aomStartup = Components.classes[
    "@mozilla.org/addons/addon-manager-startup;1"
  ].getService(Components.interfaces.amIAddonManagerStartup);

  var manifestURI = Services.io.newURI(rootURI + "manifest.json");
  chromeHandle = aomStartup.registerChrome(manifestURI, [
    ["content", "__addonRef__", rootURI + "content/"],
  ]);

  /**
   * Global variables for plugin code.
   * The `_globalThis` is the global root variable of the plugin sandbox environment
   * and all child variables assigned to it is globally accessible.
   * See `src/index.ts` for details.
   */
  const ctx = { rootURI };
  ctx._globalThis = ctx;

  Services.scriptloader.loadSubScript(
    `${rootURI}/content/scripts/__addonRef__.js`,
    ctx,
  );
  await Zotero.__addonInstance__.hooks.onStartup();
}

async function onMainWindowLoad({ window }, reason) {
  await Zotero.__addonInstance__?.hooks.onMainWindowLoad(window);
}

async function onMainWindowUnload({ window }, reason) {
  await Zotero.__addonInstance__?.hooks.onMainWindowUnload(window);
}

async function shutdown({ id, version, resourceURI, rootURI }, reason) {
  if (reason === APP_SHUTDOWN) {
    return;
  }

  await Zotero.__addonInstance__?.hooks.onShutdown();

  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }
}

async function uninstall(data, reason) {
  // Clear all preferences starting with our prefix
  try {
    var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
    // Use Services.prefs because Zotero object might not be available during uninstall
    var prefs = Services.prefs.getBranch("extensions.zotero.zoterogemini.");
    prefs.deleteBranch("");
  } catch (e) {
    if (typeof console !== 'undefined') console.error("Failed to clear prefs on uninstall", e);
  }
}
