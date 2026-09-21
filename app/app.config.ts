export default defineAppConfig({
  ui: {
    // Warm amber accent reads as craftsmanship against slate neutrals.
    colors: {
      primary: 'amber',
      secondary: 'violet',
      success: 'emerald',
      info: 'sky',
      warning: 'orange',
      error: 'rose',
      neutral: 'slate'
    },
    button: {
      defaultVariants: { size: 'md' }
    },
    card: {
      slots: {
        root: 'ring ring-default divide-y divide-default rounded-xl shadow-sm transition-shadow duration-200',
        header: 'p-4 sm:px-5',
        body: 'p-4 sm:p-5',
        footer: 'p-4 sm:px-5'
      }
    },
    // Overlays share one radius scale so stacked surfaces line up.
    modal: {
      slots: { content: 'rounded-xl shadow-xl' }
    },
    slideover: {
      slots: { content: 'shadow-xl' }
    },
    popover: {
      slots: { content: 'rounded-xl shadow-lg' }
    },
    dropdownMenu: {
      slots: { content: 'rounded-xl shadow-lg' }
    },
    selectMenu: {
      slots: { content: 'rounded-xl shadow-lg' }
    },
    table: {
      slots: {
        th: 'text-xs uppercase tracking-wide text-muted font-semibold',
        td: 'text-sm'
      }
    }
  }
})
