export default function NotFound() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-2xl font-bold">404 - Page Not Found</h2>
        <p className="text-muted-foreground">The page you are looking for does not exist.</p>
      </div>
    </div>
  );
}
