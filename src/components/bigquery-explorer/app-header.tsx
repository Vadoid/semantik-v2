'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { DatabaseZap, Layers, BarChart, Plug } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { deleteSession } from '@/app/auth-actions';

export default function AppHeader({ user }: { user?: { name?: string; email?: string; picture?: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');

  const displayName = user?.name || 'User';
  const displayEmail = user?.email || '';
  const displayPicture = user?.picture;

  const handleLogout = async () => {
    try {
      await deleteSession();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getLink = (path: string) => {
    return projectId ? `${path}?project=${projectId}` : path;
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex items-center gap-2">
        <DatabaseZap className="h-6 w-6 text-primary" />
        <h1 className="hidden text-xl font-bold tracking-tight sm:inline-block">Semantik</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button asChild variant={pathname.startsWith('/connections') ? 'secondary' : 'ghost'}>
          <Link href={getLink("/connections")}>
            <Plug className="mr-2 h-4 w-4" />
            Connections
          </Link>
        </Button>
        <Button asChild variant={pathname.startsWith('/semantic-layer') ? 'secondary' : 'ghost'}>
          <Link href={getLink("/semantic-layer")}>
            <Layers className="mr-2 h-4 w-4" />
            Semantic Layer
          </Link>
        </Button>
        <Button asChild variant={pathname.startsWith('/dashboard') ? 'secondary' : 'ghost'}>
          <Link href={getLink("/dashboard")}>
            <BarChart className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={displayPicture} alt={displayName} />
                <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
