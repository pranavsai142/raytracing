#!/usr/bin/env node
/**
 * Tests shipped src/flyBasis.ts (A/D strafe + W forward).
 * Run: node scripts/test-strafe.mjs
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const SCRATCH =
  process.env.SCRATCH ||
  '/var/folders/h9/sn160jkx6hb87vp9683ptqr00000gn/T/grok-goal-6cec87b1f3bf/implementer';

const lines = [];
const log = (s) => {
  lines.push(s);
  console.log(s);
};
const nearly = (a, b, e = 1e-5) => Math.abs(a - b) < e;

const { moveBasisFromYaw, wishToWorldDir } = await import(
  pathToFileURL(path.join(root, 'src/flyBasis.ts')).href
);

const yaw = 0;
const A = wishToWorldDir(-1, 0, 0, yaw);
const D = wishToWorldDir(1, 0, 0, yaw);
const W = wishToWorldDir(0, 0, 1, yaw);
log('module=src/flyBasis.ts');
log('A(yaw0)=' + JSON.stringify(A));
log('D(yaw0)=' + JSON.stringify(D));
log('W(yaw0)=' + JSON.stringify(W));
// looking +Z: left=+X, right=−X, forward=+Z
const Aok = nearly(A.x, 1) && nearly(A.z, 0);
const Dok = nearly(D.x, -1) && nearly(D.z, 0);
const Wok = nearly(W.x, 0) && nearly(W.z, 1);
const yaw2 = Math.PI / 2;
const A2 = wishToWorldDir(-1, 0, 0, yaw2);
const D2 = wishToWorldDir(1, 0, 0, yaw2);
log('A(yaw pi/2 look +X)=' + JSON.stringify(A2));
log('D(yaw pi/2 look +X)=' + JSON.stringify(D2));
// looking +X: left=−Z, right=+Z
const A2ok = nearly(A2.z, -1) && nearly(A2.x, 0);
const D2ok = nearly(D2.z, 1) && nearly(D2.x, 0);
log('A left of +Z: ' + (Aok ? 'PASS' : 'FAIL'));
log('D right of +Z: ' + (Dok ? 'PASS' : 'FAIL'));
log('W along +Z: ' + (Wok ? 'PASS' : 'FAIL'));
log('A left of +X: ' + (A2ok ? 'PASS' : 'FAIL'));
log('D right of +X: ' + (D2ok ? 'PASS' : 'FAIL'));
const ok = Aok && Dok && Wok && A2ok && D2ok;
log(ok ? 'OVERALL PASS' : 'OVERALL FAIL');
writeFileSync(path.join(SCRATCH, 'strafe-check.txt'), lines.join('\n') + '\n');
process.exit(ok ? 0 : 1);
