import { app, BrowserWindow, Menu, utilityProcess } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

const isDev = process.env.DEV != undefined;

export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let mainWindow: BrowserWindow | null;

function createWindow() {
  // Create the main menu
  const template: Array<
    Electron.MenuItemConstructorOptions | Electron.MenuItem
  > = [
    // { role: 'appMenu' }
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" }, // Separator added here
        {
          label: "Settings",
          click: () => {
            // Send IPC message to renderer to open Settings modal
            if (mainWindow) {
              mainWindow.webContents.send("open-settings");
            }
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    // { role: 'editMenu' }
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },

    // You can add other menu items here if necessary
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 680,
    height: 644,
    resizable: false,
    title: "My App",
    titleBarStyle: "hidden",
    ...(process.platform !== "darwin" ? { titleBarOverlay: true } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
    mainWindow.loadURL(VITE_DEV_SERVER_URL as string);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

function startBackendDev() {
  const serverPath = path.join(__dirname, "..", "backend", "server.js");

  const forked = utilityProcess.fork(serverPath, [], {
    cwd: __dirname,
    stdio: "pipe",
  });

  forked.stdout?.on("data", (data) => {
    const message = data.toString().trim();
    console.log(`Backend: ${message}`);
  });

  forked.on("exit", (code: number | null) => {
    if (code !== 0) {
      console.error(`Backend process exited with code ${code}`);
    }
  });
}

function startBackendProd(): Promise<void> {
  const serverPath: string = path.join(MAIN_DIST, "server.js");

  return new Promise((resolve, reject) => {
    try {
      const forked = utilityProcess.fork(serverPath, [], {
        cwd: __dirname,
        stdio: "pipe",
      });

      forked.stdout?.on("data", (data) => {
        const message = data.toString().trim();
        console.log(`Backend: ${message}`);
        if (message.includes("ready")) {
          resolve(); // Resolve when the backend signals readiness
        }
      });

      forked.on("exit", (code: number | null) => {
        if (code !== 0) {
          console.error(`Backend process exited with code ${code}`);
          reject(new Error(`Backend process exited with code ${code}`));
        }
      });
    } catch (err) {
      console.error("Failed to fork backend process:", err);
      reject(err);
    }
  });
}
app.whenReady().then(async () => {
  if (isDev) {
    startBackendDev();
    createWindow();
  } else {
    try {
      console.log("Starting backend...");
      await startBackendProd(); // Await backend startup
      console.log("Backend started successfully.");
      createWindow(); // Create the Electron window after backend is ready
    } catch (error) {
      console.error("Failed to start backend:", error);
      app.quit(); // Quit the app if the backend fails to start
    }
  }
});

app.on("window-all-closed", () => {
  app.quit();
});
