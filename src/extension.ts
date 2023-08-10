/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { resolve } from 'path';


const defaultObtainIMCmd = resolve(__dirname, '..', 'switcher', 'im-select.exe');
const defaultSwitchIMCmd = defaultObtainIMCmd + ' {im}';
const defaultEnglishIM = '1033';
const defaultChineseIM = '2052';

// type CS = 'Line'|'Block'|'Underline'|'LineThin'|'BlockOutline'|'UnderlineThin';  // 或
type CS = keyof typeof vscode.TextEditorCursorStyle;

const out = vscode.window.createOutputChannel('imeandcursor', { log: true });

let csEnglish: CS;
let csChinese: CS;
let EnglishIM: string;
let ChineseIM: string;
let obtainIMCmd: string;
let switchIMCmd: string;

// function getCursorStyleEnglish() {
// 	return vscode.workspace.getConfiguration("imeandcursor").get<string>("cursorStyle.English");
// }
// function getCursorStyleChinese() {
// 	return vscode.workspace.getConfiguration("imeandcursor").get<string>("cursorStyle.Chinese");
// }
// function getCursorColorEnglish() {
// 	return vscode.workspace.getConfiguration("imeandcursor").get<string>("cursorColor.English");
// }
// function getCursorColorChinese() {
// 	return vscode.workspace.getConfiguration("imeandcursor").get<string>("cursorColor.Chinese");
// }
// function getEnglishIM() {
// 	let EnglishIM = vscode.workspace.getConfiguration("imeandcursor").get<string>("EnglishIM")?.trim();
// 	if (!EnglishIM) {
// 		EnglishIM = defaultEnglishIM;
// 	}
// 	return EnglishIM;
// }
// function getChineseIM() {
// 	let ChineseIM = vscode.workspace.getConfiguration("imeandcursor").get<string>("ChineseIM")?.trim();
// 	if (!ChineseIM) {
// 		ChineseIM = defaultChineseIM;
// 	}
// 	return ChineseIM;
// }
// function getSwitchIMCmd() {
// 	let switchIMCmd = vscode.workspace.getConfiguration("imeandcursor").get<string>("switchIMCmd");
// 	if (switchIMCmd === '/path/to/im-select {im}' || !switchIMCmd) {
// 		switchIMCmd = defaultSwitchIMCmd;
// 	}
// 	return switchIMCmd;
// }
// function getObtainIMCmd() {
// 	let obtainIMCmd = vscode.workspace.getConfiguration("imeandcursor").get<string>("obtainIMCmd");
// 	if (obtainIMCmd === '/path/to/im-select' || !obtainIMCmd) {
// 		obtainIMCmd = defaultObtainIMCmd;
// 	}
// 	return obtainIMCmd;
// }

function getConfiguration() {
	csChinese = vscode.workspace.getConfiguration("imeandcursor").get<string>("cursorStyle.Chinese") as CS;
	csEnglish = vscode.workspace.getConfiguration("imeandcursor").get<string>("cursorStyle.English") as CS;
	EnglishIM = vscode.workspace.getConfiguration("imeandcursor").get<string>("EnglishIM")?.trim() as string;
	if (!EnglishIM) {
		EnglishIM = defaultEnglishIM;
	}
	ChineseIM = vscode.workspace.getConfiguration("imeandcursor").get<string>("ChineseIM")?.trim() as string;
	if (!ChineseIM) {
		ChineseIM = defaultChineseIM;
	}
	obtainIMCmd = vscode.workspace.getConfiguration("imeandcursor").get<string>("obtainIMCmd") as string;
	if (obtainIMCmd === '/path/to/im-select' || !obtainIMCmd) {
		obtainIMCmd = defaultObtainIMCmd;
	}
	switchIMCmd = vscode.workspace.getConfiguration("imeandcursor").get<string>("switchIMCmd") as string;
	if (switchIMCmd === '/path/to/im-select {im}' || !switchIMCmd) {
		switchIMCmd = defaultSwitchIMCmd;
	}
}

function execCmd(cmd: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		exec(cmd, (err, stdout, stderr) => {
			if (err) {
				reject(err);
			} else {
				resolve(stdout);
			}
		});
	});
}

async function obtainIM() {
	try {
		let IM = await execCmd(obtainIMCmd);
		// console.log(IM.trim());
		return IM.trim();
	} catch (e) {
		vscode.window.showInformationMessage("获取输入法ID失败，请检查是否正确设置了“ObtainIMCmd”。");
		throw (e);
	}

}

async function switchIM(currentIM: string) {
	const targetIM = currentIM === EnglishIM ? ChineseIM : EnglishIM;
	try {
		await execCmd(switchIMCmd.replace('{im}', targetIM));
	} catch (e) {
		vscode.window.showInformationMessage("切换输入法失败，请检查是否正确设置了“SwitchIMCmd”。");
		throw (e);
	}
}


function setCursor(currentIM: string) {
	if (!vscode.window.activeTextEditor) {
		out.info('setCursor:activeTextEditor === undefined');
		return;
	}
	out.info(`setCursor:${vscode.window.activeTextEditor.document.fileName}`);
	switch (currentIM) {
		case EnglishIM:
			vscode.window.activeTextEditor.options = { cursorStyle: vscode.TextEditorCursorStyle[csEnglish] };
			break;
		case ChineseIM:
			// vscode.window.activeTextEditor.options = { cursorStyle: vscode.TextEditorCursorStyle.Block };
			vscode.window.activeTextEditor.options = { cursorStyle: vscode.TextEditorCursorStyle[csChinese] };
			break;
		default:
			vscode.window.showInformationMessage(`没有匹配的输入法ID（当前：${currentIM}），请检查是否正确设置了“EnglishIM”和“ChineseIM”。`);
	}
}

export async function activate(context: vscode.ExtensionContext) {
	out.info("光标和输入法-ACTIVATE");
	getConfiguration();
	try {
		setCursor(await obtainIM());
	} catch (err) {
		out.error(`${err}`);
	}

	context.subscriptions.push(vscode.commands.registerCommand('imeandcursor.switch', async () => {
		out.info("switch IM!");
		try {
			await switchIM(await obtainIM());
			setCursor(await obtainIM());

		} catch (err) {
			out.error(`${err}`);
		}
	}));

	context.subscriptions.push(vscode.window.onDidChangeWindowState(async (e: vscode.WindowState) => {
		if (e.focused) {
			out.info("window focused!");
			try {
				setCursor(await obtainIM());
			} catch (err) {
				out.error(`${err}`);
			}
		}
	}));

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async (e: vscode.TextEditor | undefined) => {
		if (e !== undefined) {
			out.info('text editor activated!');
			try {
				setCursor(await obtainIM());
			} catch (err) {
				out.error(`${err}`);
			}
		}
	}));

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e:vscode.ConfigurationChangeEvent) => {
		getConfiguration();    
	}));
}

export async function deactivate(context: vscode.ExtensionContext) {
	out.info("光标和输入法-DEACTIVATE");
}