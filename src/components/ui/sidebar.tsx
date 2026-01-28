"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SIDEBAR_WIDTH_MIN = 224 // 14rem
const SIDEBAR_WIDTH_MAX = 448 // 28rem
const SIDEBAR_WIDTH_DEFAULT = 288 // 18rem
const SIDEBAR_COLLAPSED_WIDTH = 48 // 3rem
const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 1 week
const SIDEBAR_KEYBOARD_SHORTCUT = "b"
const SIDEBAR_WIDTH_MOBILE = "18rem"

type SidebarContext = {
  state: "expanded" | "collapsed"
  isResizing: boolean
  setIsResizing: (isResizing: boolean) => void
  width: number
  setWidth: (width: number) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContext | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

function SidebarProvider({
  children,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  const [width, setWidth] = React.useState(SIDEBAR_WIDTH_DEFAULT)
  const [isResizing, setIsResizing] = React.useState(false)

  // Helper to collapse/expand the sidebar.
  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((open) => !open)
    } else {
      setWidth((w) =>
        w > SIDEBAR_COLLAPSED_WIDTH ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH_DEFAULT
      )
    }
  }, [isMobile])

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar])

  const state = width > SIDEBAR_COLLAPSED_WIDTH ? "expanded" : "collapsed"

  const contextValue = React.useMemo(
    () => ({
      state,
      isResizing,
      setIsResizing,
      width,
      setWidth,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, isResizing, width, isMobile, openMobile, toggleSidebar]
  )

  return (
    <SidebarContext.Provider value={contextValue as SidebarContext}>
      <TooltipProvider delayDuration={0}>
        <div
          className="group/sidebar-wrapper flex min-h-svh w-full"
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { side?: "left" | "right" }
>(({ side = "left", className, children, ...props }, ref) => {
  const { isMobile, openMobile, setOpenMobile, width, setWidth, isResizing, setIsResizing, state } = useSidebar()
  const sidebarRef = React.useRef<HTMLDivElement>(null)

  const handleMouseMove = React.useCallback(
    (event: MouseEvent) => {
      if (!isResizing) return;
      let newWidth = side === "left" ? event.clientX : window.innerWidth - event.clientX;
      if (newWidth < SIDEBAR_WIDTH_MIN) newWidth = SIDEBAR_WIDTH_MIN;
      if (newWidth > SIDEBAR_WIDTH_MAX) newWidth = SIDEBAR_WIDTH_MAX;
      setWidth(newWidth);
    },
    [isResizing, setWidth, side]
  );

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove, setIsResizing]);

  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setIsResizing(true);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [handleMouseMove, handleMouseUp, setIsResizing]
  );

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          className="w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE } as React.CSSProperties}
          side={side}
        >
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      ref={sidebarRef}
      data-state={state}
      style={{ width: `${width}px` }}
      className={cn(
        "relative hidden h-svh flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] md:flex",
        isResizing && "cursor-col-resize select-none",
        className
      )}
      {...props}
    >
      {children}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute top-0 h-full w-1.5 cursor-col-resize",
          side === 'left' ? 'right-0' : 'left-0',
          isResizing ? "bg-primary/20" : "bg-transparent",
          state === "collapsed" && "pointer-events-none"
        )}
      />
    </div>
  )
})
Sidebar.displayName = "Sidebar"


const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"


const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"main">
>(({ className, ...props }, ref) => {
  return (
    <main
      ref={ref}
      className={cn("flex-1 overflow-hidden", className)}
      {...props}
    />
  )
})
SidebarInset.displayName = "SidebarInset"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  const { state } = useSidebar()
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-2 p-4 transition-all",
        state === 'collapsed' && 'p-2 items-center',
        className
      )}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  const { state } = useSidebar()
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-2 p-4 mt-auto transition-all",
        state === 'collapsed' && 'p-2 items-center',
        className
      )}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"


const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  const { state } = useSidebar()
  return (
    <div
      ref={ref}
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto",
        state === 'collapsed' && 'p-2',
        state === 'expanded' && 'p-4',
        className
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"


const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => {
  const { state } = useSidebar();
  return (
    <ul
      ref={ref}
      className={cn(
        "flex w-full min-w-0 flex-col gap-1",
        state === 'collapsed' ? 'items-center' : '',
        className
      )}
      {...props}
    />
  )
})
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("group/menu-item relative", className)}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"


const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground",
  {
    variants: {},
    defaultVariants: {},
  }
)

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      tooltip,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const { isMobile, state } = useSidebar()

    const buttonContent = (
      <>
        {children}
        <span className={cn("truncate", state === 'collapsed' ? 'hidden' : 'inline-block')}>{props.title}</span>
      </>
    );

    const button = (
      <Comp
        ref={ref}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants(), className, state === 'collapsed' && 'justify-center w-10 h-10 p-0')}
        {...props}
      >
        {children}
      </Comp>
    )

    if (!tooltip) {
      return button
    }

    if (typeof tooltip === "string") {
      tooltip = {
        children: tooltip,
      }
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          hidden={state !== "collapsed" || isMobile}
          {...tooltip}
        >
          {tooltip.children}
        </TooltipContent>
      </Tooltip>
    )
  }
)
SidebarMenuButton.displayName = "SidebarMenuButton"

export {
  Sidebar,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar
}
