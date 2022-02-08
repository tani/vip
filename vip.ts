import * as fs from "https://lib.deno.dev/std/fs/mod.ts";
import * as path from "https://lib.deno.dev/std/path/mod.ts";
import * as flags  from "https://lib.deno.dev/std/flags/mod.ts";
import ini from "https://esm.sh/js-ini@1";

const args = flags.parse(Deno.args);

const type: "start" | "opt" = args.opt ? "opt" : "start";
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

async function list() {
  const gitmodulesPath = path.join(vipdir, ".gitmodules");
  const gitmodulesStr = await Deno.readTextFile(gitmodulesPath);
  const gitmodules = ini.parse(gitmodulesStr)
  for(const module of Object.values(gitmodules) as any) {
    if(module.path.includes(path.relative(vipdir, packdir[type]))) {
      const url = new URL(module.url)
      console.log(path.relative('/',url.pathname))
    }
  }
}

async function sync() {
  await git("submodule", "update", "--init", "--recursive");
}

function help() {
  console.log(`
vip add [--opt] username/reponame ...
vip remove [--opt] [username/]reponame ...
vip list [--opt]
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
  case "list":
    await list();
    break;
  default:
    help();
}
