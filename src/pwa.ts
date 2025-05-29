const registerSw = !import.meta.env.DEV;

if (registerSw) {
  Promise.all([import("virtual:pwa-register"), import("virtual:pwa-info")])
    .then(([{ registerSW }, { pwaInfo }]) => {
      const linktag = document.createElement("link");
      console.log(pwaInfo);

      linktag.setAttribute("rel", "manifest");
      linktag.setAttribute("href", pwaInfo.webManifest.href);
      document.head.appendChild(linktag);

      registerSW({
        immediate: true,
        onRegisteredSW(swScriptUrl: string) {
          console.log("Service Worker registered:", swScriptUrl);
        },
        onOfflineReady() {
          console.log("PWA application ready to work offline");
        },
        onNeedRefresh() {
          if (confirm("New content available. Reload?")) {
            window.location.reload();
          }
        },
      });
    })
    .catch((error) => {
      console.error("Failed to load PWA modules:", error);
    });
} else {
  console.log("PWA is disabled in development mode");
}
