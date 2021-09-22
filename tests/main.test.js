const { app, shell, dialog, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const { Main } = require('../main');
const { BeatmapManipulater } = require('../src/beatmap');
const { timeToMillisecond } = require('../src/type');

const mockBrowserWindowLoadFile = jest.fn();
const mockBrowserWindowClose = jest.fn();

jest.mock('electron', () => ({
	app: {

	},
	shell: {
		openPath: jest.fn()
	},
	dialog: {
		showOpenDialogSync: jest.fn().mockReturnValueOnce([require('path').join(__dirname, 'beatmap.template.osu')]),
		showMessageBox: jest.fn()
	},
	ipcMain: {
		on: jest.fn()
	},
	BrowserWindow: jest.fn().mockImplementation(() => ({
		loadFile: mockBrowserWindowLoadFile,
		close: mockBrowserWindowClose
	}))
}));

const mockBeatmapManipulaterOverwrite = jest.fn();
const mockBeatmapManipulaterRemove = jest.fn();
const mockBeatmapManipulaterBackup = jest.fn();

jest.mock('../src/beatmap', () => ({
	BeatmapManipulater: jest.fn().mockImplementation(() => ({
		overwrite: mockBeatmapManipulaterOverwrite,
		remove: mockBeatmapManipulaterRemove,
		backup: mockBeatmapManipulaterBackup,
	}))
}));

BeatmapManipulater.getBackupPath = jest.fn();

describe('Main Process Unit Test', () => {
	let main;

	function matrix(minimal, cb) {
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
			optionBackup: [ true, false ],
			optionIgnoreVelocity: [ false, true ],
			optionIgnoreVolume: [ false, true ]
		};

		const requiredFields = minimal ? ['beatmapPath', 'startPointTime', 'endPointTime']
									   : ['beatmapPath', 'startPointTime', 'startPointVelocity', 'startPointVolume', 'endPointTime', 'endPointVelocity', 'endPointVolume'];

		const testParameter = Object.keys(cases).reduce((acc, k) => {
			acc[k] = cases[k][0];

			return acc;
		}, {});

		for(let i in cases) {
			const fieldCases = cases[i];

			for(let j in fieldCases) {
				let isFulfilled = true;

				testParameter[i] = fieldCases[j];

				for(let k in testParameter) {
					if(requiredFields.includes(k) && (testParameter[k] === undefined || testParameter[k] === '')) {
						isFulfilled = false;
						break;
					}
				}

				cb(testParameter, isFulfilled);
			}
		}
	}

	test('Initialize', () => {
		main = new Main;

		expect(BrowserWindow.mock.instances.length).toBe(1);
		expect(mockBrowserWindowLoadFile).toHaveBeenCalledWith('index.html');
	});

	test('Listen IPC', () => {
		expect(ipcMain.on.mock.calls.map(v => v[0])).toEqual(expect.arrayContaining([
			'main:file',
			'main:overwrite',
			'main:remove',
			'main:backup',
			'main:close'
		]));
	});

	test('File Dialog', () => {
		const mockEvent = {};
		const mockPath = path.join(__dirname, 'beatmap.template.osu');

		main.onTriggerFileDialog(mockEvent);

		expect(mockEvent.returnValue).toEqual({
			path: mockPath,
			name: path.basename(mockPath)
		});

		main.onTriggerFileDialog(mockEvent);

		expect(mockEvent.returnValue).toBeNull();
	});

	test('Overwrite', () => {
		const mockEvent = {};

		matrix(false, (datas, isFulfilled) => {
			BeatmapManipulater.mockClear();

			expect(main.onClickOverwrite(mockEvent, datas)).toBe(isFulfilled ? undefined : 'error');

			if(isFulfilled) {
				expect(BeatmapManipulater.mock.instances.length).toBe(1);

				if(datas.optionBackup)
					expect(mockBeatmapManipulaterBackup).toHaveBeenCalled();

				const i = mockBeatmapManipulaterOverwrite.mock.calls.length - 1;

				expect(mockBeatmapManipulaterOverwrite).toHaveBeenCalled();
				expect(mockBeatmapManipulaterOverwrite.mock.calls[i].length).toBe(3);
				expect(mockBeatmapManipulaterOverwrite.mock.calls[i][0]).toBe(timeToMillisecond(datas.startPointTime));
				expect(mockBeatmapManipulaterOverwrite.mock.calls[i][1]).toBe(timeToMillisecond(datas.endPointTime));
				expect(mockBeatmapManipulaterOverwrite.mock.calls[i][2]).toEqual({
					startVelocity: parseFloat(datas.startPointVelocity),
					startVolume: parseInt(datas.startPointVolume),
					endVelocity: parseFloat(datas.endPointVelocity),
					endVolume: parseInt(datas.endPointVolume),
					includingStartTime: datas.startTimeInclude,
					includingEndTime: datas.endTimeInclude,
					isKiai: datas.optionKiai,
					isDense: datas.optionDense,
					isOffset: datas.optionOffset,
					isBackup: datas.optionBackup,
					isIgnoreVelocity: datas.optionIgnoreVelocity,
					isIgnoreVolume: datas.optionIgnoreVolume
				});
			}
		})
	});

	test('Remove', () => {
		const mockEvent = {};

		matrix(true, (datas, isFulfilled) => {
			BeatmapManipulater.mockClear();

			expect(main.onClickRemove(mockEvent, datas)).toBe(isFulfilled ? undefined : 'error');

			if(isFulfilled) {
				expect(BeatmapManipulater.mock.instances.length).toBe(1);

				if(datas.optionBackup)
					expect(mockBeatmapManipulaterBackup).toHaveBeenCalled();

				const i = mockBeatmapManipulaterRemove.mock.calls.length - 1;

				expect(mockBeatmapManipulaterRemove).toHaveBeenCalled();
				expect(mockBeatmapManipulaterRemove.mock.calls[i].length).toBe(3);
				expect(mockBeatmapManipulaterRemove.mock.calls[i][0]).toBe(timeToMillisecond(datas.startPointTime));
				expect(mockBeatmapManipulaterRemove.mock.calls[i][1]).toBe(timeToMillisecond(datas.endPointTime));
				expect(mockBeatmapManipulaterRemove.mock.calls[i][2]).toEqual({
					includingStartTime: datas.startTimeInclude,
					includingEndTime: datas.endTimeInclude,
					isOffset: datas.optionOffset,
					isBackup: datas.optionBackup
				});
			}
		});
	});

	test('Backup', () => {
		main.onClickBackup();

		expect(shell.openPath).toHaveBeenCalled();
	});

	test('Close', () => {
		main.onClose();

		expect(mockBrowserWindowClose).toHaveBeenCalled();
	});

	test('Show Message Box', () => {
		expect(main.showMessageBox('info', '', '')).toBe('info');
		expect(main.showMessageBox('error', '', '')).toBe('error');

		expect(dialog.showMessageBox).toHaveBeenCalled();
	});
});