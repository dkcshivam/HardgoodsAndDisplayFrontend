/** What an admin-only screen shows anybody else, in place of the whole page. */
export function NoAccess() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">
        {"You don't have access to this page."}
      </p>
    </main>
  );
}
