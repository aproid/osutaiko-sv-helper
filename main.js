const { app, shell, dialog, ipcMain, BrowserWindow } = require('electron');
const moment = require('moment');
const path = require('path');
const fs = require('fs');

const __DEV__ = process.env.NODE_ENV === 'development';

class Regex {
	static TIME = /^([\d]{2})\:([\d]{2})\:([\d]{3})/;
	static NEWLINE = /\r?\n/;
}

class Beatmap {
	static TIMING_POINTS_TAG = '[TimingPoints]';
	static HIT_OBJECTS_TAG = '[HitObjects]';

	constructor(path) {
		this.path = path;

		this.rawString = fs.readFileSync(path).toString();

		this.parse();
	}

	write() {
		fs.writeFileSync(this.path, this.rawString);
	}

	parse() {
		this.parseHitObjects();
		this.parseTimingObjects();
	}

	parseHitObjects() {
		let hitObjects;
		let hitObjectRaw = this.rawString.split(this.constructor.HIT_OBJECTS_TAG).pop();
		let hitObjectStartIndex = this.rawString.indexOf(this.constructor.HIT_OBJECTS_TAG) + this.constructor.HIT_OBJECTS_TAG.length;
		let hitObjectLength = hitObjectRaw.indexOf('[');

		hitObjectRaw = hitObjectRaw.slice(0, hitObjectLength < 0 ? undefined : hitObjectLength);
		hitObjectRaw = hitObjectRaw.split(Regex.NEWLINE);

		hitObjects = hitObjectRaw.reduce((accumulator, hitObject) => {
			const hitObjectArray = hitObject.trim().split(',');

			if(hitObjectArray.length >= 6)
				accumulator.push(HitObject.fromArray(hitObjectArray));

			return accumulator;
		}, []);

		this.hitObjects = hitObjects;
		this.hitObjectStartIndex = hitObjectStartIndex;
		this.hitObjectEndIndex = hitObjectStartIndex + hitObjectLength;
	}

	parseTimingObjects() {
		let timingPoints;
		let timingPointRaw = this.rawString.split(this.constructor.TIMING_POINTS_TAG).pop();
		let timingPointStartIndex = this.rawString.indexOf(this.constructor.TIMING_POINTS_TAG) + this.constructor.TIMING_POINTS_TAG.length;
		let timingPointLength = timingPointRaw.indexOf('[');

		timingPointRaw = timingPointRaw.slice(0, timingPointLength < 0 ? undefined : timingPointLength);
		timingPointRaw = timingPointRaw.split(Regex.NEWLINE);

		timingPoints = timingPointRaw.reduce((accumulator, timingPoint) => {
			const timingPointArray = timingPoint.trim().split(',');

			if(timingPointArray.length >= 8)
				accumulator.push(TimingPoint.fromArray(timingPointArray));

			return accumulator;
		}, []);

		this.timingPoints = timingPoints;
		this.timingPointStartIndex = timingPointStartIndex;
		this.timingPointEndIndex = timingPointStartIndex + timingPointLength;
	}
	
	appendTimingPoints(timingPoints) {
		for(let i in timingPoints) {
			this.appendTimingPoint(timingPoints[i], false);
		}

		this.parse();
	}

	appendTimingPoint(timingPoint, reload=true) {
		this.rawString = this.rawString.replace(this.constructor.TIMING_POINTS_TAG, `${this.constructor.TIMING_POINTS_TAG}\r\n${timingPoint.toString()}`);

		if(reload)
			this.parse();
	}

	replaceTimingPoints(timingPoints) {
		const serializedTimingPoints = timingPoints.map(t => t.toString()).join('\r\n');

		this.rawString = this.rawString.slice(0, this.timingPointStartIndex) + `\r\n${serializedTimingPoints}\r\n\r\n` + this.rawString.slice(this.timingPointEndIndex);

		this.parse();
	}

	backup() {
		const backupBaseName = path.parse(this.path).name;
		const backupName = moment().format('YYYY_MM_DD_HH_mm_ss_SSS') + '.osu';

		const backupPath = getBackupPath(backupBaseName);

		fs.writeFileSync(`${backupPath}\\${backupName}`, this.rawString);
	}
}

class TimingPoint {
	constructor(time=0, beatLength=-100, meter=4, sampleSet=1, sampleIndex=0, volume=100, uninherited=0, effects=0) {
		this.time = time;
		this.beatLength = beatLength;
		this.meter = meter;
		this.sampleSet = sampleSet;
		this.sampleIndex = sampleIndex;
		this.volume = volume;
		this.uninherited = uninherited;
		this.effects = effects;
	}

	static fromArray(arr) {
		const instance = new this;

		instance.time = parseIntSafely(arr[0]);
		instance.beatLength = parseFloatSafely(arr[1]);
		instance.meter = parseIntSafely(arr[2]);
		instance.sampleSet = parseIntSafely(arr[3]);
		instance.sampleIndex = parseIntSafely(arr[4]);
		instance.volume = parseIntSafely(arr[5]);
		instance.uninherited = parseIntSafely(arr[6]);
		instance.effects = parseIntSafely(arr[7]);

		return instance;
	}

	toString() {
		return [
			this.time,
			this.beatLength.toFixed(13),
			this.meter,
			this.sampleSet,
			this.sampleIndex,
			this.volume,
			this.uninherited,
			this.effects
		].join(',');
	}
}

class HitObject {
	constructor(x=256, y=192, time=0, type=1, hitSound=0, extra='0:0:0:0:') {
		this.x = x;
		this.y = y;
		this.time = time;
		this.type = type;
		this.hitSound = hitSound;
		this.extra = extra;
	}

	static fromArray(arr) {
		const instance = new this;

		instance.x = parseIntSafely(arr[0]);
		instance.y = parseIntSafely(arr[1]);
		instance.time = parseIntSafely(arr[2]);
		instance.type = parseIntSafely(arr[3]);
		instance.hitSound = parseIntSafely(arr[4]);
		instance.extra = arr.slice(4).join(',');

		return instance;
	}

	toString() {
		return [
			this.x,
			this.y,
			this.time,
			this.type,
			this.hitSound,
			this.extra
		].join(',');
	}

	isNote()	{ return this.type === 0 || this.type === 5 }
	isSlider()	{ return this.type === 2 || this.type === 6 }
	isKat()		{ return this.type === 2 || this.type === 6 || this.type === 8 || this.type === 12 }
	isDon()		{ return this.type === 0 || this.type === 4 }
	isBigNote()	{ return this.type === 4 || this.type === 6 || this.type === 12 }
}

app.whenReady().then(() => {
	createWindow();
	
	app.on('activate', () => {
		if(BrowserWindow.getAllWindows().length === 0)
			createWindow()
	});
});

app.on('window-all-closed', () => {
	if(process.platform !== 'darwin')
		app.quit()
});

function createWindow() {
	const win = new BrowserWindow({
		width: 400,
		height: 438,
		maximizable: false,
		fullscreenable: false,
		resizable: false,
		frame: false,
		icon: path.join(__dirname, 'icon.ico'),
		webPreferences: {
			nativeWindowOpen: true,
			preload: path.join(__dirname, 'preload.js')
		}
	});

	initalizeWindow(win);
}

function initalizeWindow(win) {
	win.loadFile('index.html');

	ipcMain.on('main:close', () => {
		win.close()
	});

	ipcMain.on('main:file', (e) => {
		const filePaths = dialog.showOpenDialogSync(win, {
			properties: ['openFile'],
			filters: [
				{ name: 'osu! Beatmap', extensions: ['osu'] }
			]
		});

		if(filePaths && filePaths.length > 0) {
			const filePath = filePaths[0];

			e.returnValue = {
				path: filePath,
				name: path.basename(filePath)
			};
		} else {
			e.returnValue = null;
		}
	});

	ipcMain.on('main:apply', (e, data) => {
		let beatmap;

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
			showMessageBox('error', 'Empty input field found', 'You should enter the value to all input fields');
			return;
		}

		try {
			startPointTime = parseTimeSafely(startPointTime);
			startPointVelocity = parseFloatSafely(startPointVelocity);
			startPointVolume = parseIntSafely(startPointVolume);

			endPointTime = parseTimeSafely(endPointTime);
			endPointVelocity = parseFloatSafely(endPointVelocity);
			endPointVolume = parseIntSafely(endPointVolume);
		} catch(e) {
			showMessageBox('error', 'Invalid value for input fields', 'You should enter the valid value to all input fields');
			return;
		}

		try {
			beatmap = new Beatmap(beatmapPath);
		} catch(e) {
			showMessageBox('error', 'Failed to read beatmap file', 'Couldn\'t read your beatmap file');
			return;
		}

		if(optionBackup) {
			try {
				beatmap.backup();
			} catch(e) {
				showMessageBox('error', 'Failed to write backup file', 'Couldn\'t write your backup file');
				throw e;
				return;
			}
		}

		try {
			const timingPoints = [];
			
			if(optionDense) {
				for(let i = startPointTime; i <= endPointTime; i++) {
					if(i === startPointTime && !startTimeInclude) continue;
					if(i === endPointTime && !endTimeInclude) continue;

					const velocity = -100 / getTimeInterpolatedValue(i, startPointTime, endPointTime, startPointVelocity, endPointVelocity);
					const volume = Math.round(getTimeInterpolatedValue(i, startPointTime, endPointTime, startPointVolume, endPointVolume));

					const timingPoint = new TimingPoint;
					timingPoint.time = i + (optionOffset ? -10 : 0);
					timingPoint.volume = volume;
					timingPoint.beatLength = velocity;
					timingPoint.effects = optionKiai ? 1 : 0;
					timingPoints.push(timingPoint);
				}
			} else {
				const hitObjects = beatmap.hitObjects.filter(ho => startPointTime <= ho.time && ho.time <= endPointTime);

				for(let i in hitObjects) {
					const hitObject = hitObjects[i];

					if(hitObject.time === startPointTime && !startTimeInclude) continue;
					if(hitObject.time === endPointTime && !endTimeInclude) continue;

					const velocity = -100 / getTimeInterpolatedValue(hitObject.time, startPointTime, endPointTime, startPointVelocity, endPointVelocity);
					const volume = Math.round(getTimeInterpolatedValue(hitObject.time, startPointTime, endPointTime, startPointVolume, endPointVolume));

					const timingPoint = new TimingPoint;
					timingPoint.time = hitObject.time + (optionOffset ? -10 : 0);
					timingPoint.volume = volume;
					timingPoint.beatLength = velocity;
					timingPoint.effects = optionKiai ? 1 : 0;
					timingPoints.push(timingPoint);
				}
			}

			beatmap.appendTimingPoints(timingPoints);
			beatmap.write();
		} catch(e) {
			showMessageBox('error', 'Failed to write beatmap file', 'Couldn\'t write your beatmap file');
			throw e;
			return;
		}

		showMessageBox('info', 'Successfully Applied', 'Don\'t forget to press CTRL + L in map editor to reload');
	});

	ipcMain.on('main:remove', (e, data) => {
		let beatmap;

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
			showMessageBox('error', 'Empty time field found', 'You should enter the value to time field at least');
			return;
		}

		try {
			startPointTime = parseTimeSafely(startPointTime);
			endPointTime = parseTimeSafely(endPointTime);
		} catch(e) {
			showMessageBox('error', 'Invalid value for time fields', 'You should enter the valid value to time fields');
			return;
		}

		try {
			beatmap = new Beatmap(beatmapPath);
		} catch(e) {
			showMessageBox('error', 'Failed to read beatmap file', 'Couldn\'t read your beatmap file');
			return;
		}

		if(optionBackup) {
			try {
				beatmap.backup();
			} catch(e) {
				showMessageBox('error', 'Failed to write backup file', 'Couldn\'t write your backup file');
				throw e;
				return;
			}
		}

		try {
			if(optionOffset) {
				startPointTime -= 10;
				endPointTime -= 10;
			}

			const timingPoints = beatmap.timingPoints.filter(tp => {
				return !(startPointTime <= tp.time && tp.time <= endPointTime)
					|| (!startTimeInclude && tp.time === startPointTime)
					|| (!endTimeInclude && tp.time === endPointTime);
			});

			beatmap.replaceTimingPoints(timingPoints);
			beatmap.write();
		} catch(e) {
			showMessageBox('error', 'Failed to write beatmap file', 'Couldn\'t write your beatmap file');
			throw e;
			return;
		}

		showMessageBox('info', 'Successfully Applied', 'Don\'t forget to press CTRL + L in map editor to reload');
	});

	ipcMain.on('main:backup', () => {
		const backupPath = getBackupPath();

		shell.openPath(backupPath);
	});
}

function showMessageBox(type, heading, message) {
	dialog.showMessageBox({
		title: 'osu!taiko SV Helper',
		type: type,
		message: heading,
		detail: message
	});
}

function getBackupPath(beatmapName) {
	const backupPath = path.join(__DEV__ ? __dirname : process.env.PORTABLE_EXECUTABLE_DIR, 'Backup');

	if(!fs.existsSync(backupPath))
		fs.mkdirSync(backupPath);

	if(beatmapName !== undefined && beatmapName !== '') {
		const childPath = `${backupPath}\\${beatmapName}`;

		if(!fs.existsSync(childPath))
			fs.mkdirSync(childPath);

		return childPath;
	}

	return backupPath;
}

function getTimeInterpolatedValue(cTime, sTime, eTime, sValue, eValue) {
	return (((cTime - sTime) / (eTime - sTime) * (eValue - sValue)) + sValue);
}

function parseTimeSafely(time) {
	let cTime;

	if(Regex.TIME.test(time)) {
		cTime = timeToMillisecond(time);
	} else {
		cTime = parseInt(time);
	}

	if(Number.isNaN(cTime))
		throw new TypeError;

	return cTime;
}

function parseIntSafely(value) {
	let cValue = parseInt(value, 10);

	if(Number.isNaN(cValue))
		throw new TypeError;

	return cValue;
}

function parseFloatSafely(value) {
	let cValue = parseFloat(value);

	if(Number.isNaN(cValue))
		throw new TypeError;

	return cValue;
}

function timeToMillisecond(time) {
	const matches = time.match(Regex.TIME);
	const [_, m, s, ms] = matches.map(v => parseInt(v));

	return ms + s * 1000 + m * 1000 * 60;
}