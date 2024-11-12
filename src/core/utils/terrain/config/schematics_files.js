// schematics_files.js
const schematic_files = import.meta.glob('/src/assets/terrain/**/*.schematic', {
  eager: true,
  import: 'default',
  query: '?url',
})

export const SCHEMATICS_FILES = Object.fromEntries(
  Object.entries(schematic_files).map(([path, url]) => {
    // Extract the path after 'terrain/' and before '.schem'
    const match = path.match(/terrain\/(.+)\.schem/)
    const relative_path = match ? match[1] : path
    return [relative_path, url]
  }),
)
