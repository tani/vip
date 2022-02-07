const targets = [
  "x86_64-unknown-linux-gnu",
  "x86_64-pc-windows-msvc",
  "x86_64-apple-darwin",
  "aarch64-apple-darwin",
];

await Promise.all(targets.map(async (target) => {
  await Deno.run({
    cmd: [
      "deno",
      "compile",
      "--allow-run",
      "--allow-net",
      "--allow-env",
      "--allow-write",
      "--allow-read",
      "--target",
      target,
      "--output",
      `dist/vip-${target}/vip`,
      "vip.ts",
    ],
  }).status();
  await Deno.run({
    cmd: [
      "zip",
      "-r",
      "-j",
      `dist/vip-${target}.zip`,
      `dist/vip-${target}`,
    ],
  }).status();
}));
