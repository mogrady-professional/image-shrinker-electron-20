// console.log('Hello World');
const path = require('path');
const os = require('os');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
// const slash = os.platform() === 'win32' ? '\\' : '/';
const slash = require('slash');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const log = require('electron-log');

// Set Enviroment
process.env.NODE_ENV = 'production'; // production or development
const isDev = process.env.NODE_ENV != 'production' ? true : false;
console.log('Development?', isDev);
console.log('OS-> ', process.platform); // Platform
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

let mainWindow;
let aboutWindow;

// https://www.electronjs.org/docs/latest/api/browser-window

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'ImageShrink',
    width: isDev ? 800 : 500,
    height: 600,
    icon: './assets/icons/Icon_256x256.png',
    resizable: isDev,
    backgroundColor: 'white',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  //   mainWindow.loadURL(`file://${__dirname}/app/index.html`); // load the index.html file
  mainWindow.loadFile('./app/index.html'); // best practice

  if (isDev) {
    mainWindow.webContents.openDevTools();
    console.log('Dev Tools Opened');
  }
}

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    width: 300,
    height: 300,
    icon: './assets/icons/Icon_256x256.png',
    resizable: false,
    backgroundColor: 'white',
  });

  //   mainWindow.loadURL(`file://${__dirname}/app/index.html`); // load the index.html file
  aboutWindow.loadFile('./app/about.html'); // best practice
}

// Call the function
app.on('ready', () => {
  createMainWindow();

  const mainMenu = Menu.buildFromTemplate(menu); // build the menu template
  Menu.setApplicationMenu(mainMenu); // set the menu

  mainWindow.on('close', () => (mainWindow = null));
});

const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: 'About',
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    role: 'fileMenu',
  },
  ...(!isMac
    ? [
        {
          label: 'Help',
          submenu: [
            {
              label: 'About',
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  ...(isDev
    ? [
        {
          label: 'Developer',
          submenu: [
            { role: 'reload' },
            { role: 'forcereload' },
            { type: 'separator' },
            { role: 'toggledevtools' },
          ],
        },
      ]
    : []),
];

// Use ipcMain to send messages to the renderer process
ipcMain.on('image:minimize', (e, options) => {
  console.log('Minimize Image');
  console.log(options);
  mainWindow.minimize();
  options.dest = path.join(os.homedir() + '/Desktop/', 'imageshrink'); // join the path with the name
  shrinkImage(options); // call the function
});

async function shrinkImage({ imgPath, quality, dest }) {
  try {
    const pngQuality = quality / 100;

    const files = await imagemin([slash(imgPath)], {
      destination: dest,
      plugins: [
        imageminMozjpeg({ quality }),
        imageminPngquant({
          quality: [pngQuality, pngQuality],
        }),
      ],
    });

    console.log(files);
    log.info(files);

    //     Changed from shell.openItem() for v9
    shell.openPath(dest); // open the folder
    console.log('Image Shrinked');

    mainWindow.webContents.send('image:done'); // send a message to the renderer process let it know it's done
  } catch (error) {
    console.log(error);
    log.error(error);
  }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
