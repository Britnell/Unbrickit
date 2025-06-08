import Alpine from 'alpinejs';

Alpine.data('system', () => ({
  fullscreen: false,
  screenLock: null,
  init() {
    if (document.fullscreenElement) {
      this.fullscreen = true;
    }
  },
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.fullscreen = true;
      });
    } else {
      document.exitFullscreen().then(() => {
        this.fullscreen = false;
      });
    }
  },
  toggleScreenLock() {
    if (this.screenLock) {
      this.screenLock.release();
      this.screenLock = null;
    } else {
      navigator.wakeLock
        .request()
        .then((wakeLock) => {
          this.screenLock = wakeLock;
          wakeLock.onrelease = () => {
            this.screenLock = null;
          };
        })
        .catch(() => {
          this.screenLock = null;
        });
    }
  },
}));
