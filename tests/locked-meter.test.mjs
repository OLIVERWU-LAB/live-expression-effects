import{fileURLToPath}from'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('locked playback freezes the displayed meter, hides smile requests and unlock restores live expression',()=>{
 const output=execFileSync(process.execPath,['--experimental-vm-modules',fileURLToPath(new URL('./helpers/app-smoke.mjs',import.meta.url)),'--locked-meter'],{encoding:'utf8',timeout:15000});
 assert.match(output,/Locked playback fixes the displayed strength/);
});
