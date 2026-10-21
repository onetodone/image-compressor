import * as tailwind from 'prettier-plugin-tailwindcss'

import base from '../../prettier.config.mjs'

// Prettier uses the nearest config without merging, so the root options are spread here.
// The plugin is imported rather than named so it resolves from this workspace, not from the working directory.
/** @type {import('prettier').Config} */
const config = {
  ...base,
  plugins: [tailwind],
}

export default config
