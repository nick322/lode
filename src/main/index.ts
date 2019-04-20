import '@lib/logger/main'

import { app, ipcMain, Menu } from 'electron'
import { ApplicationMenuOptions, buildDefaultMenu } from './menu'
import { Window } from './window'
import { LogLevel } from '@lib/logger/levels'
import { mergeEnvFromShell } from '@lib/process/shell'
import { state } from '@lib/state'
import { log as writeLog } from '@lib/logger'
import { autoUpdater } from 'electron-updater'

// Expose garbage collector
app.commandLine.appendSwitch('js-flags', '--expose_gc')

// Merge environment variables from shell, if needed.
mergeEnvFromShell()

// Set `__static` path to static files in production
if (process.env.NODE_ENV !== 'development') {
    (global as any).__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow: Window | null = null

function createWindow(projectId: string | null) {
    const window = new Window(projectId)

    window.onClose((event: any) => {
        if (window.isBusy()) {
            log.info('Window is busy. Attempting teardown of pending renderer processes.')
            event.preventDefault()
            window.send('close')
        }
    })

    window.onClosed(() => {
        mainWindow = null
        app.quit()
    })

    window.load()
    mainWindow = window
}

function buildMenu(options: ApplicationMenuOptions) {
    Menu.setApplicationMenu(buildDefaultMenu(options))
}

app
    .on('ready', () => {
        createWindow(state.getCurrentProject())
        buildMenu({})
    })
    .on('window-all-closed', () => {
        if (__DARWIN__) {
            app.quit()
        }
    })
    .on('activate', () => {
        if (mainWindow === null) {
            createWindow(state.getCurrentProject())
        }
    })

ipcMain
    .on('log', (event: Electron.IpcMessageEvent, level: LogLevel, message: string) => {
        // Write renderer messages to log, if they meet the level threshold.
        // We're using the main log function directly so that they are not
        // marked as being from the "main" process.
        writeLog(level, message)
    })
    .on('update-menu', (event: any, options: ApplicationMenuOptions) => {
        buildMenu(options)
    })
    .on('window-should-close', () => {
        process.nextTick(() => {
            if (mainWindow) {
                mainWindow.close()
            }
        })
    })
    .on('switch-project', (event: any, projectId: string) => {
        state.set('currentProject', projectId)
        if (mainWindow) {
            mainWindow.setProject(projectId)
            event.sender.send('project-switched', mainWindow.getProjectOptions())
        }
    })
    .on('reset-settings', (event: any) => {
        state.reset()
        event.returnValue = true
    })

/**
 * Auto Updater
 *
 */

autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall()
})

app.on('ready', () => {
    if (process.env.NODE_ENV === 'production') {
        autoUpdater.logger = log
        autoUpdater.checkForUpdates()

        autoUpdater.on('checking-for-update', () => {
        })

        autoUpdater.on('update-available', (info) => {
        })

        autoUpdater.on('update-not-available', (info) => {
        })

        autoUpdater.on('error', (err) => {
        })

        // autoUpdater.on('download-progress', (progressObj) => {
        // })

        autoUpdater.on('update-downloaded', (info) => {
            autoUpdater.quitAndInstall()
        })
    }
})
