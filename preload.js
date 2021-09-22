const { ipcRenderer } = require('electron');

class FileInput {
	constructor(selector) {
		const self = this;

		this._value = undefined;

		this.$el = document.querySelector(selector);
		this.$label = this.$el.querySelector('.file-label');
		this.$button = this.$el.querySelector('.file-select');

		this.$button.addEventListener('click', onButtonClick);

		function onButtonClick() {
			const file = ipcRenderer.sendSync('main:file');

			if(file) {
				self.$label.innerText = file.name;

				self._value = file.path;
			}
		}
	}

	value() {
		return this._value;
	}
}

window.addEventListener('DOMContentLoaded', () => {
	addIPCTrigger('.titlebar-close', 'click', 'main:close');

	const beatmapInput = new FileInput('.file');

	const $startPointTime = document.getElementById('sp_time');
	const $startPointVelocity = document.getElementById('sp_velocity');
	const $startPointVolume = document.getElementById('sp_volume');
	const $startTimeInclude = document.getElementById('sp_include');

	const $endPointTime = document.getElementById('ep_time');
	const $endPointVelocity = document.getElementById('ep_velocity');
	const $endPointVolume = document.getElementById('ep_volume');
	const $endTimeInclude = document.getElementById('ep_include');

	const $optionKiai = document.getElementById('op_kiai');
	const $optionDense = document.getElementById('op_dense');
	const $optionOffset = document.getElementById('op_offset');
	const $optionBackup = document.getElementById('op_backup');
	const $optionIgnoreVelocity = document.getElementById('op_ignr_velocity');
	const $optionIgnoreVolume = document.getElementById('op_ignr_volume');

	const $overwriteButton = document.querySelector('.btn-overwrite');
	const $modifyButton = document.querySelector('.btn-modify');
	const $removeButton = document.querySelector('.btn-remove');
	const $backupButton = document.querySelector('.btn-backup');

	$overwriteButton.addEventListener('click', onOverwriteClick);
	$modifyButton.addEventListener('click', onModifyClick);
	$removeButton.addEventListener('click', onRemoveClick);
	$backupButton.addEventListener('click', onBackupClick);

	function onOverwriteClick() {
		const d = getInputDatas();

		ipcRenderer.send('main:overwrite', {
			beatmapPath: d.beatmapPath,
			startPointTime: d.startPointTime,
			startPointVelocity: d.startPointVelocity,
			startPointVolume: d.startPointVolume,
			startTimeInclude: d.startTimeInclude,
			endPointTime: d.endPointTime,
			endPointVelocity: d.endPointVelocity,
			endPointVolume: d.endPointVolume,
			endTimeInclude: d.endTimeInclude,
			optionKiai: d.optionKiai,
			optionDense: d.optionDense,
			optionOffset: d.optionOffset,
			optionBackup: d.optionBackup,
			optionIgnoreVelocity: d.optionIgnoreVelocity,
			optionIgnoreVolume: d.optionIgnoreVolume
		});
	}

	function onModifyClick() {
		const d = getInputDatas();

		ipcRenderer.send('main:modify', {
			beatmapPath: d.beatmapPath,
			startPointTime: d.startPointTime,
			startPointVelocity: d.startPointVelocity,
			startPointVolume: d.startPointVolume,
			startTimeInclude: d.startTimeInclude,
			endPointTime: d.endPointTime,
			endPointVelocity: d.endPointVelocity,
			endPointVolume: d.endPointVolume,
			endTimeInclude: d.endTimeInclude,
			optionKiai: d.optionKiai,
			optionDense: d.optionDense,
			optionOffset: d.optionOffset,
			optionBackup: d.optionBackup,
			optionIgnoreVelocity: d.optionIgnoreVelocity,
			optionIgnoreVolume: d.optionIgnoreVolume
		});
	}

	function onRemoveClick() {
		const d = getInputDatas();

		ipcRenderer.send('main:remove', {
			beatmapPath: d.beatmapPath,
			startPointTime: d.startPointTime,
			startTimeInclude: d.startTimeInclude,
			endPointTime: d.endPointTime,
			endTimeInclude: d.endTimeInclude,
			optionOffset: d.optionOffset,
			optionBackup: d.optionBackup
		});
	}

	function onBackupClick() {
		ipcRenderer.send('main:backup');
	}

	function getInputDatas() {
		const beatmapPath = beatmapInput.value();

		const startPointTime = $startPointTime.value;
		const startPointVelocity = $startPointVelocity.value;
		const startPointVolume = $startPointVolume.value;
		const startTimeInclude = $startTimeInclude.checked;

		const endPointTime = $endPointTime.value;
		const endPointVelocity = $endPointVelocity.value;
		const endPointVolume = $endPointVolume.value;
		const endTimeInclude = $endTimeInclude.checked;

		const optionKiai = $optionKiai.checked;
		const optionDense = $optionDense.checked;
		const optionOffset = $optionOffset.checked;
		const optionBackup = $optionBackup.checked;
		const optionIgnoreVelocity = $optionIgnoreVelocity.checked;
		const optionIgnoreVolume = $optionIgnoreVolume.checked;

		return {
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
			optionBackup,
			optionIgnoreVelocity,
			optionIgnoreVolume
		};
	}
});

function addIPCTrigger(selector, event, ipcCommand, isSync=false) {
	return document.querySelector(selector).addEventListener(event, () => ipcRenderer[isSync ? 'sendSync' : 'send'](ipcCommand));
}