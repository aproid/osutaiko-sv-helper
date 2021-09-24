const Decimal = require('decimal.js');
const moment = require('moment');
const path = require('path');
const fs = require('fs');

const { __DEV__, __TEST__ } = require('./env');
const { Regex } = require('./regex');
const { parseIntSafely, parseFloatSafely, parseTimeSafely } = require('./type');
const { between } = require('./util');

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
		let { objects, startIndex, endIndex } = this.parseCommaSeperatedTag(this.constructor.HIT_OBJECTS_TAG);

		objects = objects.reduce((accumulator, hitObject) => {
			if(hitObject.length >= 6)
				accumulator.push(HitObject.fromArray(hitObject));

			return accumulator;
		}, []);

		objects.sort((a, b) => {
			return a.time - b.time;
		});

		this.hitObjects = objects;
		this.hitObjectStartIndex = startIndex;
		this.hitObjectEndIndex = endIndex;
	}

	parseTimingObjects() {
		let { objects, startIndex, endIndex } = this.parseCommaSeperatedTag(this.constructor.TIMING_POINTS_TAG);

		objects = objects.reduce((accumulator, timingPoint) => {
			if(timingPoint.length >= 8)
				accumulator.push(TimingPoint.fromArray(timingPoint));
			
			return accumulator;
		}, []);

		objects.sort((a, b) => {
			return a.time - b.time;
		});
		
		this.timingPoints = objects;
		this.timingPointStartIndex = startIndex;
		this.timingPointEndIndex = endIndex;
	}

	parseCommaSeperatedTag(tag) {
		let objects;
		let tagSectionRaw = this.rawString.split(tag).pop();
		let tagSectionLength = tagSectionRaw.indexOf('[');
		let tagSectionStartIndex = this.rawString.indexOf(tag) + tag.length;
		let tagSectionEndIndex = tagSectionLength < 0 ? this.rawString.length : tagSectionStartIndex + tagSectionLength;

		tagSectionRaw = tagSectionRaw.slice(0, tagSectionLength < 0 ? undefined : tagSectionLength);
		tagSectionRaw = tagSectionRaw.split(Regex.NEWLINE);

		objects = tagSectionRaw.map((o) => o.trim().split(','));

		return {
			objects: objects,
			startIndex: tagSectionStartIndex,
			endIndex: tagSectionEndIndex
		}
	}

	getTimingPointsInRange(startTime, endTime, includingStartTime=true, includingEndTime=true) {
		return this.timingPoints.filter(tp => between(tp.time, startTime, endTime, includingStartTime, includingEndTime));
	}

	getHitObjectsInRange(startTime, endTime, includingStartTime=true, includingEndTime=true) {
		return this.hitObjects.filter(tp => between(tp.time, startTime, endTime, includingStartTime, includingEndTime));
	}

	getTimingPointsOutRange(startTime, endTime, includingStartTime=true, includingEndTime=true) {
		return this.timingPoints.filter(tp => !between(tp.time, startTime, endTime, includingStartTime, includingEndTime));
	}

	getHitObjectsOutRange(startTime, endTime, includingStartTime=true, includingEndTime=true) {
		return this.hitObjects.filter(tp => !between(tp.time, startTime, endTime, includingStartTime, includingEndTime));
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
}

class BeatmapManipulater {
	constructor(beatmapPath) {
		this.beatmap = new Beatmap(beatmapPath);
	}

	overwrite(startTime, endTime, options={}) {
		const self = this.constructor;

		const timingPoints = [];
		
		if(options.isDense) {
			for(let i = startTime; i <= endTime; i = this.getSnapBasedOffsetTime(i, 16)) {
				if(i === startTime && options.includingStartTime === false) continue;
				if(i === endTime && options.includingEndTime === false) continue;

				const timingPoint = new TimingPoint;
				timingPoint.beatLength = options.isIgnoreVelocity ? this.getInheritableBeatLength(i) : (-100 / self.getTimeInterpolatedValue(i, startTime, endTime, options.startVelocity, options.endVelocity, options.isExponential));
				timingPoint.volume = options.isIgnoreVolume ? this.getInheritableVolume(i) : (Math.round(self.getTimeInterpolatedValue(i, startTime, endTime, options.startVolume, options.endVolume, options.isExponential)));
				timingPoint.time = options.isOffset ? this.getSnapBasedOffsetTime(i, -16) : i;
				timingPoint.effects = options.isKiai ? 1 : 0;
				timingPoints.push(timingPoint);
			}
		} else {
			const hitObjects = this.beatmap.getHitObjectsInRange(startTime, endTime, options.includingStartTime, options.includingEndTime);

			for(let i in hitObjects) {
				const hitObject = hitObjects[i];

				const timingPoint = new TimingPoint;
				timingPoint.beatLength = options.isIgnoreVelocity ? this.getInheritableBeatLength(hitObject.time) : (-100 / self.getTimeInterpolatedValue(hitObject.time, startTime, endTime, options.startVelocity, options.endVelocity, options.isExponential));
				timingPoint.volume = options.isIgnoreVolume ? this.getInheritableVolume(hitObject.time) : (Math.round(self.getTimeInterpolatedValue(hitObject.time, startTime, endTime, options.startVolume, options.endVolume, options.isExponential)));
				timingPoint.effects = options.isKiai ? 1 : 0;

				if(options.isOffsetPrecise) {
					const timingData = this.getDecimalTimingData(hitObject.time);

					if(timingData.snap !== 12) {
						const intervalTri = timingData.beatLength.div(3);

						const prevHitObject = this.findPreviousHitObject(hitObject.time);
						const nextHitObject = this.findNextHitObject(hitObject.time);

						const prevTimingData = prevHitObject !== null ? this.getDecimalTimingData(prevHitObject.time) : null;
						const nextTimingData = prevHitObject !== null ? this.getDecimalTimingData(nextHitObject.time) : null;

						const isOddAdjacent = (prevTimingData !== null && prevTimingData.time.floor().toNumber() >= timingData.time.sub(intervalTri).floor().toNumber() && prevTimingData.snap === 12)
										   || (nextTimingData !== null && nextTimingData.time.floor().toNumber() <= timingData.time.add(intervalTri).floor().toNumber() && nextTimingData.snap === 12);

						if(isOddAdjacent) {
							timingPoint.time = this.getSnapBasedOffsetTime(hitObject.time, -12);
						} else {
							timingPoint.time = this.getSnapBasedOffsetTime(hitObject.time, -16);
						}
					} else {
						timingPoint.time = this.getSnapBasedOffsetTime(hitObject.time, -12);
					}
				} else {
					timingPoint.time = options.isOffset ? this.getSnapBasedOffsetTime(hitObject.time, -16) : hitObject.time;
				}

				timingPoints.push(timingPoint);
			}
		}

		this.beatmap.appendTimingPoints(timingPoints);
		this.beatmap.write();
	}

	modify(startTime, endTime, options={}) {
		const self = this.constructor;
		
		if(options.isOffset) {
			startTime = this.getSnapBasedOffsetTime(startTime, options.isOffsetPrecise ? -12 : -16);
			endTime = this.getSnapBasedOffsetTime(endTime, -16);
		}

		const timingPoints = this.beatmap.getTimingPointsInRange(startTime, endTime, options.includingStartTime, options.includingEndTime);

		for(let i in timingPoints) {
			const timingPoint = timingPoints[i];
			timingPoint.beatLength = options.isIgnoreVelocity ? timingPoint.beatLength : (-100 / self.getTimeInterpolatedValue(timingPoint.time, startTime, endTime, options.startVelocity, options.endVelocity, options.isExponential));
			timingPoint.volume = options.isIgnoreVolume ? timingPoint.volume : (Math.round(self.getTimeInterpolatedValue(timingPoint.time, startTime, endTime, options.startVolume, options.endVolume, options.isExponential)));
			timingPoint.effects = options.isKiai ? 1 : 0;
		}

		this.beatmap.replaceTimingPoints(this.beatmap.timingPoints);
		this.beatmap.write();
	}

	remove(startTime, endTime, options={}) {
		if(options.isOffset) {
			startTime = this.getSnapBasedOffsetTime(startTime, options.isOffsetPrecise ? -12 : -16);
			endTime = this.getSnapBasedOffsetTime(endTime, -16);
		}

		const timingPoints = this.beatmap.getTimingPointsOutRange(startTime, endTime, options.includingStartTime, options.includingEndTime);

		this.beatmap.replaceTimingPoints(timingPoints);
		this.beatmap.write();
	}

	backup() {
		const self = this.constructor;

		const backupBaseName = path.parse(this.beatmap.path).name;
		const backupName = moment().format('YYYY_MM_DD_HH_mm_ss_SSS') + '.osu';

		const backupPath = self.getBackupPath(backupBaseName);

		fs.writeFileSync(`${backupPath}\\${backupName}`, this.beatmap.rawString);
	}

	findPreviousTimingPoint(time, inheritType=-1, includingCurrentTime=false) {
		const timingPoints = this.beatmap.getTimingPointsInRange(-Infinity, time, true, includingCurrentTime);

		for(let i = timingPoints.length - 1; i >= 0; i--) {
			const timingPoint = timingPoints[i];

			if(inheritType === -1 || timingPoint.uninherited === inheritType)
				return timingPoint;
		}

		return null;
	}

	findNextTimingPoint(time, inheritType=-1, includingCurrentTime=false) {
		const timingPoints = this.beatmap.getTimingPointsInRange(time, -Infinity, includingCurrentTime, true);

		for(let i = 0; i < timingPoints.length; i++) {
			const timingPoint = timingPoints[i];

			if(inheritType === -1 || timingPoint.uninherited === inheritType)
				return timingPoint;
		}

		return null;
	}

	findPreviousHitObject(time, includingCurrentTime=false) {
		const hitObjects = this.beatmap.getHitObjectsInRange(-Infinity, time, true, includingCurrentTime);

		if(hitObjects.length < 1)
			return null;

		return hitObjects[hitObjects.length - 1];
	}

	findNextHitObject(time, includingCurrentTime=false) {
		const hitObjects = this.beatmap.getHitObjectsInRange(time, Infinity, includingCurrentTime, true);

		if(hitObjects.length < 1)
			return null;

		return hitObjects[0];
	}

	getInheritableBeatLength(time) {
		const timingPoint = this.findPreviousTimingPoint(time, 0, true);

		if(timingPoint === null)
			return new TimingPoint().beatLength;

		return timingPoint.beatLength;
	}

	getInheritableVolume(time) {
		const timingPoint = this.findPreviousTimingPoint(time, 0, true);

		if(timingPoint === null)
			return new TimingPoint().volume;

		return timingPoint.volume;
	}

	getDecimalTimingData(time) {
		const timingPoint = this.findPreviousTimingPoint(time, 1, true);

		if(timingPoint === null)
			return NaN;

		let resultSnap;
		let resultTime;

		let indexDuoDeca = Decimal(timingPoint.time);
		let indexHexaDeca = Decimal(timingPoint.time);

		const intervalDuoDeca = Decimal(timingPoint.beatLength).div(12);
		const intervalHexaDeca = Decimal(timingPoint.beatLength).div(16);

		while(indexDuoDeca.lt(time)) {
			indexDuoDeca = indexDuoDeca.add(intervalDuoDeca);

			if(indexDuoDeca.floor().toNumber() === time) {
				resultSnap = 12;
				resultTime = indexDuoDeca;
				break;
			}
		}

		while(indexHexaDeca.lt(time)) {
			indexHexaDeca = indexHexaDeca.add(intervalHexaDeca);

			if(indexHexaDeca.floor().toNumber() === time) {
				resultSnap = 16;
				resultTime = indexHexaDeca;
				break;
			}
		}

		return {
			snap: resultSnap ? resultSnap : 16,
			time: resultTime ? resultTime : indexHexaDeca,
			beatLength: Decimal(timingPoint.beatLength)
		}
	}

	getSnapBasedOffsetTime(time, snap) {
		const timingData = this.getDecimalTimingData(time);

		timingData.beatLength = timingData.beatLength.div(snap);
		timingData.time = timingData.time.add(timingData.beatLength);

		return timingData.time.floor().toNumber();
	}

	static getTimeInterpolatedValue(cTime, sTime, eTime, sValue, eValue, isExponential=false) {
		const progress = (cTime - sTime) / (eTime - sTime);

		return (((isExponential ? Math.pow(2, 10 * progress - 10) : progress) * (eValue - sValue)) + sValue);
	}

	static getBackupPath(beatmapName=null) {
		const backupPath = path.join(__DEV__ || __TEST__ ? path.join(__dirname, '..') : process.env.PORTABLE_EXECUTABLE_DIR, 'Backup');

		if(!fs.existsSync(backupPath))
			fs.mkdirSync(backupPath);

		if(beatmapName && beatmapName !== null) {
			const childPath = `${backupPath}\\${beatmapName}`;

			if(!fs.existsSync(childPath))
				fs.mkdirSync(childPath);

			return childPath;
		}

		return backupPath;
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
			this.beatLength.toFixed(12),
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
		instance.extra = arr.slice(5).join(',');

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

	isNote()	{ return this.type === 0 || this.type === 1 || this.type === 5 }
	isSlider()	{ return this.type === 2 || this.type === 6 }
	isSpinner()	{ return this.type === 8 || this.type === 12 }
	isKat()		{ return this.hitSound === 2 || this.hitSound === 6 || this.hitSound === 8 || this.hitSound === 12 }
	isDon()		{ return this.hitSound === 0 || this.hitSound === 4 }
	isBigNote()	{ return this.hitSound === 4 || this.hitSound === 6 || this.hitSound === 12 }
}

module.exports = {
	default: Beatmap,
	Beatmap,
	BeatmapManipulater,
	TimingPoint,
	HitObject
};