import * as fs from "https://lib.deno.dev/std/fs/mod.ts";
import * as path from "https://lib.deno.dev/std/path/mod.ts";
import { parse } from "https://lib.deno.dev/std/flags/mod.ts";

const args = parse(Deno.args, {
  alias: { type: "t" },
  default: { type: "start" },
});

const type: "start" | "opt" = args.type;
const homedir = Deno.env.get("HOME")!;
const vipdir = path.join(homedir, ".vip");
const startdir = path.join(vipdir, "pack/vip/start");
const optdir = path.join(vipdir, "pack/vip/opt");
const packdir = { start: startdir, opt: optdir };
const moddir = path.join(vipdir, ".git/modules");

async function git(...args: string[]) {
  const cmd = ["git", "-C", vipdir, ...args];
  const proc = Deno.run({ cmd });
  const status = await proc.status();
  if (status.code !== 0) {
    Deno.exit(status.code);
  }
}

async function add(name: string) {
  const reponame = path.basename(name);
  const username = path.dirname(name);
  const url = `https://github.com/${username}/${reponame}`;
  const reldir = path.relative(vipdir, path.join(packdir[type], reponame));
  await git("submodule", "add", url, reldir);
}

async function remove(name: string) {
  const reponame = path.basename(name);
  const reldir = path.relative(vipdir, path.join(packdir[type], reponame));
  await git("submodule", "deinit", "-f", reldir);
  await git("rm", "-f", reldir);
  const submoddir = path.join(moddir, reldir);
  await fs.emptyDir(submoddir);
  await Deno.remove(submoddir);
}

async function sync() {
  await git("submodule", "update", "--init", "--recursive");
}

function help() {
  console.log(`
vip add [--type (start|opt)] username/reponame ...
vip remove [--type (start|opt)] [username/]reponame ...
vip sync
`);
}

await fs.ensureDir(startdir);
await fs.ensureDir(optdir);
let initialized = false;
for await (const entry of Deno.readDir(vipdir)) {
  if (entry.name === ".git" && entry.isDirectory) {
    initialized = true;
  }
}
if (!initialized) {
  git("init");
}

const packages = args._.slice(1) as string[];
switch (args._.at(0)) {
  case "add":
    await Promise.all(packages.map(add));
    break;
  case "remove":
    await Promise.all(packages.map(remove));
    break;
  case "sync":
    await sync();
    break;
  default:
    help();
}
