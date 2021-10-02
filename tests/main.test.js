const { app, shell, dialog, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const { BeatmapManipulater } = require('../src/beatmap');
const { timeToMillisecond } = require('../src/type');

const mockBrowserWindowLoadFile = jest.fn();
const mockBrowserWindowClose = jest.fn();
const mockBrowserSetBounds = jest.fn();

jest.mock('electron', () => ({
	app: {
		quit: jest.fn(),
		on: jest.fn().mockImplementation((eventName, eventCallback) => {
			eventCallback();
		})
	},
	shell: {
		openPath: jest.fn()
	},
	dialog: {
		showOpenDialogSync: jest.fn(),
		showMessageBox: jest.fn()
	},
	ipcMain: {
		on: jest.fn()
	},
	BrowserWindow: jest.fn().mockImplementation(() => ({
		loadFile: mockBrowserWindowLoadFile,
		close: mockBrowserWindowClose,
		setBounds: mockBrowserSetBounds
	}))
}));

const mockBeatmapManipulaterOverwrite = jest.fn();
const mockBeatmapManipulaterModify = jest.fn();
const mockBeatmapManipulaterRemove = jest.fn();
const mockBeatmapManipulaterBackup = jest.fn();

jest.mock('../src/beatmap', () => ({
	BeatmapManipulater: jest.fn().mockImplementation(() => ({
		overwrite: mockBeatmapManipulaterOverwrite,
		modify: mockBeatmapManipulaterModify,
		remove: mockBeatmapManipulaterRemove,
		backup: mockBeatmapManipulaterBackup,
	}))
}));

BeatmapManipulater.getBackupPath = jest.fn();

describe('Main Process Unit Test', () => {
	let main;

	beforeAll(() => {
		main = require('../main').default;
	});

	test('Window Initalize', () => {
		expect(BrowserWindow.mock.instances.length).toBe(1);

		expect(mockBrowserWindowLoadFile).toHaveBeenCalledWith('index.html');
	});

	test('IPC Listener Initalize', () => {
		expect(ipcMain.on.mock.calls.map(v => v[0])).toEqual(expect.arrayContaining([
			'main:file',
			'main:overwrite',
			'main:remove',
			'main:backup',
			'main:close'
		]));
	});

	test('Show File Dialog', () => {
		const mockEvent = {};
		const mockPath = path.join(__dirname, 'beatmap.template.osu');

		dialog.showOpenDialogSync.mockReturnValueOnce([ path.join(__dirname, 'beatmap.template.osu') ]);

		main.onTriggerFileDialog(mockEvent);

		expect(mockEvent.returnValue).toEqual({
			path: mockPath,
			name: path.basename(mockPath)
		});

		main.onTriggerFileDialog(mockEvent);

		expect(mockEvent.returnValue).toBeNull();
	});

	test('Show Message Box', () => {
		expect(main.showMessageBox('info', '', '')).toBe('info');
		expect(main.showMessageBox('error', '', '')).toBe('error');

		expect(dialog.showMessageBox).toHaveBeenCalled();
	});

	test('Overwrite', () => {
		const mockEvent = {};

		let fulfilledParameter;

		matrix((p) => {
			const isFulfilled = !!p.beatmapPath && !!p.startPointTime && !!p.endPointTime
								&& (p.optionIgnoreVelocity || (!!p.startPointVelocity && !!p.endPointVelocity))
								&& (p.optionIgnoreVolume || (!!p.startPointVolume && !!p.endPointVolume));

			if(isFulfilled) {
				if(!fulfilledParameter && p.optionBackup)
					fulfilledParameter = JSON.parse(JSON.stringify(p));

				expect(main.onClickOverwrite(mockEvent, p)).toBe(undefined);

				expect(mockBeatmapManipulaterOverwrite).toHaveBeenLastCalledWith(
					timeToMillisecond(p.startPointTime),
					timeToMillisecond(p.endPointTime),
					expect.objectContaining({
						startVelocity: parseFloat(p.startPointVelocity),
						startVolume: parseInt(p.startPointVolume),
						endVelocity: parseFloat(p.endPointVelocity),
						endVolume: parseInt(p.endPointVolume),
						includingStartTime: p.startTimeInclude,
						includingEndTime: p.endTimeInclude,
						isKiai: p.optionKiai,
						isDense: p.optionDense,
						isOffset: p.optionOffset,
						isIgnoreVelocity: p.optionIgnoreVelocity,
						isIgnoreVolume: p.optionIgnoreVolume,
						isExponential: p.optionExponential,
						isBackup: p.optionBackup
					})
				);
			} else {
				expect(main.onClickOverwrite(mockEvent, p)).toBe('error');
			}
		});

		matrixThrow((p) => {
			expect(main.onClickOverwrite(mockEvent, p)).toBe('error');
		});

		BeatmapManipulater.mockClear();
		BeatmapManipulater.mockImplementationOnce(() => { throw new Error() });

		expect(main.onClickOverwrite(mockEvent, fulfilledParameter)).toBe('error');

		mockBeatmapManipulaterBackup.mockClear();
		mockBeatmapManipulaterBackup.mockImplementationOnce(() => { throw new Error() });

		expect(main.onClickOverwrite(mockEvent, fulfilledParameter)).toBe('error');

		mockBeatmapManipulaterOverwrite.mockClear();
		mockBeatmapManipulaterOverwrite.mockImplementationOnce(() => { throw new Error() });

		expect(main.onClickOverwrite(mockEvent, fulfilledParameter)).toBe('error');
	});

	test('Modify', () => {
		const mockEvent = {};

		let fulfilledParameter;

		matrix((p) => {
			const isFulfilled = !!p.beatmapPath && !!p.startPointTime && !!p.endPointTime
								&& (p.optionIgnoreVelocity || (!!p.startPointVelocity && !!p.endPointVelocity))
								&& (p.optionIgnoreVolume || (!!p.startPointVolume && !!p.endPointVolume));

			if(isFulfilled) {
				if(!fulfilledParameter && p.optionBackup)
					fulfilledParameter = JSON.parse(JSON.stringify(p));

				expect(main.onClickModify(mockEvent, p)).toBe(undefined);
				
				expect(mockBeatmapManipulaterModify).toHaveBeenLastCalledWith(
					timeToMillisecond(p.startPointTime),
					timeToMillisecond(p.endPointTime),
					expect.objectContaining({
						startVelocity: parseFloat(p.startPointVelocity),
						startVolume: parseInt(p.startPointVolume),
						endVelocity: parseFloat(p.endPointVelocity),
						endVolume: parseInt(p.endPointVolume),
						includingStartTime: p.startTimeInclude,
						includingEndTime: p.endTimeInclude,
						isKiai: p.optionKiai,
						isOffset: p.optionOffset,
						isIgnoreVelocity: p.optionIgnoreVelocity,
						isIgnoreVolume: p.optionIgnoreVolume,
						isExponential: p.optionExponential,
						isBackup: p.optionBackup
					})
				);
			} else {
				expect(main.onClickModify(mockEvent, p)).toBe('error');
			}
		});

		matrixThrow((p) => {
			expect(main.onClickModify(mockEvent, p)).toBe('error');
		});

		BeatmapManipulater.mockClear();
		BeatmapManipulater.mockImplementationOnce(() => { throw new Error() });

		expect(main.onClickModify(mockEvent, fulfilledParameter)).toBe('error');

		mockBeatmapManipulaterBackup.mockClear();
		mockBeatmapManipulaterBackup.mockImplementationOnce(() => { throw new Error() });

		expect(main.onClickModify(mockEvent, fulfilledParameter)).toBe('error');

		mockBeatmapManipulaterModify.mockClear();
		mockBeatmapManipulaterModify.mockImplementationOnce(() => { throw new Error() });

		expect(main.onClickModify(mockEvent, fulfilledParameter)).toBe('error');
	});

	test('Remove', () => {
		const mockEvent = {};

		let fulfilledParameter;

		matrix((p) => {
			const isFulfilled = !!p.beatmapPath && !!p.startPointTime && !!p.endPointTime;

			if(isFulfilled) {
				if(!fulfilledParameter && p.optionBackup)
					fulfilledParameter = JSON.parse(JSON.stringify(p));

				expect(main.onClickRemove(mockEvent, p)).toBe(undefined);
				
				expect(mockBeatmapManipulaterRemove).toHaveBeenLastCalledWith(
					timeToMillisecond(p.startPointTime),
					timeToMillisecond(p.endPointTime),
					expect.objectContaining({
						includingStartTime: p.startTimeInclude,
						includingEndTime: p.endTimeInclude,
						isOffset: p.optionOffset,
						isOffsetPrecise: p.optionOffsetPrecise,
						isBackup: p.optionBackup
					})
				);
			} else {
				expect(main.onClickRemove(mockEvent, p)).toBe('error');
			}
		});

		matrixThrow((p) => {
			if(!p.beatmapPath || !timeToMillisecond(p.startPointTime) || !timeToMillisecond(p.endPointTime))
				expect(main.onClickRemove(mockEvent, p)).toBe('error');
		});

		BeatmapManipulater.mockClear();
		BeatmapManipulater.mockImplementationOnce(() => { throw new Error() });

		expect(main.onClickRemove(mockEvent, fulfilledParameter)).toBe('error');

		mockBeatmapManipulaterBackup.mockClear();
		mockBeatmapManipulaterBackup.mockImplementationOnce(() => { throw new Error() });

		expect(main.onClickRemove(mockEvent, fulfilledParameter)).toBe('error');

		mockBeatmapManipulaterRemove.mockClear();
		mockBeatmapManipulaterRemove.mockImplementationOnce(() => { throw new Error() });

		expect(main.onClickRemove(mockEvent, fulfilledParameter)).toBe('error');
	});

	test('Backup', () => {
		main.onClickBackup();

		expect(shell.openPath).toHaveBeenCalled();
	});

	test('Mode Trigger', () => {
		main.onBasicModeTrigger();

		expect(mockBrowserSetBounds).toHaveBeenCalled();

		mockBrowserSetBounds.mockClear();

		main.onAdvancedModeTrigger();

		expect(mockBrowserSetBounds).toHaveBeenCalled();
	});

	test('Close', () => {
		main.onClose();

		expect(mockBrowserWindowClose).toHaveBeenCalled();
	});
});

function matrix(cb) {
	const cases = {
		beatmapPath: [ undefined, path.join(__dirname, 'beatmap.template.osu') ],
		startPointTime: [ '', '00:00:100' ],
		startPointVelocity: [ '', '1.0' ],
		startPointVolume: [ '', '100' ],
		startTimeInclude: [ true, false ],
		endPointTime: [ '', '00:01:000' ],
		endPointVelocity: [ '', '2.0' ],
		endPointVolume: [ '', '50' ],
		endTimeInclude: [ true, false ],
		optionKiai: [ false, true ],
		optionDense: [ false, true ],
		optionOffset: [ false, true ],
		optionIgnoreVelocity: [ false, true ],
		optionIgnoreVolume: [ false, true ],
		optionExponential: [ false, true ],
		optionBackup: [ true, false ]
	};

	const caseKeys = Object.keys(cases);
	const caseLength = caseKeys.length;

	const reducer = (index) => (acc, key) => {
		acc[key] = cases[key][index];

		return acc;
	};

	for(let i = 0; i < caseLength; i++) {
		const parameter = caseKeys.reduce(reducer(0), {});

		if(i === 0) {
			cb(parameter);
		}

		for(let j = 0; j < caseLength; j++) {
			if(i === j)
				continue;

			parameter[caseKeys[j]] = cases[caseKeys[j]][1];

			cb(parameter);
		}

		if(i === caseLength - 1) {
			cb(caseKeys.reduce(reducer(1), {}));
		}
	}
}

function matrixThrow(cb) {
	const cases = {
		beatmapPath: path.join(__dirname, 'beatmap.template.osu'),
		startPointTime: '00:00:100',
		startPointVelocity: '1.0',
		startPointVolume: '100',
		endPointTime: '00:01:000',
		endPointVelocity: '2.0',
		endPointVolume: '50'
	};

	for(let i in cases) {
		const parameter = JSON.parse(JSON.stringify(cases));

		if(i === 'beatmapPath')
			parameter[i] = undefined;
		else
			parameter[i] = 'Test';

		cb(parameter);
	}
}