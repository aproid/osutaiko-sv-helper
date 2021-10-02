const { app, shell, dialog, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const { __DEV__, __TEST__ } = require('./src/env');
const { BeatmapManipulater } = require('./src/beatmap');
const { parseIntSafely, parseFloatSafely, parseTimeSafely } = require('./src/type');

class Main {
	constructor() {
		this.win = new BrowserWindow({
			width: 404,
			height: 520,
			maximizable: false,
			fullscreenable: false,
			resizable: false,
			frame: false,
			icon: path.join(__dirname, '/icon.ico'),
			webPreferences: {
				contextIsolation: false,
				enableRemoteModule: true,
				nodeIntegration: true,
				nativeWindowOpen: true,
				preload: path.join(__dirname, '/preload.js')
			}
		});

		this.win.loadFile('index.html');
		
		ipcMain.on('main:file', this.onTriggerFileDialog.bind(this));
		ipcMain.on('main:overwrite', this.onClickOverwrite.bind(this));
		ipcMain.on('main:modify', this.onClickModify.bind(this));
		ipcMain.on('main:remove', this.onClickRemove.bind(this));
		ipcMain.on('main:backup', this.onClickBackup.bind(this));
		ipcMain.on('main:basic', this.onBasicModeTrigger.bind(this));
		ipcMain.on('main:advanced', this.onAdvancedModeTrigger.bind(this));
		ipcMain.on('main:close', this.onClose.bind(this));
	}

	showMessageBox(type, heading, message) {
		dialog.showMessageBox({
			title: 'osu!taiko SV Helper',
			type: type,
			message: heading,
			detail: message
		});

		return type;
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

	onClickOverwrite(e, datas) {
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
			optionOffsetPrecise,
			optionExponential,
			optionIgnoreVelocity,
			optionIgnoreVolume,
			optionBackup
		} = datas;

		if(beatmapPath === undefined || beatmapPath === ''
		|| startPointTime === undefined || startPointTime === ''
		|| endPointTime === undefined || endPointTime === ''
		|| (optionIgnoreVelocity === false && (startPointVelocity === undefined || startPointVelocity === ''))
		|| (optionIgnoreVelocity === false && (endPointVelocity === undefined || endPointVelocity === ''))
		|| (optionIgnoreVolume === false && (startPointVolume === undefined || startPointVolume === ''))
		|| (optionIgnoreVolume === false && (endPointVolume === undefined || endPointVolume === ''))) {
			return this.showMessageBox('error', 'Empty input field found', 'You should enter the value to all input fields');
		}

		try {
			startPointTime = parseTimeSafely(startPointTime);
			startPointVelocity = optionIgnoreVelocity ? parseFloat(startPointVelocity) : parseFloatSafely(startPointVelocity);
			startPointVolume = optionIgnoreVolume ? parseInt(startPointVolume) : parseIntSafely(startPointVolume);

			endPointTime = parseTimeSafely(endPointTime);
			endPointVelocity = optionIgnoreVelocity ? parseFloat(endPointVelocity) : parseFloatSafely(endPointVelocity);
			endPointVolume = optionIgnoreVolume ? parseInt(endPointVolume) : parseIntSafely(endPointVolume);
		} catch(err) {
			return this.showMessageBox('error', 'Invalid value for input fields', 'You should enter the valid value to all input fields');
		}

		try {
			beatmapManipulater = new BeatmapManipulater(beatmapPath);
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
				isOffsetPrecise: optionOffsetPrecise,
				isExponential: optionExponential,
				isIgnoreVelocity: optionIgnoreVelocity,
				isIgnoreVolume: optionIgnoreVolume,
				isBackup: optionBackup
			});
		} catch(err) {
			return this.showMessageBox('error', 'Failed to write beatmap file', 'Couldn\'t write your beatmap file');
		}

		this.showMessageBox('info', 'Successfully Applied', 'Don\'t forget to press CTRL + L in map editor to reload');
	}

	onClickModify(e, datas) {
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
			optionOffset,
			optionOffsetPrecise,
			optionExponential,
			optionIgnoreVelocity,
			optionIgnoreVolume,
			optionBackup
		} = datas;

		if(beatmapPath === undefined || beatmapPath === ''
		|| startPointTime === undefined || startPointTime === ''
		|| endPointTime === undefined || endPointTime === ''
		|| (optionIgnoreVelocity === false && (startPointVelocity === undefined || startPointVelocity === ''))
		|| (optionIgnoreVelocity === false && (endPointVelocity === undefined || endPointVelocity === ''))
		|| (optionIgnoreVolume === false && (startPointVolume === undefined || startPointVolume === ''))
		|| (optionIgnoreVolume === false && (endPointVolume === undefined || endPointVolume === ''))) {
			return this.showMessageBox('error', 'Empty input field found', 'You should enter the value to all input fields');
		}

		try {
			startPointTime = parseTimeSafely(startPointTime);
			startPointVelocity = optionIgnoreVelocity ? parseFloat(startPointVelocity) : parseFloatSafely(startPointVelocity);
			startPointVolume = optionIgnoreVolume ? parseInt(startPointVolume) : parseIntSafely(startPointVolume);

			endPointTime = parseTimeSafely(endPointTime);
			endPointVelocity = optionIgnoreVelocity ? parseFloat(endPointVelocity) : parseFloatSafely(endPointVelocity);
			endPointVolume = optionIgnoreVolume ? parseInt(endPointVolume) : parseIntSafely(endPointVolume);
		} catch(err) {
			return this.showMessageBox('error', 'Invalid value for input fields', 'You should enter the valid value to all input fields');
		}

		try {
			beatmapManipulater = new BeatmapManipulater(beatmapPath);
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
			beatmapManipulater.modify(startPointTime, endPointTime, {
				startVelocity: startPointVelocity,
				startVolume: startPointVolume,
				endVelocity: endPointVelocity,
				endVolume: endPointVolume,
				includingStartTime: startTimeInclude,
				includingEndTime: endTimeInclude,
				isKiai: optionKiai,
				isOffset: optionOffset,
				isOffsetPrecise: optionOffsetPrecise,
				isExponential: optionExponential,
				isIgnoreVelocity: optionIgnoreVelocity,
				isIgnoreVolume: optionIgnoreVolume,
				isBackup: optionBackup
			});
		} catch(err) {
			return this.showMessageBox('error', 'Failed to write beatmap file', 'Couldn\'t write your beatmap file');
		}

		this.showMessageBox('info', 'Successfully Applied', 'Don\'t forget to press CTRL + L in map editor to reload');
	}

	onClickRemove(e, datas) {
		let beatmapManipulater;

		let {
			beatmapPath,
			startPointTime,
			startTimeInclude,
			endPointTime,
			endTimeInclude,
			optionOffset,
			optionOffsetPrecise,
			optionBackup
		} = datas;

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
			beatmapManipulater = new BeatmapManipulater(beatmapPath);
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
				isOffsetPrecise: optionOffsetPrecise,
				isBackup: optionBackup
			});
		} catch(err) {
			return this.showMessageBox('error', 'Failed to write beatmap file', 'Couldn\'t write your beatmap file');
		}

		this.showMessageBox('info', 'Successfully Applied', 'Don\'t forget to press CTRL + L in map editor to reload');
	}

	onClickBackup(e) {
		shell.openPath(BeatmapManipulater.getBackupPath());
	}

	onBasicModeTrigger(e) {
		this.win.setBounds({ width: 404, height: 520 });
	}

	onAdvancedModeTrigger(e) {
		this.win.setBounds({ width: 404, height: 718 });
	}

	onClose(e) {
		this.win.close();
	}
}

let main;

app.on('ready', () => {
	main = new Main;
});

app.on('window-all-closed', () => {
	app.quit()
});

module.exports = {
	default: main
};