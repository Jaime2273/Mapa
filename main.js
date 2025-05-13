const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const dataPath = path.join(app.getPath('userData'), 'townsData.json');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js'),
            worldSafeExecuteJavaScript: true
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

ipcMain.handle('load-towns', () => {
    try {
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf-8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('Error loading towns data:', error);
        return {};
    }
});

ipcMain.handle('save-towns', (event, towns) => {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(towns, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving towns data:', error);
        return false;
    }
});

ipcMain.handle('export-town-data', async (event, townName, data) => {
    try {
        const { filePath } = await dialog.showSaveDialog({
            title: 'Exportar datos del pueblo',
            defaultPath: `${townName}.json`,
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (filePath) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return { success: true, path: filePath };
        }
        return { success: false };
    } catch (error) {
        console.error('Error exporting town data:', error);
        return { success: false, error: error.message };
    }
});

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});