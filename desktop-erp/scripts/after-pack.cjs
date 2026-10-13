const { execFileSync } = require('node:child_process')
const path = require('node:path')

/**
 * Apple Silicon requires every executable in an application bundle to carry a
 * valid signature. The public ASAAS build does not yet use a paid Apple
 * Developer ID, so apply an ad-hoc signature to the complete Electron bundle.
 * This fixes the invalid/absent bundle signature that macOS reports as
 * “damaged”, while the release workflow independently verifies the result.
 */
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  execFileSync('/usr/bin/codesign', [
    '--force',
    '--deep',
    '--sign', '-',
    '--timestamp=none',
    appPath,
  ], { stdio: 'inherit' })

  execFileSync('/usr/bin/codesign', [
    '--verify',
    '--deep',
    '--strict',
    '--verbose=2',
    appPath,
  ], { stdio: 'inherit' })
}
