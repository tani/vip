import * as fs from "https://lib.deno.dev/std/fs/mod.ts";
import * as path from "https://lib.deno.dev/std/path/mod.ts";
import * as R from "https://esm.sh/rambda";
import ini from "https://esm.sh/js-ini@1";

const ignores = [
  "t/**/*",
  "test/**/*",
  "VimFlavor",
  ".vintrc.*",
  ".travis.*",
  "Makefile",
  "Rakefile",
  "Gemfile",
  "README",
  "README.*",
  "LICENSE",
  "LICENSE.*",
  "LICENCE",
  "CHANGELOG",
  "CHANGELOG.*",
  "CONTRIBUTING",
  "CONTRIBUTING.*",
  ".git",
  ".git/**/*",
  ".hg",
  ".hg/**/*",
  ".github/**/*",
  ".gitignore",
  ".hgignore",
  ".gitmodules",
  ".gitattributes",
  ".githooks/**/*",
];

export type Type = "start" | "opt";
const homedir = Deno.env.get("HOME")!;
const vipdir = path.join(homedir, ".vip");

const src_startdir = path.join(vipdir, "src", "pack/vip/start");
const src_optdir = path.join(vipdir, "src", "pack/vip/opt");
const src_packdir = { start: src_startdir, opt: src_optdir };

const bundle_startdir = path.join(vipdir, "bundle", "pack/vip/start");
const bundle_optdir = path.join(vipdir, "bundle", "pack/vip/opt");

const moddir = path.join(vipdir, ".git/modules");

export async function listAbsDirs(root: string, recursive = false) {
  const dirs: string[] = [];
  for await (const entry of Deno.readDir(root)) {
    if (entry.isDirectory) {
      dirs.push(path.join(root, entry.name));
      if (recursive) {
        dirs.push(...await listAbsDirs(root, recursive));
      }
    }
  }
  return dirs;
}

export async function listAbsFiles(root: string, recursive = false) {
  const files: string[] = [];
  for await (const entry of Deno.readDir(root)) {
    const target = path.join(root, entry.name);
    if (entry.isFile) {
      files.push(target);
    }
    if (entry.isDirectory && recursive) {
      files.push(...await listAbsFiles(target, recursive));
    }
  }
  return files;
}

export async function listRelFiles(root: string, recursive = false) {
  const files = await listAbsFiles(root, recursive);
  return files.map((file) => path.relative(root, file));
}

export async function listRelDirs(root: string, recursive = false) {
  const dirs = await listAbsDirs(root, recursive);
  return dirs.map((dir) => path.relative(root, dir));
}

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
  const dirs = await listAbsDirs(src_startdir);
  const lists = await Promise.all(
    dirs.map(async (dir) => ({
      dir,
      files: await listRelFiles(dir, true),
    })),
  );
  let conflicted = false;
  for (const list1 of lists) {
    for (const list2 of lists) {
      if (list1 === list2) continue;
      const conflicts = R
        .intersection(list1.files, list2.files)
        .filter((file) =>
          !ignores
            .map((p) => path.globToRegExp(p, {}))
            .some((m) => file.match(m))
        );
      if (conflicts.length !== 0) {
        const from = path.basename(list1.dir);
        const to = path.basename(list2.dir);
        console.error(
          `The following files are conflicted between ${from} and ${to}.`,
        );
        conflicts.forEach((c) => console.error(c));
        conflicted = true;
      }
    }
  }
  if (conflicted) Deno.exit(1);
  await fs.emptyDir(path.join(bundle_startdir, "bundle"));
  for (const list of lists) {
    for (const file of list.files) {
      const from = path.join(list.dir, file);
      const to = path.join(path.join(bundle_startdir, "bundle"), file);
      await fs.ensureDir(path.dirname(to));
      await Deno.copyFile(from, to);
    }
  }
  await fs.emptyDir(bundle_optdir);
  await Deno.remove(bundle_optdir);
  await fs.copy(src_optdir, bundle_optdir);
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
