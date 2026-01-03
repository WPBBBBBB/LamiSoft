/* eslint-disable no-console */

const path = require("path")
const fs = require("fs")
const sharp = require("sharp")

async function main() {
  const repoRoot = process.cwd()
  const srcSvg = path.join(repoRoot, "public", "aave.svg")
  const outDir = path.join(repoRoot, "public", "pwa")

  if (!fs.existsSync(srcSvg)) {
    throw new Error(`Missing source icon: ${srcSvg}`)
  }

  fs.mkdirSync(outDir, { recursive: true })

  const makeIcon = async (size, filename) => {
    const out = path.join(outDir, filename)
    await sharp(srcSvg, { density: 512 })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(out)
    console.log("wrote", path.relative(repoRoot, out))
  }

  const makeMaskable = async (size, filename) => {
    const out = path.join(outDir, filename)

    // Put the logo in the safe area (approx 80%) with padding around.
    const inner = Math.round(size * 0.8)
    const padding = Math.floor((size - inner) / 2)

    const innerPng = await sharp(srcSvg, { density: 512 })
      .resize(inner, inner)
      .png({ compressionLevel: 9 })
      .toBuffer()

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: innerPng, left: padding, top: padding }])
      .png({ compressionLevel: 9 })
      .toFile(out)

    console.log("wrote", path.relative(repoRoot, out))
  }

  await Promise.all([
    makeIcon(192, "icon-192.png"),
    makeIcon(512, "icon-512.png"),
    makeMaskable(192, "maskable-192.png"),
    makeMaskable(512, "maskable-512.png"),
    makeIcon(180, "apple-touch-icon.png"),
  ])
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
