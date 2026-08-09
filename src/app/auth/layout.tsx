export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--muted)/0.3)]">
      <div className="w-full max-w-md mx-4">
        {children}
      </div>
    </div>
  );
}
