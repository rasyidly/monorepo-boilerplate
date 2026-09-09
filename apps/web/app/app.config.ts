export default defineAppConfig({
  ui: {
    colors: {
      primary: 'sky',
      neutral: 'mist',
      error: 'rose',
      success: 'teal'
    },
    dashboardPanel: {
      slots: {
        body: '@container'
      }
    },
    progress: {
      slots: {
        indicator: 'bg-inverted!'
      }
    },
    alert: {
      defaultVariants: {
        color: 'neutral',
        variant: 'subtle'
      }
    },
    card: {
      slots: {
        root: 'rounded-lg'
      },
      compoundVariants: [{
        variant: 'naked',
        class: 'rounded-none!'
      }]
    },
    pageCard: {
      slots: {
        root: 'rounded-lg'
      },
      variants: {
        variant: {
          naked: {
            root: 'rounded-none!'
          }
        }
      }
    },
    authForm: {
      slots: {
        leading: 'my-4',
        leadingIcon: 'size-12',
        title: 'font-normal text-2xl',
        body: 'gap-y-4',
        form: 'space-y-4'
      }
    },
    form: {
      base: 'space-y-3'
    },
    input: {
      slots: {
        root: 'w-full'
      }
    },
    inputNumber: {
      slots: {
        root: 'w-full'
      }
    },
    select: {
      slots: {
        base: 'w-full'
      }
    },
    checkbox: {
      defaultVariants: {
        color: 'neutral'
      }
    },
    selectMenu: {
      slots: {
        base: 'w-full',
        content: 'min-w-fit'
      }
    },
    textarea: {
      slots: {
        root: 'w-full'
      }
    },
    table: {
      defaultVariants: {
        loadingColor: 'neutral'
      },
      slots: {
        root: 'shrink-0 h-full',
        td: 'px-1 py-2 first:ps-4 sm:first:ps-6 sm:last:pe-6 [&:has([role=checkbox])]:pe-2',
        th: 'px-1 py-2 first:ps-4 sm:first:ps-6 sm:last:pe-6 [&:has([role=checkbox])]:pe-2',
        tr: 'data-[selected=true]:bg-inherit',
        thead: 'text-nowrap'
      }
    },
    button: {
      defaultVariants: {
        color: 'neutral'
      }
    },
    formField: {
      slots: {
        label: 'text-muted',
        error: 'text-xs mt-1'
      },
      variants: {
        orientation: {
          horizontal: {
            root: 'justify-start',
            wrapper: 'w-32',
            container: 'w-full'
          }
        }
      }
    },
    dashboardToolbar: {
      slots: {
        root: 'gap-1'
      }
    },
    popover: {
      slots: {
        content: 'p-4 space-y-4 [&>*:nth-last-child(2)]:mb-0 min-w-2xs'
      }
    },
    toast: {
      defaultVariants: {
        color: 'neutral'
      }
    },
    navigationMenu: {
      compoundVariants: [
        {
          active: false,
          class: {
            linkLeadingIcon: 'text-muted'
          }
        }
      ]
    },
    empty: {
      defaultVariants: {
        variant: 'naked'
      }
    }
  }
})
