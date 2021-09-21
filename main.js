const { app, shell, dialog, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const { __DEV__, __TEST__ } = require('./src/env');
const { Beatmap, BeatmapManipulater, TimingPoint } = require('./src/beatmap');
const { parseIntSafely, parseFloatSafely, parseTimeSafely } = require('./src/type');

class Main {
	constructor() {
		this.win = new BrowserWindow({
			width: 400,
			height: 438,
			maximizable: false,
			fullscreenable: false,
			resizable: false,
			frame: false,
			icon: path.join(__dirname, '/img/icon.ico'),
			webPreferences: {
				contextIsolation: false,
				enableRemoteModule: true,
				nodeIntegration: true,
				nativeWindowOpen: true,
				preload: path.join(__dirname, '/preload.js')
			}
		});

		this.win.loadFile('index.html');

		ipcMain.on('main:file', this.onTriggerFileDialog);
		ipcMain.on('main:apply', this.onClickOverwrite);
		ipcMain.on('main:remove', this.onClickRemove);
		ipcMain.on('main:backup', this.onClickBackup);
		ipcMain.on('main:close', this.onClose);
	}

	onTriggerFileDialog(e) {
		const filePaths = dialog.showOpenDialogSync(this.win, {
			properties: [ 'openFile' ],
			filters: [
				{ name: 'osu! Beatmap', extensions: [ 'osu' ] }
			]
		});

		if(filePaths && filePaths.length > 0) {
			const filePath = filePaths[0];

			return e.returnValue = {
				path: filePath,
				name: path.basename(filePath)
			};
		}

		e.returnValue = null;
	}

	onClickOverwrite() {
		let beatmapManipulater;

		let {
			beatmapPath,
			startPointTime,
			startPointVelocity,
			startPointVolume,
			startTimeInclude,
			endPointTime,
			endPointVelocity,
			endPointVolume,
			endTimeInclude,
			optionKiai,
			optionDense,
			optionOffset,
			optionBackup
		} = data;

		if(beatmapPath === undefined || beatmapPath === ''
		|| startPointTime === undefined || startPointTime === ''
		|| startPointVelocity === undefined || startPointVelocity === ''
		|| startPointVolume === undefined || startPointVolume === ''
		|| endPointTime === undefined || endPointTime === ''
		|| endPointVelocity === undefined || endPointVelocity === ''
		|| endPointVolume === undefined || endPointVolume === '') {
			return this.showMessageBox('error', 'Empty input field found', 'You should enter the value to all input fields');
		}

		try {
			startPointTime = parseTimeSafely(startPointTime);
			startPointVelocity = parseFloatSafely(startPointVelocity);
			startPointVolume = parseIntSafely(startPointVolume);

			endPointTime = parseTimeSafely(endPointTime);
			endPointVelocity = parseFloatSafely(endPointVelocity);
			endPointVolume = parseIntSafely(endPointVolume);
		} catch(err) {
			return this.showMessageBox('error', 'Invalid value for input fields', 'You should enter the valid value to all input fields');
		}

		try {
			beatmapManipulater = new beatmapManipulater(beatmapPath);
		} catch(err) {
			return this.showMessageBox('error', 'Failed to read beatmap file', 'Couldn\'t read your beatmap file');
		}

		if(optionBackup) {
			try {
				beatmapManipulater.backup();
			} catch(err) {
				return this.showMessageBox('error', 'Failed to write backup file', 'Couldn\'t write your backup file');
			}
		}

		try {
			beatmapManipulater.overwrite(startPointTime, endPointTime, {
				startVelocity: startPointVelocity,
				startVolume: startPointVolume,
				endVelocity: endPointVelocity,
				endVolume: endPointVolume,
				includingStartTime: startTimeInclude,
				includingEndTime: endTimeInclude,
				isKiai: optionKiai,
				isDense: optionDense,
				isOffset: optionOffset,
				isBackup: optionBackup
			});
		} catch(err) {
			return this.showMessageBox('error', 'Failed to write beatmap file', 'Couldn\'t write your beatmap file');
		}

		this.showMessageBox('info', 'Successfully Applied', 'Don\'t forget to press CTRL + L in map editor to reload');
	}

	onClickRemove() {
		let beatmapManipulater;

		let {
			beatmapPath,
			startPointTime,
			startTimeInclude,
			endPointTime,
			endTimeInclude,
			optionOffset,
			optionBackup
		} = data;

		if(beatmapPath === undefined || beatmapPath === ''
		|| startPointTime === undefined || startPointTime === ''
		|| endPointTime === undefined || endPointTime === '') {
			return this.showMessageBox('error', 'Empty time field found', 'You should enter the value to time field at least');
		}

		try {
			startPointTime = parseTimeSafely(startPointTime);
			endPointTime = parseTimeSafely(endPointTime);
		} catch(err) {
			return this.showMessageBox('error', 'Invalid value for time fields', 'You should enter the valid value to time fields');
		}

		try {
			beatmapManipulater = new beatmapManipulater(beatmapPath);
		} catch(err) {
			return this.showMessageBox('error', 'Failed to read beatmap file', 'Couldn\'t read your beatmap file');
		}

		if(optionBackup) {
			try {
				beatmapManipulater.backup();
			} catch(err) {
				return this.showMessageBox('error', 'Failed to write backup file', 'Couldn\'t write your backup file');
			}
		}

		try {
			beatmapManipulater.remove(startPointTime, endPointTime, {
				includingStartTime: startTimeInclude,
				includingEndTime: endTimeInclude,
				isOffset: optionOffset,
				isBackup: optionBackup
			});
		} catch(err) {
			return this.showMessageBox('error', 'Failed to write beatmap file', 'Couldn\'t write your beatmap file');
		}

		this.showMessageBox('info', 'Successfully Applied', 'Don\'t forget to press CTRL + L in map editor to reload');
	}

	onClickBackup() {
		shell.openPath(BeatmapManipulater.getBackupPath());
	}

	onClose() {
		this.win.close();
	}

	showMessageBox(type, heading, message) {
		if(!__TEST__) {
			dialog.showMessageBox({
				title: 'osu!taiko SV Helper',
				type: type,
				message: heading,
				detail: message
			});
		}
	}
}

function createInstance() {
	const main = new Main();

	return main;
}

app.whenReady().then(() => {
	createInstance();
	
	app.on('activate', () => {
		if(BrowserWindow.getAllWindows().length === 0)
			createInstance();
	});
});

app.on('window-all-closed', () => {
	if(process.platform !== 'darwin')
		app.quit()
});