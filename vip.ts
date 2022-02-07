import * as fs from "https://lib.deno.dev/std/fs/mod.ts";
import * as path from "https://lib.deno.dev/std/path/mod.ts";
import { parse } from "https://lib.deno.dev/std/flags/mod.ts";

interface Settings {
  version: string;
  packages: Package[];
}

type Protocol = "https" | "ssh";
type Type = "opt" | "start";

interface Package {
  name: string;
  dependencies: string[];
  protocol: Protocol;
  type: Type;
  branch?: string;
}

async function isAvailable(pkg: Package): Promise<boolean> {
  const url = `https://github.com/${pkg.name}`;
  const response = await fetch(url);
  return response.status === 200;
}

async function findConfigDir(dir: string): Promise<string> {
  if (dir === "/") {
    const homeDir = Deno.env.get("HOME")!;
    return path.join(homeDir, ".vip");
  }
  for await (const entry of Deno.readDir(dir)) {
    if (entry.name === ".vip" && entry.isDirectory) {
      return path.normalize(path.join(dir, ".vip"));
    }
  }
  return await findConfigDir(path.join(dir, ".."));
}

async function configDir() {
  return await findConfigDir(Deno.cwd());
}

const packageTemplate: Package = {
  name: "michaelb/do-nothing.vim",
  dependencies: [],
  protocol: "https",
  type: "start",
};

const pkgNameEq = (name: string) =>
  (pkg: Package) => name === pkg.name || name === path.basename(pkg.name);
const pkgNameNotEq = (name: string) =>
  (pkg: Package) => name !== pkg.name && name !== path.basename(pkg.name);
const pkgTypeEq = (type: string) => (pkg: Package) => type === pkg.type;

async function packpath() {
  return path.join(await configDir(), "pack/vip");
}

function resolve(packages: Package[]): Package[] {
  for (const pkg of packages) {
    for (const name of pkg.dependencies) {
      const pred = (pkg: Package) => name === `${pkg.name}`;
      if (!packages.some(pred)) {
        return resolve([{ ...packageTemplate, name }]);
      }
    }
  }
  return packages;
}

async function clean(): Promise<void> {
  const settings = await load();
  const packages = resolve(settings.packages);
  for (const type of ["start", "opt"]) {
    const dir = path.join(await packpath(), type);
    for await (const entry of Deno.readDir(dir)) {
      if (packages.filter(pkgTypeEq(type)).every(pkgNameNotEq(entry.name))) {
        const target = path.join(dir, entry.name);
        console.log(`Deleting ${target}`);
        await fs.emptyDir(target);
        await Deno.remove(target);
      }
    }
  }
}

async function update(): Promise<void> {
  const procs = [];
  for (const type of ["start", "opt"]) {
    const dir = path.join(await packpath(), type);
    for await (const entry of Deno.readDir(dir)) {
      const target = path.join(dir, entry.name);
      console.log(`Updating ${target}`);
      procs.push(Deno.run({ cmd: ["git", "-C", target, "pull"] }));
    }
  }
  await Promise.all(procs.map((proc) => proc.status()));
}

async function clone(): Promise<void> {
  const settings = await load();
  const packages = resolve(settings.packages);
  const procs = [];
  for (const pkg of packages) {
    const cmd = ["git", "clone", "--recursive"];

    if (pkg.branch) {
      cmd.push("-b", pkg.branch);
    }

    let url = "https://github.com/michaelb/do-nothing.vim";
    if (pkg.protocol === "https") {
      url = `https://github.com/${pkg.name}`;
    }
    if (pkg.protocol === "ssh") {
      url = `git@github.com:${pkg.name}`;
    }
    cmd.push(url);

    const dir = path.join(
      await packpath(),
      pkg.type,
      path.basename(pkg.name),
    );

    cmd.push(dir);

    let existp = false;
    for await (const entry of Deno.readDir(path.dirname(dir))) {
      if (path.basename(pkg.name) === entry.name) {
        existp = true;
        break;
      }
    }

    if (!existp) {
      console.log(`Cloning ${url}`);
      procs.push(Deno.run({ cmd }));
    }
  }
  await Promise.all(procs.map((proc) => proc.status()));
}

async function sync(): Promise<void> {
  await clean();
  await update();
  await clone();
}

async function load(): Promise<Settings> {
  let settings: Settings = { version: "0", packages: [] };
  const settingsPath = path.join(await configDir(), "settings.json");
  try {
    settings = JSON.parse(await Deno.readTextFile(settingsPath));
  } catch (_err) {
    await fs.ensureDir(path.dirname(settingsPath));
    await Deno.writeTextFile(settingsPath, JSON.stringify(settings, null, 2));
  }
  return settings;
}

async function add(pkg: Package): Promise<void> {
  const settings = await load();
  if (settings.packages.some(pkgNameEq(pkg.name))) {
    console.log(`${pkg.name} was already installed.`);
    Deno.exit(1);
  }
  settings.packages.push(pkg);
  const settingsPath = path.join(await configDir(), "settings.json");
  await Deno.writeTextFile(settingsPath, JSON.stringify(settings, null, 2));
}

async function remove(name: string): Promise<void> {
  const settings = await load();
  const pkg = settings.packages.find(pkgNameEq(name));
  if (!pkg) {
    console.error(`${name} is not installed yet.`);
    Deno.exit(1);
  }
  settings.packages = settings.packages.filter(pkgNameNotEq(name));
  const settingsPath = path.join(await configDir(), "settings.json");
  await Deno.writeTextFile(settingsPath, JSON.stringify(settings, null, 2));
}

async function main() {
  const args = parse(Deno.args, {
    alias: {
      protocol: "p",
      branch: "b",
      type: "t",
    },
  });

  await fs.ensureDir(path.join(await packpath(), "start"));
  await fs.ensureDir(path.join(await packpath(), "opt"));

  if (args._.at(0) === "sync") {
    await sync();
  }

  if (args._.at(0) === "add") {
    const name = args._.at(1);
    if (typeof name !== "string") {
      console.error(`Invalid package name was given.`);
      Deno.exit(1);
    }
    if (!["start", "opt", undefined].includes(args.type)) {
      console.error(`type should be 'start' or 'opt'`);
      Deno.exit(1);
    }
    const dependencies = args._.slice(2);
    if (dependencies.some((dep) => typeof dep !== "string")) {
      console.error(`Invalid dependeices was given.`);
      Deno.exit(1);
    }
    const pkg: Package = {
      name,
      branch: args.branch ?? undefined,
      type: args.type ?? packageTemplate.type,
      protocol: args.protocol ?? packageTemplate.protocol,
      dependencies: dependencies as string[],
    };
    if (!await isAvailable(pkg)) {
      console.error(`${pkg.name} is not public.`);
      Deno.exit(1);
    }
    await add(pkg);
    await clone();
  }

  if (args._.at(0) === "remove") {
    const name = args._.at(1);
    if (typeof name !== "string") {
      console.error(`Invalid package name was given.`);
      Deno.exit(1);
    }
    await remove(name);
    await clean();
  }
}

await main();
