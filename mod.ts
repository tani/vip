import * as fs from "https://lib.deno.dev/std/fs/mod.ts";
import * as path from "https://lib.deno.dev/std/path/mod.ts";
import ini from "https://esm.sh/js-ini@1";

export type Type = "start" | "opt";
const homedir = Deno.env.get("HOME")!;
const vipdir = path.join(homedir, ".vip");

const src_startdir = path.join(vipdir, "src", "pack/vip/start");
const src_optdir = path.join(vipdir, "src", "pack/vip/opt");
const src_packdir = { start: src_startdir, opt: src_optdir };

const bundle_startdir = path.join(vipdir, "bundle", "pack/vip/start");
const bundle_optdir = path.join(vipdir, "bundle", "pack/vip/opt");

const moddir = path.join(vipdir, ".git/modules");

async function git(...args: string[]) {
  const cmd = ["git", "-C", vipdir, ...args];
  const proc = Deno.run({ cmd });
  const status = await proc.status();
  if (status.code !== 0) {
    Deno.exit(status.code);
  }
}

export async function add(type: Type, name: string) {
  const reponame = path.basename(name);
  const username = path.dirname(name);
  const url = `https://github.com/${username}/${reponame}`;
  const reldir = path.relative(vipdir, path.join(src_packdir[type], reponame));
  await git("submodule", "add", url, reldir);
  await git("commit", "-am", `Add ${name}`);
}

export async function remove(type: Type, name: string) {
  const reponame = path.basename(name);
  const reldir = path.relative(vipdir, path.join(src_packdir[type], reponame));
  await git("submodule", "deinit", "-f", reldir);
  await git("rm", "-f", reldir);
  const submoddir = path.join(moddir, reldir);
  await fs.emptyDir(submoddir);
  await Deno.remove(submoddir);
  await git("commit", "-am", `Remove ${name}`);
}

export async function list(type: Type) {
  const gitmodulesPath = path.join(vipdir, ".gitmodules");
  const gitmodulesStr = await Deno.readTextFile(gitmodulesPath);
  const gitmodules = ini.parse(gitmodulesStr);
  for (const module of Object.values(gitmodules) as any) {
    if (module.path.includes(path.relative(vipdir, src_packdir[type]))) {
      const url = new URL(module.url);
      console.log(path.relative("/", url.pathname));
    }
  }
}

export async function sync() {
  await git("submodule", "update", "--init", "--recursive");
  await git("submodule", "foreach", "git", "pull", "origin");
  await git("commit", "-am", "Update submodules");
}

export async function log() {
  await git("log");
}

export function help() {
  console.log(`
vip add [--opt] username/reponame ...
vip remove [--opt] [username/]reponame ...
vip list [--opt]
vip sync
vip log
vip upgrade
vip bundle
`);
}

export async function bundle() {
  for await (const entry of Deno.readDir(src_startdir)) {
    await Deno.run({
      cmd: [
        "rsync",
        "-a",
        path.join(src_startdir, entry.name, "/"),
        path.join(bundle_startdir, "bundle/"),
      ],
    }).status();
  }
  for await (const entry of Deno.readDir(src_optdir)) {
    await Deno.run({
      cmd: [
        "rsync",
        "-a",
        path.join(src_optdir, entry.name),
        path.join(bundle_optdir),
      ],
    }).status();
  }
}

export async function init() {
  await fs.ensureDir(src_startdir);
  await fs.ensureDir(src_optdir);
  await fs.ensureDir(path.join(bundle_startdir, "bundle"));
  await fs.ensureDir(bundle_optdir);
  let initialized = false;
  for await (const entry of Deno.readDir(vipdir)) {
    if (entry.name === ".git" && entry.isDirectory) {
      initialized = true;
    }
  }
  if (!initialized) {
    git("init");
  }
}
