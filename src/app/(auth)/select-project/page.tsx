'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getProjects } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { safeLocalStorage } from '@/lib/safe-storage';
import { deleteSession } from '@/app/auth-actions';

const LAST_PROJECT_KEY = 'lastSelectedProject';

export default function SelectProjectPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    try {
      safeLocalStorage.removeItem(LAST_PROJECT_KEY);
      await deleteSession();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [router]);

  useEffect(() => {
    // Check for a saved project and redirect immediately if it exists.
    const lastSelectedId = safeLocalStorage.getItem(LAST_PROJECT_KEY);
    if (lastSelectedId) {
      router.push(`/?project=${lastSelectedId}`);
      return;
    }

    const fetchProjects = async () => {
      setLoadingProjects(true);
      setError(null);
      try {
        const userProjects = await getProjects();
        setProjects(userProjects);

        if (userProjects.length > 0) {
          setSelectedProject(userProjects[0].id);
        }

      } catch (e: any) {
        console.error('Failed to fetch projects:', e);
        if (e.message.includes('Invalid Credentials') || e.message.includes('Authentication with Google Cloud failed')) {
          handleLogout();
        } else {
          setError(e.message || "An unknown error occurred while fetching projects.");
        }
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [router, handleLogout]);

  const handleProjectSelect = (projectId: string) => {
    setSelectedProject(projectId);
    safeLocalStorage.setItem(LAST_PROJECT_KEY, projectId);
  };

  const handleProceed = () => {
    if (selectedProject) {
      safeLocalStorage.setItem(LAST_PROJECT_KEY, selectedProject);
      router.push(`/?project=${selectedProject}`);
    }
  };


  if (loadingProjects) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 backdrop-blur-sm" />
      <Card className="z-10 w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Select a Google Cloud Project</CardTitle>
          <CardDescription>Choose the project you want to explore with BigQuery.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Error Fetching Projects</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <Button onClick={handleLogout} variant="destructive" className="mt-4 w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Logout and Try Again
              </Button>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Select onValueChange={handleProjectSelect} value={selectedProject || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleProceed} disabled={!selectedProject} className="w-full">
                Proceed
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
