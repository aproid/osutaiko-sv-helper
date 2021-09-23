const { Application } = require('spectron');
const electronPath = require('electron');
const path = require('path');
const fs = require('fs');

describe('Application Integrated Test', () => {
	jest.setTimeout(10000);

	const app = new Application({
		path: electronPath,
		env: {
			NODE_ENV: 'development'
		},
		args: [
			path.join(__dirname, '../main.js')
		]
	});

	beforeAll(() => {
		return app.start();
	});

	afterAll(async () => {
		if(app && app.isRunning()) {
			await app.client.execute(() => window.close());
		}
	});

	describe('Initialize', () => {
		test('Display App Window', async () => {
			const windowCount = await app.client.getWindowCount();

			expect(windowCount).toBe(1);
		});
	});
});